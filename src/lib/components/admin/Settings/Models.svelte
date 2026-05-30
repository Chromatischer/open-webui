<script lang="ts">
	import { onMount, getContext, tick } from 'svelte';
	const i18n = getContext('i18n');

	import { WEBUI_NAME, config, mobile, models as _models, settings } from '$lib/stores';
	import {
		createNewModel,
		getBaseModels,
		toggleModelById,
		updateModelById
	} from '$lib/apis/models';
	import { page } from '$app/stores';

	import { getModels } from '$lib/apis';
	import Search from '$lib/components/icons/Search.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';

	import ModelWizard from '$lib/components/workspace/Models/ModelWizard.svelte';
	import { toast } from 'svelte-sonner';
	import Badge from '$lib/components/common/Badge.svelte';
	import ModelSettingsModal from './Models/ModelSettingsModal.svelte';
	import EllipsisHorizontal from '$lib/components/icons/EllipsisHorizontal.svelte';
	import EyeSlash from '$lib/components/icons/EyeSlash.svelte';
	import Eye from '$lib/components/icons/Eye.svelte';
	import CheckCircle from '$lib/components/icons/CheckCircle.svelte';
	import Minus from '$lib/components/icons/Minus.svelte';
	import Pencil from '$lib/components/icons/Pencil.svelte';
	import Cog6 from '$lib/components/icons/Cog6.svelte';
	import { WEBUI_API_BASE_URL } from '$lib/constants';

	import Dropdown from '$lib/components/common/Dropdown.svelte';

	// When rendered inside the Admin Settings shell the surrounding page already
	// provides the "Models" title + description, so suppress this component's own
	// heading and lean on the shell's chrome.
	export let embedded = false;

	let models = null;

	let workspaceModels = null;
	let baseModels = null;

	let filteredModels = [];
	let selectedModelId = null;

	let showConfigModal = false;

	let viewOption = ''; // '' = All, 'enabled', 'disabled', 'visible', 'hidden'

	// Infinite scroll: render `displayLimit` cards, growing by `perPage` as the
	// sentinel near the bottom of the grid scrolls into view.
	const perPage = 30;
	let displayLimit = perPage;

	$: visibleModels = filteredModels.slice(0, displayLimit);
	$: editModel =
		selectedModelId !== null ? (models ?? []).find((m) => m.id === selectedModelId) : null;

	const loadMore = () => {
		if (displayLimit < filteredModels.length) {
			displayLimit += perPage;
		}
	};

	const infiniteScroll = (node: HTMLElement) => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) loadMore();
			},
			{ rootMargin: '400px' }
		);
		observer.observe(node);
		return {
			destroy() {
				observer.disconnect();
			}
		};
	};

	const isPublicModel = (model) => {
		return (model?.access_grants ?? []).some(
			(g) => g.principal_type === 'user' && g.principal_id === '*' && g.permission === 'read'
		);
	};

	$: if (models) {
		filteredModels = models
			.filter((m) => searchValue === '' || m.name.toLowerCase().includes(searchValue.toLowerCase()))
			.filter((m) => {
				if (viewOption === 'enabled') return m?.is_active ?? true;
				if (viewOption === 'disabled') return !(m?.is_active ?? true);
				if (viewOption === 'visible') return !(m?.meta?.hidden ?? false);
				if (viewOption === 'hidden') return m?.meta?.hidden === true;
				if (viewOption === 'public') return isPublicModel(m);
				if (viewOption === 'private') return !isPublicModel(m);
				return true; // All
			})
			.sort((a, b) => {
				return (a?.name ?? a?.id ?? '').localeCompare(b?.name ?? b?.id ?? '');
			});
	}

	let searchValue = '';

	$: if (searchValue || viewOption !== undefined) {
		displayLimit = perPage;
	}

	const enableAllHandler = async () => {
		const modelsToEnable = filteredModels.filter((m) => !(m.is_active ?? true));
		// Optimistic UI update
		modelsToEnable.forEach((m) => (m.is_active = true));
		models = models;
		// Sync with server
		await Promise.all(
			modelsToEnable.map((model) => upsertModelHandler(model, { is_active: true }, false))
		);

		await tick();
		await init();
	};

	const disableAllHandler = async () => {
		const modelsToDisable = filteredModels.filter((m) => m.is_active ?? true);
		// Optimistic UI update
		modelsToDisable.forEach((m) => (m.is_active = false));
		models = models;
		// Sync with server
		await Promise.all(
			modelsToDisable.map((model) => upsertModelHandler(model, { is_active: false }, false))
		);

		await tick();
		await init();
	};

	const showAllHandler = async () => {
		const modelsToShow = filteredModels.filter((m) => m?.meta?.hidden === true);
		// Optimistic UI update
		modelsToShow.forEach((m) => {
			m.meta = { ...m.meta, hidden: false };
		});
		models = models;
		// Sync with server
		await Promise.all(
			modelsToShow.map((model) =>
				upsertModelHandler(model, { meta: { ...model.meta, hidden: false } }, false)
			)
		);

		toast.success($i18n.t('All models are now visible'));
		await tick();
		await init();
	};

	const hideAllHandler = async () => {
		const modelsToHide = filteredModels.filter((m) => !(m?.meta?.hidden ?? false));
		// Optimistic UI update
		modelsToHide.forEach((m) => {
			m.meta = { ...m.meta, hidden: true };
		});
		models = models;
		// Sync with server
		await Promise.all(
			modelsToHide.map((model) =>
				upsertModelHandler(model, { meta: { ...model.meta, hidden: true } }, false)
			)
		);

		toast.success($i18n.t('All models are now hidden'));
		await tick();
		await init();
	};

	const init = async () => {
		models = null;

		workspaceModels = await getBaseModels(localStorage.token);
		baseModels = await getModels(localStorage.token, null, true);

		models = baseModels.map((m) => {
			const workspaceModel = workspaceModels.find((wm) => wm.id === m.id);

			if (workspaceModel) {
				return {
					...m,
					...workspaceModel
				};
			} else {
				return {
					...m,
					id: m.id,
					name: m.name,

					is_active: true
				};
			}
		});

		_models.set(
			await getModels(
				localStorage.token,
				$config?.features?.enable_direct_connections && ($settings?.directConnections ?? null)
			)
		);
	};

	const upsertModelHandler = async (model, overrides = {}, showToast = true) => {
		model = { ...model, base_model_id: null, ...overrides };

		if (workspaceModels.find((m) => m.id === model.id)) {
			const res = await updateModelById(localStorage.token, model.id, model).catch((error) => {
				return null;
			});

			if (res && showToast) {
				toast.success($i18n.t('Model updated successfully'));
			}
		} else {
			const res = await createNewModel(localStorage.token, {
				meta: {},
				id: model.id,
				name: model.name,
				base_model_id: null,
				params: {},
				access_grants: [],
				...model
			}).catch((error) => {
				return null;
			});

			if (res && showToast) {
				toast.success($i18n.t('Model updated successfully'));
				await init();
			}
		}
	};

	// Card actions: the old <Switch> flipped `is_active` via bind:state before
	// firing its handler. Without a switch we flip locally first, then delegate
	// to the existing server sync, reassigning `models` for reactivity.
	const toggleEnabledHandler = async (model) => {
		model.is_active = !(model?.is_active ?? true);
		models = models;
		await toggleModelHandler(model);
	};

	const toggleHiddenHandler = async (model) => {
		await hideModelHandler(model);
		models = models;
	};

	const toggleModelHandler = async (model) => {
		if (!Object.keys(model).includes('base_model_id')) {
			await createNewModel(localStorage.token, {
				id: model.id,
				name: model.name,
				base_model_id: null,
				meta: {},
				params: {},
				access_grants: [],
				is_active: model.is_active
			}).catch((error) => {
				return null;
			});
		} else {
			await toggleModelById(localStorage.token, model.id);
		}

		// await init();
		_models.set(
			await getModels(
				localStorage.token,
				$config?.features?.enable_direct_connections && ($settings?.directConnections ?? null)
			)
		);
	};

	const hideModelHandler = async (model) => {
		model.meta = {
			...model.meta,
			hidden: !(model?.meta?.hidden ?? false)
		};

		console.debug(model);

		upsertModelHandler(model, { meta: model.meta }, false);

		toast.success(
			model.meta.hidden
				? $i18n.t(`Model {{name}} is now hidden`, {
						name: model.id
					})
				: $i18n.t(`Model {{name}} is now visible`, {
						name: model.id
					})
		);
	};

	onMount(async () => {
		await init();
		const id = $page.url.searchParams.get('id');

		if (id) {
			selectedModelId = id;
		}
	});
