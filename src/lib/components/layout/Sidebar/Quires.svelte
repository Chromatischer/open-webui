<script lang="ts">
	// The Archive — ported 1:1 from the /design manuscript prototype and wired to the
	// real folder + chat APIs. Chats stand in for folios; folders for quires.
	//
	//   begin a new folio         → onNewChat
	//   gather a quire (+)         → createNewFolder
	//   drag a chat onto a quire   → updateChatFolderIdById (file)
	//   rename (inline)            → updateFolderById
	//   dissolve (×)               → deleteFolderById(id, false) — chats return loose
	//   open / close               → updateFolderIsExpandedById (persisted)
	//
	// Single-level by design: top-level folders are quires, their direct chats hang
	// from them on a thread; everything else is a loose folio.

	import { createEventDispatcher, getContext, tick } from 'svelte';
	import { toast } from 'svelte-sonner';

	import { selectedFolder } from '$lib/stores';
	import {
		createNewFolder,
		updateFolderById,
		deleteFolderById,
		updateFolderIsExpandedById
	} from '$lib/apis/folders';
	import { getChatListByFolderId, updateChatFolderIdById } from '$lib/apis/chats';

	import FolioItem from './FolioItem.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import Loader from '$lib/components/common/Loader.svelte';

	const i18n: any = getContext('i18n');
	const dispatch = createEventDispatcher();

	export let folders: Record<string, any> = {};
	export let shiftKey = false;
	export let looseChats: any[] = [];
	export let foldersEnabled = true;
	export let onNewChat: () => void = () => {};
	// re-build the folder registry in the parent (Sidebar.initFolders)
	export let onRefreshFolders: () => Promise<void> | void = () => {};
	// shared with the parent so the "Chats" drop target can refresh a quire on unfile
	export let folderRegistry: Record<string, any> = {};
	// pagination of the loose archive (driven by the parent's chat list)
	export let paginationEnabled = false;
	export let allChatsLoaded = false;
	export let chatListLoading = false;
	export let onLoadMore: () => void = () => {};

	// top-level quires, newest first
	$: quireIds = Object.keys(folders)
		.filter((id) => (folders[id]?.parent_id ?? null) === null)
		.sort((a, b) => (folders[b]?.updated_at ?? 0) - (folders[a]?.updated_at ?? 0));

	let chatsByFolder: Record<string, any[] | null> = {}; // id → chats | null (loading)
	let openMap: Record<string, boolean> = {};
	let renamingId: string | null = null;
	let dropTarget: string | null = null; // a quire id, or 'new' over the gather button

	// seed open state from the persisted is_expanded flag
	$: for (const id of quireIds) {
		if (openMap[id] === undefined) openMap[id] = !!folders[id]?.is_expanded;
	}

	// load each quire's chats once (counts + filed rows) and register a refresher so
	// the parent can reload a quire when a chat is unfiled elsewhere
	let loaded = new Set<string>();
	$: {
		for (const id of quireIds) {
			if (!loaded.has(id)) {
				loaded.add(id);
				folderRegistry[id] = { setFolderItems: () => loadChats(id) };
				loadChats(id);
			}
		}
	}

	// global folio numbers (№) by creation order — newest gets the highest, like /design
	$: noById = (() => {
		const all = [...looseChats];
		for (const id of quireIds) for (const c of chatsByFolder[id] ?? []) all.push(c);
		const seen = new Set<string>();
		const unique = all.filter((c) => c && !seen.has(c.id) && seen.add(c.id));
		unique.sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
		const map: Record<string, number> = {};
		unique.forEach((c, i) => (map[c.id] = i + 1));
		return map;
	})();

	$: folioCount = Object.keys(noById).length;

	const loadChats = async (id: string) => {
		chatsByFolder[id] = null;
		chatsByFolder = chatsByFolder;
		const res = await getChatListByFolderId(localStorage.token, id).catch(() => []);
		chatsByFolder[id] = res ?? [];
		chatsByFolder = chatsByFolder;
	};

	const readChat = (e: DragEvent) => {
		try {
			const raw = e.dataTransfer?.getData('text/plain');
			if (!raw) return null;
			const data = JSON.parse(raw);
			if (data?.type === 'chat' && data?.id) return data;
		} catch (_) {
			// not a chat payload
		}
		return null;
	};

	const toggle = (id: string) => {
		openMap[id] = !openMap[id];
		openMap = openMap;
		updateFolderIsExpandedById(localStorage.token, id, openMap[id]).catch(() => {});
	};

	const selectAllText = (el: HTMLElement) => {
		const range = document.createRange();
		range.selectNodeContents(el);
		const sel = window.getSelection();
		sel?.removeAllRanges();
		sel?.addRange(range);
	};

	const startRename = async (id: string) => {
		renamingId = id;
		await tick();
		const el = document.getElementById('quire-name-' + id);
		if (el) {
			el.focus();
			selectAllText(el);
		}
	};

	const commitRename = async (id: string, raw: string) => {
		renamingId = null;
		const name = (raw || '').trim();
		if (!name || name === folders[id]?.name) return;
		const res = await updateFolderById(localStorage.token, id, { name }).catch((error) => {
			toast.error(`${error}`);
			return null;
		});
		if (res) await onRefreshFolders();
	};

	// dissolving a quire returns its chats to the loose archive — nothing is lost
	const dissolve = async (id: string) => {
		const res = await deleteFolderById(localStorage.token, id, false).catch((error) => {
			toast.error(`${error}`);
			return null;
		});
		if (res) {
			loaded.delete(id);
			if (($selectedFolder as any)?.id === id) selectedFolder.set(null);
			await onRefreshFolders();
			dispatch('change');
		}
	};

	// unique default name among top-level quires, matching the existing folder flow
	const uniqueQuireName = () => {
		const base = $i18n.t('New quire');
		const siblings = quireIds.map((id) => (folders[id]?.name ?? '').toLowerCase());
		if (!siblings.includes(base.toLowerCase())) return base;
		let i = 1;
		while (siblings.includes(`${base} ${i}`.toLowerCase())) i++;
		return `${base} ${i}`;
	};

	const gather = async () => {
		const res = await createNewFolder(localStorage.token, { name: uniqueQuireName() }).catch(
			(error) => {
				toast.error(`${error}`);
				return null;
			}
		);
		if (res?.id) {
			await onRefreshFolders();
			await tick();
			openMap[res.id] = true;
			openMap = openMap;
			startRename(res.id);
		}
	};

	const fileInto = async (folderId: string, e: DragEvent) => {
		dropTarget = null;
		const payload = readChat(e);
		if (!payload) return;
		const res = await updateChatFolderIdById(localStorage.token, payload.id, folderId).catch(
			(error) => {
				toast.error(`${error}`);
				return null;
			}
		);
		if (res !== null) {
			openMap[folderId] = true;
			openMap = openMap;
			await loadChats(folderId);
			dispatch('change'); // parent re-loads the loose chat list
		}
	};

	// dropping a folio on the open list (not on a quire) returns it to the loose leaves
	const unfile = async (e: DragEvent) => {
		dropTarget = null;
		const payload = readChat(e);
		if (!payload) return;
		const res = await updateChatFolderIdById(localStorage.token, payload.id, undefined).catch(
			(error) => {
				toast.error(`${error}`);
				return null;
			}
		);
		if (res !== null) {
			for (const id of quireIds) if (loaded.has(id)) await loadChats(id);
			dispatch('change');
		}
	};

	// drag a chat onto the gather button → gather it into a fresh quire
	const gatherInto = async (e: DragEvent) => {
		dropTarget = null;
		const payload = readChat(e);
		const res = await createNewFolder(localStorage.token, { name: uniqueQuireName() }).catch(
			(error) => {
				toast.error(`${error}`);
				return null;
			}
		);
		if (res?.id) {
			if (payload) {
				await updateChatFolderIdById(localStorage.token, payload.id, res.id).catch(() => {});
			}
			await onRefreshFolders();
			await tick();
			openMap[res.id] = true;
			openMap = openMap;
			dispatch('change');
			if (!payload) startRename(res.id);
		}
	};

	// expose gather so the section's "+" header button can trigger it too
	export const gatherQuire = gather;
