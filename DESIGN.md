# Design System Spec

Source of truth: `src/routes/design/+page.svelte` and `src/lib/components/design/`.
This document is the contract for migrating the rest of the app to match.

---

## 1. CSS Variables

Paste the full block below into `src/app.css` after the existing `:root` block.
The `.dark` class is toggled on any ancestor element (the app root or `<html>`).

```css
/* ── Design system tokens ───────────────────────────────── */
:root {
	--sidebar-w: 260px;

	/* Backgrounds */
	--bg-sidebar: #e8e4db;
	--bg-base: #f7f5f0;
	--bg-elevated: #ffffff;

	/* Surfaces (overlays on top of bg) */
	--surface: rgba(0, 0, 0, 0.025);
	--surface-hover: rgba(0, 0, 0, 0.05);
	--surface-active: rgba(0, 0, 0, 0.08);

	/* Borders */
	--border: rgba(0, 0, 0, 0.06);
	--border-hover: rgba(0, 0, 0, 0.12);

	/* Text */
	--text: #2a2927;
	--text-secondary: #6b6964;
	--text-tertiary: #a9a69d;

	/* Brand accent (periwinkle – AI, selections, active states) */
	--accent: #7b7ef6;
	--accent-glow: rgba(123, 126, 246, 0.12);
	--accent-soft: #9fa1f9;

	/* Orange (user messages, send button, active composer) */
	--orange: #e8730a;
	--orange-glow: rgba(232, 115, 10, 0.14);
	--orange-soft: rgba(232, 115, 10, 0.06);

	/* Semantic */
	--success: #2d9f52;
	--code-bg: #f3f1ec;
	--shadow-color: rgba(0, 0, 0, 0.06);

	/* Highlight / text mark (amber-yellow) */
	--highlight: #ffe082;
	--highlight-glow: rgba(255, 224, 130, 0.3);

	/* Typography */
	--font-sans: 'Archivo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	--font-serif: 'InstrumentSerif', Georgia, serif;
	--font-message: 'Archivo', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	/* Override --font-message to Atkinson when that font is available */

	--message-font-size: 15.5px;
	--message-font-weight: 440;
	--message-line-height: 1.55;
}

.dark {
	--bg-sidebar: #141312;
	--bg-base: #1e1d1c;
	--bg-elevated: #252422;

	--surface: rgba(255, 255, 255, 0.03);
	--surface-hover: rgba(255, 255, 255, 0.05);
	--surface-active: rgba(255, 255, 255, 0.07);

	--border: rgba(255, 255, 255, 0.06);
	--border-hover: rgba(255, 255, 255, 0.1);

	--text: #f0eeeb;
	--text-secondary: #a09e99;
	--text-tertiary: #6e6c67;

	--accent: #9fa1f9;
	--accent-glow: rgba(159, 161, 249, 0.15);
	--accent-soft: #bbbcfb;

	--orange: #f5a04c;
	--orange-glow: rgba(245, 160, 76, 0.14);
	--orange-soft: rgba(245, 160, 76, 0.06);

	--success: #43c778;
	--code-bg: #1a1918;
	--shadow-color: rgba(0, 0, 0, 0.3);

	--highlight: #c9a84c;
	--highlight-glow: rgba(201, 168, 76, 0.2);
}
```

> **Dark mode**: the existing app uses `class="dark"` on `<html>`. Keep that.
> The design tokens are additive — existing Tailwind classes still work alongside them
> during incremental migration.

---

## 2. Typography

### Fonts already available

`src/app.css` already registers these font-face declarations:

- **Archivo** — use as `--font-sans` (UI chrome, labels, buttons)
- **InstrumentSerif** — use as `--font-serif` (quotes, annotation previews, empty states)

### Atkinson Hyperlegible Next (message body)

Add this `@font-face` to `src/app.css` for best message legibility:

```css
@font-face {
	font-family: 'Atkinson Next';
	font-style: normal;
	font-display: swap;
	font-weight: 200 800;
	src: url('https://cdn.jsdelivr.net/fontsource/fonts/atkinson-hyperlegible-next:vf@latest/latin-wght-normal.woff2')
		format('woff2-variations');
}
```

