<script lang="ts">
	import { marked } from 'marked';

	import { toast } from 'svelte-sonner';
	import Sortable from 'sortablejs';

	import fileSaver from 'file-saver';
	const { saveAs } = fileSaver;

	import { onMount, getContext, tick } from 'svelte';
	import { goto } from '$app/navigation';
	const i18n = getContext('i18n');

	import { WEBUI_NAME, config, mobile, models as _models, settings, user } from '$lib/stores';
	import { WEBUI_API_BASE_URL, WEBUI_BASE_URL } from '$lib/constants';
	import {
		createNewModel,
		deleteModelById,
		getModelItems as getWorkspaceModels,
		getModelTags,
		toggleModelById,
		updateModelById
	} from '$lib/apis/models';

	import { getModels } from '$lib/apis';
	import { getGroups } from '$lib/apis/groups';
	import { updateUserSettings } from '$lib/apis/users';

	import { capitalizeFirstLetter, copyToClipboard } from '$lib/utils';

	import EllipsisHorizontal from '../icons/EllipsisHorizontal.svelte';
	import CheckCircle from '../icons/CheckCircle.svelte';
	import Minus from '../icons/Minus.svelte';
	import ModelMenu from './Models/ModelMenu.svelte';
	import ModelDeleteConfirmDialog from '../common/ConfirmDialog.svelte';
	import Tooltip from '../common/Tooltip.svelte';
	import GarbageBin from '../icons/GarbageBin.svelte';
	import Search from '../icons/Search.svelte';
	import Plus from '../icons/Plus.svelte';
	import Switch from '../common/Switch.svelte';
	import Spinner from '../common/Spinner.svelte';
	import XMark from '../icons/XMark.svelte';
	import EyeSlash from '../icons/EyeSlash.svelte';
	import Eye from '../icons/Eye.svelte';
	import Cube from '../icons/Cube.svelte';

	import Dropdown from '$lib/components/common/Dropdown.svelte';
	import TagSelector from './common/TagSelector.svelte';
	import Pagination from '../common/Pagination.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import WorkspaceActionCard from './common/WorkspaceActionCard.svelte';
	import WorkspaceCard from './common/WorkspaceCard.svelte';

	let shiftKey = false;

	let importFiles;
	let modelsImportInputElement: HTMLInputElement;
	let tagsContainerElement: HTMLDivElement;

	let loaded = false;

	let showModelDeleteConfirm = false;

	let selectedModel = null;

	let groupIds = [];

	let tags = [];
	let selectedTag = '';

	let query = '';
	let viewOption = '';

	let page = 1;
	let models = null;
	let total = null;

	let searchDebounceTimer;

	$: if (loaded && page !== undefined && selectedTag !== undefined && viewOption !== undefined) {
		getModelList();
	}

	const selectView = (value) => {
		viewOption = value;
		localStorage.workspaceViewOption = value;
		page = 1;
	};

	const getModelList = async () => {
		if (!loaded) return;

		try {
			const res = await getWorkspaceModels(
				localStorage.token,
				query,
				viewOption,
				selectedTag,
				null,
				null,
				page
			).catch((error) => {
				toast.error(`${error}`);
				return null;
			});

			if (res) {
				models = res.items;
				total = res.total;

				// get tags
				tags = await getModelTags(localStorage.token).catch((error) => {
					toast.error(`${error}`);
					return [];
				});
			}
		} catch (err) {
			console.error(err);
		}
	};

	const deleteModelHandler = async (model) => {
		const res = await deleteModelById(localStorage.token, model.id).catch((e) => {
			toast.error(`${e}`);
			return null;
		});

		if (res) {
			toast.success($i18n.t(`Deleted {{name}}`, { name: model.id }));

			page = 1;
			getModelList();
		}

		await _models.set(
			await getModels(
				localStorage.token,
				$config?.features?.enable_direct_connections && ($settings?.directConnections ?? null)
			)
		);
	};

	const cloneModelHandler = async (model) => {
		sessionStorage.model = JSON.stringify({
			...model,
			id: `${model.id}-clone`,
			name: `${model.name} (Clone)`
		});
		goto('/workspace/models/create');
	};

	const shareModelHandler = async (model) => {
		toast.success($i18n.t('Redirecting you to Open WebUI Community'));

		const url = 'https://openwebui.com';

		const tab = await window.open(`${url}/models/create`, '_blank');

		const messageHandler = (event) => {
			if (event.origin !== url) return;
			if (event.data === 'loaded') {
				tab.postMessage(JSON.stringify(model), '*');
				window.removeEventListener('message', messageHandler);
			}
		};

		window.addEventListener('message', messageHandler, false);
	};

	const hideModelHandler = async (model) => {
		model.meta = {
			...model.meta,
			hidden: !(model?.meta?.hidden ?? false)
		};

		console.log(model);

		const res = await updateModelById(localStorage.token, model.id, model);

		if (res) {
			toast.success(
				$i18n.t(`Model {{name}} is now {{status}}`, {
					name: model.id,
					status: model.meta.hidden ? 'hidden' : 'visible'
				})
			);

			page = 1;
			getModelList();
		}

		await _models.set(
			await getModels(
				localStorage.token,
				$config?.features?.enable_direct_connections && ($settings?.directConnections ?? null)
			)
		);
	};

	const copyLinkHandler = async (model) => {
		const baseUrl = window.location.origin;
		const res = await copyToClipboard(`${baseUrl}/?model=${encodeURIComponent(model.id)}`);

		if (res) {
			toast.success($i18n.t('Copied link to clipboard'));
		} else {
			toast.error($i18n.t('Failed to copy link'));
		}
	};

	const downloadModels = async (models) => {
		let blob = new Blob([JSON.stringify(models)], {
			type: 'application/json'
		});
		saveAs(blob, `models-export-${Date.now()}.json`);
	};

	const exportModelHandler = async (model) => {
		let blob = new Blob([JSON.stringify([model])], {
			type: 'application/json'
		});
		saveAs(blob, `${model.id}-${Date.now()}.json`);
	};

	const pinModelHandler = async (modelId) => {
		let pinnedModels = $settings?.pinnedModels ?? [];

		if (pinnedModels.includes(modelId)) {
			pinnedModels = pinnedModels.filter((id) => id !== modelId);
		} else {
			pinnedModels = [...new Set([...pinnedModels, modelId])];
		}

		settings.set({ ...$settings, pinnedModels: pinnedModels });
		await updateUserSettings(localStorage.token, { ui: $settings });
	};

	const enableAllHandler = async () => {
		const modelsToEnable = (models ?? []).filter((m) => !(m.is_active ?? true));
		// Optimistic UI update
		modelsToEnable.forEach((m) => (m.is_active = true));
		models = models;
		// Sync with server
		await Promise.all(modelsToEnable.map((model) => toggleModelById(localStorage.token, model.id)));
	};

	const disableAllHandler = async () => {
		const modelsToDisable = (models ?? []).filter((m) => m.is_active ?? true);
		// Optimistic UI update
		modelsToDisable.forEach((m) => (m.is_active = false));
		models = models;
		// Sync with server
		await Promise.all(
			modelsToDisable.map((model) => toggleModelById(localStorage.token, model.id))
		);
	};

	const showAllHandler = async () => {
		const modelsToShow = (models ?? []).filter((m) => m?.meta?.hidden === true);
		// Optimistic UI update
		modelsToShow.forEach((m) => {
			m.meta = { ...m.meta, hidden: false };
		});
		models = models;
		// Sync with server
		await Promise.all(
			modelsToShow.map((model) => updateModelById(localStorage.token, model.id, model))
		);
		toast.success($i18n.t('All models are now visible'));
	};

	const hideAllHandler = async () => {
		const modelsToHide = (models ?? []).filter((m) => !(m?.meta?.hidden ?? false));
		// Optimistic UI update
		modelsToHide.forEach((m) => {
			m.meta = { ...m.meta, hidden: true };
		});
		models = models;
		// Sync with server
		await Promise.all(
			modelsToHide.map((model) => updateModelById(localStorage.token, model.id, model))
		);
		toast.success($i18n.t('All models are now hidden'));
	};

	onMount(async () => {
		viewOption = localStorage.workspaceViewOption ?? '';
		page = 1;

		let groups = await getGroups(localStorage.token);
		groupIds = groups.map((group) => group.id);

		await tick();
		loaded = true;

		const onKeyDown = (event) => {
			if (event.key === 'Shift') {
				shiftKey = true;
			}
		};

		const onKeyUp = (event) => {
			if (event.key === 'Shift') {
				shiftKey = false;
			}
		};

		const onBlur = () => {
			shiftKey = false;
		};

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);
		window.addEventListener('blur-sm', onBlur);

		return () => {
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('blur-sm', onBlur);
		};
	});
