# Source Development Migration

This checkout is configured to run as a source development instance without Docker.

## Runtime support

- Node.js: local Node 24 is supported by the project engine gate (`>=18.13.0 <=24.x.x`).
- Python: use CPython 3.12.13 for local source development.

The local npm config does not enforce dependency engine gates. This is required because `i18next-parser@9.4.0` has no Node 24-compatible release metadata and is deprecated in favor of `i18next-cli`; replacing that parser is a separate i18n tooling migration.

Python 3.14 is not currently supportable for this dependency set. A resolver probe with CPython 3.14.5 fails because `psycopg[binary]==3.2.9` requires `psycopg-binary==3.2.9`, and that wheel is not published for the `cp314` ABI. The available wheel ABIs found by `uv` stop at `cp313`.

Python 3.13 is closer, but a full dependency install currently pulls large native ML wheels on this host and was not completed during this migration. Keep the project metadata at the upstream-supported `>=3.11,<3.13` range until the complete backend dependency set and import smoke tests pass on 3.13.

## Setup

```sh
uv venv --python 3.12.13
uv pip install -r backend/requirements.txt
npm install
```

`backend/requirements-min.txt` is not enough for this checkout; importing `open_webui.env` requires modules from the full backend requirements, including `Markdown`. Use `uv pip install -e .` only when you explicitly want the package build path, because the Hatch build hook runs `npm install --force` and `npm run build`.

## Run

Start the backend:

```sh
PYTHONPATH=backend CORS_ALLOW_ORIGIN="http://localhost:5173;http://localhost:8080" .venv/bin/uvicorn open_webui.main:app --host 0.0.0.0 --port 8080 --reload
```

Start the frontend in another shell:

```sh
npm run dev
```

Open `http://localhost:5173`.
