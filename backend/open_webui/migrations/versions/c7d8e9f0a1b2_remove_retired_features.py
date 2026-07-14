"""Remove data and schema for features retired by the FOLIO fork.

Revision ID: c7d8e9f0a1b2
Revises: 42e2978c7933, b3110464bc18
Create Date: 2026-07-14 00:00:00.000000

This is the terminal convergence migration for the upstream 0.10.2 merge.
It is deliberately tolerant of the fork's earlier drop migrations and works
with both SQLite and PostgreSQL.
"""

from __future__ import annotations

from typing import Any, Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = 'c7d8e9f0a1b2'
down_revision: Union[str, tuple[str, str]] = ('42e2978c7933', 'b3110464bc18')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_RETIRED_NAMES = {
    'audio',
    'automation',
    'calendar',
    'channel',
    'evaluation',
    'feedback',
    'knowledge',
    'note',
    'playground',
    'prompt',
    'skill',
    'speech',
    'stt',
    'tts',
    'voice',
}
_TABLES = (
    'automation_run',
    'automation',
    'calendar_event_attendee',
    'calendar_event',
    'calendar',
    'channel_file',
    'channel_webhook',
    'message_reaction',
    'reaction',
    'message',
    'channel_member',
    'channel',
    'knowledge_file',
    'knowledge_directory',
    'knowledge',
    'pinned_note',
    'note',
    'prompt_history',
    'prompt',
    'skill',
    'feedback',
)
_CONFIG_PREFIXES = (
    'audio.',
    'automations.',
    'calendar.',
    'channels.',
    'evaluations.',
    'knowledge.',
    'notes.',
    'skills.',
)
_RETIRED_JSON_KEYS = {
    'automation_id',
    'automation_ids',
    'calendar_id',
    'calendar_ids',
    'channel_id',
    'channel_ids',
    'evaluation_id',
    'evaluation_ids',
    'feedback_id',
    'feedback_ids',
    'knowledge',
    'knowledge_id',
    'knowledge_ids',
    'note_id',
    'note_ids',
    'prompt_ids',
    'prompts',
    'skill_ids',
    'skills',
}
_JSON_COLUMNS = {
    'chat': ('chat', 'meta'),
    'model': ('meta', 'params'),
    'user': ('settings',),
    'group': ('permissions',),
}


def _retired_key(key: object) -> bool:
    value = str(key).replace('-', '_')
    snake_case = ''.join(f'_{char.lower()}' if char.isupper() else char for char in value).lstrip('_')
    return snake_case.lower() in _RETIRED_JSON_KEYS


def _clean_json(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _clean_json(item) for key, item in value.items() if not _retired_key(key)}
    if isinstance(value, list):
        return [_clean_json(item) for item in value if not (isinstance(item, str) and _retired_key(item))]
    return value


def _clean_persisted_json(bind: sa.Connection, inspector: sa.Inspector) -> None:
    existing = set(inspector.get_table_names())
    metadata = sa.MetaData()
    for table_name, candidates in _JSON_COLUMNS.items():
        if table_name not in existing:
            continue
        table = sa.Table(table_name, metadata, autoload_with=bind)
        primary_keys = list(table.primary_key.columns)
        if not primary_keys:
            continue
        json_columns = [table.c[name] for name in candidates if name in table.c]
        if not json_columns:
            continue
        for row in bind.execute(sa.select(*primary_keys, *json_columns)).mappings():
            updates = {
                column.name: cleaned
                for column in json_columns
                if (cleaned := _clean_json(row[column.name])) != row[column.name]
            }
            if updates:
                predicate = sa.and_(*(column == row[column.name] for column in primary_keys))
                bind.execute(table.update().where(predicate).values(**updates))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())

    if 'access_grant' in existing:
        grant = sa.table('access_grant', sa.column('resource_type', sa.Text()))
        bind.execute(sa.delete(grant).where(sa.func.lower(grant.c.resource_type).in_(_RETIRED_NAMES)))

    if 'config' in existing:
        config = sa.table('config', sa.column('key', sa.Text()))
        conditions = [sa.func.lower(config.c.key).like(f'{prefix}%') for prefix in _CONFIG_PREFIXES]
        bind.execute(sa.delete(config).where(sa.or_(*conditions)))

    _clean_persisted_json(bind, inspector)

    # Re-inspect before every drop so this remains safe after partial/manual cleanup.
    for table_name in _TABLES:
        if table_name in set(sa.inspect(bind).get_table_names()):
            op.drop_table(table_name)


def downgrade() -> None:
    raise RuntimeError(
        'The retired-feature cleanup is irreversible. Restore the database and data directory from backup.'
    )
