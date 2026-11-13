"""Plano privado e tentativas, sem resultados SQL persistidos."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "report_plans",
        sa.Column("request_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("draft", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["request_id"], ["business_queries.request_id"], ondelete="CASCADE"
        ),
    )
    op.create_table(
        "report_attempts",
        sa.Column("request_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("attempt", sa.Integer(), primary_key=True),
        sa.Column("outcome", sa.Text(), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(
            ["request_id"], ["business_queries.request_id"], ondelete="CASCADE"
        ),
    )


def downgrade():
    op.drop_table("report_attempts")
    op.drop_table("report_plans")
