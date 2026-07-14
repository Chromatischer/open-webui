# Open WebUI — Redesigned

> A personal, design-led fork of [Open WebUI](https://github.com/open-webui/open-webui) by [@Chromatischer](https://github.com/Chromatischer).
> Same powerful self-hosted AI platform underneath — reimagined around calmer typography, a single navigation rail, and a journal-like sense of place.

[![Upstream](https://img.shields.io/badge/upstream-open--webui-blue?logo=github)](https://github.com/open-webui/open-webui)
[![Container](https://img.shields.io/badge/image-ghcr.io%2Fchromatischer%2Fopen--webui-2496ED?logo=docker&logoColor=white)](https://github.com/Chromatischer/open-webui/pkgs/container/open-webui)
![Based on Open WebUI](https://img.shields.io/badge/based%20on-Open%20WebUI%20v0.9.5-success)

---

## Why this fork exists

Over time I felt Open WebUI had grown **too big, too cluttered, and too far from my core
use case**. It's an impressive project — but breadth has a cost, and the surface I touch
every day kept accumulating overhead that I didn't want. This fork is my attempt to pull
it back toward what I think a personal AI workspace should be: **small, sharp, and built
around agentic interaction.**

I will _try_ to stay updated and feature-aligned with the upstream project, but I
**retain full judgement over which features to adopt, adapt, or leave out.** Alignment is
a goal, not a promise. If a feature adds clutter without serving the core use case, it
doesn't make the cut.

> **Not affiliated.** I am in no way, shape, or form affiliated with the Open WebUI team
> or company. This is an independent personal fork. For the original, fully-supported
> project — canonical docs, releases, enterprise support, and community — go to
> **[github.com/open-webui/open-webui](https://github.com/open-webui/open-webui)**. Use
> _this_ fork only if you specifically want this redesign and its opinions.
>
> ⚠️ **Do not report bugs, issues, or feature requests for this fork to the upstream Open
> WebUI project.** They did not build this and cannot support it. Any problem you hit here
> is mine — please open it on **[this repo's issue tracker](https://github.com/Chromatischer/open-webui/issues)**
> instead. Sending fork-specific reports upstream only wastes their maintainers' time.

## Design ethos

The whole project is an exercise in **removing overhead** — mental and visual — and
keeping the experience deliberately simple. The recurring principles:

- **Dedupe everything.** One thing should live in one place. Scattered, redundant, or
  near-duplicate surfaces get merged or deleted. Fewer concepts to hold in your head.
- **Cut the ceremony.** If an action can just _happen_, it shouldn't ask permission.
  Prefer **autosave over Save buttons**. Prefer **inline editing over popup menus and
  modals**. Every confirmation step you don't need is overhead you don't pay.
- **One axis of navigation.** No two-dimensional control surfaces (top tabs _and_ a
  sidebar at once). You always know where you are because there's only one place to be.
- **Quiet by default.** Calm typography and layered surfaces do the signposting so the
  chrome can recede and the content can lead.
- **Built for agents, not just chat.** I wanted something new for the chat surface: a
  **unified editing environment** rather than a plain message log. It suits how I work
  with agents far better — and a lot of effort has gone into making the project ready for
  **fully agentic chats**, where the model acts, edits, and iterates in place rather than
  just replying.

These are principles, not a checklist — they guide what gets added, simplified, or thrown
out. A standalone reference mockup of the visual direction lives at
[`docs/admin-redesign-mockup.html`](docs/admin-redesign-mockup.html).

> The redesign is **ongoing** — expect rough edges and opinionated choices.

## Running it (Docker)

Images are published to GitHub Container Registry on every push to `main`:

```bash
docker run -d \
  -p 3000:8080 \
  -v open-webui:/app/backend/data \
  --name open-webui \
  --restart unless-stopped \
  ghcr.io/chromatischer/open-webui:main
```

Then open <http://localhost:3000>.

Available tags:

| Tag       | Tracks                                                    |
| --------- | --------------------------------------------------------- |
| `:main`   | Latest commit on the `main` branch (bleeding edge)        |
| `:stable` | The `stable` branch — promote here when you trust a build |
| `:vX.Y.Z` | A tagged release (created from `package.json` version)    |

> Configuration, environment variables, RAG, web search, voice, and every other backend
> capability work exactly as documented upstream — see the
> **[Open WebUI Documentation](https://docs.openwebui.com/)**.

## How releases are built

Pushing to `main` (or `dev`, or a `v*` tag) triggers
[`docker-build.yaml`](.github/workflows/docker-build.yaml), which builds a multi-arch
(`linux/amd64` + `linux/arm64`) image and pushes it to
`ghcr.io/chromatischer/open-webui`.

[`build-release.yml`](.github/workflows/build-release.yml) additionally cuts a GitHub
Release from the `package.json` version + `CHANGELOG.md` and dispatches the Docker build
for that tag.

**Branch model:**

- `main` — protected (PR-only, CI must pass, no force-push). Day-to-day work.
- `stable` — promote a vetted `main` here; deploy the `:stable` image in production.
- feature branches → PR into `main`.

## Building locally

```bash
git clone https://github.com/Chromatischer/open-webui.git
cd open-webui
docker build -t open-webui:dev .
```

## Credits & license

All credit for the platform itself goes to the **[Open WebUI](https://github.com/open-webui/open-webui)**
team and contributors. This fork only changes presentation and packaging. Licensed under
the same terms as upstream — see [`LICENSE`](LICENSE).
