"""Worker de Relatórios: não importa ADK, modelos ou ferramentas do chat."""

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from functools import partial

import asyncpg
from arq import Retry, cron
from arq.connections import RedisSettings

from app.business.grounding import check_grounding
from app.business.query import read_query
from app.reports.api import ReportDelivery
from app.reports.config import ReportWorkerConfig
from app.reports.pdf import build_pdf
from app.reports.queue import QUEUE_NAME, deserialize, serialize
from app.reports.storage import ReportStorage
from app.reports.store import begin_attempt, end_attempt, load_plan

logger = logging.getLogger(__name__)


async def startup(ctx: dict, *, settings: ReportWorkerConfig):
    ctx["settings"] = settings
    ctx["delivery"] = ReportDelivery(settings.chat_api_url, settings.chat_worker_token)
    ctx["storage"] = ReportStorage(settings)


async def shutdown(ctx: dict):
    await ctx["delivery"].close()
    ctx["storage"].close()


async def generate_report(ctx: dict, request_id: str) -> None:
    settings: ReportWorkerConfig = ctx["settings"]
    delivery: ReportDelivery = ctx["delivery"]
    storage: ReportStorage = ctx["storage"]
    attempt = int(ctx.get("job_try", 1))
    connection = None
    try:
        async with asyncio.timeout(max(0.1, settings.report_job_timeout_s - 15)):
            if await delivery.eligibility(request_id) != "queued":
                return
            connection = await asyncpg.connect(settings.audit_dsn, timeout=3)
            await begin_attempt(connection, request_id, attempt)
            plan = await load_plan(connection, request_id)
            rows = await read_query(
                settings.business_database_url,
                plan["sql"],
                timeout_s=settings.business_query_timeout_s,
                max_rows=settings.business_query_max_rows,
            )
            check_grounding(plan["draft"], rows)
            content = await asyncio.to_thread(
                build_pdf, plan["question"], plan["draft"], rows
            )
            await asyncio.to_thread(storage.upload, request_id, content)
            status = await delivery.complete(request_id, "ready")
            await end_attempt(connection, request_id, attempt, status)
            logger.info(
                "relatorio pedido=%s tentativa=%s desfecho=%s",
                request_id,
                attempt,
                status,
            )
    except Exception:
        if connection is not None:
            try:
                await end_attempt(connection, request_id, attempt, "error")
            except Exception:
                pass
        logger.warning(
            "relatorio pedido=%s tentativa=%s desfecho=erro", request_id, attempt
        )
        if attempt < settings.report_max_tries:
            raise Retry(defer=attempt * 2) from None
        try:
            await delivery.complete(request_id, "failed")
        except Exception:
            logger.error(
                "relatorio pedido=%s desfecho=entrega_indisponivel", request_id
            )
    finally:
        if connection is not None:
            await connection.close()


async def housekeeping(ctx: dict) -> None:
    settings: ReportWorkerConfig = ctx["settings"]
    try:
        await ctx["delivery"].expire()
        await asyncio.to_thread(ctx["storage"].cleanup)
        connection = await asyncpg.connect(settings.audit_dsn, timeout=3)
        try:
            await connection.execute(
                "DELETE FROM report_plans WHERE created_at < $1",
                datetime.now(UTC)
                - timedelta(seconds=settings.report_retention_seconds),
            )
        finally:
            await connection.close()
    except Exception:
        logger.warning("relatorios_limpeza desfecho=indisponivel")


def worker_options(settings: ReportWorkerConfig) -> dict:
    return {
        "functions": [generate_report],
        "queue_name": QUEUE_NAME,
        "redis_settings": RedisSettings.from_dsn(settings.report_redis_url),
        "job_serializer": serialize,
        "job_deserializer": deserialize,
        "on_startup": partial(startup, settings=settings),
        "on_shutdown": shutdown,
        "max_jobs": 1,
        "max_tries": settings.report_max_tries,
        "job_timeout": settings.report_job_timeout_s,
        "keep_result": 0,
        "log_results": False,
        "cron_jobs": [cron(housekeeping, minute=set(range(60)), run_at_startup=True)],
    }
