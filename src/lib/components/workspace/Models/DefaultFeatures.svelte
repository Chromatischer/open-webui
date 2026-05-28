<script lang="ts">
	import { getContext } from 'svelte';

	const i18n = getContext('i18n');

	const featureLabels = {
		web_search: {
			label: $i18n.t('Web Search'),
			description: $i18n.t('On by default for new chats')
		},
		image_generation: {
			label: $i18n.t('Image Generation'),
			description: $i18n.t('On by default for new chats')
		},
		code_interpreter: {
			label: $i18n.t('Code Interpreter'),
			description: $i18n.t('On by default for new chats')
		}
	};

	export let availableFeatures = ['web_search', 'image_generation', 'code_interpreter'];
	export let featureIds = [];

	const toggle = (feature: string, on: boolean) => {
		if (on) {
			featureIds = [...featureIds, feature];
		} else {
			featureIds = featureIds.filter((id) => id !== feature);
		}
	};
</script>

<div>
	<div class="text-xs font-medium text-gray-500 mb-2">{$i18n.t('Default Features')}</div>
	<div class="feat-grid">
		{#each availableFeatures as feature}
			{@const on = featureIds.includes(feature)}
			<button
				type="button"
				class="feat-card {on ? 'on' : ''}"
				on:click={() => toggle(feature, !on)}
			>
				<span class="feat-label">{$i18n.t(featureLabels[feature].label)}</span>
				<span class="feat-desc">{featureLabels[feature].description}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.feat-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 8px;
	}
	.feat-card {
		display: flex;
		flex-direction: column;
		text-align: left;
		padding: 10px 12px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-base);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			transform 0.1s ease;
	}
	.feat-card:hover {
		border-color: var(--border-hover);
	}
	.feat-card:active {
		transform: scale(0.985);
	}
	.feat-card.on {
		border-color: var(--accent);
		background: var(--accent-glow);
	}
	.feat-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
		line-height: 1.25;
	}
	.feat-desc {
		font-size: 11px;
		color: var(--text-secondary);
		margin-top: 2px;
	}
</style>
