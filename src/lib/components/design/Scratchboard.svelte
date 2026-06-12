<script>
	import { onDestroy, tick } from 'svelte';
	import { scratchboardAgentWriting } from '$lib/stores';

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

	// A tiny markdown-ish renderer for the rendered margin (mirrors the prototype).
	function scratchLines(s) {
		return String(s ?? '')
			.split('\n')
			.map((line) => {
				if (line.startsWith('# ')) return { t: 'h', text: line.slice(2) };
				if (line.startsWith('## ')) return { t: 'h2', text: line.slice(3) };
				if (line.startsWith('- ')) return { t: 'li', text: line.slice(2) };
				if (line.startsWith('— ')) return { t: 'sig', text: line };
				if (line.trim() === '') return { t: 'gap', text: '' };
				return { t: 'p', text: line };
			});
	}

	onDestroy(() => {
		clearTimeout(saveTimer);
		clearTimeout(finishTimer);
	});
</script>

<aside class="margin" class:closed={collapsed && !mobile} class:agent={$scratchboardAgentWriting}>
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
			<span class="margin-kicker">Margin notes</span>
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
				class="margin-body"
				onclick={startEditing}
				onkeydown={(e) => e.key === 'Enter' && startEditing()}
				role="button"
				tabindex="0"
				aria-label="Edit margin notes"
			>
				{#each scratchLines(draft) as line}
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
				{#if $scratchboardAgentWriting}<span class="m-caret" aria-hidden="true"></span>{/if}
			</div>
		{/if}
	{:else}
		<button
			class="margin-spineb"
			onclick={() => (collapsed = false)}
			aria-label="Unfold the margin"
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
			<span class="margin-vlabel">Margin notes</span>
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
