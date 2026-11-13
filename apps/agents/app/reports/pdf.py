"""PDF em fluxo de páginas; células e textos sempre escapados, sem recursos remotos."""

from datetime import date, datetime
from decimal import Decimal
from io import BytesIO
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def display(value) -> str:
    if value is None:
        return "-"
    if isinstance(value, (date, datetime)):
        return value.strftime("%d/%m/%Y")
    if isinstance(value, Decimal):
        return f"{value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    if isinstance(value, bool):
        return "Sim" if value else "Não"
    return str(value)


def build_pdf(question: str, draft: str, rows: list[dict]) -> bytes:
    output = BytesIO()
    styles = getSampleStyleSheet()
    body = ParagraphStyle(
        "DigitalyBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10,
        leading=15,
        textColor=colors.HexColor("#263b50"),
        spaceAfter=9,
    )
    title = ParagraphStyle(
        "DigitalyTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=27,
        alignment=0,
        textColor=colors.HexColor("#0079b9"),
        spaceAfter=14,
    )
    small = ParagraphStyle(
        "DigitalyCell", parent=body, fontSize=8, leading=11, spaceAfter=0
    )
    story = [
        Paragraph("Digitaly | Relatório", title),
        Paragraph("DADOS FICTÍCIOS - PILOTO DE DEMONSTRAÇÃO", body),
        Paragraph("Pedido", styles["Heading2"]),
        Paragraph(escape(question), body),
        Paragraph("Resumo conferido", styles["Heading2"]),
    ]
    story.extend(
        Paragraph(escape(line), body) for line in draft.splitlines() if line.strip()
    )
    story.extend(
        [Spacer(1, 5 * mm), Paragraph("Resultado da consulta", styles["Heading2"])]
    )
    columns = list(rows[0]) if rows else []
    # Painéis de até quatro colunas, sem cortar colunas ou linhas do resultado.
    for start in range(0, len(columns), 4):
        panel = columns[start : start + 4]
        data = [[Paragraph(escape(key), small) for key in panel]]
        data.extend(
            [Paragraph(escape(display(row.get(key))), small) for key in panel]
            for row in rows
        )
        table = Table(
            data,
            colWidths=[174 * mm / len(panel)] * len(panel),
            repeatRows=1,
            hAlign="LEFT",
        )
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#d9edfc")),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#dce8f3")),
                    ("LEFTPADDING", (0, 0), (-1, -1), 7),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                    ("TOPPADDING", (0, 0), (-1, -1), 7),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ]
            )
        )
        story.extend([table, Spacer(1, 5 * mm)])
    if not rows:
        story.append(Paragraph("A consulta não encontrou registros.", body))

    def footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#526c83"))
        canvas.drawString(
            18 * mm, 12 * mm, "Digitaly Chat - demonstração com dados fictícios"
        )
        canvas.drawRightString(192 * mm, 12 * mm, f"Página {doc.page}")
        canvas.restoreState()

    document = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=22 * mm,
        title="Relatório Digitaly - dados fictícios",
        author="Digitaly Chat",
    )
    document.build(story, onFirstPage=footer, onLaterPages=footer)
    return output.getvalue()
