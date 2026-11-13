"""Um orçamento por Pedido, compartilhado pelos Runners isolados e pelo principal."""

from contextvars import ContextVar
from dataclasses import dataclass
from typing import Any

from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_request import LlmRequest


class ModelBudgetExceeded(RuntimeError):
    pass


@dataclass
class ModelBudget:
    usage: Any
    calls: int = 0
    maximum: int = 4


CURRENT_MODEL_BUDGET: ContextVar[ModelBudget | None] = ContextVar(
    "model_budget", default=None
)


def count_model_call(callback_context: CallbackContext, llm_request: LlmRequest):
    budget = CURRENT_MODEL_BUDGET.get()
    if budget is not None:
        if budget.calls >= budget.maximum:
            raise ModelBudgetExceeded()
        budget.calls += 1
        budget.usage.model_calls = budget.calls
    return None
