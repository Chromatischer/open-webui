<script lang="ts">
	import { getContext } from 'svelte';
	import Checkbox from '$lib/components/common/Checkbox.svelte';

	const i18n = getContext('i18n');

	const capabilityLabels = {
		vision: {
			label: $i18n.t('Vision'),
			description: $i18n.t('Model accepts image inputs')
		},
		file_upload: {
			label: $i18n.t('File Upload'),
			description: $i18n.t('Model accepts file inputs')
		},
		file_context: {
			label: $i18n.t('File Context'),
			description: $i18n.t('Inject file content into conversation context')
		},
		web_search: {
			label: $i18n.t('Web Search'),
			description: $i18n.t('Model can search the web for information')
		},
		image_generation: {
			label: $i18n.t('Image Generation'),
			description: $i18n.t('Model can generate images based on text prompts')
		},
		code_interpreter: {
			label: $i18n.t('Code Interpreter'),
			description: $i18n.t('Model can execute code and perform calculations')
		},
		terminal: {
			label: $i18n.t('Terminal'),
			description: $i18n.t(
				'Model can access Open Terminal for command execution and file management'
			)
		},
		usage: {
			label: $i18n.t('Usage'),
			description: $i18n.t('Return token usage information in the response when supported')
		},
		citations: {
			label: $i18n.t('Citations'),
			description: $i18n.t('Displays citations in the response')
		},
		status_updates: {
			label: $i18n.t('Status Updates'),
			description: $i18n.t('Displays status updates (e.g., web search progress) in the response')
		},
		builtin_tools: {
			label: $i18n.t('Builtin Tools'),
			description: $i18n.t('Auto-inject system tools for Agents (timestamps, memory, notes, etc.)')
		}
	};

	export let capabilities: {
		file_context?: boolean;
		vision?: boolean;
		file_upload?: boolean;
		web_search?: boolean;
		image_generation?: boolean;
		code_interpreter?: boolean;
		terminal?: boolean;
		usage?: boolean;
		citations?: boolean;
		status_updates?: boolean;
		builtin_tools?: boolean;
	} = {};

	// Hide file_context when file_upload is disabled
	$: visibleCapabilities = Object.keys(capabilityLabels).filter((cap) => {
		if (cap === 'file_context' && !capabilities.file_upload) {
			return false;
		}
		return true;
	});

	const toggle = (cap: string) => {
		capabilities[cap] = !capabilities[cap];
	};
</script>

<div class="cap-grid">
	{#each visibleCapabilities as capability}
		<button
			type="button"
			class="cap-card {capabilities[capability] ? 'on' : ''}"
			on:click={() => toggle(capability)}
		>
			<span class="cap-check" on:click|stopPropagation>
				<Checkbox
					state={capabilities[capability] ? 'checked' : 'unchecked'}
					on:change={(e) => {
						capabilities[capability] = e.detail === 'checked';
					}}
				/>
			</span>
			<span class="cap-text">
				<span class="cap-label">{$i18n.t(capabilityLabels[capability].label)}</span>
				<span class="cap-desc">{capabilityLabels[capability].description}</span>
			</span>
		</button>
	{/each}
</div>

<style>
	.cap-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 8px;
	}
	.cap-card {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		text-align: left;
		padding: 10px 12px;
		border: 1px solid var(--border);
		border-radius: 12px;
		background: var(--bg-base);
		cursor: pointer;
		transition:
			border-color 0.15s ease,
			background 0.15s ease,
			box-shadow 0.15s ease,
			transform 0.1s ease;
	}
	.cap-card:hover {
		border-color: var(--border-hover);
	}
	.cap-card:active {
		transform: scale(0.985);
	}
	.cap-card.on {
		border-color: var(--accent);
		background: var(--accent-glow);
	}
	.cap-check {
		display: flex;
		align-items: center;
		margin-top: 1px;
	}
	.cap-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.cap-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
		line-height: 1.25;
	}
	.cap-desc {
		font-size: 11px;
		color: var(--text-secondary);
		margin-top: 2px;
		line-height: 1.35;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
