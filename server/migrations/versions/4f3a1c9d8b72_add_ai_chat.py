"""add AI chat conversations and messages

Revision ID: 4f3a1c9d8b72
Revises: 87d852f49465
Create Date: 2026-08-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "4f3a1c9d8b72"
down_revision: str | None = "87d852f49465"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "ai_chat_conversations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("owner_id", sa.String(length=36), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_ai_chat_conversation_owner_updated",
        "ai_chat_conversations",
        ["owner_id", "updated_at"],
        unique=False,
    )
    op.create_index(
        "ix_ai_chat_conversations_owner_id",
        "ai_chat_conversations",
        ["owner_id"],
        unique=False,
    )
    op.create_table(
        "ai_chat_messages",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("conversation_id", sa.String(length=36), nullable=False),
        sa.Column("role", sa.String(length=16), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("provider", sa.String(length=64), nullable=True),
        sa.Column("model", sa.String(length=128), nullable=True),
        sa.Column("prompt_tokens", sa.Integer(), nullable=True),
        sa.Column("completion_tokens", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["conversation_id"], ["ai_chat_conversations.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_ai_chat_message_conversation_created",
        "ai_chat_messages",
        ["conversation_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_ai_chat_messages_conversation_id",
        "ai_chat_messages",
        ["conversation_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_ai_chat_messages_conversation_id", table_name="ai_chat_messages")
    op.drop_index("ix_ai_chat_message_conversation_created", table_name="ai_chat_messages")
    op.drop_table("ai_chat_messages")
    op.drop_index("ix_ai_chat_conversations_owner_id", table_name="ai_chat_conversations")
    op.drop_index("ix_ai_chat_conversation_owner_updated", table_name="ai_chat_conversations")
    op.drop_table("ai_chat_conversations")
