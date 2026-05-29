const mapData = {
	meta: {
		source: 'Open WebUI frontend inventory',
		inspected: [
			'src/routes',
			'src/lib/components/layout',
			'src/lib/components/chat',
			'src/lib/components/admin',
			'src/lib/components/workspace',
			'src/lib/apis',
			'src/lib/stores/index.ts'
		]
	},
	nodes: [
		node(
			'root-layout',
			'Root layout',
			'screen',
			160,
			1120,
			'src/routes/+layout.svelte',
			'Initializes config, user session, theme, websocket, i18n, Pyodide worker, app sidebar, sync modal, and frontend update handling.'
		),
		node(
			'auth',
			'Auth',
			'screen',
			160,
			1520,
			'src/routes/auth/+page.svelte',
			'Login and account access route outside the authenticated app shell.',
			true
		),
		node(
			'app-layout',
			'Authenticated app layout',
			'screen',
			520,
			1120,
			'src/routes/(app)/+layout.svelte',
			'Guards authenticated users, loads settings/models/tools/banners, checks local chat DB, and hosts sidebar/settings/changelog overlays.'
		),
		node(
			'sidebar',
			'Global sidebar',
			'component',
			880,
			650,
			'src/lib/components/layout/Sidebar.svelte',
			'Chat list, folders, pinned chats/notes/models, channels, pinned menu links, user menu, search, import/export, and sidebar width state.'
		),
		node(
			'navbar-menu',
			'Navbar menu',
			'component',
			880,
			1010,
			'src/lib/components/layout/Navbar/Menu.svelte',
			'Shared navbar actions and menu surface used around app screens.'
		),
		node(
			'search-modal',
			'Search modal',
			'component',
			880,
			1370,
			'src/lib/components/layout/SearchModal.svelte',
			'Global search entry point driven by showSearch state.'
		),
		node(
			'settings-modal',
			'User settings modal',
			'component',
			880,
			1730,
			'src/lib/components/chat/SettingsModal.svelte',
			'User settings tabs for account, interface, personalization, audio, connections, integrations, data controls, advanced params, tools, and about.'
		),
		node(
			'stores',
			'Svelte stores',
			'store',
			520,
			520,
			'src/lib/stores/index.ts',
			'Central writable state for user/config/settings/models/chats/sidebar/modal visibility/socket/channels/tools/functions/file nav/artifacts.'
		),
		node(
			'chat-home',
			'Chat home',
			'screen',
			1240,
			980,
			'src/routes/(app)/+page.svelte',
			'Default authenticated route. Instantiates Chat with no chat id and handles URL error toast.',
			true
		),
		node(
			'chat-existing',
			'Chat detail',
			'screen',
			1240,
			1260,
			'src/routes/(app)/c/[id]/+page.svelte',
			'Instantiates Chat with chatIdProp from route params for an existing conversation.',
			true
		),
		node(
			'shared-chat',
			'Shared chat',
			'screen',
			1240,
			1540,
			'src/routes/s/[id]/+page.svelte',
			'Public/shared chat view outside the authenticated app route group.'
		),
		node(
			'watch',
			'Watch',
			'screen',
			1240,
			1800,
			'src/routes/watch/+page.svelte',
			'Standalone watch route.'
		),
		node(
			'chat',
			'Chat component',
			'component',
			1600,
			1120,
			'src/lib/components/chat/Chat.svelte',
			'Main conversation orchestration: model selection, history tree, file/web uploads, streaming, task lifecycle, socket events, artifacts, file nav, and persistence.'
		),
		node(
			'chat-navbar',
			'Chat navbar',
			'component',
			1960,
			690,
			'src/lib/components/chat/Navbar.svelte',
			'Conversation header and controls around sidebar toggle, title, share/tag/actions, and chat context.'
		),
		node(
			'model-selector',
			'Model selector',
			'component',
			1960,
			950,
			'src/lib/components/chat/ModelSelector.svelte',
			'Selects one or more models, pins defaults, and updates user settings.'
		),
		node(
			'message-input',
			'Message input',
			'component',
			1960,
			1210,
			'src/lib/components/chat/MessageInput.svelte',
			'Prompt editor, slash commands, variable expansion, files, web/vision/audio/screen capture, terminal menu, integrations, and submit flow.'
		),
		node(
			'messages',
			'Messages',
			'component',
			1960,
			1490,
			'src/lib/components/chat/Messages.svelte',
			'Builds the visible message branch, pagination, edit/regenerate/delete/rating/actions, and update persistence.'
		),
		node(
			'chat-controls',
			'Chat controls',
			'component',
			1960,
			1770,
			'src/lib/components/chat/ChatControls.svelte',
			'Side control pane for selected tools, filters, generation params, embeds, and valves.'
		),
		node(
			'file-nav',
			'File nav / terminal files',
			'component',
			1960,
			2050,
			'src/lib/components/chat/FileNav.svelte',
			'Browse, preview, edit, bulk operate, and inspect terminal-backed files and ports.'
		),
		node(
			'chat-functions',
			'Chat major functions',
			'function',
			2320,
			1120,
			'src/lib/components/chat/Chat.svelte',
			'navigateHandler, initNewChat, loadChat, createMessagePair, submitPrompt, processNextInQueue, chatCompletedHandler, chatActionHandler, uploadWeb, uploadGoogleDriveFile, terminalEventHandler.'
		),
		node(
			'input-functions',
			'Input major functions',
			'function',
			2320,
			1470,
			'src/lib/components/chat/MessageInput.svelte',
			'inputVariableHandler, replaceVariables, getCommand, uploadFileHandler, inputFilesHandler, screenCaptureHandler, createNote, keyboard and paste handlers.'
		),
		node(
			'message-functions',
			'Message major functions',
			'function',
			2320,
			1820,
			'src/lib/components/chat/Messages.svelte',
			'buildMessages, loadMoreMessages, editMessage, saveMessage, deleteMessage, rateMessage, showPreviousMessage, showNextMessage.'
		),
		node(
			'api-core',
			'Core API barrel',
			'api',
			2680,
			760,
			'src/lib/apis/index.ts',
			'Shared backend helpers including getBackendConfig, getModels, generateQueries, chatAction, MoA completion, version, and tool server data.'
		),
		node(
			'api-chats',
			'Chats API',
			'api',
			2680,
			1040,
			'src/lib/apis/chats/index.ts',
			'CRUD, list/search, archive, share, clone, pin, tags, folders, access grants, and chat stats exports.'
		),
		node(
			'api-openai',
			'OpenAI API client',
			'api',
			2680,
			1320,
			'src/lib/apis/openai/index.ts',
			'OpenAI-compatible config, URLs, keys, model discovery, connection verification, chat completion, and speech synthesis.'
		),
		node(
			'api-retrieval',
			'Retrieval API',
			'api',
			2680,
			1600,
			'src/lib/apis/retrieval/index.ts',
			'RAG/query/embedding/rerank configs plus processWeb, processWebSearch, processYoutubeVideo, queryDoc, and queryCollection.'
		),
		node(
			'api-files',
			'Files API',
			'api',
			2680,
			1880,
			'src/lib/apis/files/index.ts',
			'File upload, process status, list/search, content retrieval, content update, and deletion.'
		),
		node(
			'api-tasks',
			'Tasks / streaming APIs',
			'api',
			2680,
			2160,
			'src/lib/apis/tasks/index.ts + streaming',
			'Active chat checks, task ids/stop handling, and text stream creation.'
		),
		node(
			'workspace-layout',
			'Workspace layout',
			'screen',
			1240,
			240,
			'src/routes/(app)/workspace/+layout.svelte',
			'Permission-gated workspace shell with tab navigation for models, knowledge, prompts, skills, and tools.'
		),
		node(
			'workspace',
			'Workspace index',
			'screen',
			1600,
			130,
			'src/routes/(app)/workspace/+page.svelte',
			'Workspace landing/redirect surface.'
		),
		node(
			'workspace-models',
			'Workspace models',
			'screen',
			1600,
			350,
			'src/routes/(app)/workspace/models/+page.svelte',
			'Model inventory screen using Models component for search, import/export, pin, visibility, enablement, clone, share, and delete.',
			true
		),
		node(
			'model-editor',
			'Model editor',
			'component',
			1960,
			250,
			'src/lib/components/workspace/Models/ModelEditor.svelte',
			'Create/edit model metadata, prompt suggestions, knowledge, tools, skills, filters, capabilities, terminal, and access.'
		),
		node(
			'workspace-knowledge',
			'Workspace knowledge',
			'screen',
			1600,
			570,
			'src/routes/(app)/workspace/knowledge/+page.svelte',
			'Knowledge base list with search, paging, export, and delete.',
			true
		),
		node(
			'knowledge-base',
			'Knowledge base detail',
			'component',
			1960,
			510,
			'src/lib/components/workspace/Knowledge/KnowledgeBase.svelte',
			'Knowledge base files, text content, reindex/update/remove flows, and access control.'
		),
		node(
			'workspace-prompts',
			'Workspace prompts',
			'screen',
			1600,
			790,
			'src/routes/(app)/workspace/prompts/+page.svelte',
			'Prompt library with command search, import/export, clone, share, copy, history, tag filtering, and delete.',
			true
		),
		node(
			'prompt-editor',
			'Prompt editor',
			'component',
			1960,
			770,
			'src/lib/components/workspace/Prompts/PromptEditor.svelte',
			'Create/edit versioned prompt content and metadata.'
		),
		node(
			'workspace-skills',
			'Workspace skills',
			'screen',
			1600,
			2350,
			'src/routes/(app)/workspace/skills/+page.svelte',
			'Skill list and management surface.',
			true
		),
		node(
			'skill-editor',
			'Skill editor',
			'component',
			1960,
			2350,
			'src/lib/components/workspace/Skills/SkillEditor.svelte',
			'Create/edit skills and access state.'
		),
		node(
			'workspace-tools',
			'Workspace tools',
			'screen',
			1600,
			2570,
			'src/routes/(app)/workspace/tools/+page.svelte',
			'Tool list with import/export, manifest, valves, clone/share/delete, and filtering.',
			true
		),
		node(
			'toolkit-editor',
			'Toolkit editor',
			'component',
			1960,
			2570,
			'src/lib/components/workspace/Tools/ToolkitEditor.svelte',
			'Create/edit toolkits, manifest, valves, and access control.'
		),
		node(
			'api-models',
			'Models API',
			'api',
			2320,
			350,
			'src/lib/apis/models/index.ts',
			'Workspace model item CRUD, tags, import, base models, access grants, toggle, and delete all.'
		),
		node(
			'api-knowledge',
			'Knowledge API',
			'api',
			2320,
			570,
			'src/lib/apis/knowledge/index.ts',
			'Knowledge base CRUD, search, file add/update/remove, reset, reindex, export, and access grants.'
		),
		node(
			'api-prompts',
			'Prompts API',
			'api',
			2320,
			790,
			'src/lib/apis/prompts/index.ts',
			'Prompt CRUD, search/list, tags, metadata, production version, history, diff, restore, toggle, and grants.'
		),
		node(
			'api-skills',
			'Skills API',
			'api',
			2320,
			2350,
			'src/lib/apis/skills/index.ts',
			'Skill CRUD, list/search, import/export, access grants, toggle, and delete.'
		),
		node(
			'api-tools',
			'Tools API',
			'api',
			2320,
			2570,
			'src/lib/apis/tools/index.ts',
			'Tool CRUD, load by URL, import/export, access grants, valves specs/values, user valves, and delete.'
		),
		node(
			'admin-layout',
			'Admin layout',
			'screen',
			1240,
			2720,
			'src/routes/(app)/admin/+layout.svelte',
			'Admin-only shell with tab navigation for users, analytics, evaluations, functions, and settings.'
		),
		node(
			'admin-users',
			'Admin users',
			'screen',
			1600,
			2820,
			'src/routes/(app)/admin/users/+page.svelte',
			'Users/groups administration, user details, roles, default permissions, and user chats.',
			true
		),
		node(
			'admin-analytics',
			'Admin analytics',
			'screen',
			1600,
			3040,
			'src/routes/(app)/admin/analytics/+page.svelte',
			'Analytics dashboards for models, users, token usage, model chats, daily stats, and summaries.',
			true
		),
		node(
			'admin-evals',
			'Admin evaluations',
			'screen',
			1960,
			2820,
			'src/routes/(app)/admin/evaluations/+page.svelte',
			'Feedbacks, leaderboard, model activity chart, and evaluation config surfaces.',
			true
		),
		node(
			'admin-functions',
			'Admin functions',
			'screen',
			1960,
			3040,
			'src/routes/(app)/admin/functions/+page.svelte',
			'Function inventory, create/edit, import/export, valves, global toggle, and delete.',
			true
		),
		node(
			'admin-settings',
			'Admin settings',
			'screen',
			2320,
			2820,
			'src/routes/(app)/admin/settings/+page.svelte',
			'Admin settings tabs: general, interface, connections, models, documents, web search, code execution, images, audio, evaluations, pipelines, database, integrations.',
			true
		),
		node(
			'api-users',
			'Users / groups APIs',
			'api',
			2680,
			2820,
			'src/lib/apis/users + groups',
			'User/group CRUD, roles, permissions, status, settings, info, and user group membership.'
		),
		node(
			'api-analytics',
			'Analytics API',
			'api',
			2680,
			3040,
			'src/lib/apis/analytics/index.ts',
			'Model/user analytics, messages, summaries, daily stats, token usage, model chats, and model overview.'
		),
		node(
			'api-evals',
			'Evaluations API',
			'api',
			3040,
			2820,
			'src/lib/apis/evaluations/index.ts',
			'Evaluation config, feedback items/export, leaderboard, model history, feedback model ids, and feedback CRUD.'
		),
		node(
			'api-functions',
			'Functions API',
			'api',
			3040,
			3040,
			'src/lib/apis/functions/index.ts',
			'Function CRUD, URL load, export, toggle, global toggle, valves specs/values, user valves, and delete.'
		),
		node(
			'api-configs',
			'Configs API',
			'api',
			3400,
			2820,
			'src/lib/apis/configs/index.ts',
			'Import/export config, connections, tool/terminal servers, OAuth clients, code execution, model defaults, banners, and verification.'
		),
		node(
			'notes',
			'Notes',
			'screen',
			1240,
			2140,
			'src/routes/(app)/notes/+page.svelte',
			'Notes list shell with sidebar/user menu and Notes component.',
			true
		),
		node(
			'note-editor',
			'Note editor',
			'component',
			1600,
			2140,
			'src/lib/components/notes/NoteEditor.svelte',
			'Rich note editing plus note chat assistant, controls, record menu, and access flows.'
		),
		node(
			'api-notes',
			'Notes API',
			'api',
			1960,
			2140,
			'src/lib/apis/notes/index.ts',
			'Notes CRUD, search/list, pinned notes, access grants, and pin toggles.'
		),
		node(
			'channels',
			'Channels',
			'screen',
			1240,
			2350,
			'src/routes/(app)/channels/[id]/+page.svelte',
			'Channel conversation route for teams/DM-style messaging.',
			true
		),
		node(
			'channel-component',
			'Channel component',
			'component',
			1600,
			2350,
			'src/lib/components/channel/Channel.svelte',
			'Channel navbar, messages, thread, info modal, pinned messages, webhooks, members, and message input.'
		),
		node(
			'api-channels',
			'Channels API',
			'api',
			1960,
			2350,
			'src/lib/apis/channels/index.ts',
			'Channel CRUD, members, messages, threads, reactions, pinning, webhooks, DM lookup, and deletes.'
		),
		node(
			'automations',
			'Automations',
			'screen',
			1240,
			2570,
			'src/routes/(app)/automations/+page.svelte',
			'Automation list with search, create/edit modal, enable toggle, run history, delete, and pagination.',
			true
		),
		node(
			'automation-modal',
			'Automation modal',
			'component',
			1600,
			2570,
			'src/lib/components/AutomationModal.svelte',
			'Create/edit automation forms and scheduling/run configuration.'
		),
		node(
			'api-automations',
			'Automations API',
			'api',
			1960,
			2790,
			'src/lib/apis/automations/index.ts',
			'Automation list, create, get, update, toggle, run, delete, and run history.'
		),
		node(
			'calendar',
			'Calendar',
			'screen',
			1240,
			3040,
			'src/routes/(app)/calendar/+page.svelte',
			'Calendar screen with calendar selector, sidebar, event view, event modal, default calendar, and create calendar modal.',
			true
		),
		node(
			'api-calendar',
			'Calendar API',
			'api',
			1600,
			3040,
			'src/lib/apis/calendar/index.ts',
			'Calendar CRUD, default calendar, events CRUD/search, and RSVP.'
		),
		node(
			'playground-layout',
			'Playground layout',
			'screen',
			3040,
			360,
			'src/routes/(app)/playground/+layout.svelte',
			'Admin-only playground shell with tabs.'
		),
		node(
			'playground-chat',
			'Playground chat',
			'screen',
			3400,
			250,
			'src/routes/(app)/playground/+page.svelte',
			'Playground chat route using playground Chat component.',
			true
		),
		node(
			'playground-completions',
			'Playground completions',
			'screen',
			3400,
			470,
			'src/routes/(app)/playground/completions/+page.svelte',
			'Completions playground route.',
			true
		),
		node(
			'playground-images',
			'Playground images',
			'screen',
			3400,
			690,
			'src/routes/(app)/playground/images/+page.svelte',
			'Images playground route.',
			true
		),
		node(
			'api-images',
			'Images API',
			'api',
			3760,
			690,
			'src/lib/apis/images/index.ts',
			'Image config, verify URL, generation models, image generation, and edits.'
		),
		node(
			'screenshots',
			'Screenshot capture slots',
			'capture',
			3760,
			1120,
			'frontend-map/screenshots/',
			'Place real screenshots here after running Open WebUI locally. Each mapped screen can link to a matching PNG by route slug.',
			true
		)
	],
	edges: [
		edge('root-layout', 'auth', 'redirects unauthenticated users'),
		edge('root-layout', 'app-layout', 'wraps authenticated routes'),
		edge('root-layout', 'stores', 'initializes shared state'),
		edge('root-layout', 'api-core', 'loads backend config/version/models'),
		edge('app-layout', 'sidebar', 'renders'),
		edge('app-layout', 'settings-modal', 'opens'),
		edge('app-layout', 'search-modal', 'opens'),
		edge('app-layout', 'api-core', 'loads models/tool servers'),
		edge('app-layout', 'api-chats', 'checks local and remote chats'),
		edge('sidebar', 'chat-home', 'new chat'),
		edge('sidebar', 'chat-existing', 'select chat'),
		edge('sidebar', 'notes', 'pinned route'),
		edge('sidebar', 'workspace-layout', 'pinned route'),
		edge('sidebar', 'automations', 'feature route'),
		edge('sidebar', 'calendar', 'feature route'),
		edge('sidebar', 'playground-layout', 'admin route'),
		edge('sidebar', 'api-chats', 'list/search/pin/archive'),
		edge('sidebar', 'api-notes', 'pinned notes'),
		edge('sidebar', 'api-channels', 'channels'),
		edge('chat-home', 'chat', 'instantiates'),
		edge('chat-existing', 'chat', 'instantiates with id'),
		edge('chat', 'chat-navbar', 'renders'),
		edge('chat', 'model-selector', 'selects models'),
		edge('chat', 'message-input', 'captures prompt'),
		edge('chat', 'messages', 'renders history'),
		edge('chat', 'chat-controls', 'optional pane'),
		edge('chat', 'file-nav', 'optional terminal files'),
		edge('chat', 'chat-functions', 'orchestrates'),
		edge('message-input', 'input-functions', 'implements'),
		edge('messages', 'message-functions', 'implements'),
		edge('chat-functions', 'api-chats', 'create/load/update/archive'),
		edge('chat-functions', 'api-openai', 'generate completion'),
		edge('chat-functions', 'api-retrieval', 'process web/youtube/search'),
		edge('chat-functions', 'api-files', 'upload files'),
		edge('chat-functions', 'api-tasks', 'task stop/status'),
		edge('chat-functions', 'api-core', 'actions, queries, MoA'),
		edge('input-functions', 'api-files', 'upload/process'),
		edge('input-functions', 'api-notes', 'create note'),
		edge('model-selector', 'stores', 'settings/models'),
		edge('messages', 'api-chats', 'persist edits'),
		edge('workspace-layout', 'workspace', 'index'),
		edge('workspace-layout', 'workspace-models', 'tab'),
		edge('workspace-layout', 'workspace-knowledge', 'tab'),
		edge('workspace-layout', 'workspace-prompts', 'tab'),
		edge('workspace-layout', 'workspace-skills', 'tab'),
		edge('workspace-layout', 'workspace-tools', 'tab'),
		edge('workspace-models', 'model-editor', 'create/edit'),
		edge('workspace-models', 'api-models', 'list/search/update'),
		edge('model-editor', 'api-models', 'create/update'),
		edge('model-editor', 'api-knowledge', 'attach knowledge'),
		edge('model-editor', 'api-tools', 'attach tools'),
		edge('model-editor', 'api-skills', 'attach skills'),
		edge('workspace-knowledge', 'knowledge-base', 'open'),
		edge('workspace-knowledge', 'api-knowledge', 'search/delete/export'),
		edge('knowledge-base', 'api-knowledge', 'files/access/reindex'),
		edge('workspace-prompts', 'prompt-editor', 'create/edit'),
		edge('workspace-prompts', 'api-prompts', 'list/import/export'),
		edge('prompt-editor', 'api-prompts', 'create/update/history'),
		edge('workspace-skills', 'skill-editor', 'create/edit'),
		edge('workspace-skills', 'api-skills', 'list/import/export'),
		edge('skill-editor', 'api-skills', 'create/update'),
		edge('workspace-tools', 'toolkit-editor', 'create/edit'),
		edge('workspace-tools', 'api-tools', 'list/import/export'),
		edge('toolkit-editor', 'api-tools', 'create/update/valves'),
		edge('admin-layout', 'admin-users', 'tab'),
		edge('admin-layout', 'admin-analytics', 'tab'),
		edge('admin-layout', 'admin-evals', 'tab'),
		edge('admin-layout', 'admin-functions', 'tab'),
		edge('admin-layout', 'admin-settings', 'tab'),
		edge('admin-users', 'api-users', 'manage'),
		edge('admin-analytics', 'api-analytics', 'query dashboards'),
		edge('admin-evals', 'api-evals', 'feedback and leaderboard'),
		edge('admin-functions', 'api-functions', 'manage functions'),
		edge('admin-settings', 'api-configs', 'system config'),
		edge('admin-settings', 'api-openai', 'OpenAI connections'),
		edge('admin-settings', 'api-retrieval', 'RAG config'),
		edge('admin-settings', 'api-images', 'image config'),
		edge('notes', 'note-editor', 'open note'),
		edge('notes', 'api-notes', 'list/search'),
		edge('note-editor', 'api-notes', 'save/update'),
		edge('channels', 'channel-component', 'instantiates'),
		edge('channel-component', 'api-channels', 'messages/members/webhooks'),
		edge('automations', 'automation-modal', 'create/edit'),
		edge('automations', 'api-automations', 'list/toggle/run/delete'),
		edge('automation-modal', 'api-automations', 'create/update'),
		edge('calendar', 'api-calendar', 'calendars/events'),
		edge('playground-layout', 'playground-chat', 'tab'),
		edge('playground-layout', 'playground-completions', 'tab'),
		edge('playground-layout', 'playground-images', 'tab'),
		edge('playground-images', 'api-images', 'generate/edit'),
		edge('screenshots', 'chat-home', 'slot'),
		edge('screenshots', 'workspace-models', 'slot'),
		edge('screenshots', 'admin-settings', 'slot'),
		edge('screenshots', 'notes', 'slot'),
		edge('screenshots', 'calendar', 'slot')
	]
};

