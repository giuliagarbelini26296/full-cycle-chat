"""Executa o fluxo isolado e publica pela ação protegida; não retorna dados ao agente raiz."""

import time
from contextvars import ContextVar

import asyncpg
from google.adk.tools import ToolContext

from app.agent_requests import context
from app.agent_requests.model_budget import CURRENT_MODEL_BUDGET
from app.business.audit import QueryAudit
from app.business.grounding import UngroundedAnswer, check_grounding
from app.business.models import plan_query, write_answer
from app.business.query import read_query, validate_sql
from app.chat_api import CURRENT_CHAT_API
from app.config import Settings
from app.reports.queue import enqueue_report
from app.reports.store import save_plan

CURRENT_BUSINESS_SETTINGS: ContextVar[Settings | None] = ContextVar(
    "business_settings", default=None
)


class BusinessQueryFailed(RuntimeError):
    """Falha sem texto do modelo/SQL nos logs do ADK."""


async def consultar_negocio(tool_context: ToolContext) -> dict[str, str]:
    """Consulta vendas, pedidos, faturamento ou clientes ativos na base fictícia autorizada.

    Use para perguntas de negócio. Não leia Mensagens antes. Não recebe SQL nem pergunta
    reformulada: o código usa exclusivamente o texto original do Pedido autenticado.
    A ferramenta já publica a resposta. Depois dela não escreva nada.
    """
    return await business_request(tool_context, as_report=False)


async def gerar_relatorio_pdf(tool_context: ToolContext) -> dict[str, str]:
    """Prepara relatório PDF de vendas fictícias e coloca na fila. Use quando o Pedido
    solicitar PDF ou arquivo de relatório. Não leia Mensagens nem escreva texto depois:
    o código publica o estado da geração e a ação de download na Conversa.
    """
    return await business_request(tool_context, as_report=True)


async def business_request(
    tool_context: ToolContext, *, as_report: bool
) -> dict[str, str]:
    client = CURRENT_CHAT_API.get()
    state = tool_context.state
    if client is None or not state.get(context.REQUEST_ID):
        return {"erro": "A ferramenta exige um Pedido autenticado."}
    settings = CURRENT_BUSINESS_SETTINGS.get()
    if settings is None:
        raise RuntimeError("Configuração de negócio indisponível.")
    connection = await asyncpg.connect(
        settings.database_url.replace("postgresql+asyncpg://", "postgresql://"),
        timeout=3,
    )
    sql = None
    started = time.monotonic()
    audit = QueryAudit(connection, state[context.REQUEST_ID])

    def elapsed() -> int:
        return round((time.monotonic() - started) * 1000)

    try:
        question = state[context.ORIGINAL_QUESTION]
        await audit.start(
            state[context.REQUESTER_ID], state[context.CONVERSATION_ID], question
        )
        if not state.get(context.HAS_DATA_ACCESS):
            await audit.finish("denied", None, elapsed())
            await client.reply(
                state[context.REQUEST_ID],
                "Seu acesso aos dados de negócio não está liberado. Solicite ao administrador.",
            )
        elif not settings.business_database_url:
            await audit.finish("unavailable", None, elapsed())
            raise RuntimeError("Banco de negócio não configurado.")
        else:
            if as_report and not settings.report_redis_url:
                raise RuntimeError("Fila de relatórios não configurada.")
            sql = validate_sql(await plan_query(question))
            rows = await read_query(
                settings.business_database_url,
                sql,
                timeout_s=settings.business_query_timeout_s,
                max_rows=settings.business_query_max_rows,
            )
            body = await write_answer(question, rows)
            try:
                check_grounding(body, rows)
            except UngroundedAnswer:
                budget = CURRENT_MODEL_BUDGET.get()
                if budget is None or budget.calls >= budget.maximum:
                    raise
                # Nova redação isolada, só com células; nunca corrige números por interpolação.
                body = await write_answer(question, rows, strict=True)
                check_grounding(body, rows)
            if as_report:
                await audit.finish("queued", sql, elapsed())
                await save_plan(connection, state[context.REQUEST_ID], body)
                await client.start_report(state[context.REQUEST_ID])
                try:
                    await enqueue_report(
                        settings.report_redis_url,
                        state[context.REQUEST_ID],
                        expires_s=settings.report_request_ttl_seconds,
                    )
                except Exception:
                    await client.fail_report(state[context.REQUEST_ID])
                    await audit.finish("queue_error", sql, elapsed())
            else:
                await audit.finish("allowed", sql, elapsed())
                await client.reply(state[context.REQUEST_ID], body, business_data=True)
        context.mark_answered(tool_context, "report" if as_report else "business")
        return {"status": "Resposta já publicada na Conversa."}
    except Exception:
        # A falha da própria auditoria também impede qualquer entrega. Sem mensagens de erro SQL.
        try:
            await audit.finish("error", sql, elapsed())
        except Exception:
            pass
        raise BusinessQueryFailed("Consulta não entregue.") from None
    finally:
        await connection.close()
