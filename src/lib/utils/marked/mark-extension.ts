// mark-extension.ts
//
// Inline marked extensions for FOLIO's custom note-taking text styles:
//   ==text==  → <mark>               a real highlighter backset
//   %text%    → <span class=md-hl>   a second highlighter colour
//   &text&    → <span class=md-anim> bold that animates in, left → right
//
// All are opt-in inline wraps requiring a non-space immediately inside the
// markers (so "fish & chips", "50% off", "a == b" don't trigger). == and %
// lex their inner content as markdown so nested emphasis works; & is plain
// text — its inner string is mirrored into a data-attribute so the animated
// bold overlay can duplicate it.

function firstIndexOf(ch: string) {
	return (src: string) => {
		const i = src.indexOf(ch);
		return i < 0 ? -1 : i;
	};
}

export function markExtension() {
	const re = /^==(?=\S)([\s\S]*?\S)==/;
	return {
		name: 'mark',
		level: 'inline' as const,
		start: firstIndexOf('=='),
		tokenizer(this: any, src: string) {
			const m = re.exec(src);
			if (!m) return;
			return { type: 'mark', raw: m[0], text: m[1], tokens: this.lexer.inlineTokens(m[1]) };
		}
	};
}

export function colorHighlightExtension() {
	const re = /^%(?=\S)([^%\n]*?\S)%/;
	return {
		name: 'colorHl',
		level: 'inline' as const,
		start: firstIndexOf('%'),
		tokenizer(this: any, src: string) {
			const m = re.exec(src);
			if (!m) return;
			return { type: 'colorHl', raw: m[0], text: m[1], tokens: this.lexer.inlineTokens(m[1]) };
		}
	};
}

export function animBoldExtension() {
	const re = /^&(?=\S)([^&\n]*?\S)&/;
	return {
		name: 'animBold',
		level: 'inline' as const,
		start: firstIndexOf('&'),
		tokenizer(src: string) {
			const m = re.exec(src);
			if (!m) return;
			return { type: 'animBold', raw: m[0], text: m[1] };
		}
	};
}

// Usage:
// import { marked } from 'marked';
// import markExtension from '$lib/utils/marked/mark-extension';
// marked.use(markExtension());
export default function () {
	return { extensions: [markExtension(), colorHighlightExtension(), animBoldExtension()] };
}
