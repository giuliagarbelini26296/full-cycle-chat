"""Lastro de numerais: Decimal, moedas PT-BR e datas; nenhuma correção silenciosa."""

from __future__ import annotations

import re
import unicodedata
from datetime import date, datetime
from decimal import Decimal
from typing import Any

NUMBER = re.compile(r"[-+]?\d+(?:[.,]\d+)*(?:[eE][-+]?\d+)?%?")
DATE = re.compile(r"\b(?:\d{2}/\d{2}/\d{4}|\d{4}-\d{2}-\d{2})\b")


class UngroundedAnswer(ValueError):
    """Há um numeral na resposta que não veio do resultado da consulta."""


def pt_decimal(token: str) -> Decimal:
    token = token.rstrip("%")
    if "," in token:
        token = token.replace(".", "").replace(",", ".")
    elif re.fullmatch(r"[-+]?\d{1,3}(?:\.\d{3})+", token):
        token = token.replace(".", "")
    return Decimal(token)


def check_grounding(text: str, rows: list[dict[str, Any]]) -> None:
    numbers: set[Decimal] = set()
    dates: set[str] = set()
    for row in rows:
        for value in row.values():
            if isinstance(value, bool) or value is None:
                continue
            if isinstance(value, (date, datetime)):
                dates.update((value.strftime("%d/%m/%Y"), value.strftime("%Y-%m-%d")))
                numbers.update(
                    (Decimal(value.year), Decimal(value.month), Decimal(value.day))
                )
            elif isinstance(value, (int, Decimal)):
                numbers.add(Decimal(value))
            elif isinstance(value, str):
                # Texto retornado também pode ser um período calculado pelo SQL.
                for token in NUMBER.findall(unicodedata.normalize("NFKC", value)):
                    numbers.add(pt_decimal(token))
    normalized = unicodedata.normalize("NFKC", text)
    for match in DATE.finditer(normalized):
        if match.group() not in dates:
            raise UngroundedAnswer("Data sem lastro.")
    normalized = DATE.sub("", normalized)
    if any(pt_decimal(token) not in numbers for token in NUMBER.findall(normalized)):
        raise UngroundedAnswer("Número sem lastro.")
