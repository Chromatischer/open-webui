<script lang="ts">
	import fileSaver from 'file-saver';
	const { saveAs } = fileSaver;

	import {
		chats,
		user,
		settings,
		scrollPaginationEnabled,
		currentChatPage,
		pinnedChats
	} from '$lib/stores';

	import {
		archiveAllChats,
		deleteAllChats,
		getAllChats,
		getChatList,
		getPinnedChatList,
		importChats
	} from '$lib/apis/chats';
	import { getImportOrigin, convertOpenAIChats } from '$lib/utils';
	import { onMount, getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import SharedChatsModal from '$lib/components/layout/SharedChatsModal.svelte';
	import FilesModal from '$lib/components/layout/FilesModal.svelte';
	import ConfirmDialog from '$lib/components/common/ConfirmDialog.svelte';

	const i18n = getContext('i18n');

	export let saveSettings: Function;

	// Chats
	let importFiles;

	let showArchiveConfirmDialog = false;
	let showDeleteConfirmDialog = false;
	let showSharedChatsModal = false;
	let showFilesModal = false;

	let chatImportInputElement: HTMLInputElement;

	$: if (importFiles) {
		console.log(importFiles);

		let reader = new FileReader();
		reader.onload = (event) => {
			let chats = JSON.parse(event.target.result);
			console.log(chats);
			if (getImportOrigin(chats) == 'openai') {
				try {
					chats = convertOpenAIChats(chats);
				} catch (error) {
					console.log('Unable to import chats:', error);
				}
			}
			importChatsHandler(chats);
		};

		if (importFiles.length > 0) {
			reader.readAsText(importFiles[0]);
		}
	}

	const importChatsHandler = async (_chats) => {
		const res = await importChats(
			localStorage.token,
			_chats.map((chat) => {
				if (chat.chat) {
					return {
						chat: chat.chat,
						meta: chat.meta ?? {},
						pinned: false,
						folder_id: chat?.folder_id ?? null,
						created_at: chat?.created_at ?? null,
						updated_at: chat?.updated_at ?? null
					};
				} else {
					// Legacy format
					return {
						chat: chat,
						meta: {},
						pinned: false,
						folder_id: null,
						created_at: chat?.created_at ?? null,
						updated_at: chat?.updated_at ?? null
					};
				}
			})
		);
		if (res) {
			toast.success(`Successfully imported ${res.length} chats.`);
		}

		currentChatPage.set(1);
		await chats.set(await getChatList(localStorage.token, $currentChatPage));
		pinnedChats.set(await getPinnedChatList(localStorage.token));
		scrollPaginationEnabled.set(true);
	};

	const exportChats = async () => {
		let blob = new Blob([JSON.stringify(await getAllChats(localStorage.token))], {
			type: 'application/json'
		});
		saveAs(blob, `chat-export-${Date.now()}.json`);
	};

	const archiveAllChatsHandler = async () => {
		await goto('/');
		await archiveAllChats(localStorage.token).catch((error) => {
			toast.error(`${error}`);
		});

		currentChatPage.set(1);
		await chats.set(await getChatList(localStorage.token, $currentChatPage));
		pinnedChats.set([]);
		scrollPaginationEnabled.set(true);
	};

	const deleteAllChatsHandler = async () => {
		await goto('/');
		await deleteAllChats(localStorage.token).catch((error) => {
			toast.error(`${error}`);
		});

		currentChatPage.set(1);
		await chats.set(await getChatList(localStorage.token, $currentChatPage));
		scrollPaginationEnabled.set(true);
	};
</script>

<SharedChatsModal bind:show={showSharedChatsModal} />
<FilesModal bind:show={showFilesModal} />

<ConfirmDialog
	title={$i18n.t('Archive All Chats')}
	message={$i18n.t('Are you sure you want to archive all chats? This action cannot be undone.')}
	bind:show={showArchiveConfirmDialog}
	on:confirm={archiveAllChatsHandler}
	on:cancel={() => {
		showArchiveConfirmDialog = false;
	}}
/>

<ConfirmDialog
	title={$i18n.t('Delete All Chats')}
	message={$i18n.t('Are you sure you want to delete all chats? This action cannot be undone.')}
	bind:show={showDeleteConfirmDialog}
	on:confirm={deleteAllChatsHandler}
	on:cancel={() => {
		showDeleteConfirmDialog = false;
	}}
/>

<div id="tab-chats" class="flex flex-col h-full justify-between text-sm">
	<div class="space-y-3 overflow-y-scroll max-h-[28rem] md:max-h-full">
		<input
			id="chat-import-input"
			bind:this={chatImportInputElement}
			bind:files={importFiles}
			type="file"
			accept=".json"
			hidden
		/>

		<div class="dc-section">
			<div class="dc-group-label">{$i18n.t('Chats')}</div>

			<div class="dc-rows">
				<div class="dc-row">
					<div class="dc-row-title">{$i18n.t('Import Chats')}</div>
					<button class="dc-pill" on:click={() => chatImportInputElement.click()} type="button">
						{$i18n.t('Import')}
					</button>
				</div>

				{#if $user?.role === 'admin' || ($user.permissions?.chat?.export ?? true)}
					<div class="dc-row">
						<div class="dc-row-title">{$i18n.t('Export Chats')}</div>
						<button class="dc-pill" on:click={() => exportChats()} type="button">
							{$i18n.t('Export')}
						</button>
					</div>
				{/if}

				<div class="dc-row">
					<div class="dc-row-title">{$i18n.t('Shared Chats')}</div>
					<button class="dc-pill" on:click={() => (showSharedChatsModal = true)} type="button">
						{$i18n.t('Manage')}
					</button>
				</div>

				<div class="dc-row">
					<div class="dc-row-title">{$i18n.t('Archive All Chats')}</div>
					<button class="dc-pill" on:click={() => (showArchiveConfirmDialog = true)} type="button">
						{$i18n.t('Archive All')}
					</button>
				</div>

				<div class="dc-row">
					<div class="dc-row-title">{$i18n.t('Delete All Chats')}</div>
					<button
						class="dc-pill danger"
						on:click={() => (showDeleteConfirmDialog = true)}
						type="button"
					>
						{$i18n.t('Delete All')}
					</button>
				</div>
			</div>
		</div>

		<div class="dc-section">
			<div class="dc-group-label">{$i18n.t('Files')}</div>

			<div class="dc-rows">
				<div class="dc-row">
					<div class="dc-row-title">{$i18n.t('Manage Files')}</div>
					<button class="dc-pill" on:click={() => (showFilesModal = true)} type="button">
						{$i18n.t('Manage')}
					</button>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.dc-section {
		margin-bottom: 22px;
	}
	.dc-group-label {
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--text-tertiary);
		margin-bottom: 10px;
	}
	.dc-rows {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.dc-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 11px 13px;
		border-radius: 12px;
		border: 1px solid var(--border);
		background: var(--surface);
	}
	.dc-row-title {
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
	}
	.dc-pill {
		font-size: 12px;
		font-weight: 500;
		padding: 5px 12px;
		border-radius: 8px;
		border: 1px solid var(--border);
		background: var(--bg-elevated);
		color: var(--text);
		transition:
			background 0.15s ease,
			border-color 0.15s ease,
			color 0.15s ease;
	}
	.dc-pill:hover {
		background: var(--surface-hover);
		border-color: var(--border-hover);
	}
	.dc-pill.danger:hover {
		color: #e0533d;
		border-color: #e0533d;
	}
</style>
