<script lang="ts">
	import { getContext, onMount, tick } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { config, models, settings, user } from '$lib/stores';
	import { updateUserSettings } from '$lib/apis/users';
	import { getModels as _getModels } from '$lib/apis';
	import { userSignOut } from '$lib/apis/auths';
	import { goto } from '$app/navigation';

	import Modal from '../common/Modal.svelte';
	import About from './Settings/About.svelte';
	import General from './Settings/General.svelte';
	import Interface from './Settings/Interface.svelte';
	import DataControls from './Settings/DataControls.svelte';
	import Personalization from './Settings/Personalization.svelte';
	import ArchivedChats from './Settings/ArchivedChats.svelte';
	import KeyboardShortcuts from './Settings/KeyboardShortcuts.svelte';
	import Search from '../icons/Search.svelte';
	import XMark from '../icons/XMark.svelte';
	import Connections from './Settings/Connections.svelte';
	import Integrations from './Settings/Integrations.svelte';
	import DatabaseSettings from '../icons/DatabaseSettings.svelte';
	import SettingsAlt from '../icons/SettingsAlt.svelte';
	import Link from '../icons/Link.svelte';
	import InfoCircle from '../icons/InfoCircle.svelte';
	import WrenchAlt from '../icons/WrenchAlt.svelte';
	import Face from '../icons/Face.svelte';
	import AppNotification from '../icons/AppNotification.svelte';
	import ArchiveBox from '../icons/ArchiveBox.svelte';
	import UserGroup from '../icons/UserGroup.svelte';
	import Keyboard from '../icons/Keyboard.svelte';
	import SignOut from '../icons/SignOut.svelte';

	const i18n = getContext('i18n');

	const signOutHandler = async () => {
		const res = await userSignOut();
		user.set(null);
		localStorage.removeItem('token');
		show = false;
		location.href = res?.redirect_url ?? '/auth';
	};

	// Icon component per tab id — drives the data-driven rail
	const tabIcons = {
		general: SettingsAlt,
		interface: AppNotification,
		connections: Link,
		tools: WrenchAlt,
		personalization: Face,
		archived_chats: ArchiveBox,
		data_controls: DatabaseSettings,
		about: InfoCircle
	};

	export let show: boolean | string = false;

	$: if (show) {
		if (typeof show === 'string') {
			selectedTab = show;
			show = true;
		}
		addScrollListener();
	} else {
		selectedTab = 'general';
		removeScrollListener();
	}

	interface SettingsTab {
		id: string;
		title: string;
		keywords: string[];
	}

	const designSubsections = [
		{ id: 'design-section-ui', title: 'UI' },
		{ id: 'design-section-chat', title: 'Chat' },
		{ id: 'design-section-input', title: 'Input' },
		{ id: 'design-section-artifacts', title: 'Artifacts' },
		{ id: 'design-section-voice', title: 'Voice' },
		{ id: 'design-section-file', title: 'File' },
		{ id: 'design-section-memory', title: 'Memory' }
	];

	const allSettings: SettingsTab[] = [
		{
			id: 'general',
			title: 'General',
			keywords: [
				'account preferences',
				'account settings',
				'accountpreferences',
				'accountsettings',
				'advancedparams',
				'advancedparameters',
				'advanced params',
				'advanced parameters',
				'api keys',
				'apikeys',
				'change password',
				'changepassword',
				'configuration',
				'defaultparameters',
				'default parameters',
				'defaultsettings',
				'default settings',
				'general',
				'keepalive',
				'keep alive',
				'languages',
				'login',
				'new password',
				'newpassword',
				'notifications',
				'notification webhook url',
				'notificationwebhookurl',
				'privacy settings',
				'privacysettings',
				'profileavatar',
				'profile avatar',
				'profile details',
				'profile image',
				'profile picture',
				'profiledetails',
				'profileimage',
				'profilepicture',
				'requestmode',
				'request mode',
				'security settings',
				'securitysettings',
				'systemparameters',
				'system parameters',
				'systemprompt',
				'system prompt',
				'systemsettings',
				'system settings',
				'theme',
				'translate',
				'update account',
				'update password',
				'updateaccount',
				'updatepassword',
				'user account',
				'user data',
				'user profile',
				'useraccount',
				'userdata',
				'username',
				'userprofile',
				'webuisettings',
				'webui settings',
				'webhook url',
				'webhookurl'
			]
		},
		{
			id: 'interface',
			title: 'Interface',
			keywords: [
				'memories',
				'memory',
				'personalization',
				'personalize',
				'allow user location',
				'allow voice interruption in call',
				'allowuserlocation',
				'allowvoiceinterruptionincall',
				'always collapse codeblocks',
				'always collapse code blocks',
				'always expand details',
				'always on web search',
				'always play notification sound',
				'alwayscollapsecodeblocks',
				'alwaysexpanddetails',
				'alwaysonwebsearch',
				'alwaysplaynotificationsound',
				'android',
				'auto chat tags',
				'auto copy response to clipboard',
				'auto title',
				'autochattags',
				'autocopyresponsetoclipboard',
				'autotitle',
				'beta',
				'call',
				'chat background image',
				'chat bubble ui',
				'chat direction',
				'chat tags autogen',
				'chat tags autogeneration',
				'chat ui',
				'chatbackgroundimage',
				'chatbubbleui',
				'chatdirection',
				'chat tags autogeneration',
				'chattagsautogeneration',
				'chatui',
				'copy formatted text',
				'copyformattedtext',
				'default model',
				'defaultmodel',
				'design',
				'detect artifacts automatically',
				'detectartifactsautomatically',
				'display emoji in call',
				'display username',
				'displayemojiincall',
				'displayusername',
				'enter key behavior',
				'enterkeybehavior',
				'expand mode',
				'expandmode',
				'file',
				'followup autogeneration',
				'followupautogeneration',
				'fullscreen',
				'fullwidthmode',
				'full width mode',
				'haptic feedback',
				'hapticfeedback',
				'high contrast mode',
				'highcontrastmode',
				'iframe sandbox allow forms',
				'iframe sandbox allow same origin',
				'iframesandboxallowforms',
				'iframesandboxallowsameorigin',
				'imagecompression',
				'image compression',
				'imagemaxcompressionsize',
				'image max compression size',
				'interface customization',
				'interface options',
				'interfacecustomization',
				'interfaceoptions',
				'landing page mode',
				'landingpagemode',
				'layout',
				'left to right',
				'left-to-right',
				'lefttoright',
				'ltr',
				'paste large text as file',
				'pastelargetextasfile',
				'reset background',
				'resetbackground',
				'response auto copy',
				'responseautocopy',
				'rich text input for chat',
				'richtextinputforchat',
				'right to left',
				'right-to-left',
				'righttoleft',
				'rtl',
				'scroll behavior',
				'scroll on branch change',
				'scrollbehavior',
				'scrollonbranchchange',
				'select model',
				'selectmodel',
				'settings',
				'show username',
				'showusername',
				'stream large chunks',
				'streamlargechunks',
				'stylized pdf export',
				'stylizedpdfexport',
				'title autogeneration',
				'titleautogeneration',
				'toast notifications for new updates',
				'toastnotificationsfornewupdates',
				'upload background',
				'uploadbackground',
				'user interface',
				'user location access',
				'userinterface',
				'userlocationaccess',
				'vibration',
				'voice control',
				'voicecontrol',
				'widescreen mode',
				'widescreenmode',
				'whatsnew',
				'whats new',
				'websearchinchat',
				'web search in chat'
			]
		},
		{
			id: 'connections',
			title: 'Connections',
			keywords: [
				'addconnection',
				'add connection',
				'manageconnections',
				'manage connections',
				'manage direct connections',
				'managedirectconnections',
				'settings'
			]
		},
		{
			id: 'tools',
			title: 'Integrations',
			keywords: [
				'addconnection',
				'add connection',
				'integrations',
				'managetools',
				'manage tools',
				'manage tool servers',
				'managetoolservers',
				'open terminal',
				'openterminal',
				'terminal',
				'settings'
			]
		},

		{
			id: 'archived_chats',
			title: 'Archived Chats',
			keywords: [
				'archive',
				'archived chats',
				'archivedchats',
				'export archived chats',
				'manage archived chats',
				'restore chats',
				'unarchive',
				'unarchive all',
				'unarchiveall'
			]
		},
		{
			id: 'data_controls',
			title: 'Data Controls',
			keywords: [
				'archive all chats',
				'archive chats',
				'archiveallchats',
				'archivechats',
				'archived chats',
				'archivedchats',
				'chat activity',
				'chat history',
				'chat settings',
				'chatactivity',
				'chathistory',
				'chatsettings',
				'conversation activity',
				'conversation history',
				'conversationactivity',
				'conversationhistory',
				'conversations',
				'convos',
				'delete all chats',
				'delete chats',
				'deleteallchats',
				'deletechats',
				'export chats',
				'exportchats',
				'import chats',
				'importchats',
				'message activity',
				'message archive',
				'message history',
				'messagearchive',
				'messagehistory'
			]
		},
		{
			id: 'about',
			title: 'About',
			keywords: [
				'about app',
				'about me',
				'about open webui',
				'about page',
				'about us',
				'aboutapp',
				'aboutme',
				'aboutopenwebui',
				'aboutpage',
				'aboutus',
				'check for updates',
				'checkforupdates',
				'contact',
				'copyright',
				'details',
				'discord',
				'documentation',
				'github',
				'help',
				'information',
				'license',
				'redistributions',
				'release',
				'see whats new',
				'seewhatsnew',
				'settings',
				'software info',
				'softwareinfo',
				'support',
				'terms and conditions',
				'terms of use',
				'termsandconditions',
				'termsofuse',
				'timothy jae ryang baek',
				'timothy j baek',
				'timothyjaeryangbaek',
				'timothyjbaek',
				'twitter',
				'update info',
				'updateinfo',
				'version info',
				'versioninfo'
			]
		}
	];

	let availableSettings = [];
	let filteredSettings = [];

	let search = '';
	let searchDebounceTimeout;

	const getAvailableSettings = () => {
		return allSettings.filter((tab) => {
			if (tab.id === 'connections') {
				return $config?.features?.enable_direct_connections;
			}

			if (tab.id === 'tools') {
				return (
					$user?.role === 'admin' ||
					($user?.role === 'user' && $user?.permissions?.features?.direct_tool_servers)
				);
			}

			if (tab.id === 'interface') {
				return $user?.role === 'admin' || ($user?.permissions?.settings?.interface ?? true);
			}

			return true;
		});
	};

	// Personalization (Memory) is now merged into the Interface tab
	$: personalizationAvailable =
		$config?.features?.enable_memories &&
		($user?.role === 'admin' || ($user?.permissions?.features?.memories ?? true));

	const setFilteredSettings = () => {
		filteredSettings = availableSettings
			.filter((tab) => {
				return (
					search === '' ||
					tab.title.toLowerCase().includes(search.toLowerCase().trim()) ||
					tab.keywords.some((keyword) => keyword.includes(search.toLowerCase().trim()))
				);
			})
			.map((tab) => tab.id);

		if (filteredSettings.length > 0 && !filteredSettings.includes(selectedTab)) {
			selectedTab = filteredSettings[0];
		}
	};

	const searchDebounceHandler = () => {
		if (searchDebounceTimeout) {
			clearTimeout(searchDebounceTimeout);
		}

		searchDebounceTimeout = setTimeout(() => {
			setFilteredSettings();
		}, 100);
	};

	const saveSettings = async (updated) => {
		console.log(updated);
		await settings.set({ ...$settings, ...updated });
		await models.set(await getModels());
		await updateUserSettings(localStorage.token, { ui: $settings });
	};

	const getModels = async () => {
		return await _getModels(
			localStorage.token,
			$config?.features?.enable_direct_connections && ($settings?.directConnections ?? null)
		);
	};

	const selectDesignSubsection = async (sectionId: string) => {
		selectedTab = 'interface';
		await tick();
		document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	};

	let selectedTab = 'general';

	// Function to handle sideways scrolling
	const scrollHandler = (event) => {
		const settingsTabsContainer = document.getElementById('settings-tabs-container');
		if (settingsTabsContainer) {
			event.preventDefault(); // Prevent default vertical scrolling
			settingsTabsContainer.scrollLeft += event.deltaY; // Scroll sideways
		}
	};

	const addScrollListener = async () => {
		await tick();
		const settingsTabsContainer = document.getElementById('settings-tabs-container');
		if (settingsTabsContainer) {
			settingsTabsContainer.addEventListener('wheel', scrollHandler);
		}
	};

	const removeScrollListener = async () => {
		await tick();
		const settingsTabsContainer = document.getElementById('settings-tabs-container');
		if (settingsTabsContainer) {
			settingsTabsContainer.removeEventListener('wheel', scrollHandler);
		}
	};

	onMount(() => {
		availableSettings = getAvailableSettings();
		setFilteredSettings();

		config.subscribe((configData) => {
			availableSettings = getAvailableSettings();
			setFilteredSettings();
		});
	});
