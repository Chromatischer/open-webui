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
		<div class="glyph"><Plus className="size-4" strokeWidth="2" /></div>
		<div class="lbl">{newLabel}</div>
		<div class="sub">{newSub}</div>
	</button>

	{#if showImport}
		<button type="button" class="half imp" on:click={onImport}>
			<div class="glyph"><ArrowUpTray className="size-4" strokeWidth="1.8" /></div>
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
		border: 1px dashed var(--rule);
		background: transparent;
		border-radius: 14px;
		transition: border-color 0.25s ease;
	}
	.action-card:hover {
		border-color: color-mix(in srgb, var(--vermilion) 45%, var(--rule));
	}

	.half {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 5px;
		padding: 18px 10px;
		cursor: pointer;
		color: var(--ink-2);
		background: transparent;
		border: none;
		flex-basis: 0;
		transition:
			flex-grow 0.45s cubic-bezier(0.22, 1, 0.36, 1),
			background 0.25s ease,
			color 0.25s ease,
			transform 0.15s ease;
	}
	.half:active {
		transform: scale(0.97);
	}
	.half + .half {
		border-left: 1px dashed var(--rule);
	}

	.glyph {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		color: var(--ink-3);
		transition:
			color 0.2s ease,
			transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.lbl {
		font-family: var(--serif);
		font-style: italic;
		font-size: 15.5px;
		font-weight: 400;
		line-height: 1.2;
	}
	.sub {
		font-family: var(--mono);
		font-size: 10px;
		color: var(--ink-3);
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

	/* New: the press invites — vermilion ink wash, the cross turns */
	.half.new:hover {
		background: var(--vermilion-soft);
		color: var(--vermilion);
	}
	.half.new:hover .glyph {
		color: var(--vermilion);
		transform: rotate(90deg);
	}

	/* Import: quieter, an ink-wash on hover */
	.half.imp:hover {
		background: var(--rule-faint);
		color: var(--ink);
	}
</style>
