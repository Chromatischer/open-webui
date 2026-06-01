<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { goto } from '$app/navigation';

	import { WEBUI_NAME, config, mobile, showSidebar, user } from '$lib/stores';
	import { page } from '$app/stores';
	import Tooltip from '$lib/components/common/Tooltip.svelte';

	import Sidebar from '$lib/components/icons/Sidebar.svelte';

	const i18n = getContext('i18n');

	let loaded = false;

	$: pathname = $page.url.pathname;

	// Single navigation rail — every admin destination lives here, grouped.
	// `exact` forces an exact pathname match (needed for `/admin`, which prefixes
	// every other admin route); otherwise a prefix match drives the active state.
	$: navGroups = [
		{
			label: $i18n.t('Manage'),
			items: [
				{ title: $i18n.t('Users'), href: '/admin', exact: true },
				...(($config?.features?.enable_admin_analytics ?? true)
					? [{ title: $i18n.t('Analytics'), href: '/admin/analytics' }]
					: []),
				{ title: $i18n.t('Evaluations'), href: '/admin/evaluations' },
				{ title: $i18n.t('Functions'), href: '/admin/functions' }
			]
		},
		{
			label: $i18n.t('Core'),
			items: [
				{ title: $i18n.t('General'), href: '/admin/settings/general' },
				{ title: $i18n.t('Connections'), href: '/admin/settings/connections' },
				{ title: $i18n.t('Models'), href: '/admin/settings/models' },
				{ title: $i18n.t('Integrations'), href: '/admin/settings/integrations' }
			]
		},
		{
			label: $i18n.t('Capabilities'),
			items: [
				{ title: $i18n.t('Documents'), href: '/admin/settings/documents' },
				{ title: $i18n.t('Web Search'), href: '/admin/settings/web' },
				{ title: $i18n.t('Images'), href: '/admin/settings/images' },
				{ title: $i18n.t('Code Execution'), href: '/admin/settings/more' }
			]
		},
		{
			label: $i18n.t('Operations'),
			items: [
				{ title: $i18n.t('Arena'), href: '/admin/settings/evaluations' },
				{ title: $i18n.t('Pipelines'), href: '/admin/settings/pipelines' },
				{ title: $i18n.t('Design'), href: '/admin/settings/interface' },
				{ title: $i18n.t('Database'), href: '/admin/settings/db' }
			]
		}
	];

	const isActive = (item: { href: string; exact?: boolean }, p: string) =>
		item.exact ? p === item.href : p === item.href || p.startsWith(item.href + '/');

	onMount(async () => {
		if ($user?.role !== 'admin') {
			await goto('/');
		}
		loaded = true;
	});
</script>

<svelte:head>
	<title>
		{$i18n.t('Admin Panel')} • {$WEBUI_NAME}
	</title>
</svelte:head>

{#if loaded}
	<div
		class="admin-layout flex flex-col md:flex-row h-screen max-h-[100dvh] flex-1 w-full max-w-full"
	>
		<!-- ===== Single navigation rail ===== -->
		<aside
			class="admin-rail flex md:flex-col flex-none gap-1 md:gap-0.5 md:w-60 px-2.5 md:px-3 py-2 md:py-4 overflow-x-auto md:overflow-y-auto scrollbar-none select-none"
		>
			<div class="flex items-center gap-2 md:px-1.5 md:mb-3 flex-none">
				{#if $mobile}
					<Tooltip
						content={$showSidebar ? $i18n.t('Close Sidebar') : $i18n.t('Open Sidebar')}
						interactive={true}
					>
						<button
							id="sidebar-toggle-button"
							class="nav-toggle-btn cursor-pointer flex transition p-1.5"
							on:click={() => showSidebar.set(!$showSidebar)}
						>
							<Sidebar />
						</button>
					</Tooltip>
				{/if}
				<span class="admin-brand hidden md:block">{$i18n.t('Admin')}</span>
			</div>

			{#each navGroups as group}
				<div class="rail-group flex md:contents">
					<div class="rail-group-label hidden md:block">{group.label}</div>
					{#each group.items as item}
						<a
							draggable="false"
							href={item.href}
							class="rail-item {isActive(item, pathname) ? 'active' : ''}"
						>
							{item.title}
						</a>
					{/each}
				</div>
			{/each}
		</aside>

		<!-- ===== Content ===== -->
		<div class="admin-content flex-1 max-h-full overflow-y-auto pb-1 md:pt-3">
			<slot />
		</div>
	</div>
{/if}

<style>
	.admin-layout {
		background: var(--bg-base);
	}

	.admin-rail {
		background: var(--bg-sidebar);
	}
	@media (min-width: 768px) {
		.admin-rail {
			border-right: 1px solid var(--border);
		}
	}

	.admin-brand {
		font-family: var(--font-sans);
		font-size: 18px;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--text);
	}

	.rail-group-label {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.7px;
		color: var(--text-tertiary);
		padding: 4px 12px;
		margin-top: 12px;
	}

	.rail-item {
		display: flex;
		align-items: center;
		min-width: fit-content;
		padding: 7px 12px;
		border-radius: 10px;
		font-size: 13.5px;
		font-weight: 500;
		color: var(--text-secondary);
		transition:
			background 0.15s,
			color 0.15s;
	}
	.rail-item:hover {
		background: var(--surface-hover);
		color: var(--text);
	}
	.rail-item.active {
		background: var(--accent-glow);
		color: var(--accent);
		font-weight: 600;
	}
</style>
