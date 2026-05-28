<script lang="ts">
	import { getContext } from 'svelte';

	const i18n = getContext('i18n');

	const toolLabels = {
		time: {
			label: $i18n.t('Time & Calculation'),
			description: $i18n.t('Get current time and perform date/time calculations')
		},
		memory: {
			label: $i18n.t('Memory'),
			description: $i18n.t('Search and manage user memories')
		},
		chats: {
			label: $i18n.t('Chat History'),
			description: $i18n.t('Search and view user chat history')
		},
		notes: {
			label: $i18n.t('Notes'),
			description: $i18n.t('Search, view, and manage user notes')
		},
		knowledge: {
			label: $i18n.t('Knowledge Base'),
			description: $i18n.t('Browse and query knowledge bases')
		},
		channels: {
			label: $i18n.t('Channels'),
			description: $i18n.t('Search channels and channel messages')
		},
		web_search: {
			label: $i18n.t('Web Search'),
			description: $i18n.t('Search the web and fetch URLs')
		},
		image_generation: {
			label: $i18n.t('Image Generation'),
			description: $i18n.t('Generate and edit images')
		},
		code_interpreter: {
			label: $i18n.t('Code Interpreter'),
			description: $i18n.t('Execute code')
		},
		tasks: {
			label: $i18n.t('Task Management'),
			description: $i18n.t('Break down complex requests into trackable steps')
		},
		automations: {
			label: $i18n.t('Automations'),
			description: $i18n.t('Create and manage scheduled automations')
		},
		calendar: {
			label: $i18n.t('Calendar'),
			description: $i18n.t('List calendars, search, create, update, and delete calendar events')
		},
		scratchboard: {
			label: $i18n.t('Scratchboard'),
			description: $i18n.t('Read and write durable notes for the current chat Scratchboard')
		}
	};

	const allTools = Object.keys(toolLabels);

	export let builtinTools: Record<string, boolean> = {};

	// A tool is on unless explicitly set to false.
	const toggle = (tool: string) => {
		if (builtinTools[tool] === false) {
			delete builtinTools[tool];
		} else {
			builtinTools[tool] = false;
		}
		builtinTools = builtinTools;
	};
</script>

<div>
	<div class="text-xs font-medium text-gray-500 mb-2">{$i18n.t('Builtin Tools')}</div>
	<div class="bt-grid">
		{#each allTools as tool}
			<button
				type="button"
				class="bt-card {builtinTools[tool] !== false ? 'on' : ''}"
				on:click={() => toggle(tool)}
			>
				<span class="bt-label">{$i18n.t(toolLabels[tool].label)}</span>
				<span class="bt-desc">{toolLabels[tool].description}</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.bt-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 8px;
	}
	.bt-card {
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
	.bt-card:hover {
		border-color: var(--border-hover);
	}
	.bt-card:active {
		transform: scale(0.985);
	}
	.bt-card.on {
		border-color: var(--accent);
		background: var(--accent-glow);
	}
	.bt-label {
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
		line-height: 1.25;
	}
	.bt-desc {
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
