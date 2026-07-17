<script lang="ts">
	import { onMount, tick, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		chats,
		chatId,
		chatTitle,
		currentChatPage,
		user,
		config,
		showSidebar,
		mobile,
		selectedFolder
	} from '$lib/stores';
	import {
		getChatList,
		getChatListByFolderId,
		updateChatFolderIdById,
		updateChatById,
		cloneChatById,
		archiveChatById,
		deleteChatById
	} from '$lib/apis/chats';
	import {
		getFolders,
		createNewFolder,
		updateFolderById,
		deleteFolderById,
		updateFolderIsExpandedById
	} from '$lib/apis/folders';
	import { downloadChatJSON, downloadChatTxt, downloadChatPdf } from '$lib/utils/chat-export';
	import ContextMenu, { deferToNative } from '$lib/components/common/ContextMenu.svelte';
	import UserMenu from './Sidebar/UserMenu.svelte';

	/*
	 * THE ARCHIVE — older folios, peeled open from the left.
	 * The /design archive (folio list · new folio · quires · the binder's hand),
	 * ported 1:1 and wired to the real chat + folder APIs.
	 *
	 *   begin a new folio        → goto('/')           (a fresh chat)
	 *   gather a quire (＋)        → createNewFolder
	 *   drag a folio onto a quire → updateChatFolderIdById (file)
	 *   rename (inline)          → updateFolderById
	 *   dissolve (×)             → deleteFolderById(id, false) — folios return loose
	 *   open / close             → updateFolderIsExpandedById (persisted)
	 *
	 * Single-level by design: top-level folders are quires, their direct chats hang
	 * from them on a thread; everything else is a loose leaf. The real chat list
	 * ($chats) already excludes filed chats, so there is no double-listing.
	 */

	let revealed = $state(false);
	let showUserMenu = $state(false);

	let folders = $state<any[]>([]); // top-level quires, newest first
	let chatsByFolder = $state<Record<string, any[]>>({}); // folder id → filed chats
	let openMap = $state<Record<string, boolean>>({}); // folder id → expanded
	let renamingQuire = $state<string | null>(null);
	let renamingFolio = $state<string | null>(null);
	let dragId = $state<string | null>(null);
	let dropQuire = $state<string | null>(null); // a quire id, or 'new' over the gather button

	// ─── The binder's menu (right-click) ───
	let ctxMenu = $state<any>(null);
	let ctx = $state<any>(null); // { kind: 'folio', f, q } | { kind: 'quire', q } | { kind: 'list' }
	let armed = $state<string | null>(null); // a destructive item waiting for its second click
	let sub = $state<string | null>(null); // 'move' | 'download' — the unfolded inline submenu

	const token = () => localStorage.token;

	const foldersEnabled = $derived(
		$config?.features?.enable_folders !== false &&
			($user?.role === 'admin' || ($user?.permissions?.features?.folders ?? true))
	);

	// global folio numbers (№) by creation order — newest gets the highest, like /design
	const noById = $derived.by(() => {
		const all = [...($chats ?? [])];
		for (const f of folders) for (const c of chatsByFolder[f.id] ?? []) all.push(c);
		const seen = new Set<string>();
		const unique = all.filter((c) => c && !seen.has(c.id) && seen.add(c.id));
		unique.sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0));
		const map: Record<string, number> = {};
		unique.forEach((c, i) => (map[c.id] = i + 1));
		return map;
	});

	const folioCount = $derived(Object.keys(noById).length);

	// the archive flattened to rows: quire heads, their filed folios, then loose leaves
	const archRows = $derived.by(() => {
		const rows: any[] = [];
		for (const q of folders) {
			const filed = chatsByFolder[q.id] ?? [];
			rows.push({ kind: 'quire', key: 'q:' + q.id, q, count: filed.length });
			if (openMap[q.id]) {
				if (!filed.length) rows.push({ kind: 'empty', key: 'e:' + q.id, q });
				for (const f of filed) rows.push({ kind: 'folio', key: 'f:' + f.id, f, q });
			}
		}
		for (const f of $chats ?? []) rows.push({ kind: 'folio', key: 'l:' + f.id, f, q: null });
		return rows;
	});

	const loadFolderChats = async (id: string) => {
		const res = await getChatListByFolderId(token(), id).catch(() => []);
		chatsByFolder[id] = res ?? [];
	};

	const loadFolders = async () => {
		if (!foldersEnabled) {
			folders = [];
			return;
		}
		const list = await getFolders(token()).catch(() => []);
		const top = (list ?? [])
			.filter((f: any) => (f.parent_id ?? null) === null)
			.sort((a: any, b: any) => (b.updated_at ?? 0) - (a.updated_at ?? 0));
		folders = top;
		for (const f of top) {
			if (openMap[f.id] === undefined) openMap[f.id] = !!f.is_expanded;
			loadFolderChats(f.id); // load all so counts show even when closed
		}
	};

	// pull the loose list back from the server (a chat just changed folders)
	const refreshLoose = async () => {
		try {
			currentChatPage.set(1);
			await chats.set(await getChatList(token(), 1));
		} catch (e) {
			// leave the list as-is on error
		}
	};

	onMount(async () => {
		if (!$chats || $chats.length === 0) {
			try {
				await chats.set(await getChatList(token(), 1));
				currentChatPage.set(1);
			} catch (e) {
				// ignore — list stays empty until the app populates it
			}
		}
		await loadFolders();
		requestAnimationFrame(() => (revealed = true));
	});

	const relTime = (ts: number) => {
		if (!ts) return '';
		const d = new Date(ts < 1e12 ? ts * 1000 : ts);
		const diff = (Date.now() - d.getTime()) / 1000;
		if (diff < 86400) return 'today';
		if (diff < 172800) return 'yesterday';
		return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
	};
	const pad = (n: number | undefined) => (n == null ? '' : String(n).padStart(2, '0'));

	const newFolio = async () => {
		if ($mobile) showSidebar.set(false);
		await goto('/');
	};
	const selectFolio = async (id: string) => {
		if ($mobile) showSidebar.set(false);
		await goto(`/c/${id}`);
	};

	// ─── Quires: gather, file, unfile, rename, dissolve ───
	const toggle = (q: any) => {
		openMap[q.id] = !openMap[q.id];
		updateFolderIsExpandedById(token(), q.id, openMap[q.id]).catch(() => {});
	};

	const uniqueQuireName = () => {
		const base = 'New quire';
		const siblings = folders.map((f) => (f.name ?? '').toLowerCase());
		if (!siblings.includes(base.toLowerCase())) return base;
		let i = 1;
		while (siblings.includes(`${base} ${i}`.toLowerCase())) i++;
		return `${base} ${i}`;
	};

	const startRenameQuire = async (id: string) => {
		renamingQuire = id;
		await tick();
		const el = document.getElementById('qn-' + id);
		if (el) {
			el.focus();
			const r = document.createRange();
			r.selectNodeContents(el);
			const s = window.getSelection();
			s?.removeAllRanges();
			s?.addRange(r);
		}
	};

	const commitRename = async (id: string, raw: string) => {
		renamingQuire = null;
		const name = (raw || '').trim();
		const current = folders.find((f) => f.id === id);
		if (!name || name === current?.name) return;
		const res = await updateFolderById(token(), id, { name } as any).catch(() => null);
		if (res) await loadFolders();
	};

	const newQuire = async () => {
		const res = await createNewFolder(token(), { name: uniqueQuireName() } as any).catch(
			() => null
		);
		if (res?.id) {
			await loadFolders();
			openMap[res.id] = true;
			startRenameQuire(res.id);
		}
		return res;
	};

	// dissolving a quire returns its folios to the loose archive — nothing is lost
	const dissolveQuire = async (id: string) => {
		const res = await deleteFolderById(token(), id, false).catch(() => null);
		if (res) {
			if (renamingQuire === id) renamingQuire = null;
			delete openMap[id];
			delete chatsByFolder[id];
			await loadFolders();
			await refreshLoose();
		}
	};

	// file a folio into a quire (or back to the loose leaves) — drag and menu share this
	const fileChat = async (id: string, folderId?: string) => {
		const res = await updateChatFolderIdById(token(), id, folderId).catch(() => null);
		if (res !== null) {
			if (folderId) openMap[folderId] = true;
			for (const f of folders) await loadFolderChats(f.id);
			await refreshLoose();
		}
	};

	const fileInto = async (folderId: string) => {
		const id = dragId;
		dragId = null;
		dropQuire = null;
		if (id) await fileChat(id, folderId);
	};

	const unfile = async () => {
		const id = dragId;
		dragId = null;
		dropQuire = null;
		if (id) await fileChat(id, undefined);
	};

	const gatherInto = async () => {
		const id = dragId;
		dragId = null;
		dropQuire = null;
		const res = await createNewFolder(token(), { name: uniqueQuireName() } as any).catch(
			() => null
		);
		if (res?.id) {
			if (id) await updateChatFolderIdById(token(), id, res.id).catch(() => {});
			await loadFolders();
			openMap[res.id] = true;
			await refreshLoose();
			if (!id) startRenameQuire(res.id);
		}
	};

	// ─── Folios: rename inline, the quire way ───
	const startRenameFolio = async (id: string) => {
		renamingFolio = id;
		await tick();
		const el = document.getElementById('fn-' + id);
		if (el) {
			el.focus();
			const r = document.createRange();
			r.selectNodeContents(el);
			const s = window.getSelection();
			s?.removeAllRanges();
			s?.addRange(r);
		}
	};

	const commitRenameFolio = async (id: string, raw: string) => {
		renamingFolio = null;
		const title = (raw || '').trim();
		const current =
			($chats ?? []).find((c: any) => c.id === id) ??
			folders.flatMap((f) => chatsByFolder[f.id] ?? []).find((c: any) => c.id === id);
		if (!title || title === current?.title) return;
		const res = await updateChatById(token(), id, { title }).catch(() => null);
		if (res) {
			if (id === $chatId) chatTitle.set(title);
			for (const f of folders) await loadFolderChats(f.id);
			await refreshLoose();
		}
	};

	// ─── The binder's menu: what the right hand asks of a row ───
	const openCtx = (e: MouseEvent, target: any) => {
		if ($mobile) return;
		if (deferToNative(e)) return;
		e.preventDefault();
		e.stopPropagation();
		ctx = target;
		armed = null;
		sub = null;
		ctxMenu?.openAt(e);
	};

	const refreshAll = async () => {
		for (const f of folders) await loadFolderChats(f.id);
		await refreshLoose();
	};

	const ctxRenameFolio = () => {
		const f = ctx?.f;
		ctxMenu?.close();
		if (f) startRenameFolio(f.id);
	};

	const ctxMove = async (folderId?: string) => {
		const f = ctx?.f;
		ctxMenu?.close();
		if (f) await fileChat(f.id, folderId);
	};

	const ctxClone = async () => {
		const f = ctx?.f;
		ctxMenu?.close();
		if (!f) return;
		const res = await cloneChatById(token(), f.id).catch(() => null);
		if (res) {
			await refreshAll();
			await selectFolio(res.id);
		}
	};

	const ctxArchive = async () => {
		const f = ctx?.f;
		ctxMenu?.close();
		if (!f) return;
		const res = await archiveChatById(token(), f.id).catch(() => null);
		if (res !== null) {
			await refreshAll();
			if (f.id === $chatId) await goto('/');
		}
	};

	const ctxDelete = async () => {
		if (armed !== 'delete') {
			armed = 'delete';
			return;
		}
		const f = ctx?.f;
		ctxMenu?.close();
		if (!f) return;
		const res = await deleteChatById(token(), f.id).catch(() => null);
		if (res) {
			await refreshAll();
			if (f.id === $chatId) await goto('/');
		}
	};

	const ctxDissolve = async () => {
		if (armed !== 'dissolve') {
			armed = 'dissolve';
			return;
		}
		const q = ctx?.q;
		ctxMenu?.close();
		if (q) await dissolveQuire(q.id);
	};

	const ctxNewFolioInQuire = async () => {
		const q = ctx?.q;
		ctxMenu?.close();
		if (!q) return;
		selectedFolder.set(q);
		if ($mobile) showSidebar.set(false);
		await goto('/');
	};

	const toggleSub = (which: string) => {
		sub = sub === which ? null : which;
		ctxMenu?.reposition();
	};

	// A chat created elsewhere (e.g. filed straight into a quire) only shows up in
	// the folder lists after a reload — refresh them whenever the loose list moves.
	$effect(() => {
		const list = $chats;
		if (!list) return;
		untrack(() => {
			for (const f of folders) loadFolderChats(f.id);
		});
	});
