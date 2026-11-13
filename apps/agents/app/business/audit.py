"""Auditoria fechada por padrão: nunca armazena resultados nem histórico do chat."""

from datetime import UTC, datetime
from uuid import UUID

import asyncpg
from sqlalchemy import Column, DateTime, Integer, Table, Text
from sqlalchemy.dialects.postgresql import UUID as SQLUUID

from app.registry.store import REGISTRY_METADATA

business_queries = Table(
    "business_queries",
    REGISTRY_METADATA,
    Column("request_id", SQLUUID(as_uuid=True), primary_key=True),
    Column("person_id", SQLUUID(as_uuid=True), nullable=False),
    Column("conversation_id", SQLUUID(as_uuid=True), nullable=False),
    Column("question", Text, nullable=False),
    Column("normalized_sql", Text, nullable=True),
    Column("outcome", Text, nullable=False),
    Column("started_at", DateTime(timezone=True), nullable=False),
    Column("finished_at", DateTime(timezone=True), nullable=True),
    Column("duration_ms", Integer, nullable=True),
)


class QueryAudit:
    def __init__(self, connection: asyncpg.Connection, request_id: str):
        self.connection = connection
        self.request_id = UUID(request_id)

    async def start(self, person_id: str, conversation_id: str, question: str) -> None:
        await self.connection.execute(
            """INSERT INTO business_queries
          (request_id,person_id,conversation_id,question,outcome,started_at)
          VALUES ($1,$2,$3,$4,'started',$5)""",
            self.request_id,
            UUID(person_id),
            UUID(conversation_id),
            question,
            datetime.now(UTC),
        )

    async def finish(self, outcome: str, sql: str | None, duration_ms: int) -> None:
        await self.connection.execute(
            """UPDATE business_queries SET
          outcome=$2, normalized_sql=$3, duration_ms=$4, finished_at=$5
          WHERE request_id=$1""",
            self.request_id,
            outcome,
            sql,
            duration_ms,
            datetime.now(UTC),
        )
