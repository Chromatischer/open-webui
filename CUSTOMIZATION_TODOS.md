# Open WebUI Customization Todos

## Route And Feature Removal

- [x] Disable or remove public shared chat route: `src/routes/s/[id]/+page.svelte`.
- [ ] Remove Workspace prompts screen: `src/routes/(app)/workspace/prompts/+page.svelte`.
- [ ] Remove Notes screen: `src/routes/(app)/notes/+page.svelte`.
- [ ] Remove Automations screen: `src/routes/(app)/automations/+page.svelte`.
- [ ] Remove Calendar screen: `src/routes/(app)/calendar/+page.svelte`.

## Navigation Cleanup

- [x] Remove duplicate Workspace option from the profile menu and sidebar.
- [ ] Remove the profile submenu.

## Workspace UI

- [x] Make all Open WebUI community mentions smaller and less pronounced.
- [x] Move Open WebUI community into the existing pill row as a normal pill.

## Settings IA

- [x] Cut the Audio section from Settings.
- [x] Merge Account and General settings.
- [x] Rename Interface to Design.
- [x] Make Design unfold into its subsections.
- [ ] Leave About for a later pass.
- [x] Move Code execution from Integration to More.

## Product Primitives

- [ ] Add Memory support as a first-order primitive, similar to ChatGPT.
- [x] Add OpenRouter as a first-order primitive for Connections.
- [x] Add OpenRouter support for Image generation.

## Admin

- [ ] Rework Admin Evaluations; current screen is not useful enough.
