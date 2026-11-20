"""Worker real com Redis, PostgreSQL e S3, sem modelo; API de entrega como fronteira HTTP."""

import asyncio
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
from uuid import UUID, uuid4

import asyncpg
import httpx
import pytest
from arq.worker import Worker
from pypdf import PdfReader
from redis.asyncio import Redis

from app.business.audit import QueryAudit
from app.reports.config import ReportWorkerConfig
from app.reports.queue import enqueue_report
from app.reports.storage import ReportStorage, object_key
from app.reports.store import begin_attempt, end_attempt, save_plan
from app.reports.worker import housekeeping, shutdown, startup, worker_options

pytestmark = pytest.mark.asyncio(loop_scope="session")


@pytest.fixture
def delivery_api():
    states = {}

    class Handler(BaseHTTPRequestHandler):
        def respond(self, payload, status=200):
            body = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            self.respond({"status": states.get(self.path.rsplit("/", 1)[-1], "queued")})

        def do_POST(self):
            payload = json.loads(
                self.rfile.read(int(self.headers.get("Content-Length", "0"))) or b"{}"
            )
            request_id = self.path.split("/")[-2]
            states[request_id] = payload.get("status", "failed")
            self.respond({"status": states[request_id]})

        def log_message(self, format: str, *args: object) -> None:
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_address[1]}", states
    server.shutdown()
    server.server_close()


def settings_for_worker(database_url: str, url: str):
    if not os.environ.get("BUSINESS_DATABASE_URL"):
        pytest.skip("Requer base fictícia isolada.")
    return ReportWorkerConfig(
        database_url=database_url,
        business_database_url=os.environ["BUSINESS_DATABASE_URL"],
        report_redis_url="redis://redis:6379/4",
        chat_api_url=url,
        chat_worker_token="worker-test",
        s3_endpoint="http://s3:8333",
        s3_access_key_id="fullcycle",
        s3_secret_access_key="fullcycle-secret",
    )


async def prepare(settings, request_id, draft):
    connection = await asyncpg.connect(settings.audit_dsn)
    try:
        audit = QueryAudit(connection, request_id)
        await audit.start(
            str(uuid4()), str(uuid4()), "Qual o faturamento pago de novembro de 2026?"
        )
        await audit.finish(
            "queued",
            "SELECT SUM(total) AS faturamento FROM orders WHERE status='paid' AND ordered_at >= DATE '2026-11-01' AND ordered_at < DATE '2026-12-01'",
            1,
        )
        await save_plan(connection, request_id, draft)
    finally:
        await connection.close()


async def run_queue(settings):
    options = worker_options(settings)
    options.update(burst=True, handle_signals=False, poll_delay=0.1, cron_jobs=[])
    worker = Worker(**options)
    try:
        await worker.async_run()
    finally:
        await worker.close()


async def test_fila_real_gera_pdf_privado_e_reentrega_sem_duplicar(
    test_database_url, delivery_api
):
    url, states = delivery_api
    settings = settings_for_worker(test_database_url, url)
    request_id = str(uuid4())
    await prepare(
        settings, request_id, "Dados fictícios: faturamento pago de R$ 7.751,00."
    )
    await enqueue_report(settings.report_redis_url, request_id)
    redis = Redis.from_url(settings.report_redis_url)
    try:
        payload = await redis.get(f"arq:job:report:{request_id}")
        assert isinstance(payload, bytes) and request_id.encode() in payload
        assert b"SELECT" not in payload and b"7.751" not in payload
        await enqueue_report(settings.report_redis_url, request_id)
        await run_queue(settings)
        assert states[request_id] == "ready"
        storage = ReportStorage(settings)
        try:
            obj = storage.client.get_object(
                Bucket=storage.bucket, Key=object_key(request_id)
            )
            content = obj["Body"].read()
            text = "\n".join(
                page.extract_text() for page in PdfReader(BytesIO(content)).pages
            )
            assert "7.751,00" in text and "DADOS FICTÍCIOS" in text
            async with httpx.AsyncClient() as client:
                anonymous = await client.get(
                    f"{settings.s3_endpoint}/reports/{object_key(request_id)}"
                )
                assert anonymous.status_code in (401, 403)
            await enqueue_report(settings.report_redis_url, request_id)
            await run_queue(settings)
            current = storage.client.head_object(
                Bucket=storage.bucket, Key=object_key(request_id)
            )
            assert current["LastModified"] == obj["LastModified"]
        finally:
            storage.client.delete_object(
                Bucket=storage.bucket, Key=object_key(request_id)
            )
            storage.close()
    finally:
        await redis.aclose()


