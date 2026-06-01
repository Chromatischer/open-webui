# AGENTS.md

Guidance for AI agents (Claude Code, etc.) working in this repository. This is a
**personal, design-led fork** of Open WebUI — read it before making or shipping changes.

## Before you push — advise the target branch

**Never push without first telling the user which branch is appropriate and why.** Pushing
to `main`, `dev`, or a `v*` tag triggers a multi-arch Docker image build/publish, so the
target is not a throwaway decision. Stop and recommend one of:

- **Feature branch → PR into `main`** _(default for day-to-day work)._ `main` is
  **protected**: PR-only, CI must pass, no force-push. Do **not** push commits directly to
  `main` — branch off, push the feature branch, open a PR. Merging publishes the `:main`
  (bleeding-edge) image.
- **`dev`** — integration / trying things out, including exercising the image build
  pipeline, without disturbing `main`. Also publishes a Docker image. Use when work isn't
  ready for a `main` PR but you want it built/shared.
- **`stable`** — **promotion only.** Push here to advance an already-vetted commit that you
  trust for production; it deploys the `:stable` image. Never push fresh, unreviewed work
  to `stable`.

When the user says "push" without specifying, state your recommendation (usually: feature
branch + PR into `main`) and confirm before proceeding.

## Run checks locally before pushing

CI runs these exact steps and will fail the PR if they produce changes or errors. Run them
locally first — especially `i18n:parse`, which is the easiest to forget (adding/removing a
user-facing string changes the locale catalogs).

```bash
# Frontend — mirrors the "Format & Build Frontend" job:
npm run format          # prettier write across the repo
npm run i18n:parse      # regenerate i18n locale catalogs for new/removed strings
git diff --exit-code    # MUST be clean — commit anything format/i18n produced
npm run build           # production build must succeed

# Frontend unit tests — mirrors "Frontend Unit Tests":
npm run test:frontend   # vitest

# Backend format — mirrors "Format Backend":
ruff format --check . --exclude .venv --exclude venv
# (to auto-fix: ruff format . --exclude .venv --exclude venv  /  npm run format:backend)
```

If you touched any user-facing string, run `npm run i18n:parse` and **commit the resulting
`src/lib/i18n/locales/**/translation.json`changes** — otherwise CI's`git diff --exit-code` step fails.

## Design ethos

This fork is an exercise in **removing overhead** — mental and visual — and keeping the
experience deliberately simple. Treat these as guiding principles when adding, simplifying,
or removing anything (not a rigid checklist):

- **Dedupe everything.** One thing lives in one place. Scattered, redundant, or
  near-duplicate surfaces get merged or deleted. Fewer concepts to hold in your head.
- **Cut the ceremony.** If an action can just _happen_, it shouldn't ask permission. Prefer
  **autosave over Save buttons**, **inline editing over popup menus and modals**. Every
  confirmation step you don't need is overhead you don't pay.
- **One axis of navigation.** No two-dimensional control surfaces (top tabs _and_ a sidebar
  at once). You always know where you are because there's only one place to be.
- **Quiet by default.** Calm typography and layered surfaces do the signposting so the
  chrome can recede and the content can lead.
- **Built for agents, not just chat.** A unified editing environment rather than a plain
  message log, ready for fully agentic chats where the model acts, edits, and iterates in
  place rather than just replying.

Build on the design-token system in `src/app.css` (`--bg-base`, `--bg-elevated`,
`--surface*`, `--border*`, `--text*`, `--accent` periwinkle `#7b7ef6`, `--accent-glow`,
Archivo font) and the shared `ws-*` workspace classes. A reference mockup of the visual
direction lives at [`docs/admin-redesign-mockup.html`](docs/admin-redesign-mockup.html).
See the [README](README.md#design-ethos) for the canonical statement of these principles.
