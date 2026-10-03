#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

python3 scripts/ensure-local-mcp-auth.py

compose_file="${TRAVELLA_COMPOSE_FILE:-compose.local-single.yaml}"
if [[ ! -f "$compose_file" ]]; then
  echo "Compose file not found: $compose_file" >&2
  exit 1
fi

export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-travella-local-single}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI not found. Install Docker or Colima, then try again." >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  compose=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  compose=(docker-compose)
else
  echo "Docker Compose is not available. Install Docker Compose and try again." >&2
  exit 1
fi

if command -v colima >/dev/null 2>&1 && ! colima status >/dev/null 2>&1; then
  echo "Colima is not running; starting it..."
  colima start
fi

echo "Starting Travella at http://localhost:${TRAVELLA_FRONTEND_PORT:-5174}"
echo "Auth gateway: http://localhost:${TRAVELLA_AUTH_PORT:-8003}"
echo "Agent service: http://localhost:${TRAVELLA_AGENT_PORT:-8103}"
echo "Press Ctrl-C to stop the foreground services."
"${compose[@]}" -f "$compose_file" up --build "$@"
