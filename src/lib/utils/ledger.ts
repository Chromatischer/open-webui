// ─── The ledger: resolving raw tool calls into readable FOLIO entries ───
//
// A tool call arrives as a bare function name plus a JSON argument blob. On the
// page it should read like a line in a manuscript ledger — a verb, the thing it
// acted on, and a note — rather than `scratchboard_write {"content":"…"}`.
//
// Two consumers:
//   • ToolCallDisplay  — one resolved entry per call (verb · object · note)
//   • ConsecutiveDetailsGroup — one headline for a whole run of calls
//
// Unknown tools (user tools, MCP servers) fall back to a de-underscored name and
// the generic "Exploring / Explored" headline, so nothing breaks when the tool
// set grows.

export const VERB_ICONS: Record<string, string> = {
	read: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
	grep: 'M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
	search: 'M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
	web: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20z',
	profile: 'M22 12h-4l-3 9L9 3l-3 9H2',
	draft: 'M20.2 12.2a6 6 0 0 0-8.4-8.4L5 10.5V19h8.5l6.7-6.8zM16 8L2 22M17.5 15H9',
	condense: 'M4 8h16M7 12h10M10 16h4',
	run: 'M5 3l14 9-14 9V3z',
	knowledge:
		'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
	clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
	memory: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
	draw: 'M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6',
	tasks: 'M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17M11 6h9M11 12h9M11 18h9',
	discard: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
	think: 'M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1'
};

export const dotIcon = 'M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z';

type LedgerEntry = {
	/** short verb for the entry's own line */
	verb: string;
	/** key into VERB_ICONS */
	icon: string;
	/** groups tools that belong to the same headline when a run is mixed */
	family: string;
	/** headline while the call is still in flight */
	pending: string;
	/** headline once it has settled */
	done: string;
	/** how one / many of these are counted in a summary */
	unit: [string, string];
	/** argument keys to prefer when summarising what was acted on */
	arg?: string[];
};

const TOOLS: Record<string, LedgerEntry> = {
	// Scratchboard
	read_scratchboard: {
		verb: 'read',
		icon: 'read',
		family: 'scratchboard',
		pending: 'Reading the scratchboard',
		done: 'Read the scratchboard',
		unit: ['scratchboard read', 'scratchboard reads']
	},
	write_scratchboard: {
		verb: 'write',
		icon: 'draft',
		family: 'scratchboard',
		pending: 'Writing',
		done: 'Wrote',
		unit: ['note', 'notes'],
		arg: ['content']
	},
	edit_scratchboard: {
		verb: 'revise',
		icon: 'draft',
		family: 'scratchboard',
		pending: 'Revising',
		done: 'Revised',
		unit: ['revision', 'revisions'],
		arg: ['old_string', 'new_string']
	},

	// Time
	get_current_timestamp: {
		verb: 'clock',
		icon: 'clock',
		family: 'time',
		pending: 'Looking at the clock',
		done: 'Looked at the clock',
		unit: ['clock check', 'clock checks']
	},
	calculate_timestamp: {
		verb: 'reckon',
		icon: 'clock',
		family: 'time',
		pending: 'Working out a date',
		done: 'Worked out a date',
		unit: ['date', 'dates']
	},

	// Memory
	search_memories: {
		verb: 'recall',
		icon: 'memory',
		family: 'memory',
		pending: 'Remembering',
		done: 'Remembered',
		unit: ['memory', 'memories'],
		arg: ['query']
	},
	list_memories: {
		verb: 'recall',
		icon: 'memory',
		family: 'memory',
		pending: 'Remembering',
		done: 'Remembered',
		unit: ['memory', 'memories']
	},
	list_memory_paths: {
		verb: 'recall',
		icon: 'memory',
		family: 'memory',
		pending: 'Remembering',
		done: 'Remembered',
		unit: ['memory', 'memories']
	},
	read_memory_path: {
		verb: 'recall',
		icon: 'memory',
		family: 'memory',
		pending: 'Remembering',
		done: 'Remembered',
		unit: ['memory', 'memories'],
		arg: ['path']
	},
	add_memory: {
		verb: 'commit',
		icon: 'memory',
		family: 'memory',
		pending: 'Committing to memory',
		done: 'Committed to memory',
		unit: ['memory', 'memories'],
		arg: ['content', 'path']
	},
	update_memory: {
		verb: 'amend',
		icon: 'memory',
		family: 'memory',
		pending: 'Amending a memory',
		done: 'Amended a memory',
		unit: ['memory', 'memories'],
		arg: ['content', 'path']
	},
	replace_memory_content: {
		verb: 'amend',
		icon: 'memory',
		family: 'memory',
		pending: 'Amending a memory',
		done: 'Amended a memory',
		unit: ['memory', 'memories'],
		arg: ['content', 'path']
	},
	delete_memory: {
		verb: 'forget',
		icon: 'discard',
		family: 'memory',
		pending: 'Forgetting',
		done: 'Forgot',
		unit: ['memory', 'memories'],
		arg: ['path']
	},

	// Chats
	search_chats: {
		verb: 'search',
		icon: 'search',
		family: 'chats',
		pending: 'Searching past chats',
		done: 'Searched past chats',
		unit: ['chat search', 'chat searches'],
		arg: ['query']
	},
	view_chat: {
		verb: 'read',
		icon: 'read',
		family: 'chats',
		pending: 'Reading a past chat',
		done: 'Read a past chat',
		unit: ['chat', 'chats'],
		arg: ['chat_id', 'id']
	},

	// Web
	search_web: {
		verb: 'search',
		icon: 'search',
		family: 'web',
		pending: 'Searching the web',
		done: 'Searched the web',
		unit: ['web search', 'web searches'],
		arg: ['query']
	},
	fetch_url: {
		verb: 'fetch',
		icon: 'web',
		family: 'web',
		pending: 'Fetching a page',
		done: 'Fetched a page',
		unit: ['page', 'pages'],
		arg: ['url']
	},

	// Images
	generate_image: {
		verb: 'draw',
		icon: 'draw',
		family: 'image',
		pending: 'Drawing',
		done: 'Drew',
		unit: ['image', 'images'],
		arg: ['prompt']
	},
	edit_image: {
		verb: 'retouch',
		icon: 'draw',
		family: 'image',
		pending: 'Retouching',
		done: 'Retouched',
		unit: ['image', 'images'],
		arg: ['prompt']
	},

	// Code
	execute_code: {
		verb: 'run',
		icon: 'run',
		family: 'code',
		pending: 'Running code',
		done: 'Ran code',
		unit: ['run', 'runs'],
		arg: ['code']
	},

	// Tasks
	create_tasks: {
		verb: 'plan',
		icon: 'tasks',
		family: 'tasks',
		pending: 'Planning',
		done: 'Planned',
		unit: ['task', 'tasks'],
		arg: ['tasks']
	},
	update_task: {
		verb: 'update',
		icon: 'tasks',
		family: 'tasks',
		pending: 'Updating the plan',
		done: 'Updated the plan',
		unit: ['task', 'tasks'],
		arg: ['status', 'id']
	}
};

