<script lang="ts">
	import { getContext } from 'svelte';
	import {
		WEBUI_NAME,
		banners,
		chatId,
		chatTitle,
		chats,
		currentChatPage,
		config,
		mobile,
		showSidebar,
		showScratchboard,
		temporaryChatEnabled
	} from '$lib/stores';

	import { slide } from 'svelte/transition';
	import { getChatList, updateChatById } from '$lib/apis/chats';

	import ShareChatModal from '../chat/ShareChatModal.svelte';
	import Tooltip from '../common/Tooltip.svelte';

	import Banner from '../common/Banner.svelte';
	import Sidebar from '../icons/Sidebar.svelte';
	import Note from '../icons/Note.svelte';

	const i18n = getContext('i18n');

	export let initNewChat: Function;
	export let readOnly: boolean = false;
	export let shareEnabled: boolean = false;
	export let scrollTop = 0;
	export let scrollToTop: (() => void) | null = null;

	export let chat;
	export let history;
	export let title = '';
	export let selectedModels;
	export let showModelSelector = true;
	export let scratchboardEnabled = false;

	export let onSaveTempChat: () => {};
	export let archiveChatHandler: (id: string) => void;
	export let deleteChatHandler: (id: string) => void;
	export let moveChatHandler: (id: string, folderId: string) => void;

	let closedBannerIds = [];

	const getDismissedBannerIds = (): string[] => {
		try {
			return JSON.parse(localStorage.getItem('dismissedBannerIds') ?? '[]');
		} catch {
			return [];
		}
	};

	let showShareChatModal = false;
	let showDownloadChatModal = false;

	// FOLIO letterhead — derive a stable folio mark (№) from the chat id, and let
	// the manuscript title be edited inline (commit on blur).
	const folioMark = (id: string | undefined): string => {
		if (!id) return '—';
		let h = 0;
		for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
		return String((Math.abs(h) % 999) + 1).padStart(2, '0');
	};

	const commitTitle = async (e: FocusEvent | KeyboardEvent) => {
		const el = e.currentTarget as HTMLElement;
		const next = (el.textContent ?? '').trim();
		if (!next) {
			el.textContent = title; // reject empties
			return;
		}
		if (next === title || !$chatId) return;
		title = next;
		chatTitle.set(next);
		if (!$temporaryChatEnabled) {
			await updateChatById(localStorage.token, $chatId, { title: next });
			currentChatPage.set(1);
			chats.set(await getChatList(localStorage.token, $currentChatPage));
		}
	};
</script>

<ShareChatModal bind:show={showShareChatModal} chatId={$chatId} />

<button
	id="new-chat-button"
	class="hidden"
	on:click={() => {
		initNewChat();
	}}
	aria-label="New Chat"
/>

<nav
	class="sticky top-0 z-30 w-full {chat?.id
		? 'pt-0.5 pb-1'
		: 'pt-1 pb-1'} flex flex-col items-center drag-region navbar"
