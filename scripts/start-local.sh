#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ "${TRAVELLA_SECRETS_MODE:-aws}" == "aws" ]]; then
  uv run --locked python scripts/local_secrets.py pull
elif [[ "${TRAVELLA_SECRETS_MODE}" != "local" ]]; then
  echo "TRAVELLA_SECRETS_MODE must be aws or local." >&2
  exit 1
fi

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

docker_memory_bytes="$(docker info --format '{{.MemTotal}}' 2>/dev/null || true)"
if [[ "$docker_memory_bytes" =~ ^[0-9]+$ ]] && ((docker_memory_bytes < 4 * 1024 * 1024 * 1024)); then
  echo "Warning: Docker has less than 4 GiB total RAM. The app and Claude Agent SDK share this with every running container." >&2
  echo "If the app exits with OOMKilled=true, increase the Docker/Colima memory allocation or stop unused stacks. Authentication readiness does not verify model execution." >&2
fi

echo "Starting Travella at http://localhost:${TRAVELLA_FRONTEND_PORT:-5174}"
echo "Auth gateway: http://localhost:${TRAVELLA_AUTH_PORT:-8003}"
echo "Agent service: http://localhost:${TRAVELLA_AGENT_PORT:-8103}"
detached=false
for argument in "$@"; do
  if [[ "$argument" == "-d" || "$argument" == "--detach" ]]; then
    detached=true
    break
  fi
done
if [[ "$detached" == true ]]; then
  echo "Services will run in the background. Stop them with: docker-compose -p ${COMPOSE_PROJECT_NAME} -f ${compose_file} down"
else
  echo "Press Ctrl-C to stop the foreground services."
fi
"${compose[@]}" -f "$compose_file" up --build "$@"
