"""O job contém apenas a referência; SQL e rascunho ficam na base privada dos agentes."""

from uuid import UUID

import asyncpg
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Table, Text, func
from sqlalchemy.dialects.postgresql import UUID as SQLUUID

from app.business.audit import business_queries
from app.registry.store import REGISTRY_METADATA

report_plans = Table(
    "report_plans",
    REGISTRY_METADATA,
    Column(
        "request_id",
        SQLUUID(as_uuid=True),
        ForeignKey(business_queries.c.request_id, ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("draft", Text, nullable=False),
    Column(
        "created_at", DateTime(timezone=True), nullable=False, server_default=func.now()
    ),
)
report_attempts = Table(
    "report_attempts",
    REGISTRY_METADATA,
    Column(
        "request_id",
        SQLUUID(as_uuid=True),
        ForeignKey(business_queries.c.request_id, ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("attempt", Integer, primary_key=True),
    Column("outcome", Text, nullable=False),
    Column(
        "started_at", DateTime(timezone=True), nullable=False, server_default=func.now()
    ),
    Column("finished_at", DateTime(timezone=True), nullable=True),
)


async def save_plan(
    connection: asyncpg.Connection, request_id: str, draft: str
) -> None:
    await connection.execute(
        "INSERT INTO report_plans (request_id,draft) VALUES ($1,$2)",
        UUID(request_id),
        draft,
    )


async def load_plan(connection: asyncpg.Connection, request_id: str) -> dict:
    row = await connection.fetchrow(
        """SELECT q.normalized_sql AS sql,q.question,p.draft
      FROM report_plans p JOIN business_queries q USING (request_id) WHERE p.request_id=$1""",
        UUID(request_id),
    )
    if row is None or not row["sql"]:
        raise ValueError("Plano indisponível.")
    return dict(row)


async def begin_attempt(
    connection: asyncpg.Connection, request_id: str, attempt: int
) -> None:
    await connection.execute(
        """INSERT INTO report_attempts (request_id,attempt,outcome) VALUES ($1,$2,'started')
      ON CONFLICT (request_id,attempt) DO UPDATE SET outcome='started',started_at=now(),finished_at=NULL""",
        UUID(request_id),
        attempt,
    )


async def end_attempt(
    connection: asyncpg.Connection, request_id: str, attempt: int, outcome: str
) -> None:
    await connection.execute(
        "UPDATE report_attempts SET outcome=$3,finished_at=now() WHERE request_id=$1 AND attempt=$2",
        UUID(request_id),
        attempt,
        outcome,
    )
