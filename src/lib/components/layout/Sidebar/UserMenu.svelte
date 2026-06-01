<script lang="ts">
	import { createEventDispatcher, getContext, tick } from 'svelte';

	import { goto } from '$app/navigation';

	import { userSignOut } from '$lib/apis/auths';

	import { showSettings, mobile, showSidebar, showShortcuts, user } from '$lib/stores';

	import { WEBUI_API_BASE_URL } from '$lib/constants';

	import Dropdown from '$lib/components/common/Dropdown.svelte';
	import ArchiveBox from '$lib/components/icons/ArchiveBox.svelte';
	import QuestionMarkCircle from '$lib/components/icons/QuestionMarkCircle.svelte';
	import Map from '$lib/components/icons/Map.svelte';
	import Keyboard from '$lib/components/icons/Keyboard.svelte';
	import ShortcutsModal from '$lib/components/chat/ShortcutsModal.svelte';
	import Settings from '$lib/components/icons/Settings.svelte';
	import UserGroup from '$lib/components/icons/UserGroup.svelte';
	import SignOut from '$lib/components/icons/SignOut.svelte';

	const i18n = getContext('i18n');

	export let show = false;
	export let role = '';

	export let profile = false;
	export let help = false;

	export let className = 'w-[240px]';
	export let align = 'end';

	const dispatch = createEventDispatcher();

	const handleDropdownChange = (state) => {
		dispatch('change', state);
	};
</script>

<ShortcutsModal bind:show={$showShortcuts} />

<!-- svelte-ignore a11y-no-static-element-interactions -->
<Dropdown bind:show onOpenChange={handleDropdownChange} {align}>
	<slot />

	<div slot="content">
		<div
			class="{className} rounded-2xl px-1 py-1 border border-gray-100 dark:border-gray-800 z-50 bg-white dark:bg-gray-850 dark:text-white shadow-lg text-sm"
		>
			{#if profile}
				<div class=" flex gap-3.5 w-full p-2.5 items-center">
					<div class=" items-center flex shrink-0">
						<img
							src={`${WEBUI_API_BASE_URL}/users/${$user?.id}/profile/image`}
							class=" size-10 object-cover rounded-full"
							alt="profile"
						/>
					</div>

					<div class=" flex flex-col w-full flex-1">
						<div class="font-medium line-clamp-1 pr-2">
							{$user.name}
						</div>

						<div class="text-xs text-gray-500 line-clamp-1">{$user.email}</div>
					</div>
				</div>

				<hr class=" border-gray-50/30 dark:border-gray-800/30 my-1.5 p-0" />
			{/if}

			<button
				class="flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer select-none"
				type="button"
				on:click={async () => {
					show = false;

					await showSettings.set(true);

					if ($mobile) {
						await tick();
						showSidebar.set(false);
					}
				}}
			>
				<div class=" self-center mr-3">
					<Settings className="w-5 h-5" strokeWidth="1.5" />
				</div>
				<div class=" self-center truncate">{$i18n.t('Settings')}</div>
			</button>

			{#if role === 'admin'}
				<a
					href="/admin"
					draggable="false"
					class="flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer select-none"
					on:click={async (e) => {
						if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
							return;
						}
						e.preventDefault();
						show = false;
						// Close the sidebar before navigating: the admin panel has its own
						// nav rail, and on desktop a lingering open sidebar leaves a backdrop
						// over the admin content that would otherwise eat the first click.
						showSidebar.set(false);
						goto('/admin');
					}}
				>
					<div class=" self-center mr-3">
						<UserGroup className="w-5 h-5" strokeWidth="1.5" />
					</div>
					<div class=" self-center truncate">{$i18n.t('Admin Panel')}</div>
				</a>
			{/if}

			<button
				class="flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer select-none"
				type="button"
				on:click={async () => {
					show = false;

					await showSettings.set('archived_chats');

					if ($mobile) {
						await tick();

						showSidebar.set(false);
					}
				}}
			>
				<div class=" self-center mr-3">
					<ArchiveBox className="size-5" strokeWidth="1.5" />
				</div>
				<div class=" self-center truncate">{$i18n.t('Archived Chats')}</div>
			</button>

			{#if help}
				<hr class=" border-gray-50/30 dark:border-gray-800/30 my-1 p-0" />

				<!-- {$i18n.t('Help')} -->

				{#if $user?.role === 'admin'}
					<a
						href="https://docs.openwebui.com"
						target="_blank"
						draggable="false"
						class="flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer select-none"
						id="chat-share-button"
						on:click={() => {
							show = false;
						}}
					>
						<div class=" self-center mr-3">
							<QuestionMarkCircle className="size-5" />
						</div>
						<div class=" self-center truncate">{$i18n.t('Documentation')}</div>
					</a>

					<!-- Releases -->
					<a
						href="https://github.com/open-webui/open-webui/releases"
						target="_blank"
						draggable="false"
						class="flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer select-none"
						id="chat-share-button"
						on:click={() => {
							show = false;
						}}
					>
						<div class=" self-center mr-3">
							<Map className="size-5" />
						</div>
						<div class=" self-center truncate">{$i18n.t('Releases')}</div>
					</a>
				{/if}

				<button
					class="flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer select-none"
					type="button"
					id="chat-share-button"
					on:click={async () => {
						show = false;
						showShortcuts.set(!$showShortcuts);

						if ($mobile) {
							await tick();
							showSidebar.set(false);
						}
					}}
				>
					<div class=" self-center mr-3">
						<Keyboard className="size-5" />
					</div>
					<div class=" self-center truncate">{$i18n.t('Keyboard shortcuts')}</div>
				</button>
			{/if}

			<hr class=" border-gray-50/30 dark:border-gray-800/30 my-1 p-0" />

			<button
				class="flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer select-none"
				type="button"
				on:click={async () => {
					const res = await userSignOut();
					user.set(null);
					localStorage.removeItem('token');

					location.href = res?.redirect_url ?? '/auth';
					show = false;
				}}
			>
				<div class=" self-center mr-3">
					<SignOut className="w-5 h-5" strokeWidth="1.5" />
				</div>
				<div class=" self-center truncate">{$i18n.t('Sign Out')}</div>
			</button>
		</div>
	</div>
</Dropdown>
