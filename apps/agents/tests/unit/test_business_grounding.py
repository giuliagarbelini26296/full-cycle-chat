from datetime import date
from decimal import Decimal

import pytest

from app.business.grounding import UngroundedAnswer, check_grounding


def test_confere_moeda_percentual_e_data_sem_float():
    rows = [
        {
            "total": Decimal("7751.00"),
            "percentual": Decimal("25.5"),
            "data": date(2026, 11, 13),
        }
    ]
    check_grounding("Em 13/11/2026: R$ 7.751,00 e 25,5%.", rows)


@pytest.mark.parametrize(
    "text",
    [
        "Total de R$ 7.752,00.",
        "Crescimento de 10%.",
        "Foram 999 pedidos.",
        "Receita 1e6.",
        "Cliente999.",
    ],
)
def test_recusa_numeros_sem_lastro(text):
    with pytest.raises(UngroundedAnswer):
        check_grounding(text, [{"total": Decimal("7751.00")}])


def test_recusa_dados_vazios_com_resposta_numerica():
    with pytest.raises(UngroundedAnswer):
        check_grounding("Existem 4 pedidos.", [])
