"""drop knowledge tables

Removes the Knowledge (knowledge base) feature tables (knowledge,
knowledge_file). The Knowledge feature and all of its frontend/backend code
(workspace management UI, chat #knowledge command, model knowledge-attach,
agent tools, router/model) has been removed from this fork. The shared
retrieval/RAG/file-upload pipeline is retained.

Downgrade is intentionally a no-op: restore from a backup if you need the
knowledge feature back.

Revision ID: b3110464bc18
Revises: 3bf04d1e0ac3
Create Date: 2026-06-23 00:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3110464bc18'
down_revision: Union[str, None] = '3bf04d1e0ac3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_TABLES = ['knowledge_file', 'knowledge']


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
