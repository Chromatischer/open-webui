<script>
	import { flushSync, tick } from 'svelte';
	import { browser } from '$app/environment';

	/*
	 * FOLIO — the conversation as a living manuscript.
	 *
	 * Not a message log: a document the user and the agent typeset together.
	 * Prompts are section headings, responses are passages, tool runs are
	 * ledger stamps, the composer is the document's growing edge.
	 *
	 * The Archive (sidebar) holds older folios; the Margin (scratchboard) is
	 * a shared surface both hands can write on — the agent's edits stream in
	 * live and everything persists in localStorage.
	 */

	const STORE_KEY = 'folio-proto-v1';

	// ─── Theme ───
	let dark = $state(false);

	function triggerThemeRipple(e) {
		const rect = e.currentTarget.getBoundingClientRect();
		const x = rect.left + rect.width / 2;
		const y = rect.top + rect.height / 2;
		const maxR = Math.hypot(
			Math.max(x, window.innerWidth - x),
			Math.max(y, window.innerHeight - y)
		);
		const oldBg = dark ? '#181410' : '#f5f1e8';
		const gradient = `radial-gradient(circle var(--reveal-r) at ${x}px ${y}px, transparent 99.9%, black 100%)`;
		const el = document.createElement('div');
		el.style.cssText = `position:fixed;inset:0;z-index:9999;pointer-events:none;background:${oldBg};--reveal-r:0px;mask-image:${gradient};-webkit-mask-image:${gradient}`;
		document.body.appendChild(el);
		flushSync(() => (dark = !dark));
		el.animate([{ '--reveal-r': '0px' }, { '--reveal-r': `${maxR}px` }], {
			duration: 650,
			easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
		}).finished.then(() => el.remove());
	}

	// ─── Folios ───
	// quires: folios gathered into folders, the way loose leaves are sewn together
	const seedQuires = [{ id: 'q-design', name: 'Design studies', open: true }];

	const seedFolios = [
		{
			id: 'f7',
			no: 7,
			title: 'On Quiet Interfaces',
			date: 'today',
			quire: 'q-design',
			scratch:
				'# Scratchboard\n\n- bubbles → headings: decided\n- one nav axis, the spine\n- agent works in the open, on the page\n\n— next: palette tokens into app.css',
			sections: [
				{
					id: 's1',
					prompt:
						'I don’t want a chat app. I want a place where thinking gets typeset — where the two of us write one document together. Show me what that looks like.',
					time: '09:41',
					fresh: false,
					blocks: [
						{
							type: 'think',
							text: 'A chat log treats every utterance as equal. A manuscript has hierarchy: questions become headings, answers become passages, actions become marginalia. Structure should come from typography, not from bubbles.'
						},
						{
							type: 'p',
							dropcap: true,
							text: 'Begin by deleting the bubbles. A bubble says “this is a transmission” — something sent, finished, sealed. But our work is not finished when it is sent; you annotate it, I revise it, we fold it back in. So the page stays open. Your words become section headings, set large and in serif, because a question is a heading: everything after it hangs from it.'
						},
						{
							type: 'quote',
							text: 'Chrome recedes, content leads. The interface should feel like good paper — you only notice it when it’s wrong.'
						},
						{
							type: 'p',
							text: 'Everything else follows from that one decision. Navigation collapses to a single spine in the margin — one thread, one node per section, filled with ink as far as you’ve read. The composer stops being a dock bolted to the bottom of a viewport and becomes the next blank line of the page. And when I act — search, run, edit — the act is stamped into the record like an entry in a ledger, because an agent’s work belongs in the document, not in a toast that vanishes.'
						}
					]
				},
				{
					id: 's2',
					prompt: 'Make it real. Audit what we have and tell me what has to go.',
					time: '09:48',
					fresh: false,
					blocks: [
						{
							type: 'ledger',
							entries: [
								{ verb: 'read', object: 'src/app.css', note: '1,442 lines', status: 'done' },
								{
									verb: 'grep',
									object: 'bg-gray-* across components',
									note: '411 matches · 96 files',
									status: 'done'
								},
								{
									verb: 'profile',
									object: 'first contentful paint',
									note: '2.3 s cold',
									status: 'done'
								}
							]
						},
						{
							type: 'p',
							text: 'The verdict is consistent: the surface carries more chrome than content. Four hundred and eleven hard-coded grays means four hundred and eleven places the theme cannot reach. Most of the weight is ceremony — confirmations, duplicate menus, settings that restate other settings.'
						},
						{
							type: 'list',
							items: [
								'Bubbles, avatars-per-message, and the role iconography — typography already carries the roles.',
								'Every Save button whose action could simply happen. Autosave with a quiet status dot.',
								'Second navigation axes. The spine is the map; the page is the territory.',
								'Toasts for agent actions. Actions are entries in the record, not interruptions.'
							]
						}
					]
				},
				{
					id: 's3',
					prompt: 'And the ink? Show me the palette.',
					time: '09:54',
					fresh: false,
					blocks: [
						{
							type: 'p',
							text: 'Three inks on warm paper, like a letterpress shop: iron-gall for text, vermilion for your hand, ultramarine for mine. Nothing else gets a color, so when color appears, it means someone acted.'
						},
						{
							type: 'code',
							lang: 'css',
							code: '--paper:        #f5f1e8;   /* warm stock, never pure white */\n--ink:          #26221b;   /* iron-gall, never pure black */\n--vermilion:    #c2491d;   /* the user’s hand            */\n--ultramarine:  #4f55c9;   /* the agent’s hand           */\n--gold-leaf:    #f3d27d;   /* highlights & marginalia    */'
						},
						{
							type: 'p',
							text: 'At night the desk turns over: paper becomes umber, the inks glow instead of stain. Same three voices, lower light. Try the lamp in the letterhead.'
						}
					]
				}
			]
		},
		{
			id: 'f6',
			no: 6,
			title: 'Drawer Gestures, Unified',
			date: 'May 30',
			quire: 'q-design',
			scratch:
				'# Scratchboard\n\n- one gesture grammar for both drawers\n- velocity > distance for commit',
			sections: [
				{
					id: 'f6s1',
					prompt: 'Both drawers should answer to the same gesture. What’s the grammar?',
					time: '21:12',
					fresh: false,
					blocks: [
						{
							type: 'p',
							text: 'One axis, one verb: horizontal drag owns navigation. Commit on velocity, not distance — a confident flick from anywhere beats a long careful drag. The scratchboard peels from the right with the same physics the archive uses on the left, so the hand only learns one motion.'
						}
					]
				}
			]
		},
		{
			id: 'f4',
			no: 4,
			title: 'RAG Chunking Strategy',
			date: 'May 18',
			scratch:
				'# Scratchboard\n\n- recursive 0.82 / semantic 0.87 precision\n- overlap sweep: 48 / 64 / 96 tokens',
			sections: [
				{
					id: 'f4s1',
					prompt: 'Recursive or semantic chunking for the legal corpus?',
					time: '15:03',
					fresh: false,
					blocks: [
						{
							type: 'ledger',
							entries: [
								{
									verb: 'search',
									object: 'retrieval eval, 240 queries',
									note: 'p@5 +0.05 semantic',
									status: 'done'
								}
							]
						},
						{
							type: 'p',
							text: 'Semantic wins on statutes because section boundaries are meaning boundaries. Keep recursive as the fallback for unstructured exhibits, and sweep overlap at 64 tokens first — it carried most of the gain.'
						}
					]
				}
			]
		},
		{
			id: 'f1',
			no: 1,
			title: 'Server Migration Notes',
			date: 'Apr 02',
			scratch:
				'# Scratchboard\n\n- volumes snapshotted before cutover\n- rollback: compose down, retag, up',
			sections: [
				{
					id: 'f1s1',
					prompt: 'Walk me through the cutover plan one more time.',
					time: '11:20',
					fresh: false,
					blocks: [
						{
							type: 'p',
							text: 'Snapshot the volumes, drain the old container, retag :stable, bring the fork up under compose, verify health, then point the proxy. Rollback is the same dance in reverse — five minutes, no data loss, no heroics.'
						}
					]
				}
			]
		}
	];

	function loadFolios() {
		if (!browser) return null;
		try {
			const raw = localStorage.getItem(STORE_KEY);
			if (!raw) return null;
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed?.folios) || !parsed.folios.length) return null;
			return parsed;
		} catch {
			return null;
		}
	}

	const stored = loadFolios();
	let folios = $state(stored?.folios ?? seedFolios);
	// a press stored before quires existed simply has none yet
	let quires = $state(stored ? (stored.quires ?? []) : seedQuires);
	let currentId = $state(stored?.currentId ?? 'f7');
	if (stored?.dark) dark = true;

	let current = $derived(folios.find((f) => f.id === currentId) ?? folios[0]);

	// debounce-persist the whole press to localStorage
	let persistT;
	$effect(() => {
		const snapshot = JSON.stringify({
			folios: $state.snapshot(folios),
			quires: $state.snapshot(quires),
			currentId,
			dark
		});
		if (!browser) return;
		clearTimeout(persistT);
		persistT = setTimeout(() => localStorage.setItem(STORE_KEY, snapshot), 500);
	});

	function resetPress() {
		localStorage.removeItem(STORE_KEY);
		location.reload();
	}

	// ─── Title (commit on blur; oninput would fight the caret) ───
	let saveState = $state('idle'); // idle | saving | saved
	let saveT1, saveT2;
	function pulseSave() {
		saveState = 'saving';
		clearTimeout(saveT1);
		clearTimeout(saveT2);
		saveT1 = setTimeout(() => {
			saveState = 'saved';
			saveT2 = setTimeout(() => (saveState = 'idle'), 1400);
		}, 520);
	}

	const today = new Date().toLocaleDateString('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	function greetingFor(hour) {
		if (hour < 5) return 'Up late';
		if (hour < 12) return 'Good morning';
		if (hour < 18) return 'Good afternoon';
		return 'Good evening';
	}
	const greeting = `${greetingFor(new Date().getHours())}, Dominik.`;

	// ─── The Archive (sidebar) + mobile Margin drawer ───
	let sidebarOpen = $state(false);
	let marginDrawer = $state(false);
	let winW = $state(1200);
	let winH = $state(800);
	let isNarrow = $derived(winW <= 1080);
	let cursorX = $state(500);
	let cursorY = $state(360);
	let proximity = $derived(Math.max(0, Math.min(1, 1 - cursorX / 80)));
	let notchW = $derived(12 + proximity * 26);
	let notchH = $derived(52 + proximity * 30);
	let proximityR = $derived(Math.max(0, Math.min(1, 1 - (winW - cursorX) / 80)));
	let notchWR = $derived(12 + proximityR * 26);
	let notchHR = $derived(52 + proximityR * 30);
	let notchY = $derived(Math.max(48, Math.min(cursorY, winH - 48)));

	// edge-swipe: same gesture grammar on both drawers
	let tX = 0;
	let tY = 0;
	let tEdge = null;
	function onTouchStart(e) {
		const t = e.touches[0];
		tX = t.clientX;
		tY = t.clientY;
		tEdge = t.clientX < 28 ? 'left' : t.clientX > winW - 28 ? 'right' : null;
	}
	function onTouchEnd(e) {
		const t = e.changedTouches[0];
		const dx = t.clientX - tX;
		const dy = t.clientY - tY;
		if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
		if (dx > 0) {
			if (marginDrawer) marginDrawer = false;
			else if (tEdge === 'left') sidebarOpen = true;
		} else {
			if (sidebarOpen) sidebarOpen = false;
			else if (tEdge === 'right' && isNarrow) marginDrawer = true;
		}
	}

	function selectFolio(id) {
		currentId = id;
		sidebarOpen = false;
		tick().then(() => scroller?.scrollTo({ top: 0 }));
	}

	function newFolio() {
		const no = Math.max(...folios.map((f) => f.no)) + 1;
		const folio = {
			id: 'f' + Date.now(),
			no,
			title: 'Untitled folio',
			date: 'today',
			scratch: '# Scratchboard\n',
			sections: []
		};
		folios.push(folio);
		selectFolio(folio.id);
		setTimeout(() => composerEl?.focus(), 80);
	}

	// ─── Quires: gather, file, unfile (drag a folio onto a quire to file it) ───
	let renamingQuire = $state(null);
	let dragId = $state(null);
	let dropQuire = $state(null); // a quire id, or 'new' while over the gather button

	// the archive flattened to rows: quire heads, their filed folios, then loose leaves
	let archRows = $derived.by(() => {
		const sorted = [...folios].sort((a, b) => b.no - a.no);
		const known = new Set(quires.map((q) => q.id));
		const rows = [];
		for (const q of quires) {
			const filed = sorted.filter((f) => f.quire === q.id);
			rows.push({ kind: 'quire', key: 'q:' + q.id, q, count: filed.length });
			if (q.open) {
				if (!filed.length) rows.push({ kind: 'empty', key: 'e:' + q.id, q });
				for (const f of filed) rows.push({ kind: 'folio', key: f.id, f, q });
			}
		}
		for (const f of sorted) {
			if (!f.quire || !known.has(f.quire)) rows.push({ kind: 'folio', key: f.id, f, q: null });
		}
		return rows;
	});

	function newQuire() {
		quires.unshift({ id: 'q' + Date.now(), name: 'New quire', open: true });
		const q = quires[0];
		startRenameQuire(q);
		return q;
	}

	async function startRenameQuire(q) {
		renamingQuire = q.id;
		await tick();
		const el = document.getElementById('qn-' + q.id);
		if (el) {
			el.focus();
			const r = document.createRange();
			r.selectNodeContents(el);
			const s = window.getSelection();
			s.removeAllRanges();
			s.addRange(r);
		}
	}

	// dissolving a quire returns its folios to the loose archive — nothing is lost
	function dissolveQuire(id) {
		for (const f of folios) if (f.quire === id) f.quire = null;
		quires = quires.filter((q) => q.id !== id);
		if (renamingQuire === id) renamingQuire = null;
	}

	function fileInto(id) {
		const f = folios.find((x) => x.id === dragId);
		const q = quires.find((x) => x.id === id);
		if (f && q) {
			f.quire = q.id;
			q.open = true;
		}
		dragId = null;
		dropQuire = null;
	}

	function unfile() {
		const f = folios.find((x) => x.id === dragId);
		if (f) f.quire = null;
		dragId = null;
		dropQuire = null;
	}

	function gatherInto() {
		const id = dragId;
		dragId = null;
		dropQuire = null;
		const f = folios.find((x) => x.id === id);
		if (f) f.quire = newQuire().id;
	}

	// ─── The manuscript ───
	let generating = $state(false);
	let composerText = $state('');
	let composerEl = $state(null);
	let scroller = $state(null);
	let pilcrowHop = $state(false);

	let cannedIdx = 0;
	const canned = [
		[
			{
				type: 'think',
				text: 'Continue in the same register — concrete, calm, no filler. The manuscript should read as one voice even across sections.'
			},
			{
				type: 'p',
				text: 'Noted, and set. The advantage of a manuscript is that a thought like this one lands as a passage in the record rather than a message in a queue — you can mark it, annotate it, or strike it, and the document simply carries the correction forward.'
			}
		],
		[
			{
				type: 'ledger',
				entries: [
					{
						verb: 'search',
						object: 'manuscript for open questions',
						note: '3 found',
						status: 'run'
					},
					{ verb: 'draft', object: 'notes → scratchboard', note: 'autosaved', status: 'run' }
				]
			},
			{
				type: 'p',
				text: 'Done — and look to the margin: I’ve written these notes onto our shared scratchboard, where they’ll keep. That is the agent-first bargain. I work in the open, on the page, where my edits can be audited and reversed like anyone else’s.'
			}
		]
	];

	// ─── The Query: the agent puts structured questions to the user ───
	// Opens in place of the composer (the edge). Up to 3 questions, up to 5
	// options each, single- or multiple-choice, each with a title and an
	// optional one-line gloss — plus a write-your-own line and a skip.
	let pendingQuery = $state(null);
	let queryHostSec = $state(null); // the agent turn that called the tool — its ledger holds the result
	let qAns = $state([]);
	let qIndex = $state(0);
	let qDir = $state(1);
	let querySealing = $state(false);

	let curQ = $derived(pendingQuery ? pendingQuery.questions[qIndex] : null);
	let curAns = $derived(pendingQuery ? qAns[qIndex] : null);
	let isLastQ = $derived(!!pendingQuery && qIndex === pendingQuery.questions.length - 1);
	let qAnswered = $derived(
		!!curAns && (curAns.picks.length > 0 || curAns.custom.trim().length > 0 || curAns.skipped)
	);
	// the meter only advances when you move on (Next / skip), never on selection alone
	let qCommitted = $state(new Set());
	let qDone = $derived(pendingQuery ? qCommitted.size : 0);
	let qProgress = $derived(pendingQuery ? qDone / pendingQuery.questions.length : 0);

	// The canned inquiry the prototype's agent poses — exercises every shape:
	// single + glosses + a suggested mark + write-your-own; multi with the full
	// five options; and a single with no write-your-own. Mirrors the tool's
	// eventual call signature (questions[] · options[] · multi · allowCustom · allowSkip).
	function makeQuery() {
		return {
			id: 'q' + Date.now(),
			questions: [
				{
					id: 'q1',
					prompt: 'How boldly should I reset the composer’s ink?',
					multi: false,
					allowCustom: true,
					allowSkip: true,
					options: [
						{
							id: 'a',
							title: 'Touch it lightly',
							explain: 'Recolour the edge; leave every line of markup where it sits.'
						},
						{
							id: 'b',
							title: 'Reshape the edge',
							explain: 'Redraw the rule and the seal, but keep the page’s layout intact.',
							recommend: true
						},
						{
							id: 'c',
							title: 'Rebuild it whole',
							explain: 'Make the composer the page’s living edge, from the studs out.'
						}
					]
				},
				{
					id: 'q2',
					prompt: 'And which surfaces should take the same ink?',
					multi: true,
					allowCustom: true,
					allowSkip: true,
					options: [
						{ id: 'a', title: 'The composer' },
						{ id: 'b', title: 'Section headings', explain: 'The §-numbered serif prompts.' },
						{ id: 'c', title: 'The ledger stamps' },
						{ id: 'd', title: 'The margin', explain: 'Our shared scratchboard.' },
						{ id: 'e', title: 'The archive' }
					]
				},
				{
					id: 'q3',
					prompt: 'And where shall I set it down?',
					multi: false,
					allowCustom: false,
					allowSkip: true,
					options: [
						{ id: 'a', title: 'design/folio-main' },
						{ id: 'b', title: 'A fresh feature branch', recommend: true },
						{ id: 'c', title: 'main — I’ll risk it' }
					]
				}
			]
		};
	}

	function poseQuery(query, hostSec) {
		pendingQuery = query;
		queryHostSec = hostSec;
		qAns = pendingQuery.questions.map(() => ({
			picks: [],
			custom: '',
			customOpen: false,
			skipped: false
		}));
		qCommitted = new Set();
		qIndex = 0;
		qDir = 1;
		tick().then(scrollToEdge);
	}

	function pickOption(optId) {
		const a = qAns[qIndex];
		a.skipped = false;
		if (curQ.multi) {
			a.picks = a.picks.includes(optId) ? a.picks.filter((x) => x !== optId) : [...a.picks, optId];
		} else {
			a.picks = [optId];
			a.customOpen = false;
			a.custom = '';
		}
	}

	function openCustom() {
		const a = qAns[qIndex];
		a.skipped = false;
		a.customOpen = true;
		if (!curQ.multi) a.picks = [];
		tick().then(() => {
			const el = document.getElementById('qcustom-' + qIndex);
			if (el) {
				el.focus();
				el.style.height = 'auto';
				el.style.height = el.scrollHeight + 'px';
			}
		});
	}

	function goQ(delta) {
		qDir = delta;
		qIndex = Math.max(0, Math.min(pendingQuery.questions.length - 1, qIndex + delta));
	}

	function advance() {
		// committing the current question is what fills the meter
		qCommitted = new Set(qCommitted).add(qIndex);
		if (isLastQ) sealAnswer();
		else goQ(1);
	}

	function skipQuestion() {
		const a = qAns[qIndex];
		a.picks = [];
		a.custom = '';
		a.customOpen = false;
		a.skipped = true;
		advance();
	}

	// one human-readable line per answered question, joined the way a margin note would read
	function composeAnswer() {
		const said = pendingQuery.questions
			.map((q, i) => {
				const a = qAns[i];
				if (a.skipped) return null;
				const titles = a.picks
					.map((id) => q.options.find((o) => o.id === id)?.title)
					.filter(Boolean);
				if (a.custom.trim()) titles.push('“' + a.custom.trim() + '”');
				return titles.length ? titles.join(', ') : null;
			})
			.filter(Boolean);
		return said.length ? said.join(' · ') : 'No strong preference — your call.';
	}

	async function sealAnswer() {
		if (querySealing) return;
		const text = composeAnswer();
		const host = queryHostSec;
		// let the seal land, then collapse the slip
		querySealing = true;
		setTimeout(async () => {
			// the answer returns to the agent as a *tool result*: the `ask` stamp in
			// its ledger resolves with what you chose — no new message in your name
			if (host) {
				for (const b of host.blocks) {
					if (b.type === 'ledger') {
						const e = b.entries.find((en) => en.verb === 'ask' && en.status !== 'done');
						if (e) {
							e.status = 'done';
							e.note = 'answered';
						}
					}
				}
			}
			pendingQuery = null;
			queryHostSec = null;
			querySealing = false;
			// the agent picks its turn back up on the strength of the answer
			generating = true;
			await tick();
			scrollToEdge();
			setTimeout(() => {
				if (host)
					host.blocks = [
						...host.blocks,
						{
							type: 'p',
							text: `Noted — ${text}. I’ll work to that and leave the rest of the page as it stands; strike a line through anything that reads wrong and I’ll set it again.`
						}
					];
				generating = false;
				tick().then(scrollToEdge);
			}, 1200);
		}, 440);
	}

	// the composer and the query share one spot (a grid cell, so neither shoves the
	// other); whatever leaves sinks and fades, whatever enters rises off the same
	// ruled line — transform + opacity only, so it stays smooth
	function swap(node, { duration = 340 } = {}) {
		if (browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return { duration: 0 };
		}
		const ease = (t) => 1 - Math.pow(1 - t, 3);
		return {
			duration,
			css: (t) => {
				const e = ease(t);
				return `opacity: ${t};
					transform: translateY(${(1 - e) * 16}px) scale(${0.97 + e * 0.03});
					transform-origin: bottom center;`;
			}
		};
	}

	// the agent's reply rotation: pose a query first (so it's seen at once), then
	// the prose reply, then the ledger+margin turn
	const REPLY_ORDER = ['query', 'prose', 'margin'];

	async function send() {
		const text = composerText.trim();
		if (!text || generating) return;
		composerText = '';
		if (composerEl) {
			composerEl.style.height = 'auto';
			composerEl.style.overflowY = 'hidden';
		}
		pilcrowHop = true;
		setTimeout(() => (pilcrowHop = false), 550);

		const folio = current;
		const sec = {
			id: 's' + Date.now(),
			prompt: text,
			time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
			fresh: true,
			blocks: []
		};
		folio.sections.push(sec);
		// the first line names the folio — no ceremony
		if (folio.title === 'Untitled folio') {
			const words = text.split(/\s+/);
			folio.title = words.slice(0, 5).join(' ') + (words.length > 5 ? '…' : '');
		}
		generating = true;

		await tick();
		scrollToEdge();

		const kind = REPLY_ORDER[cannedIdx++ % REPLY_ORDER.length];
		setTimeout(async () => {
			generating = false;
			if (kind === 'query') {
				// the agent calls the tool: a short lead-in + an `ask` stamp in its
				// ledger that stays open until your answer returns as the tool result
				const query = makeQuery();
				sec.blocks = [
					{
						type: 'p',
						text: 'Before I set another word — a question or two, so I cut with the grain and not against it.'
					},
					{
						type: 'ledger',
						entries: [
							{
								verb: 'ask',
								object: `${query.questions.length} question${query.questions.length === 1 ? '' : 's'} for you`,
								note: '',
								status: 'run'
							}
						]
					}
				];
				await tick();
				poseQuery(query, sec);
				return;
			}
			sec.blocks = structuredClone(kind === 'margin' ? canned[1] : canned[0]);
			for (const block of sec.blocks) {
				if (block.type === 'ledger') {
					block.entries.forEach((en, i) => {
						setTimeout(() => (en.status = 'done'), 700 + i * 520);
					});
				}
			}
			if (kind === 'margin') {
				const t = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
				setTimeout(
					() =>
						agentWriteToScratch(
							folio,
							`\n\n— claude, ${t}\n- strike the toast pattern from §2\n- test gold-leaf marks on the dark desk\n- promote the §3 inks to app.css tokens`
						),
					1900
				);
			}
			await tick();
			scrollToEdge();
		}, 1500);
	}

	function onComposerKey(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	function autogrow(e) {
		const el = e.currentTarget;
		el.style.height = 'auto';
		el.style.height = el.scrollHeight + 'px';
		// only become scrollable once max-height actually caps us
		el.style.overflowY = el.scrollHeight > el.clientHeight + 2 ? 'auto' : 'hidden';
	}

	// ─── The Margin (shared scratchboard) ───
	let scratchOpen = $state(false); // folded by default; the agent unfolds it when it writes
	let scratchEditing = $state(false);
	let scratchEl = $state(null);
	let agentWriting = $state(false);
	let scratchSave = $state('idle');
	let scratchT1, scratchT2;

	function pulseScratchSave() {
		scratchSave = 'saving';
		clearTimeout(scratchT1);
		clearTimeout(scratchT2);
		scratchT1 = setTimeout(() => {
			scratchSave = 'saved';
			scratchT2 = setTimeout(() => (scratchSave = 'idle'), 1400);
		}, 520);
	}

	function agentWriteToScratch(folio, text) {
		agentWriting = true;
		scratchEditing = false;
		scratchOpen = true;
		if (isNarrow) marginDrawer = true;
		let i = 0;
		const step = () => {
			if (i >= text.length) {
				agentWriting = false;
				pulseScratchSave();
				return;
			}
			const n = 1 + Math.floor(Math.random() * 2);
			folio.scratch += text.slice(i, i + n);
			i += n;
			setTimeout(step, 22 + Math.random() * 30);
		};
		setTimeout(step, 400);
	}

	function startScratchEdit() {
		if (agentWriting) return;
		scratchEditing = true;
		tick().then(() => {
			if (scratchEl) {
				scratchEl.focus();
				scratchEl.style.height = 'auto';
				scratchEl.style.height = scratchEl.scrollHeight + 'px';
			}
		});
	}

	// tiny markdown-ish renderer for the margin preview
	function scratchLines(s) {
		return s.split('\n').map((line) => {
			if (line.startsWith('# ')) return { t: 'h', text: line.slice(2) };
			if (line.startsWith('## ')) return { t: 'h2', text: line.slice(3) };
			if (line.startsWith('- ')) return { t: 'li', text: line.slice(2) };
			if (line.startsWith('— ')) return { t: 'sig', text: line };
			if (line.trim() === '') return { t: 'gap', text: '' };
			return { t: 'p', text: line };
		});
	}

	// ─── Spine: progress, active section, dock magnification ───
	let progress = $state(0);
	let activeIdx = $state(0);
	let spineEl = $state(null);

	function onScroll() {
		if (!scroller) return;
		const max = scroller.scrollHeight - scroller.clientHeight;
		progress = max > 0 ? scroller.scrollTop / max : 1;
		const probe = scroller.scrollTop + scroller.clientHeight * 0.33;
		let idx = 0;
		const els = scroller.querySelectorAll('[data-sec]');
		els.forEach((el, i) => {
			if (el.offsetTop <= probe) idx = i;
		});
		activeIdx = idx;
	}

	function spineMagnify(e) {
		spineEl?.querySelectorAll('.node').forEach((el) => {
			const r = el.getBoundingClientRect();
			const d = Math.abs(e.clientY - (r.top + r.height / 2));
			const mag = 1 + Math.max(0, 1 - d / 110) * 0.75;
			el.style.setProperty('--mag', mag.toFixed(3));
		});
	}
	function spineRest() {
		spineEl?.querySelectorAll('.node').forEach((el) => el.style.setProperty('--mag', '1'));
	}

	function scrollToSection(id) {
		scroller?.querySelector('#sec-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
	function scrollToEdge() {
		scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
	}

	function wordDelay(blockIdx, wordIdx) {
		return (blockIdx * 0.42 + wordIdx * 0.022).toFixed(3);
	}

	let openThinking = $state(new Set());
	function toggleThinking(key) {
		const next = new Set(openThinking);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		openThinking = next;
	}

	// ─── Section actions: edit / regenerate / fork ───
	let editingSec = $state(null);

	async function startEditPrompt(sec) {
		editingSec = sec.id;
		await tick();
		const el = scroller?.querySelector(`#sec-${sec.id} .sec-title`);
		if (el) {
			el.focus();
			const r = document.createRange();
			r.selectNodeContents(el);
			r.collapse(false);
			const s = window.getSelection();
			s.removeAllRanges();
			s.addRange(r);
		}
	}

	function regenerate(sec) {
		if (generating) return;
		generating = true;
		sec.fresh = true;
		sec.blocks = [];
		const reply = structuredClone(canned[cannedIdx++ % canned.length]);
		setTimeout(() => {
			sec.blocks = reply;
			generating = false;
			for (const block of sec.blocks) {
				if (block.type === 'ledger') {
					block.entries.forEach((en, i) => {
						setTimeout(() => (en.status = 'done'), 700 + i * 520);
					});
				}
			}
		}, 1200);
	}

	function forkAt(folio, si) {
		const no = Math.max(...folios.map((f) => f.no)) + 1;
		const copy = structuredClone($state.snapshot(folio));
		folios.push({
			id: 'f' + Date.now(),
			no,
			title: copy.title + ' · fork',
			date: 'today',
			scratch: copy.scratch,
			sections: copy.sections.slice(0, si + 1).map((s) => ({ ...s, fresh: false }))
		});
		selectFolio(folios[folios.length - 1].id);
	}

	// ─── Icons (single-d stroke paths, 24×24 viewBox) ───
	const VERB_ICONS = {
		read: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
		grep: 'M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
		search: 'M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
		profile: 'M22 12h-4l-3 9L9 3l-3 9H2',
		draft: 'M20.2 12.2a6 6 0 0 0-8.4-8.4L5 10.5V19h8.5l6.7-6.8zM16 8L2 22M17.5 15H9',
		run: 'M5 3l14 9-14 9V3z',
		ask: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01'
	};
	const dotIcon = 'M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z';
</script>

<svelte:window bind:innerWidth={winW} bind:innerHeight={winH} />

<div
	class="folio"
	class:dark
	class:sb-open={sidebarOpen}
	class:md-open={marginDrawer && isNarrow}
	onmousemove={(e) => {
		cursorX = e.clientX;
		cursorY = e.clientY;
	}}
	ontouchstart={onTouchStart}
	ontouchend={onTouchEnd}
	role="presentation"
>
	<div class="grain" aria-hidden="true"></div>

	<!-- ─── The Archive: older folios, peeled open from the left ─── -->
	<aside class="archive" aria-label="The archive" aria-hidden={!sidebarOpen}>
		<div class="arch-head">
			<span class="arch-kicker">The Archive</span>
			<span class="arch-count"
				>{folios.length} folios{quires.length
					? ` · ${quires.length} quire${quires.length === 1 ? '' : 's'}`
					: ''}</span
			>
		</div>

		<div class="arch-newrow">
			<button class="arch-new" onclick={newFolio} tabindex={sidebarOpen ? 0 : -1}>
				<svg
					width="13"
					height="13"
					viewBox="0 0 14 14"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					stroke-linecap="round"><path d="M7 2.5v9M2.5 7h9" /></svg
				>
				Begin a new folio
			</button>
			<button
				class="arch-new gather"
				class:dropping={dropQuire === 'new'}
				onclick={() => newQuire()}
				tabindex={sidebarOpen ? 0 : -1}
				title="Gather a new quire"
				aria-label="Gather a new quire"
				ondragover={(e) => {
					if (!dragId) return;
					e.preventDefault();
					dropQuire = 'new';
				}}
				ondragleave={() => dropQuire === 'new' && (dropQuire = null)}
				ondrop={(e) => {
					e.preventDefault();
					e.stopPropagation();
					gatherInto();
				}}
			>
				<svg
					width="13"
					height="13"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path
						d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
					/></svg
				>
			</button>
		</div>

		<!-- dropping a folio on the open list (not on a quire) returns it to the loose leaves -->
		<div
			class="arch-list"
			role="list"
			ondragover={(e) => dragId && e.preventDefault()}
			ondrop={(e) => {
				e.preventDefault();
				unfile();
			}}
		>
			{#each archRows as row, i (row.key)}
				{#if row.kind === 'quire'}
					<div
						class="quire-head"
						class:open={row.q.open}
						class:dropping={dropQuire === row.q.id}
						style:--i={i}
						role="button"
						tabindex={sidebarOpen ? 0 : -1}
						aria-expanded={row.q.open}
						onclick={() => (row.q.open = !row.q.open)}
						onkeydown={(e) => {
							if (e.key === 'Enter' && e.target === e.currentTarget) row.q.open = !row.q.open;
						}}
						ondragover={(e) => {
							if (!dragId) return;
							e.preventDefault();
							dropQuire = row.q.id;
						}}
						ondragleave={(e) => {
							if (!e.currentTarget.contains(e.relatedTarget)) dropQuire = null;
						}}
						ondrop={(e) => {
							e.preventDefault();
							e.stopPropagation();
							fileInto(row.q.id);
						}}
					>
						<svg
							class="quire-chev"
							width="10"
							height="10"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg
						>
						{#if renamingQuire === row.q.id}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<span
								id="qn-{row.q.id}"
								class="quire-name editing"
								contenteditable="plaintext-only"
								spellcheck="false"
								onclick={(e) => e.stopPropagation()}
								onkeydown={(e) => {
									e.stopPropagation();
									if (e.key === 'Enter') {
										e.preventDefault();
										e.currentTarget.blur();
									}
								}}
								onblur={(e) => {
									row.q.name = e.currentTarget.textContent?.trim() || row.q.name;
									renamingQuire = null;
								}}>{row.q.name}</span
							>
						{:else}
							<span class="quire-name">{row.q.name}</span>
						{/if}
						<span class="quire-count">{row.count}</span>
						<span class="quire-tools">
							<button
								class="qtool"
								title="Rename the quire"
								aria-label="Rename the quire"
								tabindex={sidebarOpen ? 0 : -1}
								onclick={(e) => {
									e.stopPropagation();
									startRenameQuire(row.q);
								}}
							>
								<svg
									width="11"
									height="11"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.8"
									stroke-linecap="round"
									stroke-linejoin="round"
									><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg
								>
							</button>
							<button
								class="qtool"
								title="Dissolve the quire — its folios return to the archive"
								aria-label="Dissolve the quire"
								tabindex={sidebarOpen ? 0 : -1}
								onclick={(e) => {
									e.stopPropagation();
									dissolveQuire(row.q.id);
								}}
							>
								<svg
									width="11"
									height="11"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.8"
									stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg
								>
							</button>
						</span>
					</div>
				{:else if row.kind === 'empty'}
					<div
						class="quire-empty"
						class:dropping={dropQuire === row.q.id}
						style:--i={i}
						ondragover={(e) => {
							if (!dragId) return;
							e.preventDefault();
							dropQuire = row.q.id;
						}}
						ondragleave={(e) => {
							if (!e.currentTarget.contains(e.relatedTarget)) dropQuire = null;
						}}
						ondrop={(e) => {
							e.preventDefault();
							e.stopPropagation();
							fileInto(row.q.id);
						}}
						role="presentation"
					>
						nothing gathered yet — drag a folio in
					</div>
				{:else}
					<button
						class="arch-item"
						class:current={row.f.id === currentId}
						class:filed={!!row.q}
						class:dragging={dragId === row.f.id}
						style:--i={i}
						draggable="true"
						onclick={() => selectFolio(row.f.id)}
						tabindex={sidebarOpen ? 0 : -1}
						ondragstart={(e) => {
							dragId = row.f.id;
							e.dataTransfer.setData('text/plain', row.f.id);
							e.dataTransfer.effectAllowed = 'move';
						}}
						ondragend={() => {
							dragId = null;
							dropQuire = null;
						}}
						ondragover={row.q
							? (e) => {
									if (!dragId) return;
									e.preventDefault();
									dropQuire = row.q.id;
								}
							: undefined}
						ondragleave={row.q
							? (e) => {
									if (!e.currentTarget.contains(e.relatedTarget)) dropQuire = null;
								}
							: undefined}
						ondrop={row.q
							? (e) => {
									e.preventDefault();
									e.stopPropagation();
									fileInto(row.q.id);
								}
							: undefined}
					>
						<span class="arch-no">№{String(row.f.no).padStart(2, '0')}</span>
						<span class="arch-body">
							<span class="arch-title">{row.f.title}</span>
							<span class="arch-meta"
								>{row.f.sections.length || 'no'} section{row.f.sections.length === 1 ? '' : 's'} · {row
									.f.date}</span
							>
						</span>
						<svg
							class="arch-arrow"
							width="11"
							height="11"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg
						>
					</button>
				{/if}
			{/each}
		</div>

		<div class="arch-foot">
			<span class="arch-avatar" aria-hidden="true">D</span>
			<span class="arch-user">
				<span class="arch-name">Dominik</span>
				<span class="arch-mail">dominik@hildania.de</span>
			</span>
			<button class="ghost" aria-label="Settings" title="Settings" tabindex={sidebarOpen ? 0 : -1}>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="3" />
					<path
						d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
					/>
				</svg>
			</button>
		</div>
	</aside>

	<!-- Proximity notch: a thumb-hole in the page's left edge -->
	{#if !sidebarOpen}
		<button
			class="notch"
			style:top="{notchY}px"
			style:width="{notchW}px"
			style:height="{notchH}px"
			style:border-radius="0 {notchW}px {notchW}px 0"
			onclick={() => (sidebarOpen = true)}
			aria-label="Open the archive"
		>
			<svg
				width="6"
				height="10"
				viewBox="0 0 6 10"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				style:opacity={0.35 + proximity * 0.55}
				aria-hidden="true"><path d="M1 1l4 4-4 4" /></svg
			>
		</button>
	{/if}

	<!-- Mobile: the margin lives behind the desk on the right, mirroring the archive -->
	{#if isNarrow}
		<div class="margin-layer" aria-hidden={!marginDrawer}>
			{@render marginPanel()}
		</div>

		{#if !marginDrawer}
			<button
				class="notch notch-r"
				class:writing={agentWriting}
				style:top="{notchY}px"
				style:width="{notchWR}px"
				style:height="{notchHR}px"
				style:border-radius="{notchWR}px 0 0 {notchWR}px"
				onclick={() => (marginDrawer = true)}
				aria-label="Open the scratchboard"
			>
				<svg
					width="6"
					height="10"
					viewBox="0 0 6 10"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					style:opacity={0.35 + proximityR * 0.55}
					aria-hidden="true"><path d="M5 1L1 5l4 4" /></svg
				>
			</button>
		{/if}
	{/if}

	<!-- ─── The desk: page + margin, peels toward whichever drawer opens ─── -->
	<div class="desk" class:open={sidebarOpen} class:open-right={marginDrawer && isNarrow}>
		{#if sidebarOpen || (marginDrawer && isNarrow)}
			<div
				class="backdrop"
				onclick={() => {
					sidebarOpen = false;
					marginDrawer = false;
				}}
				role="presentation"
			></div>
		{/if}

		<!-- spine -->
		{#if current.sections.length > 0}
			<nav
				class="spine"
				aria-label="Sections"
				bind:this={spineEl}
				onmousemove={spineMagnify}
				onmouseleave={spineRest}
			>
				<div class="thread" aria-hidden="true">
					<div class="thread-fill" style:height="{Math.round(progress * 100)}%"></div>
				</div>
				{#each current.sections as sec, i (sec.id)}
					<button
						class="node"
						class:visited={i < activeIdx}
						class:active={i === activeIdx}
						onclick={() => scrollToSection(sec.id)}
						aria-label="Go to section {i + 1}"
					>
						<span class="node-dot"></span>
						<span class="node-tip"><em>§{i + 1}</em>{sec.prompt.slice(0, 44)}…</span>
					</button>
				{/each}
				<button class="node now" onclick={scrollToEdge} aria-label="Go to the writing edge">
					<span class="node-dot"></span>
					<span class="node-tip"><em>¶</em>the edge — continue writing</span>
				</button>
			</nav>
		{/if}

		<div class="desk-grid">
			<!-- ─── The page ─── -->
			<div class="scroll" bind:this={scroller} onscroll={onScroll}>
				{#key current.id}
					<main class="page" class:zen={current.sections.length === 0}>
						{#if current.sections.length === 0}
							<!-- zen: an empty folio is just the greeting and the line -->
							<div class="zen-actions">
								<button
									class="ghost"
									onclick={() => (sidebarOpen = !sidebarOpen)}
									aria-label="The archive"
									title="The archive"
								>
									<svg
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path
											d="M21 8H3M21 8l-1.5 12.5a1 1 0 0 1-1 .5h-13a1 1 0 0 1-1-.5L3 8M21 8l-2-5H5L3 8M10 12h4"
										/>
									</svg>
								</button>
								<button
									class="ghost lamp"
									class:lit={dark}
									onclick={triggerThemeRipple}
									aria-label="Toggle the lamp"
									title="Toggle the lamp"
								>
									<svg
										class="i-sun"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
									>
										<circle cx="12" cy="12" r="4" />
										<path
											d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"
										/>
									</svg>
									<svg
										class="i-moon"
										width="14"
										height="14"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
									</svg>
								</button>
							</div>

							<div class="greeting">
								<h2 class="greet-line" aria-label={greeting}>
									{#each greeting.split(' ') as w, i}
										<span class="greet-w" style:animation-delay="{0.1 + i * 0.09}s">{w}&nbsp;</span>
									{/each}
								</h2>
								<p class="greet-sub reveal" style:--d="0.5s">
									A blank folio. What shall we set in type?
								</p>
							</div>

							{@render edgeArea()}
						{:else}
							<header class="letterhead reveal" style:--d="0s">
								<div class="kicker-row">
									<span class="kicker">Folio · №{String(current.no).padStart(2, '0')}</span>
									<span class="lh-actions">
										<button
											class="ghost"
											onclick={() => (sidebarOpen = !sidebarOpen)}
											aria-label="Toggle the archive"
											title="The archive"
										>
											<svg
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="1.8"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path
													d="M21 8H3M21 8l-1.5 12.5a1 1 0 0 1-1 .5h-13a1 1 0 0 1-1-.5L3 8M21 8l-2-5H5L3 8M10 12h4"
												/>
											</svg>
										</button>
										<button
											class="ghost"
											onclick={newFolio}
											aria-label="New folio"
											title="New folio"
										>
											<svg
												width="14"
												height="14"
												viewBox="0 0 14 14"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
												stroke-linecap="round"
											>
												<path d="M7 2.5v9M2.5 7h9" />
											</svg>
										</button>
										<button
											class="ghost lamp"
											class:lit={dark}
											onclick={triggerThemeRipple}
											aria-label="Toggle the lamp"
											title="Toggle the lamp"
										>
											<svg
												class="i-sun"
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
											>
												<circle cx="12" cy="12" r="4" />
												<path
													d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"
												/>
											</svg>
											<svg
												class="i-moon"
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
											</svg>
										</button>
									</span>
								</div>

								<div class="title-row">
									<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
									<h1
										class="title"
										contenteditable="plaintext-only"
										spellcheck="false"
										oninput={pulseSave}
										onblur={(e) =>
											(current.title = e.currentTarget.textContent?.trim() || 'Untitled folio')}
									>
										{current.title}
									</h1>
									<span
										class="save-dot"
										class:saving={saveState === 'saving'}
										class:saved={saveState === 'saved'}
										aria-hidden="true"
									></span>
								</div>

								<p class="byline">Dominik <span class="x">×</span> Claude — {today}</p>

								<div class="asterism" aria-hidden="true"><span>⁂</span></div>
							</header>

							{#each current.sections as sec, si (sec.id)}
								<section
									class="sec"
									class:reveal={!sec.fresh}
									style:--d="{0.12 + si * 0.1}s"
									id="sec-{sec.id}"
									data-sec
								>
									{#if si > 0}
										<div class="asterism dim" aria-hidden="true"><span>⁂</span></div>
									{/if}

									<header class="sec-head" class:fresh={sec.fresh}>
										<span class="sec-no">§ {si + 1}</span>
										{#if editingSec === sec.id}
											<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
											<h2
												class="sec-title editing"
												contenteditable="plaintext-only"
												spellcheck="false"
												onblur={(e) => {
													sec.prompt = e.currentTarget.textContent?.trim() || sec.prompt;
													editingSec = null;
												}}
												onkeydown={(e) => {
													if (e.key === 'Enter') {
														e.preventDefault();
														e.currentTarget.blur();
													}
												}}
											>
												{sec.prompt}
											</h2>
										{:else}
											<h2 class="sec-title">{sec.prompt}</h2>
										{/if}

										<div class="sec-rail">
											<span class="sec-time">{sec.time}</span>
											<div class="sec-actions">
												<button
													class="rail-btn"
													title="Edit the prompt"
													aria-label="Edit the prompt"
													onclick={() => startEditPrompt(sec)}
												>
													<svg
														width="12"
														height="12"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="1.8"
														stroke-linecap="round"
														stroke-linejoin="round"
														><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg
													>
												</button>
												<button
													class="rail-btn"
													title="Set the response again"
													aria-label="Regenerate response"
													disabled={generating}
													onclick={() => regenerate(sec)}
												>
													<svg
														width="12"
														height="12"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="1.8"
														stroke-linecap="round"
														stroke-linejoin="round"
														><path d="M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg
													>
												</button>
												<button
													class="rail-btn"
													title="Fork the folio from here"
													aria-label="Fork from this section"
													onclick={() => forkAt(current, si)}
												>
													<svg
														width="12"
														height="12"
														viewBox="0 0 24 24"
														fill="none"
														stroke="currentColor"
														stroke-width="1.8"
														stroke-linecap="round"
														stroke-linejoin="round"
														><path
															d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9"
														/></svg
													>
												</button>
											</div>
										</div>
									</header>

									<div class="folio-prose">
										{#if sec.blocks.length === 0 && generating}
											<div class="typesetting">
												<span class="ts-label">setting type</span>
												<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
											</div>
										{/if}

										{#each sec.blocks as block, bi}
											{#if block.type === 'think'}
												<div
													class="thinking"
													class:open={openThinking.has(sec.id + bi)}
													onclick={() => toggleThinking(sec.id + bi)}
													onkeydown={(e) => e.key === 'Enter' && toggleThinking(sec.id + bi)}
													role="button"
													tabindex="0"
													aria-expanded={openThinking.has(sec.id + bi)}
												>
													<span class="think-slash" aria-hidden="true">//</span>
													<span class="think-content">{block.text}</span>
												</div>
											{:else if block.type === 'p'}
												<p class="pgraph" class:dropcap={block.dropcap}>
													{#if sec.fresh}
														{#each block.text.split(' ') as w, wi}
															<span class="w" style:animation-delay="{wordDelay(bi, wi)}s"
																>{w}{' '}</span
															>
														{/each}
													{:else}
														{block.text}
													{/if}
												</p>
											{:else if block.type === 'quote'}
												<blockquote class="quote">{block.text}</blockquote>
											{:else if block.type === 'list'}
												<ul class="cutlist">
													{#each block.items as item}
														<li>{item}</li>
													{/each}
												</ul>
											{:else if block.type === 'code'}
												<div class="codeblock">
													<span class="code-lang">{block.lang}</span>
													<pre>{block.code}</pre>
												</div>
											{:else if block.type === 'ledger'}
												<div class="ledger" role="log" aria-label="Agent actions">
													{#each block.entries as en, ei}
														<div class="entry" style:animation-delay="{sec.fresh ? ei * 0.18 : 0}s">
															<span
																class="stamp"
																class:done={en.status === 'done'}
																aria-hidden="true"
															>
																{#if en.status === 'done'}
																	<svg
																		width="9"
																		height="9"
																		viewBox="0 0 10 10"
																		fill="none"
																		stroke="currentColor"
																		stroke-width="2"
																		stroke-linecap="round"
																		stroke-linejoin="round"><path d="M1.5 5.5 4 8l4.5-6" /></svg
																	>
																{/if}
															</span>
															<svg
																class="vicon"
																width="12"
																height="12"
																viewBox="0 0 24 24"
																fill="none"
																stroke="currentColor"
																stroke-width="1.8"
																stroke-linecap="round"
																stroke-linejoin="round"
																aria-hidden="true"
															>
																<path d={VERB_ICONS[en.verb] ?? dotIcon} />
															</svg>
															<span class="verb">{en.verb}</span>
															<span class="object">{en.object}</span>
															<span class="dotfill" aria-hidden="true"></span>
															<span class="note">{en.status === 'done' ? en.note : '…'}</span>
														</div>
													{/each}
												</div>
											{/if}
										{/each}
									</div>
								</section>
							{/each}

							{@render edgeArea()}

							<footer class="colophon">
								<span>Set in Instrument Serif &amp; Atkinson Hyperlegible</span>
								<span class="fleuron">❧</span>
								<span>№{String(current.no).padStart(2, '0')} · open-webui, quietly</span>
								<span class="fleuron">❧</span>
								<button class="reset" onclick={resetPress}>reset the press</button>
							</footer>
						{/if}
					</main>
				{/key}
			</div>

			{#if !isNarrow}
				{@render marginPanel()}
			{/if}
		</div>
	</div>
</div>

<!-- ─── The edge: the document continues here (shared by zen + manuscript views) ─── -->
{#snippet edgeArea()}
	<div class="edge-slot">
		{#if pendingQuery}
			{@render querySlip()}
		{:else}
			<div
				class="edge"
				class:busy={generating}
				in:swap={{ duration: 300 }}
				out:swap={{ duration: 170 }}
			>
				<span class="pilcrow" class:hop={pilcrowHop} aria-hidden="true">¶</span>
				<div class="edge-line">
					<textarea
						bind:this={composerEl}
						bind:value={composerText}
						rows="1"
						placeholder={current.sections.length === 0 ? 'Write the first line…' : 'Continue…'}
						disabled={generating}
						onkeydown={onComposerKey}
						oninput={autogrow}
					></textarea>
					<div class="rule" aria-hidden="true"></div>
				</div>
				<button
					class="set-btn"
					class:ready={composerText.trim().length > 0}
					onclick={send}
					disabled={generating}
					title="Set in type (Enter)"
				>
					<span class="set-label">Set in type</span>
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M12 19V5M5 12l7-7 7 7" />
					</svg>
				</button>
			</div>
		{/if}
	</div>
{/snippet}

<!-- ─── The Query: the agent's structured question, set where the composer would be ─── -->
{#snippet querySlip()}
	<div
		class="query"
		class:sealing={querySealing}
		in:swap={{ duration: 380 }}
		out:swap={{ duration: 200 }}
		aria-label="A question from Claude"
	>
		<div class="query-head">
			<span class="q-badge" aria-hidden="true">
				<svg
					width="13"
					height="13"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.9"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
					<path d="M12 17h.01" />
				</svg>
			</span>
			<span class="q-kicker">An inquiry</span>
			<span class="q-from">Claude needs a steer</span>
			{#if pendingQuery.questions.length > 1}
				<div class="q-meter" aria-label="{qDone} of {pendingQuery.questions.length} answered">
					<span class="q-track">
						<span class="q-fill" style:width="{qProgress * 100}%"></span>
					</span>
					<span class="q-count">{qDone} / {pendingQuery.questions.length}</span>
				</div>
			{/if}
		</div>

		{#key qIndex}
			<div class="q-body" style:--dir={qDir}>
				<h3 class="q-prompt">{curQ.prompt}</h3>
				<span class="q-hint">{curQ.multi ? 'choose any' : 'choose one'}</span>

				<div class="q-options" role={curQ.multi ? 'group' : 'radiogroup'}>
					{#each curQ.options as opt, oi (opt.id)}
						<button
							class="opt"
							class:sel={curAns.picks.includes(opt.id)}
							class:multi={curQ.multi}
							style:--oi={oi}
							role={curQ.multi ? 'checkbox' : 'radio'}
							aria-checked={curAns.picks.includes(opt.id)}
							onclick={() => pickOption(opt.id)}
						>
							<span class="opt-mark" aria-hidden="true">
								<span class="opt-letter">{String.fromCharCode(97 + oi)}</span>
							</span>
							<span class="opt-text">
								<span class="opt-title">
									{opt.title}
									{#if opt.recommend}
										<span class="opt-rec">
											<svg
												width="9"
												height="9"
												viewBox="0 0 24 24"
												fill="currentColor"
												aria-hidden="true"
												><path
													d="M12 2l2.6 6.3 6.8.5-5.2 4.4 1.6 6.6L12 16.8 6.2 20.3l1.6-6.6L2.6 8.8l6.8-.5z"
												/></svg
											>
											Claude suggests
										</span>
									{/if}
								</span>
								{#if opt.explain}<span class="opt-explain">{opt.explain}</span>{/if}
							</span>
						</button>
					{/each}

					{#if curQ.allowCustom}
						{#if curAns.customOpen}
							<div class="custom-edge">
								<span class="pilcrow sm" aria-hidden="true">¶</span>
								<div class="edge-line">
									<textarea
										id="qcustom-{qIndex}"
										rows="1"
										placeholder="In your own words…"
										bind:value={curAns.custom}
										oninput={autogrow}
										onkeydown={(e) => {
											if (e.key === 'Enter' && !e.shiftKey) {
												e.preventDefault();
												if (qAnswered) advance();
											}
										}}
									></textarea>
									<div class="rule" aria-hidden="true"></div>
								</div>
							</div>
						{:else}
							<button class="opt custom" style:--oi={curQ.options.length} onclick={openCustom}>
								<span class="opt-mark" aria-hidden="true">
									<svg
										class="opt-quill"
										width="12"
										height="12"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
										stroke-linecap="round"
										stroke-linejoin="round"
										><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg
									>
								</span>
								<span class="opt-text"><span class="opt-title write">Write your own…</span></span>
							</button>
						{/if}
					{/if}
				</div>

				<div class="q-foot">
					{#if curQ.allowSkip}
						<button class="q-skip" onclick={skipQuestion}>none of these — skip</button>
					{/if}
					<div class="q-nav">
						{#if qIndex > 0}
							<button class="q-back" onclick={() => goQ(-1)} aria-label="Previous question">
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg
								>
							</button>
						{/if}
						<button class="q-next" class:ready={qAnswered} disabled={!qAnswered} onclick={advance}>
							<span class="next-label">{isLastQ ? 'Seal answer' : 'Next'}</span>
							{#if isLastQ}
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.4"
									stroke-linecap="round"
									stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg
								>
							{:else}
								<svg
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.4"
									stroke-linecap="round"
									stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg
								>
							{/if}
						</button>
					</div>
				</div>
			</div>
		{/key}
	</div>
{/snippet}

<!-- ─── The Margin: shared scratchboard (inline column on desktop, right drawer on mobile) ─── -->
{#snippet marginPanel()}
	<aside class="margin" class:closed={!scratchOpen && !isNarrow} class:agent={agentWriting}>
		{#if scratchOpen || isNarrow}
			<div class="margin-head">
				<svg
					class="quill"
					width="13"
					height="13"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d={VERB_ICONS.draft} />
				</svg>
				<span class="margin-kicker">Scratchboard</span>
				{#if agentWriting}
					<span class="agent-writing">
						<i></i>
						claude is writing
					</span>
				{:else}
					<span
						class="save-dot"
						class:saving={scratchSave === 'saving'}
						class:saved={scratchSave === 'saved'}
						aria-hidden="true"
					></span>
				{/if}
				<button
					class="ghost fold"
					onclick={() => (isNarrow ? (marginDrawer = false) : (scratchOpen = false))}
					aria-label="Fold the margin away"
				>
					<svg
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M9 6l6 6-6 6" />
					</svg>
				</button>
			</div>

			{#if scratchEditing}
				<textarea
					class="margin-edit"
					bind:this={scratchEl}
					bind:value={current.scratch}
					oninput={(e) => {
						pulseScratchSave();
						autogrow(e);
					}}
					onblur={() => (scratchEditing = false)}
					spellcheck="false"
				></textarea>
			{:else}
				<div
					class="margin-body"
					onclick={startScratchEdit}
					onkeydown={(e) => e.key === 'Enter' && startScratchEdit()}
					role="button"
					tabindex="0"
					aria-label="Edit the scratchboard"
				>
					{#each scratchLines(current.scratch) as line}
						{#if line.t === 'h'}
							<div class="m-h">{line.text}</div>
						{:else if line.t === 'h2'}
							<div class="m-h2">{line.text}</div>
						{:else if line.t === 'li'}
							<div class="m-li">{line.text}</div>
						{:else if line.t === 'sig'}
							<div class="m-sig">{line.text}</div>
						{:else if line.t === 'gap'}
							<div class="m-gap"></div>
						{:else}
							<div class="m-p">{line.text}</div>
						{/if}
					{/each}
					{#if agentWriting}<span class="m-caret" aria-hidden="true"></span>{/if}
				</div>
			{/if}
		{:else}
			<button
				class="margin-spineb"
				onclick={() => (scratchOpen = true)}
				aria-label="Unfold the scratchboard"
			>
				<svg
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M15 6l-6 6 6 6" />
				</svg>
				<span class="margin-vlabel">Scratchboard</span>
				{#if agentWriting}<i class="vdot"></i>{/if}
			</button>
		{/if}
	</aside>
{/snippet}

<style>
	@property --reveal-r {
		syntax: '<length>';
		inherits: false;
		initial-value: 0px;
	}

	@font-face {
		font-family: 'Instrument Serif F';
		src: url('/assets/fonts/InstrumentSerif-Regular.ttf') format('truetype');
		font-weight: 400;
		font-display: swap;
	}
	@font-face {
		font-family: 'Archivo F';
		src: url('/assets/fonts/Archivo-Variable.ttf') format('truetype');
		font-weight: 100 900;
		font-display: swap;
	}
	@font-face {
		font-family: 'Atkinson F';
		font-style: normal;
		font-display: swap;
		font-weight: 200 800;
		src: url('https://cdn.jsdelivr.net/fontsource/fonts/atkinson-hyperlegible-next:vf@latest/latin-wght-normal.woff2')
			format('woff2-variations');
	}
	@font-face {
		font-family: 'Fragment Mono F';
		font-style: normal;
		font-display: swap;
		font-weight: 400;
		src: url('https://cdn.jsdelivr.net/fontsource/fonts/fragment-mono@latest/latin-400-normal.woff2')
			format('woff2');
	}

	/* ── Inks & paper ── */
	.folio {
		--archive-w: min(296px, 85vw);
		--margin-w-m: min(85vw, 340px);
		--paper: #f5f1e8;
		--paper-deep: #eae3d3;
		--ink: #26221b;
		--ink-2: #6e6657;
		--ink-3: #a89e8a;
		--vermilion: #c2491d;
		--vermilion-soft: rgba(194, 73, 29, 0.08);
		--ultramarine: #4f55c9;
		--ultramarine-soft: rgba(79, 85, 201, 0.09);
		--gold: #f3d27d;
		--rule: rgba(38, 34, 27, 0.14);
		--rule-faint: rgba(38, 34, 27, 0.07);
		--code-bg: rgba(38, 34, 27, 0.045);
		--ok: #3d7a46;

		--serif: 'Instrument Serif F', Georgia, 'Times New Roman', serif;
		--sans: 'Archivo F', -apple-system, BlinkMacSystemFont, sans-serif;
		--body: 'Atkinson F', 'Archivo F', sans-serif;
		--mono: 'Fragment Mono F', ui-monospace, 'SF Mono', Menlo, monospace;

		--out: cubic-bezier(0.16, 1, 0.3, 1);
		--spring: cubic-bezier(0.34, 1.56, 0.64, 1);

		position: fixed;
		inset: 0;
		background: var(--paper-deep);
		color: var(--ink);
		font-family: var(--sans);
		overflow: hidden;
		transition: background 0.4s ease;
		color-scheme: light;
	}

	.folio.dark {
		--paper: #181410;
		--paper-deep: #100d0a;
		--ink: #ece5d4;
		--ink-2: #a1977f;
		--ink-3: #6b6354;
		--vermilion: #e8744a;
		--vermilion-soft: rgba(232, 116, 74, 0.12);
		--ultramarine: #9aa0f5;
		--ultramarine-soft: rgba(154, 160, 245, 0.12);
		--gold: #d4ab55;
		--rule: rgba(236, 229, 212, 0.16);
		--rule-faint: rgba(236, 229, 212, 0.07);
		--code-bg: rgba(236, 229, 212, 0.05);
		--ok: #7dc287;
		color-scheme: dark;
	}

	.folio ::selection {
		background: color-mix(in srgb, var(--gold) 55%, transparent);
	}

	.grain {
		position: absolute;
		inset: 0;
		z-index: 0;
		pointer-events: none;
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='180' height='180' filter='url(%23n)' opacity='0.05'/></svg>");
		mix-blend-mode: multiply;
		z-index: 4;
	}
	.folio.dark .grain {
		opacity: 0.55;
		mix-blend-mode: screen;
	}

	/* ── The Archive (behind the desk) ── */
	.archive {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: var(--archive-w);
		z-index: 0;
		display: flex;
		flex-direction: column;
		padding: 26px 18px 18px;
		color: var(--ink);
		/* hidden until its drawer opens (delay keeps it visible while the desk slides back) */
		visibility: hidden;
		transition: visibility 0s linear 0.45s;
	}
	.sb-open .archive {
		visibility: visible;
		transition-delay: 0s;
	}
	.arch-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 0 8px 14px;
	}
	.arch-kicker {
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-2);
	}
	.arch-count {
		font-family: var(--mono);
		font-size: 10px;
		color: var(--ink-3);
	}

	.arch-new {
		display: flex;
		align-items: center;
		gap: 9px;
		margin: 0 0 10px;
		padding: 9px 12px;
		border-radius: 10px;
		border: 1px dashed var(--rule);
		background: transparent;
		color: var(--ink-2);
		font-family: var(--serif);
		font-style: italic;
		font-size: 14px;
		cursor: pointer;
		transition:
			border-color 0.2s,
			color 0.2s,
			background 0.2s,
			transform 0.2s var(--spring);
	}
	.arch-new:hover {
		border-color: var(--vermilion);
		color: var(--vermilion);
		background: var(--vermilion-soft);
		transform: translateX(2px);
	}
	.arch-new svg {
		transition: transform 0.35s var(--spring);
	}
	.arch-new:hover svg {
		transform: rotate(90deg);
	}
	.arch-newrow {
		display: flex;
		gap: 6px;
		margin: 0 0 10px;
	}
	.arch-newrow .arch-new {
		margin: 0;
		flex: 1;
		min-width: 0;
	}
	.arch-new.gather {
		flex: none;
		padding: 9px 12px;
	}
	.arch-new.gather:hover {
		transform: none;
	}
	.arch-new.gather:hover svg {
		transform: none;
	}
	.arch-new.dropping {
		border-color: var(--vermilion);
		border-style: solid;
		color: var(--vermilion);
		background: var(--vermilion-soft);
	}

	/* ── Quires: folios gathered into folders ── */
	.quire-head {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 8px 10px;
		margin-top: 6px;
		border-radius: 10px;
		border: 1px dashed transparent;
		background: transparent;
		cursor: pointer;
		color: var(--ink-2);
		user-select: none;
		opacity: 0;
		transform: translateX(-12px);
		transition:
			background 0.18s,
			color 0.18s,
			border-color 0.18s,
			transform 0.3s var(--out),
			opacity 0.3s var(--out);
	}
	.sb-open .quire-head {
		opacity: 1;
		transform: translateX(0);
		transition-delay: calc(60ms + var(--i) * 45ms);
	}
	.quire-head:hover {
		background: rgba(0, 0, 0, 0.04);
		color: var(--ink);
		transition-delay: 0ms;
	}
	.folio.dark .quire-head:hover {
		background: rgba(255, 255, 255, 0.04);
	}
	.quire-head.dropping,
	.quire-empty.dropping {
		border-color: color-mix(in srgb, var(--vermilion) 55%, transparent);
		background: var(--vermilion-soft);
		color: var(--vermilion);
	}
	.quire-chev {
		flex: none;
		color: var(--ink-3);
		transition:
			transform 0.3s var(--spring),
			color 0.18s;
	}
	.quire-head.open .quire-chev {
		transform: rotate(90deg);
	}
	.quire-head:hover .quire-chev {
		color: var(--vermilion);
	}
	.quire-name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}
	.quire-name.editing {
		outline: none;
		caret-color: var(--vermilion);
		border-bottom: 1px dashed var(--rule);
		min-width: 40px;
	}
	.quire-count {
		font-family: var(--mono);
		font-size: 10px;
		color: var(--ink-3);
		margin-left: auto;
		flex: none;
	}
	.quire-tools {
		display: flex;
		gap: 2px;
		flex: none;
		opacity: 0;
		transition: opacity 0.18s;
	}
	.quire-head:hover .quire-tools,
	.quire-head:focus-within .quire-tools {
		opacity: 1;
	}
	.qtool {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 6px;
		border: none;
		background: transparent;
		color: var(--ink-3);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.qtool:hover {
		background: var(--rule-faint);
		color: var(--vermilion);
	}

	/* filed folios hang from their quire on a thread */
	.arch-item.filed {
		margin-left: 16px;
		position: relative;
	}
	.arch-item.filed::before {
		content: '';
		position: absolute;
		left: -9px;
		top: -2px;
		bottom: -2px;
		width: 1px;
		background: var(--rule);
	}
	.arch-item.dragging {
		opacity: 0.35;
	}
	.quire-empty {
		position: relative;
		margin-left: 16px;
		padding: 7px 10px;
		border-radius: 10px;
		border: 1px dashed transparent;
		font-family: var(--serif);
		font-style: italic;
		font-size: 12.5px;
		color: var(--ink-3);
		opacity: 0;
		transform: translateX(-12px);
		transition:
			background 0.18s,
			color 0.18s,
			border-color 0.18s,
			transform 0.3s var(--out),
			opacity 0.3s var(--out);
	}
	.sb-open .quire-empty {
		opacity: 1;
		transform: translateX(0);
		transition-delay: calc(60ms + var(--i) * 45ms);
	}
	.quire-empty::before {
		content: '';
		position: absolute;
		left: -9px;
		top: -2px;
		bottom: -2px;
		width: 1px;
		background: var(--rule);
	}

	.arch-list {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 2px;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--ink-3) 60%, transparent) transparent;
	}
	.arch-item {
		display: flex;
		align-items: center;
		gap: 11px;
		padding: 9px 10px;
		border: none;
		border-radius: 10px;
		background: transparent;
		text-align: left;
		cursor: pointer;
		color: var(--ink-2);
		opacity: 0;
		transform: translateX(-12px);
		transition:
			background 0.18s,
			color 0.18s,
			transform 0.3s var(--out),
			opacity 0.3s var(--out);
	}
	.sb-open .arch-item {
		opacity: 1;
		transform: translateX(0);
		transition-delay: calc(60ms + var(--i) * 45ms);
	}
	.arch-item:hover {
		background: rgba(0, 0, 0, 0.04);
		color: var(--ink);
		transform: translateX(3px) !important;
		transition-delay: 0ms;
	}
	.folio.dark .arch-item:hover {
		background: rgba(255, 255, 255, 0.04);
	}
	.arch-no {
		font-family: var(--serif);
		font-size: 15px;
		color: var(--ink-3);
		flex: none;
		transition: color 0.18s;
	}
	.arch-item:hover .arch-no,
	.arch-item.current .arch-no {
		color: var(--vermilion);
	}
	.arch-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.arch-title {
		font-size: 13px;
		font-weight: 560;
		color: inherit;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.arch-item.current .arch-title {
		color: var(--ink);
	}
	.arch-meta {
		font-size: 10.5px;
		color: var(--ink-3);
	}
	.arch-arrow {
		flex: none;
		opacity: 0;
		transform: translateX(-4px);
		color: var(--vermilion);
		transition:
			opacity 0.18s,
			transform 0.25s var(--spring);
	}
	.arch-item:hover .arch-arrow {
		opacity: 1;
		transform: translateX(0);
	}
	.arch-item.current .arch-arrow {
		opacity: 0.55;
		transform: none;
	}
	.arch-foot {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 12px;
		padding: 14px 8px 4px;
		border-top: 1px solid var(--rule-faint);
	}
	.arch-avatar {
		flex: none;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-family: var(--serif);
		font-size: 16px;
		color: var(--vermilion);
		background: var(--vermilion-soft);
		border: 1px solid color-mix(in srgb, var(--vermilion) 25%, transparent);
	}
	.arch-user {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.arch-name {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--ink);
	}
	.arch-mail {
		font-size: 10.5px;
		color: var(--ink-3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* ── Notch ── */
	.notch {
		position: absolute;
		left: 0;
		transform: translateY(-50%);
		z-index: 3;
		background: var(--paper-deep);
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--ink-3);
		box-shadow:
			inset -10px 0 18px rgba(0, 0, 0, 0.13),
			inset 0 6px 12px rgba(0, 0, 0, 0.07),
			inset 0 -6px 12px rgba(0, 0, 0, 0.05);
		transition:
			width 0.14s ease-out,
			height 0.14s ease-out,
			border-radius 0.14s ease-out,
			top 0.06s ease-out,
			color 0.14s ease;
		padding-left: 1px;
	}
	.notch:hover {
		color: var(--ink-2);
	}
	.notch-r {
		left: auto;
		right: 0;
		padding-left: 0;
		padding-right: 1px;
		box-shadow:
			inset 10px 0 18px rgba(0, 0, 0, 0.13),
			inset 0 6px 12px rgba(0, 0, 0, 0.07),
			inset 0 -6px 12px rgba(0, 0, 0, 0.05);
	}
	.notch-r.writing {
		color: var(--ultramarine);
		animation: nowPulse 1.6s ease-in-out infinite;
	}

	/* mobile margin drawer layer (mirrors the archive) */
	.margin-layer {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		width: var(--margin-w-m);
		z-index: 0;
		display: flex;
		visibility: hidden;
		transition: visibility 0s linear 0.45s;
	}
	.md-open .margin-layer {
		visibility: visible;
		transition-delay: 0s;
	}
	.margin-layer :global(.margin),
	.margin-layer aside {
		width: 100% !important;
		border-left: none;
		background: transparent;
	}

	/* ── The desk (peels right) ── */
	.desk {
		position: absolute;
		inset: 0;
		z-index: 1;
		background:
			radial-gradient(120% 90% at 50% -20%, rgba(255, 255, 255, 0.55), transparent 60%),
			var(--paper);
		border-radius: 0;
		transform: translateX(0);
		transition:
			transform 0.42s var(--out),
			box-shadow 0.42s var(--out),
			border-radius 0.42s var(--out),
			background 0.4s ease;
		overflow: hidden;
	}
	.folio.dark .desk {
		background:
			radial-gradient(120% 90% at 50% -20%, rgba(255, 220, 160, 0.05), transparent 60%),
			var(--paper);
	}
	.desk.open {
		transform: translateX(var(--archive-w));
		border-radius: 22px;
		box-shadow: -14px 0 52px rgba(0, 0, 0, 0.24);
	}
	.desk.open-right {
		transform: translateX(calc(-1 * var(--margin-w-m)));
		border-radius: 22px;
		box-shadow: 14px 0 52px rgba(0, 0, 0, 0.24);
	}
	.backdrop {
		position: absolute;
		inset: 0;
		z-index: 6;
		cursor: w-resize;
	}

	.desk-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		height: 100%;
	}

	/* ── Scroll & page ── */
	.scroll {
		min-width: 0;
		overflow-y: auto;
		/* the spine is the scroll indicator — hide the native bar */
		scrollbar-width: none;
	}
	.scroll::-webkit-scrollbar {
		display: none;
	}

	.page {
		max-width: 660px;
		margin: 0 auto;
		padding: 9vh 28px 0;
	}

	/* zen: a blank folio is the greeting, the line, and nothing else */
	.page.zen {
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-height: 100%;
		padding-top: 0;
		padding-bottom: 10vh;
	}
	.zen-actions {
		position: absolute;
		top: 20px;
		right: 58px;
		display: flex;
		gap: 4px;
		z-index: 3;
		opacity: 0.55;
		transition: opacity 0.25s;
	}
	.zen-actions:hover {
		opacity: 1;
	}
	.page.zen .greeting {
		padding: 0 0 3vh;
	}
	.page.zen .edge {
		margin-top: 0;
	}

	/* ── Letterhead ── */
	.kicker-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.kicker {
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--vermilion);
	}
	.lh-actions {
		display: flex;
		gap: 4px;
	}
	.ghost {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		border: none;
		background: transparent;
		color: var(--ink-3);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			transform 0.15s;
	}
	.ghost:hover {
		background: var(--rule-faint);
		color: var(--ink);
	}
	.ghost:active {
		transform: scale(0.92);
	}

	.lamp {
		position: relative;
		overflow: hidden;
	}
	.lamp svg {
		position: absolute;
		transition:
			transform 0.5s var(--spring),
			opacity 0.3s;
	}
	.lamp .i-sun {
		transform: rotate(-180deg) scale(0.4);
		opacity: 0;
	}
	.lamp .i-moon {
		transform: rotate(0) scale(1);
		opacity: 1;
	}
	.lamp.lit .i-sun {
		transform: rotate(0) scale(1);
		opacity: 1;
	}
	.lamp.lit .i-moon {
		transform: rotate(180deg) scale(0.4);
		opacity: 0;
	}

	.title-row {
		display: flex;
		align-items: baseline;
		gap: 10px;
		margin-top: 18px;
	}
	.title {
		font-family: var(--serif);
		font-size: clamp(34px, 5vw, 44px);
		font-weight: 400;
		line-height: 1.08;
		margin: 0;
		outline: none;
		caret-color: var(--vermilion);
		border-bottom: 1px solid transparent;
		transition: border-color 0.2s;
	}
	.title:focus {
		border-bottom-color: var(--rule);
	}
	.save-dot {
		flex: none;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: transparent;
		transition: background 0.25s;
		transform: translateY(-4px);
	}
	.save-dot.saving {
		background: var(--ink-3);
		animation: pulse 0.9s ease-in-out infinite;
	}
	.save-dot.saved {
		background: var(--ok);
	}
	@keyframes pulse {
		50% {
			opacity: 0.35;
		}
	}

	.byline {
		margin: 10px 0 0;
		font-size: 12.5px;
		color: var(--ink-2);
		letter-spacing: 0.01em;
	}
	.byline .x {
		color: var(--ink-3);
		padding: 0 2px;
	}

	.asterism {
		display: flex;
		align-items: center;
		gap: 16px;
		margin: 26px 0 0;
		color: var(--ink-3);
		font-size: 13px;
	}
	.asterism::before,
	.asterism::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--rule-faint);
	}
	.asterism.dim {
		margin: 52px 0 0;
		opacity: 0.75;
	}

	/* ── Greeting ── */
	.greeting {
		padding: 11vh 0 6vh;
	}
	.greet-line {
		font-family: var(--serif);
		font-size: clamp(38px, 6vw, 56px);
		font-weight: 400;
		line-height: 1.12;
		margin: 0;
	}
	.greet-w {
		display: inline-block;
		opacity: 0;
		transform: translateY(14px) rotate(0.4deg);
		animation: wordUp 0.7s var(--out) forwards;
	}
	@keyframes wordUp {
		to {
			opacity: 1;
			transform: translateY(0) rotate(0);
		}
	}
	.greet-sub {
		margin: 14px 0 0;
		font-family: var(--serif);
		font-style: italic;
		font-size: 17px;
		color: var(--ink-2);
	}

	/* ── Sections ── */
	.sec {
		scroll-margin-top: 48px;
	}
	.sec-head {
		display: flex;
		align-items: baseline;
		gap: 14px;
		margin-top: 44px;
		position: relative;
	}
	.sec-no {
		flex: none;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: var(--vermilion);
		transform: translateY(-2px);
		transition: transform 0.35s var(--spring);
	}
	.sec-head:hover .sec-no {
		transform: translateY(-2px) scale(1.18) rotate(-4deg);
	}
	.sec-title {
		font-family: var(--serif);
		font-size: clamp(21px, 3vw, 25px);
		font-weight: 400;
		line-height: 1.28;
		margin: 0;
		flex: 1;
	}
	.sec-title.editing {
		outline: none;
		caret-color: var(--vermilion);
		border-bottom: 1px dashed var(--rule);
	}

	/* right-margin rail: timestamp, then actions beneath — section hover only */
	.sec-rail {
		position: absolute;
		right: -14px;
		top: 4px;
		transform: translateX(100%);
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 6px;
		opacity: 0;
		translate: -6px 0;
		transition:
			opacity 0.22s var(--out),
			translate 0.3s var(--out);
		pointer-events: none;
	}
	.sec:hover .sec-rail,
	.sec-rail:focus-within {
		opacity: 1;
		translate: 0 0;
		pointer-events: auto;
	}
	.sec-time {
		font-family: var(--mono);
		font-size: 10px;
		color: var(--ink-3);
		white-space: nowrap;
		padding-left: 5px;
	}
	.sec-actions {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.rail-btn {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 7px;
		border: none;
		background: transparent;
		color: var(--ink-3);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			transform 0.25s var(--spring);
	}
	.rail-btn:hover {
		background: var(--rule-faint);
		color: var(--vermilion);
		transform: translateX(2px);
	}
	.rail-btn:disabled {
		opacity: 0.4;
		pointer-events: none;
	}
	.sec-head.fresh .sec-title {
		animation: inkIn 0.6s var(--out);
	}
	@keyframes inkIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}

	/* ── Prose ── */
	.folio-prose {
		margin-top: 16px;
	}
	.pgraph {
		font-family: var(--body);
		font-size: 15.5px;
		font-weight: 430;
		line-height: 1.62;
		color: var(--ink);
		margin: 0 0 14px;
	}
	.pgraph .w {
		opacity: 0;
		animation: wfade 0.4s var(--out) forwards;
	}
	@keyframes wfade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	.pgraph.dropcap::first-letter {
		font-family: var(--serif);
		font-size: 3.4em;
		line-height: 0.82;
		float: left;
		padding: 4px 8px 0 0;
		color: var(--ultramarine);
	}

	.quote {
		font-family: var(--serif);
		font-style: italic;
		font-size: 19px;
		line-height: 1.45;
		color: var(--ink-2);
		margin: 20px 0;
		padding-left: 18px;
		border-left: 2px solid var(--vermilion);
		transition: padding-left 0.3s var(--out);
	}
	.quote:hover {
		padding-left: 24px;
	}

	.cutlist {
		list-style: none;
		margin: 4px 0 14px;
		padding: 0;
	}
	.cutlist li {
		position: relative;
		font-family: var(--body);
		font-size: 14.5px;
		line-height: 1.55;
		color: var(--ink);
		padding: 5px 0 5px 24px;
	}
	.cutlist li::before {
		content: '—';
		position: absolute;
		left: 0;
		color: var(--vermilion);
		font-weight: 600;
		transition: transform 0.3s var(--spring);
	}
	.cutlist li:hover::before {
		transform: translateX(4px);
	}

	/* ── Thinking ── */
	.thinking {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		cursor: pointer;
		color: var(--ink-3);
		font-family: var(--mono);
		font-size: 11px;
		line-height: 1.65;
		margin: 0 0 14px;
		user-select: none;
		transition: color 0.15s;
	}
	.thinking:hover {
		color: var(--ink-2);
	}
	.think-slash {
		flex: none;
		opacity: 0.45;
		font-weight: 700;
		letter-spacing: -1px;
	}
	.think-content {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.thinking.open .think-content {
		white-space: pre-wrap;
		overflow: visible;
		text-overflow: clip;
	}

	/* ── Code ── */
	.codeblock {
		position: relative;
		background: var(--code-bg);
		border: 1px solid var(--rule-faint);
		border-radius: 10px;
		padding: 16px 18px 14px;
		margin: 18px 0;
	}
	.codeblock pre {
		margin: 0;
		font-family: var(--mono);
		font-size: 12.5px;
		line-height: 1.7;
		color: var(--ink);
		white-space: pre;
		overflow-x: auto;
	}
	.code-lang {
		position: absolute;
		top: 10px;
		right: 14px;
		font-family: var(--mono);
		font-size: 9.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--ink-3);
	}

	/* ── Ledger ── */
	.ledger {
		margin: 6px 0 18px;
		padding: 10px 14px;
		border-left: 2px solid var(--ultramarine);
		background: var(--ultramarine-soft);
		border-radius: 0 10px 10px 0;
	}
	.entry {
		display: flex;
		align-items: baseline;
		gap: 8px;
		font-family: var(--mono);
		font-size: 12px;
		line-height: 2.1;
		color: var(--ink-2);
		opacity: 0;
		animation: wfade 0.4s var(--out) forwards;
		/* never break mid-word: the object ellipsizes, the note stays whole */
		word-break: normal;
		overflow-wrap: normal;
		min-width: 0;
	}
	.stamp {
		flex: none;
		width: 13px;
		height: 13px;
		border-radius: 50%;
		border: 1.5px solid var(--ink-3);
		display: grid;
		place-items: center;
		align-self: center;
		color: transparent;
		transition: border-color 0.2s;
	}
	.stamp.done {
		border-color: var(--ok);
		color: var(--ok);
		animation: stampIn 0.35s var(--spring);
	}
	@keyframes stampIn {
		from {
			transform: scale(1.6);
		}
		to {
			transform: scale(1);
		}
	}
	.vicon {
		flex: none;
		align-self: center;
		color: var(--ultramarine);
		transition: transform 0.3s var(--spring);
	}
	.entry:hover .vicon {
		transform: rotate(-10deg) scale(1.15);
	}
	.verb {
		flex: none;
		color: var(--ultramarine);
		font-weight: 500;
		white-space: nowrap;
	}
	.object {
		flex: 0 1 auto;
		min-width: 0;
		color: var(--ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.dotfill {
		flex: 1 0 14px;
		border-bottom: 1px dotted var(--rule);
		transform: translateY(-3px);
	}
	.note {
		flex: none;
		color: var(--ink-3);
		font-size: 11px;
		white-space: nowrap;
	}

	/* ── Typesetting indicator ── */
	.typesetting {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 0;
		font-family: var(--serif);
		font-style: italic;
		font-size: 15px;
		color: var(--ink-3);
	}
	.dots {
		display: flex;
		gap: 4px;
	}
	.dots i {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--ultramarine);
		animation: bounce 1.3s infinite ease-in-out both;
		opacity: 0.3;
	}
	.dots i:nth-child(2) {
		animation-delay: 0.14s;
	}
	.dots i:nth-child(3) {
		animation-delay: 0.28s;
	}
	@keyframes bounce {
		0%,
		80%,
		100% {
			transform: scale(0.5);
			opacity: 0.3;
		}
		40% {
			transform: scale(1);
			opacity: 1;
		}
	}

	/* ── The edge ── */
	.edge {
		display: flex;
		align-items: flex-end;
		gap: 14px;
		margin: 56px -18px 0;
		padding: 16px 18px 14px;
		border-radius: 16px;
		border: 1px solid transparent;
		transition:
			opacity 0.25s,
			border-color 0.3s,
			background 0.3s,
			box-shadow 0.4s var(--out);
	}
	.edge:hover {
		border-color: var(--rule-faint);
		background: color-mix(in srgb, var(--paper-deep) 26%, transparent);
	}
	.edge:focus-within {
		border-color: color-mix(in srgb, var(--vermilion) 32%, var(--rule-faint));
		background: color-mix(in srgb, var(--paper-deep) 42%, transparent);
		box-shadow: 0 16px 44px -20px rgba(0, 0, 0, 0.28);
	}
	.edge.busy {
		opacity: 0.45;
		pointer-events: none;
	}
	.pilcrow {
		flex: none;
		font-family: var(--serif);
		font-size: 26px;
		color: var(--vermilion);
		transform: translateY(2px);
		animation: caretBlink 2.6s ease-in-out infinite;
	}
	.pilcrow.hop {
		animation: hop 0.5s var(--spring);
	}
	@keyframes hop {
		35% {
			transform: translateY(-9px) rotate(-8deg);
		}
		70% {
			transform: translateY(2px) rotate(2deg);
		}
	}
	@keyframes caretBlink {
		0%,
		70%,
		100% {
			opacity: 1;
		}
		85% {
			opacity: 0.25;
		}
	}
	.edge-line {
		flex: 1;
		position: relative;
	}
	.edge-line textarea {
		display: block;
		width: 100%;
		background: transparent;
		border: none;
		outline: none;
		resize: none;
		overflow-y: hidden;
		font-family: var(--body);
		font-size: 16px;
		font-weight: 430;
		line-height: 1.6;
		color: var(--ink);
		padding: 4px 0 8px;
		max-height: 38vh;
	}
	.edge-line textarea::placeholder {
		font-family: var(--serif);
		font-style: italic;
		font-size: 16.5px;
		color: var(--ink-3);
	}
	.edge-line .rule {
		height: 1.5px;
		background: var(--rule);
		border-radius: 999px;
		position: relative;
		overflow: hidden;
	}
	/* idle invite: a faint ink shimmer sweeps the blank line */
	.edge-line .rule::before {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 38%;
		background: linear-gradient(
			90deg,
			transparent,
			color-mix(in srgb, var(--vermilion) 50%, transparent),
			transparent
		);
		transform: translateX(-110%);
		animation: inkSweep 4.6s ease-in-out infinite;
	}
	@keyframes inkSweep {
		0% {
			transform: translateX(-110%);
		}
		60%,
		100% {
			transform: translateX(380%);
		}
	}
	.edge-line .rule::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--vermilion);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 0.55s var(--out);
	}
	.edge-line:focus-within .rule::after {
		transform: scaleX(1);
	}

	.set-btn {
		flex: none;
		height: 40px;
		padding: 0 18px;
		border-radius: 999px;
		border: 1.5px solid var(--rule);
		background: transparent;
		color: var(--ink-2);
		display: flex;
		align-items: center;
		font-family: var(--sans);
		font-size: 13px;
		font-weight: 620;
		letter-spacing: 0.02em;
		cursor: pointer;
		transition:
			background 0.25s,
			color 0.25s,
			border-color 0.25s,
			padding 0.3s var(--out),
			transform 0.15s,
			box-shadow 0.25s;
	}
	/* the invitation reads "Set in type"; once you write, it folds into a seal */
	.set-label {
		white-space: nowrap;
		overflow: hidden;
		max-width: 90px;
		margin-right: 8px;
		transition:
			max-width 0.32s var(--out),
			margin-right 0.32s var(--out),
			opacity 0.2s;
	}
	.set-btn.ready {
		padding: 0 12px;
	}
	.set-btn.ready .set-label {
		max-width: 0;
		margin-right: 0;
		opacity: 0;
	}
	.set-btn svg {
		transition: transform 0.3s var(--spring);
	}
	.set-btn.ready {
		background: var(--vermilion);
		border-color: var(--vermilion);
		color: #fff8ef;
		box-shadow: 0 4px 18px var(--vermilion-soft);
	}
	.set-btn.ready:hover {
		transform: translateY(-2px);
		box-shadow: 0 7px 22px color-mix(in srgb, var(--vermilion) 25%, transparent);
	}
	.set-btn.ready:hover svg {
		transform: translateY(-1px) rotate(8deg);
	}
	.set-btn:active {
		transform: scale(0.92);
	}

	/* ── Colophon ── */
	.colophon {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 64px 0 40px;
		font-size: 10.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-3);
		flex-wrap: wrap;
	}
	.fleuron {
		font-size: 14px;
		text-transform: none;
		color: var(--vermilion);
		opacity: 0.7;
	}
	.reset {
		border: none;
		background: none;
		font: inherit;
		letter-spacing: inherit;
		text-transform: inherit;
		color: var(--ink-3);
		cursor: pointer;
		border-bottom: 1px dotted var(--rule);
		padding: 0;
		transition: color 0.2s;
	}
	.reset:hover {
		color: var(--vermilion);
	}

	/* ── Spine ── */
	.spine {
		position: absolute;
		left: max(18px, calc(50% - 330px - 240px));
		top: 50%;
		transform: translateY(-50%);
		z-index: 2;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 20px;
		padding: 10px 0;
	}
	.thread {
		position: absolute;
		top: 4px;
		bottom: 4px;
		width: 2px;
		border-radius: 999px;
		background: var(--rule-faint);
		overflow: hidden;
	}
	.thread-fill {
		width: 100%;
		background: var(--ultramarine);
		border-radius: 999px;
		transition: height 0.18s linear;
	}
	.node {
		position: relative;
		width: 22px;
		height: 22px;
		border: none;
		background: transparent;
		display: grid;
		place-items: center;
		cursor: pointer;
		padding: 0;
	}
	.node-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--paper);
		border: 1.5px solid var(--ink-3);
		transform: scale(calc(var(--mag, 1) * var(--base, 1)));
		transition:
			background 0.25s,
			border-color 0.25s,
			transform 0.15s var(--out);
	}
	.node.visited .node-dot {
		background: var(--ink-3);
		border-color: var(--ink-3);
	}
	.node.active .node-dot {
		--base: 1.45;
		background: var(--ultramarine);
		border-color: var(--ultramarine);
	}
	.node.now .node-dot {
		border-color: var(--vermilion);
		animation: nowPulse 2.4s ease-in-out infinite;
	}
	@keyframes nowPulse {
		50% {
			box-shadow: 0 0 0 5px var(--vermilion-soft);
		}
	}
	.node-tip {
		position: absolute;
		left: 26px;
		top: 50%;
		transform: translateY(-50%) translateX(-4px);
		display: flex;
		align-items: baseline;
		gap: 7px;
		white-space: nowrap;
		background: var(--paper-deep);
		border: 1px solid var(--rule-faint);
		border-radius: 8px;
		padding: 5px 10px;
		font-size: 11.5px;
		color: var(--ink-2);
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 0.18s,
			transform 0.25s var(--out);
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
		z-index: 3;
	}
	.node-tip em {
		font-family: var(--serif);
		font-style: normal;
		color: var(--vermilion);
	}
	.node:hover .node-tip {
		opacity: 1;
		transform: translateY(-50%) translateX(0);
	}

	/* ── The Margin (scratchboard) ── */
	.margin {
		width: clamp(280px, 24vw, 360px);
		border-left: 1px solid var(--rule-faint);
		display: flex;
		flex-direction: column;
		min-height: 0;
		background: color-mix(in srgb, var(--paper-deep) 36%, transparent);
		transition:
			width 0.42s var(--out),
			box-shadow 0.4s,
			border-color 0.4s;
		position: relative;
	}
	.margin.closed {
		width: 42px;
	}
	.margin.agent {
		border-left-color: color-mix(in srgb, var(--ultramarine) 45%, transparent);
		box-shadow: inset 4px 0 24px -12px color-mix(in srgb, var(--ultramarine) 55%, transparent);
	}

	.margin-head {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 22px 18px 10px;
	}
	.quill {
		color: var(--ultramarine);
		flex: none;
	}
	.margin-kicker {
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-2);
		flex: 1;
	}
	.agent-writing {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--serif);
		font-style: italic;
		font-size: 12.5px;
		color: var(--ultramarine);
	}
	.agent-writing i {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--ultramarine);
		animation: pulse 0.9s ease-in-out infinite;
	}
	.fold {
		width: 24px;
		height: 24px;
	}

	.margin-body {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 6px 20px 24px;
		cursor: text;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--ink-3) 60%, transparent) transparent;
	}
	.m-h {
		font-family: var(--serif);
		font-size: 19px;
		margin: 8px 0 6px;
		color: var(--ink);
	}
	.m-h2 {
		font-family: var(--serif);
		font-size: 16px;
		margin: 10px 0 4px;
		color: var(--ink);
	}
	.m-li {
		position: relative;
		font-family: var(--body);
		font-size: 13px;
		line-height: 1.55;
		color: var(--ink-2);
		padding: 2px 0 2px 16px;
	}
	.m-li::before {
		content: '–';
		position: absolute;
		left: 1px;
		color: var(--vermilion);
	}
	.m-sig {
		font-family: var(--mono);
		font-size: 11px;
		color: var(--ultramarine);
		margin: 8px 0 2px;
	}
	.m-p {
		font-family: var(--body);
		font-size: 13px;
		line-height: 1.55;
		color: var(--ink-2);
		margin: 2px 0;
	}
	.m-gap {
		height: 10px;
	}
	.m-caret {
		display: inline-block;
		width: 7px;
		height: 13px;
		background: var(--ultramarine);
		margin-left: 3px;
		animation: pulse 0.7s steps(2) infinite;
		vertical-align: text-bottom;
	}

	.margin-edit {
		flex: 1;
		min-height: 0;
		margin: 6px 20px 24px;
		padding: 0;
		background: transparent;
		border: none;
		outline: none;
		resize: none;
		font-family: var(--mono);
		font-size: 12px;
		line-height: 1.7;
		color: var(--ink);
		caret-color: var(--vermilion);
		overflow-y: auto;
	}

	.margin-spineb {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 22px 0;
		border: none;
		background: transparent;
		color: var(--ink-3);
		cursor: pointer;
		transition:
			color 0.2s,
			background 0.2s;
	}
	.margin-spineb:hover {
		color: var(--ink);
		background: var(--rule-faint);
	}
	.margin-vlabel {
		writing-mode: vertical-rl;
		font-size: 10px;
		font-weight: 650;
		letter-spacing: 0.22em;
		text-transform: uppercase;
	}
	.vdot {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--ultramarine);
		animation: pulse 0.9s ease-in-out infinite;
	}

	/* ── Reveal on load ── */
	.reveal {
		opacity: 0;
		transform: translateY(10px);
		animation: rise 0.7s var(--out) forwards;
		animation-delay: var(--d, 0s);
	}
	@keyframes rise {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 1080px) {
		.zen-actions {
			right: 22px;
		}
	}
	@media (max-width: 860px) {
		.spine {
			display: none;
		}
		.sec-rail {
			display: none;
		}
		.edge {
			margin-left: 0;
			margin-right: 0;
		}
	}

	/* the composer and the query occupy the same cell, so the crossfade between
	   them never pushes the page around */
	.edge-slot {
		display: grid;
	}
	.edge-slot > .edge,
	.edge-slot > .query {
		grid-area: 1 / 1;
		align-self: end;
	}

	/* ── The Query (the agent's question, set where the composer would be) ── */
	.query {
		position: relative;
		margin: 44px -10px 0;
		padding: 20px 22px 18px;
		/* a soft leaf laid on the page — every corner rounded, no hard rule */
		border: 1px solid var(--rule);
		border-radius: 22px;
		background: var(--paper);
		box-shadow: 0 20px 52px -34px rgba(0, 0, 0, 0.4);
	}
	.query.sealing {
		pointer-events: none;
	}

	.query-head {
		display: flex;
		align-items: center;
		gap: 9px;
		margin-bottom: 16px;
	}
	.q-badge {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		flex: none;
		color: var(--ink-2);
		background: color-mix(in srgb, var(--ink) 7%, transparent);
		animation: badgeIn 0.5s 0.1s var(--spring) backwards;
	}
	@keyframes badgeIn {
		from {
			transform: scale(0);
		}
	}
	.q-kicker {
		font-family: var(--mono);
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-2);
	}
	.q-from {
		font-family: var(--serif);
		font-style: italic;
		font-size: 14px;
		color: var(--ink-3);
	}
	/* progress as a thread that fills green, the way the spine fills with ink */
	.q-meter {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 9px;
	}
	.q-track {
		width: clamp(64px, 12vw, 104px);
		height: 4px;
		border-radius: 999px;
		background: var(--rule-faint);
		overflow: hidden;
	}
	.q-fill {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: var(--ok);
		transition: width 0.45s var(--spring);
	}
	.q-count {
		font-family: var(--mono);
		font-size: 10px;
		color: var(--ink-3);
	}

	.q-body {
		animation: qIn 0.42s var(--out);
	}
	@keyframes qIn {
		from {
			opacity: 0;
			transform: translateX(calc(var(--dir, 1) * 26px));
		}
	}
	.q-prompt {
		font-family: var(--serif);
		font-size: clamp(20px, 2.8vw, 25px);
		font-weight: 400;
		line-height: 1.25;
		margin: 0;
		color: var(--ink);
	}
	.q-hint {
		display: inline-block;
		margin: 7px 0 14px;
		font-family: var(--mono);
		font-size: 10px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--ink-3);
	}

	.q-options {
		display: flex;
		flex-direction: column;
		gap: 7px;
	}
	.opt {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		width: 100%;
		text-align: left;
		padding: 11px 14px;
		border-radius: 12px;
		border: 1px solid var(--rule-faint);
		background: transparent;
		color: var(--ink);
		cursor: pointer;
		transition:
			border-color 0.18s,
			background 0.18s,
			transform 0.22s var(--spring);
		animation: optIn 0.5s var(--out) backwards;
		animation-delay: calc(var(--oi) * 0.055s + 0.08s);
	}
	@keyframes optIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
	.opt:hover {
		border-color: color-mix(in srgb, var(--vermilion) 40%, var(--rule));
		background: var(--vermilion-soft);
		transform: translateX(3px);
	}
	.opt.sel {
		border-color: var(--vermilion);
		background: var(--vermilion-soft);
	}
	/* a typeset ballot: each choice carries a letter; your pick is stamped in vermilion */
	.opt-mark {
		flex: none;
		display: grid;
		place-items: center;
		width: 23px;
		height: 23px;
		margin-top: 1px;
		border: 1.5px solid var(--rule);
		border-radius: 50%;
		background: color-mix(in srgb, var(--ink) 4%, transparent);
		transition:
			border-color 0.2s,
			background 0.3s var(--spring);
	}
	.opt.multi .opt-mark {
		border-radius: 7px;
	}
	.opt-letter {
		font-family: var(--mono);
		font-size: 11px;
		font-weight: 500;
		line-height: 1;
		color: var(--ink-3);
		transition: color 0.2s;
	}
	.opt-quill {
		color: var(--ink-3);
		transition: color 0.2s;
	}
	.opt:hover .opt-mark {
		border-color: var(--vermilion);
	}
	.opt:hover .opt-letter,
	.opt.custom:hover .opt-quill {
		color: var(--vermilion);
	}
	.opt.sel .opt-mark {
		border-color: var(--vermilion);
		background: var(--vermilion);
		animation: stampIn 0.35s var(--spring);
	}
	.opt.sel .opt-letter {
		color: var(--paper);
	}
	.opt-text {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.opt-title {
		display: flex;
		align-items: baseline;
		gap: 8px;
		font-family: var(--body);
		font-size: 14.5px;
		font-weight: 600;
		line-height: 1.4;
		color: var(--ink);
	}
	.opt-title.write {
		font-family: var(--serif);
		font-style: italic;
		font-weight: 400;
		font-size: 15px;
		color: var(--ink-2);
	}
	.opt-explain {
		font-family: var(--body);
		font-size: 13px;
		line-height: 1.5;
		color: var(--ink-2);
	}
	/* the agent's own recommendation — a quiet marginal note, not a loud tag */
	.opt-rec {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: var(--mono);
		font-size: 9px;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-3);
		border: 1px solid var(--rule);
		padding: 2px 7px 2px 6px;
		border-radius: 999px;
		transform: translateY(-1px);
	}
	.opt-rec svg {
		opacity: 0.7;
		color: var(--ink-2);
	}
	.opt.custom {
		border-style: dashed;
	}

	.custom-edge {
		display: flex;
		align-items: flex-end;
		gap: 10px;
		padding: 6px 14px 4px;
		margin-top: 2px;
		animation: optIn 0.4s var(--out);
	}
	.pilcrow.sm {
		font-size: 19px;
		animation: none;
	}
	.custom-edge .edge-line {
		flex: 1;
	}

	.q-foot {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-top: 18px;
	}
	.q-skip {
		border: none;
		background: none;
		padding: 0;
		font-family: var(--body);
		font-size: 12.5px;
		color: var(--ink-3);
		cursor: pointer;
		border-bottom: 1px dotted var(--rule);
		transition: color 0.2s;
	}
	.q-skip:hover {
		color: var(--vermilion);
	}
	.q-nav {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.q-back {
		display: grid;
		place-items: center;
		width: 34px;
		height: 34px;
		border-radius: 999px;
		border: 1.5px solid var(--rule);
		background: transparent;
		color: var(--ink-2);
		cursor: pointer;
		transition:
			transform 0.2s var(--spring),
			border-color 0.2s,
			color 0.2s;
	}
	.q-back:hover {
		color: var(--vermilion);
		border-color: var(--vermilion);
		transform: translateX(-2px);
	}
	.q-next {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 38px;
		padding: 0 18px;
		border-radius: 999px;
		border: 1.5px solid var(--rule);
		background: transparent;
		color: var(--ink-3);
		font-family: var(--sans);
		font-size: 13px;
		font-weight: 620;
		letter-spacing: 0.02em;
		cursor: pointer;
		transition:
			background 0.25s,
			color 0.25s,
			border-color 0.25s,
			transform 0.15s,
			box-shadow 0.25s;
	}
	.q-next:disabled {
		cursor: default;
		opacity: 0.5;
	}
	.q-next.ready {
		background: var(--vermilion);
		border-color: var(--vermilion);
		color: #fff8ef;
		box-shadow: 0 4px 18px var(--vermilion-soft);
	}
	.q-next.ready:hover {
		transform: translateY(-2px);
		box-shadow: 0 7px 22px color-mix(in srgb, var(--vermilion) 25%, transparent);
	}
	.q-next svg {
		transition: transform 0.3s var(--spring);
	}
	.q-next.ready:hover svg {
		transform: translateX(2px);
	}
	.next-label {
		white-space: nowrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.folio *,
		.folio *::before,
		.folio *::after {
			animation-duration: 0.01ms !important;
			animation-delay: 0s !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>
