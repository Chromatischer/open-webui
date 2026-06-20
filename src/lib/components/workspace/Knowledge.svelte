<script lang="ts">
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	dayjs.extend(relativeTime);

	import { toast } from 'svelte-sonner';
	import { inlineError } from '$lib/utils/inlineError';
	import { onMount, getContext, tick, onDestroy } from 'svelte';
	const i18n = getContext('i18n');

	import { WEBUI_NAME, knowledge, user } from '$lib/stores';
	import {
		deleteKnowledgeById,
		searchKnowledgeBases,
		exportKnowledgeById
	} from '$lib/apis/knowledge';

	import { goto } from '$app/navigation';
	import { capitalizeFirstLetter } from '$lib/utils';

	import DeleteConfirmDialog from '../common/ConfirmDialog.svelte';
	import ItemMenu from './Knowledge/ItemMenu.svelte';
	import Search from '../icons/Search.svelte';
	import Plus from '../icons/Plus.svelte';
	import Spinner from '../common/Spinner.svelte';
	import Tooltip from '../common/Tooltip.svelte';
	import XMark from '../icons/XMark.svelte';
	import ViewSelector from './common/ViewSelector.svelte';
	import Loader from '../common/Loader.svelte';
	import WorkspaceEmpty from './common/WorkspaceEmpty.svelte';

	let loaded = false;
	let showDeleteConfirm = false;
	let tagsContainerElement: HTMLDivElement;

	let selectedItem = null;

	let page = 1;
	let query = '';
	let searchDebounceTimer: ReturnType<typeof setTimeout>;
	let viewOption = '';

	let items = null;
	let total = null;

	let allItemsLoaded = false;
	let itemsLoading = false;

	$: if (query !== undefined) {
		clearTimeout(searchDebounceTimer);
		searchDebounceTimer = setTimeout(() => {
			init();
		}, 300);
	}

	onDestroy(() => {
		clearTimeout(searchDebounceTimer);
	});

	$: if (viewOption !== undefined) {
		init();
	}

	const reset = () => {
		page = 1;
		items = null;
		total = null;
		allItemsLoaded = false;
		itemsLoading = false;
	};

	const loadMoreItems = async () => {
		if (allItemsLoaded) return;
		page += 1;
		await getItemsPage();
	};

	const init = async () => {
		if (!loaded) return;

		reset();
		await getItemsPage();
	};

	const getItemsPage = async () => {
		itemsLoading = true;
		const res = await searchKnowledgeBases(localStorage.token, query, viewOption, page).catch(
			() => {
				return [];
			}
		);

		if (res) {
			console.log(res);
			total = res.total;
			const pageItems = res.items;

			if ((pageItems ?? []).length === 0) {
				allItemsLoaded = true;
			} else {
				allItemsLoaded = false;
			}

			if (items) {
				const existingIds = new Set(items.map((item) => item.id));
				const newItems = pageItems.filter((item) => !existingIds.has(item.id));
				items = [...items, ...newItems];
			} else {
				items = pageItems;
			}
		}

		itemsLoading = false;
		return res;
	};

	const deleteHandler = async (item) => {
		const res = await deleteKnowledgeById(localStorage.token, item.id).catch((e) => {
			toast.error(`${e}`);
		});

		if (res) {
			init();
		}
	};

	const exportHandler = async (item) => {
		try {
			const blob = await exportKnowledgeById(localStorage.token, item.id);
			if (blob) {
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = `${item.name}.zip`;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			}
		} catch (e) {
			toast.error(`${e}`);
		}
	};

	onMount(async () => {
		viewOption = localStorage?.workspaceViewOption || '';
		loaded = true;
	});
</script>

<svelte:head>
	<title>
		{$i18n.t('Knowledge')} • {$WEBUI_NAME}
	</title>
</svelte:head>

