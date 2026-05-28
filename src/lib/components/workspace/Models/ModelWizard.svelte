<script lang="ts">
	import { toast } from 'svelte-sonner';

	import { onMount, getContext, tick } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut, backOut } from 'svelte/easing';

	import { models, tools, functions, user } from '$lib/stores';
	import { WEBUI_BASE_URL, DEFAULT_CAPABILITIES } from '$lib/constants';

	import { getTools } from '$lib/apis/tools';
	import { getFunctions } from '$lib/apis/functions';
	import { getModelsDefaults } from '$lib/apis/configs';

	import AdvancedParams from '$lib/components/chat/Settings/Advanced/AdvancedParams.svelte';
	import Tags from '$lib/components/common/Tags.svelte';
	import ToolsSelector from '$lib/components/workspace/Models/ToolsSelector.svelte';
	import SkillsSelector from '$lib/components/workspace/Models/SkillsSelector.svelte';
	import FiltersSelector from '$lib/components/workspace/Models/FiltersSelector.svelte';
	import ActionsSelector from '$lib/components/workspace/Models/ActionsSelector.svelte';
	import Capabilities from '$lib/components/workspace/Models/Capabilities.svelte';
	import Textarea from '$lib/components/common/Textarea.svelte';
	import AccessControl from '../common/AccessControl.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';
	import Check from '$lib/components/icons/Check.svelte';
	import Photo from '$lib/components/icons/Photo.svelte';
	import GarbageBin from '$lib/components/icons/GarbageBin.svelte';
	import FaceSmile from '$lib/components/icons/FaceSmile.svelte';
	import IconPicker from './IconPicker.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import DefaultFiltersSelector from './DefaultFiltersSelector.svelte';
	import DefaultFeatures from './DefaultFeatures.svelte';
	import BuiltinTools from './BuiltinTools.svelte';
	import TerminalSelector from './TerminalSelector.svelte';

	const i18n = getContext('i18n');

	export let onSubmit: Function;
	export let onClose: null | Function = null;

	export let model = null;
	export let edit = false;

	export let preset = true;

	let loading = false;
	let loaded = false;

	let filesInputElement;
	let inputFiles;

	// ///////////
	// wizard navigation
	// ///////////

	const steps = [
		{ id: 'basics', title: 'Basics', desc: 'Name & base model', optional: false },
		{ id: 'instructions', title: 'Instructions', desc: 'System prompt', optional: true },
		{ id: 'tools', title: 'Tools & Skills', desc: 'What it can call', optional: true },
		{ id: 'capabilities', title: 'Capabilities', desc: 'Vision, features', optional: true },
		{ id: 'access', title: 'Starters & Access', desc: 'Who can use it', optional: true },
		{ id: 'advanced', title: 'Advanced', desc: 'Parameters & JSON', optional: true }
	];

	let step = 0;
	let direction = 1;

	const goStep = (i: number) => {
		if (i === step || i < 0 || i > steps.length - 1) return;
		direction = i > step ? 1 : -1;
		step = i;
	};
	const next = () => goStep(step + 1);
	const back = () => goStep(step - 1);

	const closeHandler = () => {
		if (onClose) onClose();
	};

	// ///////////
	// model
	// ///////////

	let id = '';
	let name = '';

	$: if (!edit) {
		if (name) {
			id = name
				.replace(/\s+/g, '-')
				.replace(/[^a-zA-Z0-9-]/g, '')
				.toLowerCase();
		}
	}

	let system = '';
	let info = {
		id: '',
		base_model_id: null,
		name: '',
		meta: {
			profile_image_url: `${WEBUI_BASE_URL}/static/favicon.png`,
			description: '',
			suggestion_prompts: null,
			tags: []
		},
		params: {
			system: ''
		}
	};

	let params = {
		system: ''
	};

	let toolIds = [];
	let skillIds = [];

	let filterIds = [];
	let defaultFilterIds = [];

	let capabilities = { ...DEFAULT_CAPABILITIES };
	let defaultFeatureIds = [];
	let builtinTools = {};

	let actionIds = [];
	let accessGrants = [];
	let terminalId = '';

	// Required step is satisfied → model can be created at any point
	$: canSubmit = name.trim() !== '' && (!preset || !!info.base_model_id);

	const submitHandler = async () => {
		loading = true;

		info.id = id;
		info.name = name;

		if (id === '') {
			toast.error($i18n.t('Model ID is required.'));
			loading = false;
			return;
		}

		if (name === '') {
			toast.error($i18n.t('Model Name is required.'));
			loading = false;
			return;
		}

		info.params = { ...info.params, ...params };

		info.access_grants = accessGrants;
		info.meta.capabilities = capabilities;

		// No explicit Default/Custom toggle: empty = default (null), any text = custom
		info.meta.description = info.meta.description?.trim() ? info.meta.description : null;

		if (toolIds.length > 0) {
			info.meta.toolIds = toolIds;
		} else if (info.meta.toolIds) {
			delete info.meta.toolIds;
		}

		if (skillIds.length > 0) {
			info.meta.skillIds = skillIds;
		} else if (info.meta.skillIds) {
			delete info.meta.skillIds;
		}

		if (filterIds.length > 0) {
			info.meta.filterIds = filterIds;
		} else if (info.meta.filterIds) {
			delete info.meta.filterIds;
		}

		if (defaultFilterIds.length > 0) {
			info.meta.defaultFilterIds = defaultFilterIds;
		} else if (info.meta.defaultFilterIds) {
			delete info.meta.defaultFilterIds;
		}

		if (actionIds.length > 0) {
			info.meta.actionIds = actionIds;
		} else if (info.meta.actionIds) {
			delete info.meta.actionIds;
		}

		if (defaultFeatureIds.length > 0) {
			info.meta.defaultFeatureIds = defaultFeatureIds;
		} else if (info.meta.defaultFeatureIds) {
			delete info.meta.defaultFeatureIds;
		}

		if (Object.keys(builtinTools).length > 0) {
			info.meta.builtinTools = builtinTools;
		} else if (info.meta.builtinTools) {
			delete info.meta.builtinTools;
		}

		if (terminalId) {
			info.meta.terminalId = terminalId;
		} else if (info.meta.terminalId) {
			delete info.meta.terminalId;
		}

		info.params.system = system.trim() === '' ? null : system;
		info.params.stop = params.stop
			? (typeof params.stop === 'string' ? params.stop.split(',') : params.stop).filter((s) =>
					s.trim()
				)
			: null;
		Object.keys(info.params).forEach((key) => {
			if (info.params[key] === '' || info.params[key] === null) {
				delete info.params[key];
			}
		});

		await onSubmit(info);

		loading = false;
	};

	const imageInputHandler = () => {
		let reader = new FileReader();
		reader.onload = (event) => {
			let originalImageUrl = `${event.target?.result}`;

			const fileType = (inputFiles[0] as any)?.['type'];
			if (fileType === 'image/gif' || fileType === 'image/webp') {
				info.meta.profile_image_url = originalImageUrl;
				inputFiles = null;
				filesInputElement.value = '';
				return;
			}

			const img = new Image();
			img.src = originalImageUrl;

			img.onload = function () {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');

				const aspectRatio = img.width / img.height;
				let newWidth, newHeight;
				if (aspectRatio > 1) {
					newWidth = 250 * aspectRatio;
					newHeight = 250;
				} else {
					newWidth = 250;
					newHeight = 250 / aspectRatio;
				}

				canvas.width = 250;
				canvas.height = 250;

				const offsetX = (250 - newWidth) / 2;
				const offsetY = (250 - newHeight) / 2;

				ctx.drawImage(img, offsetX, offsetY, newWidth, newHeight);

				info.meta.profile_image_url = canvas.toDataURL('image/webp', 0.8);

				inputFiles = null;
				filesInputElement.value = '';
			};
		};

		if (
			inputFiles &&
			inputFiles.length > 0 &&
			['image/gif', 'image/webp', 'image/jpeg', 'image/png', 'image/svg+xml'].includes(
				(inputFiles[0] as any)?.['type']
			)
		) {
			reader.readAsDataURL(inputFiles[0]);
		} else {
			console.log(`Unsupported File Type '${(inputFiles[0] as any)?.['type']}'.`);
			inputFiles = null;
		}
	};

	onMount(async () => {
		await tools.set(await getTools(localStorage.token));
		await functions.set(await getFunctions(localStorage.token));

		const modelsConfig = await getModelsDefaults(localStorage.token).catch(() => null);
		const defaultMeta = modelsConfig?.DEFAULT_MODEL_METADATA ?? {};

		capabilities = { ...DEFAULT_CAPABILITIES, ...(defaultMeta.capabilities ?? {}) };
		defaultFeatureIds = defaultMeta.defaultFeatureIds ?? [];
		builtinTools = defaultMeta.builtinTools ?? {};

		if (model) {
			name = model.name;
			await tick();

			id = model.id;

			if (model.base_model_id) {
				const base_model = $models
					.filter((m) => !m?.preset && !(m?.arena ?? false))
					.find((m) => [model.base_model_id, `${model.base_model_id}:latest`].includes(m.id));

				if (base_model) {
					model.base_model_id = base_model.id;
				} else {
					model.base_model_id = null;
				}
			}

			system = model?.params?.system ?? '';

			params = { ...params, ...model?.params };
			params.stop = params?.stop
				? (typeof params.stop === 'string' ? params.stop.split(',') : (params?.stop ?? [])).join(
						','
					)
				: null;

			toolIds = model?.meta?.toolIds ?? [];
			skillIds = model?.meta?.skillIds ?? [];
			filterIds = model?.meta?.filterIds ?? [];
			defaultFilterIds = model?.meta?.defaultFilterIds ?? [];
			actionIds = model?.meta?.actionIds ?? [];

			capabilities = { ...capabilities, ...(model?.meta?.capabilities ?? {}) };
			defaultFeatureIds = model?.meta?.defaultFeatureIds ?? defaultFeatureIds;
			builtinTools = model?.meta?.builtinTools ?? builtinTools;
			terminalId = model?.meta?.terminalId ?? '';

			accessGrants = model?.access_grants ?? [];

			info = {
				...info,
				...JSON.parse(JSON.stringify(model ? model : { id: model.id, name: model.name }))
			};
		}

		loaded = true;
	});

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') closeHandler();
	};