</script>

<div class="archive">
	<div class="arch-head">
		<span class="arch-kicker">{$i18n.t('The Archive')}</span>
		<span class="arch-count">
			{folioCount}
			{folioCount === 1 ? $i18n.t('folio') : $i18n.t('folios')}{quireIds.length
				? ` · ${quireIds.length} ${quireIds.length === 1 ? $i18n.t('quire') : $i18n.t('quires')}`
				: ''}
		</span>
	</div>

	<div class="arch-newrow">
		<button class="arch-new" on:click={onNewChat}>
			<svg
				width="13"
				height="13"
				viewBox="0 0 14 14"
				fill="none"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"><path d="M7 2.5v9M2.5 7h9" /></svg
			>
			{$i18n.t('Begin a new folio')}
		</button>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<button
			class="arch-new gather"
			class:dropping={dropTarget === 'new'}
			class:hidden={!foldersEnabled}
			title={$i18n.t('Gather a quire')}
			aria-label={$i18n.t('Gather a quire')}
			on:click={gather}
			on:dragover={(e) => {
				e.preventDefault();
				dropTarget = 'new';
			}}
			on:dragleave={() => dropTarget === 'new' && (dropTarget = null)}
			on:drop={(e) => {
				e.preventDefault();
				e.stopPropagation();
				gatherInto(e);
			}}
		>
			<svg
				width="13"
				height="13"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path
					d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
				/></svg
			>
		</button>
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="arch-list"
		on:dragover={(e) => e.preventDefault()}
		on:drop={(e) => {
			e.preventDefault();
			unfile(e);
		}}
	>
		{#each quireIds as id (id)}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="quire-head"
				class:open={openMap[id]}
				class:dropping={dropTarget === id}
				role="button"
				tabindex="0"
				aria-expanded={openMap[id]}
				on:click={() => toggle(id)}
				on:keydown={(e) => {
					if (e.key === 'Enter' && e.target === e.currentTarget) toggle(id);
				}}
				on:dragover={(e) => {
					e.preventDefault();
					dropTarget = id;
				}}
				on:dragleave={(e) => {
					if (!e.currentTarget.contains(e.relatedTarget as Node)) dropTarget = null;
				}}
				on:drop={(e) => {
					e.preventDefault();
					e.stopPropagation();
					fileInto(id, e);
				}}
			>
				<svg
					class="quire-chev"
					width="10"
					height="10"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg
				>
				{#if renamingId === id}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<span
						id="quire-name-{id}"
						class="quire-name editing"
						contenteditable="plaintext-only"
						spellcheck="false"
						on:click={(e) => e.stopPropagation()}
						on:keydown={(e) => {
							e.stopPropagation();
							if (e.key === 'Enter') {
								e.preventDefault();
								e.currentTarget.blur();
							} else if (e.key === 'Escape') {
								renamingId = null;
							}
						}}
						on:blur={(e) => commitRename(id, e.currentTarget.textContent ?? '')}
						>{folders[id]?.name ?? ''}</span
					>
				{:else}
					<span class="quire-name">{folders[id]?.name ?? ''}</span>
				{/if}
				<span class="quire-count">{(chatsByFolder[id] ?? []).length}</span>
				<span class="quire-tools">
					<button
						class="qtool"
						title={$i18n.t('Rename')}
						aria-label={$i18n.t('Rename')}
						on:click={(e) => {
							e.stopPropagation();
							startRename(id);
						}}
					>
						<svg
							width="11"
							height="11"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							stroke-linejoin="round"
							><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg
						>
					</button>
					<button
						class="qtool"
						title={$i18n.t('Dissolve the quire — its chats return to the archive')}
						aria-label={$i18n.t('Dissolve')}
						on:click={(e) => {
							e.stopPropagation();
							dissolve(id);
						}}
					>
						<svg
							width="11"
							height="11"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg
						>
					</button>
				</span>
			</div>

			{#if openMap[id]}
				{#if chatsByFolder[id] === null}
					<div class="quire-loading"><Spinner className="size-4" /></div>
				{:else if (chatsByFolder[id] ?? []).length === 0}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="quire-empty"
						class:dropping={dropTarget === id}
						on:dragover={(e) => {
							e.preventDefault();
							dropTarget = id;
						}}
						on:dragleave={(e) => {
							if (!e.currentTarget.contains(e.relatedTarget as Node)) dropTarget = null;
						}}
						on:drop={(e) => {
							e.preventDefault();
							e.stopPropagation();
							fileInto(id, e);
						}}
					>
						{$i18n.t('nothing gathered yet — drag a chat in')}
					</div>
				{:else}
					{#each chatsByFolder[id] ?? [] as chat (chat.id)}
						<div class="quire-leaf">
							<FolioItem
								id={chat.id}
								title={chat.title}
								no={noById[chat.id] ?? null}
								updatedAt={chat.updated_at}
								filed={true}
							/>
						</div>
					{/each}
				{/if}
			{/if}
		{/each}

		{#each looseChats as chat (chat.id)}
			<FolioItem
				id={chat.id}
				title={chat.title}
				no={noById[chat.id] ?? null}
				updatedAt={chat.updated_at}
			/>
		{/each}

		{#if paginationEnabled && !allChatsLoaded}
			<Loader
				on:visible={() => {
					if (!chatListLoading) onLoadMore();
				}}
			>
				<div class="quire-loading"><Spinner className="size-4" /></div>
			</Loader>
		{/if}
	</div>
</div>

<style>
	.archive {
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.arch-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		padding: 0 8px 12px;
	}
	.arch-kicker {
		font-size: 12px;
		font-weight: 650;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--text-secondary);
	}
	.arch-count {
		font-family: var(--mono);
		font-size: 12px;
		color: var(--text-tertiary);
		white-space: nowrap;
	}

	/* ── Begin a new folio / gather a quire ── */
	.arch-newrow {
		display: flex;
		gap: 6px;
		margin: 0 0 10px;
	}
	.arch-new {
		display: flex;
		align-items: center;
		gap: 9px;
		flex: 1;
		min-width: 0;
		padding: 9px 12px;
		border-radius: 10px;
		border: 1px dashed var(--border);
		background: transparent;
		color: var(--text-secondary);
		font-family: var(--serif);
		font-style: italic;
		font-size: 14px;
		cursor: pointer;
		transition:
			border-color 0.2s,
			color 0.2s,
			background 0.2s,
			transform 0.2s var(--spring);
	}
	.arch-new:hover {
		border-color: var(--accent);
		color: var(--accent);
		background: var(--accent-glow);
		transform: translateX(2px);
	}
	.arch-new svg {
		transition: transform 0.35s var(--spring);
	}
	.arch-new:hover svg {
		transform: rotate(90deg);
	}
	.arch-new.gather {
		flex: none;
		padding: 9px 12px;
	}
	.arch-new.gather:hover {
		transform: none;
	}
	.arch-new.gather:hover svg {
		transform: none;
	}
	.arch-new.dropping {
		border-style: solid;
		border-color: var(--accent);
		color: var(--accent);
		background: var(--accent-glow);
	}

	.arch-list {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	/* ── Quire head: the folder, as a sewn signature ── */
	.quire-head {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 8px 10px;
		margin-top: 6px;
		border-radius: 10px;
		border: 1px dashed transparent;
		background: transparent;
		cursor: pointer;
		color: var(--text-secondary);
		user-select: none;
		transition:
			background 0.18s,
			color 0.18s,
			border-color 0.18s;
	}
	.quire-head:first-child {
		margin-top: 0;
	}
	.quire-head:hover {
		background: var(--surface-hover);
		color: var(--text);
	}
	.quire-head.dropping,
	.quire-empty.dropping {
		border-color: color-mix(in srgb, var(--accent) 55%, transparent);
		background: var(--accent-glow);
		color: var(--accent);
	}
	.quire-chev {
		flex: none;
		color: var(--text-tertiary);
		transition:
			transform 0.3s var(--spring),
			color 0.18s;
	}
	.quire-head.open .quire-chev {
		transform: rotate(90deg);
	}
	.quire-head:hover .quire-chev {
		color: var(--accent);
	}
	.quire-name {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-size: 12px;
		font-weight: 650;
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}
	.quire-name.editing {
		outline: none;
		caret-color: var(--accent);
		border-bottom: 1px dashed var(--border);
		min-width: 40px;
	}
	.quire-count {
		font-family: var(--mono);
		font-size: 12px;
		color: var(--text-tertiary);
		margin-left: auto;
		flex: none;
	}
	.quire-tools {
		display: flex;
		gap: 2px;
		flex: none;
		opacity: 0;
		transition: opacity 0.18s;
	}
	.quire-head:hover .quire-tools,
	.quire-head:focus-within .quire-tools {
		opacity: 1;
	}
	.qtool {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 6px;
		border: none;
		background: transparent;
		color: var(--text-tertiary);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.qtool:hover {
		background: var(--surface-hover);
		color: var(--accent);
	}

	/* ── Filed chats hang from their quire on a thread ── */
	.quire-leaf {
		position: relative;
		margin-left: 16px;
	}
	.quire-leaf::before {
		content: '';
		position: absolute;
		left: -9px;
		top: -2px;
		bottom: -2px;
		width: 1px;
		background: var(--border);
	}

	.quire-loading {
		display: flex;
		justify-content: center;
		padding: 6px;
		color: var(--text-tertiary);
	}
	.quire-empty {
		position: relative;
		margin-left: 16px;
		padding: 7px 10px;
		border-radius: 10px;
		border: 1px dashed transparent;
		font-family: var(--serif);
		font-style: italic;
		font-size: 12.5px;
		color: var(--text-tertiary);
	}
	.quire-empty::before {
		content: '';
		position: absolute;
		left: -9px;
		top: -2px;
		bottom: -2px;
		width: 1px;
		background: var(--border);
	}
</style>
