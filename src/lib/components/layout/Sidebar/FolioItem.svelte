<script lang="ts">
	// FolioItem — a single archive row, ported 1:1 from the /design "arch-item":
	//   №NN · serif title · "date" meta · hover arrow, drag-to-file, current state.
	// A real chat stands in for a folio: it opens at /c/{id} and drags with the
	// { type: 'chat', id } payload the quires accept for filing.
	import { getContext } from 'svelte';
	import dayjs from 'dayjs';

	import { chatId, mobile, showSidebar, selectedFolder } from '$lib/stores';

	const i18n: any = getContext('i18n');

	export let id: string;
	export let title: string;
	export let no: number | null = null;
	export let updatedAt: number | null = null;
	export let filed = false;

	$: current = id === $chatId;

	// "today" / "yesterday" / "May 18" / "Apr 02, 2025" — the design's relative date
	const fmtDate = (ts: number | null) => {
		if (!ts) return '';
		const d = dayjs(ts < 1e12 ? ts * 1000 : ts);
		const now = dayjs();
		if (d.isSame(now, 'day')) return 'today';
		if (d.isSame(now.subtract(1, 'day'), 'day')) return 'yesterday';
		return d.isSame(now, 'year') ? d.format('MMM DD') : d.format('MMM DD, YYYY');
	};

	const pad = (n: number | null) => (n == null ? '' : String(n).padStart(2, '0'));

	const onClick = () => {
		if ($selectedFolder) selectedFolder.set(null);
		if ($mobile) showSidebar.set(false);
	};

	const onDragStart = (e: DragEvent) => {
		if (!e.dataTransfer) return;
		e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'chat', id }));
		e.dataTransfer.effectAllowed = 'move';
	};
</script>

<a
	class="arch-item"
	class:current
	class:filed
	href="/c/{id}"
	draggable="true"
	on:click={onClick}
	on:dragstart={onDragStart}
>
	{#if no != null}
		<span class="arch-no">№{pad(no)}</span>
	{/if}
	<span class="arch-body">
		<span class="arch-title">{title || $i18n.t('Untitled folio')}</span>
		<span class="arch-meta">{fmtDate(updatedAt)}</span>
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
</a>

<style>
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
		color: var(--text-secondary);
		transition:
			background 0.18s,
			color 0.18s,
			transform 0.18s var(--spring);
	}
	.arch-item:hover {
		background: var(--surface-hover);
		color: var(--text);
		transform: translateX(3px);
	}
	.arch-no {
		font-family: var(--serif);
		font-size: 15px;
		color: var(--text-tertiary);
		flex: none;
		transition: color 0.18s;
	}
	.arch-item:hover .arch-no,
	.arch-item.current .arch-no {
		color: var(--accent);
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
		color: var(--text);
	}
	.arch-meta {
		font-size: 10.5px;
		color: var(--text-tertiary);
	}
	.arch-arrow {
		flex: none;
		opacity: 0;
		transform: translateX(-4px);
		color: var(--accent);
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
	.arch-item.current {
		color: var(--text);
	}
</style>
