<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let title = '';
	export let description = '';
	export let state = false;
	export let disabled = false;

	const toggle = () => {
		if (disabled) return;
		state = !state;
		dispatch('change', state);
	};
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	class="ix-card {state ? 'on' : ''}"
	role="button"
	tabindex={disabled ? -1 : 0}
	aria-pressed={state}
	aria-disabled={disabled}
	on:click={toggle}
	on:keydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggle();
		}
	}}
>
	<span class="ix-card-text">
		<span class="ix-card-title">{title}</span>
		{#if description}
			<span class="ix-card-desc">{description}</span>
		{/if}
	</span>
	<slot />
</div>

<style>
	.ix-card {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		width: 100%;
		text-align: left;
		padding: 11px 13px;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--surface);
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			transform 0.1s ease;
	}
	.ix-card:hover {
		border-color: var(--border-hover);
	}
	.ix-card:active {
		transform: scale(0.99);
	}
	.ix-card.on {
		border-color: var(--accent);
		background: var(--accent-glow);
	}
	.ix-card {
		cursor: pointer;
	}
	.ix-card[aria-disabled='true'] {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.ix-card-text {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
	}
	.ix-card-title {
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
	}
	.ix-card.on .ix-card-title {
		color: var(--accent);
	}
	.ix-card-desc {
		font-size: 11.5px;
		color: var(--text-secondary);
		margin-top: 2px;
	}
</style>
