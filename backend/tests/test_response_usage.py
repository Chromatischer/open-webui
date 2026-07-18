from open_webui.utils.response import merge_usage, normalize_usage


def test_normalize_usage_records_context_after_response():
    usage = normalize_usage(
        {
            'prompt_tokens': 120,
            'completion_tokens': 18,
            'total_tokens': 138,
        }
    )

    assert usage['input_tokens'] == 120
    assert usage['output_tokens'] == 18
    assert usage['total_tokens'] == 138
    assert usage['context_tokens'] == 138


def test_merge_usage_keeps_latest_context_while_summing_billing_tokens():
    first = normalize_usage({'prompt_tokens': 100, 'completion_tokens': 10})
    followup = normalize_usage({'prompt_tokens': 145, 'completion_tokens': 8})

    merged = merge_usage(first, followup)

    assert merged['input_tokens'] == 245
    assert merged['output_tokens'] == 18
    assert merged['total_tokens'] == 263
    assert merged['prompt_tokens'] == 245
    assert merged['completion_tokens'] == 18
    assert merged['context_tokens'] == 153
