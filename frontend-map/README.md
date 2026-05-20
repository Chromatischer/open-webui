# Open WebUI Frontend Map

Standalone local map of Open WebUI's frontend routes, component clusters, stores, API clients, and major functions.

## Open It

Open `frontend-map/index.html` directly in a browser.

If your browser blocks local downloads or storage, run a tiny server from the repository root:

```sh
python3 -m http.server 8787 --directory frontend-map
```

Then visit `http://localhost:8787`.

## What Is Mapped

The first version is based on direct inspection of:

- `src/routes`, especially `(app)`, `auth`, shared chat, watch, admin, workspace, notes, channels, calendar, automations, and playground routes.
- `src/lib/components/layout`, including the app sidebar, navbar menu, search modal, and app shell overlays.
- `src/lib/components/chat`, including `Chat.svelte`, `MessageInput.svelte`, `Messages.svelte`, `ModelSelector.svelte`, `ChatControls.svelte`, settings, and file navigation.
- `src/lib/components/admin`, including users, analytics, evaluations, functions, and settings.
- `src/lib/components/workspace`, including models, knowledge, prompts, skills, tools, editors, access control, and valves.
- `src/lib/apis`, including chats, OpenAI, retrieval, files, tasks/streaming, models, knowledge, prompts, skills, tools, users, analytics, evaluations, functions, configs, notes, channels, automations, calendar, and images.
- `src/lib/stores/index.ts`, the central Svelte store surface.

## Features

- Large navigable flow chart with cardlike nodes.
- Automatic graph balancing with connection attraction and node-distance repulsion.
- Type filters for emphasizing configured categories while graying configured-out categories.
- A dedicated Configured out sidebar group for excluded node types.
- Collapsible component overview groups in the left sidebar.
- Pan by dragging the chart.
- Drag individual nodes to manually tune the graph.
- Hold Shift while using the mouse wheel or trackpad to zoom.
- Click a node or connection to annotate it.
- Annotations persist in browser `localStorage`.
- Export saved annotations as Markdown.
- Search/filter nodes and connections.
- Screenshot placeholder node and slots; no screenshots are faked.

## Screenshot Capture Workflow

No real screenshots are included yet because this artifact does not start or authenticate the Open WebUI app.

Suggested capture process:

1. Run Open WebUI locally using the repository's normal dev workflow.
2. Log in with a local test account.
3. Capture important routes such as `/`, `/c/:id`, `/workspace/models`, `/workspace/knowledge`, `/workspace/prompts`, `/workspace/tools`, `/admin/settings`, `/admin/users`, `/notes`, `/calendar`, `/automations`, and `/playground/images`.
4. Save images under `frontend-map/screenshots/` using stable route slugs such as `chat-home.png`, `workspace-models.png`, and `admin-settings.png`.
5. Extend `app.js` node metadata to point selected nodes at the captured files.

## Limitations

- The map is a useful first-pass inventory, not a full static call graph.
- It groups many small components into screen/component/API clusters to keep the chart navigable.
- Major functions are summarized from inspected files rather than parsed into individual nodes for every handler.
- Some routes with minimal or specialized behavior, such as public/shared views and watch, are represented at screen level only.
- Screenshot support is currently placeholder-only.

## Expanding The Inventory

Add entries in `app.js`:

- Add a node with `node(id, title, type, x, y, path, description)`.
- Add an edge with `edge(fromId, toId, label)`.
- Keep IDs stable so existing browser annotations keep matching after edits.
- Prefer mapping a new screen to its route file, primary component, store/API surfaces, and the key functions that explain user-visible behavior.
