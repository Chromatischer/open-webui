export type AnnotationSource = 'user' | 'assistant' | 'scratchboard';

export interface Annotation {
	quote: string;
	note: string;
	source: AnnotationSource;
}

const SOURCE_LABEL: Record<AnnotationSource, string> = {
	user: 'From my earlier message',
	assistant: 'From your reply',
	scratchboard: 'From the scratchboard (our shared side notes)'
};

export function composeAnnotatedPrompt(annotations: Annotation[], message: string): string {
	const msg = message.trim();
	if (annotations.length === 0) return msg;
	const preamble =
		'I annotated ' +
		(annotations.length === 1 ? 'an excerpt' : 'some excerpts') +
		' from this conversation. Each quote names its source; the note beneath it is my comment on that excerpt.';
	const blocks = annotations.map((a) => {
		const quote = a.quote
			.trim()
			.split('\n')
			.map((l) => `> ${l}`)
			.join('\n');
		return `${SOURCE_LABEL[a.source]}:\n${quote}\n\nNote: ${a.note.trim()}`;
	});
	return [preamble, ...blocks, msg].filter(Boolean).join('\n\n');
}