</script>

<aside class="archive" class:revealed aria-label="The archive">
	<div class="arch-head">
		<span class="arch-kicker">The Archive</span>
		<span class="arch-count"
			>{folioCount} folios{folders.length
				? ` · ${folders.length} quire${folders.length === 1 ? '' : 's'}`
				: ''}</span
		>
	</div>

	<div class="arch-newrow">
		<button class="arch-new" onclick={newFolio}>
			<svg
				width="13"
				height="13"
				viewBox="0 0 14 14"
				fill="none"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"><path d="M7 2.5v9M2.5 7h9" /></svg
			>
			Begin a new folio
		</button>
		{#if foldersEnabled}
			<button
				class="arch-new gather"
				class:dropping={dropQuire === 'new'}
				onclick={() => newQuire()}
				title="Gather a new quire"
				aria-label="Gather a new quire"
				ondragover={(e) => {
					if (!dragId) return;
					e.preventDefault();
					dropQuire = 'new';
				}}
				ondragleave={() => dropQuire === 'new' && (dropQuire = null)}
				ondrop={(e) => {
					e.preventDefault();
					e.stopPropagation();
					gatherInto();
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
		{/if}
	</div>

	<!-- dropping a folio on the open list (not on a quire) returns it to the loose leaves -->
	<div
		class="arch-list"
		role="list"
		ondragover={(e) => dragId && e.preventDefault()}
		ondrop={(e) => {
			e.preventDefault();
			unfile();
		}}
		oncontextmenu={(e) => openCtx(e, { kind: 'list' })}
	>
		{#each archRows as row, i (row.key)}
			{#if row.kind === 'quire'}
				<div
					class="quire-head"
					class:open={openMap[row.q.id]}
					class:dropping={dropQuire === row.q.id}
					style:--i={i}
					role="button"
					tabindex="0"
					aria-expanded={openMap[row.q.id]}
					onclick={() => toggle(row.q)}
					onkeydown={(e) => {
						if (e.key === 'Enter' && e.target === e.currentTarget) toggle(row.q);
					}}
					ondragover={(e) => {
						if (!dragId) return;
						e.preventDefault();
						dropQuire = row.q.id;
					}}
					ondragleave={(e) => {
						if (!e.currentTarget.contains(e.relatedTarget as Node)) dropQuire = null;
					}}
					ondrop={(e) => {
						e.preventDefault();
						e.stopPropagation();
						fileInto(row.q.id);
					}}
					oncontextmenu={(e) => openCtx(e, { kind: 'quire', q: row.q })}
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
					{#if renamingQuire === row.q.id}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<span
							id="qn-{row.q.id}"
							class="quire-name editing"
							contenteditable="plaintext-only"
							spellcheck="false"
							onclick={(e) => e.stopPropagation()}
							onkeydown={(e) => {
								e.stopPropagation();
								if (e.key === 'Enter') {
									e.preventDefault();
									e.currentTarget.blur();
								} else if (e.key === 'Escape') {
									renamingQuire = null;
								}
							}}
							onblur={(e) => commitRename(row.q.id, e.currentTarget.textContent ?? '')}
							>{row.q.name}</span
						>
					{:else}
						<span class="quire-name">{row.q.name}</span>
					{/if}
					<span class="quire-count">{row.count}</span>
					<span class="quire-tools">
						<button
							class="qtool"
							title="Rename the quire"
							aria-label="Rename the quire"
							onclick={(e) => {
								e.stopPropagation();
								startRenameQuire(row.q.id);
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
							title="Dissolve the quire — its folios return to the archive"
							aria-label="Dissolve the quire"
							onclick={(e) => {
								e.stopPropagation();
								dissolveQuire(row.q.id);
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
			{:else if row.kind === 'empty'}
				<div
					class="quire-empty"
					class:dropping={dropQuire === row.q.id}
					style:--i={i}
					role="presentation"
					ondragover={(e) => {
						if (!dragId) return;
						e.preventDefault();
						dropQuire = row.q.id;
					}}
					ondragleave={(e) => {
						if (!e.currentTarget.contains(e.relatedTarget as Node)) dropQuire = null;
					}}
					ondrop={(e) => {
						e.preventDefault();
						e.stopPropagation();
						fileInto(row.q.id);
					}}
					oncontextmenu={(e) => openCtx(e, { kind: 'quire', q: row.q })}
				>
					nothing gathered yet — drag a folio in
				</div>
			{:else}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					class="arch-item"
					class:current={row.f.id === $chatId}
					class:filed={!!row.q}
					class:dragging={dragId === row.f.id}
					style:--i={i}
					role="button"
					tabindex="0"
					draggable={renamingFolio !== row.f.id}
					onclick={() => renamingFolio !== row.f.id && selectFolio(row.f.id)}
					onkeydown={(e) => {
						if (e.key === 'Enter' && e.target === e.currentTarget) selectFolio(row.f.id);
					}}
					oncontextmenu={(e) => openCtx(e, { kind: 'folio', f: row.f, q: row.q })}
					ondragstart={(e) => {
						dragId = row.f.id;
						e.dataTransfer?.setData('text/plain', row.f.id);
						if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
					}}
					ondragend={() => {
						dragId = null;
						dropQuire = null;
					}}
					ondragover={row.q
						? (e) => {
								if (!dragId) return;
								e.preventDefault();
								dropQuire = row.q.id;
							}
						: undefined}
					ondragleave={row.q
						? (e) => {
								if (!e.currentTarget.contains(e.relatedTarget as Node)) dropQuire = null;
							}
						: undefined}
					ondrop={row.q
						? (e) => {
								e.preventDefault();
								e.stopPropagation();
								fileInto(row.q.id);
							}
						: undefined}
				>
					<span class="arch-no">№{pad(noById[row.f.id])}</span>
					<span class="arch-body">
						{#if renamingFolio === row.f.id}
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<span
								id="fn-{row.f.id}"
								class="arch-title editing"
								contenteditable="plaintext-only"
								spellcheck="false"
								onclick={(e) => e.stopPropagation()}
								onkeydown={(e) => {
									e.stopPropagation();
									if (e.key === 'Enter') {
										e.preventDefault();
										e.currentTarget.blur();
									} else if (e.key === 'Escape') {
										renamingFolio = null;
									}
								}}
								onblur={(e) => commitRenameFolio(row.f.id, e.currentTarget.textContent ?? '')}
								>{row.f.title || 'Untitled folio'}</span
							>
						{:else}
							<span class="arch-title">{row.f.title || 'Untitled folio'}</span>
						{/if}
						<span class="arch-meta">{relTime(row.f.updated_at)}</span>
					</span>
					<svg
						class="arch-arrow"
						width="11"
						height="11"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg
					>
				</div>
			{/if}
		{/each}
	</div>

	<div class="arch-foot">
		<UserMenu
			bind:show={showUserMenu}
			role={$user?.role}
			className="w-[240px]"
			align="start"
			profile={true}
			help={true}
		>
			<button class="arch-userbtn" type="button" aria-label="Open user menu">
				<span class="arch-avatar" aria-hidden="true"
					>{($user?.name ?? '?').slice(0, 1).toUpperCase()}</span
				>
				<span class="arch-user">
					<span class="arch-name">{$user?.name ?? ''}</span>
					<span class="arch-mail">{$user?.email ?? ''}</span>
				</span>
			</button>
		</UserMenu>
	</div>
</aside>

<ContextMenu
	bind:this={ctxMenu}
	onOpenChange={(open) => {
		if (!open) {
			armed = null;
			sub = null;
		}
	}}
>
	{#if ctx?.kind === 'folio'}
		<button
			class="ctx-item"
			onclick={() => {
				const f = ctx.f;
				ctxMenu?.close();
				selectFolio(f.id);
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
				stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg
			>
			<span class="ctx-label">Open</span>
		</button>
		<button class="ctx-item" onclick={ctxRenameFolio}>
			<svg
				width="13"
				height="13"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg
			>
			<span class="ctx-label">Rename</span>
		</button>
		{#if foldersEnabled && (folders.some((q) => q.id !== ctx.q?.id) || ctx.q)}
			<button class="ctx-item" class:unfolded={sub === 'move'} onclick={() => toggleSub('move')}>
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
				<span class="ctx-label">Move to…</span>
				<svg
					class="ctx-caret"
					width="10"
					height="10"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg
				>
			</button>
			{#if sub === 'move'}
				<div class="ctx-sub">
					{#each folders.filter((q) => q.id !== ctx.q?.id) as q (q.id)}
						<button class="ctx-item" onclick={() => ctxMove(q.id)}>
							<span class="ctx-label">{q.name}</span>
						</button>
					{/each}
					{#if ctx.q}
						<button class="ctx-item" onclick={() => ctxMove(undefined)}>
							<span class="ctx-label">Unfile</span>
						</button>
					{/if}
				</div>
			{/if}
		{/if}
		<button class="ctx-item" onclick={ctxClone}>
			<svg
				width="13"
				height="13"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				><rect x="9" y="9" width="12" height="12" rx="2" /><path
					d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
				/></svg
			>
			<span class="ctx-label">Clone</span>
		</button>
		<button
			class="ctx-item"
			class:unfolded={sub === 'download'}
			onclick={() => toggleSub('download')}
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
				><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg
			>
			<span class="ctx-label">Download…</span>
			<svg
				class="ctx-caret"
				width="10"
				height="10"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.2"
				stroke-linecap="round"
				stroke-linejoin="round"><path d="M9 6l6 6-6 6" /></svg
			>
		</button>
		{#if sub === 'download'}
			<div class="ctx-sub">
				<button
					class="ctx-item"
					onclick={() => {
						const f = ctx.f;
						ctxMenu?.close();
						downloadChatJSON(token(), f.id);
					}}
				>
					<span class="ctx-label">Export (.json)</span>
				</button>
				<button
					class="ctx-item"
					onclick={() => {
						const f = ctx.f;
						ctxMenu?.close();
						downloadChatTxt(token(), f.id);
					}}
				>
					<span class="ctx-label">Plain text (.txt)</span>
				</button>
				<button
					class="ctx-item"
					onclick={() => {
						const f = ctx.f;
						ctxMenu?.close();
						downloadChatPdf(token(), f.id);
					}}
				>
					<span class="ctx-label">PDF (.pdf)</span>
				</button>
			</div>
		{/if}
		<div class="ctx-rule"></div>
		<button class="ctx-item" onclick={ctxArchive}>
			<svg
				width="13"
				height="13"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" /></svg
			>
			<span class="ctx-label">Archive</span>
		</button>
		<button class="ctx-item" class:armed={armed === 'delete'} onclick={ctxDelete}>
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
					d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"
				/></svg
			>
			<span class="ctx-label">{armed === 'delete' ? 'Confirm delete' : 'Delete'}</span>
		</button>
	{:else if ctx?.kind === 'quire'}
		<button class="ctx-item" onclick={ctxNewFolioInQuire}>
			<svg
				width="13"
				height="13"
				viewBox="0 0 14 14"
				fill="none"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"><path d="M7 2.5v9M2.5 7h9" /></svg
			>
			<span class="ctx-label">New folio in this quire</span>
		</button>
		<button
			class="ctx-item"
			onclick={() => {
				const q = ctx.q;
				ctxMenu?.close();
				startRenameQuire(q.id);
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
				><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg
			>
			<span class="ctx-label">Rename</span>
		</button>
		<div class="ctx-rule"></div>
		<button class="ctx-item" class:armed={armed === 'dissolve'} onclick={ctxDissolve}>
			<svg
				width="13"
				height="13"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg
			>
			<span class="ctx-label">{armed === 'dissolve' ? 'Confirm dissolve' : 'Dissolve'}</span>
		</button>
	{:else if ctx?.kind === 'list'}
		<button
			class="ctx-item"
			onclick={() => {
				ctxMenu?.close();
				newFolio();
			}}
		>
			<svg
				width="13"
				height="13"
				viewBox="0 0 14 14"
				fill="none"
				stroke="currentColor"
				stroke-width="1.6"
				stroke-linecap="round"><path d="M7 2.5v9M2.5 7h9" /></svg
			>
			<span class="ctx-label">New folio</span>
		</button>
		{#if foldersEnabled}
			<button
				class="ctx-item"
				onclick={() => {
					ctxMenu?.close();
					newQuire();
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
				<span class="ctx-label">New quire</span>
			</button>
		{/if}
	{/if}
</ContextMenu>

<style>
	.archive {
		position: relative;
		width: 100%;
		height: 100%;
		z-index: 0;
		display: flex;
		flex-direction: column;
		padding: 26px 18px 18px;
		color: var(--ink);
		box-sizing: border-box;
	}
	.archive.revealed {
		visibility: visible;
		transition-delay: 0s;
	}
	.arch-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 10px;
		padding: 0 8px 14px;
	}
	.arch-kicker {
		flex: none;
		white-space: nowrap;
		font-size: 12px;
		font-weight: 650;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--ink-2);
	}
	.arch-count {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		font-family: var(--mono);
		font-size: 12px;
		color: var(--ink-3);
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
		border: 1px dashed var(--rule);
		background: transparent;
		color: var(--ink-2);
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
		border-color: var(--vermilion);
		color: var(--vermilion);
		background: var(--vermilion-soft);
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
		border-color: var(--vermilion);
		border-style: solid;
		color: var(--vermilion);
		background: var(--vermilion-soft);
	}

	.arch-list {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overflow-x: hidden;
		display: flex;
		flex-direction: column;
		gap: 2px;
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--ink-3) 60%, transparent) transparent;
	}

	/* ── Quires: folios gathered into folders ── */
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
		color: var(--ink-2);
		user-select: none;
		opacity: 0;
		transform: translateX(-12px);
		transition:
			background 0.18s,
			color 0.18s,
			border-color 0.18s,
			transform 0.3s var(--out),
			opacity 0.3s var(--out);
	}
	.archive.revealed .quire-head {
		opacity: 1;
		transform: translateX(0);
		transition-delay: calc(60ms + var(--i) * 45ms);
	}
	.quire-head:hover {
		background: rgba(0, 0, 0, 0.04);
		color: var(--ink);
		transition-delay: 0ms;
	}
	:global(.dark) .folio .quire-head:hover {
		background: rgba(255, 255, 255, 0.04);
	}
	.quire-head.dropping,
	.quire-empty.dropping {
		border-color: color-mix(in srgb, var(--vermilion) 55%, transparent);
		background: var(--vermilion-soft);
		color: var(--vermilion);
	}
	.quire-chev {
		flex: none;
		color: var(--ink-3);
		transition:
			transform 0.3s var(--spring),
			color 0.18s;
	}
	.quire-head.open .quire-chev {
		transform: rotate(90deg);
	}
	.quire-head:hover .quire-chev {
		color: var(--vermilion);
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
		caret-color: var(--vermilion);
		border-bottom: 1px dashed var(--rule);
		min-width: 40px;
	}
	.quire-count {
		font-family: var(--mono);
		font-size: 12px;
		color: var(--ink-3);
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
		color: var(--ink-3);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.qtool:hover {
		background: var(--rule-faint);
		color: var(--vermilion);
	}

	.arch-item {
		display: flex;
		align-items: center;
		gap: 11px;
		padding: 9px 10px;
		border: none;
		border-radius: 10px;
		background: transparent;
		text-align: left;
		cursor: pointer;
		user-select: none;
		color: var(--ink-2);
		opacity: 0;
		transform: translateX(-12px);
		transition:
			background 0.18s,
			color 0.18s,
			transform 0.3s var(--out),
			opacity 0.3s var(--out);
	}
	.archive.revealed .arch-item {
		opacity: 1;
		transform: translateX(0);
		transition-delay: calc(60ms + var(--i) * 45ms);
	}
	.arch-item:hover {
		background: rgba(0, 0, 0, 0.04);
		color: var(--ink);
		transform: translateX(3px) !important;
		transition-delay: 0ms;
	}
	:global(.dark) .folio .arch-item:hover {
		background: rgba(255, 255, 255, 0.04);
	}
	/* filed folios hang from their quire on a thread */
	.arch-item.filed {
		margin-left: 16px;
		position: relative;
	}
	.arch-item.filed::before {
		content: '';
		position: absolute;
		left: -9px;
		top: -2px;
		bottom: -2px;
		width: 1px;
		background: var(--rule);
	}
	.arch-item.dragging {
		opacity: 0.35;
	}
	.arch-no {
		font-family: var(--serif);
		font-size: 15px;
		color: var(--ink-3);
		flex: none;
		transition: color 0.18s;
	}
	.arch-item:hover .arch-no,
	.arch-item.current .arch-no {
		color: var(--vermilion);
	}
	.arch-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.arch-title {
		font-size: 13px;
		font-weight: 560;
		color: inherit;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.arch-title.editing {
		outline: none;
		user-select: text;
		caret-color: var(--vermilion);
		border-bottom: 1px dashed var(--rule);
		min-width: 40px;
	}
	.arch-item.current .arch-title {
		color: var(--ink);
	}
	.arch-meta {
		font-size: 12px;
		color: var(--ink-3);
	}
	.arch-arrow {
		flex: none;
		opacity: 0;
		transform: translateX(-4px);
		color: var(--vermilion);
		transition:
			opacity 0.18s,
			transform 0.25s var(--spring);
	}
	.arch-item:hover .arch-arrow {
		opacity: 1;
		transform: translateX(0);
	}
	.arch-item.current .arch-arrow {
		opacity: 0.55;
		transform: none;
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
		color: var(--ink-3);
	}
	.quire-empty::before {
		content: '';
		position: absolute;
		left: -9px;
		top: -2px;
		bottom: -2px;
		width: 1px;
		background: var(--rule);
	}

	.arch-foot {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-top: 12px;
		padding: 14px 8px 4px;
		border-top: 1px solid var(--rule-faint);
	}
	/* The user section is the trigger for the user context menu; it fills the row.
	   (UserMenu's trigger wrapper is display:contents, so the button is the flex
	   child of .arch-foot — grow it directly.) */
	.arch-userbtn {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		min-width: 0;
		padding: 4px 6px;
		margin: -4px -6px;
		border: none;
		background: transparent;
		border-radius: 10px;
		text-align: left;
		cursor: pointer;
		color: inherit;
		transition: background 0.15s;
	}
	.arch-userbtn:hover {
		background: rgba(0, 0, 0, 0.04);
	}
	:global(.dark) .arch-userbtn:hover {
		background: rgba(255, 255, 255, 0.05);
	}
	.arch-avatar {
		flex: none;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font-family: var(--serif);
		font-size: 16px;
		color: var(--vermilion);
		background: var(--vermilion-soft);
		border: 1px solid color-mix(in srgb, var(--vermilion) 25%, transparent);
	}
	.arch-user {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.arch-name {
		font-size: 12.5px;
		font-weight: 600;
		color: var(--ink);
	}
	.arch-mail {
		font-size: 12px;
		color: var(--ink-3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
