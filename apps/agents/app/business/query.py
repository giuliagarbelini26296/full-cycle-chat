"""Duas barreiras independentes: AST restrita e conexão PostgreSQL somente leitura."""

from __future__ import annotations

import asyncio
from typing import Any

import asyncpg
import sqlglot
from sqlglot import exp
from sqlglot.optimizer.scope import traverse_scope

TABLES = frozenset({"customers", "sellers", "orders"})
FUNCTIONS = frozenset(
    {
        "SUM",
        "COUNT",
        "AVG",
        "MIN",
        "MAX",
        "ROUND",
        "ABS",
        "COALESCE",
        "NULLIF",
        "DATE_TRUNC",
        "TO_CHAR",
        "EXTRACT",
        "CURRENT_DATE",
        "CURRENT_TIMESTAMP",
        "CAST",
        "TRY_CAST",
        "LOWER",
        "UPPER",
        # Nós canônicos do parser para operadores e funções PostgreSQL acima.
        "AND",
        "OR",
        "CASE",
        "IF",
        "TIMESTAMP_TRUNC",
        "TIME_TO_STR",
    }
)
CAST_TYPES = frozenset(
    {
        "TEXT",
        "VARCHAR",
        "INT",
        "BIGINT",
        "SMALLINT",
        "DECIMAL",
        "DOUBLE",
        "FLOAT",
        "BOOLEAN",
        "DATE",
        "TIMESTAMP",
        "TIMESTAMPTZ",
        "INTERVAL",
    }
)


class UnsafeQuery(ValueError):
    """A consulta não pertence ao subconjunto permitido."""


class TooManyRows(ValueError):
    """O resultado pede um filtro ou uma agregação mais precisa."""


def validate_sql(sql: str) -> str:
    if len(sql) > 12000:
        raise UnsafeQuery("Consulta muito extensa.")
    try:
        statements = sqlglot.parse(
            sql, read="postgres", error_level=sqlglot.ErrorLevel.RAISE
        )
    except sqlglot.errors.SqlglotError as error:
        raise UnsafeQuery("SQL inválido.") from error
    if len(statements) != 1 or not isinstance(statements[0], exp.Select):
        raise UnsafeQuery("Apenas um SELECT é permitido.")
    tree = statements[0]
    for node in tree.walk():
        if isinstance(
            node,
            (
                exp.DML,
                exp.DDL,
                exp.Command,
                exp.Into,
                exp.Lock,
                exp.Dot,
                exp.Parameter,
                exp.Placeholder,
            ),
        ):
            raise UnsafeQuery("Operação não permitida.")
        if isinstance(node, exp.Func):
            name = (
                node.name.upper()
                if isinstance(node, exp.Anonymous)
                else node.sql_name()
            )
            if name not in FUNCTIONS:
                raise UnsafeQuery("Função não permitida.")
        if (
            isinstance(node, exp.DataType)
            and str(getattr(node.this, "value", node.this)) not in CAST_TYPES
        ):
            raise UnsafeQuery("Conversão de tipo não permitida.")
    physical_tables = []
    try:
        # Resolve o escopo: uma CTE interna não autoriza uma tabela física homônima fora dela.
        for scope in traverse_scope(tree):
            for source in scope.sources.values():
                if isinstance(source, exp.Table):
                    if (
                        source.catalog
                        or source.db not in ("", "public")
                        or source.name not in TABLES
                    ):
                        raise UnsafeQuery("Tabela não permitida.")
                    physical_tables.append(source)
    except sqlglot.errors.SqlglotError as error:
        raise UnsafeQuery("Escopo SQL inválido.") from error
    if not physical_tables:
        raise UnsafeQuery("Consulte uma tabela de negócio.")
    for table in physical_tables:
        table.set("db", exp.to_identifier("public"))
    return tree.sql(
        dialect="postgres", comments=False, unsupported_level=sqlglot.ErrorLevel.RAISE
    )


async def read_query(
    dsn: str, sql: str, *, timeout_s: float = 3, max_rows: int = 100
) -> list[dict[str, Any]]:
    normalized = validate_sql(sql)
    # O timeout global inclui conexão, execução e leitura, não só o servidor SQL.
    async with asyncio.timeout(timeout_s + 1):
        connection = await asyncpg.connect(
            dsn,
            timeout=timeout_s,
            server_settings={
                "application_name": "business_readonly",
                "search_path": "pg_catalog",
            },
        )
        try:
            async with connection.transaction(readonly=True):
                await connection.execute(
                    f"SET LOCAL statement_timeout = '{int(timeout_s * 1000)}ms'"
                )
                rows = await connection.fetch(
                    f"SELECT * FROM ({normalized}) AS business_result LIMIT {int(max_rows) + 1}",
                    timeout=timeout_s,
                )
                if len(rows) > max_rows:
                    raise TooManyRows("Refine a consulta.")
                return [dict(row) for row in rows]
        finally:
            await connection.close()
