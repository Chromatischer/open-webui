import { describe, expect, it } from 'vitest';
import { composeAnnotatedPrompt, type Annotation } from './annotations';

const slip = (over: Partial<Annotation> = {}): Annotation => ({
	quote: 'the caching layer uses TTL',
	note: 'why not LRU?',
	source: 'assistant',
	...over
});

describe('composeAnnotatedPrompt', () => {
	it('passes the message through untouched when there are no annotations', () => {
		expect(composeAnnotatedPrompt([], '  hello  ')).toBe('hello');
	});

	it('quotes the excerpt with a source label and note', () => {
		const out = composeAnnotatedPrompt([slip()], 'my message');
		expect(out).toContain('I annotated an excerpt');
		expect(out).toContain('From your reply:\n> the caching layer uses TTL');
		expect(out).toContain('Note: why not LRU?');
		expect(out.endsWith('my message')).toBe(true);
	});

	it('blockquotes every line of a multi-line excerpt', () => {
		const out = composeAnnotatedPrompt([slip({ quote: 'one\ntwo' })], '');
		expect(out).toContain('> one\n> two');
	});

	it('pluralizes the preamble and labels each source', () => {
		const out = composeAnnotatedPrompt(
			[slip({ source: 'user' }), slip({ source: 'scratchboard' })],
			''
		);
		expect(out).toContain('some excerpts');
		expect(out).toContain('From my earlier message:');
		expect(out).toContain('From the scratchboard (our shared side notes):');
	});

	it('omits the trailing message block when the message is empty', () => {
		const out = composeAnnotatedPrompt([slip()], '   ');
		expect(out.endsWith('Note: why not LRU?')).toBe(true);
	});
});
