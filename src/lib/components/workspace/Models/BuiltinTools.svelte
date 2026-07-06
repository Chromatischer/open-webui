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
		ask_user: {
			label: $i18n.t('Ask the User'),
			description: $i18n.t(
				'Put a structured multiple-choice question to the user and wait for the answer'
			)
		},
		scratchboard: {
			label: $i18n.t('Scratchboard'),
			description: $i18n.t(
				'Read, write, and diff-edit durable notes for the current chat Scratchboard'
			)
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
	<div class="bt-kicker">{$i18n.t('Builtin Tools')}</div>
	<div class="bt-grid">
		{#each allTools as tool}
			<button
				type="button"
				class="bt-cap {builtinTools[tool] !== false ? 'on' : ''}"
				on:click={() => toggle(tool)}
			>
				<span class="bt-seal" aria-hidden="true">
					{#if builtinTools[tool] !== false}
						<svg
							width="8"
							height="8"
							viewBox="0 0 10 10"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"><path d="M1.5 5.5 4 8l4.5-6" /></svg
						>
					{/if}
				</span>
				<span class="bt-text">
					<span class="bt-label">{$i18n.t(toolLabels[tool].label)}</span>
					<span class="bt-desc">{toolLabels[tool].description}</span>
				</span>
			</button>
		{/each}
	</div>
</div>

<style>
	.bt-kicker {
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--text-secondary);
		margin-bottom: 9px;
	}
	.bt-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 6px 14px;
	}
	.bt-cap {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		text-align: left;
		padding: 9px 10px;
		border: none;
		border-radius: 10px;
		background: transparent;
		cursor: pointer;
		transition: background 0.15s;
	}
	.bt-cap:hover {
		background: var(--rule-faint, rgba(0, 0, 0, 0.05));
	}
	.bt-seal {
		flex: none;
		margin-top: 2px;
		width: 13px;
		height: 13px;
		border-radius: 50%;
		border: 1.5px solid var(--text-tertiary);
		display: grid;
		place-items: center;
		color: transparent;
		transition:
			border-color 0.2s,
			color 0.2s;
	}
	.bt-cap.on .bt-seal {
		border-color: var(--vermilion, var(--accent));
		color: var(--vermilion, var(--accent));
		animation: btSealIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes btSealIn {
		from {
			transform: scale(1.5);
		}
		to {
			transform: scale(1);
		}
	}
	.bt-text {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}
	.bt-label {
		font-size: 13.5px;
		font-weight: 560;
		color: var(--text-secondary);
		line-height: 1.3;
		transition: color 0.15s;
	}
	.bt-cap.on .bt-label {
		color: var(--text);
	}
	.bt-desc {
		font-size: 11.5px;
		color: var(--text-tertiary);
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
