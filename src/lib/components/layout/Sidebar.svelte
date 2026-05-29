<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { v4 as uuidv4 } from 'uuid';
	import Sortable from 'sortablejs';

	import { goto } from '$app/navigation';
	import {
		user,
		chats,
		settings,
		showSettings,
		chatId,
		tags,
		folders as _folders,
		showSidebar,
		showSearch,
		mobile,
		showArchivedChats,
		pinnedChats,
		scrollPaginationEnabled,
		currentChatPage,
		socket,
		config,
		isApp,
		models,
		selectedFolder,
		WEBUI_NAME,
		sidebarWidth,
		activeChatIds,
		theme
	} from '$lib/stores';
	import { onMount, getContext, tick, onDestroy } from 'svelte';

	const i18n = getContext('i18n');

	import {
		getChatList,
		getAllTags,
		getPinnedChatList,
		toggleChatPinnedStatusById,
		getChatById,
		updateChatFolderIdById,
		importChats,
		deleteAllChats
	} from '$lib/apis/chats';
	import { createNewFolder, getFolders, updateFolderParentIdById } from '$lib/apis/folders';
	import { updateUserSettings } from '$lib/apis/users';
	import { checkActiveChats } from '$lib/apis/tasks';
	import { WEBUI_API_BASE_URL, WEBUI_BASE_URL } from '$lib/constants';

	import ArchivedChatsModal from './ArchivedChatsModal.svelte';
	import ChatItem from './Sidebar/ChatItem.svelte';
	import Spinner from '../common/Spinner.svelte';
	import Loader from '../common/Loader.svelte';
	import Folder from '../common/Folder.svelte';
	import Tooltip from '../common/Tooltip.svelte';
	import Folders from './Sidebar/Folders.svelte';
	import PencilSquare from '../icons/PencilSquare.svelte';
	import Search from '../icons/Search.svelte';
	import SearchModal from './SearchModal.svelte';
	import FolderModal from './Sidebar/Folders/FolderModal.svelte';
	import Sidebar from '../icons/Sidebar.svelte';
	import PinnedModelList from './Sidebar/PinnedModelList.svelte';
	import Code from '../icons/Code.svelte';
	import { slide } from 'svelte/transition';
	import HotkeyHint from '../common/HotkeyHint.svelte';

	export let peeled = false;

	const BREAKPOINT = 768;
	const DEFAULT_PINNED_ITEMS = [];

	let scrollTop = 0;

	const applyTheme = (next: string) => {
		const root = document.documentElement;
		localStorage.setItem('theme', next);
		theme.set(next);
		['dark', 'light', 'oled-dark'].forEach((c) => root.classList.remove(c));
		root.classList.add(next);
	};

	const toggleTheme = (e: MouseEvent) => {
		const root = document.documentElement;
		const wasDark = root.classList.contains('dark') || root.classList.contains('oled-dark');
		const next = wasDark ? 'light' : 'dark';

		const target = (e.currentTarget ?? e.target) as HTMLElement | null;
		const rect = target?.getBoundingClientRect();
		const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
		const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
		const maxR = Math.hypot(
			Math.max(x, window.innerWidth - x),
			Math.max(y, window.innerHeight - y)
		);

		const oldBg =
			getComputedStyle(root).getPropertyValue('--bg-base').trim() ||
			(wasDark ? '#1e1d1c' : '#f7f5f0');
		const gradient = `radial-gradient(circle var(--reveal-r) at ${x}px ${y}px, transparent 99.9%, black 100%)`;

		const overlay = document.createElement('div');
		overlay.style.cssText = `position:fixed;inset:0;z-index:9999;pointer-events:none;background:${oldBg};--reveal-r:0px;mask-image:${gradient};-webkit-mask-image:${gradient}`;
		document.body.appendChild(overlay);

		applyTheme(next);

		const anim = overlay.animate(
			[{ '--reveal-r': '0px' } as any, { '--reveal-r': `${maxR}px` } as any],
			{ duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
		);
		anim.finished.then(() => overlay.remove()).catch(() => overlay.remove());
	};

	$: isDarkTheme =
		$theme === 'dark' ||
		$theme === 'oled-dark' ||
		($theme === 'system' &&
			typeof window !== 'undefined' &&
			window.matchMedia?.('(prefers-color-scheme: dark)').matches);

	let navElement;
	let shiftKey = false;

	let selectedChatId = null;

	// Pagination variables
	let chatListLoading = false;
	let allChatsLoaded = false;

	let showCreateFolderModal = false;

	let pinnedModels = [];

	let showPinnedModels = false;
	let showFolders = false;

	let folders = {};
	let folderRegistry = {};

	let newFolderId = null;

	$: pinnedItems = ($settings?.pinnedMenuItems ?? DEFAULT_PINNED_ITEMS).filter(
		(itemId) => itemId !== 'workspace'
	);

	const isMenuItemVisible = (id) => {
		switch (id) {
			case 'workspace':
				return (
					$user?.role === 'admin' ||
					$user?.permissions?.workspace?.models ||
					$user?.permissions?.workspace?.skills ||
					$user?.permissions?.workspace?.tools
				);
			default:
				return false;
		}
	};

	const getMenuItemMeta = (id) => {
		const items = {
			workspace: { label: 'Workspace', href: '/workspace', iconType: 'workspace' }
		};
		return items[id];
	};

	const initPinnedMenuSortable = () => {
		const el = document.getElementById('pinned-menu-items-list');
		if (el && !$mobile) {
			new Sortable(el, {
				animation: 150,
				onUpdate: async (event) => {
					const itemId = event.item.dataset.id;
					const newIndex = event.newIndex;
					const current = [...pinnedItems];
					const oldIndex = current.indexOf(itemId);
					current.splice(oldIndex, 1);
					current.splice(newIndex, 0, itemId);
					settings.set({ ...$settings, pinnedMenuItems: current });
					await updateUserSettings(localStorage.token, { ui: $settings });
				}
			});
		}
	};

	$: if ($selectedFolder) {
		initFolders();
	}

	const initFolders = async () => {
		if ($config?.features?.enable_folders === false) {
			return;
		}

		const folderList = await getFolders(localStorage.token).catch((error) => {
			return [];
		});
		_folders.set(folderList.sort((a, b) => b.updated_at - a.updated_at));

		folders = {};

		// First pass: Initialize all folder entries
		for (const folder of folderList) {
			// Ensure folder is added to folders with its data
			folders[folder.id] = { ...(folders[folder.id] || {}), ...folder };

			if (newFolderId && folder.id === newFolderId) {
				folders[folder.id].new = true;
				newFolderId = null;
			}
		}

		// Second pass: Tie child folders to their parents
		for (const folder of folderList) {
			if (folder.parent_id) {
				// Ensure the parent folder is initialized if it doesn't exist
				if (!folders[folder.parent_id]) {
					folders[folder.parent_id] = {}; // Create a placeholder if not already present
				}

				// Initialize childrenIds array if it doesn't exist and add the current folder id
				folders[folder.parent_id].childrenIds = folders[folder.parent_id].childrenIds
					? [...folders[folder.parent_id].childrenIds, folder.id]
					: [folder.id];

				// Sort the children by updated_at field
				folders[folder.parent_id].childrenIds.sort((a, b) => {
					return folders[b].updated_at - folders[a].updated_at;
				});
			}
		}
	};

	const createFolder = async ({ name, data, parent_id }) => {
		name = name?.trim();
		if (!name) {
			toast.error($i18n.t('Folder name cannot be empty.'));
			return;
		}

		// Check for duplicate names in the same parent
		const siblings = Object.values(folders).filter((folder) => folder.parent_id === parent_id);
		if (siblings.find((folder) => folder.name.toLowerCase() === name.toLowerCase())) {
			// If a folder with the same name already exists, append a number to the name
			let i = 1;
			while (
				siblings.find((folder) => folder.name.toLowerCase() === `${name} ${i}`.toLowerCase())
			) {
				i++;
			}

			name = `${name} ${i}`;
		}

		// Add a dummy folder to the list to show the user that the folder is being created
		const tempId = uuidv4();
		folders = {
			...folders,
			[tempId]: {
				id: tempId,
				name: name,
				parent_id: parent_id,
				created_at: Date.now(),
				updated_at: Date.now()
			}
		};

		const res = await createNewFolder(localStorage.token, {
			name,
			data,
			parent_id
		}).catch((error) => {
			toast.error(`${error}`);
			return null;
		});

		if (res) {
			// newFolderId = res.id;
			await initFolders();
			showFolders = true;
		}
	};

	const initChatList = async () => {
		// Reset pagination variables
		console.log('initChatList');
		currentChatPage.set(1);
		allChatsLoaded = false;
		scrollPaginationEnabled.set(false);

		initFolders();
		await Promise.all([
			await (async () => {
				console.log('Init tags');
				const _tags = await getAllTags(localStorage.token);
				tags.set(_tags);
			})(),
			await (async () => {
				console.log('Init pinned chats');
				const _pinnedChats = await getPinnedChatList(localStorage.token);
				pinnedChats.set(_pinnedChats);
			})(),
			await (async () => {
				console.log('Init chat list');
				const _chats = await getChatList(localStorage.token, $currentChatPage);
				await chats.set(_chats);
			})()
		]);

		// Enable pagination
		scrollPaginationEnabled.set(true);
	};

	const loadMoreChats = async () => {
		chatListLoading = true;

		currentChatPage.set($currentChatPage + 1);

		let newChatList = [];

		newChatList = await getChatList(localStorage.token, $currentChatPage);

		// once the bottom of the list has been reached (no results) there is no need to continue querying
		allChatsLoaded = newChatList.length === 0;
		const existingIds = new Set(($chats ?? []).map((c) => c.id));
		const uniqueNewChats = newChatList.filter((c) => !existingIds.has(c.id));
		await chats.set([...($chats ? $chats : []), ...uniqueNewChats]);

		chatListLoading = false;
	};

	const importChatHandler = async (items, pinned = false, folderId = null) => {
		console.log('importChatHandler', items, pinned, folderId);
		for (const item of items) {
			console.log(item);
			if (item.chat) {
				await importChats(localStorage.token, [
					{
						chat: item.chat,
						meta: item?.meta ?? {},
						pinned: pinned,
						folder_id: folderId,
						created_at: item?.created_at ?? null,
						updated_at: item?.updated_at ?? null
					}
				]);
			}
		}

		initChatList();
	};

	const inputFilesHandler = async (files) => {
		console.log(files);

		for (const file of files) {
			const reader = new FileReader();
			reader.onload = async (e) => {
				const content = e.target.result;

				try {
					const chatItems = JSON.parse(content);
					importChatHandler(chatItems);
				} catch {
					toast.error($i18n.t(`Invalid file format.`));
				}
			};

			reader.readAsText(file);
		}
	};

	const tagEventHandler = async (type, tagName, chatId) => {
		console.log(type, tagName, chatId);
		if (type === 'delete') {
			initChatList();
		} else if (type === 'add') {
			initChatList();
		}
	};

	let draggedOver = false;

	const onDragOver = (e) => {
		e.preventDefault();

		// Check if a file is being draggedOver.
		if (e.dataTransfer?.types?.includes('Files')) {
			draggedOver = true;
		} else {
			draggedOver = false;
		}
	};

	const onDragLeave = () => {
		draggedOver = false;
	};

	const onDrop = async (e) => {
		e.preventDefault();
		console.log(e); // Log the drop event

		// Perform file drop check and handle it accordingly
		if (e.dataTransfer?.files) {
			const inputFiles = Array.from(e.dataTransfer?.files);

			if (inputFiles && inputFiles.length > 0) {
				console.log(inputFiles); // Log the dropped files
				inputFilesHandler(inputFiles); // Handle the dropped files
			}
		}

		draggedOver = false; // Reset draggedOver status after drop
	};

	let touchstart;
	let touchend;

	function checkDirection() {
		const screenWidth = window.innerWidth;
		const swipeDistance = Math.abs(touchend.screenX - touchstart.screenX);
		if (touchstart.clientX < 40 && swipeDistance >= screenWidth / 8) {
			if (touchend.screenX < touchstart.screenX) {
				showSidebar.set(false);
			}
			if (touchend.screenX > touchstart.screenX) {
				showSidebar.set(true);
			}
		}
	}

	const onTouchStart = (e) => {
		touchstart = e.changedTouches[0];
		console.log(touchstart.clientX);
	};

	const onTouchEnd = (e) => {
		touchend = e.changedTouches[0];
		checkDirection();
	};

	const onKeyDown = (e) => {
		if (e.key === 'Shift') {
			shiftKey = true;
		}
	};

	const onKeyUp = (e) => {
		if (e.key === 'Shift') {
			shiftKey = false;
		}
	};

	const onFocus = () => {};

	const onBlur = () => {
		shiftKey = false;
		selectedChatId = null;
	};

	const MIN_WIDTH = 220;
	const MAX_WIDTH = 480;

	let isResizing = false;

	let startWidth = 0;
	let startClientX = 0;

	const resizeStartHandler = (e: MouseEvent) => {
		if ($mobile) return;
		isResizing = true;

		startClientX = e.clientX;
		startWidth = $sidebarWidth ?? 260;

		document.body.style.userSelect = 'none';
	};

	const resizeEndHandler = () => {
		if (!isResizing) return;
		isResizing = false;

		document.body.style.userSelect = '';
		localStorage.setItem('sidebarWidth', String($sidebarWidth));
	};

	const resizeSidebarHandler = (endClientX) => {
		const dx = endClientX - startClientX;
		const newSidebarWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + dx));

		sidebarWidth.set(newSidebarWidth);
		document.documentElement.style.setProperty('--sidebar-width', `${newSidebarWidth}px`);
	};

	onMount(async () => {
		try {
			const width = Number(localStorage.getItem('sidebarWidth'));
			if (!Number.isNaN(width) && width >= MIN_WIDTH && width <= MAX_WIDTH) {
				sidebarWidth.set(width);
			}
		} catch {}

		document.documentElement.style.setProperty('--sidebar-width', `${$sidebarWidth}px`);
		sidebarWidth.subscribe((w) => {
			document.documentElement.style.setProperty('--sidebar-width', `${w}px`);
		});

		showSidebar.set(!$mobile ? localStorage.sidebar === 'true' : false);

		const unsubscribers = [
			mobile.subscribe((value) => {
				if ($showSidebar && value) {
					showSidebar.set(false);
				}

				if ($showSidebar && !value) {
					const navElement = document.getElementsByTagName('nav')[0];
					if (navElement) {
						navElement.style['-webkit-app-region'] = 'drag';
					}
				}
			}),
			showSidebar.subscribe(async (value) => {
				localStorage.sidebar = value;

				// nav element is not available on the first render
				const navElement = document.getElementsByTagName('nav')[0];

				if (navElement) {
					if ($mobile) {
						if (!value) {
							navElement.style['-webkit-app-region'] = 'drag';
						} else {
							navElement.style['-webkit-app-region'] = 'no-drag';
						}
					} else {
						navElement.style['-webkit-app-region'] = 'drag';
					}
				}

				if (value) {
					await initChatList();

					// Check which chats have active tasks
					const allChatIds = [...$chats.map((c) => c.id), ...$pinnedChats.map((c) => c.id)];
					if (allChatIds.length > 0) {
						try {
							const res = await checkActiveChats(localStorage.token, allChatIds);
							activeChatIds.set(new Set(res.active_chat_ids || []));
						} catch (e) {
							console.debug('Failed to check active chats:', e);
						}
					}
				}
			}),
			settings.subscribe((value) => {
				if (pinnedModels != value?.pinnedModels ?? []) {
					pinnedModels = value?.pinnedModels ?? [];
					showPinnedModels = pinnedModels.length > 0;
				}
			})
		];

		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);

		window.addEventListener('touchstart', onTouchStart);
		window.addEventListener('touchend', onTouchEnd);

		window.addEventListener('focus', onFocus);
		window.addEventListener('blur', onBlur);

		const dropZone = document.getElementById('sidebar');
		if (dropZone) {
			dropZone.addEventListener('dragover', onDragOver);
			dropZone.addEventListener('drop', onDrop);
			dropZone.addEventListener('dragleave', onDragLeave);
		}

		const socketInstance = $socket;
		socketInstance?.on('events', chatActiveEventHandler);

		await tick();
		initPinnedMenuSortable();

		return () => {
			unsubscribers.forEach((unsubscriber) => unsubscriber());

			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);

			window.removeEventListener('touchstart', onTouchStart);
			window.removeEventListener('touchend', onTouchEnd);

			window.removeEventListener('focus', onFocus);
			window.removeEventListener('blur', onBlur);

			if (dropZone) {
				dropZone.removeEventListener('dragover', onDragOver);
				dropZone.removeEventListener('drop', onDrop);
				dropZone.removeEventListener('dragleave', onDragLeave);
			}

			socketInstance?.off('events', chatActiveEventHandler);
		};
	});

	// Handler for chat events (defined outside onMount for proper cleanup)
	const chatActiveEventHandler = (event: {
		chat_id: string;
		message_id: string;
		data: { type: string; data: any };
	}) => {
		if (event.data?.type === 'chat:active') {
			const { active } = event.data.data;
			activeChatIds.update((ids) => {
				const newSet = new Set(ids);
				if (active) {
					newSet.add(event.chat_id);
				} else {
					newSet.delete(event.chat_id);
				}
				return newSet;
			});
		} else if (event.data?.type === 'chat:list') {
			initChatList();
		}
	};

	const newChatHandler = async () => {
		selectedChatId = null;
		selectedFolder.set(null);

		setTimeout(() => {
			if ($mobile) {
				showSidebar.set(false);
			}
		}, 0);
	};

	const itemClickHandler = async () => {
		selectedChatId = null;
		chatId.set('');

		if ($mobile) {
			showSidebar.set(false);
		}

		await tick();
	};

	const isWindows = /Windows/i.test(navigator.userAgent);

	$: activeChatIndex = $chats ? $chats.findIndex((c) => c.id === $chatId) : -1;

	// Sliding active indicator over the chat list
	let conversationListEl: HTMLDivElement;
	let indicatorTop = 0;
	let indicatorHeight = 0;
	let indicatorVisible = false;

	const updateIndicator = async () => {
		await tick();
		if (!conversationListEl) {
			indicatorVisible = false;
			return;
		}
		const active = conversationListEl.querySelector(
			'#sidebar-chat-group.selected'
		) as HTMLElement | null;
		if (!active) {
			indicatorVisible = false;
			return;
		}
		const listRect = conversationListEl.getBoundingClientRect();
		const itemRect = active.getBoundingClientRect();
		indicatorTop = itemRect.top - listRect.top + conversationListEl.scrollTop + 6;
		indicatorHeight = Math.max(itemRect.height - 12, 14);
		indicatorVisible = true;
	};

	$: if ($chatId !== undefined && $chats) {
		updateIndicator();
	}