>
	<div class="flex items-center w-full pl-1.5 pr-1">
		<div
			id="navbar-bg-gradient-to-b"
			class="{chat?.id
				? 'visible'
				: 'invisible'} pointer-events-none absolute inset-0 z-[-1] navbar-gradient"
		></div>

		<div class=" flex max-w-full w-full mx-auto px-1.5 md:px-2 pt-0.5 bg-transparent">
			<div class="flex items-center w-full max-w-full">
				{#if $mobile && !$showSidebar}
					<div class="-translate-x-0.5 mr-1 mt-1 self-start flex flex-none items-center">
						<Tooltip content={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}>
							<button
								class="flex rounded-xl size-8.5 justify-center items-center btn-ghost no-drag-region"
								on:click={() => {
									showSidebar.set(!$showSidebar);
								}}
							>
								<div class="self-center p-1.5">
									<Sidebar />
								</div>
							</button>
						</Tooltip>
					</div>
				{/if}

				<div
					class="flex-1 overflow-hidden max-w-full mt-0.5 py-0.5
			{$showSidebar ? 'ml-1' : ''}
			"
<<<<<<< HEAD
				></div>
=======
				>
					{#if showModelSelector}
						<ModelSelector
							bind:selectedModels
							showSetDefault={!shareEnabled && !readOnly}
							disabled={readOnly}
						/>
					{/if}
				</div>
>>>>>>> upstream/main

				<div class="self-start flex flex-none items-center navbar-actions">
					{#if scratchboardEnabled && $mobile && !$showScratchboard}
						<div class="translate-x-0.5 ml-1 mt-1 flex flex-none items-center">
							<Tooltip content={$i18n.t('Open Scratchboard')}>
								<button
									class="flex rounded-xl size-8.5 justify-center items-center btn-ghost no-drag-region"
									on:click={() => {
										showScratchboard.set(true);
									}}
									aria-label={$i18n.t('Open Scratchboard')}
								>
									<div class="self-center p-1.5">
										<Note className="size-5" />
									</div>
								</button>
							</Tooltip>
<<<<<<< HEAD
						</div>
=======
						{:else if $temporaryChatEnabled}
							<Tooltip content={$i18n.t(`Save Chat`)}>
								<button
									class="flex cursor-pointer px-2 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition"
									id="save-temporary-chat-button"
									on:click={async () => {
										onSaveTempChat();
									}}
								>
									<div class=" m-auto self-center">
										<ChatCheck className=" size-4.5" strokeWidth="1.5" />
									</div>
								</button>
							</Tooltip>
						{/if}
					{/if}

					{#if $mobile && !$temporaryChatEnabled && chat && chat.id}
						<Tooltip content={$i18n.t('New Chat')}>
							<button
								class=" flex {$showSidebar
									? 'md:hidden'
									: ''} cursor-pointer px-2 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-850 transition"
								on:click={() => {
									initNewChat();
								}}
								aria-label="New Chat"
							>
								<div class=" m-auto self-center">
									<ChatPlus className=" size-4.5" strokeWidth="1.5" />
								</div>
							</button>
						</Tooltip>
					{/if}

					{#if shareEnabled && chat && (chat.id || $temporaryChatEnabled)}
						<Menu
							{chat}
							{shareEnabled}
							{readOnly}
							{scrollToTop}
							shareHandler={() => {
								showShareChatModal = !showShareChatModal;
							}}
							archiveChatHandler={() => {
								archiveChatHandler(chat.id);
							}}
							deleteChatHandler={() => {
								deleteChatHandler(chat.id);
							}}
							{moveChatHandler}
						>
							<button
								class="flex cursor-pointer px-2 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition"
								id="chat-context-menu-button"
							>
								<div class=" m-auto self-center">
									<EllipsisHorizontal className=" size-5" strokeWidth="1.5" />
								</div>
							</button>
						</Menu>
					{/if}

					{#if $user?.role === 'admin' || ($user?.permissions.chat?.controls ?? true)}
						<Tooltip content={$i18n.t('Controls')}>
							<button
								class=" flex cursor-pointer px-2 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-850 transition"
								on:click={async () => {
									await showControls.set(!$showControls);
								}}
								aria-label="Controls"
							>
								<div class=" m-auto self-center">
									<Knobs className=" size-5" strokeWidth="1" />
								</div>
							</button>
						</Tooltip>
					{/if}

					{#if $user !== undefined && $user !== null}
						<UserMenu
							className="w-[240px]"
							role={$user?.role}
							help={true}
							on:show={(e) => {
								if (e.detail === 'archived-chat') {
									showArchivedChats.set(true);
								}
							}}
						>
							<button
								type="button"
								class="select-none flex rounded-xl p-1.5 w-full hover:bg-gray-50 dark:hover:bg-gray-850 transition"
								aria-label={$i18n.t('User menu')}
							>
								<div class=" self-center">
									<img
										src={`${WEBUI_API_BASE_URL}/users/${$user?.id}/profile/image`}
										class="size-6 object-cover rounded-full"
										alt=""
										draggable="false"
									/>
								</div>
							</button>
						</UserMenu>
>>>>>>> upstream/main
					{/if}
				</div>
			</div>
		</div>
	</div>

	<div class="absolute top-[100%] left-0 right-0 h-fit">
		{#if !history.currentId && !$chatId && ($banners.length > 0 || ($config?.license_metadata?.type ?? null) === 'trial' || (($config?.license_metadata?.seats ?? null) !== null && $config?.user_count > $config?.license_metadata?.seats))}
			<div class=" w-full z-30">
				<div
					class=" flex flex-col gap-1 w-full max-h-28 overflow-y-auto overscroll-contain md:max-h-none md:overflow-visible"
				>
					{#if ($config?.license_metadata?.type ?? null) === 'trial'}
						<Banner
							banner={{
								type: 'info',
								title: 'Trial License',
								content: $i18n.t(
									'You are currently using a trial license. Please contact support to upgrade your license.'
								)
							}}
						/>
					{/if}

					{#if ($config?.license_metadata?.seats ?? null) !== null && $config?.user_count > $config?.license_metadata?.seats}
						<Banner
							banner={{
								type: 'error',
								title: 'License Error',
								content: $i18n.t(
									'Exceeded the number of seats in your license. Please contact support to increase the number of seats.'
								)
							}}
						/>
					{/if}

					{#each $banners.filter((b) => ![...getDismissedBannerIds(), ...closedBannerIds].includes(b.id)) as banner (banner.id)}
						<Banner
							{banner}
							on:dismiss={(e) => {
								const bannerId = e.detail;

								if (banner.dismissible) {
									localStorage.setItem(
										'dismissedBannerIds',
										JSON.stringify(
											[bannerId, ...getDismissedBannerIds()].filter((id) =>
												$banners.find((b) => b.id === id)
											)
										)
									);
								} else {
									closedBannerIds = [...closedBannerIds, bannerId];
								}
							}}
						/>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</nav>

<style>
	.navbar {
		background: var(--bg-base);
	}

	/* ── FOLIO letterhead ── */
	.letterhead {
		display: flex;
		align-items: baseline;
		gap: 10px;
		max-width: min(640px, 100%);
		padding: 2px 4px;
	}
	.lh-no {
		flex: none;
		font-family: var(--mono);
		font-size: 10.5px;
		letter-spacing: 0.04em;
		color: var(--text-tertiary);
		transform: translateY(-1px);
	}
	.lh-aster {
		flex: none;
		font-family: var(--serif);
		font-size: 13px;
		line-height: 1;
		color: var(--vermilion);
		opacity: 0.75;
		transform: translateY(-1px);
	}
	.lh-title {
		min-width: 0;
		max-width: 100%;
		font-family: var(--serif);
		font-size: 18px;
		line-height: 1.2;
		letter-spacing: 0.005em;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		outline: none;
		border-bottom: 1px solid transparent;
		transition:
			border-color 0.2s,
			color 0.2s;
		cursor: text;
	}
	.lh-title:hover {
		border-bottom-color: var(--rule);
	}
	.lh-title:focus {
		color: var(--vermilion);
		border-bottom-color: var(--vermilion);
		text-overflow: clip;
		overflow: visible;
		white-space: normal;
	}

	.navbar-actions {
		color: var(--text-tertiary);
	}

	.navbar-gradient {
		background: var(--bg-base);
	}

	.btn-ghost {
		display: grid;
		place-items: center;
		width: 28px;
		height: 28px;
		border-radius: 7px;
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
</style>
