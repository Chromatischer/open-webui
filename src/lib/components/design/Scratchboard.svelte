<script>
	import { onDestroy, tick } from 'svelte';
	import Markdown from '$lib/components/chat/Messages/Markdown.svelte';

	let { content = '', onChange = () => {}, collapsed = $bindable(false) } = $props();

	let draft = $state(content);
	let saving = $state(false);
	let saved = $state(true);
	let lastContent = $state(content);
	let editing = $state(false);
	let textareaEl = $state(null);
	let saveTimer;
	let finishTimer;

	function queueAutosave() {
		saving = true;
		saved = false;
		clearTimeout(saveTimer);
		clearTimeout(finishTimer);
		saveTimer = setTimeout(() => {
			lastContent = draft;
			onChange(draft);
			saving = false;
			saved = true;
			finishTimer = setTimeout(() => {
				saved = false;
			}, 1400);
		}, 480);
	}

	function updateDraft(value) {
		draft = value;
		queueAutosave();
	}

	async function startEditing() {
		editing = true;
		await tick();
		textareaEl?.focus();
	}

	$effect(() => {
		if (content !== lastContent) {
			lastContent = content;
			draft = content;
			saving = false;
			saved = true;
			clearTimeout(saveTimer);
			clearTimeout(finishTimer);
		}
	});

	const lines = $derived(draft.split('\n'));

	onDestroy(() => {
		clearTimeout(saveTimer);
		clearTimeout(finishTimer);
	});
</script>

