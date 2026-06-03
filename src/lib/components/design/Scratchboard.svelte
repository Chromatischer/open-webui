<script>
	import { onDestroy, tick } from 'svelte';
	import Markdown from '$lib/components/chat/Messages/Markdown.svelte';

	let {
		content = '',
		onChange = () => {},
		collapsed = $bindable(false),
		mobile = false
	} = $props();

	let draft = $state(content);
	let saving = $state(false);
	let saved = $state(true);
	let lastContent = $state(content);
	let editing = $state(false);
	let textareaEl = $state(null);
	let gutterEl = $state(null);
	let previewEl = $state(null);
	let saveTimer;
	let finishTimer;
	// Scroll ratio (0..1) carried between edit/preview so neither view jumps to the top.
	let scrollRatio = 0;

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

	// Map a click point inside the rendered preview back to an index in the raw draft.
	function caretIndexFromPoint(x, y) {
		let node = null;
		let offset = 0;
		if (document.caretPositionFromPoint) {
			const pos = document.caretPositionFromPoint(x, y);
			if (!pos) return null;
			node = pos.offsetNode;
			offset = pos.offset;
		} else if (document.caretRangeFromPoint) {
			const range = document.caretRangeFromPoint(x, y);
			if (!range) return null;
			node = range.startContainer;
			offset = range.startOffset;
		}
		if (!node || node.nodeType !== Node.TEXT_NODE) return null;
		const text = node.textContent ?? '';
		const idx = draft.indexOf(text);
		if (idx !== -1) return idx + Math.min(offset, text.length);
		const prefix = text.slice(0, offset);
		const pIdx = draft.indexOf(prefix);
		return pIdx === -1 ? null : pIdx + prefix.length;
	}

	async function startEditing(event) {
		const caretIndex = event ? caretIndexFromPoint(event.clientX, event.clientY) : null;
		if (previewEl && previewEl.scrollHeight > previewEl.clientHeight) {
			scrollRatio = previewEl.scrollTop / (previewEl.scrollHeight - previewEl.clientHeight);
		}
		editing = true;
		await tick();
		if (!textareaEl) return;
		if (caretIndex != null) {
			textareaEl.focus();
			textareaEl.setSelectionRange(caretIndex, caretIndex);
			// Center the caret line in view.
			const before = draft.slice(0, caretIndex).split('\n').length - 1;
			const lineHeight = textareaEl.scrollHeight / Math.max(lines.length, 1);
			textareaEl.scrollTop = Math.max(0, before * lineHeight - textareaEl.clientHeight / 2);
		} else {
			textareaEl.scrollTop = scrollRatio * (textareaEl.scrollHeight - textareaEl.clientHeight);
			textareaEl.focus();
		}
		if (gutterEl) gutterEl.scrollTop = textareaEl.scrollTop;
	}

	async function stopEditing() {
		if (textareaEl && textareaEl.scrollHeight > textareaEl.clientHeight) {
			scrollRatio = textareaEl.scrollTop / (textareaEl.scrollHeight - textareaEl.clientHeight);
		}
		editing = false;
		await tick();
		if (previewEl) {
			previewEl.scrollTop = scrollRatio * (previewEl.scrollHeight - previewEl.clientHeight);
		}
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
	<aside class="scratchboard" class:mobile>
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

			{#if mobile}
				<!-- Footer chrome is dropped on mobile, so the save state lives here. -->
				<span class="save-dot" class:flash={saved} aria-hidden="true"></span>
				<button
					class="close-btn"
					onclick={() => (collapsed = true)}
					aria-label="Close Scratchboard"
					title="Close"
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
					>
				</button>
			{:else}
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
			{/if}
		</div>

		<div class="board-body" class:editing>
			{#if editing}
				<div class="editor">
					{#if !mobile}
						<div class="editor-gutter" bind:this={gutterEl}>
							{#each lines as _, i}
								<div class="line-num">{i + 1}</div>
							{/each}
						</div>
					{/if}
					<textarea
						bind:this={textareaEl}
						class="editor-input"
						value={draft}
						spellcheck="false"
						aria-label="Scratchboard markdown"
						oninput={(e) => updateDraft(e.currentTarget.value)}
						onscroll={(e) => {
							if (gutterEl) gutterEl.scrollTop = e.currentTarget.scrollTop;
						}}
						onblur={stopEditing}
					></textarea>
				</div>
			{:else}
				<div
					class="markdown-preview"
					bind:this={previewEl}
					role="button"
					tabindex="0"
					onclick={(e) => startEditing(e)}
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

		{#if !mobile}
			<div class="board-footer">
				<span class="footer-meta">{lines.length} lines</span>
				<span class="footer-meta">CHAT BOARD</span>
				<span class="footer-meta saved" class:flash={saved}>● Autosaved</span>
			</div>
		{/if}
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

	.close-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		flex: none;
		width: 40px;
		height: 40px;
		border: none;
		border-radius: 11px;
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.close-btn:active {
		background: var(--surface-hover);
		color: var(--text);
	}

	.save-dot {
		flex: none;
		width: 7px;
		height: 7px;
		border-radius: 999px;
		background: var(--text-tertiary);
		opacity: 0.35;
		transition:
			background 0.3s ease,
			opacity 0.3s ease;
	}

	.save-dot.flash {
		background: var(--success);
		opacity: 1;
	}

	/* ── Mobile drawer adaptations (footer chrome is dropped on mobile) ── */
	/* No seam border on mobile: the chat's rounded corner sits directly on the board
	   surface, so a 1px edge line would cut across the corner.
	   --peek is the width of the chat sliver that stays visible. Content surfaces
	   span the full width and inset their content by --peek, so their backgrounds
	   (incl. the preview's tap highlight) bleed under the sliver and fill the chat's
	   rounded corner — the corner just inherits the same surface, no extra rounding. */
	.scratchboard.mobile {
		border-left: none;
		--peek: calc(100vw - var(--sidebar-w));
	}

	.scratchboard.mobile .board-header {
		gap: 10px;
		padding: 10px 8px 10px calc(var(--peek) + 16px);
		background: transparent;
		border-bottom: none;
	}

	.scratchboard.mobile .header-title {
		font-size: 13px;
		gap: 9px;
	}

	.scratchboard.mobile .header-title span {
		letter-spacing: 0.04em;
	}

	.scratchboard.mobile .save-dot {
		margin-left: auto;
	}

	/* 16px avoids iOS focus auto-zoom; lines wrap so there's no horizontal scroll. */
	.scratchboard.mobile .editor {
		font-size: 16px;
		padding: 14px 0;
	}

	.scratchboard.mobile .editor-input {
		padding: 0 16px 0 calc(var(--peek) + 16px);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.scratchboard.mobile .markdown-preview {
		font-size: 15px;
		padding: 16px 16px 24px calc(var(--peek) + 16px);
		-webkit-overflow-scrolling: touch;
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