async def test_rascunho_sem_lastro_tenta_tres_vezes_e_informa_falha(
    test_database_url, delivery_api
):
    url, states = delivery_api
    settings = settings_for_worker(test_database_url, url)
    request_id = str(uuid4())
    await prepare(settings, request_id, "Faturamento fictício: R$ 999.999,00.")
    await enqueue_report(settings.report_redis_url, request_id)
    await run_queue(settings)
    assert states[request_id] == "failed"
    connection = await asyncpg.connect(settings.audit_dsn)
    try:
        assert (
            await connection.fetchval(
                "SELECT count(*) FROM report_attempts WHERE request_id=$1",
                UUID(request_id),
            )
            == 3
        )
    finally:
        await connection.close()


async def test_limpeza_remove_so_arquivos_e_rascunhos_expirados_e_preserva_auditoria(
    test_database_url, delivery_api
):
    url, _ = delivery_api
    settings = settings_for_worker(test_database_url, url).model_copy(
        update={
            "report_retention_seconds": 5,
            "s3_reports_bucket": f"reports-test-{uuid4().hex[:12]}",
        }
    )
    storage = ReportStorage(settings)
    storage.client.create_bucket(Bucket=storage.bucket)
    old_id, fresh_id = str(uuid4()), str(uuid4())
    keys = [
        object_key(old_id),
        object_key(fresh_id),
        "reports/manual.pdf",
        f"outro/{old_id}.pdf",
    ]
    ctx = {}
    await startup(ctx, settings=settings)
    connection = await asyncpg.connect(settings.audit_dsn)
    try:
        await prepare(settings, old_id, "Dados fictícios: R$ 7.751,00.")
        await begin_attempt(connection, old_id, 1)
        await end_attempt(connection, old_id, 1, "ready")
        await connection.execute(
            "UPDATE report_plans SET created_at=now()-interval '10 seconds' WHERE request_id=$1",
            UUID(old_id),
        )
        storage.upload(old_id, b"%PDF-1.4\nexpirado")
        for key in keys[2:]:
            storage.client.put_object(Bucket=storage.bucket, Key=key, Body=b"preservar")
        await asyncio.sleep(5.2)
        storage.upload(fresh_id, b"%PDF-1.4\natual")
        await housekeeping(ctx)
        remaining = storage.client.list_objects_v2(Bucket=storage.bucket)["Contents"]
        assert {item["Key"] for item in remaining} == set(keys[1:])
        assert (
            await connection.fetchval(
                "SELECT count(*) FROM report_plans WHERE request_id=$1", UUID(old_id)
            )
            == 0
        )
        assert (
            await connection.fetchval(
                "SELECT count(*) FROM business_queries WHERE request_id=$1",
                UUID(old_id),
            )
            == 1
        )
        assert (
            await connection.fetchval(
                "SELECT count(*) FROM report_attempts WHERE request_id=$1", UUID(old_id)
            )
            == 1
        )
    finally:
        await connection.close()
        await shutdown(ctx)
        for key in keys:
            storage.client.delete_object(Bucket=storage.bucket, Key=key)
        storage.client.delete_bucket(Bucket=storage.bucket)
        storage.close()