</script>

<svelte:head>
	<title>
		{$i18n.t('Models')} • {$WEBUI_NAME}
	</title>
</svelte:head>

{#if loaded}
	<ModelDeleteConfirmDialog
		bind:show={showModelDeleteConfirm}
		on:confirm={() => {
			deleteModelHandler(selectedModel);
		}}
	/>

	<div class="ws-page flex flex-col gap-1 px-1 mb-3">
		<input
			id="models-import-input"
			bind:this={modelsImportInputElement}
			bind:files={importFiles}
			type="file"
			accept=".json"
			hidden
			on:change={() => {
				console.log(importFiles);

				let reader = new FileReader();
				reader.onload = async (event) => {
					let savedModels = [];
					try {
						savedModels = JSON.parse(event.target.result);
						console.log(savedModels);
					} catch (e) {
						toast.error($i18n.t('Invalid JSON file'));
						return;
					}

					for (const model of savedModels) {
						if (model?.info ?? false) {
							if ($_models.find((m) => m.id === model.id)) {
								await updateModelById(localStorage.token, model.id, model.info).catch((error) => {
									toast.error(`${error}`);
									return null;
								});
							} else {
								await createNewModel(localStorage.token, model.info).catch((error) => {
									toast.error(`${error}`);
									return null;
								});
							}
						} else {
							if (model?.id && model?.name) {
								await createNewModel(localStorage.token, model).catch((error) => {
									toast.error(`${error}`);
									return null;
								});
							}
						}
					}

					await _models.set(
						await getModels(
							localStorage.token,
							$config?.features?.enable_direct_connections && ($settings?.directConnections ?? null)
						)
					);

					page = 1;
					getModelList();
				};

				reader.readAsText(importFiles[0]);
			}}
		/>
		<div class="ws-head">
			<div class="ws-title">{$i18n.t('Models')}</div>
			<div class="ws-lede">
				{$i18n.t(
					'Custom presets that pair a base model with a system prompt, tools, knowledge and capabilities — build your own assistants and reuse them anywhere in chat.'
				)}
			</div>
		</div>

		<div class="ws-toolbar">
			<div class="ws-search">
				<Search className="size-3.5" />
				<input
					bind:value={query}
					aria-label={$i18n.t('Search Models')}
					placeholder={$i18n.t('Search Models')}
					maxlength="500"
					on:input={() => {
						clearTimeout(searchDebounceTimer);
						searchDebounceTimer = setTimeout(() => {
							getModelList();
						}, 300);
					}}
				/>
				{#if query}
					<button
						class="btn-clear p-0.5"
						aria-label={$i18n.t('Clear search')}
						on:click={() => {
							query = '';
							getModelList();
						}}
					>
						<XMark className="size-3" strokeWidth="2" />
					</button>
				{/if}
			</div>

			<div class="ws-chips">
				<button class="ws-chip {viewOption === '' ? 'on' : ''}" on:click={() => selectView('')}>
					{$i18n.t('All')}{#if total !== null}<span class="cnt">{total}</span>{/if}
				</button>
				<button
					class="ws-chip {viewOption === 'created' ? 'on' : ''}"
					on:click={() => selectView('created')}
				>
					{$i18n.t('Created by you')}
				</button>
				<button
					class="ws-chip {viewOption === 'shared' ? 'on' : ''}"
					on:click={() => selectView('shared')}
				>
					{$i18n.t('Shared with you')}
				</button>
			</div>

			{#if (tags ?? []).length > 0}
				<TagSelector
					bind:value={selectedTag}
					items={tags.map((tag) => {
						return { value: tag, label: tag };
					})}
				/>
			{/if}
		</div>

		{#if models !== null}
			<div class="ws-grid" id="model-list">
				<WorkspaceActionCard
					newLabel={$i18n.t('New Model')}
					newSub={$i18n.t('Start from scratch')}
					importLabel={$i18n.t('Import')}
					importSub={$i18n.t('From .json file')}
					showImport={$user?.role === 'admin' || $user?.permissions?.workspace?.models_import}
					onNew={() => goto('/workspace/models/create')}
					onImport={() => modelsImportInputElement.click()}
				/>

				{#each models as model (model.id)}
					<WorkspaceCard
						name={model.name}
						description={(model?.meta?.description ?? '').trim() || model.id}
						author={$i18n.t('By {{name}}', {
							name: capitalizeFirstLetter(
								model?.user?.name ?? model?.user?.email ?? $i18n.t('Deleted User')
							)
						})}
						href={model.write_access
							? `/workspace/models/edit?id=${encodeURIComponent(model.id)}`
							: null}
						writeAccess={model.write_access}
						readOnlyLabel={$i18n.t('read only')}
					>
						<img
							slot="avatar"
							class="ws-avatar"
							src={`${WEBUI_API_BASE_URL}/models/model/profile/image?id=${encodeURIComponent(
								model.id
							)}&lang=${$i18n.language}&v=${model.updated_at ?? model.updated ?? ''}`}
							alt="modelfile profile"
							loading="lazy"
							decoding="async"
							on:error={(e) => {
								e.target.src = '/favicon.png';
							}}
						/>

						<svelte:fragment slot="footer">
							{#if model.base_model_id}
								<span class="ws-base"><Cube className="size-3" />{model.base_model_id}</span>
							{/if}
							{#each (model?.meta?.tags ?? []).slice(0, 2) as tag}
								<span class="ws-tag">{tag?.name ?? tag}</span>
							{/each}
						</svelte:fragment>
					</WorkspaceCard>
				{/each}
				{#if (models ?? []).length === 0 && (query || viewOption || selectedTag)}
					<div class="ws-empty">{$i18n.t('No models match your search.')}</div>
				{/if}
			</div>

			{#if total > 30}
				<Pagination bind:page count={total} perPage={30} />
			{/if}
		{:else}
			<div class="w-full h-full flex justify-center items-center py-10">
				<Spinner className="size-4" />
			</div>
		{/if}
	</div>
{:else}
	<div class="w-full h-full flex justify-center items-center">
		<Spinner className="size-5" />
	</div>
{/if}

<style>
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
</style>