{#if collapsed}
	<aside class="scratchboard-rail">
		<span class="rail-label">Scratchboard</span>
		<button
			class="rail-toggle"
			onclick={() => (collapsed = false)}
			aria-label="Expand Scratchboard"
			title="Scratchboard"
		>
			<svg
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"><path d="M15 18l-6-6 6-6" /></svg
			>
		</button>
	</aside>
{:else}
	<aside class="scratchboard">
		<div class="board-header">
			<div class="header-title">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path
						d="M14 2v6h6"
					/><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" /></svg
				>
				<span>Scratchboard</span>
			</div>

			<button
				class="collapse-btn"
				onclick={() => (collapsed = true)}
				aria-label="Collapse Scratchboard"
				title="Collapse"
			>
				<svg
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M9 18l6-6-6-6" /></svg
				>
			</button>
		</div>

		<div class="board-body" class:editing>
			{#if editing}
				<div class="editor">
					<div class="editor-gutter">
						{#each lines as _, i}
							<div class="line-num">{i + 1}</div>
						{/each}
					</div>
					<textarea
						bind:this={textareaEl}
						class="editor-input"
						value={draft}
						spellcheck="false"
						aria-label="Scratchboard markdown"
						oninput={(e) => updateDraft(e.currentTarget.value)}
						onblur={() => (editing = false)}
					></textarea>
				</div>
			{:else}
				<div
					class="markdown-preview"
					role="button"
					tabindex="0"
					onclick={startEditing}
					onkeydown={(e) => {
						if (e.key === 'Enter') startEditing();
					}}
					aria-label="Edit Scratchboard"
				>
					<Markdown
						id="design-scratchboard-preview"
						content={draft}
						editCodeBlock={false}
						allowEmbeds={false}
					/>
				</div>
			{/if}
		</div>

		<div class="board-footer">
			<span class="footer-meta">{lines.length} lines</span>
			<span class="footer-meta">CHAT BOARD</span>
			<span class="footer-meta saved" class:flash={saved}>● Autosaved</span>
		</div>
	</aside>
{/if}

<style>
	.scratchboard {
		width: 100%;
		height: 100%;
		background: var(--bg-elevated);
		border-left: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
	}

	.board-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 8px;
		min-width: 0;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.07em;
		color: var(--text-tertiary);
	}

	.collapse-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: var(--text-tertiary);
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.collapse-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	.scratchboard-rail {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		background: var(--surface);
		border-left: 1px solid var(--border);
		overflow: hidden;
		padding: 16px 8px 0;
	}

	.rail-label {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		font-size: 13px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.18em;
		color: var(--text-tertiary);
		user-select: none;
		white-space: nowrap;
	}

	.rail-toggle {
		display: grid;
		place-items: center;
		flex: none;
		width: 28px;
		height: 28px;
		border: none;
		border-radius: 8px;
		background: transparent;
		color: var(--text-tertiary);
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.rail-toggle:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	.board-body {
		flex: 1;
		min-height: 0;
		display: flex;
		overflow: hidden;
	}

	.editor {
		flex: 1;
		display: flex;
		min-height: 0;
		overflow: hidden;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 13px;
		line-height: 1.65;
		padding: 16px 0;
	}

	.editor-gutter {
		flex: none;
		width: 48px;
		text-align: right;
		padding: 0 12px;
		color: var(--text-tertiary);
		font-size: 12px;
		user-select: none;
		border-right: 1px solid var(--border);
		overflow: hidden;
	}

	.line-num {
		height: calc(13px * 1.65);
		color: var(--text-tertiary);
	}

	.editor-input {
		flex: 1;
		min-width: 0;
		height: 100%;
		padding: 0 16px;
		border: none;
		outline: none;
		resize: none;
		background: transparent;
		color: var(--text-secondary);
		font: inherit;
		line-height: inherit;
		white-space: pre;
		tab-size: 2;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--text-secondary) 72%, transparent) transparent;
		transition: color 0.2s ease;
	}

	.editor-input:focus {
		color: var(--text);
	}

	.editor-input::-webkit-scrollbar {
		width: 17px;
		height: 17px;
	}

	.editor-input::-webkit-scrollbar-track {
		background: transparent;
	}

	.editor-input::-webkit-scrollbar-thumb {
		background-color: color-mix(in srgb, var(--text-secondary) 72%, transparent);
		border: 2px solid transparent;
		border-radius: 999px;
		background-clip: content-box;
	}

	.editor-input::-webkit-scrollbar-thumb:hover {
		background-color: color-mix(in srgb, var(--text) 78%, transparent);
	}

	.markdown-preview {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 16px;
		background: transparent;
		color: var(--text);
		font-family: var(--font-message);
		font-size: 13.5px;
		line-height: 1.6;
		text-align: left;
		cursor: text;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--text-secondary) 72%, transparent) transparent;
	}

	.markdown-preview:hover {
		background: color-mix(in srgb, var(--surface-hover) 48%, transparent);
	}

	.markdown-preview::-webkit-scrollbar {
		width: 17px;
		height: 17px;
	}

	.markdown-preview::-webkit-scrollbar-track {
		background: transparent;
	}

	.markdown-preview::-webkit-scrollbar-thumb {
		background-color: color-mix(in srgb, var(--text-secondary) 72%, transparent);
		border: 2px solid transparent;
		border-radius: 999px;
		background-clip: content-box;
	}

	.markdown-preview::-webkit-scrollbar-thumb:hover {
		background-color: color-mix(in srgb, var(--text) 78%, transparent);
	}

	.markdown-preview :global(p) {
		margin: 0 0 0.75em;
	}

	.markdown-preview :global(h1),
	.markdown-preview :global(h2),
	.markdown-preview :global(h3) {
		margin: 0 0 0.55em;
		color: var(--text);
		font-family: var(--font-sans);
		font-weight: 760;
		letter-spacing: 0;
	}

	.markdown-preview :global(h1) {
		font-size: 20px;
	}
	.markdown-preview :global(h2) {
		font-size: 17px;
	}
	.markdown-preview :global(h3) {
		font-size: 15px;
	}

	.markdown-preview :global(ul),
	.markdown-preview :global(ol) {
		margin: 0.25em 0 0.85em 1.2em;
		padding: 0;
	}

	.markdown-preview :global(li) {
		margin: 0.16em 0;
	}

	.markdown-preview :global(table) {
		border-collapse: separate;
		border-spacing: 0;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 8px;
		background: var(--bg-elevated);
	}

	.markdown-preview :global(th),
	.markdown-preview :global(td) {
		border-color: var(--border) !important;
	}

	.markdown-preview :global(code) {
		border-radius: 5px;
		background: var(--code-bg);
		padding: 0.1em 0.34em;
		color: var(--orange);
		font-family: 'JetBrains Mono', ui-monospace, monospace;
		font-size: 0.9em;
	}

	.markdown-preview :global(.katex) {
		color: var(--text);
	}

	.board-footer {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 6px 16px;
		border-top: 1px solid var(--border);
		background: var(--surface);
	}

	.footer-meta {
		font-size: 10px;
		color: var(--text-tertiary);
		font-weight: 500;
		font-family: 'JetBrains Mono', ui-monospace, monospace;
	}

	.footer-meta.saved {
		margin-left: auto;
		color: var(--text-tertiary);
		transition: color 0.3s;
	}

	.footer-meta.saved.flash {
		color: var(--success);
	}
</style>