</script>

<svelte:window on:keydown={onKeyDown} />

{#if loaded}
	<div class="wz-overlay" transition:fade={{ duration: 150 }}>
		<button class="wz-backdrop" type="button" aria-label={$i18n.t('Close')} on:click={closeHandler}
		></button>

		<div
			class="wz-modal"
			in:scale={{ start: 0.96, opacity: 0, duration: 240, easing: cubicOut }}
			out:scale={{ start: 0.97, opacity: 0, duration: 140, easing: cubicOut }}
		>
			<input
				bind:this={filesInputElement}
				bind:files={inputFiles}
				type="file"
				hidden
				accept="image/*"
				on:change={imageInputHandler}
			/>

			<div class="wz-head">
				<div class="wz-title">{edit ? $i18n.t('Edit Model') : $i18n.t('New Model')}</div>
				<button class="wz-x" type="button" aria-label={$i18n.t('Close')} on:click={closeHandler}>
					<XMark className="size-4" strokeWidth="2" />
				</button>
			</div>

			<div class="wz-body">
				<!-- Step rail -->
				<nav class="wz-rail">
					{#each steps as s, i}
						{@const done = i < step && (i !== 0 || canSubmit)}
						<button
							class="wz-step {i === step ? 'on' : ''} {done ? 'done' : ''}"
							type="button"
							on:click={() => goStep(i)}
						>
							<span class="wz-num">
								{#if done}
									<span in:scale={{ duration: 220, easing: backOut }} class="flex">
										<Check className="size-3" strokeWidth="3" />
									</span>
								{:else}
									{i + 1}
								{/if}
							</span>
							<span class="wz-step-text">
								<span class="wz-step-title">
									{$i18n.t(s.title)}
									{#if s.optional}<span class="wz-opt">{$i18n.t('opt')}</span>{/if}
								</span>
								<span class="wz-step-desc">{$i18n.t(s.desc)}</span>
							</span>
						</button>
					{/each}
				</nav>

				<!-- Step content -->
				<div class="wz-content">
					{#key step}
						<div
							class="wz-pane"
							in:fly={{ x: direction * 28, duration: 280, easing: cubicOut, delay: 40 }}
						>
							{#if step === 0}
								<div class="wz-pane-title">{$i18n.t('Name your model')}</div>
								<div class="wz-pane-sub">
									{$i18n.t('The only required step — refine everything else now or later.')}
								</div>

								<div class="wz-basics">
									<div class="wz-basics-fields">
										<div class="wz-field">
											<label for="wz-name">{$i18n.t('Name')}</label>
											<input
												id="wz-name"
												class="wz-inp"
												placeholder={$i18n.t('e.g. Code Reviewer')}
												bind:value={name}
											/>
										</div>

										<div class="wz-field">
											<label for="wz-id">{$i18n.t('Model ID')}</label>
											<input
												id="wz-id"
												class="wz-inp"
												placeholder={name.trim()
													? $i18n.t('Model ID')
													: $i18n.t('Enter a name first')}
												bind:value={id}
												disabled={edit || !name.trim()}
											/>
										</div>

										{#if preset}
											<div class="wz-field">
												<label for="wz-base">{$i18n.t('Base model')}</label>
												<select id="wz-base" class="wz-inp" bind:value={info.base_model_id}>
													<option value={null}>{$i18n.t('Select a base model')}</option>
													{#each $models.filter((m) => (model ? m.id !== model.id : true) && !m?.preset && m?.owned_by !== 'arena' && !(m?.direct ?? false)) as m}
														<option value={m.id}>{m.name}</option>
													{/each}
												</select>
											</div>
										{/if}

										<div class="wz-field">
											<label for="wz-desc">{$i18n.t('Description')}</label>
											<Textarea
												className="wz-inp resize-none"
												placeholder={$i18n.t('Add a short description about what this model does')}
												bind:value={info.meta.description}
											/>
										</div>

										<div class="wz-field">
											<label>{$i18n.t('Tags')}</label>
											<Tags
												tags={info?.meta?.tags ?? []}
												on:delete={(e) => {
													const tagName = e.detail;
													info.meta.tags = info.meta.tags.filter((tag) => tag.name !== tagName);
												}}
												on:add={(e) => {
													const tagName = e.detail;
													if (!(info?.meta?.tags ?? null)) {
														info.meta.tags = [{ name: tagName }];
													} else {
														info.meta.tags = [...info.meta.tags, { name: tagName }];
													}
												}}
											/>
										</div>
									</div>

									<div class="wz-basics-avatar">
										<button
											class="wz-avatar-btn group"
											type="button"
											aria-label={$i18n.t('Upload profile image')}
											on:click={() => filesInputElement.click()}
										>
											<img
												src={info.meta.profile_image_url || `${WEBUI_BASE_URL}/static/favicon.png`}
												alt="model profile"
												class="wz-avatar-img"
											/>
											<span class="wz-avatar-overlay">{$i18n.t('Change')}</span>
										</button>

										<div class="wz-avatar-actions">
											<IconPicker
												align="center"
												onSelect={(url) => (info.meta.profile_image_url = url)}
											>
												<Tooltip content={$i18n.t('Pick an icon or emoji')}>
													<span class="wz-icon-btn"><FaceSmile className="size-4" /></span>
												</Tooltip>
											</IconPicker>

											<Tooltip content={$i18n.t('Upload image')}>
												<button
													class="wz-icon-btn"
													type="button"
													aria-label={$i18n.t('Upload image')}
													on:click={() => filesInputElement.click()}
												>
													<Photo className="size-4" />
												</button>
											</Tooltip>

											<Tooltip content={$i18n.t('Delete')}>
												<button
													class="wz-icon-btn danger"
													type="button"
													aria-label={$i18n.t('Delete')}
													on:click={() => {
														info.meta.profile_image_url = `${WEBUI_BASE_URL}/static/favicon.png`;
													}}
												>
													<GarbageBin className="size-4" />
												</button>
											</Tooltip>
										</div>
									</div>
								</div>
							{:else if step === 1}
								<div class="wz-pane-title">{$i18n.t('Set the instructions')}</div>
								<div class="wz-pane-sub">
									{$i18n.t('Tell the model how it should behave in every conversation.')}
								</div>

								<div class="wz-field">
									<label>{$i18n.t('System Prompt')}</label>
									<Textarea
										className="wz-inp resize-none"
										placeholder={$i18n.t(
											'Write your model system prompt content here\ne.g.) You are Mario from Super Mario Bros, acting as an assistant.'
										)}
										rows={10}
										bind:value={system}
									/>
								</div>
							{:else if step === 2}
								<div class="wz-pane-title">{$i18n.t('Tools & Skills')}</div>
								<div class="wz-pane-sub">
									{$i18n.t('Optional — let the model call tools and skills.')}
								</div>

								<div class="wz-field">
									<ToolsSelector bind:selectedToolIds={toolIds} tools={$tools ?? []} />
								</div>
								<div class="wz-field"><SkillsSelector bind:selectedSkillIds={skillIds} /></div>

								{#if ($functions ?? []).filter((func) => func.type === 'filter').length > 0}
									<div class="wz-field">
										<FiltersSelector
											bind:selectedFilterIds={filterIds}
											filters={($functions ?? []).filter((func) => func.type === 'filter')}
										/>
									</div>

									{@const toggleableFilters = $functions.filter(
										(func) =>
											func.type === 'filter' &&
											(filterIds.includes(func.id) || func?.is_global) &&
											func?.meta?.toggle
									)}
									{#if toggleableFilters.length > 0}
										<div class="wz-field">
											<DefaultFiltersSelector
												bind:selectedFilterIds={defaultFilterIds}
												filters={toggleableFilters}
											/>
										</div>
									{/if}
								{/if}

								{#if ($functions ?? []).filter((func) => func.type === 'action').length > 0}
									<div class="wz-field">
										<ActionsSelector
											bind:selectedActionIds={actionIds}
											actions={($functions ?? []).filter((func) => func.type === 'action')}
										/>
									</div>
								{/if}
							{:else if step === 3}
								<div class="wz-pane-title">{$i18n.t('Capabilities')}</div>
								<div class="wz-pane-sub">
									{$i18n.t(
										'Optional — turn on features like vision, web search or code execution.'
									)}
								</div>

								<div class="wz-field"><Capabilities bind:capabilities /></div>

								{#if Object.keys(capabilities).filter((key) => capabilities[key]).length > 0}
									{@const availableFeatures = Object.entries(capabilities)
										.filter(
											([key, value]) =>
												value &&
												['web_search', 'code_interpreter', 'image_generation'].includes(key)
										)
										.map(([key, value]) => key)}
									{#if availableFeatures.length > 0}
										<div class="wz-field">
											<DefaultFeatures {availableFeatures} bind:featureIds={defaultFeatureIds} />
										</div>
									{/if}
								{/if}

								{#if capabilities.builtin_tools}
									<div class="wz-field"><BuiltinTools bind:builtinTools /></div>
								{/if}

								{#if capabilities.terminal}
									<div class="wz-field"><TerminalSelector bind:terminalId /></div>
								{/if}
							{:else if step === 4}
								<div class="wz-pane-title">{$i18n.t('Starters & Access')}</div>
								<div class="wz-pane-sub">
									{$i18n.t('Choose who can use this model.')}
								</div>

								<div class="wz-field">
									<AccessControl
										bind:accessGrants
										accessRoles={preset ? ['read', 'write'] : ['read']}
										share={$user?.permissions?.sharing?.models || $user?.role === 'admin'}
										sharePublic={$user?.permissions?.sharing?.public_models ||
											$user?.role === 'admin'}
									/>
								</div>
							{:else if step === 5}
								<div class="wz-pane-title">{$i18n.t('Advanced')}</div>
								<div class="wz-pane-sub">
									{$i18n.t('Fine-tune the model parameters.')}
								</div>

								<div class="wz-field">
									<AdvancedParams admin={true} custom={true} grouped={true} bind:params />
								</div>
							{/if}
						</div>
					{/key}
				</div>
			</div>

			<div class="wz-foot">
				<button class="wz-btn ghost" type="button" disabled={step === 0} on:click={back}>
					← {$i18n.t('Back')}
				</button>
				<div class="flex-1"></div>

				{#if !canSubmit}
					<span class="wz-hint">{$i18n.t('Fill name + base model to create')}</span>
				{/if}

				<button
					class="wz-btn create"
					type="button"
					disabled={!canSubmit || loading}
					on:click={submitHandler}
				>
					{#if loading}
						<Spinner className="size-4" />
					{/if}
					{edit ? $i18n.t('Save') : $i18n.t('Create model')}
				</button>

				{#if step < steps.length - 1}
					<button class="wz-btn primary" type="button" on:click={next}>
						{$i18n.t('Next')} →
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.wz-overlay {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
	}
	.wz-backdrop {
		position: absolute;
		inset: 0;
		border: none;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(2px);
		cursor: pointer;
	}
	.wz-modal {
		position: relative;
		width: 780px;
		max-width: 100%;
		max-height: calc(100dvh - 48px);
		display: flex;
		flex-direction: column;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: 20px;
		box-shadow: 0 24px 60px rgba(0, 0, 0, 0.22);
		overflow: hidden;
	}

	.wz-head {
		display: flex;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border);
	}
	.wz-title {
		font-size: 16px;
		font-weight: 600;
	}
	.wz-x {
		margin-left: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: 9px;
		color: var(--text-tertiary);
		transition:
			background 0.15s ease,
			color 0.15s ease,
			transform 0.1s ease;
	}
	.wz-x:hover {
		background: var(--surface-hover);
		color: var(--text);
	}
	.wz-x:active {
		transform: scale(0.92);
	}

	.wz-body {
		display: flex;
		flex: 1;
		min-height: 0;
	}

	.wz-rail {
		width: 232px;
		flex: none;
		padding: 14px 12px;
		background: var(--surface);
		border-right: 1px solid var(--border);
		overflow-y: auto;
	}
	.wz-step {
		display: flex;
		gap: 10px;
		align-items: flex-start;
		width: 100%;
		text-align: left;
		padding: 9px 10px;
		margin-bottom: 2px;
		border-radius: 10px;
		color: var(--text-secondary);
		background: transparent;
		transition:
			background 0.18s ease,
			color 0.18s ease,
			transform 0.1s ease;
	}
	.wz-step:hover {
		background: var(--surface-hover);
	}
	.wz-step:active {
		transform: scale(0.985);
	}
	.wz-step.on {
		background: var(--bg-elevated);
		color: var(--text);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
	}
	.wz-step.done {
		color: var(--text-tertiary);
	}
	.wz-num {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		flex: none;
		margin-top: 1px;
		border-radius: 50%;
		font-size: 11px;
		font-weight: 700;
		background: var(--surface-active);
		color: var(--text-secondary);
		transition:
			background 0.2s ease,
			color 0.2s ease;
	}
	.wz-step.on .wz-num {
		background: var(--accent);
		color: #fff;
	}
	.wz-step.done .wz-num {
		background: var(--success);
		color: #fff;
	}
	.wz-step-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.wz-step-title {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 13px;
		font-weight: 600;
		line-height: 1.25;
	}
	.wz-step-desc {
		font-size: 11px;
		color: var(--text-tertiary);
		margin-top: 1px;
	}
	.wz-opt {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-tertiary);
		border: 1px solid var(--border);
		border-radius: 5px;
		padding: 0 4px;
		font-weight: 600;
	}

	.wz-content {
		flex: 1;
		min-width: 0;
		overflow-y: auto;
		overflow-x: hidden;
		/* reserve the scrollbar gutter so growing content (e.g. adding tags) never shifts the layout */
		scrollbar-gutter: stable;
		padding: 22px 24px;
	}
	.wz-pane-title {
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 2px;
	}
	.wz-pane-sub {
		font-size: 12px;
		color: var(--text-secondary);
		margin-bottom: 18px;
	}

	.wz-field {
		margin-bottom: 16px;
	}
	.wz-field :global(label),
	.wz-field > label {
		display: block;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		margin-bottom: 6px;
	}
	:global(.wz-inp) {
		width: 100%;
		border: 1px solid var(--border);
		border-radius: 11px;
		padding: 10px 12px;
		font-size: 13px;
		background: var(--bg-base);
		color: var(--text);
		outline: none;
		transition:
			border-color 0.18s ease,
			box-shadow 0.18s ease;
	}
	:global(.wz-inp:focus),
	:global(.wz-inp:focus-within) {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px var(--accent-glow);
	}

	/* Basics: fields left, big avatar right */
	.wz-basics {
		display: flex;
		gap: 22px;
		align-items: flex-start;
	}
	.wz-basics-fields {
		flex: 1;
		min-width: 0;
	}
	.wz-basics-avatar {
		flex: none;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding-top: 18px;
	}
	.wz-avatar-btn {
		position: relative;
		flex: none;
		border-radius: 22px;
		overflow: hidden;
		transition: transform 0.15s ease;
	}
	.wz-avatar-img {
		width: 132px;
		height: 132px;
		border-radius: 22px;
		object-fit: cover;
		display: block;
		background: var(--surface-active);
	}
	.wz-avatar-btn:hover {
		transform: translateY(-2px) scale(1.02);
	}
	.wz-avatar-btn:active {
		transform: scale(0.97);
	}
	.wz-avatar-overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: 600;
		color: #fff;
		background: rgba(0, 0, 0, 0.45);
		opacity: 0;
		transition: opacity 0.18s ease;
	}
	.wz-avatar-btn:hover .wz-avatar-overlay {
		opacity: 1;
	}
	.wz-avatar-actions {
		display: flex;
		gap: 6px;
	}
	.wz-icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 34px;
		height: 34px;
		border-radius: 10px;
		color: var(--text-secondary);
		background: var(--surface);
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease,
			transform 0.1s ease;
	}
	.wz-icon-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
	}
	.wz-icon-btn.danger:hover {
		background: var(--orange-glow, rgba(232, 115, 10, 0.14));
		color: var(--orange);
	}
	.wz-icon-btn:active {
		transform: scale(0.9);
	}

	.wz-disclosure {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
	}
	.wz-chevron {
		display: inline-block;
		transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
	}
	.wz-chevron.open {
		transform: rotate(180deg);
	}

	.wz-foot {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 20px;
		border-top: 1px solid var(--border);
		background: var(--surface);
	}
	.wz-hint {
		font-size: 11px;
		color: var(--text-tertiary);
		margin-right: 2px;
	}
	.wz-btn {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		font-size: 13px;
		font-weight: 600;
		padding: 9px 16px;
		border-radius: 11px;
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		color: var(--text);
		transition:
			background 0.15s ease,
			box-shadow 0.15s ease,
			transform 0.1s ease,
			opacity 0.15s ease;
	}
	.wz-btn:hover {
		box-shadow: 0 2px 8px var(--shadow-color);
	}
	.wz-btn:active {
		transform: scale(0.96);
	}
	.wz-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
		box-shadow: none;
		transform: none;
	}
	.wz-btn.ghost {
		border: none;
		background: transparent;
		color: var(--text-secondary);
	}
	.wz-btn.ghost:hover {
		box-shadow: none;
		background: var(--surface-hover);
	}
	.wz-btn.primary {
		background: var(--text);
		color: var(--bg-elevated);
		border: none;
	}
	.wz-btn.create {
		background: var(--accent);
		color: #fff;
		border: none;
	}

	@media (max-width: 640px) {
		.wz-body {
			flex-direction: column;
		}
		.wz-basics {
			flex-direction: column-reverse;
		}
		.wz-basics-avatar {
			flex-direction: row;
			align-self: center;
			padding-top: 0;
		}
		.wz-rail {
			width: 100%;
			display: flex;
			gap: 4px;
			overflow-x: auto;
			border-right: none;
			border-bottom: 1px solid var(--border);
		}
		.wz-step {
			flex: none;
		}
		.wz-step-desc {
			display: none;
		}
	}
</style>