Then set `--font-message: 'Atkinson Next', 'Archivo', sans-serif;` in `:root`.

### Scale

| Role                 | Size                           | Weight                        | Line-height                    |
| -------------------- | ------------------------------ | ----------------------------- | ------------------------------ |
| Section header label | 10px                           | 700                           | —                              |
| Sidebar item         | 12–13px                        | 500–600                       | —                              |
| Meta role label      | 11px                           | 600                           | —                              |
| Message body         | `--message-font-size` (15.5px) | `--message-font-weight` (440) | `--message-line-height` (1.55) |
| Code / monospace     | 13px                           | 400                           | 1.65                           |
| Thinking block       | 11px                           | 400                           | 1.6                            |

---

## 3. Layout

### Root shell

```css
.root {
	position: fixed;
	inset: 0;
	background: var(--bg-sidebar);
	color: var(--text);
	overflow: hidden;
	font-family: var(--font-sans);
}
```

### Sidebar layer + app shell (the "peeled app" pattern)

The sidebar sits at `z-index: 0` always rendered. The app shell (`z-index: 1`) covers it.
Opening slides the shell right by `--sidebar-w`, rounds its corners to `20px`, adds a shadow.

```css
.sidebar-layer {
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	width: var(--sidebar-w);
	z-index: 0;
}

.app-shell {
	position: absolute;
	inset: 0;
	z-index: 1;
	background: var(--bg-base);
	transform: translateX(0);
	border-radius: 0;
	transition:
		transform 0.38s cubic-bezier(0.16, 1, 0.3, 1),
		box-shadow 0.38s cubic-bezier(0.16, 1, 0.3, 1),
		border-radius 0.38s cubic-bezier(0.16, 1, 0.3, 1);
	overflow: hidden;
}

.app-shell.open {
	border-radius: 20px;
	transform: translateX(var(--sidebar-w));
	box-shadow: -12px 0 48px rgba(0, 0, 0, 0.22);
}
```

### Content grid (chat + scratchboard)

```css
.content-grid {
	display: grid;
	grid-template-columns: 1fr minmax(340px, 32vw);
	height: 100%;
}
```

### Proximity notch

A sidebar-colored button that acts as a visual "hole" in the app shell.
Width grows 12→40px, height 52→84px as cursor approaches left edge within 80px.

```css
.notch {
	position: absolute;
	left: 0;
	transform: translateY(-50%);
	z-index: 2;
	background: var(--bg-sidebar);
	border: none;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--text-tertiary);
	box-shadow:
		inset -10px 0 18px rgba(0, 0, 0, 0.13),
		inset 0 6px 12px rgba(0, 0, 0, 0.07),
		inset 0 -6px 12px rgba(0, 0, 0, 0.05);
	transition:
		width 0.14s ease-out,
		height 0.14s ease-out,
		border-radius 0.14s ease-out;
}
```

Width/height/border-radius are set via `style:` bindings driven by cursor proximity math:

```js
let proximity = Math.max(0, Math.min(1, 1 - cursorX / 80));
let notchW = 12 + proximity * 28; // 12 → 40
let notchH = 52 + proximity * 32; // 52 → 84
// border-radius: "0 {notchW}px {notchW}px 0" (right side only)
```

---

## 4. Component Patterns

### 4.1 Section header label

```html
<div class="section-header">
	<!-- optional SVG icon 13×13 -->
	<span>Label</span>
</div>
```

```css
.section-header {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 10px;
	font-weight: 700;
	text-transform: uppercase;
	letter-spacing: 0.08em;
	color: var(--text-tertiary);
	padding: 0 4px;
	margin-top: 6px;
}
```

### 4.2 Sidebar nav item (workspace / folder item)

```html
<a class="nav-item" href="...">
	<span class="nav-icon"><!-- SVG 13×13 --></span>
	<span class="nav-label">Label</span>
</a>
```

