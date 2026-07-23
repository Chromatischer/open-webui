<script>
	import { tick } from 'svelte';
	import { flyAndScale } from '$lib/utils/transitions';

	/*
	 * A note line beneath the selection: the quoted text as a faint reminder,
	 * a line to write on, and the two keystrokes that matter. Enter stashes
	 * the note as a slip, Cmd/Ctrl+Enter sends it right away, Escape dismisses.
	 *
	 * The input is NOT focused on open: the document selection must stay live
	 * so Ctrl/Cmd+C and the native context menu keep copying it. The first
	 * plain keystroke moves focus into the note instead.
	 */

	let {
		x = 0,
		y = 0,
		quote = '',
		onAdd = (note) => {},
		onSend = (note) => {},
		onClose = () => {}
	} = $props();

	let note = $state('');
	let panelEl = $state(null);
	let inputEl = $state(null);
	let left = $state(x);
	let top = $state(y);

	function portal(node) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.parentNode?.removeChild(node);
			}
		};
	}

	$effect(() => {
		left = x;
		top = y;
		tick().then(() => {
			if (!panelEl) return;
			const w = panelEl.offsetWidth;
			const h = panelEl.offsetHeight;
			if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
			// Would spill off the bottom: flip above the selection instead.
			if (top + h > window.innerHeight - 8) top = y - h - 14;
			top = Math.max(8, top);
			left = Math.max(8, left);
		});
	});

	$effect(() => {
		const onPointerDown = (e) => {
			if (panelEl?.contains(e.target)) return;
			onClose();
		};
		const onScroll = (e) => {
			if (panelEl?.contains(e.target)) return;
			// The anchor drifts on scroll — dismiss, but never mid-note.
			if (!note.trim()) onClose();
		};
		const onResize = () => onClose();
		const onDocKeydown = (e) => {
			if (e.key === 'Escape') {
				e.stopPropagation();
				onClose();
				return;
			}
			if (document.activeElement === inputEl) return;
			// Modified keys (Ctrl/Cmd+C, +A, …) act on the live selection untouched.
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			// First plain character starts the note; focus before the browser
			// inserts it, so the keystroke lands in the input.
			if (e.key.length === 1) inputEl?.focus();
		};
		document.addEventListener('pointerdown', onPointerDown, { capture: true });
		document.addEventListener('scroll', onScroll, { capture: true });
		document.addEventListener('keydown', onDocKeydown, { capture: true });
		window.addEventListener('resize', onResize);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown, { capture: true });
			document.removeEventListener('scroll', onScroll, { capture: true });
			document.removeEventListener('keydown', onDocKeydown, { capture: true });
			window.removeEventListener('resize', onResize);
		};
	});

	function onKeydown(e) {
		if (e.key === 'Escape') {
			e.stopPropagation();
			onClose();
			return;
		}
		if (e.key !== 'Enter') return;
		e.preventDefault();
		const text = note.trim();
		if (!text) return;
		if (e.metaKey || e.ctrlKey) onSend(text);
		else onAdd(text);
	}
</script>

<div
	use:portal
	bind:this={panelEl}
	class="anno-pop"
	role="dialog"
	aria-label="Annotate selection"
	style:left="{left}px"
	style:top="{top}px"
	transition:flyAndScale={{ y: 4, duration: 200 }}
	onpointerdown={(e) => e.stopPropagation()}
>
	<span class="anno-cite">“{quote}”</span>
	<div class="anno-row">
		<input
			bind:this={inputEl}
			bind:value={note}
			type="text"
			placeholder="Annotate…"
			aria-label="Annotation note"
			onkeydown={onKeydown}
		/>
		<span class="anno-hint" aria-hidden="true">⏎ add · ⌘⏎ send</span>
	</div>
</div>

<style>
	.anno-pop {
		position: fixed;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: min(300px, calc(100vw - 24px));
		padding: 8px 11px;
		border-radius: 10px;
		background: var(--bg-elevated);
		border: 1px solid var(--rule-faint);
		box-shadow:
			0 14px 36px -16px var(--shadow-color),
			0 2px 10px -6px var(--shadow-color);
	}

	.anno-cite {
		font-family: var(--serif);
		font-style: italic;
		font-size: 15px;
		color: var(--ink-3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.anno-row {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}
	.anno-row input {
		flex: 1;
		min-width: 0;
		border: none;
		background: transparent;
		outline: none;
		padding: 0;
		font-family: var(--body);
		font-size: 15px;
		color: var(--ink);
		caret-color: var(--vermilion);
	}
	.anno-row input::placeholder {
		color: var(--ink-3);
	}

	.anno-hint {
		flex: none;
		font-family: var(--mono, monospace);
		font-size: 15px;
		letter-spacing: 0.04em;
		color: var(--ink-3);
		opacity: 0;
		transition: opacity 0.2s;
	}
	.anno-row:focus-within .anno-hint {
		opacity: 1;
	}
</style>
