"""drop prompt tables

Removes the Prompts feature tables (prompt, prompt_history). The Prompts
feature and all of its frontend/backend code (workspace management UI and
the chat /prompts slash command) has been removed from this fork.

Downgrade is intentionally a no-op: restore from a backup if you need the
prompts feature back.

Revision ID: 3bf04d1e0ac3
Revises: b41c1b1a7b94
Create Date: 2026-06-23 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3bf04d1e0ac3'
down_revision: Union[str, None] = 'b41c1b1a7b94'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_TABLES = ['prompt_history', 'prompt']


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())
    for table in _TABLES:
        if table in existing:
            op.drop_table(table)


def downgrade() -> None:
    # Intentionally irreversible — see module docstring.
    pass
