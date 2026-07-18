import json
from types import SimpleNamespace

import pytest
from open_webui.tools import builtin
from open_webui.utils.middleware import _parse_non_streaming_tool_followup


@pytest.mark.asyncio
async def test_scratchboard_mutations_emit_content_without_echoing_it(monkeypatch):
    original = 'A' * 20_000 + '\nunique marker\n'
    emitted = []
    saved = []

    async def get_scratchboard(chat_id, user_id):
        assert (chat_id, user_id) == ('chat-1', 'user-1')
        return original

    async def update_scratchboard(chat_id, user_id, content):
        assert (chat_id, user_id) == ('chat-1', 'user-1')
        saved.append(content)
        return SimpleNamespace(updated_at=123)

    async def event_emitter(event):
        emitted.append(event)

    monkeypatch.setattr(builtin.Chats, 'get_chat_scratchboard_by_id', get_scratchboard)
    monkeypatch.setattr(builtin.Chats, 'update_chat_scratchboard_by_id', update_scratchboard)

    write_result = json.loads(
        await builtin.write_scratchboard(
            original,
            __chat_id__='chat-1',
            __event_emitter__=event_emitter,
            __user__={'id': 'user-1'},
        )
    )
    edit_result = json.loads(
        await builtin.edit_scratchboard(
            'unique marker',
            'replacement',
            __chat_id__='chat-1',
            __event_emitter__=event_emitter,
            __user__={'id': 'user-1'},
        )
    )

    assert write_result == {'status': 'success', 'characters': len(original), 'updated_at': 123}
    assert edit_result == {
        'status': 'success',
        'replacements': 1,
        'characters': len(original.replace('unique marker', 'replacement')),
        'updated_at': 123,
    }
    assert 'content' not in write_result
    assert 'content' not in edit_result
    assert saved == [original, original.replace('unique marker', 'replacement')]
    assert [event['data']['content'] for event in emitted] == saved


def test_non_streaming_tool_followup_parses_text_and_usage():
    parsed = _parse_non_streaming_tool_followup(
        {
            'choices': [{'message': {'content': 'Final answer'}}],
            'usage': {'prompt_tokens': 10, 'completion_tokens': 3, 'total_tokens': 13},
        }
    )

    assert parsed['error'] is None
    assert parsed['tool_calls'] == []
    assert parsed['output'][0]['type'] == 'message'
    assert parsed['output'][0]['content'][0]['text'] == 'Final answer'
    assert parsed['usage']['input_tokens'] == 10
    assert parsed['usage']['output_tokens'] == 3


def test_non_streaming_tool_followup_reenters_tool_loop():
    tool_call = {
        'id': 'call-1',
        'type': 'function',
        'function': {'name': 'read_scratchboard', 'arguments': '{}'},
    }
    parsed = _parse_non_streaming_tool_followup(
        {'choices': [{'message': {'content': None, 'tool_calls': [tool_call]}}]}
    )

    assert parsed['error'] is None
    assert parsed['tool_calls'] == [tool_call]
    assert parsed['output'] == [
        {
            'type': 'function_call',
            'id': 'call-1',
            'call_id': 'call-1',
            'name': 'read_scratchboard',
            'arguments': '{}',
            'status': 'in_progress',
        }
    ]


@pytest.mark.parametrize(
    ('response', 'message'),
    [
        ({'error': {'message': 'upstream failed'}}, 'upstream failed'),
        ({'choices': []}, 'Provider returned an empty response'),
        ({}, 'Provider returned an empty response'),
    ],
)
def test_non_streaming_tool_followup_surfaces_errors(response, message):
    parsed = _parse_non_streaming_tool_followup(response)

    assert parsed['output'] == []
    assert parsed['tool_calls'] == []
    assert parsed['error']['message'] == message
