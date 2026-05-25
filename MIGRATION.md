# Migration Guide

This document lists every file that needs migrating to the design system defined in `DESIGN.md`.
Work through phases in order — later phases depend on the globals established earlier.

**Rule for agents**: read the relevant section of `DESIGN.md` before editing each file.
Replace Tailwind color/surface classes with CSS variable equivalents.
Do not break existing functionality; only change styling.

---

## Phase 0 — Global Setup (do once, required before all other phases)

**Files**: `src/app.css`

### Tasks

1. **Add design tokens** — paste the full `:root` and `.dark` variable block from `DESIGN.md §1` immediately after the existing `:root { --app-text-scale: 1; }` block.

2. **Add Atkinson font-face** — paste the `@font-face` block from `DESIGN.md §2` into `src/app.css`. This loads Atkinson Hyperlegible Next from the jsDelivr CDN. Add it after the existing `@font-face` declarations.

3. **Update `--font-message`** — in the `:root` block you just added, set:
   ```css
   --font-message: 'Atkinson Next', 'Archivo', -apple-system, BlinkMacSystemFont, sans-serif;
   ```

4. **Add `@property` registration** — paste this at the top of `src/app.css` (before all rules):
   ```css
   @property --reveal-r {
     syntax: '<length>';
     inherits: false;
     initial-value: 0px;
   }
   ```

**Verification**: open the browser console and run `getComputedStyle(document.documentElement).getPropertyValue('--bg-base')`. It should return `#f7f5f0` in light mode.

---

## Phase 1 — Auth Page

**File**: `src/routes/auth/+page.svelte`

This page currently uses raw Tailwind classes (`bg-white dark:bg-black`, `text-gray-*`, `rounded-full`).
It is self-contained (no shared layout), so it is a clean first target.

### Tasks

1. **Background**: replace `bg-white dark:bg-black` on the root div with `style="background: var(--bg-base); color: var(--text);"`.

2. **Form card surface**: the inner card div uses implicit white bg. Add `background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 16px;` via a scoped `<style>` block.

3. **Input fields**: replace classes like `bg-transparent placeholder:text-gray-300 dark:placeholder:text-gray-600 outline-hidden` with scoped CSS:
   ```css
   .field {
     width: 100%;
     padding: 10px 12px;
     border: 1.5px solid var(--border);
     border-radius: 10px;
     background: var(--bg-elevated);
     color: var(--text);
     font-family: var(--font-sans);
     font-size: 14px;
     outline: none;
     transition: border-color 0.2s;
   }
   .field:focus { border-color: var(--accent); }
   .field::placeholder { color: var(--text-tertiary); }
   ```

4. **Labels**: replace `text-sm font-medium` with `font-size: 12px; font-weight: 600; color: var(--text-secondary);`.

5. **Primary submit button**: use the `.btn-primary` pattern from `DESIGN.md §4.4` with `--accent` background.

6. **OAuth provider buttons**: replace `bg-gray-700/5 hover:bg-gray-700/10 dark:bg-gray-100/5 rounded-full` with:
   ```css
   background: var(--surface);
   border: 1px solid var(--border);
   border-radius: 10px;
   transition: background 0.15s;
   ```
   Hover: `background: var(--surface-hover);`

7. **Divider `<hr>`**: replace `dark:bg-gray-100/10 bg-gray-700/10` with `background: var(--border);`.

8. **Error/info text**: replace `text-gray-500 dark:text-gray-400` with `color: var(--text-tertiary);`.

---

## Phase 2 — Main Layout Sidebar

**File**: `src/lib/components/layout/Sidebar.svelte` (1417 lines)

This is the highest-impact file. It drives the sidebar visible on every app page.
Work section by section; the sidebar has clearly named sub-components.

### 2a — Sidebar shell

Replace the root nav element background/color Tailwind classes with:
```css
.sidebar { background: var(--bg-sidebar); color: var(--text); }
```
Remove any `dark:bg-*` and `dark:text-*` Tailwind modifiers from the root.

### 2b — Brand / logo area

Replace text color classes with `color: var(--text);` on the brand name.
Brand mark (logo square): `background: var(--accent); color: #fff;`.

### 2c — New Chat button

Apply the `.btn-primary` pattern from `DESIGN.md §4.4`:
- `background: var(--accent); color: #fff; border-radius: 10px;`
- Remove `rounded-*` Tailwind classes.

### 2d — Section headers (CHATS, WORKSPACE, etc.)

Apply the `.section-header` pattern from `DESIGN.md §4.1`:
- `font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-tertiary);`

### 2e — Workspace / pinned menu items

Apply `.nav-item` pattern from `DESIGN.md §4.2`:
- Hover: `background: var(--surface-hover); transform: translateX(2px);`
- Active: `background: var(--accent-glow); color: var(--accent);`
- Icon color on hover/active: `var(--accent)`