```css
.nav-item {
	display: flex;
	align-items: center;
	gap: 8px;
	min-height: 30px;
	padding: 5px 8px;
	border-radius: 8px;
	background: transparent;
	border: none;
	font-size: 13px;
	font-weight: 500;
	color: var(--text-secondary);
	text-decoration: none;
	cursor: pointer;
	transition:
		background 0.15s,
		color 0.15s,
		transform 0.24s cubic-bezier(0.16, 1, 0.3, 1);
}
.nav-item:hover {
	background: var(--surface-hover);
	color: var(--text);
	transform: translateX(2px);
}
.nav-item.active {
	background: var(--accent-glow);
	color: var(--accent);
	transform: translateX(2px);
}
.nav-icon {
	color: var(--text-tertiary);
}
.nav-item:hover .nav-icon,
.nav-item.active .nav-icon {
	color: var(--accent);
}
```

### 4.3 Conversation card

```css
.conv-card {
	display: flex;
	flex-direction: column;
	gap: 3px;
	width: 100%;
	height: 48px; /* --conv-row-h */
	padding: 7px 8px 7px 12px;
	border-radius: 6px;
	background: transparent;
	border: none;
	color: var(--text-secondary);
	text-align: left;
	font-family: inherit;
	cursor: pointer;
	overflow: hidden;
	transition:
		color 0.15s,
		background 0.15s;
}
.conv-card:hover {
	color: var(--text);
	background: color-mix(in srgb, var(--surface-hover) 55%, transparent);
}
.conv-card.active {
	color: var(--text);
}

.conv-title {
	font-size: 12px;
	font-weight: 600;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.conv-summary {
	font-size: 11.5px;
	line-height: 1.35;
	color: var(--text-tertiary);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.conv-meta {
	font-size: 10px;
	color: var(--text-tertiary);
	flex: none;
}
```

**Sliding active indicator** (CSS-only, `::before` = track, `::after` = pip):

```css
.conversation-list {
	--conv-row-h: 48px;
	--conv-gap: 1px;
	--active-index: 0; /* set via style:--active-index={idx} */
	position: relative;
}
.conversation-list::before {
	content: '';
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	width: 2px;
	border-radius: 999px;
	background: color-mix(in srgb, var(--border) 90%, transparent);
	pointer-events: none;
}
.conversation-list::after {
	content: '';
	position: absolute;
	left: 0;
	top: 0;
	width: 2px;
	height: var(--conv-row-h);
	border-radius: 999px;
	background: var(--accent);
	transform: translateY(calc(var(--active-index) * (var(--conv-row-h) + var(--conv-gap))));
	transition: transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
	pointer-events: none;
}
```

### 4.4 Primary button (CTA / new chat)

```css
.btn-primary {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 12px;
	border-radius: 10px;
	background: var(--accent);
	color: #fff;
	border: none;
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	transition:
		filter 0.2s,
		transform 0.1s;
}
.btn-primary:hover {
	filter: brightness(1.15);
}
.btn-primary:active {
	transform: scale(0.98);
}
```

### 4.5 Ghost / icon button

```css
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
```

### 4.6 Message group

```css
.message-group {
	display: flex;
	flex-direction: column;
	gap: 6px;
	animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
	opacity: 0;
	transform: translateY(6px);
}
@keyframes slideIn {
	to {
		opacity: 1;
		transform: translateY(0);
	}
}

/* Meta line: role label + version pills + annotation count */
.meta-line {
	display: flex;
	align-items: center;
	gap: 10px;
	padding-left: 2px;
}
.meta-role {
	font-size: 11px;
	font-weight: 600;
	letter-spacing: 0.06em;
	text-transform: uppercase;
}
.message-group.user .meta-role {
	color: var(--orange);
}
.message-group.ai .meta-role {
	color: var(--accent);
}
```

### 4.7 Message body text

```css
.ver-text {
	font-size: var(--message-font-size);
	line-height: var(--message-line-height);
	color: var(--text);
	font-family: var(--font-message);
	font-weight: var(--message-font-weight);
	white-space: pre-wrap;
}
```

### 4.8 Thinking block

Collapsed by default to one ellipsis line; click expands.

```html
<div
	class="thinking"
	class:open="{isOpen}"
	onclick="{toggle}"
	role="button"
	tabindex="0"
	aria-expanded="{isOpen}"
>
	<span class="think-slash">//</span>
	<span class="think-content">{text}</span>
</div>
```

