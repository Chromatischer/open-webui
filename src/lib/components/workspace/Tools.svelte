<script lang="ts">
	import { toast } from 'svelte-sonner';
	import fileSaver from 'file-saver';
	const { saveAs } = fileSaver;

	import { onMount, getContext, tick, onDestroy } from 'svelte';
	const i18n = getContext('i18n');

	import { WEBUI_NAME, tools as _tools, user } from '$lib/stores';

	import { goto } from '$app/navigation';
	import {
		createNewTool,
		loadToolByUrl,
		deleteToolById,
		exportTools,
		getToolById,
		getToolList,
		getTools
	} from '$lib/apis/tools';
	import { capitalizeFirstLetter } from '$lib/utils';

	import Tooltip from '../common/Tooltip.svelte';
	import ConfirmDialog from '../common/ConfirmDialog.svelte';
	import ToolMenu from './Tools/ToolMenu.svelte';
	import EllipsisHorizontal from '../icons/EllipsisHorizontal.svelte';
	import ValvesModal from './common/ValvesModal.svelte';
	import ManifestModal from './common/ManifestModal.svelte';
	import Heart from '../icons/Heart.svelte';
	import DeleteConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import GarbageBin from '../icons/GarbageBin.svelte';
	import Search from '../icons/Search.svelte';
	import Plus from '../icons/Plus.svelte';
	import Spinner from '../common/Spinner.svelte';
	import XMark from '../icons/XMark.svelte';
	import AddToolMenu from './Tools/AddToolMenu.svelte';
	import ImportModal from '../ImportModal.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import WrenchAlt from '../icons/WrenchAlt.svelte';
	import WorkspaceActionCard from './common/WorkspaceActionCard.svelte';
	import WorkspaceCard from './common/WorkspaceCard.svelte';

	let shiftKey = false;
	let loaded = false;

	let toolsImportInputElement: HTMLInputElement;
	let importFiles;

	let showConfirm = false;
	let query = '';
	let searchDebounceTimer: ReturnType<typeof setTimeout>;

	let showManifestModal = false;
	let showValvesModal = false;
	let selectedTool = null;

	let showDeleteConfirm = false;

	let tools = [];
	let filteredItems = [];

	let tagsContainerElement: HTMLDivElement;
	let viewOption = '';

	let showImportModal = false;

	$: if (query !== undefined) {
		clearTimeout(searchDebounceTimer);
		searchDebounceTimer = setTimeout(() => {
			setFilteredItems();
		}, 300);
	}

	$: if (tools && viewOption !== undefined) {
		setFilteredItems();
	}

	const selectView = (value) => {
		viewOption = value;
		localStorage.workspaceViewOption = value;
	};

	const setFilteredItems = () => {
		filteredItems = tools.filter((t) => {
			if (query === '' && viewOption === '') return true;
			const lowerQuery = query.toLowerCase();
			return (
				((t.name || '').toLowerCase().includes(lowerQuery) ||
					(t.id || '').toLowerCase().includes(lowerQuery) ||
					(t.user?.name || '').toLowerCase().includes(lowerQuery) || // Search by user name
					(t.user?.email || '').toLowerCase().includes(lowerQuery)) && // Search by user email
				(viewOption === '' ||
					(viewOption === 'created' && t.user_id === $user?.id) ||
					(viewOption === 'shared' && t.user_id !== $user?.id))
			);
		});
	};

	const shareHandler = async (tool) => {
		const item = await getToolById(localStorage.token, tool.id).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		toast.success($i18n.t('Redirecting you to Open WebUI Community'));

		const url = 'https://openwebui.com';

		const tab = await window.open(`${url}/tools/create`, '_blank');

		const messageHandler = (event) => {
			if (event.origin !== url) return;
			if (event.data === 'loaded') {
				tab.postMessage(JSON.stringify(item), '*');
				window.removeEventListener('message', messageHandler);
			}
		};

		window.addEventListener('message', messageHandler, false);
		console.log(item);
	};

	const cloneHandler = async (tool) => {
		const _tool = await getToolById(localStorage.token, tool.id).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (_tool) {
			sessionStorage.tool = JSON.stringify({
				..._tool,
				id: `${_tool.id}_clone`,
				name: `${_tool.name} (Clone)`
			});
			goto('/workspace/tools/create');
		}
	};

	const exportHandler = async (tool) => {
		const _tool = await getToolById(localStorage.token, tool.id).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (_tool) {
			let blob = new Blob([JSON.stringify([_tool])], {
				type: 'application/json'
			});
			saveAs(blob, `tool-${_tool.id}-export-${Date.now()}.json`);
		}
	};

	const deleteHandler = async (tool) => {
		const res = await deleteToolById(localStorage.token, tool.id).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (res) {
			toast.success($i18n.t('Tool deleted successfully'));
			await init();
		}
	};

	const init = async () => {
		tools = await getToolList(localStorage.token);
		_tools.set(await getTools(localStorage.token));
	};

	onMount(async () => {
		viewOption = localStorage?.workspaceViewOption || '';
		await init();
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
			clearTimeout(searchDebounceTimer);
			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('blur-sm', onBlur);
		};
	});

	onDestroy(() => {
		clearTimeout(searchDebounceTimer);
	});
</script>

<svelte:head>
	<title>
		{$i18n.t('Tools')} • {$WEBUI_NAME}
	</title>
</svelte:head>

