"""drop note tables

Removes the Notes feature tables (note, pinned_note). The Notes feature
and all of its frontend/backend code has been removed from this fork.

Revision ID: ba659411dc9b
Revises: f1a2b3c4d5e6
Create Date: 2026-06-22 00:10:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ba659411dc9b'
down_revision: Union[str, None] = 'f1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # pinned_note has a FK to note, drop it first
    op.drop_table('pinned_note')
    op.drop_table('note')


def downgrade() -> None:
    op.create_table(
        'note',
        sa.Column('id', sa.Text(), nullable=False, primary_key=True, unique=True),
        sa.Column('user_id', sa.Text(), nullable=True),
        sa.Column('title', sa.Text(), nullable=True),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.Column('meta', sa.JSON(), nullable=True),
        sa.Column('access_control', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.BigInteger(), nullable=True),
        sa.Column('updated_at', sa.BigInteger(), nullable=True),
    )

    op.create_table(
        'pinned_note',
        sa.Column('id', sa.Text(), nullable=False),
        sa.Column('user_id', sa.Text(), nullable=False),
        sa.Column('note_id', sa.Text(), sa.ForeignKey('note.id', ondelete='CASCADE'), nullable=False),
        sa.Column('created_at', sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'note_id', name='uq_pinned_note'),
    )