function node(id, title, type, x, y, path, description, screenshot = false) {
	return {
		id,
		title,
		type,
		x,
		y,
		w: 238,
		h: screenshot ? 150 : 126,
		path,
		description,
		screenshot
	};
}

function edge(from, to, label) {
	return { id: `${from}->${to}:${label}`, from, to, label };
}

const layoutConfig = {
	paddingX: 140,
	paddingY: 120,
	columnGap: 460,
	rowGap: 82,
	forceIterations: 420,
	linkDistance: 360,
	linkStrength: 0.022,
	repelStrength: 520000,
	centerStrength: 0.008,
	collisionPadding: 42,
	minSurfaceWidth: 1800,
	minSurfaceHeight: 1400
};
const typeConfig = [
	['screen', 'Screen / route'],
	['component', 'Component cluster'],
	['store', 'Store / state'],
	['api', 'API client'],
	['function', 'Major function'],
	['capture', 'Screenshot slot']
];
const overviewGroups = [
	[
		'App shell',
		[
			'root-layout',
			'auth',
			'app-layout',
			'sidebar',
			'navbar-menu',
			'search-modal',
			'settings-modal',
			'stores'
		]
	],
	[
		'Chat',
		[
			'chat-home',
			'chat-existing',
			'shared-chat',
			'watch',
			'chat',
			'chat-navbar',
			'model-selector',
			'message-input',
			'messages',
			'chat-controls',
			'file-nav',
			'chat-functions',
			'input-functions',
			'message-functions'
		]
	],
	[
		'Workspace',
		[
			'workspace-layout',
			'workspace',
			'workspace-models',
			'model-editor',
			'workspace-knowledge',
			'knowledge-base',
			'workspace-prompts',
			'prompt-editor',
			'workspace-skills',
			'skill-editor',
			'workspace-tools',
			'toolkit-editor',
			'api-models',
			'api-knowledge',
			'api-prompts',
			'api-skills',
			'api-tools'
		]
	],
	[
		'Admin',
		[
			'admin-layout',
			'admin-users',
			'admin-analytics',
			'admin-evals',
			'admin-functions',
			'admin-settings',
			'api-users',
			'api-analytics',
			'api-evals',
			'api-functions',
			'api-configs'
		]
	],
	[
		'Tools and routes',
		[
			'notes',
			'note-editor',
			'api-notes',
			'channels',
			'channel-component',
			'api-channels',
			'automations',
			'automation-modal',
			'api-automations',
			'calendar',
			'api-calendar',
			'playground-layout',
			'playground-chat',
			'playground-completions',
			'playground-images',
			'api-images',
			'screenshots'
		]
	],
	['Core APIs', ['api-core', 'api-chats', 'api-openai', 'api-retrieval', 'api-files', 'api-tasks']]
];
const storageKey = 'open-webui-frontend-map-annotations-v1';
const typeStorageKey = 'open-webui-frontend-map-enabled-types-v1';
const viewport = document.getElementById('mapViewport');
const surface = document.getElementById('mapSurface');
const edgeLayer = document.getElementById('edgeLayer');
const nodeLayer = document.getElementById('nodeLayer');
const nodeList = document.getElementById('nodeList');
const categoryFilters = document.getElementById('categoryFilters');
const stats = document.getElementById('stats');
const searchInput = document.getElementById('searchInput');
const emptyInspector = document.getElementById('emptyInspector');
const detailInspector = document.getElementById('detailInspector');
const selectedType = document.getElementById('selectedType');
const selectedTitle = document.getElementById('selectedTitle');
const selectedDescription = document.getElementById('selectedDescription');
const selectedMeta = document.getElementById('selectedMeta');
const annotationText = document.getElementById('annotationText');

