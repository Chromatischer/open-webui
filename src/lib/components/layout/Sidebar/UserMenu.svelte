<script lang="ts">
	import { createEventDispatcher, getContext, tick } from 'svelte';

	import { goto } from '$app/navigation';

	import { userSignOut } from '$lib/apis/auths';

	import { showSettings, mobile, showSidebar, showShortcuts, user } from '$lib/stores';

	import { WEBUI_API_BASE_URL } from '$lib/constants';

	import Dropdown from '$lib/components/common/Dropdown.svelte';
	import ArchiveBox from '$lib/components/icons/ArchiveBox.svelte';
	import QuestionMarkCircle from '$lib/components/icons/QuestionMarkCircle.svelte';
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

<Dropdown bind:show onOpenChange={handleDropdownChange} {align}>
	<slot />

	<div slot="content">
		<div class="um {className}">
			{#if profile}
				<div class="um-id">
					<img
						class="um-avatar"
						src={`${WEBUI_API_BASE_URL}/users/${$user?.id}/profile/image`}
						alt="profile"
					/>
					<div class="um-id-text">
						<div class="um-name">{$user?.name}</div>
						<div class="um-mail">{$user?.email}</div>
					</div>
					{#if role === 'admin'}
						<span class="um-tag">admin</span>
					{/if}
				</div>

				<div class="um-rule"></div>
			{/if}

			<button
				class="um-item"
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
				<Settings className="size-4" strokeWidth="1.6" />
				<span class="um-label">{$i18n.t('Settings')}</span>
			</button>

			{#if $user?.role === 'admin' || $user?.permissions?.workspace?.models || $user?.permissions?.workspace?.skills || $user?.permissions?.workspace?.tools}
				<a
					href="/workspace"
					draggable="false"
					class="um-item"
					on:click={async (e) => {
						if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) {
							return;
						}
						e.preventDefault();
						show = false;
						if ($mobile) {
							await tick();
							showSidebar.set(false);
						}
						goto('/workspace');
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.6"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z"
						/>
					</svg>
					<span class="um-label">{$i18n.t('Workspace')}</span>
				</a>
			{/if}

			{#if role === 'admin'}
				<a
					href="/admin"
					draggable="false"
					class="um-item"
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
					<UserGroup className="size-4" strokeWidth="1.6" />
					<span class="um-label">{$i18n.t('Admin Panel')}</span>
				</a>
			{/if}

			<button
				class="um-item"
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
				<ArchiveBox className="size-4" strokeWidth="1.6" />
				<span class="um-label">{$i18n.t('Archived Chats')}</span>
			</button>

<<<<<<< HEAD
=======
			<hr class=" border-gray-50/30 dark:border-gray-800/30 my-1 p-0" />

			{#if $user?.role === 'admin' || $user?.permissions?.workspace?.models || $user?.permissions?.workspace?.knowledge || $user?.permissions?.workspace?.prompts || $user?.permissions?.workspace?.tools || $user?.permissions?.workspace?.skills}
				<div class="flex items-center w-full">
					<a
						href="/workspace"
						draggable="false"
						class="flex flex-1 rounded-xl py-1.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer select-none"
						on:click={async (e) => {
							if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
							e.preventDefault();
							show = false;
							goto('/workspace');
							if ($mobile) {
								await tick();
								showSidebar.set(false);
							}
						}}
					>
						<div class="self-center mr-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="size-5"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 0 0 2.25-2.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v2.25A2.25 2.25 0 0 0 6 10.5Zm0 9.75h2.25A2.25 2.25 0 0 0 10.5 18v-2.25a2.25 2.25 0 0 0-2.25-2.25H6a2.25 2.25 0 0 0-2.25 2.25V18A2.25 2.25 0 0 0 6 20.25Zm9.75-9.75H18a2.25 2.25 0 0 0 2.25-2.25V6A2.25 2.25 0 0 0 18 3.75h-2.25A2.25 2.25 0 0 0 13.5 6v2.25a2.25 2.25 0 0 0 2.25 2.25Z"
								/>
							</svg>
						</div>
						<div class="self-center truncate">{$i18n.t('Workspace')}</div>
					</a>
					{#if shiftKey}
						<Tooltip
							content={isPinned('workspace')
								? $i18n.t('Unpin from Sidebar')
								: $i18n.t('Pin to Sidebar')}
						>
							<button
								type="button"
								class="p-1 mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
								on:click|preventDefault|stopPropagation={() => togglePin('workspace')}
							>
								{#if isPinned('workspace')}
									<PinSlash className="size-3.5" strokeWidth="1.5" />
								{:else}
									<Pin className="size-3.5" strokeWidth="1.5" />
								{/if}
							</button>
						</Tooltip>
					{/if}
				</div>
			{/if}

			{#if ($config?.features?.enable_notes ?? false) && ($user?.role === 'admin' || ($user?.permissions?.features?.notes ?? true))}
				<div class="flex items-center w-full">
					<a
						href="/notes"
						draggable="false"
						class="flex flex-1 rounded-xl py-1.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer select-none"
						on:click={async (e) => {
							if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
							e.preventDefault();
							show = false;
							goto('/notes');
							if ($mobile) {
								await tick();
								showSidebar.set(false);
							}
						}}
					>
						<div class="self-center mr-3">
							<Note className="size-5" strokeWidth="1.5" />
						</div>
						<div class="self-center truncate">{$i18n.t('Notes')}</div>
					</a>
					{#if shiftKey}
						<Tooltip
							content={isPinned('notes')
								? $i18n.t('Unpin from Sidebar')
								: $i18n.t('Pin to Sidebar')}
						>
							<button
								type="button"
								class="p-1 mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
								on:click|preventDefault|stopPropagation={() => togglePin('notes')}
							>
								{#if isPinned('notes')}
									<PinSlash className="size-3.5" strokeWidth="1.5" />
								{:else}
									<Pin className="size-3.5" strokeWidth="1.5" />
								{/if}
							</button>
						</Tooltip>
					{/if}
				</div>
			{/if}

			{#if $config?.features?.enable_calendar && ($user?.role === 'admin' || $user?.permissions?.features?.calendar)}
				<div class="flex items-center w-full">
					<a
						href="/calendar"
						draggable="false"
						class="flex flex-1 rounded-xl py-1.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer select-none"
						on:click={async (e) => {
							if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
							e.preventDefault();
							show = false;
							goto('/calendar');
						}}
					>
						<div class="self-center mr-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="size-5"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
								/>
							</svg>
						</div>
						<div class="self-center truncate">{$i18n.t('Calendar')}</div>
					</a>
					{#if shiftKey}
						<Tooltip
							content={isPinned('calendar')
								? $i18n.t('Unpin from Sidebar')
								: $i18n.t('Pin to Sidebar')}
						>
							<button
								type="button"
								class="p-1 mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
								on:click|preventDefault|stopPropagation={() => togglePin('calendar')}
							>
								{#if isPinned('calendar')}
									<PinSlash className="size-3.5" strokeWidth="1.5" />
								{:else}
									<Pin className="size-3.5" strokeWidth="1.5" />
								{/if}
							</button>
						</Tooltip>
					{/if}
				</div>
			{/if}

			{#if $config?.features?.enable_automations && ($user?.role === 'admin' || $user?.permissions?.features?.automations)}
				<div class="flex items-center w-full">
					<a
						href="/automations"
						draggable="false"
						class="flex flex-1 rounded-xl py-1.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer select-none"
						on:click={async (e) => {
							if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
							e.preventDefault();
							show = false;
							goto('/automations');
							if ($mobile) {
								await tick();
								showSidebar.set(false);
							}
						}}
					>
						<div class="self-center mr-3">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="size-5"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
								/>
							</svg>
						</div>
						<div class="self-center truncate">{$i18n.t('Automations')}</div>
					</a>
					{#if shiftKey}
						<Tooltip
							content={isPinned('automations')
								? $i18n.t('Unpin from Sidebar')
								: $i18n.t('Pin to Sidebar')}
						>
							<button
								type="button"
								class="p-1 mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
								on:click|preventDefault|stopPropagation={() => togglePin('automations')}
							>
								{#if isPinned('automations')}
									<PinSlash className="size-3.5" strokeWidth="1.5" />
								{:else}
									<Pin className="size-3.5" strokeWidth="1.5" />
								{/if}
							</button>
						</Tooltip>
					{/if}
				</div>
			{/if}

			{#if role === 'admin'}
				<div class="flex items-center w-full">
					<a
						href="/playground"
						draggable="false"
						class="flex flex-1 rounded-xl py-1.5 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer select-none"
						on:click={async (e) => {
							if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
							e.preventDefault();
							show = false;
							goto('/playground');
							if ($mobile) {
								await tick();
								showSidebar.set(false);
							}
						}}
					>
						<div class="self-center mr-3">
							<Code className="size-5" strokeWidth="1.5" />
						</div>
						<div class="self-center truncate">{$i18n.t('Playground')}</div>
					</a>
					{#if shiftKey}
						<Tooltip
							content={isPinned('playground')
								? $i18n.t('Unpin from Sidebar')
								: $i18n.t('Pin to Sidebar')}
						>
							<button
								type="button"
								class="p-1 mr-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
								on:click|preventDefault|stopPropagation={() => togglePin('playground')}
							>
								{#if isPinned('playground')}
									<PinSlash className="size-3.5" strokeWidth="1.5" />
								{:else}
									<Pin className="size-3.5" strokeWidth="1.5" />
								{/if}
							</button>
						</Tooltip>
					{/if}
				</div>
			{/if}

>>>>>>> upstream/main
			{#if help}
				<div class="um-rule"></div>

				{#if $user?.role === 'admin'}
					<a
						href="https://docs.openwebui.com"
						target="_blank"
						draggable="false"
						class="um-item"
						on:click={() => {
							show = false;
						}}
					>
						<QuestionMarkCircle className="size-4" />
						<span class="um-label">{$i18n.t('Documentation')}</span>
					</a>
				{/if}

				<button
					class="um-item"
					type="button"
					on:click={async () => {
						show = false;
						showShortcuts.set(!$showShortcuts);
						if ($mobile) {
							await tick();
							showSidebar.set(false);
						}
					}}
				>
<<<<<<< HEAD
					<Keyboard className="size-4" />
					<span class="um-label">{$i18n.t('Keyboard shortcuts')}</span>
=======
					<div class=" self-center mr-3">
						<Keyboard className="size-5" />
					</div>
					<div class=" self-center truncate">{$i18n.t('Keyboard Shortcuts')}</div>
>>>>>>> upstream/main
				</button>
			{/if}

			<div class="um-rule"></div>

			<button
				class="um-item um-signout"
				type="button"
				on:click={async () => {
					const res = await userSignOut();
					user.set(null);
					localStorage.removeItem('token');

					location.href = res?.redirect_url ?? '/auth';
					show = false;
				}}
			>
				<SignOut className="size-4" strokeWidth="1.6" />
				<span class="um-label">{$i18n.t('Sign Out')}</span>
			</button>
		</div>
	</div>
</Dropdown>

<style>
	/* ── The user's leaf: a quiet paper menu in the FOLIO hand ── */
	.um {
		padding: 6px;
		border-radius: 14px;
		background: var(--bg-elevated);
		border: 1px solid var(--rule-faint);
		box-shadow:
			0 16px 44px -16px var(--shadow-color),
			0 2px 10px -6px var(--shadow-color);
		color: var(--ink);
		font-family: var(--body);
	}

	.um-id {
		display: flex;
		align-items: center;
		gap: 11px;
		padding: 8px 8px 10px;
	}
	.um-avatar {
		width: 34px;
		height: 34px;
		flex: none;
		border-radius: 50%;
		object-fit: cover;
		border: 1px solid var(--rule-faint);
	}
	.um-id-text {
		min-width: 0;
		flex: 1;
	}
	.um-name {
		font-family: var(--serif);
		font-size: 16px;
		line-height: 1.15;
		color: var(--ink);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.um-mail {
		margin-top: 2px;
		font-family: var(--mono);
		font-size: 12px;
		color: var(--ink-3);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.um-tag {
		flex: none;
		align-self: flex-start;
		font-family: var(--mono);
		font-size: 12px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--ultramarine);
		background: var(--ultramarine-soft);
		border-radius: 4px;
		padding: 2px 5px;
	}

	.um-rule {
		height: 1px;
		background: var(--rule-faint);
		margin: 5px 6px;
	}

	.um-item {
		display: flex;
		align-items: center;
		gap: 11px;
		width: 100%;
		padding: 8px 10px;
		border: none;
		background: transparent;
		border-radius: 9px;
		color: var(--ink-2);
		font-family: var(--body);
		font-size: 13.5px;
		text-align: left;
		text-decoration: none;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s,
			transform 0.2s var(--out);
	}
	.um-item:hover {
		background: var(--vermilion-soft);
		color: var(--ink);
		transform: translateX(2px);
	}
	.um-item :global(svg) {
		flex: none;
		color: var(--ink-3);
		transition: color 0.15s;
	}
	.um-item:hover :global(svg) {
		color: var(--vermilion);
	}
	.um-label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.um-signout:hover {
		color: var(--vermilion);
	}
</style>