```css
.thinking {
	display: flex;
	align-items: flex-start;
	gap: 5px;
	cursor: pointer;
	color: var(--text-tertiary);
	font-size: 11px;
	font-family: ui-monospace, 'JetBrains Mono', monospace;
	line-height: 1.6;
	transition: color 0.15s;
	user-select: none;
}
.thinking:hover {
	color: var(--text-secondary);
}

.think-slash {
	flex: none;
	opacity: 0.38;
	font-weight: 700;
	letter-spacing: -1px;
}
.think-content {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.thinking.open .think-content {
	white-space: pre-wrap;
	overflow: visible;
	text-overflow: clip;
}
```

### 4.9 Tool call card

```css
.toolcard {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	padding: 6px 12px;
	border-radius: 8px;
	background: var(--surface);
	border: 1px solid var(--border);
	font-size: 12px;
	transition:
		background 0.2s,
		border-color 0.2s,
		transform 0.2s;
}
.toolcard:hover {
	background: var(--surface-hover);
	border-color: var(--border-hover);
	transform: translateY(-1px);
}
.tool-name {
	font-weight: 600;
	color: var(--text);
}
.tool-status {
	font-size: 10px;
	padding: 1px 5px;
	border-radius: 3px;
	background: var(--surface-active);
	color: var(--text-tertiary);
}
.tool-status.done {
	background: rgba(45, 159, 82, 0.15);
	color: var(--success);
}
```

### 4.10 Composer input

```css
.composer-field {
	flex: 1;
	padding: 12px 14px;
	border: 1.5px solid var(--border);
	border-radius: 12px 5px 5px 12px;
	background: var(--bg-elevated);
	color: var(--text);
	font-family: var(--font-message);
	font-size: var(--message-font-size);
	font-weight: var(--message-font-weight);
	line-height: var(--message-line-height);
	resize: none;
	outline: none;
	transition: border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.composer-field:focus,
.composer.active .composer-field {
	border-color: color-mix(in srgb, var(--orange) 42%, var(--border));
}
```

### 4.11 Send button (orange, plane takeoff animation)

```css
.composer-send {
	width: 48px;
	border-radius: 5px 12px 12px 5px;
	background: var(--orange);
	color: #fff;
	border: 1.5px solid color-mix(in srgb, var(--orange) 76%, black);
	box-shadow: inset 1px 0 0 rgba(255, 255, 255, 0.14);
	display: grid;
	place-items: center;
	cursor: pointer;
	opacity: 0.34;
	transition:
		opacity 0.2s,
		background 0.2s,
		box-shadow 0.25s;
}
.composer-send.visible {
	opacity: 1;
	box-shadow:
		inset 1px 0 0 rgba(255, 255, 255, 0.18),
		0 3px 14px var(--orange-glow);
}
.composer-send.visible:hover {
	background: color-mix(in srgb, var(--orange) 88%, white);
}
```

### 4.12 Text highlights (marks)

Marks are rendered as `<mark class="text-mark">` with randomized CSS vars for angle/offset/height.

```css
:global(mark.text-mark) {
	background: transparent;
	color: inherit;
	border-radius: 2px;
	padding: 0 2px;
	margin: 0 -1px;
	box-decoration-break: clone;
	-webkit-box-decoration-break: clone;
	position: relative;
	isolation: isolate;
}
:global(mark.text-mark::before) {
	content: '';
	position: absolute;
	left: -0.08em;
	right: -0.08em;
	top: calc((1 - var(--mark-height)) * 100% + (var(--mark-offset) * 1em));
	height: calc(var(--mark-height) * 1em);
	z-index: -1;
	border-radius: 0.18em 0.28em 0.16em 0.24em;
	background: linear-gradient(
		100deg,
		color-mix(in srgb, var(--highlight) 42%, transparent) 0%,
		color-mix(in srgb, var(--highlight) 82%, transparent) 22%,
		color-mix(in srgb, var(--highlight) 74%, transparent) 70%,
		color-mix(in srgb, var(--highlight) 38%, transparent) 100%
	);
	clip-path: polygon(0 22%, 98% 4%, 100% 82%, 2% 100%);
	transform: rotate(var(--mark-angle));
	animation: markerSwipe 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes markerSwipe {
	from {
		clip-path: inset(0 100% 0 0 round 0.18em);
	}
	to {
		clip-path: inset(0 0 0 0 round 0.18em);
	}
}
```

