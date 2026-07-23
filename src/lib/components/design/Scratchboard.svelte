<script>
	import { onDestroy, tick } from 'svelte';
	import { scratchboardAgentWriting } from '$lib/stores';
	import Markdown from '$lib/components/chat/Messages/Markdown.svelte';

	/*
	 * THE MARGIN — the shared scratchboard, set to match the /design prototype:
	 * a manuscript margin (quill head · rendered notes · fold rail), not a code
	 * editor. Click to edit; autosaves; the agent streams notes in live.
	 */

	let {
		content = '',
		onChange = () => {},
		collapsed = $bindable(false),
		mobile = false
	} = $props();

	let draft = $state(content);
	let lastContent = $state(content);
	let editing = $state(false);
	let saveState = $state('idle'); // idle | saving | saved
	let textareaEl = $state(null);
	let saveTimer;
	let finishTimer;

	function queueAutosave() {
		saveState = 'saving';
		clearTimeout(saveTimer);
		clearTimeout(finishTimer);
		saveTimer = setTimeout(() => {
			lastContent = draft;
			onChange(draft);
			saveState = 'saved';
			finishTimer = setTimeout(() => (saveState = 'idle'), 1400);
		}, 480);
	}

	function autogrow(el) {
		if (!el) return;
		el.style.height = 'auto';
		el.style.height = el.scrollHeight + 'px';
	}

	async function startEditing() {
		if ($scratchboardAgentWriting) return;
		editing = true;
		await tick();
		if (textareaEl) {
			autogrow(textareaEl);
			textareaEl.focus();
		}
	}
	function stopEditing() {
		editing = false;
	}

	// External updates (chat switch, agent streaming) flow back into the draft.
	$effect(() => {
		if (content !== lastContent) {
			lastContent = content;
			draft = content;
			saveState = 'idle';
			clearTimeout(saveTimer);
			clearTimeout(finishTimer);
		}
	});

	onDestroy(() => {
		clearTimeout(saveTimer);
		clearTimeout(finishTimer);
	});
</script>

<aside
	class="margin"
	class:closed={collapsed && !mobile}
	class:mobile
	class:agent={$scratchboardAgentWriting}