const nodeById = new Map(mapData.nodes.map((item) => [item.id, item]));
const enabledTypes = loadEnabledTypes();
let layoutBounds = autoBalanceNodes(allNodeIds());
let annotations = loadAnnotations();
let selected = null;
let view = { x: 80, y: 40, scale: 0.5 };
let panDrag = null;
let nodeDrag = null;
let filter = '';

renderCategoryFilters();
render();
fitView();

document.getElementById('balanceButton').addEventListener('click', () => {
	layoutBounds = autoBalanceNodes(allNodeIds());
	render();
	fitView();
});
document.getElementById('fitButton').addEventListener('click', fitView);
document.getElementById('resetButton').addEventListener('click', () => {
	layoutBounds = autoBalanceNodes(allNodeIds());
	render();
	fitView();
});
document.getElementById('saveAnnotationButton').addEventListener('click', saveSelectedAnnotation);
document
	.getElementById('removeAnnotationButton')
	.addEventListener('click', removeSelectedAnnotation);
document.getElementById('exportButton').addEventListener('click', exportMarkdown);
document.getElementById('clearButton').addEventListener('click', clearAnnotations);
searchInput.addEventListener('input', () => {
	filter = searchInput.value.trim().toLowerCase();
	render();
});
selectedMeta.addEventListener('click', (event) => {
	const button = event.target.closest('.connection-link');
	if (!button) return;
	const item = nodeById.get(button.dataset.nodeId);
	if (!item) return;
	centerOn(item);
	selectItem('node', item.id);
});

