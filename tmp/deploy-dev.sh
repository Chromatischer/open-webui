#!/usr/bin/env bash
#
# Deploy the fork ':dev' image to this server.
# Switches ~/docker-compose.fork.yml from :main -> :dev, pulls, recreates,
# and verifies health. Safe to re-run. Run on the server:  bash deploy-dev.sh
#
set -euo pipefail

COMPOSE="$HOME/docker-compose.fork.yml"
TAG="${1:-dev}"   # override target tag:  bash deploy-dev.sh main   (to roll back)

echo "== Backing up compose =="
cp "$COMPOSE" "$COMPOSE.bak-$(date +%Y%m%d-%H%M%S)"

echo "== Switching fork image tag -> :$TAG =="
sed -i "s#chromatischer/open-webui:[A-Za-z0-9._-]*#chromatischer/open-webui:$TAG#" "$COMPOSE"
grep chromatischer "$COMPOSE"

echo "== Pulling image =="
sudo docker compose -f "$COMPOSE" pull open-webui

echo "== Recreating stack =="
sudo docker compose -f "$COMPOSE" up -d

echo "== Waiting for startup =="
sleep 6

echo "== HEALTH =="
curl -s localhost:80/health || true
echo
echo "== VERSION =="
curl -s localhost:80/api/version || true
echo
echo "== Running image =="
sudo docker ps --filter name=open-webui --format '{{.Image}}  {{.Status}}'