</script>

<ArchivedChatsModal
	bind:show={$showArchivedChats}
	onUpdate={async () => {
		await initChatList();
	}}
	onDelete={(id) => {
		if ($chatId === id) {
			goto('/');
			chatId.set('');
		}
	}}
/>

<FolderModal
	bind:show={showCreateFolderModal}
	onSubmit={async (folder) => {
		await createFolder(folder);
		showCreateFolderModal = false;
	}}
/>

<!-- svelte-ignore a11y-no-static-element-interactions -->

{#if $showSidebar}
	<div
		class=" {$isApp
			? ' ml-[4.5rem] md:ml-0'
			: ''} fixed md:hidden z-40 top-0 right-0 left-0 bottom-0 bg-black/60 w-full min-h-screen h-screen flex justify-center overflow-hidden overscroll-contain"
		on:mousedown={() => {
			showSidebar.set(!$showSidebar);
		}}
	/>
{/if}

<SearchModal
	bind:show={$showSearch}
	onClose={() => {
		if ($mobile) {
			showSidebar.set(false);
		}
	}}
/>

<button
	id="sidebar-new-chat-button"
	class="hidden"
	on:click={() => {
		goto('/');
		newChatHandler();
	}}
/>

<svelte:window
	on:mousemove={(e) => {
		if (!isResizing) return;
		resizeSidebarHandler(e.clientX);
	}}
	on:mouseup={() => {
		resizeEndHandler();
	}}
