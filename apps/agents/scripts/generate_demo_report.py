"""Artefato/fixture de demonstração, sem fingir resposta de IA em produção."""

import asyncio
import os
from pathlib import Path

from app.business.grounding import check_grounding
from app.business.query import read_query
from app.reports.pdf import build_pdf


async def main():
    rows = await read_query(
        os.environ["BUSINESS_DATABASE_URL"],
        "SELECT SUM(total) AS faturamento FROM orders WHERE status='paid' AND ordered_at >= DATE '2026-11-01' AND ordered_at < DATE '2026-12-01'",
    )
    draft = "Dados fictícios: o faturamento pago foi de R$ 7.751,00."
    check_grounding(draft, rows)
    content = build_pdf("Qual foi o faturamento pago de novembro de 2026?", draft, rows)
    root = Path(__file__).resolve().parents[3]
    output = root / "output/pdf/relatorio-digitaly-demonstracao.pdf"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(content)
    fixture = root / "apps/web/e2e/fixtures/relatorio-ficticio.pdf"
    fixture.parent.mkdir(parents=True, exist_ok=True)
    fixture.write_bytes(content)
    print(
        "Relatório de demonstração e fixture de navegador gerados com lastro na base fictícia."
    )


if __name__ == "__main__":
    asyncio.run(main())
