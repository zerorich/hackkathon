"""add password_hash to users for direct login

Revision ID: 9a2f6e1c4d31
Revises: 4f3a1c9d8b72
Create Date: 2026-08-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "9a2f6e1c4d31"
down_revision: str | None = "4f3a1c9d8b72"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "password_hash")
