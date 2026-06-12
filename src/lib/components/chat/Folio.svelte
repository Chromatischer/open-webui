<script>
	import { tick } from 'svelte';
	import { theme, showSidebar } from '$lib/stores';
	import Markdown from './Messages/Markdown.svelte';

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
		selectedModels = [],
		chatTitle = '',
		generating = false,
		user = null,
		onSubmit = (text) => {},
		onRegenerate = (message) => {},
		onEditPrompt = (messageId, content) => {},
		onRenameChat = (title) => {},
		onForkAt = (messageId) => {},
		onNewChat = () => {},
		composer = undefined,
		showEdge = true
	} = $props();

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

	function greetingFor(h) {
		if (h < 5) return 'Up late';
		if (h < 12) return 'Good morning';
		if (h < 18) return 'Good afternoon';
		return 'Good evening';
	}
	const greeting = `${greetingFor(new Date().getHours())}${user?.name ? ', ' + user.name : ''}.`;

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
				cur.assistants.push(m);
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
		if (e.key === 'Enter' && !e.shiftKey) {
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

	// ─── Spine: progress, active section, dock magnification ───
	let progress = $state(0);
	let activeIdx = $state(0);
	let spineEl = $state(null);
	let scroller = $state(null);
	function onScroll() {
		if (!scroller) return;
		const max = scroller.scrollHeight - scroller.clientHeight;
		progress = max > 0 ? scroller.scrollTop / max : 1;
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
		scroller?.querySelector('#sec-' + id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
	function scrollToEdge() {
		scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
	}

	// follow the writing edge as new sections/messages arrive
	let lastCount = 0;
	$effect(() => {
		const n = messages.length;
		if (n !== lastCount) {
			lastCount = n;
			tick().then(scrollToEdge);
		}
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
		run: 'M5 3l14 9-14 9V3z',
		knowledge:
			'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z'
	};
	const dotIcon = 'M12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z';

	// Map a raw status action onto a short ledger verb + its icon
	function ledgerVerb(action = '') {
		const a = String(action).toLowerCase();
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
		if (en?.urls?.length) return `${en.urls.length} source${en.urls.length === 1 ? '' : 's'}`;
		return 'done';
	}
</script>

<div class="folio">
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
				<button class="node now" onclick={scrollToEdge} aria-label="Go to the writing edge">
					<span class="node-dot"></span>
					<span class="node-tip"><em>¶</em>the edge — continue writing</span>
				</button>
			</nav>
		{/if}

		<div class="desk-grid">
			<div class="scroll" bind:this={scroller} onscroll={onScroll}>
				<main class="page" class:zen={sections.length === 0}>
					{#if sections.length === 0}
						<div class="zen-actions">{@render actions()}</div>

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

						{#if showEdge}{@render edge()}{/if}
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
												onclick={() => sec.assistants.at(-1) && onRegenerate(sec.assistants.at(-1))}
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
												onclick={() => onForkAt(sec.userId)}
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

								<div class="prose">
									{#if sec.assistants.length === 0 && generating}
										<div class="typesetting">
											<span class="ts-label">setting type</span>
											<span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
										</div>
									{/if}
									{#each sec.assistants as a (a.id)}
										{@const entries = a.statusHistory ?? (a.status ? [a.status] : [])}
										{#if entries.length > 0}
											<div class="ledger" role="log" aria-label="Agent actions">
												{#each entries as en}
													<div class="entry">
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
														<span class="note">{en.done ? ledgerNote(en) : '…'}</span>
													</div>
												{/each}
											</div>
										{/if}
										<div class="passage markdown-prose">
											<Markdown
												id={`${chatId}-${a.id}`}
												content={contentToText(a.content)}
												done={!generating}
											/>
										</div>
									{/each}
								</div>
							</section>
						{/each}

						{#if showEdge}{@render edge()}{/if}

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
	{#if composer}
		<div class="edge-host">{@render composer()}</div>
	{:else}
		<div class="edge" class:busy={generating}>
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
	{/if}
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
