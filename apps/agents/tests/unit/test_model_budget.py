from types import SimpleNamespace

import pytest

from app.agent_requests.model_budget import (
    CURRENT_MODEL_BUDGET,
    ModelBudget,
    ModelBudgetExceeded,
    count_model_call,
)


def test_orcamento_compartilhado_recusa_a_quinta_chamada():
    budget = ModelBudget(usage=SimpleNamespace())
    token = CURRENT_MODEL_BUDGET.set(budget)
    try:
        for _ in range(4):
            count_model_call(callback_context=None, llm_request=None)
        with pytest.raises(ModelBudgetExceeded):
            count_model_call(callback_context=None, llm_request=None)
        assert budget.calls == 4
    finally:
        CURRENT_MODEL_BUDGET.reset(token)
