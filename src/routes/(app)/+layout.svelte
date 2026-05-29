<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { onMount, tick, getContext } from 'svelte';
	import { openDB, deleteDB } from 'idb';
	import fileSaver from 'file-saver';
	const { saveAs } = fileSaver;

	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { fade } from 'svelte/transition';

	import { getModels, getToolServersData, getVersionUpdates } from '$lib/apis';
	import { getTools } from '$lib/apis/tools';
	import { updateChatById } from '$lib/apis/chats';
	import { getBanners } from '$lib/apis/configs';
	import { getTerminalServers } from '$lib/apis/terminal';
	import { getUserSettings } from '$lib/apis/users';

	import { WEBUI_VERSION, WEBUI_API_BASE_URL } from '$lib/constants';
	import { compareVersion } from '$lib/utils';

	import {
		config,
		user,
		settings,
		models,
		knowledge,
		tools,
		functions,
		tags,
		banners,
		chatId,
		showSettings,
		showShortcuts,
		showChangelog,
		toolServers,
		terminalServers,
		selectedTerminalId,
		showSearch,
		showSidebar,
		mobile,
		scratchboardContent as scratchboardContentStore
	} from '$lib/stores';

	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Scratchboard from '$lib/components/design/Scratchboard.svelte';
	import SettingsModal from '$lib/components/chat/SettingsModal.svelte';
	import ShortcutsModal from '$lib/components/chat/ShortcutsModal.svelte';
	import ChangelogModal from '$lib/components/ChangelogModal.svelte';
	import AccountPending from '$lib/components/layout/Overlay/AccountPending.svelte';
	import UpdateInfoToast from '$lib/components/layout/UpdateInfoToast.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import { Shortcut, shortcuts } from '$lib/shortcuts';

	const i18n = getContext('i18n');

	let loaded = false;
	let DB = null;
	let localDBChats = [];

	let version;
	let cursorX = 500;
	let tabY = 360;
	let scratchboardContent = '';
	let scratchboardLoadedKey = '';
	let scratchboardMounted = false;
	let scratchboardCollapsed = false;
	let scratchboardWidth = 380;
	let scratchboardResizing = false;

	const SCRATCHBOARD_MIN_W = 280;
	const SCRATCHBOARD_MAX_W = 900;

	$: if (browser && scratchboardMounted) {
		localStorage.setItem('scratchboardCollapsed', scratchboardCollapsed ? 'true' : 'false');
	}

	$: if (browser && scratchboardMounted) {
		localStorage.setItem('scratchboardWidth', String(scratchboardWidth));
	}

	const startScratchboardResize = (event: PointerEvent) => {
		event.preventDefault();
		scratchboardResizing = true;
		const startX = event.clientX;
		const startW = scratchboardWidth;

		const onMove = (e: PointerEvent) => {
			// dragging left (smaller clientX) widens the pane
			const next = startW + (startX - e.clientX);
			scratchboardWidth = Math.max(SCRATCHBOARD_MIN_W, Math.min(SCRATCHBOARD_MAX_W, next));
		};
		const onUp = () => {
			scratchboardResizing = false;
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	};

	const defaultScratchboard =
		'# Scratchboard\n\n- Capture useful context from this chat\n- Draft follow-up prompts\n- Keep implementation notes close to the conversation\n';

	$: isChatSurface =
		['/', '/home'].includes($page.url.pathname) || $page.url.pathname.startsWith('/c/');
	$: proximity = Math.max(0, Math.min(1, 1 - cursorX / 80));
	$: notchW = 12 + proximity * 28;
	$: notchH = 52 + proximity * 32;
	$: activeScratchboardKey = `open-webui:scratchboard:${$chatId || 'new'}`;
	$: if (scratchboardMounted && isChatSurface && activeScratchboardKey !== scratchboardLoadedKey) {
		scratchboardLoadedKey = activeScratchboardKey;
		scratchboardContent = localStorage.getItem(activeScratchboardKey) ?? defaultScratchboard;
		scratchboardContentStore.set(scratchboardContent);
	}
	$: if ($scratchboardContentStore !== scratchboardContent) {
		scratchboardContent = $scratchboardContentStore;
		if (browser) {
			localStorage.setItem(activeScratchboardKey, scratchboardContent);
		}
	}

	const saveScratchboard = (value: string) => {
		scratchboardContent = value;
		scratchboardContentStore.set(value);
		if (browser) {
			localStorage.setItem(activeScratchboardKey, value);
		}

		if ($chatId && !$chatId.startsWith('local:') && !$chatId.startsWith('channel:')) {
			updateChatById(localStorage.token, $chatId, { scratchboard: value }).catch((err) =>
				console.error('[scratchboard autosave]', err)
			);
		}
	};

	const clearChatInputStorage = () => {
		const chatInputKeys = Object.keys(localStorage).filter((key) => key.startsWith('chat-input'));
		if (chatInputKeys.length > 0) {
			chatInputKeys.forEach((key) => {
				localStorage.removeItem(key);
			});
		}
	};

	const checkLocalDBChats = async () => {
		try {
			// Check if IndexedDB exists
			DB = await openDB('Chats', 1);

			if (!DB) {
				return;
			}

			const chats = await DB.getAllFromIndex('chats', 'timestamp');
			localDBChats = chats.map((item, idx) => chats[chats.length - 1 - idx]);

			if (localDBChats.length === 0) {
				await deleteDB('Chats');
			}
		} catch (error) {
			// IndexedDB Not Found
		}
	};

	const setUserSettings = async (cb: () => Promise<void>) => {
		let userSettings = await getUserSettings(localStorage.token).catch((error) => {
			console.error(error);
			return null;
		});

		if (!userSettings) {
			try {
				userSettings = JSON.parse(localStorage.getItem('settings') ?? '{}');
			} catch (e: unknown) {
				console.error('Failed to parse settings from localStorage', e);
				userSettings = {};
			}
		}

		if (userSettings?.ui) {
			settings.set(userSettings.ui);
		}

		if (cb) {
			await cb();
		}
	};

	const setModels = async () => {
		models.set(
			await getModels(
				localStorage.token,
				$config?.features?.enable_direct_connections ? ($settings?.directConnections ?? null) : null
			)
		);
	};

	const setToolServers = async () => {
		let toolServersData = await getToolServersData($settings?.toolServers ?? []);
		toolServersData = toolServersData.filter((data) => {
			if (!data || data.error) {
				toast.error(
					$i18n.t(`Failed to connect to {{URL}} OpenAPI tool server`, {
						URL: data?.url
					})
				);
				return false;
			}
			return true;
		});
		toolServers.set(toolServersData);

		// Inject enabled terminal servers as always-on tool servers
		const enabledTerminals = ($settings?.terminalServers ?? []).filter((s) => s.enabled);
		if (enabledTerminals.length > 0) {
			let terminalServersData = await getToolServersData(
				enabledTerminals.map((t) => ({
					url: t.url,
					auth_type: t.auth_type ?? 'bearer',
					key: t.key ?? '',
					path: t.path ?? '/openapi.json',
					config: { enable: true }
				}))
			);
			terminalServersData = terminalServersData
				.filter((data) => {
					if (!data || data.error) {
						toast.error(
							$i18n.t(`Failed to connect to {{URL}} terminal server`, {
								URL: data?.url
							})
						);
						return false;
					}
					return true;
				})
				.map((data, i) => ({
					...data,
					key: enabledTerminals[i]?.key ?? ''
				}));

			terminalServers.set(terminalServersData);
		} else {
			terminalServers.set([]);
		}

		// Fetch terminal servers the user has access to (for FileNav + terminal_id)
		const systemTerminals = await getTerminalServers(localStorage.token);
		if (systemTerminals.length > 0) {
			// Store with proxy URL and session key for FileNav file browsing
			const terminalEntries = systemTerminals.map((t) => ({
				id: t.id,
				url: `${WEBUI_API_BASE_URL}/terminals/${t.id}`,
				name: t.name,
				key: localStorage.token
			}));
			terminalServers.update((existing) => [...existing, ...terminalEntries]);
		}
	};

	const setBanners = async () => {
		const bannersData = await getBanners(localStorage.token);
		banners.set(bannersData);
	};

	const setTools = async () => {
		const toolsData = await getTools(localStorage.token);
		tools.set(toolsData);
	};

	onMount(async () => {
		scratchboardCollapsed = localStorage.getItem('scratchboardCollapsed') === 'true';
		const savedWidth = parseInt(localStorage.getItem('scratchboardWidth') ?? '', 10);
		if (!Number.isNaN(savedWidth)) {
			scratchboardWidth = Math.max(SCRATCHBOARD_MIN_W, Math.min(SCRATCHBOARD_MAX_W, savedWidth));
		}
		scratchboardMounted = true;

		if ($user === undefined || $user === null) {
			await goto('/auth');
			return;
		}
		if (!['user', 'admin'].includes($user?.role)) {
			return;
		}

		clearChatInputStorage();
		await Promise.all([
			checkLocalDBChats(),
			setBanners().catch((e) => console.error('Failed to load banners:', e)),
			setTools().catch((e) => console.error('Failed to load tools:', e)),
			setUserSettings(async () => {
				await Promise.all([
					setModels().catch((e) => console.error('Failed to load models:', e)),
					setToolServers().catch((e) => console.error('Failed to load tool servers:', e))
				]);
			}).catch((e) => console.error('Failed to load user settings:', e))
		]);

		// Helper function to check if the pressed keys match the shortcut definition
		const isShortcutMatch = (event: KeyboardEvent, shortcut): boolean => {
			const keys = shortcut?.keys || [];

			const normalized = keys.map((k) => k.toLowerCase());
			const needCtrl = normalized.includes('ctrl') || normalized.includes('mod');
			const needShift = normalized.includes('shift');
			const needAlt = normalized.includes('alt');

			const mainKeys = normalized.filter((k) => !['ctrl', 'shift', 'alt', 'mod'].includes(k));

			// Get the main key pressed
			const keyPressed = event.key.toLowerCase();

			// Check modifiers
			if (needShift && !event.shiftKey) return false;

			if (needCtrl && !(event.ctrlKey || event.metaKey)) return false;
			if (!needCtrl && (event.ctrlKey || event.metaKey)) return false;
			if (needAlt && !event.altKey) return false;
			if (!needAlt && event.altKey) return false;

			if (mainKeys.length && !mainKeys.includes(keyPressed)) return false;

			return true;
		};

		const setupKeyboardShortcuts = () => {
			document.addEventListener('keydown', async (event) => {
				if (isShortcutMatch(event, shortcuts[Shortcut.SEARCH])) {
					console.log('Shortcut triggered: SEARCH');
					event.preventDefault();
					showSearch.set(!$showSearch);
				} else if (isShortcutMatch(event, shortcuts[Shortcut.NEW_CHAT])) {
					console.log('Shortcut triggered: NEW_CHAT');
					event.preventDefault();
					document.getElementById('sidebar-new-chat-button')?.click();
				} else if (isShortcutMatch(event, shortcuts[Shortcut.FOCUS_INPUT])) {
					console.log('Shortcut triggered: FOCUS_INPUT');
					event.preventDefault();
					document.getElementById('chat-input')?.focus();
				} else if (isShortcutMatch(event, shortcuts[Shortcut.COPY_LAST_CODE_BLOCK])) {
					console.log('Shortcut triggered: COPY_LAST_CODE_BLOCK');
					event.preventDefault();
					[...document.getElementsByClassName('copy-code-button')]?.at(-1)?.click();
				} else if (isShortcutMatch(event, shortcuts[Shortcut.COPY_LAST_RESPONSE])) {
					console.log('Shortcut triggered: COPY_LAST_RESPONSE');
					event.preventDefault();
					[...document.getElementsByClassName('copy-response-button')]?.at(-1)?.click();
				} else if (isShortcutMatch(event, shortcuts[Shortcut.TOGGLE_SIDEBAR])) {
					console.log('Shortcut triggered: TOGGLE_SIDEBAR');
					event.preventDefault();
					showSidebar.set(!$showSidebar);
				} else if (isShortcutMatch(event, shortcuts[Shortcut.DELETE_CHAT])) {
					console.log('Shortcut triggered: DELETE_CHAT');
					event.preventDefault();
					document.getElementById('delete-chat-button')?.click();
				} else if (isShortcutMatch(event, shortcuts[Shortcut.OPEN_SETTINGS])) {
					console.log('Shortcut triggered: OPEN_SETTINGS');
					event.preventDefault();
					showSettings.set(!$showSettings);
				} else if (isShortcutMatch(event, shortcuts[Shortcut.SHOW_SHORTCUTS])) {
					console.log('Shortcut triggered: SHOW_SHORTCUTS');
					event.preventDefault();
					showShortcuts.set(!$showShortcuts);
				} else if (isShortcutMatch(event, shortcuts[Shortcut.CLOSE_MODAL])) {
					console.log('Shortcut triggered: CLOSE_MODAL');
					event.preventDefault();
					showSettings.set(false);
					showShortcuts.set(false);
				} else if (isShortcutMatch(event, shortcuts[Shortcut.OPEN_MODEL_SELECTOR])) {
					console.log('Shortcut triggered: OPEN_MODEL_SELECTOR');
					event.preventDefault();
					document.getElementById('model-selector-0-button')?.click();
				} else if (isShortcutMatch(event, shortcuts[Shortcut.GENERATE_MESSAGE_PAIR])) {
					console.log('Shortcut triggered: GENERATE_MESSAGE_PAIR');
					event.preventDefault();
					document.getElementById('generate-message-pair-button')?.click();
				} else if (
					isShortcutMatch(event, shortcuts[Shortcut.REGENERATE_RESPONSE]) &&
					document.activeElement?.id === 'chat-input'
				) {
					console.log('Shortcut triggered: REGENERATE_RESPONSE');
					event.preventDefault();
					[...document.getElementsByClassName('regenerate-response-button')]?.at(-1)?.click();
				}
			});
		};
		setupKeyboardShortcuts();

		if ($user?.role === 'admin' && ($settings?.showChangelog ?? true)) {
			showChangelog.set($settings?.version !== $config.version);
		}

		// Check for version updates
		if ($user?.role === 'admin' && $config?.features?.enable_version_update_check) {
			// Check if the user has dismissed the update toast in the last 24 hours
			if (localStorage.dismissedUpdateToast) {
				const dismissedUpdateToast = new Date(Number(localStorage.dismissedUpdateToast));
				const now = new Date();

				if (now - dismissedUpdateToast > 24 * 60 * 60 * 1000) {
					checkForVersionUpdates();
				}
			} else {
				checkForVersionUpdates();
			}
		}
		// Persist selectedTerminalId across page loads
		selectedTerminalId.set(localStorage.selectedTerminalId ?? null);
		selectedTerminalId.subscribe((value) => {
			if (value === null) {
				delete localStorage.selectedTerminalId;
			} else {
				localStorage.selectedTerminalId = value;
			}
		});

		await tick();

		loaded = true;
	});

	const checkForVersionUpdates = async () => {
		version = await getVersionUpdates(localStorage.token).catch((error) => {
			return {
				current: WEBUI_VERSION,
				latest: WEBUI_VERSION
			};
		});
	};
</script>

<SettingsModal bind:show={$showSettings} />
<ShortcutsModal bind:show={$showShortcuts} />
<ChangelogModal bind:show={$showChangelog} />

{#if version && compareVersion(version.latest, version.current) && ($settings?.showUpdateToast ?? true)}
	<div class=" absolute bottom-8 right-8 z-50" in:fade={{ duration: 100 }}>
		<UpdateInfoToast
			{version}
			on:close={() => {
				localStorage.setItem('dismissedUpdateToast', Date.now().toString());
				version = null;
			}}
		/>
	</div>
{/if}

{#if $user}
	<div
		class="app design-root"
		on:mousemove={(e) => {
			cursorX = e.clientX;
			tabY = Math.max(42, Math.min(e.clientY, window.innerHeight - 42));
		}}
		role="presentation"
	>
		<div class="sidebar-layer">
			<Sidebar peeled={true} />
		</div>

		{#if !$showSidebar && !$mobile}
			<button
				class="notch"
				style:top="{tabY}px"
				style:width="{notchW}px"
				style:height="{notchH}px"
				style:border-radius="0 {notchW}px {notchW}px 0"
				on:click={() => showSidebar.set(true)}
				aria-label={$i18n.t('Open Sidebar')}
			>
				<svg
					width="6"
					height="10"
					viewBox="0 0 6 10"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					style:opacity={0.35 + proximity * 0.5}
					aria-hidden="true"
				>
					<path d="M1 1l4 4-4 4" />
				</svg>
			</button>
		{/if}

		<div class="app-shell" class:open={$showSidebar && !$mobile}>
			{#if $showSidebar && !$mobile}
				<div
					class="shell-backdrop"
					on:click={() => showSidebar.set(false)}
					role="presentation"
					aria-hidden="true"
				></div>
			{/if}
			{#if !['user', 'admin'].includes($user?.role)}
				<AccountPending />
			{:else}
				{#if localDBChats.length > 0}
					<div class="fixed w-full h-full flex z-50">
						<div
							class="absolute w-full h-full backdrop-blur-md bg-white/20 dark:bg-gray-900/50 flex justify-center"
						>
							<div class="m-auto pb-44 flex flex-col justify-center">
								<div class="max-w-md">
									<div class="text-center dark:text-white text-2xl font-medium z-50">
										{$i18n.t('Important Update')}<br />
										{$i18n.t('Action Required for Chat Log Storage')}
									</div>

									<div class=" mt-4 text-center text-sm dark:text-gray-200 w-full">
										{$i18n.t(
											"Saving chat logs directly to your browser's storage is no longer supported. Please take a moment to download and delete your chat logs by clicking the button below. Don't worry, you can easily re-import your chat logs to the backend through"
										)}
										<span class="font-medium dark:text-white"
											>{$i18n.t('Settings')} > {$i18n.t('Chats')} > {$i18n.t('Import Chats')}</span
										>. {$i18n.t(
											'This ensures that your valuable conversations are securely saved to your backend database. Thank you!'
										)}
									</div>

									<div class=" mt-6 mx-auto relative group w-fit">
										<button
											class="relative z-20 flex px-5 py-2 rounded-full bg-white border border-gray-100 dark:border-none hover:bg-gray-100 transition font-medium text-sm"
											on:click={async () => {
												let blob = new Blob([JSON.stringify(localDBChats)], {
													type: 'application/json'
												});
												saveAs(blob, `chat-export-${Date.now()}.json`);

												const tx = DB.transaction('chats', 'readwrite');
												await Promise.all([tx.store.clear(), tx.done]);
												await deleteDB('Chats');

												localDBChats = [];
											}}
										>
											{$i18n.t('Download & Delete')}
										</button>

										<button
											class="text-xs text-center w-full mt-2 text-gray-400 underline"
											on:click={async () => {
												localDBChats = [];
											}}>{$i18n.t('Close')}</button
										>
									</div>
								</div>
							</div>
						</div>
					</div>
				{/if}

				{#if loaded}
					{#if isChatSurface && !$mobile}
						<div class="content-grid" class:scratchboard-collapsed={scratchboardCollapsed}>
							<div class="primary-pane">
								<slot />
							</div>
							<div
								class="scratchboard-pane"
								class:resizing={scratchboardResizing}
								style={scratchboardCollapsed ? '' : `width: ${scratchboardWidth}px`}
							>
								{#if !scratchboardCollapsed}
									<div
										class="scratchboard-resizer"
										role="separator"
										aria-orientation="vertical"
										aria-label="Resize Scratchboard"
										on:pointerdown={startScratchboardResize}
									></div>
								{/if}
								<Scratchboard
									content={scratchboardContent}
									onChange={saveScratchboard}
									bind:collapsed={scratchboardCollapsed}
								/>
							</div>
						</div>
					{:else}
						<div class="primary-pane full">
							<slot />
						</div>
					{/if}
				{:else}
					<div class="w-full flex-1 h-full flex items-center justify-center">
						<Spinner className="size-5" />
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
	.design-root {
		--sidebar-w: var(--sidebar-width, 260px);
		position: fixed;
		inset: 0;
		background: var(--bg-sidebar);
		color: var(--text);
		overflow: hidden;
		font-family: var(--font-sans);
	}

	.sidebar-layer {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: var(--sidebar-w);
		z-index: 0;
	}

	.app-shell {
		position: absolute;
		inset: 0;
		z-index: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		background: var(--bg-base);
		border-radius: 0;
		transform: translateX(0);
		transition:
			transform 0.38s cubic-bezier(0.16, 1, 0.3, 1),
			box-shadow 0.38s cubic-bezier(0.16, 1, 0.3, 1),
			border-radius 0.38s cubic-bezier(0.16, 1, 0.3, 1);
		overflow: hidden;
	}

	.app-shell.open {
		border-radius: 20px;
		transform: translateX(var(--sidebar-w));
		box-shadow: -12px 0 48px rgba(0, 0, 0, 0.22);
	}

	.notch {
		position: absolute;
		left: 0;
		transform: translateY(-50%);
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		padding-left: 1px;
		background: var(--bg-sidebar);
		border: none;
		color: var(--text-tertiary);
		cursor: pointer;
		box-shadow:
			inset -10px 0 18px rgba(0, 0, 0, 0.13),
			inset 0 6px 12px rgba(0, 0, 0, 0.07),
			inset 0 -6px 12px rgba(0, 0, 0, 0.05);
		transition:
			width 0.14s ease-out,
			height 0.14s ease-out,
			border-radius 0.14s ease-out,
			top 0.06s ease-out,
			color 0.14s ease;
	}

	.notch:hover {
		color: var(--text-secondary);
	}

	.notch:active {
		filter: brightness(0.95);
	}

	.shell-backdrop {
		position: absolute;
		inset: 0;
		z-index: 100;
		cursor: pointer;
	}

	.content-grid {
		display: flex;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
	}

	.scratchboard-pane {
		position: relative;
		flex: none;
		width: max(340px, 32vw);
		height: 100%;
		overflow: hidden;
		transition: width 0.34s cubic-bezier(0.22, 1, 0.36, 1);
	}

	.scratchboard-pane.resizing {
		transition: none;
		user-select: none;
	}

	.content-grid.scratchboard-collapsed .scratchboard-pane {
		width: 44px !important;
	}

	.scratchboard-resizer {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 8px;
		z-index: 5;
		cursor: col-resize;
		transition: background 0.15s ease;
	}

	.scratchboard-resizer:hover,
	.scratchboard-pane.resizing .scratchboard-resizer {
		background: color-mix(in srgb, var(--accent, var(--text-tertiary)) 45%, transparent);
	}

	.primary-pane {
		flex: 1 1 0;
		min-width: 0;
		min-height: 0;
		overflow: hidden;
	}

	.primary-pane.full {
		width: 100%;
		height: 100%;
	}
</style>