// Headline for a whole family, used when a run mixes tools from one family.
const FAMILIES: Record<string, { pending: string; done: string; icon: string }> = {
	scratchboard: { pending: 'Writing', done: 'Wrote', icon: 'draft' },
	time: { pending: 'Checking the time', done: 'Checked the time', icon: 'clock' },
	memory: { pending: 'Remembering', done: 'Remembered', icon: 'memory' },
	chats: { pending: 'Looking back', done: 'Looked back', icon: 'read' },
	web: { pending: 'Searching the web', done: 'Searched the web', icon: 'search' },
	image: { pending: 'Drawing', done: 'Drew', icon: 'draw' },
	code: { pending: 'Running code', done: 'Ran code', icon: 'run' },
	tasks: { pending: 'Planning', done: 'Planned', icon: 'tasks' },
	reasoning: { pending: 'Thinking', done: 'Thought', icon: 'think' }
};

const UNKNOWN = { pending: 'Exploring', done: 'Explored', icon: 'search' };

/** The ledger entry for a tool, or a best-effort one derived from its name. */
export const resolveTool = (name = ''): LedgerEntry => {
	const key = String(name).trim();
	if (TOOLS[key]) return TOOLS[key];

	const spaced = key.replace(/[_-]+/g, ' ').trim() || 'tool';
	return {
		verb: spaced,
		icon: 'search',
		family: `other:${key}`,
		pending: UNKNOWN.pending,
		done: UNKNOWN.done,
		unit: [spaced, `${spaced} calls`]
	};
};

export const verbIcon = (name = ''): string => VERB_ICONS[resolveTool(name).icon] ?? dotIcon;

/**
 * What a call acted on: the interesting argument, not the whole blob.
 * Prefers the tool's declared argument keys, then common ones, then the first
 * scalar value — an object dumped as JSON is noise on a one-line entry.
 */
export const toolObject = (name = '', args: unknown, limit = 64): string => {
	if (!args || typeof args !== 'object' || Array.isArray(args)) return '';
	const record = args as Record<string, unknown>;

	const stringify = (v: unknown) =>
		typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '');

	const preferred = [
		...(resolveTool(name).arg ?? []),
		'query',
		'q',
		'url',
		'path',
		'name',
		'title'
	];
	let value = '';
	for (const key of preferred) {
		if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
			value = stringify(record[key]);
			break;
		}
	}
	if (!value) {
		const scalar = Object.values(record).find(
			(v) => v !== undefined && v !== null && v !== '' && typeof v !== 'object'
		);
		value =
			scalar !== undefined ? stringify(scalar) : Object.values(record).map(stringify).join(', ');
	}

	const cleaned = value.replace(/\s+/g, ' ').trim();
	return cleaned.length > limit ? `${cleaned.slice(0, limit)}…` : cleaned;
};

/**
 * The headline for a run of calls: their shared verb when they agree, the
 * family verb when they only agree on subject, "Exploring / Explored" otherwise.
 */
export const ledgerHeadline = (
	names: string[],
	pending: boolean
): { text: string; icon: string } => {
	const phase = pending ? 'pending' : 'done';
	if (names.length === 0) return { text: UNKNOWN[phase], icon: VERB_ICONS[UNKNOWN.icon] };

	const entries = names.map(resolveTool);

	const uniqueNames = new Set(names);
	if (uniqueNames.size === 1) {
		const entry = entries[0];
		return { text: entry[phase], icon: VERB_ICONS[entry.icon] ?? dotIcon };
	}

	const families = new Set(entries.map((e) => e.family));
	if (families.size === 1) {
		const family = FAMILIES[entries[0].family];
		if (family) return { text: family[phase], icon: VERB_ICONS[family.icon] ?? dotIcon };
	}

	return { text: UNKNOWN[phase], icon: VERB_ICONS[UNKNOWN.icon] ?? dotIcon };
};

/** "2 notes, 1 web search" — what a run touched, counted by unit. */
export const ledgerCounts = (names: string[]): string => {
	const counts = new Map<string, number>();
	for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);

	return [...counts.entries()]
		.map(([name, count]) => {
			const [one, many] = resolveTool(name).unit;
			return `${count} ${count === 1 ? one : many}`;
		})
		.join(', ');
};
