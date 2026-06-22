"""drop automation tables

Removes the Automations feature tables (automation, automation_run). The
Automations feature and all of its frontend/backend code (UI, agent tools,
and the background scheduler) has been removed from this fork.

Downgrade is intentionally a no-op: restore from a backup if you need the
automations feature back.

Revision ID: b41c1b1a7b94
Revises: 40a29560c421
Create Date: 2026-06-22 00:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b41c1b1a7b94'
down_revision: Union[str, None] = '40a29560c421'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Drop order respects FKs: automation_run references automation.
_TABLES = ['automation_run', 'automation']


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