</script>

<Modal size="2xl" bind:show className="st-modal-shell">
	<div class="st-root">
		<div class="st-head">
			<div class="st-head-title">{$i18n.t('Settings')}</div>
			<button
				aria-label={$i18n.t('Close settings modal')}
				class="st-x"
				on:click={() => {
					show = false;
				}}
			>
				<XMark className="size-4" strokeWidth="2" />
			</button>
		</div>

		<div class="st-body">
			<div role="tablist" id="settings-tabs-container" class="st-rail tabs">
				<div class="st-search" id="settings-search">
					<Search
						className="size-3.5 shrink-0 text-[var(--text-tertiary)]"
						strokeWidth={($settings?.highContrastMode ?? false) ? '3' : '1.5'}
					/>
					<label class="sr-only" for="search-input-settings-modal">{$i18n.t('Search')}</label>
					<input
						class="st-search-input {($settings?.highContrastMode ?? false)
							? 'placeholder-gray-800 dark:placeholder-gray-200'
							: ''}"
						bind:value={search}
						id="search-input-settings-modal"
						on:input={searchDebounceHandler}
						placeholder={$i18n.t('Search')}
					/>
				</div>

				{#if filteredSettings.length > 0}
					{#each filteredSettings as tabId (tabId)}
						{#if tabId === 'connections' && !($user?.role === 'admin' || ($user?.role === 'user' && $config?.features?.enable_direct_connections))}
							<!-- hidden -->
						{:else if tabId === 'tools' && !($user?.role === 'admin' || ($user?.role === 'user' && $user?.permissions?.features?.direct_tool_servers))}
							<!-- hidden -->
						{:else}
							{@const meta = allSettings.find((t) => t.id === tabId)}
							<button
								role="tab"
								aria-controls="tab-{tabId}"
								aria-selected={selectedTab === tabId}
								class="st-tab {selectedTab === tabId ? 'on' : ''}"
								on:click={() => {
									selectedTab = tabId;
								}}
							>
								<span class="st-tab-icon">
									<svelte:component this={tabIcons[tabId as keyof typeof tabIcons]} strokeWidth="2" />
								</span>
								<span class="st-tab-label">{$i18n.t(meta?.title ?? tabId)}</span>
							</button>

							{#if tabId === 'interface' && selectedTab === 'interface'}
								<div class="st-sub">
									{#each designSubsections as subsection}
										{#if subsection.id !== 'design-section-memory' || personalizationAvailable}
											<button
												type="button"
												class="st-sub-btn"
												on:click={() => selectDesignSubsection(subsection.id)}
											>
												{$i18n.t(subsection.title)}
											</button>
										{/if}
									{/each}
								</div>
							{/if}
						{/if}
					{/each}
				{:else}
					<div class="st-no-results">{$i18n.t('No results found')}</div>
				{/if}

				<div class="st-rail-footer">
					<button
						type="button"
						class="st-tab {selectedTab === 'shortcuts' ? 'on' : ''}"
						on:click={() => {
							selectedTab = 'shortcuts';
						}}
					>
						<span class="st-tab-icon"><Keyboard strokeWidth="2" /></span>
						<span class="st-tab-label">{$i18n.t('Keyboard shortcuts')}</span>
					</button>

					{#if $user?.role === 'admin'}
						<a
							href="/admin"
							draggable="false"
							class="st-tab"
							on:click={async (e) => {
								e.preventDefault();
								await goto('/admin');
								show = false;
							}}
						>
							<span class="st-tab-icon"><UserGroup strokeWidth="2" /></span>
							<span class="st-tab-label">{$i18n.t('Admin Panel')}</span>
						</a>
					{/if}

					<button type="button" class="st-tab st-signout" on:click={signOutHandler}>
						<span class="st-tab-icon"><SignOut strokeWidth="2" /></span>
						<span class="st-tab-label">{$i18n.t('Sign Out')}</span>
					</button>
				</div>
			</div>

			<div class="st-content">
				{#if selectedTab === 'general'}
					<General
						{getModels}
						{saveSettings}
						on:save={() => {
							toast.success($i18n.t('Settings saved successfully!'));
						}}
					/>
				{:else if selectedTab === 'interface'}
					<Interface
						{saveSettings}
						on:save={() => {
							toast.success($i18n.t('Settings saved successfully!'));
						}}
					/>

					{#if personalizationAvailable}
						<div id="design-section-memory" class="st-merged-section">
							<Personalization
								{saveSettings}
								on:save={() => {
									toast.success($i18n.t('Settings saved successfully!'));
								}}
							/>
						</div>
					{/if}
				{:else if selectedTab === 'connections'}
					<Connections
						saveSettings={async (updated) => {
							await saveSettings(updated);
							toast.success($i18n.t('Settings saved successfully!'));
						}}
					/>
				{:else if selectedTab === 'tools'}
					<Integrations
						saveSettings={async (updated) => {
							await saveSettings(updated);
							toast.success($i18n.t('Settings saved successfully!'));
						}}
					/>
				{:else if selectedTab === 'shortcuts'}
					<KeyboardShortcuts />
				{:else if selectedTab === 'archived_chats'}
					<ArchivedChats />
				{:else if selectedTab === 'data_controls'}
					<DataControls {saveSettings} />
				{:else if selectedTab === 'about'}
					<About />
				{/if}
			</div>
		</div>
	</div>
</Modal>

<style>
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		/* display: none; <- Crashes Chrome on hover */
		-webkit-appearance: none;
		margin: 0; /* <-- Apparently some margin are still there even though it's hidden */
	}

	.tabs::-webkit-scrollbar {
		display: none; /* for Chrome, Safari and Opera */
	}

	.tabs {
		-ms-overflow-style: none; /* IE and Edge */
		scrollbar-width: none; /* Firefox */
	}

	input[type='number'] {
		appearance: textfield;
		-moz-appearance: textfield; /* Firefox */
	}

	/* ── Redesigned shell ───────────────────────── */
	:global(.st-modal-shell) {
		background: var(--bg-elevated) !important;
		border: 1px solid var(--border) !important;
		border-radius: 20px !important;
		overflow: hidden;
	}
	.st-root {
		display: flex;
		flex-direction: column;
		color: var(--text);
	}
	.st-merged-section {
		border-top: 1px solid var(--border);
		margin-top: 10px;
		padding-top: 18px;
		scroll-margin-top: 12px;
	}
	/* Interface + embedded Personalization stack naturally (no full-height push) */
	.st-content :global(#tab-interface),
	.st-content :global(#tab-personalization) {
		height: auto;
	}
	.st-head {
		display: flex;
		align-items: center;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border);
	}
	.st-head-title {
		font-size: 16px;
		font-weight: 600;
	}
	.st-x {
		margin-left: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 30px;
		height: 30px;
		border-radius: 9px;
		color: var(--text-tertiary);
		transition:
			background 0.15s ease,
			color 0.15s ease,
			transform 0.1s ease;
	}
	.st-x:hover {
		background: var(--surface-hover);
		color: var(--text);
	}
	.st-x:active {
		transform: scale(0.92);
	}

	.st-body {
		display: flex;
		flex-direction: column;
		min-height: 0;
	}

	.st-signout:hover {
		color: #e0533d !important;
	}

	.st-rail {
		display: flex;
		flex-direction: row;
		gap: 6px;
		padding: 12px;
		overflow-x: auto;
	}
	.st-search {
		display: none;
	}
	.st-tab {
		display: flex;
		align-items: center;
		gap: 11px;
		min-width: fit-content;
		text-align: left;
		padding: 9px 11px;
		border-radius: 10px;
		background: transparent;
		color: var(--text-secondary);
		font-size: 13.5px;
		transition:
			background 0.16s ease,
			color 0.16s ease;
	}
	.st-tab:hover {
		background: var(--surface-hover);
		color: var(--text);
	}
	.st-tab.on {
		background: var(--bg-elevated);
		color: var(--text);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
		font-weight: 500;
	}
	.st-tab-icon {
		display: flex;
		flex: none;
		width: 17px;
		height: 17px;
		align-items: center;
		justify-content: center;
	}
	.st-tab-label {
		align-self: center;
		white-space: nowrap;
	}
	.st-sub {
		display: none;
	}
	.st-no-results {
		text-align: center;
		font-size: 13px;
		color: var(--text-tertiary);
		padding: 12px;
	}
	.st-content {
		flex: 1;
		padding: 18px 20px 22px;
		overflow-y: auto;
		max-height: min(42rem, calc(100dvh - 12rem));
	}

	@media (min-width: 768px) {
		.st-body {
			flex-direction: row;
		}
		.st-rail {
			flex-direction: column;
			gap: 2px;
			width: 232px;
			flex: none;
			padding: 14px 12px;
			background: var(--surface);
			border-right: 1px solid var(--border);
			overflow-x: visible;
			overflow-y: auto;
			min-height: min(42rem, calc(100dvh - 10rem));
			max-height: min(42rem, calc(100dvh - 10rem));
		}
		.st-search {
			display: flex;
			align-items: center;
			gap: 8px;
			padding: 8px 11px;
			margin-bottom: 8px;
			border-radius: 10px;
			background: var(--bg-elevated);
			border: 1px solid var(--border);
		}
		.st-tab {
			width: 100%;
		}
		.st-sub {
			display: flex;
			flex-direction: column;
			margin: 0 0 6px 39px;
			gap: 1px;
		}
		.st-sub-btn {
			text-align: left;
			font-size: 12px;
			line-height: 1.5;
			padding: 2px 0;
			color: var(--text-tertiary);
			transition: color 0.15s ease;
		}
		.st-sub-btn:hover {
			color: var(--text);
		}
		.st-rail-footer {
			margin-top: auto;
			padding-top: 6px;
		}
		.st-content {
			padding: 22px 26px;
			min-height: min(42rem, calc(100dvh - 10rem));
			max-height: min(42rem, calc(100dvh - 10rem));
		}
	}
	.st-search-input {
		width: 100%;
		font-size: 13px;
		background: transparent;
		outline: none;
		color: var(--text);
	}
</style>