>
	{#if !collapsed || mobile}
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
				<path d="M20.2 12.2a6 6 0 0 0-8.4-8.4L5 10.5V19h8.5l6.7-6.8zM16 8L2 22M17.5 15H9" />
			</svg>
			<span class="margin-kicker">Scratchboard</span>
			{#if $scratchboardAgentWriting}
				<span class="agent-writing">
					<i></i>
					claude is writing
				</span>
			{:else}
				<span
					class="save-dot"
					class:saving={saveState === 'saving'}
					class:saved={saveState === 'saved'}
					aria-hidden="true"
				></span>
			{/if}
			<button
				class="ghost fold"
				onclick={() => (collapsed = true)}
				aria-label="Fold the scratchboard away"
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

		{#if editing}
			<textarea
				class="margin-edit"
				bind:this={textareaEl}
				bind:value={draft}
				oninput={(e) => {
					queueAutosave();
					autogrow(e.currentTarget);
				}}
				onblur={stopEditing}
				spellcheck="false"
			></textarea>
		{:else}
			<div
				class="margin-body margin-prose"
				onclick={startEditing}
				onkeydown={(e) => e.key === 'Enter' && startEditing()}
				role="button"
				tabindex="0"
				aria-label="Edit the scratchboard"
			>
				{#if draft.trim()}
					<Markdown
						id="margin-md"
						content={draft}
						done={!$scratchboardAgentWriting}
						allowEmbeds={false}
					/>
				{:else}
					<div class="margin-empty">Tap to write a note…</div>
				{/if}
				{#if $scratchboardAgentWriting}<span class="m-caret" aria-hidden="true"></span>{/if}
			</div>
		{/if}
	{:else}
		<button
			class="margin-spineb"
			onclick={() => (collapsed = false)}
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
			{#if $scratchboardAgentWriting}<i class="vdot"></i>{/if}
		</button>
	{/if}
</aside>

<style>
	.margin {
		width: 100%;
		height: 100%;
		border-left: 1px solid var(--rule-faint);
		display: flex;
		flex-direction: column;
		min-height: 0;
		background: color-mix(in srgb, var(--paper-deep) 36%, transparent);
		box-sizing: border-box;
		position: relative;
	}
	.margin.closed {
		width: 42px;
	}
	/* THE PEEK — on mobile the board is revealed by sliding the chat shell left by
	   --sidebar-w, leaving a chat sliver over the board's left edge. Inset the
	   content (background stays full-bleed) so the head + notes clear that sliver. */
	.margin.mobile {
		padding-left: calc(100vw - var(--sidebar-w, 85vw));
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
	.margin-empty {
		font-family: var(--serif);
		font-style: italic;
		font-size: 13px;
		color: var(--ink-3);
		padding: 4px 0;
	}

	/* ───────────────────────────────────────────────────────────────────────
	   The margin renders full markdown through the shared <Markdown> pipeline.
	   Those elements are emitted by a child component, so they're themed here
	   with :global() — scoped under .margin-prose to keep the manuscript look
	   contained to the margin (no bleed into the chat column).
	   ─────────────────────────────────────────────────────────────────────── */
	.margin-prose {
		font-family: var(--body);
		font-size: 13px;
		line-height: 1.62;
		color: var(--ink-2);
		word-break: break-word;
		overflow-wrap: anywhere;
	}

	/* Headings — serif, set like manuscript titles */
	:global(.margin-prose h1),
	:global(.margin-prose h2),
	:global(.margin-prose h3),
	:global(.margin-prose h4),
	:global(.margin-prose h5),
	:global(.margin-prose h6) {
		font-family: var(--serif);
		font-weight: 600;
		color: var(--ink);
		line-height: 1.25;
		letter-spacing: -0.01em;
	}
	:global(.margin-prose h1) {
		font-size: 20px;
		margin: 14px 0 8px;
		padding-bottom: 6px;
		border-bottom: 1px solid var(--rule-faint);
	}
	:global(.margin-prose h2) {
		font-size: 16px;
		margin: 16px 0 6px;
	}
	:global(.margin-prose h3) {
		font-size: 14px;
		margin: 14px 0 4px;
	}
	:global(.margin-prose h4),
	:global(.margin-prose h5),
	:global(.margin-prose h6) {
		font-size: 12.5px;
		margin: 12px 0 4px;
		color: var(--ink-2);
	}
	/* First block shouldn't push the title down */
	:global(.margin-prose > :first-child) {
		margin-top: 0;
	}

	/* Body copy */
	:global(.margin-prose p) {
		margin: 0 0 9px;
	}
	:global(.margin-prose strong) {
		font-weight: 700;
		color: var(--ultramarine);
	}
	:global(.margin-prose em) {
		font-style: italic;
		color: var(--vermilion);
	}
	:global(.margin-prose del) {
		color: var(--ink-3);
	}
	:global(.margin-prose a) {
		color: var(--ultramarine);
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 2px;
		text-decoration-color: color-mix(in srgb, var(--ultramarine) 35%, transparent);
		transition: text-decoration-color 0.15s;
	}
	:global(.margin-prose a:hover) {
		text-decoration-color: var(--ultramarine);
	}

	/* Lists — vermilion manuscript markers */
	:global(.margin-prose ul),
	:global(.margin-prose ol) {
		margin: 0 0 9px;
		padding-left: 18px;
	}
	:global(.margin-prose li) {
		margin: 2px 0;
		padding-left: 3px;
	}
	:global(.margin-prose ul) {
		list-style: none;
		padding-left: 16px;
	}
	:global(.margin-prose ul > li) {
		position: relative;
	}
	:global(.margin-prose ul > li::before) {
		content: '–';
		position: absolute;
		left: -14px;
		color: var(--vermilion);
		font-weight: 600;
	}
	:global(.margin-prose ol) {
		list-style: decimal;
	}
	:global(.margin-prose ol > li::marker) {
		color: var(--vermilion);
		font-family: var(--mono);
		font-size: 11px;
	}
	:global(.margin-prose li > ul),
	:global(.margin-prose li > ol) {
		margin: 2px 0 2px;
	}

	/* Inline code — a tinted chip */
	:global(.margin-prose code) {
		font-family: var(--mono);
		font-size: 11px;
		color: var(--vermilion);
		background: color-mix(in srgb, var(--paper-deep) 55%, transparent);
		border: 1px solid var(--rule-faint);
		padding: 0.5px 4px;
		border-radius: 4px;
	}
	/* Fenced code blocks render through <CodeBlock>; compact it for the margin */
	:global(.margin-prose pre) {
		overflow-x: auto;
		white-space: pre;
	}
	:global(.margin-prose .codeblock-wrapper) {
		font-size: 11px;
	}
	:global(.margin-prose .codeblock-wrapper code),
	:global(.margin-prose pre code) {
		color: inherit;
		background: transparent;
		border: none;
		padding: 0;
	}

	/* Blockquote */
	:global(.margin-prose blockquote) {
		margin: 0 0 9px;
		padding: 2px 0 2px 12px;
		border-left: 2px solid color-mix(in srgb, var(--ultramarine) 55%, transparent);
		background: color-mix(in srgb, var(--ultramarine) 5%, transparent);
		border-radius: 0 6px 6px 0;
		font-family: var(--serif);
		font-style: italic;
		color: var(--ink-2);
	}
	:global(.margin-prose blockquote p) {
		margin: 4px 6px;
	}

	/* Images — framed manuscript plates */
	:global(.margin-prose img) {
		max-width: 100%;
		height: auto;
		margin: 6px 0;
		border-radius: 8px;
		border: 1px solid var(--rule);
		box-shadow: 0 2px 10px -6px rgba(0, 0, 0, 0.4);
	}

	/* Rules */
	:global(.margin-prose hr) {
		margin: 14px 0;
		border: none;
		border-top: 1px solid var(--rule-faint);
	}

	/* Tables — clean hairlines */
	:global(.margin-prose table) {
		width: 100%;
		margin: 4px 0 10px;
		border-collapse: collapse;
		font-size: 12px;
	}
	:global(.margin-prose th),
	:global(.margin-prose td) {
		border: 1px solid var(--rule-faint);
		padding: 4px 7px;
		text-align: left;
		vertical-align: top;
	}
	:global(.margin-prose th) {
		font-family: var(--serif);
		font-weight: 600;
		color: var(--ink);
		background: color-mix(in srgb, var(--paper-deep) 40%, transparent);
	}

	/* Math */
	:global(.margin-prose .katex) {
		font-size: 1.02em;
	}
	:global(.margin-prose .katex-display) {
		margin: 8px 0;
		overflow-x: auto;
		overflow-y: hidden;
	}

	/* ── Themed callouts — :::note / :::tip / :::warn / :::pin ──
	   The rubric: no card, no fill, no border. The type label becomes a
	   colour-ink run-in heading (small-caps, marginal glyph) that the body
	   text flows around — the way a scribe glosses a manuscript. Each type
	   sets its own ink (--cf) and glyph (--cf-glyph). */
	:global(.margin-prose .colon-fence) {
		--cf: var(--ink-3);
		--cf-glyph: '✦';
		margin: 11px 0;
		padding: 0;
		border: none;
		border-radius: 0;
		background: none;
		box-shadow: none;
	}
	/* Unwrap the header so the label can run into the prose; drop the copy button */
	:global(.margin-prose .colon-fence > div:first-child) {
		display: contents;
	}
	:global(.margin-prose .colon-fence > div:first-child > div) {
		display: none;
	}
	/* The run-in rubric — floats so the first lines of body wrap beside it */
	:global(.margin-prose .colon-fence-label) {
		float: left;
		margin: 0 9px 0 0;
		font-family: var(--mono);
		font-weight: 700;
		font-size: 10px;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		line-height: 1.62;
		white-space: nowrap;
		color: var(--cf);
	}
	:global(.margin-prose .colon-fence-label::before) {
		content: var(--cf-glyph);
		margin-right: 5px;
		font-size: 12px;
	}
	:global(.margin-prose .colon-fence .prose-sm > :first-child) {
		margin-top: 0;
	}

	/* Per-type inks + marginalia glyphs */
	:global(.margin-prose .colon-fence-note) {
		--cf: var(--ultramarine);
		--cf-glyph: '❡';
	}
	:global(.margin-prose .colon-fence-tip) {
		--cf: var(--ok);
		--cf-glyph: '☞';
	}
	:global(.margin-prose .colon-fence-warn) {
		--cf: var(--vermilion);
		--cf-glyph: '※';
	}
	:global(.margin-prose .colon-fence-pin) {
		--cf: color-mix(in srgb, var(--gold) 58%, var(--ink));
		--cf-glyph: '✦';
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
</style>
