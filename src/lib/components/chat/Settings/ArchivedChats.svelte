<script lang="ts">
	// @ts-ignore
	import fileSaver from 'file-saver';
	const { saveAs } = fileSaver;

	import { toast } from 'svelte-sonner';
	import { getContext, onMount } from 'svelte';
	import type { Writable } from 'svelte/store';

	import dayjs from 'dayjs';
	import localizedFormat from 'dayjs/plugin/localizedFormat';
	import calendar from 'dayjs/plugin/calendar';

	dayjs.extend(localizedFormat);
	dayjs.extend(calendar);

	import {
		archiveChatById,
		deleteChatById,
		getAllArchivedChats,
		getArchivedChatList,
		getChatList,
		getPinnedChatList,
		unarchiveAllChats
	} from '$lib/apis/chats';
	import {
		chatId,
		chats,
		currentChatPage,
		pinnedChats,
		scrollPaginationEnabled
	} from '$lib/stores';
	import { goto } from '$app/navigation';

	import Spinner from '$lib/components/common/Spinner.svelte';
	import Loader from '$lib/components/common/Loader.svelte';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';
	import Search from '$lib/components/icons/Search.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';
	import GarbageBin from '$lib/components/icons/GarbageBin.svelte';
	import ArchiveBox from '$lib/components/icons/ArchiveBox.svelte';

	const i18n: Writable<any> = getContext('i18n');

	let loading = false;
	let chatList: any[] | null = null;
	let page = 1;

	let query = '';
	const orderBy = 'updated_at';
	const direction = 'desc';

	let allChatsLoaded = false;
	let chatListLoading = false;
	let searchDebounceTimeout: any;

	let selectedChatId: string | null = null;
	let showDeleteConfirmDialog = false;
	let showUnarchiveAllConfirmDialog = false;

	$: filter = {
		...(query ? { query } : {}),
		order_by: orderBy,
		direction
	};

	$: if (filter !== null) {
		searchHandler();
	}

	const refreshSidebarChats = async () => {
		currentChatPage.set(1);
		await chats.set(await getChatList(localStorage.token, $currentChatPage));
		await pinnedChats.set(await getPinnedChatList(localStorage.token));
		scrollPaginationEnabled.set(true);
	};

	const searchHandler = async () => {
		if (searchDebounceTimeout) {
			clearTimeout(searchDebounceTimeout);
		}

		page = 1;
		chatList = null;

		if (query === '') {
			chatList = await getArchivedChatList(localStorage.token, page, filter);
		} else {
			searchDebounceTimeout = setTimeout(async () => {
				chatList = await getArchivedChatList(localStorage.token, page, filter);
			}, 500);
		}

		allChatsLoaded = (chatList ?? []).length === 0;
	};

	const loadMoreChats = async () => {
		chatListLoading = true;
		page += 1;

		const newChatList = await getArchivedChatList(localStorage.token, page, filter);
		allChatsLoaded = newChatList.length === 0;

		if (newChatList.length > 0) {
			chatList = [...(chatList || []), ...newChatList];
		}

		chatListLoading = false;
	};

	const init = async () => {
		chatList = await getArchivedChatList(localStorage.token, 1, filter);
	};

	const unarchiveHandler = async (id: string) => {
		await archiveChatById(localStorage.token, id).catch((error) => {
			toast.error(`${error}`);
		});
		await refreshSidebarChats();
		await init();
	};

	const deleteHandler = async (id: string) => {
		const res = await deleteChatById(localStorage.token, id).catch((error) => {
			toast.error(`${error}`);
		});

		if (res) {
			if ($chatId === id) {
				await goto('/');
				await chatId.set('');
			}
			await refreshSidebarChats();
		}
		await init();
	};

	const exportChatsHandler = async () => {
		const archivedChats = await getAllArchivedChats(localStorage.token);
		const blob = new Blob([JSON.stringify(archivedChats)], {
			type: 'application/json'
		});
		saveAs(blob, `${$i18n.t('archived-chat-export')}-${Date.now()}.json`);
	};

	const unarchiveAllHandler = async () => {
		loading = true;
		try {
			await unarchiveAllChats(localStorage.token);
			toast.success($i18n.t('All chats have been unarchived.'));
			await refreshSidebarChats();
			await init();
		} catch (error) {
			toast.error(`${error}`);
		} finally {
			loading = false;
		}
	};

	onMount(() => {
		init();
	});
</script>

<ConfirmDialog
	bind:show={showDeleteConfirmDialog}
	on:confirm={() => {
		if (selectedChatId) {
			deleteHandler(selectedChatId);
			selectedChatId = null;
		}
	}}
/>

<ConfirmDialog
	bind:show={showUnarchiveAllConfirmDialog}
	message={$i18n.t('Are you sure you want to unarchive all archived chats?')}
	confirmLabel={$i18n.t('Unarchive All')}
	on:confirm={() => {
		unarchiveAllHandler();
	}}
/>

