<script module>
	// Only one context menu may be open across the whole app.
	let closeActive = null;

	/** Right-clicks that should keep the browser's own menu. */
	export function deferToNative(e) {
		const t = e.target;
		if (!(t instanceof Element)) return false;
		if (window.getSelection()?.toString()) return true;
		if (t.closest('a, input, textarea')) return true;
		const ce = t.closest('[contenteditable]:not([contenteditable="false"])');
		if (ce && document.activeElement === ce) return true;
		return false;
	}
</script>

<script>
	import { tick } from 'svelte';
	import { flyAndScale } from '$lib/utils/transitions';

	/*
	 * A cursor-anchored menu in the FOLIO hand — the paper twin of UserMenu's
	 * dropdown. One instance per surface; the parent decides what was clicked
	 * and renders the items. Items never close the menu themselves (so two-step
	 * arming works); handlers call close() when they mean it.
	 */

	let { width = '200px', onOpenChange = (open) => {}, children } = $props();

	let show = $state(false);
	let x = $state(0);
	let y = $state(0);
	let panelEl = $state(null);

	function portal(node) {
		document.body.appendChild(node);
		return {
			destroy() {
				node.parentNode?.removeChild(node);
			}
		};
	}

	function clamp() {
		if (!panelEl) return;
		const w = panelEl.offsetWidth;
		const h = panelEl.offsetHeight;
		if (x + w > window.innerWidth - 8) x = window.innerWidth - w - 8;
		if (y + h > window.innerHeight - 8) y = Math.max(8, y - h);
		x = Math.max(8, x);
		y = Math.max(8, y);
	}

	export async function openAt(e) {
		closeActive?.();
		closeActive = close;
		x = e.clientX;
		y = e.clientY;
		show = true;
		onOpenChange(true);
		await tick();
		clamp();
	}

	export function close() {
		if (!show) return;
		show = false;
		if (closeActive === close) closeActive = null;
		onOpenChange(false);
	}

	/** Re-clamp after content grows (an inline submenu unfolded). */
	export async function reposition() {
		await tick();
		clamp();
	}

	$effect(() => {
		if (!show) return;
		const onPointerDown = (e) => {
			if (panelEl?.contains(e.target)) return;
			close();
		};
		const onKeydown = (e) => {
			if (e.key === 'Escape') close();
		};
		const onScroll = (e) => {
			if (panelEl?.contains(e.target)) return;
			close();
		};
		const onResize = () => close();
		document.addEventListener('pointerdown', onPointerDown, { capture: true });
		document.addEventListener('keydown', onKeydown, { capture: true });
		document.addEventListener('scroll', onScroll, { capture: true });
		window.addEventListener('resize', onResize);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown, { capture: true });
			document.removeEventListener('keydown', onKeydown, { capture: true });
			document.removeEventListener('scroll', onScroll, { capture: true });
			window.removeEventListener('resize', onResize);
		};
	});
</script>

{#if show}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		use:portal
		bind:this={panelEl}
		class="ctx"
		role="menu"
		style:left="{x}px"
		style:top="{y}px"
		style:min-width={width}
		transition:flyAndScale
		oncontextmenu={(e) => e.preventDefault()}
		onpointerdown={(e) => e.stopPropagation()}
		onclick={(e) => e.stopPropagation()}
	>
		{@render children?.()}
	</div>
{/if}

<style>
	.ctx {
		position: fixed;
		z-index: 9999;
		padding: 6px;
		border-radius: 14px;
		background: var(--bg-elevated);
		border: 1px solid var(--rule-faint);
		box-shadow:
			0 16px 44px -16px var(--shadow-color),
			0 2px 10px -6px var(--shadow-color);
		color: var(--ink);
		font-family: var(--body);
		max-height: min(70vh, 480px);
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: thin;
	}

	.ctx :global(.ctx-item) {
		display: flex;
		align-items: center;
		gap: 11px;
		width: 100%;
		padding: 8px 10px;
		border: none;
		background: transparent;
		border-radius: 9px;
		color: var(--ink-2);
		font-family: var(--body);
		font-size: 13.5px;
		text-align: left;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			transform 0.2s var(--out);
	}
	.ctx :global(.ctx-item:hover) {
		background: var(--vermilion-soft);
		color: var(--ink);
		transform: translateX(2px);
	}
	.ctx :global(.ctx-item svg) {
		flex: none;
		color: var(--ink-3);
		transition: color 0.15s;
	}
	.ctx :global(.ctx-item:hover svg) {
		color: var(--vermilion);
	}
	.ctx :global(.ctx-item:disabled) {
		opacity: 0.45;
		pointer-events: none;
	}
	.ctx :global(.ctx-item.armed),
	.ctx :global(.ctx-item.armed svg) {
		color: var(--vermilion);
	}
	.ctx :global(.ctx-item.armed) {
		background: var(--vermilion-soft);
	}

	.ctx :global(.ctx-label) {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.ctx :global(.ctx-rule) {
		height: 1px;
		background: var(--rule-faint);
		margin: 5px 6px;
	}

	/* an unfolded inline submenu — hangs from its item on a thread, like filed folios */
	.ctx :global(.ctx-sub) {
		display: flex;
		flex-direction: column;
		margin: 2px 0 4px 15px;
		padding-left: 7px;
		border-left: 1px solid var(--rule-faint);
	}

	.ctx :global(.ctx-caret) {
		flex: none;
		color: var(--ink-3);
		transition: transform 0.25s var(--spring);
	}
	.ctx :global(.ctx-item.unfolded .ctx-caret) {
		transform: rotate(90deg);
	}
</style>