/>

{#if !$mobile && !$showSidebar && !peeled}
	<div
		class=" pt-[7px] pb-2 px-2 flex flex-col justify-between h-full z-10 transition-all sidebar-collapsed"
		id="sidebar"
	>
		<button
			class="flex flex-col flex-1 {isWindows ? 'cursor-pointer' : 'cursor-[e-resize]'}"
			on:click={async () => {
				showSidebar.set(!$showSidebar);
			}}
		>
			<div class="pb-1.5">
				<Tooltip
					content={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
					placement="right"
				>
					<button
						class="flex transition btn-ghost collapsed-logo-btn {isWindows
							? 'cursor-pointer'
							: 'cursor-[e-resize]'}"
						aria-label={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
					>
						<div class=" self-center flex items-center justify-center size-9">
							<img
								src="{WEBUI_BASE_URL}/static/favicon.png"
								class="sidebar-new-chat-icon size-6 rounded-full group-hover:hidden"
								alt=""
							/>

							<Sidebar className="size-5 hidden group-hover:flex" />
						</div>
					</button>
				</Tooltip>
			</div>

			<div class="-mt-[0.5px]">
				<div class="">
					<Tooltip content={$i18n.t('New Chat')} placement="right">
						<a
							class=" cursor-pointer flex rounded-xl btn-ghost transition group"
							href="/"
							draggable="false"
							on:click={async (e) => {
								e.stopImmediatePropagation();
								e.preventDefault();

								goto('/');
								newChatHandler();
							}}
							aria-label={$i18n.t('New Chat')}
						>
							<div class=" self-center flex items-center justify-center size-9">
								<PencilSquare className="size-4.5" />
							</div>
						</a>
					</Tooltip>
				</div>

				<div>
					<Tooltip content={$i18n.t('Search')} placement="right">
						<button
							class=" cursor-pointer flex rounded-xl btn-ghost transition group"
							on:click={(e) => {
								e.stopImmediatePropagation();
								e.preventDefault();

								showSearch.set(true);
							}}
							draggable="false"
							aria-label={$i18n.t('Search')}
						>
							<div class=" self-center flex items-center justify-center size-9">
								<Search className="size-4.5" />
							</div>
						</button>
					</Tooltip>
				</div>

				{#each pinnedItems as itemId (itemId)}
					{@const meta = getMenuItemMeta(itemId)}
					{#if meta && isMenuItemVisible(itemId)}
						<div class="">
							<Tooltip content={$i18n.t(meta.label)} placement="right">
								<a
									class=" cursor-pointer flex rounded-xl btn-ghost transition group"
									href={meta.href}
									on:click={async (e) => {
										e.stopImmediatePropagation();
										e.preventDefault();
										goto(meta.href);
										itemClickHandler();
									}}
									draggable="false"
									aria-label={$i18n.t(meta.label)}
								>
									<div class=" self-center flex items-center justify-center size-9">
										{#if itemId === 'workspace'}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												stroke-width="1.5"
												stroke="currentColor"
												class="size-4.5"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z"
												/>
											</svg>
										{:else if itemId === 'automations'}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												stroke-width="1.5"
												stroke="currentColor"
												class="size-4.5"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
												/>
											</svg>
										{:else if itemId === 'calendar'}
											<svg
												xmlns="http://www.w3.org/2000/svg"
												fill="none"
												viewBox="0 0 24 24"
												stroke-width="1.5"
												stroke="currentColor"
												class="size-4.5"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
												/>
											</svg>
										{:else if itemId === 'playground'}
											<Code className="size-4.5" />
										{/if}
									</div>
								</a>
							</Tooltip>
						</div>
					{/if}
				{/each}
			</div>
		</button>

		<div>
			<div>
				<div class=" py-2 flex justify-center items-center">
					{#if $user !== undefined && $user !== null}
						<button
							type="button"
							class=" cursor-pointer flex rounded-xl btn-ghost transition group"
							aria-label={$i18n.t('Open Settings')}
							on:click={() => {
								showSettings.set(true);
							}}
						>
							<div class="self-center relative">
								<img
									src={`${WEBUI_API_BASE_URL}/users/${$user?.id}/profile/image`}
									class=" size-7 object-cover rounded-full"
									alt={$i18n.t('Open Settings')}
								/>
							</div>
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- {$i18n.t('New Folder')} -->
<!-- {$i18n.t('Pinned')} -->

{#if $showSidebar}
	<div
		bind:this={navElement}
		id="sidebar"
		class="h-screen max-h-[100dvh] min-h-screen select-none {$showSidebar
			? peeled && !$mobile
				? `z-0`
				: `z-50`
			: ' bg-transparent z-0 '} {$isApp
			? `ml-[4.5rem] md:ml-0 `
			: ' transition-all duration-300 '} shrink-0 text-sm fixed top-0 left-0 overflow-x-hidden
        "
		transition:slide={{ duration: peeled && !$mobile ? 0 : 250, axis: 'x' }}
		data-state={$showSidebar}
		data-peeled={peeled}
	>
		<div
			class=" my-auto flex flex-col justify-between h-screen max-h-[100dvh] w-[var(--sidebar-width)] overflow-x-hidden scrollbar-hidden z-50 {$showSidebar
				? ''
				: 'invisible'}"
		>
			<div
				class="px-[0.5625rem] pt-2 pb-1.5 flex justify-between space-x-1 sticky top-0 z-10 -mb-3"
				style="background: var(--bg-sidebar);"
			>
				<a
					class="flex items-center rounded-xl size-8.5 h-full justify-center hover:bg-[var(--surface-hover)] transition no-drag-region"
					href="/"
					draggable="false"
					on:click={newChatHandler}
				>
					<img
						crossorigin="anonymous"
						src="{WEBUI_BASE_URL}/static/favicon.png"
						class="sidebar-new-chat-icon size-6 rounded-full"
						alt=""
					/>
				</a>

				<a href="/" class="flex flex-1 px-0.5" on:click={newChatHandler}>
					<div id="sidebar-webui-name" class=" self-center font-medium sidebar-brand font-primary">
						{$WEBUI_NAME}
					</div>
				</a>
				<Tooltip
					content={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
					placement="bottom"
				>
					<button
						class="flex rounded-xl size-8.5 justify-center items-center btn-ghost transition {isWindows
							? 'cursor-pointer'
							: 'cursor-[w-resize]'}"
						on:click={() => {
							showSidebar.set(!$showSidebar);
						}}
						aria-label={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
					>
						<div class=" self-center p-1.5">
							<Sidebar />
						</div>
					</button>
				</Tooltip>

				<div
					class="{scrollTop > 0
						? 'visible'
						: 'invisible'} sidebar-gradient-overlay-top pointer-events-none absolute inset-0 -z-10 -mb-6"
				></div>
			</div>

			<div
				class="relative flex flex-col flex-1 overflow-y-auto scrollbar-hidden pt-3 pb-3"
				on:scroll={(e) => {
					if (e.target.scrollTop === 0) {
						scrollTop = 0;
					} else {
						scrollTop = e.target.scrollTop;
					}
				}}
			>
				<div class="pb-1.5">
					<div class="px-[0.4375rem] flex justify-center">
						<a
							id="sidebar-new-chat-button"
							class="btn-sidebar-primary grow flex items-center space-x-3 px-2.5 py-2 outline-none"
							href="/"
							draggable="false"
							on:click={newChatHandler}
							aria-label={$i18n.t('New Chat')}
						>
							<div class="self-center">
								<PencilSquare className=" size-4.5" strokeWidth="2" />
							</div>

							<div class="flex flex-1 self-center translate-y-[0.5px]">
								<div class=" self-center text-sm font-primary">{$i18n.t('New Chat')}</div>
							</div>

							<HotkeyHint name="newChat" className=" group-hover:visible invisible" />
						</a>
					</div>

					{#if isMenuItemVisible('workspace')}
						<div class="section-header sidebar-section-label px-[0.4375rem]">
							<span>{$i18n.t('Workspace')}</span>
						</div>

						{#if $user?.role === 'admin' || $user?.permissions?.workspace?.models}
							<div class="px-[0.4375rem] flex justify-center">
								<a
									id="sidebar-models-button"
									class="nav-item grow flex items-center px-2.5 py-2"
									href="/workspace/models"
									on:click={itemClickHandler}
									draggable="false"
									aria-label={$i18n.t('Models')}
								>
									<div class="flex self-center translate-y-[0.5px]">
										<div class=" self-center text-sm font-primary">{$i18n.t('Models')}</div>
									</div>
								</a>
							</div>
						{/if}

						{#if $user?.role === 'admin' || $user?.permissions?.workspace?.skills}
							<div class="px-[0.4375rem] flex justify-center">
								<a
									id="sidebar-skills-button"
									class="nav-item grow flex items-center px-2.5 py-2"
									href="/workspace/skills"
									on:click={itemClickHandler}
									draggable="false"
									aria-label={$i18n.t('Skills')}
								>
									<div class="flex self-center translate-y-[0.5px]">
										<div class=" self-center text-sm font-primary">{$i18n.t('Skills')}</div>
									</div>
								</a>
							</div>
						{/if}

						{#if $user?.role === 'admin' || $user?.permissions?.workspace?.tools}
							<div class="px-[0.4375rem] flex justify-center">
								<a
									id="sidebar-tools-button"
									class="nav-item grow flex items-center px-2.5 py-2"
									href="/workspace/tools"
									on:click={itemClickHandler}
									draggable="false"
									aria-label={$i18n.t('Tools')}
								>
									<div class="flex self-center translate-y-[0.5px]">
										<div class=" self-center text-sm font-primary">{$i18n.t('Tools')}</div>
									</div>
								</a>
							</div>
						{/if}
					{/if}

					<div id="pinned-menu-items-list">
						{#each pinnedItems as itemId (itemId)}
							{@const meta = getMenuItemMeta(itemId)}
							{#if meta && isMenuItemVisible(itemId)}
								<div class="px-[0.4375rem] flex justify-center" data-id={itemId}>
									<a
										id="sidebar-{itemId}-button"
										class="nav-item grow flex items-center space-x-3 px-2.5 py-2"
										href={meta.href}
										on:click={itemClickHandler}
										draggable="false"
										aria-label={$i18n.t(meta.label)}
									>
										<div class="self-center">
											{#if itemId === 'workspace'}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
													stroke-width="2"
													stroke="currentColor"
													class="size-4.5"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z"
													/>
												</svg>
											{:else if itemId === 'automations'}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
													stroke-width="2"
													stroke="currentColor"
													class="size-4.5"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
													/>
												</svg>
											{:else if itemId === 'calendar'}
												<svg
													xmlns="http://www.w3.org/2000/svg"
													fill="none"
													viewBox="0 0 24 24"
													stroke-width="2"
													stroke="currentColor"
													class="size-4.5"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
													/>
												</svg>
											{:else if itemId === 'playground'}
												<Code className="size-4.5" strokeWidth="2" />
											{/if}
										</div>

										<div class="flex self-center translate-y-[0.5px]">
											<div class=" self-center text-sm font-primary">{$i18n.t(meta.label)}</div>
										</div>
									</a>
								</div>
							{/if}
						{/each}
					</div>
				</div>

				{#if ($models ?? []).length > 0 && (($settings?.pinnedModels ?? []).length > 0 || $config?.default_pinned_models)}
					<Folder
						id="sidebar-models"
						bind:open={showPinnedModels}
						className="px-2 mt-0.5"
						name={$i18n.t('Models')}
						buttonClassName="sidebar-folder-btn"
						chevron={false}
						dragAndDrop={false}
					>
						<PinnedModelList bind:selectedChatId {shiftKey} />
					</Folder>
				{/if}

				{#if $config?.features?.enable_folders && ($user?.role === 'admin' || ($user?.permissions?.features?.folders ?? true))}
					<Folder
						id="sidebar-folders"
						bind:open={showFolders}
						className="px-2 mt-0.5"
						name={$i18n.t('Folders')}
						buttonClassName="sidebar-folder-btn"
						chevron={false}
						onAdd={() => {
							showCreateFolderModal = true;
						}}
						onAddLabel={$i18n.t('New Folder')}
						on:drop={async (e) => {
							const { type, id, item } = e.detail;

							if (type === 'folder') {
								if (folders[id].parent_id === null) {
									return;
								}

								const res = await updateFolderParentIdById(localStorage.token, id, null).catch(
									(error) => {
										toast.error(`${error}`);
										return null;
									}
								);

								if (res) {
									await initFolders();
								}
							}
						}}
					>
						<Folders
							bind:folderRegistry
							{folders}
							{shiftKey}
							onDelete={(folderId) => {
								selectedFolder.set(null);
								initChatList();
							}}
							on:update={() => {
								initChatList();
							}}
							on:import={(e) => {
								const { folderId, items } = e.detail;
								importChatHandler(items, false, folderId);
							}}
							on:change={async () => {
								initChatList();
							}}
						/>
					</Folder>
				{/if}

				<div class="sidebar-divider mx-[0.4375rem] mt-3 mb-1.5"></div>

				<div class="px-[0.4375rem] flex justify-center">
					<button
						id="sidebar-search-button"
						class="nav-item grow flex items-center space-x-3 px-2.5 py-2 outline-none"
						on:click={() => {
							showSearch.set(true);
						}}
						draggable="false"
						aria-label={$i18n.t('Search')}
					>
						<div class="self-center">
							<Search strokeWidth="2" className="size-4.5" />
						</div>

						<div class="flex flex-1 self-center translate-y-[0.5px]">
							<div class=" self-center text-sm font-primary">{$i18n.t('Search')}</div>
						</div>
						<HotkeyHint name="search" className=" group-hover:visible invisible" />
					</button>
				</div>

				<Folder
					id="sidebar-chats"
					className="px-2 mt-0.5"
					name={$i18n.t('Chats')}
					buttonClassName="sidebar-folder-btn"
					chevron={false}
					collapsible={false}
					on:change={async (e) => {
						selectedFolder.set(null);
					}}
					on:import={(e) => {
						importChatHandler(e.detail);
					}}
					on:drop={async (e) => {
						const { type, id, item } = e.detail;

						if (type === 'chat') {
							let chat = await getChatById(localStorage.token, id).catch((error) => {
								return null;
							});
							if (!chat && item) {
								chat = await importChats(localStorage.token, [
									{
										chat: item.chat,
										meta: item?.meta ?? {},
										pinned: false,
										folder_id: null,
										created_at: item?.created_at ?? null,
										updated_at: item?.updated_at ?? null
									}
								]);
							}

							if (chat) {
								console.log(chat);
								if (chat.folder_id) {
									const res = await updateChatFolderIdById(localStorage.token, chat.id, null).catch(
										(error) => {
											toast.error(`${error}`);
											return null;
										}
									);

									folderRegistry[chat.folder_id]?.setFolderItems();
								}

								if (chat.pinned) {
									const res = await toggleChatPinnedStatusById(localStorage.token, chat.id);
								}

								initChatList();
							}
						} else if (type === 'folder') {
							if (folders[id].parent_id === null) {
								return;
							}

							const res = await updateFolderParentIdById(localStorage.token, id, null).catch(
								(error) => {
									toast.error(`${error}`);
									return null;
								}
							);

							if (res) {
								await initFolders();
							}
						}
					}}
				>
					{#if $pinnedChats.length > 0}
						<div class="mb-1">
							<div class="flex flex-col space-y-1 rounded-xl">
								<Folder
									id="sidebar-pinned-chats"
									buttonClassName="sidebar-folder-btn text-xs"
									on:import={(e) => {
										importChatHandler(e.detail, true);
									}}
									on:drop={async (e) => {
										const { type, id, item } = e.detail;

										if (type === 'chat') {
											let chat = await getChatById(localStorage.token, id).catch((error) => {
												return null;
											});
											if (!chat && item) {
												chat = await importChats(localStorage.token, [
													{
														chat: item.chat,
														meta: item?.meta ?? {},
														pinned: false,
														folder_id: null,
														created_at: item?.created_at ?? null,
														updated_at: item?.updated_at ?? null
													}
												]);
											}

											if (chat) {
												console.log(chat);
												if (chat.folder_id) {
													const res = await updateChatFolderIdById(
														localStorage.token,
														chat.id,
														null
													).catch((error) => {
														toast.error(`${error}`);
														return null;
													});
												}

												if (!chat.pinned) {
													const res = await toggleChatPinnedStatusById(localStorage.token, chat.id);
												}

												initChatList();
											}
										}
									}}
									name={$i18n.t('Pinned')}
								>
									<div
										class="ml-3 pl-1 mt-[1px] flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hidden border-s sidebar-pinned-border"
									>
										{#each $pinnedChats as chat, idx (`pinned-chat-${chat?.id ?? idx}`)}
											<ChatItem
												className=""
												id={chat.id}
												title={chat.title}
												createdAt={chat.created_at}
												updatedAt={chat.updated_at}
												lastReadAt={chat.last_read_at}
												{shiftKey}
												selected={selectedChatId === chat.id}
												on:select={() => {
													selectedChatId = chat.id;
												}}
												on:unselect={() => {
													selectedChatId = null;
												}}
												on:change={async () => {
													initChatList();
												}}
												on:tag={(e) => {
													const { type, name } = e.detail;
													tagEventHandler(type, name, chat.id);
												}}
											/>
										{/each}
									</div>
								</Folder>
							</div>
						</div>
					{/if}

					<div
						class=" conversation-list flex-1 flex flex-col overflow-y-auto scrollbar-hidden"
						bind:this={conversationListEl}
						on:scroll={updateIndicator}
					>
						<div
							class="active-indicator"
							class:visible={indicatorVisible}
							style="top: {indicatorTop}px; height: {indicatorHeight}px;"
						></div>
						<div class="pt-1.5">
							{#if $chats}
								{#each $chats as chat, idx (`chat-${chat?.id ?? idx}`)}
									{#if idx === 0 || (idx > 0 && chat.time_range !== $chats[idx - 1].time_range)}
										<div class="section-header w-full pl-2.5 {idx === 0 ? '' : 'pt-5'} pb-1.5">
											{$i18n.t(chat.time_range)}
											<!-- localisation keys for time_range to be recognized from the i18next parser (so they don't get automatically removed):
							{$i18n.t('Today')}
							{$i18n.t('Yesterday')}
							{$i18n.t('Previous 7 days')}
							{$i18n.t('Previous 30 days')}
							{$i18n.t('January')}
							{$i18n.t('February')}
							{$i18n.t('March')}
							{$i18n.t('April')}
							{$i18n.t('May')}
							{$i18n.t('June')}
							{$i18n.t('July')}
							{$i18n.t('August')}
							{$i18n.t('September')}
							{$i18n.t('October')}
							{$i18n.t('November')}
							{$i18n.t('December')}
							-->
										</div>
									{/if}

									<ChatItem
										className=""
										id={chat.id}
										title={chat.title}
										createdAt={chat.created_at}
										updatedAt={chat.updated_at}
										lastReadAt={chat.last_read_at}
										{shiftKey}
										selected={selectedChatId === chat.id}
										on:select={() => {
											selectedChatId = chat.id;
										}}
										on:unselect={() => {
											selectedChatId = null;
										}}
										on:change={async () => {
											initChatList();
										}}
										on:tag={(e) => {
											const { type, name } = e.detail;
											tagEventHandler(type, name, chat.id);
										}}
									/>
								{/each}

								{#if $scrollPaginationEnabled && !allChatsLoaded}
									<Loader
										on:visible={(e) => {
											if (!chatListLoading) {
												loadMoreChats();
											}
										}}
									>
										<div
											class="w-full flex justify-center py-1 text-xs animate-pulse items-center gap-2"
										>
											<Spinner className=" size-4" />
											<div class=" ">{$i18n.t('Loading...')}</div>
										</div>
									</Loader>
								{/if}
							{:else}
								<div
									class="w-full flex justify-center py-1 text-xs animate-pulse items-center gap-2"
								>
									<Spinner className=" size-4" />
									<div class=" ">{$i18n.t('Loading...')}</div>
								</div>
							{/if}
						</div>
					</div>
				</Folder>
			</div>

			<div
				class="px-1.5 pt-1.5 pb-2 sticky bottom-0 z-10 -mt-3"
				style="background: var(--bg-sidebar);"
			>
				<div
					class=" sidebar-gradient-overlay-bottom pointer-events-none absolute inset-0 -z-10 -mt-6"
				></div>
				<div class="sidebar-footer-row font-primary">
					{#if $user !== undefined && $user !== null}
						<div class="sidebar-footer-user">
							<button
								type="button"
								class="sidebar-footer-trigger flex items-center rounded-2xl py-2 px-1.5 w-full hover:bg-[var(--surface-hover)] transition"
								aria-label={$i18n.t('Open Settings')}
								on:click={() => {
									showSettings.set(true);
								}}
							>
								<div class=" self-center mr-3 relative">
									<img
										src={`${WEBUI_API_BASE_URL}/users/${$user?.id}/profile/image`}
										class=" size-7 object-cover rounded-full sidebar-avatar"
										alt={$i18n.t('Open Settings')}
									/>
								</div>
								<div class=" self-center font-medium sidebar-user-name truncate">
									{$user?.name}
								</div>
							</button>
						</div>

						<Tooltip
							content={isDarkTheme ? $i18n.t('Light mode') : $i18n.t('Dark mode')}
							placement="top"
							className="sidebar-footer-theme"
						>
							<button
								type="button"
								class="theme-btn"
								class:is-dark={isDarkTheme}
								on:click={toggleTheme}
								aria-label={isDarkTheme ? $i18n.t('Light mode') : $i18n.t('Dark mode')}
							>
								<svg
									class="icon-sun"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<circle cx="12" cy="12" r="5" />
									<path
										d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
									/>
								</svg>
								<svg
									class="icon-moon"
									width="14"
									height="14"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
								</svg>
							</button>
						</Tooltip>
					{/if}
				</div>
			</div>
		</div>
	</div>

	{#if !$mobile && !peeled}
		<div
			class="relative flex items-center justify-center group border-l sidebar-resizer-border hover:border-[var(--border-hover)] transition z-20"
			id="sidebar-resizer"
			on:mousedown={resizeStartHandler}
			role="separator"
		>
			<div
				class=" absolute -left-1.5 -right-1.5 -top-0 -bottom-0 z-20 cursor-col-resize bg-transparent"
			/>
		</div>
	{/if}
{/if}

<style>
	/* ── 2a — Sidebar shell ───────────────────────────────── */
	#sidebar {
		background: var(--bg-sidebar);
		color: var(--text);
	}

	#sidebar[data-peeled='true'] > div {
		margin: 0;
		padding: 16px 12px 12px;
	}

	#sidebar[data-peeled='true'] > div > div:first-child {
		padding: 0 4px;
		margin-bottom: 10px;
		position: relative;
		top: auto;
	}

	#sidebar[data-peeled='true'] > div > div:nth-child(2) {
		padding-top: 0;
		padding-bottom: 0;
	}

	#sidebar[data-peeled='true'] :global(#sidebar-new-chat-button),
	#sidebar[data-peeled='true'] :global(#sidebar-search-button),
	#sidebar[data-peeled='true'] :global(.nav-item),
	#sidebar[data-peeled='true'] :global(.btn-sidebar-primary) {
		min-height: 30px;
	}
	.sidebar-collapsed {
		border-color: var(--border);
	}

	/* ── 2b — Brand / logo ────────────────────────────────── */
	.sidebar-brand {
		color: var(--text);
		font-size: 14px;
		font-weight: 700;
		letter-spacing: -0.3px;
	}
	#sidebar-webui-name {
		color: var(--text);
		font-size: 14px;
		font-weight: 700;
		letter-spacing: -0.3px;
	}

	/* ── 2c — New Chat primary button ─────────────────────── */
	.btn-sidebar-primary {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border-radius: 10px;
		background: var(--accent);
		color: #fff;
		border: none;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		text-decoration: none;
		transition:
			filter 0.2s,
			transform 0.1s;
	}
	.btn-sidebar-primary:hover {
		filter: brightness(1.15);
	}
	.btn-sidebar-primary:active {
		transform: scale(0.98);
	}

	/* ── 2d — Section headers ─────────────────────────────── */
	.section-header {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-tertiary);
	}
	.sidebar-section-label {
		padding-top: 8px;
		padding-bottom: 4px;
	}
	.sidebar-section-label svg {
		opacity: 0.85;
	}

	/* ── 2e/2f — Nav items (search, workspace, folder btns) ─ */
	.nav-item {
		display: flex;
		align-items: center;
		gap: 8px;
		min-height: 30px;
		padding: 5px 8px;
		border-radius: 8px;
		background: transparent;
		border: none;
		font-size: 13px;
		font-weight: 500;
		color: var(--text-secondary);
		text-decoration: none;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.nav-item:hover {
		background: var(--surface-hover);
		color: var(--text);
		transform: translateX(2px);
	}

	/* Folder button section header style */
	:global(#sidebar .sidebar-folder-btn) {
		color: var(--text-tertiary) !important;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	:global(#sidebar .sidebar-folder-btn:hover) {
		background: var(--surface-hover) !important;
		color: var(--text) !important;
	}
	:global(#sidebar-folder-button) {
		color: var(--text-tertiary);
	}
	:global(#sidebar-folder-button:hover) {
		background: var(--surface-hover);
		color: var(--text);
	}
	/* Action buttons inside folder headers */
	:global(#sidebar-folder-button button) {
		color: var(--text-tertiary);
		transition: color 0.15s;
	}
	:global(#sidebar-folder-button button:hover) {
		background: var(--surface-hover);
		color: var(--text);
	}

	/* ── 2g — Conversation cards + active indicator ──────── */
	.conversation-list {
		position: relative;
		overflow-x: hidden;
	}

	:global(#sidebar-chat-item) {
		display: flex;
		align-items: center;
		width: 100%;
		min-height: 36px;
		padding: 7px 8px 7px 12px;
		border-radius: 6px;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		font-family: inherit;
		cursor: pointer;
		overflow: hidden;
		transition:
			background 0.15s,
			color 0.15s,
			transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
	}
	:global(#sidebar-chat-item):hover {
		color: var(--text);
		background: var(--surface-hover);
		transform: translateX(2px);
	}

	:global(#sidebar-chat-item.selected) {
		color: var(--text);
	}

	/* Single sliding active indicator on the conversation list */
	.active-indicator {
		position: absolute;
		left: 2px;
		width: 2px;
		border-radius: 999px;
		background: var(--accent);
		pointer-events: none;
		z-index: 2;
		opacity: 0;
		transform: scaleY(0);
		transform-origin: center;
		transition:
			top 0.38s cubic-bezier(0.34, 1.56, 0.64, 1),
			height 0.38s cubic-bezier(0.34, 1.56, 0.64, 1),
			opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1),
			transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	.active-indicator.visible {
		opacity: 1;
		transform: scaleY(1);
	}

	/* ── 2h — Dividers & borders ──────────────────────────── */
	.sidebar-divider {
		height: 1px;
		background: color-mix(in srgb, var(--text-tertiary) 30%, transparent);
	}
	.sidebar-pinned-border {
		border-color: var(--border);
	}
	.sidebar-resizer-border {
		border-color: var(--border);
	}

	/* ── 2i — User footer ─────────────────────────────────── */
	.sidebar-avatar {
		border: 1.5px solid var(--accent);
	}
	.sidebar-user-name {
		font-size: 12px;
		font-weight: 600;
		color: var(--text);
	}

	/* ── 2j — Scrollbar ───────────────────────────────────── */
	.conversation-list::-webkit-scrollbar,
	.conversation-list *::-webkit-scrollbar {
		width: 17px;
	}
	.conversation-list {
		scrollbar-width: thin;
		scrollbar-color: color-mix(in srgb, var(--text-secondary) 72%, transparent) transparent;
	}
	.conversation-list::-webkit-scrollbar-track {
		background: transparent;
	}
	.conversation-list::-webkit-scrollbar-thumb {
		background-color: color-mix(in srgb, var(--text-secondary) 72%, transparent);
		border: 2px solid transparent;
		border-radius: 999px;
		background-clip: content-box;
	}
	.conversation-list::-webkit-scrollbar-thumb:hover {
		background-color: color-mix(in srgb, var(--text) 78%, transparent);
	}

	/* ── Ghost / icon button (collapsed sidebar) ──────────── */
	.btn-ghost {
		background: transparent;
		border: none;
		color: var(--text-tertiary);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}
	.btn-ghost:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	/* ── Background gradient overlays ─────────────────────── */
	.sidebar-gradient-overlay-top {
		background: linear-gradient(to bottom, var(--bg-sidebar) 50%, transparent);
	}
	.sidebar-gradient-overlay-bottom {
		background: linear-gradient(to top, var(--bg-sidebar) 50%, transparent);
	}

	/* ── Sidebar footer row layout ────────────────────────── */
	.sidebar-footer-row {
		display: flex;
		align-items: center;
		gap: 4px;
		width: 100%;
	}
	.sidebar-footer-user {
		flex: 1 1 auto;
		min-width: 0;
	}
	:global(.sidebar-footer-theme) {
		flex: none;
	}

	/* ── Theme toggle (DESIGN.md §4.16) ───────────────────── */
	.theme-btn {
		position: relative;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: grid;
		place-items: center;
		background: transparent;
		border: none;
		color: var(--text-tertiary);
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
		flex: none;
		overflow: hidden;
	}
	.theme-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
	}
	.theme-btn svg {
		position: absolute;
		transition:
			transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
			opacity 0.35s ease;
	}
	.theme-btn .icon-sun {
		transform: rotate(-180deg) scale(0.5);
		opacity: 0;
	}
	.theme-btn .icon-moon {
		transform: rotate(0deg) scale(1);
		opacity: 1;
	}
	.theme-btn.is-dark .icon-sun {
		transform: rotate(180deg) scale(1);
		opacity: 1;
	}
	.theme-btn.is-dark .icon-moon {
		transform: rotate(180deg) scale(0.5);
		opacity: 0;
	}
</style>
