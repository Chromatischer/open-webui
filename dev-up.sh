#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

BACKEND_PORT="${BACKEND_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"

PYTHONPATH_VALUE="${PYTHONPATH:-backend}"
CORS_ALLOW_ORIGIN_VALUE="${CORS_ALLOW_ORIGIN:-http://localhost:${FRONTEND_PORT};http://localhost:${BACKEND_PORT}}"

if [[ ! -x ".venv/bin/uvicorn" ]]; then
	echo "Missing .venv/bin/uvicorn. Run: uv venv --python 3.12.13 && uv pip install -r backend/requirements.txt" >&2
	exit 1
fi

if [[ ! -d "node_modules" ]]; then
	echo "Missing node_modules. Run: npm install" >&2
	exit 1
fi

pids=()

cleanup() {
	local status=$?

	if ((${#pids[@]})); then
		echo
		echo "Stopping dev services..."
		kill "${pids[@]}" 2>/dev/null || true
		wait "${pids[@]}" 2>/dev/null || true
	fi

	exit "$status"
}

trap cleanup EXIT INT TERM

echo "Starting backend: http://localhost:${BACKEND_PORT}"
PYTHONPATH="$PYTHONPATH_VALUE" \
CORS_ALLOW_ORIGIN="$CORS_ALLOW_ORIGIN_VALUE" \
	.venv/bin/uvicorn open_webui.main:app \
		--host "$BACKEND_HOST" \
		--port "$BACKEND_PORT" \
		--reload &
pids+=("$!")

echo "Starting frontend: http://localhost:${FRONTEND_PORT}"
npm run dev -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT" &
pids+=("$!")

echo
echo "Open http://localhost:${FRONTEND_PORT}"
echo "Press Ctrl-C to stop both services."

wait -n "${pids[@]}"
