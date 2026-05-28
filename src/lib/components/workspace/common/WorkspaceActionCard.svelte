<script lang="ts">
	import Plus from '$lib/components/icons/Plus.svelte';
	import ArrowUpTray from '$lib/components/icons/ArrowUpTray.svelte';

	export let newLabel = 'New';
	export let newSub = 'Start from scratch';
	export let importLabel = 'Import';
	export let importSub = 'From file';

	export let onNew: () => void = () => {};
	export let onImport: () => void = () => {};

	// Hide the import half when the user lacks permission.
	export let showImport = true;
</script>

<div class="action-card">
	<button type="button" class="half new" on:click={onNew}>
		<div class="glyph"><Plus className="size-4" strokeWidth="2.5" /></div>
		<div class="lbl">{newLabel}</div>
		<div class="sub">{newSub}</div>
	</button>

	{#if showImport}
		<button type="button" class="half imp" on:click={onImport}>
			<div class="glyph"><ArrowUpTray className="size-4" strokeWidth="2" /></div>
			<div class="lbl">{importLabel}</div>
			<div class="sub">{importSub}</div>
		</button>
	{/if}
</div>

<style>
	.action-card {
		display: flex;
		flex-direction: row;
		overflow: hidden;
		border: 1px solid var(--border);
		background: var(--surface);
		border-radius: 16px;
		transition:
			box-shadow 0.2s ease,
			border-color 0.2s ease;
	}
	.action-card:hover {
		border-color: var(--border-hover);
		box-shadow: 0 4px 14px var(--shadow-color);
	}

	.half {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 18px 10px;
		cursor: pointer;
		color: var(--text);
		background: transparent;
		border: none;
		flex-basis: 0;
		transition:
			flex-grow 0.45s cubic-bezier(0.22, 1, 0.36, 1),
			background 0.22s ease,
			color 0.22s ease,
			transform 0.15s ease;
	}
	.half:active {
		transform: scale(0.97);
	}
	.half + .half {
		border-left: 1px solid var(--border);
	}

	.glyph {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 11px;
		transition:
			background 0.2s ease,
			color 0.2s ease;
	}
	.lbl {
		font-weight: 600;
		font-size: 13px;
	}
	.sub {
		font-size: 11px;
		color: var(--text-tertiary);
		transition: color 0.2s ease;
	}

	/* 60/40 weighting; New slowly expands toward ~75/25 on hover */
	.half.new {
		flex-grow: 6;
	}
	.half.imp {
		flex-grow: 4;
	}
	.half.new:hover {
		flex-grow: 9;
	}

	/* New: idle = dark glyph on surface; hover = full negative (invert) */
	.half.new .glyph {
		background: var(--text);
		color: var(--bg-elevated);
	}
	.half.new:hover {
		background: var(--text);
		color: var(--bg-elevated);
	}
	.half.new:hover .glyph {
		background: var(--bg-elevated);
		color: var(--text);
	}
	.half.new:hover .sub {
		color: rgba(255, 255, 255, 0.6);
	}

	/* Import: quieter, fills surface tint on hover */
	.half.imp .glyph {
		background: var(--surface-active);
		color: var(--text-secondary);
	}
	.half.imp:hover {
		background: var(--surface-hover);
	}
</style>