### 2f — Folder items

Same `.nav-item` pattern. Count badge: `font-size: 11px; color: var(--text-tertiary);`.

### 2g — Conversation list

Apply `.conv-card` pattern from `DESIGN.md §4.3`.
Apply the sliding indicator technique from `DESIGN.md §4.3` using `::before`/`::after` pseudo-elements.
Set `style:--active-index={activeIndex}` on the list container driven by the active conversation.

### 2h — Dividers

Replace `border-t border-gray-*` with `.divider` from `DESIGN.md §4.17`.

### 2i — User footer

- Avatar circle: `background: var(--accent-glow); border: 1.5px solid var(--accent); color: var(--accent);`
- Name: `font-size: 12px; font-weight: 600; color: var(--text);`
- Role: `font-size: 11px; color: var(--text-tertiary);`
- Theme toggle: apply the sun/moon crossfade pattern from `DESIGN.md §4.16`.

### 2j — Scrollbar

Add scrollbar styles from `DESIGN.md §7` to the chat list scroll container.

---

## Phase 3 — Chat Canvas

Three files work together. Edit them in this order.

### 3a — Navbar / top bar
**File**: `src/lib/components/chat/Navbar.svelte`

- Background: `background: var(--bg-base);` (remove `dark:bg-*`).
- Sidebar toggle button: apply `.btn-ghost` from `DESIGN.md §4.5`.
- Model selector / title: `color: var(--text); font-weight: 600;`
- Action icons (share, settings, etc.): `.btn-ghost` pattern.

### 3b — Message list
**File**: `src/lib/components/chat/Messages.svelte` and `src/lib/components/chat/Messages/` subdirectory

1. **Message group wrapper**: apply `.message-group` + `slideIn` animation from `DESIGN.md §4.6`.

2. **Role label**: apply `.meta-role` — `font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;`. User → `var(--orange)`, Assistant → `var(--accent)`.

3. **Message body text**: apply `.ver-text` from `DESIGN.md §4.7`. Replace `text-sm text-gray-*` classes.

4. **Thinking / reasoning block**: replace `<details>` element with the `//` prefix pattern from `DESIGN.md §4.8`.

5. **Tool call display**: apply `.toolcard` from `DESIGN.md §4.9`. Replace any pill/chip Tailwind styles.

6. **Code blocks**: background `var(--code-bg)`, border `var(--border)`, `border-radius: 10px`. Keep the existing syntax highlighter; only change the wrapper background.

7. **Generating indicator**: replace spinner/dots with `.gen-dots` from `DESIGN.md §4.15`.

8. **Scrollbar**: apply `DESIGN.md §7` to the scroll container.

9. **Max-width**: wrap the message flow in a `max-width: 720px; margin: 0 auto;` container if not already present.

### 3c — Message input / composer
**File**: `src/lib/components/chat/MessageInput.svelte`

1. **Input field**: apply `.composer-field` from `DESIGN.md §4.10`.
   - Active/focused border: `color-mix(in srgb, var(--orange) 42%, var(--border))`
   - Focus ring: a `::before` pseudo with double orange shadow (see `DESIGN.md §4.10`).

2. **Send button**: apply `.composer-send` from `DESIGN.md §4.11`.
   - Add the `planeTakeoff` + `contrail` animations from the source in `ChatCanvas.svelte` lines 1494–1523.
   - Button is 0.34 opacity until `inputValue.trim()` is non-empty; transition to `opacity: 1`.

3. **Attachment / tool buttons**: apply `.btn-ghost` from `DESIGN.md §4.5`.

4. **Composer background**: the composer area should be `background: var(--bg-base);` matching the page (not a distinct card).

---

## Phase 4 — Workspace Pages

**Layout file**: `src/routes/(app)/workspace/+layout.svelte`
**Page files**: `src/routes/(app)/workspace/{models,prompts,knowledge,tools,skills}/+page.svelte` (and sub-routes)

### 4a — Layout shell

Replace the `flex flex-col h-screen` div background with `background: var(--bg-base);`.
Remove any explicit `dark:bg-*` background classes from the layout root.

### 4b — Sub-nav tabs (Models / Prompts / Knowledge / Tools / Skills)

Replace the rounded tab row with:
```css
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
.tab-btn:hover { color: var(--text-secondary); }
.tab-btn.active { color: var(--accent); border-bottom-color: var(--accent); }
```

### 4c — List items (model cards, prompt rows, etc.)

Replace `bg-gray-* dark:bg-gray-*` card backgrounds with `background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 12px;`.
Hover: `border-color: var(--border-hover); background: var(--surface-hover);`.

### 4d — Create / Edit forms

- Label: `font-size: 12px; font-weight: 600; color: var(--text-secondary);`
- Input/textarea: same as Phase 1 `.field` pattern.
- Primary action button: `.btn-primary` with `--accent`.
- Destructive button: same shape but `background: transparent; color: #e55;` (no variable for destructive yet).

