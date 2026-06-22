"""drop channel tables

Removes the Channels feature tables (channel, channel_member, channel_file,
channel_webhook, message). The Channels feature and all of its
frontend/backend code has been removed from this fork.

Downgrade is intentionally a no-op: the channel schema was built up across
many migrations and is not meaningfully restorable here. Restore from a
backup if you need the channels feature back.

Revision ID: 40a29560c421
Revises: ba659411dc9b
Create Date: 2026-06-22 00:20:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '40a29560c421'
down_revision: Union[str, None] = 'ba659411dc9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Drop order respects FKs: children that reference `channel` go first.
_TABLES = ['channel_file', 'channel_webhook', 'message', 'channel_member', 'channel']


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