Random values per mark (generate in JS when mark is created):

```js
angle: Number((Math.random() * 2.8 - 1.4).toFixed(2)); // deg, ±1.4
offset: Number((Math.random() * 0.14 - 0.07).toFixed(3)); // em, ±0.07
height: Number((0.56 + Math.random() * 0.14).toFixed(3)); // 0.56–0.70
```

Apply as inline style on the `<mark>`:

```html
<mark
	class="text-mark"
	style="--mark-angle:{angle}deg; --mark-offset:{offset}; --mark-height:{height}"
></mark>
```

### 4.13 Annotation chip

```css
.ann-chip {
	display: inline-flex;
	align-items: center;
	gap: 5px;
	padding: 3px 7px 3px 6px;
	border-radius: 6px;
	background: color-mix(in srgb, var(--highlight) 30%, transparent);
	border: 1px solid color-mix(in srgb, var(--highlight) 52%, transparent);
	font-size: 11.5px;
	color: var(--text-secondary);
	animation: annPop 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ann-dot {
	width: 5px;
	height: 5px;
	border-radius: 50%;
	background: color-mix(in srgb, var(--highlight) 90%, #a07000);
	flex: none;
}
@keyframes annPop {
	from {
		opacity: 0;
		transform: scale(0.88);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}
```

### 4.14 Selection popup

Float above/below selected text. No box-shadow on container; use `filter: drop-shadow()` on the action row so gaps are transparent.

```css
.sel-popup {
	position: fixed;
	z-index: 100;
	background: transparent;
	border: none;
	box-shadow: none;
	animation: popIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}
.sel-quick-actions {
	display: flex;
	align-items: stretch;
	gap: 5px;
	height: 44px;
	filter: drop-shadow(0 8px 24px var(--shadow-color));
}
.sel-mark-btn {
	width: 40px;
	border-radius: 10px;
	background: var(--highlight);
	border: 1px solid color-mix(in srgb, var(--highlight) 74%, var(--border-hover));
	box-shadow: 0 8px 24px var(--highlight-glow);
	color: color-mix(in srgb, var(--text) 82%, #6b4e00);
	cursor: pointer;
}
@keyframes popIn {
	from {
		opacity: 0;
		transform: translateY(6px) scale(0.96);
	}
	to {
		opacity: 1;
		transform: translateY(0) scale(1);
	}
}
```

### 4.15 Generating / typing indicator

```html
<div class="gen-dots">
	<span style="animation-delay:0s"></span>
	<span style="animation-delay:0.14s"></span>
	<span style="animation-delay:0.28s"></span>
</div>
```

```css
.gen-dots {
	display: flex;
	gap: 5px;
	padding: 10px 2px;
}
.gen-dots span {
	width: 5px;
	height: 5px;
	border-radius: 50%;
	background: var(--accent);
	animation: genBounce 1.3s infinite ease-in-out both;
	opacity: 0.3;
}
@keyframes genBounce {
	0%,
	80%,
	100% {
		transform: scale(0.4);
		opacity: 0.3;
	}
	40% {
		transform: scale(1);
		opacity: 1;
	}
}
```

### 4.16 Theme toggle button (sun/moon crossfade)

Two SVGs overlaid, the inactive one rotates 180° and scales out.

```css
.theme-btn {
	position: relative;
	width: 28px;
	height: 28px;
	border-radius: 7px;
	overflow: hidden;
	display: grid;
	place-items: center;
}
.theme-btn svg {
	position: absolute;
	transition:
		transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
		opacity 0.35s;
}

/* Light mode: show moon */
.icon-sun {
	transform: rotate(-180deg) scale(0.5);
	opacity: 0;
}
.icon-moon {
	transform: rotate(0deg) scale(1);
	opacity: 1;
}

/* Dark mode: show sun */
.is-dark .icon-sun {
	transform: rotate(180deg) scale(1);
	opacity: 1;
}
.is-dark .icon-moon {
	transform: rotate(180deg) scale(0.5);
	opacity: 0;
}
```