{#if loaded}
	<DeleteConfirmDialog
		bind:show={showDeleteConfirm}
		on:confirm={() => {
			deleteHandler(selectedItem);
		}}
	/>

	<div class="ws-page flex flex-col px-1 mb-3">
		<div class="ws-head">
			<span class="ws-kicker">{$i18n.t('The Workshop')}</span>
			<div class="ws-title">{$i18n.t('Knowledge')}</div>
			<div class="ws-lede">
				{$i18n.t(
					'Collections of documents a model may consult while it writes — attach them to a model, or summon them in chat with #.'
				)}
			</div>
		</div>

		<div class="ws-toolbar">
			<div class="ws-search">
				<Search className="size-3.5" />
				<input
					bind:value={query}
					aria-label={$i18n.t('Search Knowledge')}
					placeholder={$i18n.t('Search Knowledge')}
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

			<div class="ws-chips" bind:this={tagsContainerElement}>
				<ViewSelector
					bind:value={viewOption}
					onChange={async (value) => {
						localStorage.workspaceViewOption = value;

						await tick();
					}}
				/>
			</div>

			<div class="ws-actions">
				<a class="ws-begin-sm" href="/workspace/knowledge/create">
					<Plus className="size-3" strokeWidth="2" />
					{$i18n.t('New Knowledge')}
				</a>
			</div>
		</div>

		{#if items !== null && total !== null}
			{#if (items ?? []).length === 0 && !query && !viewOption}
				<WorkspaceEmpty
					mark="❧"
					kicker={$i18n.t('The library')}
					line={$i18n.t('The shelves stand empty.')}
					sub={$i18n.t(
						'Knowledge gathers documents into collections a model can consult while it writes — found one and fill it.'
					)}
					beginLabel={$i18n.t('Found your first collection')}
					onBegin={() => goto('/workspace/knowledge/create')}
				/>
			{:else if (items ?? []).length !== 0}
				<!-- The Aleph dreams itself into being, and the void learns its own name -->
				<div class="ws-rows">
					{#each items as item}
						<button
							class="ws-row"
							on:click={(e) => {
								if (item?.meta?.document) {
									inlineError(
										e.currentTarget as HTMLElement,
										$i18n.t(
											'Only collections can be edited, create a new knowledge base to edit/add documents.'
										)
									);
								} else {
									goto(`/workspace/knowledge/${item.id}`);
								}
							}}
						>
							<div class="ws-row-body">
								<div class="ws-row-line">
									<span class="ws-row-name capitalize">{item.name}</span>
									{#if !item?.write_access}
										<span class="ws-row-ro">{$i18n.t('read only')}</span>
									{/if}
								</div>

								<div class="ws-row-sub">
									<Tooltip
										content={item?.user?.email ?? $i18n.t('Deleted User')}
										className="flex shrink-0"
										placement="top-start"
									>
										<span class="muted">
											{$i18n.t('By {{name}}', {
												name: capitalizeFirstLetter(
													item?.user?.name ?? item?.user?.email ?? $i18n.t('Deleted User')
												)
											})}
										</span>
									</Tooltip>

									{#if item?.description}
										<span class="muted">·</span>
										<Tooltip content={item.description} placement="top" className="min-w-0">
											<span class="ws-row-clamp">{item.description}</span>
										</Tooltip>
									{/if}
								</div>
							</div>

							<Tooltip content={dayjs(item.updated_at * 1000).format('LLLL')}>
								<span class="ws-row-meta hidden sm:block">
									{$i18n.t('Updated')}
									{dayjs(item.updated_at * 1000).fromNow()}
								</span>
							</Tooltip>

							{#if item?.write_access || $user?.role === 'admin'}
								<div class="ws-row-actions">
									<ItemMenu
										onExport={$user.role === 'admin'
											? () => {
													exportHandler(item);
												}
											: null}
										on:delete={() => {
											selectedItem = item;
											showDeleteConfirm = true;
										}}
									/>
								</div>
							{/if}
						</button>
					{/each}
				</div>

				{#if !allItemsLoaded}
					<Loader
						on:visible={(e) => {
							if (!itemsLoading) {
								loadMoreItems();
							}
						}}
					>
						<div class="w-full flex justify-center py-4 text-xs animate-pulse items-center gap-2">
							<Spinner className=" size-4" />
							<div class=" ">{$i18n.t('Loading...')}</div>
						</div>
					</Loader>
				{/if}
			{:else}
				<div class="ws-empty">{$i18n.t('No knowledge matches your search.')}</div>
			{/if}
		{:else}
			<div class="w-full h-full flex justify-center items-center py-10">
				<Spinner className="size-4" />
			</div>
		{/if}

		<div class="ws-note">
			ⓘ {$i18n.t("Use '#' in the prompt input to load and include your knowledge.")}
		</div>
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