viewport.addEventListener('pointerdown', (event) => {
	if (event.target.closest('.node')) return;
	viewport.setPointerCapture(event.pointerId);
	viewport.classList.add('dragging');
	panDrag = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y };
});

viewport.addEventListener('pointermove', (event) => {
	if (!panDrag) return;
	view.x = panDrag.viewX + event.clientX - panDrag.x;
	view.y = panDrag.viewY + event.clientY - panDrag.y;
	applyTransform();
});

viewport.addEventListener('pointerup', () => {
	panDrag = null;
	viewport.classList.remove('dragging');
});

viewport.addEventListener(
	'wheel',
	(event) => {
		if (!event.shiftKey) return;
		event.preventDefault();
		const rect = viewport.getBoundingClientRect();
		const mx = event.clientX - rect.left;
		const my = event.clientY - rect.top;
		const before = screenToWorld(mx, my);
		const delta = event.deltaY > 0 ? 0.9 : 1.1;
		view.scale = clamp(view.scale * delta, 0.18, 1.8);
		view.x = mx - before.x * view.scale;
		view.y = my - before.y * view.scale;
		applyTransform();
	},
	{ passive: false }
);

function autoBalanceNodes(activeIds = activeNodeIds()) {
	const activeNodes = mapData.nodes.filter((item) => activeIds.has(item.id));
	if (!activeNodes.length) return emptyLayoutBounds();
	const activeEdges = mapData.edges.filter(
		(item) => activeIds.has(item.from) && activeIds.has(item.to)
	);
	const incoming = new Map(activeNodes.map((item) => [item.id, []]));
	const outgoing = new Map(activeNodes.map((item) => [item.id, []]));
	const indegree = new Map(activeNodes.map((item) => [item.id, 0]));

	for (const item of activeEdges) {
		outgoing.get(item.from).push(item.to);
		incoming.get(item.to).push(item.from);
		indegree.set(item.to, indegree.get(item.to) + 1);
	}

	const layerById = new Map(activeNodes.map((item) => [item.id, 0]));
	const queue = activeNodes
		.filter((item) => indegree.get(item.id) === 0)
		.sort((a, b) => domainRank(a) - domainRank(b) || a.y - b.y || a.x - b.x)
		.map((item) => item.id);
	const visited = new Set();

	while (queue.length) {
		const id = queue.shift();
		visited.add(id);
		for (const targetId of outgoing.get(id)) {
			layerById.set(targetId, Math.max(layerById.get(targetId), layerById.get(id) + 1));
			indegree.set(targetId, indegree.get(targetId) - 1);
			if (indegree.get(targetId) === 0) queue.push(targetId);
		}
	}

	for (let pass = 0; pass < activeNodes.length; pass += 1) {
		let changed = false;
		for (const item of activeEdges) {
			if (visited.has(item.to)) continue;
			const nextLayer = layerById.get(item.from) + 1;
			if (nextLayer > layerById.get(item.to)) {
				layerById.set(item.to, nextLayer);
				changed = true;
			}
		}
		if (!changed) break;
	}

	const layers = [];
	for (const item of activeNodes) {
		const layer = layerById.get(item.id);
		if (!layers[layer]) layers[layer] = [];
		layers[layer].push(item);
	}

	for (const layer of layers) {
		layer.sort(
			(a, b) => domainRank(a) - domainRank(b) || a.y - b.y || a.title.localeCompare(b.title)
		);
	}

	for (let pass = 0; pass < 8; pass += 1) {
		for (let index = 1; index < layers.length; index += 1) {
			sortLayerByNeighbors(layers[index], incoming, layers[index - 1]);
		}
		for (let index = layers.length - 2; index >= 0; index -= 1) {
			sortLayerByNeighbors(layers[index], outgoing, layers[index + 1]);
		}
	}

	const columnHeights = layers.map((layer) =>
		layer.reduce((height, item, index) => height + item.h + (index ? layoutConfig.rowGap : 0), 0)
	);
	const maxColumnHeight = Math.max(
		...columnHeights,
		layoutConfig.minSurfaceHeight - layoutConfig.paddingY * 2
	);

	layers.forEach((layer, layerIndex) => {
		let y = layoutConfig.paddingY + (maxColumnHeight - columnHeights[layerIndex]) / 2;
		for (const item of layer) {
			item.x = layoutConfig.paddingX + layerIndex * layoutConfig.columnGap;
			item.y = Math.round(y);
			y += item.h + layoutConfig.rowGap;
		}
	});

	runForceBalance(activeNodes, activeEdges);
	return updateLayoutBounds(activeNodes);
}

