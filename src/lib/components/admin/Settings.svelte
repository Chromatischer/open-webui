<script>
	import { getContext, tick } from 'svelte';
	import { page } from '$app/stores';
	import { toast } from 'svelte-sonner';

	import { config } from '$lib/stores';
	import { getBackendConfig } from '$lib/apis';
	import Database from './Settings/Database.svelte';

	import General from './Settings/General.svelte';
	import Pipelines from './Settings/Pipelines.svelte';
	import Images from './Settings/Images.svelte';
	import Interface from './Settings/Interface.svelte';
	// Admin Models reuses the user-facing Workspace Models manager (card grid)
	// instead of a bespoke admin list.
	import Models from '$lib/components/workspace/Models.svelte';
	import Connections from './Settings/Connections.svelte';
	import Documents from './Settings/Documents.svelte';
	import WebSearch from './Settings/WebSearch.svelte';

	import Evaluations from './Settings/Evaluations.svelte';
	import CodeExecution from './Settings/CodeExecution.svelte';
	import Integrations from './Settings/Integrations.svelte';

	const i18n = getContext('i18n');

	let selectedTab = 'general';
	const settingsTabIds = [
		'general',
		'connections',
		'models',
		'evaluations',
		'integrations',
		'documents',
		'web',
		'more',
		'interface',
		'images',
		'pipelines',
		'db'
	];

	// Get current tab from URL pathname, default to 'general'
	$: {
		const pathParts = $page.url.pathname.split('/');
		const tabFromPath = pathParts[pathParts.length - 1];
		selectedTab =
			tabFromPath === 'code-execution'
				? 'more'
				: settingsTabIds.includes(tabFromPath)
					? tabFromPath
					: 'general';
	}

	// Serif page header injected centrally so every settings page gets a
	// consistent title + description without per-page markup. The card/section
	// styling below the header is applied by the `.admin-settings` theme layer
	// in app.css (it skins the existing form markup in place).
	$: pageMeta = {
		general: {
			title: $i18n.t('General'),
			description: $i18n.t('Instance defaults, authentication, and feature toggles.')
		},
		connections: {
			title: $i18n.t('Connections'),
			description: $i18n.t('OpenAI, Ollama, and direct model provider connections.')
		},
		models: {
			title: $i18n.t('Models'),
			description: $i18n.t('Manage, import, and configure the models available to users.')
		},
		evaluations: {
			title: $i18n.t('Arena'),
			description: $i18n.t('Model arena, feedback collection, and leaderboard settings.')
		},
		integrations: {
			title: $i18n.t('Integrations'),
			description: $i18n.t('Tools, OpenAPI servers, and external plugins.')
		},
		documents: {
			title: $i18n.t('Documents'),
			description: $i18n.t('Retrieval, embeddings, and document processing for knowledge.')
		},
		web: {
			title: $i18n.t('Web Search'),
			description: $i18n.t('Search engines and web content loaders for live results.')
		},
		more: {
			title: $i18n.t('Code Execution'),
			description: $i18n.t('Python sandbox and code interpreter configuration.')
		},
		interface: {
			title: $i18n.t('Design'),
			description: $i18n.t('Interface appearance, banners, and task generation prompts.')
		},
		images: {
			title: $i18n.t('Images'),
			description: $i18n.t('Image generation and editing providers.')
		},
		db: {
			title: $i18n.t('Database'),
			description: $i18n.t('Backup, export, and import instance data.')
		},
		pipelines: {
			title: $i18n.t('Pipelines'),
			description: $i18n.t('Filters, valves, and middleware workflows.')
		}
	}[selectedTab];
</script>

<div class="admin-settings flex flex-col w-full h-full pb-2" class:wide={selectedTab === 'models'}>
	{#if pageMeta}
		<div class="admin-settings-head px-[16px] lg:px-1 pt-1">
			<h1>{pageMeta.title}</h1>
			{#if pageMeta.description}
				<p>{pageMeta.description}</p>
			{/if}
		</div>
	{/if}

	<div
		class="admin-settings-body flex-1 mt-3 lg:mt-2 px-[16px] lg:pr-[16px] lg:pl-1 overflow-y-scroll scrollbar-hidden"
		class:raw={selectedTab === 'models'}
	>
		{#if selectedTab === 'general'}
			<General
				saveHandler={async () => {
					toast.success($i18n.t('Settings saved successfully!'));

					await tick();
					await config.set(await getBackendConfig());
				}}
			/>
		{:else if selectedTab === 'connections'}
			<Connections
				on:save={() => {
					toast.success($i18n.t('Settings saved successfully!'));
				}}
			/>
		{:else if selectedTab === 'models'}
			<Models embedded={true} />
		{:else if selectedTab === 'evaluations'}
			<Evaluations />
		{:else if selectedTab === 'integrations'}
			<Integrations />
		{:else if selectedTab === 'documents'}
			<Documents
				on:save={async () => {
					toast.success($i18n.t('Settings saved successfully!'));

					await tick();
					await config.set(await getBackendConfig());
				}}
			/>
		{:else if selectedTab === 'web'}
			<WebSearch
				saveHandler={async () => {
					toast.success($i18n.t('Settings saved successfully!'));

					await tick();
					await config.set(await getBackendConfig());
				}}
			/>
		{:else if selectedTab === 'more'}
			<CodeExecution
				saveHandler={async () => {
					toast.success($i18n.t('Settings saved successfully!'));

					await tick();
					await config.set(await getBackendConfig());
				}}
			/>
		{:else if selectedTab === 'interface'}
			<Interface
				on:save={() => {
					toast.success($i18n.t('Settings saved successfully!'));
				}}
			/>
		{:else if selectedTab === 'images'}
			<Images
				on:save={() => {
					toast.success($i18n.t('Settings saved successfully!'));
				}}
			/>
		{:else if selectedTab === 'db'}
			<Database
				saveHandler={() => {
					toast.success($i18n.t('Settings saved successfully!'));
				}}
			/>
		{:else if selectedTab === 'pipelines'}
			<Pipelines
				saveHandler={() => {
					toast.success($i18n.t('Settings saved successfully!'));
				}}
			/>
		{/if}
	</div>
</div>