<div class="flex flex-col h-full text-[var(--text)]">
	<div class="st-pane-title">{$i18n.t('Archived Chats')}</div>
	<div class="st-pane-sub">{$i18n.t('Restore, export, or permanently remove archived conversations.')}</div>

	<div class="st-search-row">
		<Search className="size-4 shrink-0 text-[var(--text-tertiary)]" strokeWidth="2" />
		<input
			class="st-search-input"
			bind:value={query}
			placeholder={$i18n.t('Search Chats')}
			maxlength="500"
		/>
		{#if query}
			<button class="st-search-clear" on:click={() => (query = '')} aria-label={$i18n.t('Clear')}>
				<XMark className="size-3.5" strokeWidth="2" />
			</button>
		{/if}
	</div>

	<div class="flex-1 overflow-y-auto -mx-1 px-1">
		{#if chatList}
			{#if chatList.length === 0}
				<div class="st-empty">{$i18n.t('You have no archived conversations.')}</div>
			{:else}
				<div class="flex flex-col gap-1 py-1">
					{#each chatList as chat (chat.id)}
						<div class="st-chat-row group">
							<a
								class="flex-1 min-w-0"
								href="/c/{chat.id}"
								on:click={() => {
									// close handled by settings modal navigation
								}}
							>
								<div class="truncate text-sm">{chat?.title || $i18n.t('New Chat')}</div>
							</a>

							<div class="st-chat-date">
								{$i18n.t(
									dayjs(chat?.updated_at * 1000).calendar(null, {
										sameDay: '[Today]',
										lastDay: '[Yesterday]',
										lastWeek: '[Last] dddd',
										sameElse: 'L'
									})
								)}
							</div>

							<div class="st-chat-actions">
								<Tooltip content={$i18n.t('Unarchive Chat')}>
									<button
										class="st-icon-btn"
										on:click|stopPropagation={() => unarchiveHandler(chat.id)}
										aria-label={$i18n.t('Unarchive Chat')}
									>
										<ArchiveBox className="size-4" strokeWidth="1.5" />
									</button>
								</Tooltip>
								<Tooltip content={$i18n.t('Delete Chat')}>
									<button
										class="st-icon-btn danger"
										on:click|stopPropagation={() => {
											selectedChatId = chat.id;
											showDeleteConfirmDialog = true;
										}}
										aria-label={$i18n.t('Delete Chat')}
									>
										<GarbageBin className="size-4" strokeWidth="1.5" />
									</button>
								</Tooltip>
							</div>
						</div>
					{/each}

					{#if !allChatsLoaded}
						<Loader
							on:visible={() => {
								if (!chatListLoading) {
									loadMoreChats();
								}
							}}
						>
							<div class="w-full flex justify-center py-2 text-xs animate-pulse items-center gap-2">
								<Spinner className="size-4" />
								<div>{$i18n.t('Loading...')}</div>
							</div>
						</Loader>
					{/if}
				</div>
			{/if}
		{:else}
			<div class="w-full flex justify-center items-center min-h-32">
				<Spinner className="size-5" />
			</div>
		{/if}
	</div>

	{#if (chatList ?? []).length > 0 && query === ''}
		<div class="st-footer">
			<button
				class="st-link-btn"
				disabled={loading}
				on:click={() => (showUnarchiveAllConfirmDialog = true)}
			>
				{#if loading}
					<Spinner className="size-4" />
				{:else}
					{$i18n.t('Unarchive All Archived Chats')}
				{/if}
			</button>
			<button class="st-link-btn" disabled={loading} on:click={exportChatsHandler}>
				{$i18n.t('Export All Archived Chats')}
			</button>
		</div>
	{/if}
</div>

<style>
	.st-pane-title {
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 2px;
	}
	.st-pane-sub {
		font-size: 13px;
		color: var(--text-secondary);
		margin-bottom: 18px;
	}

	.st-search-row {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		margin-bottom: 12px;
		border-radius: 10px;
		border: 1px solid var(--border);
		background: var(--bg-base);
	}
	.st-search-input {
		flex: 1;
		border: none;
		background: transparent;
		outline: none;
		font-size: 13.5px;
		color: var(--text);
	}
	.st-search-clear {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: 6px;
		color: var(--text-tertiary);
	}
	.st-search-clear:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	.st-empty {
		text-align: center;
		font-size: 13px;
		color: var(--text-tertiary);
		padding: 48px 12px;
	}

	.st-chat-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 9px 11px;
		border-radius: 10px;
		transition: background 0.15s ease;
	}
	.st-chat-row:hover {
		background: var(--surface-hover);
	}
	.st-chat-date {
		flex: none;
		font-size: 11.5px;
		color: var(--text-tertiary);
	}
	.st-chat-actions {
		display: flex;
		gap: 2px;
		opacity: 0;
		transition: opacity 0.12s ease;
	}
	.st-chat-row:hover .st-chat-actions {
		opacity: 1;
	}
	.st-icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		border-radius: 8px;
		color: var(--text-secondary);
	}
	.st-icon-btn:hover {
		background: var(--surface-active);
		color: var(--text);
	}
	.st-icon-btn.danger:hover {
		color: #e0533d;
	}

	.st-footer {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		justify-content: flex-end;
		padding-top: 14px;
		margin-top: 6px;
		border-top: 1px solid var(--border);
	}
	.st-link-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12.5px;
		font-weight: 500;
		padding: 7px 13px;
		border-radius: 9px;
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		color: var(--text);
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}
	.st-link-btn:hover {
		background: var(--surface-hover);
		border-color: var(--border-hover);
	}
	.st-link-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