function runForceBalance(nodes, edges) {
	const velocities = new Map(nodes.map((item) => [item.id, { x: 0, y: 0 }]));
	const centers = new Map(
		nodes.map((item) => [item.id, { x: item.x + item.w / 2, y: item.y + item.h / 2 }])
	);

	for (let iteration = 0; iteration < layoutConfig.forceIterations; iteration += 1) {
		const cooling = 1 - iteration / layoutConfig.forceIterations;
		for (let i = 0; i < nodes.length; i += 1) {
			const a = nodes[i];
			const av = velocities.get(a.id);
			const ac = nodeCenter(a);
			for (let j = i + 1; j < nodes.length; j += 1) {
				const b = nodes[j];
				const bv = velocities.get(b.id);
				const bc = nodeCenter(b);
				const dx = ac.x - bc.x || 0.01;
				const dy = ac.y - bc.y || 0.01;
				const distance = Math.hypot(dx, dy);
				const minDistance = (a.w + b.w) / 2 + layoutConfig.collisionPadding;
				const repel = layoutConfig.repelStrength / Math.max(distance * distance, 10000);
				const collision = distance < minDistance ? (minDistance - distance) * 0.08 : 0;
				const force = Math.min(36, repel + collision);
				const fx = (dx / distance) * force;
				const fy = (dy / distance) * force;
				av.x += fx;
				av.y += fy;
				bv.x -= fx;
				bv.y -= fy;
			}
		}

		for (const edgeItem of edges) {
			const from = nodeById.get(edgeItem.from);
			const to = nodeById.get(edgeItem.to);
			const fc = nodeCenter(from);
			const tc = nodeCenter(to);
			const dx = tc.x - fc.x;
			const dy = tc.y - fc.y;
			const distance = Math.hypot(dx, dy) || 1;
			const force = (distance - layoutConfig.linkDistance) * layoutConfig.linkStrength;
			const fx = (dx / distance) * force;
			const fy = (dy / distance) * force;
			velocities.get(from.id).x += fx;
			velocities.get(from.id).y += fy;
			velocities.get(to.id).x -= fx;
			velocities.get(to.id).y -= fy;
		}

		for (const item of nodes) {
			const center = nodeCenter(item);
			const home = centers.get(item.id);
			const velocity = velocities.get(item.id);
			velocity.x += (home.x - center.x) * layoutConfig.centerStrength;
			velocity.y += (home.y - center.y) * layoutConfig.centerStrength;
			velocity.x *= 0.68;
			velocity.y *= 0.68;
			item.x = clamp(item.x + velocity.x * cooling, layoutConfig.paddingX, Number.MAX_SAFE_INTEGER);
			item.y = clamp(item.y + velocity.y * cooling, layoutConfig.paddingY, Number.MAX_SAFE_INTEGER);
		}
	}

	for (const item of nodes) {
		item.x = Math.round(item.x);
		item.y = Math.round(item.y);
	}
}

