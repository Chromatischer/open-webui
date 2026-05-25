<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { WEBUI_NAME, showSidebar, user, mobile, config } from '$lib/stores';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import Sidebar from '$lib/components/icons/Sidebar.svelte';

	const i18n = getContext('i18n');

	let loaded = false;

	onMount(async () => {
		if ($user?.role !== 'admin') {
			if ($page.url.pathname.includes('/models') && !$user?.permissions?.workspace?.models) {
				goto('/');
			} else if (
				$page.url.pathname.includes('/knowledge') ||
				$page.url.pathname.includes('/prompts')
			) {
				goto('/');
			} else if ($page.url.pathname.includes('/tools') && !$user?.permissions?.workspace?.tools) {
				goto('/');
			} else if ($page.url.pathname.includes('/skills') && !$user?.permissions?.workspace?.skills) {
				goto('/');
			}
		}

		loaded = true;
	});
</script>

<svelte:head>
	<title>
		{$i18n.t('Workspace')} • {$WEBUI_NAME}
	</title>
</svelte:head>

{#if loaded}
	<div
		class=" relative flex flex-col w-full h-screen max-h-[100dvh] transition-width duration-200 ease-in-out {$showSidebar
			? 'md:max-w-[calc(100%-var(--sidebar-width))]'
			: ''} max-w-full"
		style="background: var(--bg-base)"
	>
		<nav class="   px-2.5 pt-1.5 backdrop-blur-xl drag-region select-none">
			<div class=" flex items-center gap-1">
				{#if $mobile}
					<div class="{$showSidebar ? 'md:hidden' : ''} self-center flex flex-none items-center">
						<Tooltip
							content={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
							interactive={true}
						>
							<button
								id="sidebar-toggle-button"
								class="sidebar-toggle-btn cursor-pointer flex transition"
								aria-label={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
								on:click={() => {
									showSidebar.set(!$showSidebar);
								}}
							>
								<div class=" self-center p-1.5">
									<Sidebar />
								</div>
							</button>
						</Tooltip>
					</div>
				{/if}

				<div class="">
					<div
						class="tab-bar scrollbar-none overflow-x-auto w-fit text-center text-sm font-medium bg-transparent touch-auto pointer-events-auto"
					>
						{#if $user?.role === 'admin' || $user?.permissions?.workspace?.models}
							<a
								draggable="false"
								aria-current={$page.url.pathname.includes('/workspace/models') ? 'page' : null}
								class="tab-btn select-none {$page.url.pathname.includes('/workspace/models')
									? 'active'
									: ''}"
								href="/workspace/models">{$i18n.t('Models')}</a
							>
						{/if}

						{#if $user?.role === 'admin' || $user?.permissions?.workspace?.skills}
							<a
								draggable="false"
								aria-current={$page.url.pathname.includes('/workspace/skills') ? 'page' : null}
								class="tab-btn select-none {$page.url.pathname.includes('/workspace/skills')
									? 'active'
									: ''}"
								href="/workspace/skills"
							>
								{$i18n.t('Skills')}
							</a>
						{/if}

						{#if $user?.role === 'admin' || $user?.permissions?.workspace?.tools}
							<a
								draggable="false"
								aria-current={$page.url.pathname.includes('/workspace/tools') ? 'page' : null}
								class="tab-btn select-none {$page.url.pathname.includes('/workspace/tools')
									? 'active'
									: ''}"
								href="/workspace/tools"
							>
								{$i18n.t('Tools')}
							</a>
						{/if}

						{#if $config?.features.enable_community_sharing}
							{#if $page.url.pathname.includes('/workspace/models')}
								<a
									draggable="false"
									class="community-link select-none"
									href="https://openwebui.com/models"
									target="_blank"
									rel="noreferrer"
								>
									{$i18n.t('Community models')}
								</a>
							{:else if $page.url.pathname.includes('/workspace/tools')}
								<a
									draggable="false"
									class="community-link select-none"
									href="https://openwebui.com/tools"
									target="_blank"
									rel="noreferrer"
								>
									{$i18n.t('Community tools')}
								</a>
							{:else if $page.url.pathname.includes('/workspace/prompts')}
								<a
									draggable="false"
									class="community-link select-none"
									href="https://openwebui.com/prompts"
									target="_blank"
									rel="noreferrer"
								>
									{$i18n.t('Community prompts')}
								</a>
						{/if}
					</div>
				</div>

				<!-- <div class="flex items-center text-xl font-medium">{$i18n.t('Workspace')}</div> -->
			</div>
		</nav>

		<div
			class="  pb-1 px-3 md:px-[18px] flex-1 max-h-full overflow-y-auto"
			id="workspace-container"
		>
			<slot />
		</div>
	</div>
{/if}

<style>
	.tab-bar {
		display: flex;
		gap: 2px;
		padding: 0 4px;
		border-bottom: 1px solid var(--border);
	}
	.tab-btn {
		padding: 8px 14px;
		border: none;
		background: transparent;
		color: var(--text-tertiary);
		font-size: 13px;
		font-weight: 600;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		cursor: pointer;
		transition: color 0.15s, border-color 0.15s;
	}
	.tab-btn:hover {
		color: var(--text-secondary);
	}
	.tab-btn.active {
		color: var(--accent);
		border-bottom-color: var(--accent);
	}

	.sidebar-toggle-btn {
		border-radius: 10px;
	}
	.sidebar-toggle-btn:hover {
		background: var(--surface-hover);
	}

	.community-link {
		min-width: fit-content;
		padding: 4px 8px;
		align-self: center;
		border-radius: 9999px;
		font-size: 12px;
		color: var(--text-tertiary);
		transition: color 0.15s, background 0.15s;
	}
	.community-link:hover {
		color: var(--text-secondary);
		background: var(--surface-hover);
	}
</style>