</script>

<ModelSettingsModal bind:show={showConfigModal} initHandler={init} />

{#if editModel}
	<ModelWizard
		edit
		preset={false}
		model={editModel}
		onSubmit={async (model) => {
			await upsertModelHandler(model);
			selectedModelId = null;
			await init();
		}}
		onClose={() => {
			selectedModelId = null;
		}}
	/>
{/if}

{#if models !== null}
	{#if !embedded}
		<div class="flex items-center text-xl font-medium px-0.5 gap-2 shrink-0 mt-1.5 mb-2">
			<div>{$i18n.t('Models')}</div>
			<div class="text-lg font-medium text-gray-500 dark:text-gray-500">
				{filteredModels.length}
			</div>
		</div>
	{/if}

	<div class="mp-wrap">
		<div class="mp-toolbar">
			<div class="ws-search">
				<Search className="size-3.5" />
				<input bind:value={searchValue} placeholder={$i18n.t('Search Models')} />
				{#if searchValue}
					<button
						class="btn-clear p-0.5"
						aria-label={$i18n.t('Clear search')}
						on:click={() => {
							searchValue = '';
						}}
					>
						<XMark className="size-3" strokeWidth="2" />
					</button>
				{/if}
			</div>

			<div class="ws-chips mp-chips">
				<button class="ws-chip {viewOption === '' ? 'on' : ''}" on:click={() => (viewOption = '')}>
					{$i18n.t('All')}<span class="cnt">{filteredModels.length}</span>
				</button>
				<button
					class="ws-chip {viewOption === 'enabled' ? 'on' : ''}"
					on:click={() => (viewOption = 'enabled')}
				>
					{$i18n.t('Enabled')}
				</button>
				<button
					class="ws-chip {viewOption === 'disabled' ? 'on' : ''}"
					on:click={() => (viewOption = 'disabled')}
				>
					{$i18n.t('Disabled')}
				</button>
				<button
					class="ws-chip {viewOption === 'hidden' ? 'on' : ''}"
					on:click={() => (viewOption = 'hidden')}
				>
					{$i18n.t('Hidden')}
				</button>
				<button
					class="ws-chip {viewOption === 'public' ? 'on' : ''}"
					on:click={() => (viewOption = 'public')}
				>
					{$i18n.t('Public')}
				</button>
				<button
					class="ws-chip {viewOption === 'private' ? 'on' : ''}"
					on:click={() => (viewOption = 'private')}
				>
					{$i18n.t('Private')}
				</button>
			</div>

			<Dropdown>
				<Tooltip content={$i18n.t('Bulk actions')}>
					<button class="mp-iconbtn" type="button" aria-label={$i18n.t('Bulk actions')}>
						<EllipsisHorizontal className="size-4" />
					</button>
				</Tooltip>

				<div slot="content">
					<div
						class="w-[180px] rounded-xl p-1 border border-gray-100 dark:border-gray-800 z-50 bg-white dark:bg-gray-850 dark:text-white shadow-sm"
					>
						<button
							class="select-none flex w-full gap-2 items-center px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
							type="button"
							on:click={() => {
								showConfigModal = true;
							}}
						>
							<Cog6 className="size-4" />
							<div class="flex items-center">{$i18n.t('Settings')}</div>
						</button>

						<hr class="border-gray-100 dark:border-gray-800 my-1" />

						<button
							class="select-none flex w-full gap-2 items-center px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
							type="button"
							on:click={() => {
								enableAllHandler();
							}}
						>
							<CheckCircle className="size-4" />
							<div class="flex items-center">{$i18n.t('Enable All')}</div>
						</button>

						<button
							class="select-none flex w-full gap-2 items-center px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
							type="button"
							on:click={() => {
								disableAllHandler();
							}}
						>
							<Minus className="size-4" />
							<div class="flex items-center">{$i18n.t('Disable All')}</div>
						</button>

						<hr class="border-gray-100 dark:border-gray-800 my-1" />

						<button
							class="select-none flex w-full gap-2 items-center px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
							type="button"
							on:click={() => {
								showAllHandler();
							}}
						>
							<Eye className="size-4" />
							<div class="flex items-center">{$i18n.t('Show All')}</div>
						</button>

						<button
							class="select-none flex w-full gap-2 items-center px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
							type="button"
							on:click={() => {
								hideAllHandler();
							}}
						>
							<EyeSlash className="size-4" />
							<div class="flex items-center">{$i18n.t('Hide All')}</div>
						</button>
					</div>
				</div>
			</Dropdown>
		</div>

		<div class="ws-grid" id="model-list">
			{#each visibleModels as model, modelIdx (`${model.id}-${modelIdx}`)}
				{@const enabled = model?.is_active ?? true}
				{@const hidden = model?.meta?.hidden ?? false}
				{@const description = (model?.meta?.description ?? '').trim() || model.id}
				<div
					class="mp-card {enabled ? 'on' : 'off'} {hidden ? 'is-hidden' : ''}"
					id="model-item-{model.id}"
					role="button"
					tabindex="0"
					aria-pressed={enabled}
					title={enabled ? $i18n.t('Click to disable') : $i18n.t('Click to enable')}
					on:click={() => toggleEnabledHandler(model)}
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							toggleEnabledHandler(model);
						}
					}}
				>
					<div class="mp-top">
						<img
							class="mp-avatar"
							class:dim={!enabled}
							src={`${WEBUI_API_BASE_URL}/models/model/profile/image?id=${encodeURIComponent(
								model.id
							)}`}
							alt="modelfile profile"
							loading="lazy"
							decoding="async"
							on:error={(e) => {
								e.target.src = '/favicon.png';
							}}
						/>
						<div class="min-w-0 flex-1">
							<div class="mp-name" title={model.name}>{model.name}</div>
							<div class="mp-id" title={model.id}>{model.id}</div>
						</div>

						<div class="mp-act">
							<Tooltip content={$i18n.t('Edit')}>
								<button
									class="mp-icon"
									type="button"
									aria-label={$i18n.t('Edit model')}
									on:click|stopPropagation={() => {
										selectedModelId = model.id;
									}}
								>
									<Pencil className="size-4" />
								</button>
							</Tooltip>
							<Tooltip content={hidden ? $i18n.t('Hidden') : $i18n.t('Visible')}>
								<button
									class="mp-icon"
									type="button"
									aria-label={hidden ? $i18n.t('Show model') : $i18n.t('Hide model')}
									on:click|stopPropagation={() => toggleHiddenHandler(model)}
								>
									{#if hidden}
										<EyeSlash className="size-4" />
									{:else}
										<Eye className="size-4" />
									{/if}
								</button>
							</Tooltip>
						</div>
					</div>

					<div class="mp-desc">{description}</div>

					<div class="mp-foot">
						<Badge
							type={isPublicModel(model) ? 'success' : 'muted'}
							content={isPublicModel(model) ? $i18n.t('Public') : $i18n.t('Private')}
						/>
						{#if hidden}
							<span class="mp-flag"><EyeSlash className="size-3" />{$i18n.t('Hidden')}</span>
						{/if}
						{#if !enabled}
							<span class="mp-flag off">{$i18n.t('Disabled')}</span>
						{/if}
					</div>
				</div>
			{/each}

			{#if filteredModels.length === 0}
				<div class="ws-empty">
					{#if searchValue || viewOption}
						{$i18n.t('No models match your search or filter.')}
					{:else}
						{$i18n.t('No models available.')}
					{/if}
				</div>
			{/if}
		</div>

		{#if visibleModels.length < filteredModels.length}
			<div class="mp-sentinel" use:infiniteScroll>
				<Spinner className="size-4" />
			</div>
		{/if}
	</div>
{:else}
	<div class=" h-full w-full flex justify-center items-center">
		<Spinner className="size-5" />
	</div>
{/if}

<style>
	.mp-wrap {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	/* Toolbar: search grows, filter chips wrap, bulk-actions button trails */
	.mp-toolbar {
		display: flex;
		align-items: center;
		gap: 10px;
		flex-wrap: wrap;
	}
	.mp-chips {
		flex-wrap: wrap;
	}

	/* Header / toolbar buttons */
	:global(.mp-btn) {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
		font-weight: 500;
		padding: 7px 12px;
		border-radius: 10px;
		background: var(--surface);
		color: var(--text-secondary);
		border: 1px solid transparent;
		white-space: nowrap;
		transition:
			background 0.2s ease,
			color 0.2s ease,
			transform 0.1s ease;
	}
	:global(.mp-btn:hover) {
		background: var(--surface-hover);
		color: var(--text);
	}
	:global(.mp-btn:active) {
		transform: scale(0.97);
	}
	:global(.mp-btn:disabled) {
		opacity: 0.5;
		cursor: default;
	}
	:global(.mp-btn.primary) {
		background: var(--accent);
		color: #fff;
		font-weight: 600;
	}
	:global(.mp-btn.primary:hover) {
		background: var(--accent-soft, var(--accent));
		color: #fff;
	}

	.mp-iconbtn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 6px;
		border-radius: 10px;
		color: var(--text-secondary);
		transition:
			background 0.2s ease,
			color 0.2s ease;
	}
	.mp-iconbtn:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	.btn-clear {
		background: transparent;
		border-radius: 50%;
		color: var(--text-tertiary);
		transition:
			background 0.2s,
			color 0.2s;
	}
	.btn-clear:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	/* Model card — the whole card is a toggle: click flips active/inactive.
	   Active (enabled) = accent border + glow tint + accent title;
	   inactive (disabled) = neutral + dimmed. (no switch, per design ethos) */
	.mp-card {
		display: flex;
		flex-direction: column;
		padding: 14px;
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		border-radius: 16px;
		cursor: pointer;
		color: var(--text);
		text-align: left;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease,
			border-color 0.2s ease,
			background 0.2s ease,
			opacity 0.2s ease;
	}
	.mp-card:hover {
		box-shadow: 0 4px 14px var(--shadow-color);
		transform: translateY(-2px);
	}
	.mp-card:active {
		transform: scale(0.98);
	}
	.mp-card.on {
		border-color: var(--accent);
		background: var(--accent-glow);
	}
	.mp-card.on .mp-name {
		color: var(--accent);
	}
	.mp-card.off {
		opacity: 0.6;
	}
	.mp-card.off:hover {
		opacity: 1;
	}
	.mp-card.is-hidden {
		opacity: 0.55;
	}
	.mp-card.is-hidden:hover {
		opacity: 1;
	}

	/* Infinite-scroll sentinel */
	.mp-sentinel {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px 0;
		color: var(--text-tertiary);
	}

	.mp-top {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 10px;
	}
	.mp-avatar {
		width: 40px;
		height: 40px;
		border-radius: 12px;
		object-fit: cover;
		background: var(--surface-active);
		flex: none;
		transition: opacity 0.2s ease;
	}
	.mp-avatar.dim {
		opacity: 0.5;
	}
	.mp-name {
		font-weight: 600;
		font-size: 14px;
		line-height: 1.2;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.mp-id {
		font-size: 11px;
		color: var(--text-tertiary);
		margin-top: 2px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Hover-revealed inline actions (no switch, no ⋯ menu) */
	.mp-act {
		display: flex;
		align-items: center;
		gap: 2px;
		flex: none;
		opacity: 0;
		transition: opacity 0.15s ease;
	}
	.mp-card:hover .mp-act,
	.mp-card:focus-within .mp-act {
		opacity: 1;
	}
	.mp-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 5px;
		border-radius: 8px;
		color: var(--text-tertiary);
		transition:
			background 0.2s ease,
			color 0.2s ease;
	}
	.mp-icon:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	.mp-desc {
		font-size: 12px;
		color: var(--text-secondary);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		min-height: 32px;
	}

	.mp-foot {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 12px;
		min-height: 22px;
	}
	.mp-flag {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 10px;
		padding: 2px 7px;
		border-radius: 6px;
		background: var(--surface);
		color: var(--text-secondary);
	}
	.mp-flag.off {
		color: var(--orange, var(--text-secondary));
	}
</style>
