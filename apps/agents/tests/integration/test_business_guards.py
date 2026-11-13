"""Recusas reais de permissão/auditoria antes de qualquer chamada ao modelo ou leitura."""

from types import SimpleNamespace
from uuid import UUID

import asyncpg
import pytest

from app.agent_requests.execution import Usage, request_state
from app.agent_requests.model_budget import CURRENT_MODEL_BUDGET, ModelBudget
from app.agent_requests.models import AgentRequestBody
from app.business.service import (
    CURRENT_BUSINESS_SETTINGS,
    BusinessQueryFailed,
    consultar_negocio,
)
from app.chat_api import CURRENT_CHAT_API, ChatApiClient
from app.config import load_settings
from tests.integration.test_request_routes import pedido

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def invoke(fake, database_url: str, *, allowed: bool):
    request = AgentRequestBody.model_validate(
        pedido(body="@assistente quantos clientes ativos temos?")
    )
    request.requester.has_data_access = allowed
    settings = load_settings().model_copy(update={"database_url": database_url})
    client = ChatApiClient(fake.url, "teste")
    budget = ModelBudget(usage=Usage())
    chat_token = CURRENT_CHAT_API.set(client)
    settings_token = CURRENT_BUSINESS_SETTINGS.set(settings)
    budget_token = CURRENT_MODEL_BUDGET.set(budget)
    tool = SimpleNamespace(
        state=request_state(request), actions=SimpleNamespace(skip_summarization=False)
    )
    try:
        await consultar_negocio(tool)
    finally:
        assert budget.calls == 0
        CURRENT_MODEL_BUDGET.reset(budget_token)
        CURRENT_BUSINESS_SETTINGS.reset(settings_token)
        CURRENT_CHAT_API.reset(chat_token)
        await client.close()
    return request


async def test_sem_permissao_audita_recusa_sem_consulta_ou_modelo(
    test_database_url, fake_chat_api
):
    request = await invoke(fake_chat_api, test_database_url, allowed=False)
    connection = await asyncpg.connect(
        test_database_url.replace("postgresql+asyncpg://", "postgresql://")
    )
    try:
        row = await connection.fetchrow(
            "SELECT outcome,normalized_sql FROM business_queries WHERE request_id=$1",
            UUID(str(request.request_id)),
        )
        assert dict(row) == {"outcome": "denied", "normalized_sql": None}
        replies = [
            call for call in fake_chat_api.requests if call["path"].endswith("/reply")
        ]
        assert len(replies) == 1 and "não está liberado" in replies[0]["body"]["body"]
    finally:
        await connection.close()


async def test_auditoria_indisponivel_fecha_o_fluxo_sem_resposta_de_negocio(
    test_database_url, fake_chat_api
):
    connection = await asyncpg.connect(
        test_database_url.replace("postgresql+asyncpg://", "postgresql://")
    )
    await connection.execute(
        "ALTER TABLE business_queries RENAME TO business_queries_paused"
    )
    try:
        with pytest.raises(BusinessQueryFailed):
            await invoke(fake_chat_api, test_database_url, allowed=True)
        assert fake_chat_api.requests == []
    finally:
        await connection.execute(
            "ALTER TABLE business_queries_paused RENAME TO business_queries"
        )
        await connection.close()