### 4.17 Divider

```css
.divider {
	height: 1px;
	background: var(--border);
	margin: 6px 4px;
}
```

---

## 5. Animation Conventions

| Purpose              | Duration             | Easing                                     |
| -------------------- | -------------------- | ------------------------------------------ |
| Standard enter/leave | 0.18–0.24s           | `cubic-bezier(0.16, 1, 0.3, 1)` (fast-out) |
| Spring / overshoot   | 0.38s                | `cubic-bezier(0.34, 1.56, 0.64, 1)`        |
| Height transitions   | 0.22–0.28s           | `cubic-bezier(0.25, 0.46, 0.45, 0.94)`     |
| Slide-in (messages)  | 0.40s                | `cubic-bezier(0.16, 1, 0.3, 1)`            |
| Version content fly  | 380ms in / 340ms out | `quintOut`                                 |
| App shell slide      | 0.38s                | `cubic-bezier(0.16, 1, 0.3, 1)`            |

All transitions default to the fast-out curve unless overshoot is desired (spring).

---

## 6. Theme Ripple (dark ↔ light switch)

Requires the `@property` registration in the page `<style>`:

```css
@property --reveal-r {
	syntax: '<length>';
	inherits: false;
	initial-value: 0px;
}
```

JS: create a fixed overlay with the old background, mask it with a radial-gradient hole
that grows from 0 to `maxR`, then remove overlay.

```js
function triggerThemeRipple(e, oldBg) {
  const x = /* click center X */, y = /* click center Y */;
  const maxR = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const gradient = `radial-gradient(circle var(--reveal-r) at ${x}px ${y}px, transparent 99.9%, black 100%)`;
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;inset:0;z-index:9999;pointer-events:none;
    background:${oldBg};--reveal-r:0px;
    mask-image:${gradient};-webkit-mask-image:${gradient}`;
  document.body.appendChild(el);
  // switch theme here (synchronously with flushSync if in Svelte)
  el.animate([{'--reveal-r':'0px'}, {'--reveal-r':`${maxR}px`}],
    { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
    .finished.then(() => el.remove());
}
```

---

## 7. Scrollbar Style

Apply to any scrollable container:

```css
.scrollable {
	scrollbar-width: thin;
	scrollbar-color: color-mix(in srgb, var(--text-secondary) 72%, transparent) transparent;
}
.scrollable::-webkit-scrollbar {
	width: 17px;
}
.scrollable::-webkit-scrollbar-track {
	background: transparent;
}
.scrollable::-webkit-scrollbar-thumb {
	background-color: color-mix(in srgb, var(--text-secondary) 72%, transparent);
	border: 2px solid transparent;
	border-radius: 999px;
	background-clip: content-box;
}
.scrollable::-webkit-scrollbar-thumb:hover {
	background-color: color-mix(in srgb, var(--text) 78%, transparent);
}
```

---

## 8. Scratchboard / Note Editor Pattern

Two-state component: click preview → textarea, blur → back to preview.

```
[markdown preview — cursor: text, clicks to enter edit mode]
  ↕ click / blur
[textarea with line-number gutter — no border, transparent bg]
```

Autosave: debounce ~480ms, status dot cycles: `idle → saving (pulse) → saved (green, 1.4s) → idle`.

---

## 9. What NOT to do

- Do not use `bg-gray-*` Tailwind classes in migrated components. Replace with `--bg-*` variables.
- Do not add `box-shadow` to the selection popup container. Use `filter: drop-shadow()`.
- Do not animate `color` or `background` directly during streaming — animate height via MutationObserver + rAF.
- Do not use `<details>` for thinking blocks. Use the `//` prefix div pattern (section 4.8).
- Do not put version switcher buttons in the content area. They belong in the meta-line.
- Do not round-trip `Math.random()` for mark aesthetics on every render. Compute angle/offset/height once when the mark is created and store them.