function updateLayoutBounds(nodes = mapData.nodes) {
	if (!nodes.length) return emptyLayoutBounds();
	const minX = Math.min(...nodes.map((item) => item.x));
	const minY = Math.min(...nodes.map((item) => item.y));
	const maxX = Math.max(...nodes.map((item) => item.x + item.w)) + layoutConfig.paddingX;
	const maxY = Math.max(...nodes.map((item) => item.y + item.h)) + layoutConfig.paddingY;
	surface.style.width = `${Math.max(maxX, layoutConfig.minSurfaceWidth)}px`;
	surface.style.height = `${Math.max(maxY, layoutConfig.minSurfaceHeight)}px`;
	edgeLayer.setAttribute('width', Math.max(maxX, layoutConfig.minSurfaceWidth));
	edgeLayer.setAttribute('height', Math.max(maxY, layoutConfig.minSurfaceHeight));
	return {
		minX,
		minY,
		maxX,
		maxY
	};
}

function emptyLayoutBounds() {
	return {
		minX: layoutConfig.paddingX,
		minY: layoutConfig.paddingY,
		maxX: layoutConfig.minSurfaceWidth,
		maxY: layoutConfig.minSurfaceHeight
	};
}

function sortLayerByNeighbors(layer, neighborMap, neighborLayer = []) {
	const neighborOrder = new Map(neighborLayer.map((item, index) => [item.id, index]));
	layer.sort((a, b) => {
		const aScore = neighborScore(a.id, neighborMap, neighborOrder);
		const bScore = neighborScore(b.id, neighborMap, neighborOrder);
		if (aScore !== bScore) return aScore - bScore;
		return domainRank(a) - domainRank(b) || a.title.localeCompare(b.title);
	});
}

function neighborScore(id, neighborMap, neighborOrder) {
	const scores = neighborMap
		.get(id)
		.map((neighborId) => neighborOrder.get(neighborId))
		.filter((index) => Number.isFinite(index));
	if (!scores.length) return Number.MAX_SAFE_INTEGER;
	return scores.reduce((sum, index) => sum + index, 0) / scores.length;
}

function domainRank(item) {
	if (item.id.includes('root') || item.id.includes('auth') || item.id === 'stores') return 0;
	if (item.id.includes('chat') || item.id.includes('message') || item.id.includes('model-selector'))
		return 1;
	if (
		item.id.includes('workspace') ||
		item.id.includes('model') ||
		item.id.includes('knowledge') ||
		item.id.includes('prompt') ||
		item.id.includes('skill') ||
		item.id.includes('tool')
	)
		return 2;
	if (
		item.id.includes('note') ||
		item.id.includes('channel') ||
		item.id.includes('automation') ||
		item.id.includes('calendar')
	)
		return 3;
	if (
		item.id.includes('admin') ||
		item.id.includes('eval') ||
		item.id.includes('analytics') ||
		item.id.includes('config') ||
		item.id.includes('function')
	)
		return 4;
	if (item.id.includes('playground') || item.id.includes('image')) return 5;
	if (item.type === 'api') return 6;
	return 7;
}

function renderCategoryFilters() {
	categoryFilters.innerHTML = '';
	for (const [type, label] of typeConfig) {
		const row = document.createElement('label');
		row.className = `type-row type-toggle ${enabledTypes.has(type) ? '' : 'configured-out'}`;
		row.innerHTML = `
			<input type="checkbox" value="${escapeHtml(type)}" ${enabledTypes.has(type) ? 'checked' : ''} />
			<span class="dot ${escapeHtml(type)}"></span>
			<span>${escapeHtml(label)}</span>
		`;
		row.querySelector('input').addEventListener('change', (event) => {
			if (event.currentTarget.checked) enabledTypes.add(type);
			else enabledTypes.delete(type);
			persistEnabledTypes();
			renderCategoryFilters();
			render();
		});
		categoryFilters.appendChild(row);
	}
}

function render() {
	renderEdges();
	renderNodes();
	renderNodeList();
	renderStats();
	applyTransform();
	if (selected) selectItem(selected.kind, selected.id, false);
}

function renderNodes() {
	nodeLayer.innerHTML = '';
	const visible = visibleNodeIds();
	for (const item of mapData.nodes) {
		const el = document.createElement('button');
		el.type = 'button';
		el.className = `node ${annotations[`node:${item.id}`] ? 'has-note' : ''} ${visible.has(item.id) ? '' : 'dimmed'} ${enabledTypes.has(item.type) ? '' : 'configured-out'}`;
		el.style.left = `${item.x}px`;
		el.style.top = `${item.y}px`;
		el.style.width = `${item.w}px`;
		el.dataset.id = item.id;
		el.innerHTML = `
			<div class="node-header">
				<div class="node-title">${escapeHtml(item.title)}</div>
				<div class="node-kind ${item.type}">${escapeHtml(item.type)}</div>
			</div>
			<div class="node-path">${escapeHtml(item.path)}</div>
			<div class="node-desc">${escapeHtml(item.description)}</div>
			${item.screenshot ? `<div class="screenshot-slot">Screenshot placeholder. Add real captures under frontend-map/screenshots/.</div>` : ''}
		`;
		el.addEventListener('pointerdown', (event) => {
			event.stopPropagation();
			el.setPointerCapture(event.pointerId);
			const point = screenToWorldFromClient(event.clientX, event.clientY);
			nodeDrag = {
				id: item.id,
				pointerId: event.pointerId,
				offsetX: point.x - item.x,
				offsetY: point.y - item.y,
				startX: event.clientX,
				startY: event.clientY,
				moved: false,
				el
			};
			el.classList.add('dragging-node');
		});
		el.addEventListener('pointermove', (event) => {
			if (!nodeDrag || nodeDrag.id !== item.id) return;
			const point = screenToWorldFromClient(event.clientX, event.clientY);
			item.x = Math.round(Math.max(0, point.x - nodeDrag.offsetX));
			item.y = Math.round(Math.max(0, point.y - nodeDrag.offsetY));
			nodeDrag.moved =
				nodeDrag.moved ||
				Math.hypot(event.clientX - nodeDrag.startX, event.clientY - nodeDrag.startY) > 3;
			el.style.left = `${item.x}px`;
			el.style.top = `${item.y}px`;
			layoutBounds = updateLayoutBounds(mapData.nodes);
			renderEdges();
			applyTransform();
		});
		el.addEventListener('pointerup', () => {
			el.classList.remove('dragging-node');
			window.setTimeout(() => {
				nodeDrag = null;
			}, 0);
		});
		el.addEventListener('pointercancel', () => {
			el.classList.remove('dragging-node');
			nodeDrag = null;
		});
		el.addEventListener('click', (event) => {
			event.stopPropagation();
			if (nodeDrag?.moved) return;
			selectItem('node', item.id);
		});
		nodeLayer.appendChild(el);
	}
}

