<script>
	import { tick } from 'svelte';
	import { browser } from '$app/environment';
	import { theme, showSidebar, settings, models as modelsStore } from '$lib/stores';
	import { deleteFileById } from '$lib/apis/files';
	import Markdown from './Messages/Markdown.svelte';
	import QuerySlip from './QuerySlip.svelte';

	/*
	 * FOLIO — the live conversation as a manuscript.
	 *
	 * A faithful port of the /design prototype, but fed by the real chat:
	 * prompts become §-numbered serif headings, responses are typeset passages
	 * (rendered through the real Markdown pipeline), the spine maps the document,
	 * and the composer is the page's growing edge. Archive (sidebar) and Margin
	 * (scratchboard) live in the app layout around this surface.
	 */

	let {
		history = $bindable(),
		chatId = '',
		selectedModels = $bindable([]),
		files = $bindable([]),
		onUploadFiles = (fileList) => {},
		chatTitle = '',
		generating = false,
		user = null,
		onSubmit = (text) => {},
		onRegenerate = (message) => {},
		onEditPrompt = (messageId, content) => {},
		onRenameChat = (title) => {},
		onNewChat = () => {},
		query = null,
		onQueryAnswer = (result) => {}
	} = $props();

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

	// ─── The lamp (theme ripple, mirroring the app's toggleTheme) ───
	let dark = $derived(
		$theme === 'dark' ||
			$theme === 'oled-dark' ||
			($theme === 'system' &&
				typeof window !== 'undefined' &&
				window.matchMedia?.('(prefers-color-scheme: dark)').matches)
	);
	function applyTheme(next) {
		const root = document.documentElement;
		localStorage.setItem('theme', next);
		theme.set(next);
		['dark', 'light', 'oled-dark'].forEach((c) => root.classList.remove(c));
		root.classList.add(next);
	}
	function triggerThemeRipple(e) {
		const root = document.documentElement;
		const wasDark = root.classList.contains('dark') || root.classList.contains('oled-dark');
		const next = wasDark ? 'light' : 'dark';
		const target = e.currentTarget ?? e.target;
		const rect = target?.getBoundingClientRect();
		const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
		const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
		const maxR = Math.hypot(
			Math.max(x, window.innerWidth - x),
			Math.max(y, window.innerHeight - y)
		);
		const oldBg =
			getComputedStyle(root).getPropertyValue('--bg-base').trim() ||
			(wasDark ? '#181410' : '#f5f1e8');
		const gradient = `radial-gradient(circle var(--reveal-r) at ${x}px ${y}px, transparent 99.9%, black 100%)`;
		const overlay = document.createElement('div');
		overlay.style.cssText = `position:fixed;inset:0;z-index:9999;pointer-events:none;background:${oldBg};--reveal-r:0px;mask-image:${gradient};-webkit-mask-image:${gradient}`;
		document.body.appendChild(overlay);
		applyTheme(next);
		overlay
			.animate([{ '--reveal-r': '0px' }, { '--reveal-r': `${maxR}px` }], {
				duration: 600,
				easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
			})
			.finished.then(() => overlay.remove())
			.catch(() => overlay.remove());
	}
	function toggleArchive() {
		showSidebar.set(!$showSidebar);
	}

	const today = new Date().toLocaleDateString('en-GB', {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});

	const greetings = {
		night: [
			'Up late',
			'Burning the candle',
			'Still turning pages',
			'Night owl hours',
			'The quiet shift',
			'Moonlit margins',
			'Past the witching hour',
			'Candle still flickering',
			'The presses are sleeping',
			'Just you and the lamp',
			'Late, but in good company',
			'The small hours',
			'Stars out, ink ready',
			'Nightcap and a notebook',
			'The world has gone quiet',
			'One more line before bed',
			'Owls approve of this',
			'After-hours editing',
			'The midnight desk',
			'Hush — the night is yours'
		],
		morning: [
			'Good morning',
			'Fresh ink',
			'Bright and early',
			'Morning, then',
			'Top of the page',
			'First light',
			'The day is uncreased',
			'Kettle on, page open',
			'A crisp new sheet',
			'Dawn at the desk',
			'Sleeves rolled, ink fresh',
			'The early folio',
			'Sunlight on the margins',
			'A clean morning slate',
			'Birdsong and blank pages',
			'Rise and write',
			'The first draft of the day',
			'Coffee-and-paper o’clock',
			'A gentle start',
			'Morning has good lighting'
		],
		afternoon: [
			'Good afternoon',
			'Midday margins',
			'Afternoon, then',
			'Halfway down the page',
			'Pleasant afternoon',
			'The long middle of the day',
			'Sun high, page open',
			'Post-lunch productivity',
			'A steady afternoon',
			'The day in full stride',
			'Warm light, clear desk',
			'Afternoon ink',
			'The page turns easily now',
			'Second wind, fresh sheet',
			'A leisurely afternoon',
			'Midday at the manuscript',
			'The day’s good middle',
			'Tea break, then type',
			'Unhurried afternoon hours',
			'Plenty of daylight left'
		],
		evening: [
			'Good evening',
			'Evening, then',
			'Winding down',
			'Lamps lit',
			'A fine evening',
			'Settling in',
			'The day folds shut',
			'Soft light, slow pace',
			'Evening at the desk',
			'Dusk in the margins',
			'The quiet end of the day',
			'Slippers-on hours',
			'A calm evening',
			'The lamps know your name',
			'Unwinding, page by page',
			'Twilight at the typeset',
			'A gentle close',
			'Evening ink, no rush',
			'The day’s last good page',
			'Dim the lamp, not the ideas'
		]
	};
	function greetingFor(h) {
		const pool =
			h < 5
				? greetings.night
				: h < 12
					? greetings.morning
					: h < 18
						? greetings.afternoon
						: greetings.evening;
		return pool[Math.floor(Math.random() * pool.length)];
	}
	const greeting = `${greetingFor(new Date().getHours())}${user?.name ? ', ' + user.name : ''}.`;

	// ─── The blank-folio sub-line: one is picked at random per visit ───
	const intros = [
		'A blank folio. What shall we set in type?',
		'The press is warm and the ink is wet. Where to?',
		'Fresh paper, no smudges yet. Begin anywhere.',
		'An empty page is just a polite question. Ask one back.',
		'The margins are clear and the day is yours.',
		'Nothing written, everything possible. Your move.',
		'A clean sheet, a steady pen. What goes first?',
		'The folio yawns, stretches, and waits for a word.',
		'Quiet here. Pleasantly so. Say something.',
		'No deadlines on this page — only doodles, if you like.',
		'The typesetter has tea and time. Begin.',
		'White space, gently humming. Fill a little of it.',
		'Blank as a fresh snowfield. First footprint is yours.',
		'The ink barrel is full. Spend it however you please.',
		'A page with no opinions yet. Lend it some.',
		'Take off your coat, the folio is unhurried.',
		'Somewhere a printing press is rooting for you.',
		'New page, no rules, soft lighting. What now?',
		'The cursor blinks like it has a secret. Coax it out.',
		'Empty, tidy, and entirely on your side.',
		'A clean folio and absolutely no homework due.',
		'The page is listening. It is a very good listener.',
		'Blank, but optimistic. Give it a reason.',
		'Fresh vellum, no cat has walked across it. Yet.',
		'The whole manuscript starts with one small line.',
		'Stretch first. Then we set a word or two.',
		'No drafts to fear here — only beginnings.',
		'The folio is open and the kettle is on.',
		'A spotless page, smelling faintly of fresh ink.',
		'Nothing here but possibility and good margins.',
		'The press idles, patient as a sleeping cat.',
		'Write boldly; the eraser is right here.',
		'A page this empty is practically an invitation.',
		'Slow morning energy. Let a sentence wander in.',
		'The folio cracked its knuckles. Ready when you are.',
		'No wrong turns on an empty page. Pick a direction.',
		'A fresh leaf, unbothered and yours to crease.',
		'The ink is curious what you will do with it.',
		'Blank canvas, no critics, generous lighting.',
		'Put your feet up; the page can wait a beat.',
		'One clear folio, zero expectations, infinite undo.',
		'The margin doodles will not judge you. Promise.',
		'A hush, a page, a pen. The rest is up to you.',
		'Begin small. Folios are patient about the rest.',
		'The press has been practising. Give it a line.',
		'Untouched and unhurried — a rare combination.',
		'A blank folio, freshly pressed and lightly perfumed with ink.',
		'No first sentence is too small for this much paper.',
		'The page leans in, eyebrow raised, genuinely interested.',
		'Crisp, empty, and quietly delighted to see you.',
		'Whatever you set here, the folio promises to hold it well.',
		'Take a breath. The blank page rather enjoys the pause.'
	];
	const introLine = intros[Math.floor(Math.random() * intros.length)];

	function folioMark(id) {
		if (!id) return '01';
		let h = 0;
		for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
		return String((Math.abs(h) % 99) + 1).padStart(2, '0');
	}
	let folioNo = $derived(folioMark(chatId));

	function contentToText(c) {
		if (typeof c === 'string') return c;
		if (Array.isArray(c)) return c.map((p) => p?.text ?? '').join(' ');
		return '';
	}
	function fmtTime(ts) {
		if (!ts) return '';
		const d = new Date(ts < 1e12 ? ts * 1000 : ts);
		return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
	}

	function buildList(h) {
		const out = [];
		if (!h?.messages || !h.currentId) return out;
		let m = h.messages[h.currentId];
		const seen = new Set();
		while (m && !seen.has(m.id)) {
			seen.add(m.id);
			out.push(m);
			m = m.parentId ? h.messages[m.parentId] : null;
		}
		return out.reverse();
	}
	let messages = $derived(buildList(history));

	let sections = $derived.by(() => {
		const secs = [];
		let cur = null;
		for (const m of messages) {
			if (m.role === 'user') {
				cur = {
					id: m.id,
					userId: m.id,
					prompt: contentToText(m.content),
					time: fmtTime(m.timestamp),
					assistants: []
				};
				secs.push(cur);
			} else if (m.role === 'assistant') {
				if (!cur) {
					cur = { id: m.id, userId: null, prompt: '', time: fmtTime(m.timestamp), assistants: [] };
					secs.push(cur);
				}
				// Snapshot into a fresh object each recompute: streamed deltas mutate
				// the message in place, and identical references would never repaint.
				cur.assistants.push({
					id: m.id,
					content: contentToText(m.content),
					done: m.done ?? true,
					entries: m.statusHistory ?? (m.status ? [m.status] : []),
					message: m
				});
			}
		}
		return secs;
	});

	// ─── Title (commit on blur; oninput fights the caret) ───
	let saveState = $state('idle');
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
	function commitTitle(e) {
		const t = (e.currentTarget.textContent ?? '').trim();
		if (t && t !== chatTitle) onRenameChat(t);
		else e.currentTarget.textContent = chatTitle || 'Untitled folio';
	}

	// ─── The edge (fallback textarea when no composer snippet is supplied) ───
	let composerText = $state('');
	let composerEl = $state(null);
	let pilcrowHop = $state(false);
	function doSend() {
		const text = composerText.trim();
		if (!text || generating) return;
		resumeFollowing();
		composerText = '';
		if (composerEl) {
			composerEl.style.height = 'auto';
			composerEl.style.overflowY = 'hidden';
		}
		pilcrowHop = true;
		setTimeout(() => (pilcrowHop = false), 550);
		onSubmit(text);
	}
	function onComposerKey(e) {
		if (e.key !== 'Enter') return;
		const ctrlSend = $settings?.ctrlEnterToSend ?? false;
		if (ctrlSend ? e.ctrlKey || e.metaKey : !e.shiftKey) {
			e.preventDefault();
			doSend();
		}
	}
	function autogrow(e) {
		const el = e.currentTarget;
		el.style.height = 'auto';
		el.style.height = el.scrollHeight + 'px';
		el.style.overflowY = el.scrollHeight > el.clientHeight + 2 ? 'auto' : 'hidden';
	}
	function onComposerPaste(e) {
		const items = Array.from(e.clipboardData?.items ?? []);
		const pasted = items
			.filter((it) => it.kind === 'file')
			.map((it) => it.getAsFile())
			.filter(Boolean);
		if (pasted.length > 0) {
			e.preventDefault();
			onUploadFiles(pasted);
		}
	}

	// ─── The type case: every model is a sort of type, one (or more) sets the page ───
	let typecaseOpen = $state(false);
	let typecaseQuery = $state('');
	let typecaseEl = $state(null);
	let typecaseFindEl = $state(null);

	let typecase = $derived(($modelsStore ?? []).filter((m) => m?.id));
	let chosenIds = $derived(selectedModels.filter((id) => id !== ''));
	let shelf = $derived.by(() => {
		const q = typecaseQuery.trim().toLowerCase();
		if (!q) return typecase;
		return typecase.filter((m) => (m?.name ?? m.id).toLowerCase().includes(q));
	});
	function voiceName(id) {
		return typecase.find((m) => m.id === id)?.name ?? id;
	}
	let voiceLabel = $derived(
		chosenIds.length === 0
			? 'choose a voice'
			: chosenIds.length === 1
				? voiceName(chosenIds[0])
				: `${voiceName(chosenIds[0])} +${chosenIds.length - 1}`
	);
	async function toggleTypecase() {
		typecaseOpen = !typecaseOpen;
		typecaseQuery = '';
		if (typecaseOpen) {
			await tick();
			typecaseFindEl?.focus();
		}
	}
	function pickVoice(id, additive = false) {
		if (additive) {
			// shift-click: write in ensemble — add or excuse a voice (never strand the page voiceless)
			if (chosenIds.includes(id)) {
				if (chosenIds.length > 1) selectedModels = chosenIds.filter((x) => x !== id);
			} else {
				selectedModels = [...chosenIds, id];
			}
		} else {
			selectedModels = [id];
			typecaseOpen = false;
		}
	}
	function onDeskPointerDown(e) {
		if (typecaseOpen && typecaseEl && !typecaseEl.contains(e.target)) typecaseOpen = false;
	}
	function onDeskKeydown(e) {
		if (e.key === 'Escape' && typecaseOpen) typecaseOpen = false;
	}

	// ─── Enclosures: clippings pinned above the writing line ───
	let fileInputEl = $state(null);
	function onFilesPicked(e) {
		const list = Array.from(e.currentTarget.files ?? []);
		if (list.length > 0) onUploadFiles(list);
		e.currentTarget.value = '';
	}
	function removeClipping(idx) {
		const f = files[idx];
		files = files.filter((_, i) => i !== idx);
		if (f?.type === 'file' && f?.id) {
			deleteFileById(localStorage.token, f.id).catch(() => {});
		}
	}
	function clipExt(name = '') {
		const ext = name.includes('.') ? name.split('.').at(-1) : '';
		return (ext || 'doc').slice(0, 4).toUpperCase();
	}
	function errorText(error) {
		const value = error?.content ?? error?.message ?? error;
		if (typeof value === 'string') return value;
		try {
			return JSON.stringify(value);
		} catch {
			return 'The provider rejected the request.';
		}
	}

	// ─── Spine: progress, active section, dock magnification ───
	let progress = $state(0);
	let activeIdx = $state(0);
	let spineEl = $state(null);
	let scroller = $state(null);
	let pageEl = $state(null);
	let followingEdge = $state(true);
	let newWriting = $state(0);
	let edgeScrollInProgress = false;
	let edgeScrollTimer;
	let pinFrame;
	const EDGE_THRESHOLD = 80;

	function distanceFromEdge() {
		if (!scroller) return 0;
		return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
	}
	function schedulePinToEdge() {
		if (!scroller || pinFrame) return;
		pinFrame = requestAnimationFrame(() => {
			pinFrame = null;
			if (followingEdge && distanceFromEdge() > 1) {
				scroller.scrollTop = scroller.scrollHeight;
			}
		});
	}
	function resumeFollowing() {
		followingEdge = true;
		newWriting = 0;
		tick().then(schedulePinToEdge);
	}
	function onScroll() {
		if (!scroller) return;
		const max = scroller.scrollHeight - scroller.clientHeight;
		progress = max > 0 ? scroller.scrollTop / max : 1;
		const atEdge = distanceFromEdge() <= EDGE_THRESHOLD;
		if (atEdge) {
			followingEdge = true;
			newWriting = 0;
		} else if (!edgeScrollInProgress) {
			followingEdge = false;
		}
		const probe = scroller.scrollTop + scroller.clientHeight * 0.33;
		let idx = 0;
		scroller.querySelectorAll('[data-sec]').forEach((el, i) => {
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
		followingEdge = false;
		scroller?.querySelector('#sec-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
	function scrollToEdge() {
		followingEdge = true;
		newWriting = 0;
		edgeScrollInProgress = true;
		clearTimeout(edgeScrollTimer);
		scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
		edgeScrollTimer = setTimeout(() => {
			edgeScrollInProgress = false;
		}, 700);
	}

	// New messages follow only while the reader is still at the writing edge.
	let lastCount = 0;
	$effect(() => {
		const n = messages.length;
		const previous = lastCount;
		lastCount = n;
		if (previous === 0) {
			tick().then(schedulePinToEdge);
		} else if (n > previous) {
			tick().then(() => {
				if (followingEdge) schedulePinToEdge();
				else newWriting += n - previous;
			});
		}
	});

	// Message length does not change while a response streams. Observe the rendered
	// manuscript so tokens, tool results, and late media keep the edge in view.
	$effect(() => {
		if (!pageEl || typeof ResizeObserver === 'undefined') return;
		let previousHeight = pageEl.getBoundingClientRect().height;
		const observer = new ResizeObserver(([entry]) => {
			const height = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
			const grew = height > previousHeight + 0.5;
			previousHeight = height;
			if (!grew) return;
			if (followingEdge) schedulePinToEdge();
			else if (generating) newWriting = Math.max(1, newWriting);
		});
		observer.observe(pageEl);
		return () => observer.disconnect();
	});

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
	function commitEditPrompt(sec, e) {
		const t = (e.currentTarget.textContent ?? '').trim();
		editingSec = null;
		if (t && t !== sec.prompt && sec.userId) onEditPrompt(sec.userId, t);
		else e.currentTarget.textContent = sec.prompt;
	}

	// ─── The ledger: the agent's tool runs, stamped into the record ───
	const VERB_ICONS = {
		read: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z',
		grep: 'M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
		search: 'M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z',
		web: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20a15 15 0 0 1 0-20z',
		profile: 'M22 12h-4l-3 9L9 3l-3 9H2',
		draft: 'M20.2 12.2a6 6 0 0 0-8.4-8.4L5 10.5V19h8.5l6.7-6.8zM16 8L2 22M17.5 15H9',
		condense: 'M4 8h16M7 12h10M10 16h4',
		run: 'M5 3l14 9-14 9V3z',
		knowledge:
			'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z'
	};
	const dotIcon = 'M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z';

	// Map a raw status action onto a short ledger verb + its icon
	function ledgerVerb(action = '') {
		const a = String(action).toLowerCase();
		if (a.includes('compact')) return 'condense';
		if (a.includes('web')) return 'search';
		if (a.includes('search')) return 'search';
		if (a.includes('knowledge') || a.includes('retriev')) return 'read';
		if (a.includes('execut') || a.includes('run') || a.includes('code')) return 'run';
		if (a.includes('draft') || a.includes('writ')) return 'draft';
		return a.replace(/_/g, ' ').split(' ')[0] || 'note';
	}
	function ledgerIcon(action = '') {
		return VERB_ICONS[ledgerVerb(action)] ?? dotIcon;
	}
	function ledgerObject(en) {
		return en?.query || en?.description || (en?.action ?? '').replace(/_/g, ' ');
	}
	function ledgerNote(en) {
		if (en?.error) return 'failed';
		if (en?.action === 'context_compaction') return en?.done ? 'context ready' : 'in progress';
		if (en?.urls?.length) return `${en.urls.length} source${en.urls.length === 1 ? '' : 's'}`;
		return 'done';
	}
</script>

<svelte:window onpointerdown={onDeskPointerDown} onkeydown={onDeskKeydown} />

<div class="folio" class:no-dropcap={!($settings?.dropCaps ?? true)}>
	<div class="grain" aria-hidden="true"></div>

	<div class="desk">
		<!-- spine -->
		{#if sections.length > 0}
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
				{#each sections as sec, i (sec.id)}
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
				<button
					class="node now"
					class:following={followingEdge}
					class:waiting={!followingEdge && newWriting > 0}
					onclick={scrollToEdge}
					aria-label={followingEdge
						? 'Following the writing edge'
						: newWriting > 0
							? `${newWriting} new ${newWriting === 1 ? 'passage' : 'passages'} below`
							: 'Go to the writing edge'}
				>
					<span class="node-dot"></span>
					<span class="node-tip"
						><em>¶</em>{followingEdge
							? 'following the writing edge'
							: newWriting > 0
								? `${newWriting} new ${newWriting === 1 ? 'passage' : 'passages'}`
								: 'return to the writing edge'}</span
					>
				</button>
			</nav>
		{/if}

		<div class="desk-grid">
			<div class="scroll" bind:this={scroller} onscroll={onScroll}>
				<main
					bind:this={pageEl}
					class="page"
					class:zen={sections.length === 0}
					class:wide={$settings?.wideFolio ?? false}
				>
					{#if sections.length === 0}
						<div class="zen-actions">{@render actions()}</div>

						<div class="greeting">
							<h2 class="greet-line" aria-label={greeting}>
								{#each greeting.split(' ') as w, i}
									<span class="greet-w" style:animation-delay="{0.1 + i * 0.09}s">{w}&nbsp;</span>
								{/each}
							</h2>
							<p class="greet-sub reveal" style:--d="0.5s">
								{introLine}
							</p>
						</div>

						{@render edge()}
					{:else}
						<header class="letterhead reveal" style:--d="0s">
							<div class="kicker-row">
								<span class="kicker">Folio · №{folioNo}</span>
								<span class="lh-actions">{@render actions()}</span>
							</div>

							<div class="title-row">
								<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
								<h1
									class="title"
									contenteditable="plaintext-only"
									spellcheck="false"
									oninput={pulseSave}
									onblur={commitTitle}
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											e.currentTarget.blur();
										}
									}}
								>
									{chatTitle || 'Untitled folio'}
								</h1>
								<span
									class="save-dot"
									class:saving={saveState === 'saving'}
									class:saved={saveState === 'saved'}
									aria-hidden="true"
								></span>
							</div>

							<p class="byline">{user?.name ?? 'You'} <span class="x">×</span> Claude — {today}</p>

							<div class="asterism" aria-hidden="true"><span>⁂</span></div>
						</header>

						{#each sections as sec, si (sec.id)}
							<section class="sec reveal" style:--d="{0.12 + si * 0.1}s" id="sec-{sec.id}" data-sec>
								{#if si > 0}
									<div class="asterism dim" aria-hidden="true"><span>⁂</span></div>
								{/if}

								<header class="sec-head">
									<span class="sec-no">§ {si + 1}</span>
									{#if editingSec === sec.id}
										<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
										<h2
											class="sec-title editing"
											contenteditable="plaintext-only"
											spellcheck="false"
											onblur={(e) => commitEditPrompt(sec, e)}
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
												onclick={() =>
													sec.assistants.at(-1) && onRegenerate(sec.assistants.at(-1).message)}
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
										</div>
									</div>
								</header>

								<div class="prose">
									{#if (sec.assistants.length === 0 && generating) || sec.assistants.some((a) => !a.done && a.content === '' && a.entries.length === 0)}
										<div class="typesetting">
											<span class="ts-label">setting type</span>
											<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
										</div>
									{/if}
									{#each sec.assistants as a (a.id)}
										{@const entries = a.entries}
										{#if entries.length > 0}
										<div class="ledger" role="log" aria-label="Agent actions">
											{#each entries as en}
												<div class="entry" class:failed={en.error}>
														<span class="stamp" class:done={en.done} aria-hidden="true">
															{#if en.done}
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
															aria-hidden="true"><path d={ledgerIcon(en.action)} /></svg
														>
														<span class="verb">{ledgerVerb(en.action)}</span>
														<span class="object">{ledgerObject(en)}</span>
														<span class="dotfill" aria-hidden="true"></span>
													<span class="note">{ledgerNote(en)}</span>
													</div>
												{/each}
											</div>
										{/if}
										<div class="passage markdown-prose">
											<Markdown id={`${chatId}-${a.id}`} content={a.content} done={a.done} />
										</div>
										{#if a.message.error}
											<div class="response-error" role="alert">
												<span class="response-error-mark" aria-hidden="true">!</span>
												<span>{errorText(a.message.error)}</span>
											</div>
										{/if}
									{/each}
								</div>
							</section>
						{/each}

						{@render edge()}

						<footer class="colophon">
							<span>Set in Instrument Serif &amp; Atkinson Hyperlegible</span>
							<span class="fleuron">❧</span>
							<span>№{folioNo} · open-webui, quietly</span>
						</footer>
					{/if}
				</main>
			</div>
		</div>
	</div>
</div>

{#snippet edge()}
	<div class="edge-slot">
		{#if query}
			<div class="query-host" in:swap={{ duration: 380 }} out:swap={{ duration: 200 }}>
				<QuerySlip question={query} onAnswer={onQueryAnswer} />
			</div>
		{:else}
			<div
				class="edge"
				class:busy={generating}
				in:swap={{ duration: 300 }}
				out:swap={{ duration: 170 }}
			>
				{#if files.length > 0}
					<div class="clippings" role="list" aria-label="Enclosures">
						{#each files as f, i (f.itemId ?? f.id ?? `${f.name}-${i}`)}
							<div
								class="clip"
								class:waiting={f.status === 'uploading'}
								role="listitem"
								style:--tilt="{(i % 2 === 0 ? -1 : 1) * (0.7 + (i % 3) * 0.5)}deg"
							>
								{#if f.type === 'image'}
									<img class="clip-thumb" src={f.url} alt={f.name ?? 'attached image'} />
									<span class="clip-name">{f.name ?? 'plate'}</span>
								{:else}
									<span class="clip-sort" aria-hidden="true">{clipExt(f.name)}</span>
									<span class="clip-name">{f.name}</span>
								{/if}
								{#if f.status === 'uploading'}
									<span class="clip-wait" aria-label="uploading"><i></i><i></i><i></i></span>
								{:else}
									<button
										class="clip-x"
										title="Remove the enclosure"
										aria-label="Remove {f.name ?? 'enclosure'}"
										onclick={() => removeClipping(i)}
									>
										<svg
											width="9"
											height="9"
											viewBox="0 0 12 12"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg
										>
									</button>
								{/if}
							</div>
						{/each}
					</div>
				{/if}

				<div class="edge-row">
					<span class="pilcrow" class:hop={pilcrowHop} aria-hidden="true">¶</span>
					<div class="edge-line">
						<textarea
							bind:this={composerEl}
							bind:value={composerText}
							rows="1"
							placeholder={sections.length === 0 ? 'Write the first line…' : 'Continue…'}
							disabled={generating}
							onkeydown={onComposerKey}
							oninput={autogrow}
							onpaste={onComposerPaste}
						></textarea>
						<div class="rule" aria-hidden="true"></div>
					</div>
					<button
						class="set-btn"
						class:ready={composerText.trim().length > 0}
						onclick={doSend}
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

				<div class="edge-tools" class:held-open={typecaseOpen}>
					<button
						class="tool enclose"
						onclick={() => fileInputEl?.click()}
						onmousedown={(e) => e.preventDefault()}
						title="Enclose a file with this prompt"
						aria-label="Attach files"
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
						>
							<path
								d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
							/>
						</svg>
						<span class="tool-label">enclose</span>
					</button>

					<span class="tool-sep" aria-hidden="true">·</span>

					<div class="typecase" bind:this={typecaseEl}>
						<button
							class="tool voice"
							class:unset={chosenIds.length === 0}
							class:open={typecaseOpen}
							onmousedown={(e) => {
								if (!typecaseOpen) e.preventDefault();
							}}
							onclick={toggleTypecase}
							aria-expanded={typecaseOpen}
							aria-haspopup="listbox"
							title="Choose the voice that sets the page"
						>
							<svg
								class="nib"
								width="13"
								height="13"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M12 19l7-7 3 3-7 7-3-3z" />
								<path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
								<path d="M2 2l7.586 7.586" />
								<circle cx="11" cy="11" r="2" />
							</svg>
							<span class="tool-label">set by <em>{voiceLabel}</em></span>
							<svg
								class="caret"
								width="9"
								height="9"
								viewBox="0 0 12 12"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"><path d="M2.5 7.5L6 4l3.5 3.5" /></svg
							>
						</button>

						{#if typecaseOpen}
							<div class="case-pop" role="listbox" aria-label="Models">
								<div class="case-head">
									<span class="case-kicker">The type case</span>
									<span class="case-count"
										>{typecase.length} voice{typecase.length === 1 ? '' : 's'}</span
									>
								</div>
								{#if typecase.length > 7}
									<input
										class="case-find"
										bind:this={typecaseFindEl}
										bind:value={typecaseQuery}
										placeholder="find a voice…"
										aria-label="Filter models"
									/>
								{/if}
								<div class="case-list">
									{#each shelf as m, i (m.id)}
										<button
											class="case-item"
											class:chosen={chosenIds.includes(m.id)}
											style:--i={i}
											role="option"
											aria-selected={chosenIds.includes(m.id)}
											onclick={(e) => pickVoice(m.id, e.shiftKey)}
										>
											<span class="case-sort" aria-hidden="true"
												>{(m.name ?? m.id).charAt(0).toUpperCase()}</span
											>
											<span class="case-body">
												<span class="case-name">{m.name ?? m.id}</span>
												{#if m?.info?.meta?.description}
													<span class="case-desc">{m.info.meta.description}</span>
												{/if}
											</span>
											<svg
												class="case-check"
												width="11"
												height="11"
												viewBox="0 0 10 10"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
												aria-hidden="true"><path d="M1.5 5.5 4 8l4.5-6" /></svg
											>
										</button>
									{:else}
										<p class="case-empty">No type by that name in the case.</p>
									{/each}
								</div>
								<div class="case-foot">⇧ click to write in ensemble</div>
							</div>
						{/if}
					</div>
				</div>

				<input type="file" multiple hidden bind:this={fileInputEl} onchange={onFilesPicked} />
			</div>
		{/if}
	</div>
{/snippet}

<!-- ─── Letterhead / zen ghost actions: the archive, a new folio, the lamp ─── -->
{#snippet actions()}
	<button class="ghost" onclick={toggleArchive} aria-label="The archive" title="The archive">
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
	<button class="ghost" onclick={() => onNewChat()} aria-label="New folio" title="New folio">
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

		/* Fonts: the prototype's @font-face families (defined above) mapped onto
		   the same global token names; colours/inks inherit from app.css :root/.dark
		   so the night desk flips with the app theme rather than a local class. */
		--serif: 'Instrument Serif F', Georgia, 'Times New Roman', serif;
		--sans: 'Archivo F', -apple-system, BlinkMacSystemFont, sans-serif;
		--body: 'Atkinson F', 'Archivo F', sans-serif;
		--mono: 'Fragment Mono F', ui-monospace, 'SF Mono', Menlo, monospace;

		--out: cubic-bezier(0.16, 1, 0.3, 1);
		--spring: cubic-bezier(0.34, 1.56, 0.64, 1);

		position: absolute;
		inset: 0;
		background: var(--paper-deep);
		color: var(--ink);
		font-family: var(--sans);
		overflow: hidden;
		transition: background 0.4s ease;
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
	:global(.dark) .folio .grain {
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
		font-size: 12px;
		font-weight: 650;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-2);
	}
	.arch-count {
		font-family: var(--mono);
		font-size: 12px;
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
	:global(.dark) .folio .arch-item:hover {
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
		font-size: 12px;
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
		font-size: 12px;
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
	:global(.dark) .folio .desk {
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
		/* The spine navigates sections; a quiet native thumb still communicates
		   document length and preserves grab-to-scroll. */
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--ink-3) 35%, transparent) transparent;
	}
	.scroll::-webkit-scrollbar {
		width: 4px;
	}
	.scroll::-webkit-scrollbar-track {
		background: transparent;
	}
	.scroll::-webkit-scrollbar-thumb {
		background: color-mix(in srgb, var(--ink-3) 35%, transparent);
		border-radius: 999px;
	}
	.scroll::-webkit-scrollbar-thumb:hover {
		background: color-mix(in srgb, var(--ink-3) 58%, transparent);
	}

	.page {
		max-width: 660px;
		margin: 0 auto;
		padding: 9vh 28px 0;
	}
	.page.wide {
		max-width: 880px;
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
		font-size: 12px;
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
		font-size: 12px;
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
	/* Bridge the gap between the section box and the margin rail so the cursor
	   can travel to the buttons without crossing a dead zone that drops the
	   hover. Transparent, and only live while the rail itself is interactive. */
	.sec-rail::before {
		content: '';
		position: absolute;
		top: -4px;
		bottom: -4px;
		left: -28px;
		width: 28px;
	}
	.sec-time {
		font-family: var(--mono);
		font-size: 12px;
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
	.prose {
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

	/* Live passages come from the Markdown pipeline: set them in the manuscript
	   body, and illuminate the opening letter of the document's first passage. */
	.prose .passage,
	.prose .passage :global(:is(p, li, blockquote)) {
		font-family: var(--body);
		font-size: 15.5px;
		font-weight: 430;
		line-height: 1.62;
		color: var(--ink);
	}
	.sec:first-of-type .passage :global(p:first-of-type::first-letter) {
		font-family: var(--serif);
		font-size: 3.4em;
		line-height: 0.82;
		float: left;
		padding: 4px 8px 0 0;
		color: var(--ultramarine);
	}
	/* drop caps are a setting — reset the illuminated letter when turned off */
	.folio.no-dropcap .sec:first-of-type .passage :global(p:first-of-type::first-letter) {
		font-family: inherit;
		font-size: inherit;
		line-height: inherit;
		float: none;
		padding: 0;
		color: inherit;
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

	/* ── Thinking ──
	   Reasoning renders through the shared Collapsible (stock gray chevron pill).
	   Re-skin its header in place to the /design margin-note treatment: a muted
	   monospace line prefixed with //, no chevron. Scoped to .passage so only
	   FOLIO manuscript passages are affected. */
	.passage :global(.w-fit[class*='text-gray-500']) {
		color: var(--ink-3);
		font-family: var(--mono);
		font-size: 13px;
		line-height: 1.65;
		transition: color 0.15s;
	}
	.passage :global(.w-fit[class*='text-gray-500']:hover) {
		color: var(--ink-2);
	}
	.response-error {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		margin: 14px 0 4px;
		padding: 11px 13px;
		border-left: 2px solid var(--err);
		background: color-mix(in srgb, var(--err) 7%, transparent);
		color: var(--ink-2);
		font-family: var(--body);
		font-size: 14px;
		line-height: 1.5;
	}
	.response-error-mark {
		flex: none;
		color: var(--err);
		font-family: var(--mono);
		font-weight: 700;
	}
	/* The header row: left-align and drop the // slash before the label. */
	.passage :global(.w-fit[class*='text-gray-500'] > div) {
		justify-content: flex-start;
		gap: 6px;
	}
	.passage :global(.w-fit[class*='text-gray-500'] > div)::before {
		content: '//';
		flex: none;
		font-weight: 700;
		letter-spacing: -1px;
		opacity: 0.45;
	}
	/* Hide the chevron — the // line is affordance enough. */
	.passage :global(.w-fit[class*='text-gray-500'] [class*='translate-y-']) {
		display: none;
	}
	/* Expanded thought reads as a quiet margin note, not body prose. */
	.passage :global(.space-y-1 [class*='mb-1.5'] :is(p, li, blockquote)) {
		font-family: var(--mono);
		font-size: 11.5px;
		line-height: 1.65;
		color: var(--ink-3);
	}
	/* Reasoning content can arrive as a blockquote; strip the prose quote
	   ornament, border and inset so it sits flush instead of tabbing in. */
	.passage :global(.space-y-1 [class*='mb-1.5'] blockquote) {
		margin: 0;
		padding: 0;
		border: none;
		quotes: none;
		font-style: normal;
	}
	.passage :global(.space-y-1 [class*='mb-1.5'] blockquote p::before),
	.passage :global(.space-y-1 [class*='mb-1.5'] blockquote p::after) {
		content: none;
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
		font-size: 12px;
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
	.entry.failed .stamp {
		border-color: var(--danger);
		color: var(--danger);
	}
	.entry.failed .verb,
	.entry.failed .note {
		color: var(--danger);
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
		font-size: 12px;
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
	/* composer and query occupy the same cell so the crossfade never shoves the page */
	.edge-slot {
		display: grid;
	}
	.edge-slot > .edge,
	.edge-slot > .query-host {
		grid-area: 1 / 1;
		align-self: end;
	}
	.query-host {
		margin: 44px -10px 0;
	}

	.edge {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin: 56px -18px 0;
		padding: 16px 18px 12px;
		border-radius: 16px;
		border: 1px solid transparent;
		transition:
			opacity 0.25s,
			border-color 0.3s,
			background 0.3s,
			box-shadow 0.4s var(--out);
	}
	.edge-row {
		display: flex;
		align-items: flex-end;
		gap: 14px;
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
		width: 24px;
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

	/* ── Enclosures: clippings pinned above the line ── */
	.clippings {
		display: flex;
		flex-wrap: wrap;
		gap: 9px;
		padding: 4px 0 2px 38px;
	}
	.clip {
		position: relative;
		display: flex;
		align-items: center;
		gap: 8px;
		max-width: 240px;
		padding: 6px 9px 6px 7px;
		background: var(--paper);
		border: 1px solid var(--rule);
		border-radius: 9px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
		transform: rotate(var(--tilt, 0deg));
		animation: pinIn 0.5s var(--spring);
		transition:
			transform 0.3s var(--spring),
			box-shadow 0.3s,
			border-color 0.2s;
	}
	.clip:hover {
		transform: rotate(0deg) translateY(-2px);
		box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
	}
	@keyframes pinIn {
		from {
			opacity: 0;
			transform: translateY(12px) rotate(calc(var(--tilt, 0deg) * 5)) scale(0.9);
		}
	}
	/* a strip of gold tape holds each clipping to the page */
	.clip::before {
		content: '';
		position: absolute;
		top: -5px;
		left: 50%;
		width: 26px;
		height: 9px;
		border-radius: 2px;
		background: color-mix(in srgb, var(--gold) 45%, transparent);
		transform: translateX(-50%) rotate(-2.5deg);
		pointer-events: none;
	}
	.clip.waiting {
		border-style: dashed;
	}
	.clip-sort {
		flex: none;
		font-family: var(--mono);
		font-size: 12px;
		letter-spacing: 0.08em;
		color: var(--vermilion);
		border: 1px solid color-mix(in srgb, var(--vermilion) 35%, transparent);
		background: var(--vermilion-soft);
		border-radius: 5px;
		padding: 4px 5px;
	}
	.clip-thumb {
		flex: none;
		width: 30px;
		height: 30px;
		object-fit: cover;
		border-radius: 6px;
		border: 1px solid var(--rule-faint);
	}
	.clip-name {
		min-width: 0;
		font-size: 12px;
		color: var(--ink-2);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.clip-x {
		flex: none;
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border: none;
		border-radius: 50%;
		background: transparent;
		color: var(--ink-3);
		cursor: pointer;
		opacity: 0;
		transform: scale(0.7);
		transition:
			opacity 0.18s,
			transform 0.25s var(--spring),
			color 0.15s,
			background 0.15s;
	}
	.clip:hover .clip-x,
	.clip-x:focus-visible {
		opacity: 1;
		transform: scale(1);
	}
	.clip-x:hover {
		color: var(--vermilion);
		background: var(--vermilion-soft);
	}
	.clip-wait {
		flex: none;
		display: flex;
		gap: 3px;
	}
	.clip-wait i {
		width: 3.5px;
		height: 3.5px;
		border-radius: 50%;
		background: var(--ultramarine);
		animation: bounce 1.3s infinite ease-in-out both;
		opacity: 0.3;
	}
	.clip-wait i:nth-child(2) {
		animation-delay: 0.14s;
	}
	.clip-wait i:nth-child(3) {
		animation-delay: 0.28s;
	}

	/* ── Edge tools: enclose, and the voice that sets the page ── */
	/* The tools stay tucked into the page until the line is being written:
	   they fade up on focus, and hold while the type case is open. */
	.edge-tools {
		display: flex;
		align-items: center;
		gap: 2px;
		margin-left: 30px;
		min-height: 26px;
		opacity: 0;
		transform: translateY(5px);
		pointer-events: none;
		transition:
			opacity 0.3s var(--out),
			transform 0.35s var(--out);
	}
	.edge:focus-within .edge-tools,
	.edge-tools.held-open {
		opacity: 1;
		transform: translateY(0);
		pointer-events: auto;
	}
	.tool {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		border: none;
		background: transparent;
		color: var(--ink-3);
		font-family: var(--serif);
		font-style: italic;
		font-size: 13.5px;
		padding: 3px 8px;
		border-radius: 8px;
		cursor: pointer;
		transition:
			color 0.2s,
			background 0.2s;
	}
	.tool:hover {
		color: var(--ink);
		background: var(--rule-faint);
	}
	.tool svg {
		flex: none;
		transition: transform 0.35s var(--spring);
	}
	.tool.enclose:hover svg {
		transform: rotate(-16deg) translateY(-1px);
	}
	.tool-sep {
		color: var(--ink-3);
		opacity: 0.5;
		padding: 0 2px;
		user-select: none;
	}
	.tool-label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 280px;
	}
	.voice em {
		font-style: italic;
		color: var(--ink-2);
		transition: color 0.2s;
	}
	.voice:hover em,
	.voice.open em {
		color: var(--vermilion);
	}
	/* the nib dips when you reach for it */
	.voice:hover .nib {
		transform: rotate(-14deg) translateY(1px);
	}
	.voice .caret {
		opacity: 0.55;
		transition: transform 0.3s var(--out);
	}
	.voice.open .caret {
		transform: rotate(180deg);
	}
	/* no voice chosen yet: the line quietly asks for one */
	.voice.unset em {
		color: var(--vermilion);
		animation: pulse 2.2s ease-in-out infinite;
	}

	/* ── The type case ── */
	.typecase {
		position: relative;
	}
	.case-pop {
		position: absolute;
		bottom: calc(100% + 10px);
		left: -6px;
		z-index: 30;
		width: min(304px, calc(100vw - 48px));
		background: var(--paper);
		border: 1px solid var(--rule-faint);
		border-radius: 14px;
		box-shadow:
			0 18px 60px -18px rgba(0, 0, 0, 0.35),
			0 4px 16px rgba(0, 0, 0, 0.08);
		padding: 10px 10px 8px;
		transform-origin: bottom left;
		animation: casePop 0.4s var(--spring);
	}
	@keyframes casePop {
		from {
			opacity: 0;
			transform: translateY(10px) scale(0.94) rotate(-0.6deg);
		}
	}
	.case-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 2px 8px 8px;
	}
	.case-kicker {
		font-size: 12px;
		font-weight: 650;
		font-style: normal;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--vermilion);
	}
	.case-count {
		font-family: var(--mono);
		font-size: 12px;
		font-style: normal;
		color: var(--ink-3);
	}
	.case-find {
		width: 100%;
		margin: 0 0 6px;
		padding: 7px 10px;
		border: 1px dashed var(--rule);
		border-radius: 8px;
		background: transparent;
		font-family: var(--serif);
		font-style: italic;
		font-size: 13.5px;
		color: var(--ink);
		caret-color: var(--vermilion);
		outline: none;
		transition: border-color 0.2s;
	}
	.case-find:focus {
		border-color: var(--vermilion);
	}
	.case-find::placeholder {
		color: var(--ink-3);
	}
	.case-list {
		max-height: min(264px, 38vh);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 1px;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--ink-3) 60%, transparent) transparent;
	}
	.case-item {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 7px 8px;
		border: none;
		border-radius: 9px;
		background: transparent;
		text-align: left;
		cursor: pointer;
		color: var(--ink-2);
		opacity: 0;
		transform: translateY(8px);
		animation: rise 0.4s var(--out) forwards;
		animation-delay: calc(min(var(--i), 12) * 26ms);
		transition:
			background 0.15s,
			color 0.15s;
	}
	.case-item:hover {
		background: var(--rule-faint);
		color: var(--ink);
	}
	/* each voice is a sort of metal type, waiting in its compartment */
	.case-sort {
		flex: none;
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		font-family: var(--serif);
		font-style: normal;
		font-size: 15px;
		color: var(--ink-2);
		background: var(--paper-deep);
		border: 1px solid var(--rule);
		border-radius: 6px;
		box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.07);
		transition:
			transform 0.3s var(--spring),
			background 0.2s,
			border-color 0.2s,
			color 0.2s;
	}
	.case-item:hover .case-sort {
		transform: translateY(-2px) rotate(-4deg);
	}
	.case-item.chosen .case-sort {
		background: var(--vermilion);
		border-color: var(--vermilion);
		color: #fff8ef;
	}
	.case-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.case-name {
		font-family: var(--sans);
		font-style: normal;
		font-size: 13px;
		font-weight: 560;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.case-desc {
		font-family: var(--sans);
		font-style: normal;
		font-size: 12px;
		color: var(--ink-3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.case-check {
		flex: none;
		color: var(--ok);
		opacity: 0;
		transform: scale(0.4);
		transition:
			opacity 0.2s,
			transform 0.3s var(--spring);
	}
	.case-item.chosen .case-check {
		opacity: 1;
		transform: scale(1);
	}
	.case-empty {
		font-family: var(--serif);
		font-style: italic;
		font-size: 13px;
		color: var(--ink-3);
		margin: 0;
		padding: 10px 8px;
	}
	.case-foot {
		margin-top: 6px;
		padding: 8px 8px 2px;
		border-top: 1px solid var(--rule-faint);
		font-family: var(--mono);
		font-style: normal;
		font-size: 12px;
		letter-spacing: 0.04em;
		color: var(--ink-3);
	}

	/* ── Colophon ── */
	.colophon {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 64px 0 40px;
		font-size: 12px;
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
	}
	.node.now.following .node-dot {
		background: var(--vermilion);
		border-color: var(--vermilion);
	}
	.node.now.waiting .node-dot {
		--base: 1.25;
		background: var(--vermilion);
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
		font-size: 12px;
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
		font-size: 12px;
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
		font-size: 12px;
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
		.tool-label {
			max-width: 44vw;
		}
		.case-pop {
			left: -38px;
		}
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