<ImportModal
	bind:show={showImportModal}
	onImport={(tool) => {
		sessionStorage.tool = JSON.stringify({
			...tool
		});
		goto('/workspace/tools/create');
	}}
	loadUrlHandler={async (url) => {
		return await loadToolByUrl(localStorage.token, url);
	}}
	successMessage={$i18n.t('Tool imported successfully')}
/>

{#if loaded}
	<div class="ws-page flex flex-col gap-1 px-1 mb-3">
		<input
			id="documents-import-input"
			bind:this={toolsImportInputElement}
			bind:files={importFiles}
			type="file"
			accept=".json"
			hidden
			on:change={() => {
				console.log(importFiles);
				showConfirm = true;
			}}
		/>

		<div class="ws-head">
			<div class="ws-title">{$i18n.t('Tools')}</div>
			<div class="ws-lede">
				{$i18n.t(
					'Python functions your models can call mid-conversation — fetch data, run calculations or reach external services. Enable them per model to extend what your assistants can do.'
				)}
			</div>
		</div>

		<div class="ws-toolbar">
			<div class="ws-search">
				<Search className="size-3.5" />
				<input
					bind:value={query}
					aria-label={$i18n.t('Search Tools')}
					placeholder={$i18n.t('Search Tools')}
				/>
				{#if query}
					<button
						class="btn-clear p-0.5"
						aria-label={$i18n.t('Clear search')}
						on:click={() => {
							query = '';
						}}
					>
						<XMark className="size-3" strokeWidth="2" />
					</button>
				{/if}
			</div>

			<div class="ws-chips">
				<button class="ws-chip {viewOption === '' ? 'on' : ''}" on:click={() => selectView('')}>
					{$i18n.t('All')}<span class="cnt">{filteredItems.length}</span>
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
		</div>

		<div class="ws-grid">
			<WorkspaceActionCard
				newLabel={$i18n.t('New Tool')}
				newSub={$i18n.t('Start from scratch')}
				importLabel={$i18n.t('Import')}
				importSub={$i18n.t('From .json file')}
				showImport={$user?.role === 'admin' || $user?.permissions?.workspace?.tools_import}
				onNew={() => goto('/workspace/tools/create')}
				onImport={() => toolsImportInputElement.click()}
			/>

			{#each filteredItems as tool}
				<WorkspaceCard
					name={tool.name}
					description={tool?.meta?.description ?? tool.id}
					author={$i18n.t('By {{name}}', {
						name: capitalizeFirstLetter(
							tool?.user?.name ?? tool?.user?.email ?? $i18n.t('Deleted User')
						)
					})}
					href={tool.write_access
						? `/workspace/tools/edit?id=${encodeURIComponent(tool.id)}`
						: null}
					writeAccess={tool.write_access}
					readOnlyLabel={$i18n.t('read only')}
				>
					<div slot="avatar" class="ws-icon-avatar"><WrenchAlt className="size-5" /></div>

					<svelte:fragment slot="footer">
						<span class="ws-base"><WrenchAlt className="size-3" />{$i18n.t('Tool')}</span>
						{#if tool?.meta?.manifest?.version}
							<span class="ws-tag">v{tool?.meta?.manifest?.version}</span>
						{/if}
					</svelte:fragment>
				</WorkspaceCard>
			{/each}
		</div>

		{#if (filteredItems ?? []).length === 0 && (query || viewOption)}
			<div class="ws-empty">{$i18n.t('No tools match your search.')}</div>
		{/if}
	</div>
	<DeleteConfirmDialog
		bind:show={showDeleteConfirm}
		title={$i18n.t('Delete tool?')}
		on:confirm={() => {
			deleteHandler(selectedTool);
		}}
	>
		<div class=" text-sm text-gray-500 truncate">
			{$i18n.t('This will delete')} <span class="  font-medium">{selectedTool.name}</span>.
		</div>
	</DeleteConfirmDialog>

	<ValvesModal bind:show={showValvesModal} type="tool" id={selectedTool?.id ?? null} />
	<ManifestModal bind:show={showManifestModal} manifest={selectedTool?.meta?.manifest ?? {}} />

	<ConfirmDialog
		bind:show={showConfirm}
		on:confirm={() => {
			const reader = new FileReader();
			reader.onload = async (event) => {
				const _tools = JSON.parse(event.target.result);
				console.log(_tools);

				for (const tool of _tools) {
					const res = await createNewTool(localStorage.token, tool).catch((error) => {
						toast.error(`${error}`);
						return null;
					});
				}

				toast.success($i18n.t('Tool imported successfully'));
				await init();
				importFiles = null;
				toolsImportInputElement.value = '';
			};

			reader.readAsText(importFiles[0]);
		}}
	>
		<div class="text-sm text-gray-500">
			<div class=" bg-yellow-500/20 text-yellow-700 dark:text-yellow-200 rounded-lg px-4 py-3">
				<div>{$i18n.t('Please carefully review the following warnings:')}</div>

				<ul class=" mt-1 list-disc pl-4 text-xs">
					<li>
						{$i18n.t('Tools have a function calling system that allows arbitrary code execution.')}.
					</li>
					<li>{$i18n.t('Do not install tools from sources you do not fully trust.')}</li>
				</ul>
			</div>

			<div class="my-3">
				{$i18n.t(
					'I acknowledge that I have read and I understand the implications of my action. I am aware of the risks associated with executing arbitrary code and I have verified the trustworthiness of the source.'
				)}
			</div>
		</div>
	</ConfirmDialog>
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
