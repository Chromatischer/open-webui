<script lang="ts">
	import { toast } from 'svelte-sonner';

	import { onMount, getContext, tick } from 'svelte';
	import { models, tools, functions, user } from '$lib/stores';
	import { WEBUI_BASE_URL, DEFAULT_CAPABILITIES } from '$lib/constants';

	import { getTools } from '$lib/apis/tools';
	import { getFunctions } from '$lib/apis/functions';
	import { getModelsDefaults } from '$lib/apis/configs';
	import { getSkillItems } from '$lib/apis/skills';

	import AdvancedParams from '$lib/components/chat/Settings/Advanced/AdvancedParams.svelte';
	import Tags from '$lib/components/common/Tags.svelte';
	import Knowledge from '$lib/components/workspace/Models/Knowledge.svelte';
	import AccessControl from '../common/AccessControl.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import IconPicker from './IconPicker.svelte';
	import BuiltinTools from './BuiltinTools.svelte';
	import TerminalSelector from './TerminalSelector.svelte';
	import FaceSmile from '$lib/components/icons/FaceSmile.svelte';
	import Photo from '$lib/components/icons/Photo.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';

	const i18n = getContext('i18n');

	/*
	 * The model folio — a model is composed, not configured.
	 * One manuscript page: letterhead (plate, name, lineage), then
	 * §-numbered passages for instructions, library, instruments,
	 * faculties, tuning and audience, sealed at the foot.
	 */

	export let onSubmit: Function;
	export let onClose: null | Function = null;

	export let model = null;
	export let edit = false;

	export let preset = true;

	let loading = false;
	let loaded = false;

	let filesInputElement;
	let inputFiles;

	// ───────────── model state ─────────────

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

	let knowledge = [];
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
	let tts = { voice: '' };

	let skillsList = [];
	let showType = false;
	let fullCase = false;

	/*
	 * Tuning registers — the handful of dials most hands actually turn.
	 * Untouched means "default": the base model decides. Only a deliberate
	 * turn of a register inks a value into the preset; everything else
	 * lives in the full type case below.
	 */
	const dials = [
		{
			key: 'temperature',
			label: $i18n.t('Temperature'),
			hint: $i18n.t('how adventurous the wording runs — low is measured, high is fervent'),
			min: 0,
			max: 2,
			step: 0.05,
			def: 0.8
		},
		{
			key: 'top_p',
			label: $i18n.t('Top P'),
			hint: $i18n.t('the breadth of word choice considered at each step'),
			min: 0,
			max: 1,
			step: 0.05,
			def: 0.9
		},
		{
			key: 'frequency_penalty',
			label: $i18n.t('Frequency Penalty'),
			hint: $i18n.t('its aversion to repeating itself'),
			min: -2,
			max: 2,
			step: 0.05,
			def: 1.1
		}
	];

	const fmtDial = (v) =>
		Math.abs(v) >= 100 ? String(Math.round(v)) : String(Math.round(v * 100) / 100);

	$: filtersList = ($functions ?? []).filter((func) => func.type === 'filter');
	$: actionsList = ($functions ?? []).filter((func) => func.type === 'action');
	$: toggleableFilters = filtersList.filter(
		(func) => (filterIds.includes(func.id) || func?.is_global) && func?.meta?.toggle
	);

	$: canSubmit = name.trim() !== '' && (!preset || !!info.base_model_id);

	$: baseModels = $models.filter(
		(m) =>
			(model ? m.id !== model.id : true) &&
			!m?.preset &&
			m?.owned_by !== 'arena' &&
			!(m?.direct ?? false)
	);

	// ───────────── faculties (capabilities) ─────────────

	const capLabels = {
		vision: { label: $i18n.t('Vision'), description: $i18n.t('Model accepts image inputs') },
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
	const allCapabilities = Object.keys(capLabels);

	const featLabels = {
		web_search: $i18n.t('Web Search'),
		image_generation: $i18n.t('Image Generation'),
		code_interpreter: $i18n.t('Code Interpreter')
	};
	$: availableFeatures = Object.entries(capabilities)
		.filter(([key, value]) => value && Object.keys(featLabels).includes(key))
		.map(([key]) => key);

	// file_context only applies when file_upload is enabled — visible but disabled.
	const capDisabled = (cap: string) => cap === 'file_context' && !capabilities.file_upload;

	const toggleCap = (cap: string) => {
		if (capDisabled(cap)) return;
		capabilities[cap] = !capabilities[cap];
	};

	const toggleIn = (list: string[], value: string) =>
		list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

	// ───────────── composition & sealing ─────────────

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

		if (knowledge.some((item) => item.status === 'uploading')) {
			toast.error($i18n.t('Please wait until all files are uploaded.'));
			loading = false;
			return;
		}

		info.params = { ...info.params, ...params };

		info.access_grants = accessGrants;
		info.meta.capabilities = capabilities;

		// no Default/Custom toggle: empty = default (null), any text = custom
		info.meta.description = info.meta.description?.trim() ? info.meta.description : null;

		if (knowledge.length > 0) {
			info.meta.knowledge = knowledge;
		} else if (info.meta.knowledge) {
			delete info.meta.knowledge;
		}

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

		if (tts.voice !== '') {
			if (!info.meta.tts) info.meta.tts = {};
			info.meta.tts.voice = tts.voice;
		} else if (info.meta.tts?.voice) {
			delete info.meta.tts.voice;
			if (Object.keys(info.meta.tts).length === 0) {
				delete info.meta.tts;
			}
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

	const autogrow = (e) => {
		const el = e.currentTarget;
		el.style.height = 'auto';
		el.style.height = el.scrollHeight + 'px';
	};

	// size the writing line to its loaded content (edit mode opens mid-manuscript)
	const grown = (el: HTMLTextAreaElement) => {
		const fit = () => {
			el.style.height = 'auto';
			el.style.height = el.scrollHeight + 'px';
		};
		requestAnimationFrame(fit);
	};

	onMount(async () => {
		await tools.set(await getTools(localStorage.token));
		await functions.set(await getFunctions(localStorage.token));

		const skillsRes = await getSkillItems(localStorage.token).catch(() => null);
		skillsList = skillsRes?.items ?? [];

		const modelsConfig = await getModelsDefaults(localStorage.token).catch(() => null);
		const defaultMeta = modelsConfig?.DEFAULT_MODEL_METADATA ?? {};

		capabilities = { ...DEFAULT_CAPABILITIES, ...(defaultMeta.capabilities ?? {}) };
		defaultFeatureIds = defaultMeta.defaultFeatureIds ?? [];
		builtinTools = defaultMeta.builtinTools ?? {};

		// open the folio at its letterhead
		const workspaceContainer = document.getElementById('workspace-container');
		if (workspaceContainer) {
			workspaceContainer.scrollTop = 0;
		}

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

			knowledge = (model?.meta?.knowledge ?? []).map((item) => {
				if (item?.collection_name && item?.type !== 'file') {
					return {
						id: item.collection_name,
						name: item.name,
						legacy: true
					};
				} else if (item?.collection_names) {
					return {
						name: item.name,
						type: 'collection',
						collection_names: item.collection_names,
						legacy: true
					};
				} else {
					return item;
				}
			});

			toolIds = model?.meta?.toolIds ?? [];
			skillIds = model?.meta?.skillIds ?? [];
			filterIds = model?.meta?.filterIds ?? [];
			defaultFilterIds = model?.meta?.defaultFilterIds ?? [];
			actionIds = model?.meta?.actionIds ?? [];

			capabilities = { ...capabilities, ...(model?.meta?.capabilities ?? {}) };
			defaultFeatureIds = model?.meta?.defaultFeatureIds ?? defaultFeatureIds;
			builtinTools = model?.meta?.builtinTools ?? builtinTools;
			terminalId = model?.meta?.terminalId ?? '';
			tts = { voice: model?.meta?.tts?.voice ?? '' };

			accessGrants = model?.access_grants ?? [];

			info = {
				...info,
				...JSON.parse(JSON.stringify(model ? model : { id: model.id, name: model.name }))
			};
		}

		loaded = true;
	});
</script>

{#if loaded}
	<input
		bind:this={filesInputElement}
		bind:files={inputFiles}
		type="file"
		hidden
		accept="image/*"
		on:change={imageInputHandler}
	/>

	<div class="mf">
		<!-- ─── kicker ─── -->
		<div class="mf-kicker-row reveal" style:--d="0s">
			<span class="mf-kicker"
				>{$i18n.t('The Workshop')} — {edit ? $i18n.t('Edit Model') : $i18n.t('New Model')}</span
			>
			{#if onClose}
				<button
					class="mf-ghost"
					type="button"
					aria-label={$i18n.t('Close')}
					title={$i18n.t('Close')}
					on:click={() => onClose()}
				>
					<XMark className="size-4" strokeWidth="1.8" />
				</button>
			{/if}
		</div>

		<!-- ─── letterhead: the plate, the name, the lineage ─── -->
		<header class="mf-letterhead reveal" style:--d="0.06s">
			<div class="mf-plate-wrap">
				<button
					class="mf-plate"
					type="button"
					aria-label={$i18n.t('Upload profile image')}
					on:click={() => filesInputElement.click()}
				>
					<img src={info.meta.profile_image_url || `${WEBUI_BASE_URL}/static/favicon.png`} alt="" />
					<span class="mf-plate-veil">{$i18n.t('Change')}</span>
				</button>

				<div class="mf-plate-actions">
					<IconPicker align="center" onSelect={(url) => (info.meta.profile_image_url = url)}>
						<Tooltip content={$i18n.t('Pick an icon or emoji')}>
							<span class="mf-ghost"><FaceSmile className="size-4" /></span>
						</Tooltip>
					</IconPicker>

					<Tooltip content={$i18n.t('Upload image')}>
						<button
							class="mf-ghost"
							type="button"
							aria-label={$i18n.t('Upload image')}
							on:click={() => filesInputElement.click()}
						>
							<Photo className="size-4" />
						</button>
					</Tooltip>

					<Tooltip content={$i18n.t('Reset Image')}>
						<button
							class="mf-ghost"
							type="button"
							aria-label={$i18n.t('Reset Image')}
							on:click={() => {
								info.meta.profile_image_url = `${WEBUI_BASE_URL}/static/favicon.png`;
							}}
						>
							<XMark className="size-4" />
						</button>
					</Tooltip>
				</div>
			</div>

			<input
				class="mf-name"
				placeholder={$i18n.t('Name this model…')}
				bind:value={name}
				maxlength="120"
			/>

			<input
				class="mf-id"
				placeholder={name.trim() ? $i18n.t('model-id') : ''}
				bind:value={id}
				disabled={edit}
				spellcheck="false"
				aria-label={$i18n.t('Model ID')}
			/>

			{#if preset}
				<div class="mf-byline">
					<span>{$i18n.t('set upon')}</span>
					<span class="mf-base-wrap">
						<select
							class="mf-base"
							class:unset={!info.base_model_id}
							bind:value={info.base_model_id}
						>
							<option value={null}>{$i18n.t('Select a base model')}</option>
							{#each baseModels as m}
								<option value={m.id}>{m.name}</option>
							{/each}
						</select>
						<svg
							class="mf-base-chev"
							width="9"
							height="9"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2.4"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg
						>
					</span>
				</div>
			{/if}

			<input
				class="mf-desc"
				placeholder={$i18n.t('a line about what this model is for…')}
				bind:value={info.meta.description}
			/>

			<div class="mf-tags">
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

			<div class="mf-asterism" aria-hidden="true"><span>⁂</span></div>
		</header>

		<!-- ─── § 1 · instructions ─── -->
		<section class="mf-sec reveal" style:--d="0.12s">
			<div class="mf-sec-head">
				<span class="mf-sec-no">§ 1</span>
				<h2 class="mf-sec-title">{$i18n.t('Instructions')}</h2>
			</div>
			<p class="mf-sec-sub">{$i18n.t('How it should behave in every conversation.')}</p>

			<div class="mf-line">
				<textarea
					class="mf-textarea"
					rows="4"
					placeholder={$i18n.t('You are a careful editor: terse, concrete, kind…')}
					bind:value={system}
					on:input={autogrow}
					use:grown
				></textarea>
				<div class="mf-rule" aria-hidden="true"></div>
			</div>
		</section>

		<!-- ─── § 2 · the library ─── -->
		<section class="mf-sec reveal" style:--d="0.18s">
			<div class="mf-sec-head">
				<span class="mf-sec-no">§ 2</span>
				<h2 class="mf-sec-title">{$i18n.t('The library')}</h2>
			</div>
			<p class="mf-sec-sub">
				{$i18n.t('Collections and files the model may consult while it writes.')}
			</p>

			<Knowledge bind:selectedItems={knowledge}>
				<span slot="label"></span>
			</Knowledge>
		</section>

		<!-- ─── § 3 · instruments ─── -->
		<section class="mf-sec reveal" style:--d="0.24s">
			<div class="mf-sec-head">
				<span class="mf-sec-no">§ 3</span>
				<h2 class="mf-sec-title">{$i18n.t('Instruments')}</h2>
			</div>
			<p class="mf-sec-sub">
				{$i18n.t('Tools, skills and filters the model may take up mid-conversation.')}
			</p>

			{#if ($tools ?? []).length > 0}
				<div class="mf-group">
					<span class="mf-group-label">{$i18n.t('Tools')}</span>
					<div class="mf-stamps">
						{#each $tools ?? [] as tool (tool.id)}
							<Tooltip content={tool?.meta?.description ?? tool.id}>
								<button
									type="button"
									class="mf-stamp"
									class:on={toolIds.includes(tool.id)}
									on:click={() => (toolIds = toggleIn(toolIds, tool.id))}
								>
									<span class="seal" aria-hidden="true">
										{#if toolIds.includes(tool.id)}
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
									{tool.name}
								</button>
							</Tooltip>
						{/each}
					</div>
				</div>
			{:else}
				<p class="mf-quiet">
					{$i18n.t('To select toolkits here, add them to the "Tools" workspace first.')}
				</p>
			{/if}

			{#if skillsList.length > 0}
				<div class="mf-group">
					<span class="mf-group-label">{$i18n.t('Skills')}</span>
					<div class="mf-stamps">
						{#each skillsList as skill (skill.id)}
							<Tooltip content={skill?.description ?? skill.id}>
								<button
									type="button"
									class="mf-stamp"
									class:on={skillIds.includes(skill.id)}
									on:click={() => (skillIds = toggleIn(skillIds, skill.id))}
								>
									<span class="seal" aria-hidden="true">
										{#if skillIds.includes(skill.id)}
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
									{skill.name}
								</button>
							</Tooltip>
						{/each}
					</div>
				</div>
			{/if}

			{#if filtersList.length > 0}
				<div class="mf-group">
					<span class="mf-group-label">{$i18n.t('Filters')}</span>
					<div class="mf-stamps">
						{#each filtersList as filter (filter.id)}
							<Tooltip content={filter?.meta?.description ?? filter.id}>
								<button
									type="button"
									class="mf-stamp"
									class:on={filterIds.includes(filter.id)}
									on:click={() => (filterIds = toggleIn(filterIds, filter.id))}
								>
									<span class="seal" aria-hidden="true">
										{#if filterIds.includes(filter.id)}
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
									{filter.name}
								</button>
							</Tooltip>
						{/each}
					</div>

					{#if toggleableFilters.length > 0}
						<div class="mf-subgroup">
							<span class="mf-group-label dim">{$i18n.t('On by default')}</span>
							<div class="mf-stamps">
								{#each toggleableFilters as filter (filter.id)}
									<button
										type="button"
										class="mf-stamp"
										class:on={defaultFilterIds.includes(filter.id)}
										on:click={() => (defaultFilterIds = toggleIn(defaultFilterIds, filter.id))}
									>
										<span class="seal" aria-hidden="true">
											{#if defaultFilterIds.includes(filter.id)}
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
										{filter.name}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			{#if actionsList.length > 0}
				<div class="mf-group">
					<span class="mf-group-label">{$i18n.t('Actions')}</span>
					<div class="mf-stamps">
						{#each actionsList as action (action.id)}
							<Tooltip content={action?.meta?.description ?? action.id}>
								<button
									type="button"
									class="mf-stamp"
									class:on={actionIds.includes(action.id)}
									on:click={() => (actionIds = toggleIn(actionIds, action.id))}
								>
									<span class="seal" aria-hidden="true">
										{#if actionIds.includes(action.id)}
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
									{action.name}
								</button>
							</Tooltip>
						{/each}
					</div>
				</div>
			{/if}
		</section>

		<!-- ─── § 4 · faculties ─── -->
		<section class="mf-sec reveal" style:--d="0.3s">
			<div class="mf-sec-head">
				<span class="mf-sec-no">§ 4</span>
				<h2 class="mf-sec-title">{$i18n.t('Faculties')}</h2>
			</div>
			<p class="mf-sec-sub">{$i18n.t('What the model is permitted to see and do.')}</p>

			<div class="mf-caps">
				{#each allCapabilities as cap}
					<button
						type="button"
						class="mf-cap"
						class:on={capabilities[cap]}
						class:disabled={capDisabled(cap)}
						disabled={capDisabled(cap)}
						on:click={() => toggleCap(cap)}
					>
						<span class="seal" aria-hidden="true">
							{#if capabilities[cap]}
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
						<span class="mf-cap-text">
							<span class="mf-cap-label">{capLabels[cap].label}</span>
							<span class="mf-cap-desc">{capLabels[cap].description}</span>
						</span>
					</button>
				{/each}
			</div>

			{#if availableFeatures.length > 0}
				<div class="mf-group">
					<span class="mf-group-label dim">{$i18n.t('On by default for new chats')}</span>
					<div class="mf-stamps">
						{#each availableFeatures as feature (feature)}
							<button
								type="button"
								class="mf-stamp"
								class:on={defaultFeatureIds.includes(feature)}
								on:click={() => (defaultFeatureIds = toggleIn(defaultFeatureIds, feature))}
							>
								<span class="seal" aria-hidden="true">
									{#if defaultFeatureIds.includes(feature)}
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
								{featLabels[feature]}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			{#if capabilities.builtin_tools}
				<div class="mf-group"><BuiltinTools bind:builtinTools /></div>
			{/if}

			{#if capabilities.terminal}
				<div class="mf-group"><TerminalSelector bind:terminalId /></div>
			{/if}
		</section>

		<!-- ─── § 5 · tuning ─── -->
		<section class="mf-sec reveal" style:--d="0.36s">
			<div class="mf-sec-head">
				<span class="mf-sec-no">§ 5</span>
				<h2 class="mf-sec-title">{$i18n.t('Tuning')}</h2>
			</div>
			<p class="mf-sec-sub">
				{$i18n.t('The registers most hands reach for — everything else waits in the full case.')}
			</p>

			<div class="mf-dials">
				{#each dials as d (d.key)}
					{@const isSet = (params[d.key] ?? null) !== null}
					{@const val = isSet ? params[d.key] : d.def}
					<div class="mf-dial">
						<div class="mf-dial-top">
							<span class="mf-dial-label">{d.label}</span>
							<span class="mf-dial-val" class:default={!isSet}>
								{isSet ? fmtDial(val) : $i18n.t('default')}
							</span>
							{#if isSet}
								<button
									class="mf-dial-x"
									type="button"
									title={$i18n.t('Reset to default')}
									aria-label={$i18n.t('Reset to default')}
									on:click={() => (params[d.key] = null)}
								>
									<svg
										width="9"
										height="9"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg
									>
								</button>
							{/if}
						</div>
						<p class="mf-dial-hint">{d.hint}</p>
						<input
							type="range"
							class:set={isSet}
							min={d.min}
							max={d.max}
							step={d.step}
							value={val}
							style:--pct="{isSet ? (((val - d.min) / (d.max - d.min)) * 100).toFixed(1) : 0}%"
							on:input={(e) => (params[d.key] = parseFloat(e.currentTarget.value))}
							aria-label={d.label}
						/>
					</div>
				{/each}

				<div class="mf-dial-row">
					<div class="mf-dial">
						<div class="mf-dial-top">
							<span class="mf-dial-label">{$i18n.t('Max Tokens')}</span>
							{#if (params.max_tokens ?? null) !== null}
								<button
									class="mf-dial-x"
									type="button"
									title={$i18n.t('Reset to default')}
									aria-label={$i18n.t('Reset to default')}
									on:click={() => (params.max_tokens = null)}
								>
									<svg
										width="9"
										height="9"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg
									>
								</button>
							{/if}
						</div>
						<p class="mf-dial-hint">{$i18n.t('the longest single response it may set')}</p>
						<div class="mf-line">
							<input
								class="mf-input mono"
								type="number"
								placeholder={$i18n.t('default')}
								value={params.max_tokens ?? ''}
								on:input={(e) =>
									(params.max_tokens =
										e.currentTarget.value === '' ? null : +e.currentTarget.value)}
							/>
							<div class="mf-rule" aria-hidden="true"></div>
						</div>
					</div>

					<div class="mf-dial">
						<div class="mf-dial-top">
							<span class="mf-dial-label">{$i18n.t('Seed')}</span>
							{#if (params.seed ?? null) !== null}
								<button
									class="mf-dial-x"
									type="button"
									title={$i18n.t('Reset to default')}
									aria-label={$i18n.t('Reset to default')}
									on:click={() => (params.seed = null)}
								>
									<svg
										width="9"
										height="9"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										stroke-linecap="round"
										aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg
									>
								</button>
							{/if}
						</div>
						<p class="mf-dial-hint">
							{$i18n.t('fix a seed and the same prompt sets the same type')}
						</p>
						<div class="mf-line">
							<input
								class="mf-input mono"
								type="number"
								placeholder={$i18n.t('default')}
								value={params.seed ?? ''}
								on:input={(e) =>
									(params.seed = e.currentTarget.value === '' ? null : +e.currentTarget.value)}
							/>
							<div class="mf-rule" aria-hidden="true"></div>
						</div>
					</div>
				</div>

				<div class="mf-dial">
					<div class="mf-dial-top">
						<span class="mf-dial-label">{$i18n.t('Stop Sequence')}</span>
						{#if (params.stop ?? null) !== null}
							<button
								class="mf-dial-x"
								type="button"
								title={$i18n.t('Reset to default')}
								aria-label={$i18n.t('Reset to default')}
								on:click={() => (params.stop = null)}
							>
								<svg
									width="9"
									height="9"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg
								>
							</button>
						{/if}
					</div>
					<p class="mf-dial-hint">
						{$i18n.t('sequences that end a response — comma separated')}
					</p>
					<div class="mf-line">
						<input
							class="mf-input mono"
							type="text"
							placeholder={$i18n.t('default')}
							value={params.stop ?? ''}
							on:input={(e) =>
								(params.stop = e.currentTarget.value === '' ? null : e.currentTarget.value)}
						/>
						<div class="mf-rule" aria-hidden="true"></div>
					</div>
				</div>

				<div class="mf-dial">
					<div class="mf-dial-top">
						<span class="mf-dial-label">{$i18n.t('TTS Voice')}</span>
					</div>
					<p class="mf-dial-hint">
						{$i18n.t('the voice it speaks aloud with — e.g. alloy, echo, shimmer')}
					</p>
					<div class="mf-line">
						<input
							class="mf-input"
							type="text"
							placeholder={$i18n.t('default')}
							bind:value={tts.voice}
						/>
						<div class="mf-rule" aria-hidden="true"></div>
					</div>
				</div>
			</div>

			<div class="mf-fullcase">
				<button class="mf-type-toggle" type="button" on:click={() => (fullCase = !fullCase)}>
					{fullCase ? $i18n.t('close the full type case') : $i18n.t('open the full type case')}
				</button>

				{#if fullCase}
					<div class="mf-group mf-advanced">
						<AdvancedParams admin={true} custom={true} grouped={true} bind:params />
					</div>
				{/if}
			</div>
		</section>

		<!-- ─── § 6 · audience ─── -->
		<section class="mf-sec reveal" style:--d="0.42s">
			<div class="mf-sec-head">
				<span class="mf-sec-no">§ 6</span>
				<h2 class="mf-sec-title">{$i18n.t('Audience')}</h2>
			</div>
			<p class="mf-sec-sub">{$i18n.t('Choose who can use this model.')}</p>

			<div class="mf-access">
				<AccessControl
					bind:accessGrants
					accessRoles={preset ? ['read', 'write'] : ['read']}
					share={$user?.permissions?.sharing?.models || $user?.role === 'admin'}
					sharePublic={$user?.permissions?.sharing?.public_models || $user?.role === 'admin'}
				/>
			</div>
		</section>

		<!-- ─── the seal ─── -->
		<div class="mf-seal-row reveal" style:--d="0.48s">
			<div class="mf-asterism" aria-hidden="true"><span>⁂</span></div>

			{#if !canSubmit}
				<span class="mf-hint">{$i18n.t('A name and a base model, and it can be bound.')}</span>
			{/if}

			<button
				class="mf-seal"
				type="button"
				disabled={!canSubmit || loading}
				on:click={submitHandler}
			>
				{#if loading}
					<Spinner className="size-4" />
				{/if}
				{edit ? $i18n.t('Save & Update') : $i18n.t('Bind the model')}
			</button>

			<div class="mf-colophon">
				<button class="mf-type-toggle" type="button" on:click={() => (showType = !showType)}>
					{showType ? $i18n.t('hide the type') : $i18n.t('view the type')}
				</button>
				<span class="fleuron">❧</span>
				<span>{id || 'model-id'}</span>
			</div>

			{#if showType}
				<div class="mf-json">
					<span class="mf-json-lang">json</span>
					<pre>{JSON.stringify(info, null, 2)}</pre>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<div class="w-full h-full flex justify-center items-center py-20">
		<Spinner className="size-5" />
	</div>
{/if}

<style>
	.mf {
		max-width: 720px;
		margin: 0 auto;
		padding: 26px 8px 90px;
	}

	.mf-kicker-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 30px;
	}
	.mf-kicker {
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--vermilion);
	}
	.mf-ghost {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		border: none;
		background: transparent;
		color: var(--ink-3);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			transform 0.15s;
	}
	.mf-ghost:hover {
		background: var(--rule-faint);
		color: var(--ink);
	}
	.mf-ghost:active {
		transform: scale(0.92);
	}

	/* ── letterhead ── */
	.mf-letterhead {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
	}
	.mf-plate-wrap {
		display: flex;
		flex-direction: column;
		align-items: center;
	}
	.mf-plate {
		position: relative;
		border: none;
		padding: 0;
		background: none;
		border-radius: 18px;
		overflow: hidden;
		cursor: pointer;
		transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.mf-plate:hover {
		transform: translateY(-2px);
	}
	.mf-plate:active {
		transform: scale(0.97);
	}
	.mf-plate img {
		display: block;
		width: 104px;
		height: 104px;
		object-fit: cover;
		border-radius: 18px;
		border: 1px solid var(--rule);
		background: var(--paper-deep);
		box-shadow: 0 14px 34px -20px rgba(0, 0, 0, 0.4);
	}
	.mf-plate-veil {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--serif);
		font-style: italic;
		font-size: 14px;
		color: #fff8ef;
		background: rgba(20, 16, 10, 0.45);
		opacity: 0;
		transition: opacity 0.2s;
	}
	.mf-plate:hover .mf-plate-veil {
		opacity: 1;
	}
	.mf-plate-actions {
		display: flex;
		gap: 4px;
		margin-top: 8px;
		opacity: 0.55;
		transition: opacity 0.25s;
	}
	.mf-plate-wrap:hover .mf-plate-actions,
	.mf-plate-actions:focus-within {
		opacity: 1;
	}

	.mf-name {
		margin-top: 20px;
		width: 100%;
		text-align: center;
		font-family: var(--serif);
		font-size: clamp(30px, 5vw, 42px);
		line-height: 1.1;
		color: var(--ink);
		background: transparent;
		border: none;
		outline: none;
		caret-color: var(--vermilion);
	}
	.mf-name::placeholder {
		font-style: italic;
		color: var(--ink-3);
	}

	.mf-id {
		margin-top: 4px;
		width: 100%;
		text-align: center;
		font-family: var(--mono);
		font-size: 11px;
		color: var(--ink-3);
		background: transparent;
		border: none;
		outline: none;
		caret-color: var(--vermilion);
		border-bottom: 1px dashed transparent;
		transition: color 0.2s;
	}
	.mf-id:focus {
		color: var(--ink-2);
	}
	.mf-id:disabled {
		opacity: 0.8;
	}

	.mf-byline {
		margin-top: 16px;
		display: flex;
		align-items: baseline;
		gap: 8px;
		font-size: 13.5px;
		color: var(--ink-2);
	}
	.mf-base {
		appearance: none;
		-webkit-appearance: none;
		font-family: var(--serif);
		font-style: italic;
		font-size: 15.5px;
		color: var(--ultramarine);
		background: transparent;
		border: none;
		border-bottom: 1px dashed var(--rule);
		outline: none;
		cursor: pointer;
		padding: 0 2px 2px;
		max-width: 320px;
		text-overflow: ellipsis;
		transition:
			color 0.2s,
			border-color 0.2s;
	}
	.mf-base.unset {
		color: var(--vermilion);
		border-bottom-color: color-mix(in srgb, var(--vermilion) 50%, transparent);
	}
	.mf-base:hover {
		border-bottom-color: var(--ink-3);
	}
	.mf-base-wrap {
		position: relative;
		display: inline-flex;
		align-items: baseline;
	}
	.mf-base-wrap .mf-base {
		padding-right: 16px;
	}
	.mf-base-chev {
		position: absolute;
		right: 2px;
		bottom: 6px;
		color: var(--ink-3);
		pointer-events: none;
	}

	.mf-desc {
		margin-top: 14px;
		width: 100%;
		max-width: 480px;
		text-align: center;
		font-family: var(--serif);
		font-style: italic;
		font-size: 15.5px;
		color: var(--ink-2);
		background: transparent;
		border: none;
		outline: none;
		caret-color: var(--vermilion);
	}
	.mf-desc::placeholder {
		color: var(--ink-3);
	}

	.mf-tags {
		margin-top: 12px;
		width: 100%;
		max-width: 380px;
	}
	/* the Tags chips arrive in stock gray — re-set them as little type slugs */
	.mf-tags :global(.flex.flex-wrap) {
		justify-content: center;
	}
	.mf-tags :global([class*='bg-gray-']) {
		background: transparent !important;
		border: 1px dashed var(--rule) !important;
		color: var(--ink-2) !important;
		font-family: var(--mono);
		font-size: 10px !important;
		font-weight: 400 !important;
		padding: 2px 9px !important;
		transition:
			border-color 0.2s,
			color 0.2s,
			background 0.2s;
	}
	.mf-tags :global(button[class*='bg-gray-']:hover) {
		border-color: color-mix(in srgb, var(--vermilion) 50%, transparent) !important;
		color: var(--vermilion) !important;
		background: var(--vermilion-soft) !important;
	}
	.mf-tags :global(input) {
		flex: 0 1 130px !important;
		font-family: var(--serif);
		font-style: italic;
		font-size: 13px;
		text-align: center;
		caret-color: var(--vermilion);
		color: var(--ink-2);
	}
	.mf-tags :global(input)::placeholder {
		color: var(--ink-3) !important;
	}

	.mf-asterism {
		display: flex;
		align-items: center;
		gap: 16px;
		width: 100%;
		margin: 30px 0 0;
		color: var(--ink-3);
		font-size: 13px;
	}
	.mf-asterism::before,
	.mf-asterism::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--rule-faint);
	}

	/* ── sections ── */
	.mf-sec {
		margin-top: 46px;
	}
	.mf-sec-head {
		display: flex;
		align-items: baseline;
		gap: 12px;
	}
	.mf-sec-no {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.14em;
		color: var(--vermilion);
	}
	.mf-sec-title {
		font-family: var(--serif);
		font-size: 23px;
		font-weight: 400;
		margin: 0;
	}
	.mf-sec-sub {
		font-family: var(--serif);
		font-style: italic;
		font-size: 13.5px;
		color: var(--ink-3);
		margin: 5px 0 16px;
	}

	.mf-group {
		margin-top: 18px;
	}
	.mf-group-label {
		display: block;
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ink-2);
		margin-bottom: 9px;
	}
	.mf-group-label.dim {
		color: var(--ink-3);
	}
	.mf-subgroup {
		margin-top: 12px;
		padding-left: 14px;
		border-left: 1px solid var(--rule-faint);
	}
	.mf-quiet {
		font-family: var(--serif);
		font-style: italic;
		font-size: 13.5px;
		color: var(--ink-3);
		margin: 0;
	}

	/* ── writing lines ── */
	.mf-line {
		position: relative;
	}
	.mf-textarea {
		display: block;
		width: 100%;
		background: transparent;
		border: none;
		outline: none;
		resize: none;
		overflow-y: hidden;
		font-family: var(--body, inherit);
		font-size: 15px;
		line-height: 1.62;
		color: var(--ink);
		caret-color: var(--vermilion);
		padding: 2px 0 10px;
	}
	.mf-input {
		display: block;
		width: 100%;
		background: transparent;
		border: none;
		outline: none;
		font-size: 14px;
		color: var(--ink);
		caret-color: var(--vermilion);
		padding: 2px 0 8px;
	}
	.mf-textarea::placeholder,
	.mf-input::placeholder {
		font-family: var(--serif);
		font-style: italic;
		font-size: 15px;
		color: var(--ink-3);
	}
	.mf-rule {
		height: 1.5px;
		background: var(--rule);
		border-radius: 999px;
		position: relative;
		overflow: hidden;
	}
	.mf-rule::after {
		content: '';
		position: absolute;
		inset: 0;
		background: var(--vermilion);
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.mf-line:focus-within .mf-rule::after {
		transform: scaleX(1);
	}

	/* ── tuning registers ── */
	.mf-dials {
		display: flex;
		flex-direction: column;
		gap: 26px;
	}
	.mf-dial-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 26px 32px;
	}
	.mf-dial-top {
		display: flex;
		align-items: baseline;
		gap: 8px;
	}
	.mf-dial-label {
		font-size: 10.5px;
		font-weight: 650;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--ink-2);
	}
	.mf-dial-val {
		margin-left: auto;
		font-family: var(--mono);
		font-size: 11.5px;
		color: var(--ink);
	}
	.mf-dial-val.default {
		font-family: var(--serif);
		font-style: italic;
		font-size: 12.5px;
		color: var(--ink-3);
	}
	.mf-dial-x {
		flex: none;
		align-self: center;
		display: grid;
		place-items: center;
		width: 18px;
		height: 18px;
		border-radius: 6px;
		border: none;
		background: transparent;
		color: var(--ink-3);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.mf-dial-x:hover {
		background: var(--rule-faint);
		color: var(--vermilion);
	}
	/* in registers without a value column, the strike sits at the right edge */
	.mf-dial-label + .mf-dial-x {
		margin-left: auto;
	}
	.mf-dial-hint {
		font-family: var(--serif);
		font-style: italic;
		font-size: 12.5px;
		color: var(--ink-3);
		margin: 3px 0 8px;
	}

	/* the register itself: a writing line with a bead — hollow means default */
	.mf-dial input[type='range'] {
		-webkit-appearance: none;
		appearance: none;
		display: block;
		width: 100%;
		height: 16px;
		margin: 0;
		background: transparent;
		cursor: pointer;
	}
	.mf-dial input[type='range']::-webkit-slider-runnable-track {
		height: 1.5px;
		border-radius: 999px;
		background: linear-gradient(
			to right,
			color-mix(in srgb, var(--vermilion) 75%, transparent) var(--pct, 0%),
			var(--rule) var(--pct, 0%)
		);
	}
	.mf-dial input[type='range']::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 13px;
		height: 13px;
		margin-top: -5.75px;
		border-radius: 50%;
		background: var(--paper);
		border: 1.5px solid var(--ink-3);
		transition:
			transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
			background 0.2s,
			border-color 0.2s;
	}
	.mf-dial input[type='range'].set::-webkit-slider-thumb {
		background: var(--vermilion);
		border-color: var(--vermilion);
	}
	.mf-dial input[type='range']:hover::-webkit-slider-thumb {
		transform: scale(1.25);
	}
	.mf-dial input[type='range']::-moz-range-track {
		height: 1.5px;
		border-radius: 999px;
		background: var(--rule);
	}
	.mf-dial input[type='range']::-moz-range-progress {
		height: 1.5px;
		border-radius: 999px;
		background: color-mix(in srgb, var(--vermilion) 75%, transparent);
	}
	.mf-dial input[type='range']:not(.set)::-moz-range-progress {
		background: transparent;
	}
	.mf-dial input[type='range']::-moz-range-thumb {
		width: 13px;
		height: 13px;
		border-radius: 50%;
		background: var(--paper);
		border: 1.5px solid var(--ink-3);
		transition:
			background 0.2s,
			border-color 0.2s;
	}
	.mf-dial input[type='range'].set::-moz-range-thumb {
		background: var(--vermilion);
		border-color: var(--vermilion);
	}

	.mf-input.mono {
		font-family: var(--mono);
		font-size: 12.5px;
	}
	.mf-input::-webkit-outer-spin-button,
	.mf-input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	.mf-input[type='number'] {
		-moz-appearance: textfield;
		appearance: textfield;
	}

	.mf-fullcase {
		margin-top: 30px;
		padding-top: 14px;
		border-top: 1px solid var(--rule-faint);
	}
	.mf-fullcase .mf-group {
		margin-top: 16px;
	}

	/* ── stamps ── */
	.mf-stamps {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	.mf-stamp {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 14px 6px 8px;
		border-radius: 999px;
		border: 1px dashed var(--rule);
		background: transparent;
		font-family: var(--mono);
		font-size: 11.5px;
		color: var(--ink-2);
		cursor: pointer;
		transition:
			border-color 0.2s,
			background 0.2s,
			color 0.2s,
			transform 0.15s;
	}
	.mf-stamp:hover {
		color: var(--ink);
		background: var(--rule-faint);
	}
	.mf-stamp:active {
		transform: scale(0.96);
	}
	.mf-stamp.on {
		border-style: solid;
		border-color: color-mix(in srgb, var(--vermilion) 45%, transparent);
		background: var(--vermilion-soft);
		color: var(--ink);
	}

	.seal {
		flex: none;
		width: 13px;
		height: 13px;
		border-radius: 50%;
		border: 1.5px solid var(--ink-3);
		display: grid;
		place-items: center;
		color: transparent;
		transition:
			border-color 0.2s,
			color 0.2s;
	}
	.mf-stamp.on .seal,
	.mf-cap.on .seal {
		border-color: var(--vermilion);
		color: var(--vermilion);
		animation: sealIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes sealIn {
		from {
			transform: scale(1.5);
		}
		to {
			transform: scale(1);
		}
	}

	/* ── faculties ── */
	.mf-caps {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 6px 14px;
	}
	.mf-cap {
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
	.mf-cap:hover {
		background: var(--rule-faint);
	}
	.mf-cap .seal {
		margin-top: 2px;
	}
	.mf-cap-text {
		display: flex;
		flex-direction: column;
		gap: 1px;
		min-width: 0;
	}
	.mf-cap-label {
		font-size: 13.5px;
		font-weight: 560;
		color: var(--ink-2);
		line-height: 1.3;
		transition: color 0.15s;
	}
	.mf-cap.on .mf-cap-label {
		color: var(--ink);
	}
	.mf-cap-desc {
		font-size: 11.5px;
		color: var(--ink-3);
		line-height: 1.4;
	}
	.mf-cap.disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	.mf-cap.disabled:hover {
		background: transparent;
	}

	/* ── the seal ── */
	.mf-seal-row {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		margin-top: 54px;
	}
	.mf-seal-row .mf-asterism {
		margin: 0 0 18px;
	}
	.mf-hint {
		font-family: var(--serif);
		font-style: italic;
		font-size: 13.5px;
		color: var(--ink-3);
	}
	.mf-seal {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		padding: 12px 28px;
		border-radius: 999px;
		border: 1.5px solid var(--vermilion);
		background: var(--vermilion);
		color: #fff8ef;
		font-size: 14px;
		font-weight: 620;
		letter-spacing: 0.02em;
		cursor: pointer;
		box-shadow: 0 6px 22px -10px color-mix(in srgb, var(--vermilion) 60%, transparent);
		transition:
			transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
			box-shadow 0.25s,
			background 0.25s,
			border-color 0.25s,
			color 0.25s;
	}
	.mf-seal:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 10px 28px -12px color-mix(in srgb, var(--vermilion) 65%, transparent);
	}
	.mf-seal:active:not(:disabled) {
		transform: scale(0.96);
	}
	.mf-seal:disabled {
		background: transparent;
		border: 1.5px dashed var(--rule);
		color: var(--ink-3);
		box-shadow: none;
		cursor: not-allowed;
	}

	.mf-colophon {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-top: 16px;
		font-size: 10.5px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--ink-3);
	}
	.fleuron {
		font-size: 13px;
		text-transform: none;
		color: var(--vermilion);
		opacity: 0.7;
	}
	.mf-type-toggle {
		border: none;
		background: none;
		font: inherit;
		letter-spacing: inherit;
		text-transform: inherit;
		color: var(--ink-3);
		cursor: pointer;
		border-bottom: 1px dotted var(--rule);
		padding: 0;
		transition: color 0.2s;
	}
	.mf-type-toggle:hover {
		color: var(--vermilion);
	}

	.mf-json {
		position: relative;
		width: 100%;
		background: var(--code-bg, rgba(38, 34, 27, 0.045));
		border: 1px solid var(--rule-faint);
		border-radius: 10px;
		padding: 16px 18px 14px;
		margin-top: 6px;
	}
	.mf-json pre {
		margin: 0;
		font-family: var(--mono);
		font-size: 12px;
		line-height: 1.65;
		color: var(--ink);
		white-space: pre;
		overflow-x: auto;
		max-height: 420px;
		overflow-y: auto;
	}
	.mf-json-lang {
		position: absolute;
		top: 10px;
		right: 14px;
		font-family: var(--mono);
		font-size: 9.5px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--ink-3);
	}

	/* ── re-inking the reused passages ──
	   AdvancedParams, AccessControl, Tags & co. arrive set in cool
	   tailwind grays; on this paper every grey becomes an ink. */
	.mf :global([class*='text-gray-3']),
	.mf :global([class*='text-gray-4']) {
		color: var(--ink-3) !important;
	}
	.mf :global([class*='text-gray-5']),
	.mf :global([class*='text-gray-6']),
	.mf :global([class*='text-gray-7']) {
		color: var(--ink-2) !important;
	}
	/* switches: emerald → the press's own green, gray track → a rule */
	.mf :global([class*='bg-emerald-']) {
		background-color: var(--ok, #3d7a46) !important;
	}
	.mf :global(.bg-gray-200) {
		background-color: var(--rule) !important;
	}
	.mf :global([class*='outline-gray-']) {
		outline-color: var(--rule) !important;
	}

	/* advanced parameters: mono digits, vermilion state-toggles, inked sliders */
	.mf-advanced :global([class*='rounded-sm']) {
		font-family: var(--mono);
		font-size: 10px !important;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--vermilion);
	}
	.mf-advanced :global(input[type='number']),
	.mf-advanced :global(input[type='text']) {
		font-family: var(--mono);
		font-size: 11.5px;
		color: var(--ink);
	}
	.mf-advanced :global(select) {
		font-family: var(--mono);
		font-size: 11.5px;
		background: transparent;
		color: var(--ink);
	}
	.mf-advanced :global(input[type='range']) {
		height: 2px !important;
		background: var(--rule) !important;
		border-radius: 999px;
	}
	.mf-advanced :global(input[type='range']::-webkit-slider-thumb) {
		-webkit-appearance: none;
		appearance: none;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--vermilion);
		border: none;
		cursor: pointer;
	}
	.mf-advanced :global(input[type='range']::-moz-range-thumb) {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: var(--vermilion);
		border: none;
		cursor: pointer;
	}

	/* audience: the visibility select reads like the lineage line */
	.mf-access :global(select) {
		font-family: var(--serif);
		font-style: italic;
		font-size: 15.5px !important;
		color: var(--ink);
		cursor: pointer;
	}

	/* ── reveal ── */
	.reveal {
		opacity: 0;
		transform: translateY(10px);
		animation: mfRise 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
		animation-delay: var(--d, 0s);
	}
	@keyframes mfRise {
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mf *,
		.mf *::before,
		.mf *::after {
			animation-duration: 0.01ms !important;
			animation-delay: 0s !important;
			transition-duration: 0.01ms !important;
		}
	}
</style>
