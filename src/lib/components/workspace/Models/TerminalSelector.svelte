<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { getTerminalServers, type TerminalServer } from '$lib/apis/terminal';

	const i18n = getContext('i18n');

	export let terminalId: string = '';

	let terminals: TerminalServer[] = [];

	onMount(async () => {
		terminals = await getTerminalServers(localStorage.token);
	});
</script>

{#if terminals.length > 0}
	<div class="ts-kicker">{$i18n.t('Terminal')}</div>

	<select class="ts-select" class:unset={!terminalId} bind:value={terminalId}>
		<option value="">{$i18n.t('None')}</option>
		{#each terminals as terminal (terminal.id)}
			<option value={terminal.id}>{terminal.name || terminal.id}</option>
		{/each}
	</select>
{/if}

<style>
	.ts-kicker {
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--text-secondary);
		margin-bottom: 7px;
	}
	.ts-select {
		appearance: none;
		-webkit-appearance: none;
		max-width: 100%;
		font-family: var(--serif, serif);
		font-style: italic;
		font-size: 15px;
		color: var(--text);
		background: transparent;
		border: none;
		border-bottom: 1px dashed var(--border-hover, rgba(0, 0, 0, 0.14));
		outline: none;
		cursor: pointer;
		padding: 0 2px 2px;
		transition:
			color 0.2s,
			border-color 0.2s;
	}
	.ts-select.unset {
		color: var(--text-tertiary);
	}
	.ts-select:hover {
		border-bottom-color: var(--text-tertiary);
	}
</style>
