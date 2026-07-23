import { describe, expect, it } from 'vitest';
import { ledgerHeadline, ledgerCounts, toolObject, resolveTool } from './ledger';

describe('ledger', () => {
	it('names a single-tool run by that tool', () => {
		expect(ledgerHeadline(['write_scratchboard'], false).text).toBe('Wrote');
		expect(ledgerHeadline(['write_scratchboard'], true).text).toBe('Writing');
		expect(ledgerHeadline(['get_current_timestamp'], false).text).toBe('Looked at the clock');
		expect(ledgerHeadline(['search_memories', 'search_memories'], true).text).toBe('Remembering');
	});

	it('falls back to the family when a run mixes tools of one kind', () => {
		expect(ledgerHeadline(['write_scratchboard', 'edit_scratchboard'], false).text).toBe('Wrote');
		expect(ledgerHeadline(['add_memory', 'search_memories'], false).text).toBe('Remembered');
		expect(ledgerHeadline(['search_web', 'fetch_url'], true).text).toBe('Searching the web');
	});

	it('falls back to Explored when a run is genuinely mixed', () => {
		expect(ledgerHeadline(['search_web', 'write_scratchboard'], false).text).toBe('Explored');
		expect(ledgerHeadline(['some_mcp_tool'], false).text).toBe('Explored');
		expect(ledgerHeadline([], false).text).toBe('Explored');
	});

	it('counts by unit', () => {
		expect(ledgerCounts(['write_scratchboard', 'write_scratchboard'])).toBe('2 notes');
		expect(ledgerCounts(['search_web', 'write_scratchboard'])).toBe('1 web search, 1 note');
	});

	it('picks the interesting argument', () => {
		expect(toolObject('search_web', { query: 'folio design', count: 5 })).toBe('folio design');
		expect(toolObject('fetch_url', { url: 'https://example.com' })).toBe('https://example.com');
		expect(toolObject('write_scratchboard', { content: '# Notes\n\n- a\n- b' })).toBe(
			'# Notes - a - b'
		);
		expect(toolObject('unknown_tool', { foo: 'bar' })).toBe('bar');
		expect(toolObject('search_web', 'not an object')).toBe('');
		expect(toolObject('search_web', { query: 'x'.repeat(200) }).length).toBe(65);
	});

	it('derives a verb for unknown tools', () => {
		expect(resolveTool('my_custom_tool').verb).toBe('my custom tool');
		expect(resolveTool('').verb).toBe('tool');
	});
});