function renderEdges() {
	edgeLayer.innerHTML = `<defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#95a7b2"></path></marker></defs>`;
	const visible = visibleNodeIds();
	for (const item of mapData.edges) {
		const from = nodeById.get(item.from);
		const to = nodeById.get(item.to);
		if (!from || !to) continue;
		const configuredOut = !enabledTypes.has(from.type) || !enabledTypes.has(to.type);
		const start = anchor(from, to);
		const end = anchor(to, from);
		const midX = (start.x + end.x) / 2;
		const d = `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;
		const edgeVisible = visible.has(item.from) || visible.has(item.to) || textMatches(item.label);
		const group = svg('g', {
			class: `edge-group ${configuredOut ? 'configured-out' : ''}`,
			opacity: edgeVisible ? '1' : '0.12'
		});
		const hitbox = svg('path', {
			class: 'edge-hitbox',
			d,
			'data-id': item.id
		});
		const path = svg('path', {
			class: `edge ${annotations[`edge:${item.id}`] ? 'has-note' : ''}`,
			d,
			'marker-end': 'url(#arrow)',
			'data-id': item.id
		});
		group.addEventListener('click', (event) => {
			event.stopPropagation();
			selectItem('edge', item.id);
		});
		group.appendChild(hitbox);
		group.appendChild(path);
		edgeLayer.appendChild(group);

		const labelPoint = readableLabelPoint(start, end);
		const label = edgeLabel(item.label, labelPoint.x, labelPoint.y, edgeVisible);
		if (configuredOut) label.classList.add('configured-out');
		label.addEventListener('click', (event) => {
			event.stopPropagation();
			selectItem('edge', item.id);
		});
		edgeLayer.appendChild(label);
	}
	updateEdgeLabels();
}

function readableLabelPoint(start, end) {
	const x = (start.x + end.x) / 2;
	const y = (start.y + end.y) / 2;
	const dx = end.x - start.x;
	const dy = end.y - start.y;
	const length = Math.hypot(dx, dy) || 1;
	const offset = Math.sign(dy || 1) * 22;
	return {
		x: Math.round(x - (dy / length) * offset),
		y: Math.round(y + (dx / length) * offset)
	};
}

function edgeLabel(text, x, y, visible) {
	const lines = wrapLabel(text);
	const textWidth = Math.max(...lines.map((line) => line.length)) * 7.1;
	const width = Math.max(86, Math.min(178, textWidth + 24));
	const height = lines.length * 17 + 12;
	const group = svg('g', {
		class: 'edge-label',
		'data-x': x,
		'data-y': y,
		opacity: visible ? '1' : '0.08'
	});
	group.appendChild(
		svg('rect', {
			x: -width / 2,
			y: -height / 2,
			width,
			height,
			rx: 6,
			ry: 6
		})
	);
	const labelText = svg('text', {
		'text-anchor': 'middle',
		'dominant-baseline': 'middle'
	});
	lines.forEach((line, index) => {
		const tspan = svg('tspan', { x: 0, dy: index ? 16 : lines.length === 1 ? 0 : -8 });
		tspan.textContent = line;
		labelText.appendChild(tspan);
	});
	group.appendChild(labelText);
	return group;
}

function wrapLabel(text) {
	const words = String(text).split(/\s+/);
	const lines = [''];
	for (const word of words) {
		const current = lines[lines.length - 1];
		if (!current || `${current} ${word}`.length <= 22) {
			lines[lines.length - 1] = current ? `${current} ${word}` : word;
		} else if (lines.length < 2) {
			lines.push(word);
		} else {
			lines[lines.length - 1] = `${lines[lines.length - 1]}...`;
			break;
		}
	}
	return lines;
}

function renderNodeList() {
	nodeList.innerHTML = '';
	const visible = visibleNodeIds();
	for (const [groupName, ids] of overviewGroups) {
		const nodes = ids
			.map((id) => nodeById.get(id))
			.filter((item) => item && enabledTypes.has(item.type) && visible.has(item.id));
		if (!nodes.length) continue;
		const details = document.createElement('details');
		details.className = 'overview-group';
		details.open = !filter || nodes.some((item) => item.type === 'component');
		const componentCount = nodes.filter((item) => item.type === 'component').length;
		details.innerHTML = `
			<summary>
				<span>${escapeHtml(groupName)}</span>
				<span>${nodes.length} shown${componentCount ? ` · ${componentCount} components` : ''}</span>
			</summary>
		`;
		const groupBody = document.createElement('div');
		groupBody.className = 'overview-group-body';
		for (const item of nodes) {
			const button = document.createElement('button');
			button.type = 'button';
			button.innerHTML = `
				<span>
					<strong>${escapeHtml(item.title)}</strong>
					<small>${connectionSummary(item.id)}</small>
				</span>
				<span class="kind">${escapeHtml(item.type)}</span>
			`;
			button.addEventListener('click', () => {
				centerOn(item);
				selectItem('node', item.id);
			});
			groupBody.appendChild(button);
		}
		details.appendChild(groupBody);
		nodeList.appendChild(details);
	}
	const configuredOutNodes = mapData.nodes.filter(
		(item) => !enabledTypes.has(item.type) && visible.has(item.id)
	);
	if (configuredOutNodes.length) {
		const details = document.createElement('details');
		details.className = 'overview-group configured-out';
		details.open = true;
		details.innerHTML = `
			<summary>
				<span>Configured out</span>
				<span>${configuredOutNodes.length} grayed out</span>
			</summary>
		`;
		const groupBody = document.createElement('div');
		groupBody.className = 'overview-group-body';
		for (const item of configuredOutNodes) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = 'configured-out';
			button.innerHTML = `
				<span>
					<strong>${escapeHtml(item.title)}</strong>
					<small>${connectionSummary(item.id)}</small>
				</span>
				<span class="kind">${escapeHtml(item.type)}</span>
			`;
			button.addEventListener('click', () => {
				centerOn(item);
				selectItem('node', item.id);
			});
			groupBody.appendChild(button);
		}
		details.appendChild(groupBody);
		nodeList.appendChild(details);
	}
}

function renderStats() {
	const visible = visibleNodeIds();
	const configuredOut = mapData.nodes.filter((item) => !enabledTypes.has(item.type)).length;
	const counts = mapData.nodes.reduce((acc, item) => {
		acc[item.type] = (acc[item.type] || 0) + 1;
		return acc;
	}, {});
	const visibleEdges = mapData.edges.filter(
		(item) => visible.has(item.from) && visible.has(item.to)
	);
	stats.innerHTML = `
		<div>${visible.size} shown nodes, ${visibleEdges.length} shown connections</div>
		<div>${configuredOut} configured out and grayed</div>
		<div>${mapData.nodes.length} total nodes, ${mapData.edges.length} total connections</div>
		<div>${Object.entries(counts)
			.map(([type, count]) => `${count} ${type}`)
			.join(' · ')}</div>
		<div>${Object.keys(annotations).length} saved annotations</div>
	`;
}

function selectItem(kind, id, updateInspector = true) {
	selected = { kind, id };
	document.querySelectorAll('.selected').forEach((item) => item.classList.remove('selected'));
	if (kind === 'node') {
		document.querySelector(`.node[data-id="${cssEscape(id)}"]`)?.classList.add('selected');
	} else {
		document.querySelector(`.edge[data-id="${cssEscape(id)}"]`)?.classList.add('selected');
	}
	if (!updateInspector) return;
	const item =
		kind === 'node' ? nodeById.get(id) : mapData.edges.find((edgeItem) => edgeItem.id === id);
	if (!item) return;
	emptyInspector.hidden = true;
	detailInspector.hidden = false;
	const key = `${kind}:${id}`;
	selectedType.textContent = kind === 'node' ? item.type : 'edge';
	selectedTitle.textContent =
		kind === 'node'
			? item.title
			: `${nodeById.get(item.from)?.title ?? item.from} -> ${nodeById.get(item.to)?.title ?? item.to}`;
	selectedDescription.textContent = kind === 'node' ? item.description : item.label;
	selectedMeta.innerHTML =
		kind === 'node'
			? `<div><strong>Path:</strong> ${escapeHtml(item.path)}</div><div><strong>ID:</strong> ${escapeHtml(item.id)}</div>${connectionDetails(item.id)}`
			: `<div><strong>From:</strong> ${escapeHtml(item.from)}</div><div><strong>To:</strong> ${escapeHtml(item.to)}</div><div><strong>ID:</strong> ${escapeHtml(item.id)}</div>`;
	annotationText.value = annotations[key] || '';
}

function connectionSummary(id) {
	const incoming = mapData.edges.filter((item) => item.to === id);
	const outgoing = mapData.edges.filter((item) => item.from === id);
	return `${incoming.length} in · ${outgoing.length} out`;
}

function connectionDetails(id) {
	const incoming = mapData.edges.filter((item) => item.to === id);
	const outgoing = mapData.edges.filter((item) => item.from === id);
	return `
		<details class="connection-menu" open>
			<summary>Incoming (${incoming.length})</summary>
			${connectionButtons(incoming, 'from')}
		</details>
		<details class="connection-menu" open>
			<summary>Outgoing (${outgoing.length})</summary>
			${connectionButtons(outgoing, 'to')}
		</details>
	`;
}

function connectionButtons(edges, endpoint) {
	if (!edges.length) return `<div class="muted-row">No connections</div>`;
	return edges
		.map((item) => {
			const nodeItem = nodeById.get(item[endpoint]);
			return `<button type="button" class="connection-link" data-node-id="${escapeHtml(nodeItem.id)}">${escapeHtml(nodeItem.title)}<span>${escapeHtml(item.label)}</span></button>`;
		})
		.join('');
}

function saveSelectedAnnotation() {
	if (!selected) return;
	const key = `${selected.kind}:${selected.id}`;
	const value = annotationText.value.trim();
	if (value) annotations[key] = value;
	else delete annotations[key];
	persistAnnotations();
	render();
	selectItem(selected.kind, selected.id);
}

function removeSelectedAnnotation() {
	if (!selected) return;
	delete annotations[`${selected.kind}:${selected.id}`];
	annotationText.value = '';
	persistAnnotations();
	render();
	selectItem(selected.kind, selected.id);
}

function exportMarkdown() {
	const lines = [
		'# Open WebUI Frontend Map Annotations',
		'',
		`Exported: ${new Date().toISOString()}`,
		'',
		'## Scope',
		'',
		`Mapped ${mapData.nodes.length} nodes and ${mapData.edges.length} connections from src/routes and src/lib.`,
		'',
		'## Node Annotations',
		''
	];
	for (const item of mapData.nodes) {
		const note = annotations[`node:${item.id}`];
		if (!note) continue;
		lines.push(
			`### ${item.title}`,
			'',
			`- Type: ${item.type}`,
			`- Path: \`${item.path}\``,
			'',
			note,
			''
		);
	}
	lines.push('## Edge Annotations', '');
	for (const item of mapData.edges) {
		const note = annotations[`edge:${item.id}`];
		if (!note) continue;
		lines.push(
			`### ${nodeById.get(item.from)?.title ?? item.from} -> ${nodeById.get(item.to)?.title ?? item.to}`,
			'',
			`- Connection: ${item.label}`,
			`- From: \`${item.from}\``,
			`- To: \`${item.to}\``,
			'',
			note,
			''
		);
	}
	const markdown = lines.join('\n');
	const blob = new Blob([markdown], { type: 'text/markdown' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = 'open-webui-frontend-map-annotations.md';
	link.click();
	URL.revokeObjectURL(url);
}

function clearAnnotations() {
	if (!confirm('Clear all saved frontend map annotations from this browser?')) return;
	annotations = {};
	persistAnnotations();
	render();
	if (selected) selectItem(selected.kind, selected.id);
}

function loadAnnotations() {
	try {
		return JSON.parse(localStorage.getItem(storageKey) || '{}');
	} catch {
		return {};
	}
}

function persistAnnotations() {
	localStorage.setItem(storageKey, JSON.stringify(annotations));
}

function loadEnabledTypes() {
	const knownTypes = new Set(typeConfig.map(([type]) => type));
	try {
		const stored = JSON.parse(localStorage.getItem(typeStorageKey) || 'null');
		if (Array.isArray(stored)) {
			const enabled = stored.filter((type) => knownTypes.has(type));
			if (enabled.length) return new Set(enabled);
		}
	} catch {
		// Fall back to showing every category if the saved preference is malformed.
	}
	return new Set(knownTypes);
}

function persistEnabledTypes() {
	localStorage.setItem(typeStorageKey, JSON.stringify([...enabledTypes]));
}

function allNodeIds() {
	return new Set(mapData.nodes.map((item) => item.id));
}

function visibleNodeIds() {
	const all = allNodeIds();
	if (!filter) return all;
	const ids = new Set();
	for (const item of mapData.nodes) {
		if ([item.title, item.type, item.path, item.description, item.id].some(textMatches))
			ids.add(item.id);
	}
	for (const item of mapData.edges) {
		if (textMatches(item.label) || textMatches(item.id)) {
			ids.add(item.from);
			ids.add(item.to);
		}
	}
	return new Set([...ids].filter((id) => all.has(id)));
}

function textMatches(value) {
	return String(value || '')
		.toLowerCase()
		.includes(filter);
}

function anchor(from, to) {
	const fx = from.x + from.w / 2;
	const fy = from.y + from.h / 2;
	const tx = to.x + to.w / 2;
	const ty = to.y + to.h / 2;
	const dx = tx - fx;
	const dy = ty - fy;
	if (Math.abs(dx) > Math.abs(dy)) {
		return { x: dx > 0 ? from.x + from.w : from.x, y: fy };
	}
	return { x: fx, y: dy > 0 ? from.y + from.h : from.y };
}

function centerOn(item) {
	const rect = viewport.getBoundingClientRect();
	view.x = rect.width / 2 - (item.x + item.w / 2) * view.scale;
	view.y = rect.height / 2 - (item.y + item.h / 2) * view.scale;
	applyTransform();
}

function screenToWorldFromClient(clientX, clientY) {
	const rect = viewport.getBoundingClientRect();
	return screenToWorld(clientX - rect.left, clientY - rect.top);
}

function fitView() {
	const rect = viewport.getBoundingClientRect();
	const minX = layoutBounds.minX - 120;
	const minY = layoutBounds.minY - 120;
	const maxX = layoutBounds.maxX + 120;
	const maxY = layoutBounds.maxY + 120;
	view.scale = clamp(Math.min(rect.width / (maxX - minX), rect.height / (maxY - minY)), 0.18, 1);
	view.x = (rect.width - (maxX - minX) * view.scale) / 2 - minX * view.scale;
	view.y = (rect.height - (maxY - minY) * view.scale) / 2 - minY * view.scale;
	applyTransform();
}

function screenToWorld(x, y) {
	return { x: (x - view.x) / view.scale, y: (y - view.y) / view.scale };
}

function nodeCenter(item) {
	return { x: item.x + item.w / 2, y: item.y + item.h / 2 };
}

function applyTransform() {
	surface.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
	updateEdgeLabels();
}

function updateEdgeLabels() {
	const labelScale = 1 / clamp(view.scale, 0.34, 1.6);
	document.querySelectorAll('.edge-label').forEach((label) => {
		label.setAttribute(
			'transform',
			`translate(${label.dataset.x} ${label.dataset.y}) scale(${labelScale})`
		);
	});
}

function svg(tag, attrs) {
	const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
	for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
	return el;
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

function escapeHtml(value) {
	return String(value)
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function cssEscape(value) {
	if (window.CSS?.escape) return CSS.escape(value);
	return String(value).replace(/["\\]/g, '\\$&');
}