---

## Phase 5 — Admin Pages

**Layout file**: `src/routes/(app)/admin/+layout.svelte`
**Page files**: `src/routes/(app)/admin/{settings,users,evaluations,analytics,functions}/+page.svelte`

Admin pages follow the same patterns as workspace (Phase 4) but have more data-dense tables.

### 5a — Layout shell

Same treatment as Phase 4a.

### 5b — Sub-nav tabs

Same treatment as Phase 4b. Tab labels: Settings, Users, Evaluations, Analytics, Functions.

### 5c — Data tables

Replace `divide-y divide-gray-*` table rows with:
```css
.data-row {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  gap: 12px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: background 0.15s;
}
.data-row:hover { background: var(--surface-hover); }
.data-row .label { font-weight: 600; color: var(--text); }
```

### 5d — Status badges

Replace color Tailwind pill classes with:
```css
.badge { padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.badge.active  { background: rgba(45,159,82,0.12); color: var(--success); }
.badge.pending { background: var(--orange-soft);   color: var(--orange); }
.badge.default { background: var(--surface-active); color: var(--text-tertiary); }
```

### 5e — Settings toggle switches

Keep existing toggle components; only replace surrounding label text color with `var(--text-secondary)` and description color with `var(--text-tertiary)`.

---

## Phase 6 — Notes

**Files**:
- `src/routes/(app)/notes/+page.svelte` (list view)
- `src/routes/(app)/notes/[id]/+page.svelte` (editor)
- `src/routes/(app)/notes/new/+page.svelte`

### 6a — Note list

Apply `.conv-card` from `DESIGN.md §4.3` to note list items (title + preview snippet).

### 6b — Note editor

Apply the scratchboard pattern from `DESIGN.md §8`:
- Preview mode (markdown rendered): `font-family: var(--font-message); padding: 24px; cursor: text;`
- Edit mode (textarea): transparent bg, no border, gutter with line numbers.
- Use the autosave status dot pattern (`idle → saving → saved`).

### 6c — Toolbar

Apply `.btn-ghost` from `DESIGN.md §4.5` to formatting buttons.

---

## Phase 7 — Home / Playground / Calendar / Channels / Automations

These are lower-priority. Apply general rules:

| Pattern to replace | Use instead |
|---|---|
| `bg-white dark:bg-gray-900` | `background: var(--bg-base)` |
| `bg-gray-100 dark:bg-gray-800` | `background: var(--surface)` |
| `text-gray-900 dark:text-white` | `color: var(--text)` |
| `text-gray-600 dark:text-gray-400` | `color: var(--text-secondary)` |
| `text-gray-400 dark:text-gray-600` | `color: var(--text-tertiary)` |
| `border-gray-200 dark:border-gray-700` | `border-color: var(--border)` |
| `rounded-lg` on interactive items | `border-radius: 10px` |
| `rounded-full` on buttons | `border-radius: 10px` (not pill — prefer 10px) |
| `hover:bg-gray-100 dark:hover:bg-gray-850` | `background: var(--surface-hover)` |

Apply these find-and-replace rules file by file. No structural changes needed for this phase.

**Files**:
- `src/routes/(app)/home/+page.svelte`
- `src/routes/(app)/playground/+page.svelte` (and sub-routes)
- `src/routes/(app)/calendar/+page.svelte`
- `src/routes/(app)/channels/[id]/+page.svelte`
- `src/routes/(app)/automations/+page.svelte`

---

## Out of Scope (do not touch)

| File | Reason |
|---|---|
| `src/routes/design/*` | Source of truth — never migrate, only read |
| `src/routes/error/+page.svelte` | Minimal page, low user visibility |
| `src/routes/watch/+page.svelte` | Video watch view, separate concern |
| `src/routes/s/[id]/+page.svelte` | Shared-chat public view, separate concern |
| `src/lib/components/design/*` | Reference implementation |

---

## Common Mistakes to Avoid

1. **Leaving `dark:` Tailwind modifiers alongside CSS variables** — pick one system per element. During migration, once a section is converted to vars, remove the old `dark:*` classes entirely.

2. **Using `background-color: white`** — always use `var(--bg-elevated)` or `var(--bg-base)`.

3. **Hard-coding gray hex values** — always use the semantic variable. If there's no exact match, use `color-mix(in srgb, var(--text-tertiary) 60%, transparent)` to derive it.

4. **Forgetting `color: var(--text)` on newly styled containers** — CSS inheritance means unstyled children may pick up Tailwind's default text color instead of the new token.

5. **Adding new Tailwind utility classes** to migrated components — once a component is migrated, style additions must also use CSS variables, not Tailwind.

6. **Not testing dark mode** — after migrating each phase, toggle dark mode and verify the component looks correct. The `.dark` class is on `<html>` or the root element.
