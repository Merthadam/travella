#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-travella-local-single}"
compose_file="${TRAVELLA_COMPOSE_FILE:-compose.local-single.yaml}"

# This stack uses Cognito; never present an offline-only or unconfigured container
# as ready for an authenticated browser session.
bash scripts/start-local.sh -d

if docker compose version >/dev/null 2>&1; then
  compose=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  compose=(docker-compose)
else
  echo "Docker Compose is not available." >&2
  exit 1
fi

echo "Waiting for the app container and its local service health checks..."
app_id=""
for ((attempt = 0; attempt < 150; attempt++)); do
  app_id="$("${compose[@]}" -p "$COMPOSE_PROJECT_NAME" -f "$compose_file" ps -q app)"
  if [[ -n "$app_id" ]]; then
    health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$app_id")"
    case "$health" in
      healthy) break ;;
      unhealthy)
        echo "The app container is unhealthy. Check its local service logs before retrying." >&2
        exit 1
        ;;
    esac
  fi
  if ((attempt == 149)); then
    echo "The app container did not become healthy within 5 minutes." >&2
    exit 1
  fi
  sleep 2
done

uv run --locked python scripts/check-local-auth.py

origin="${TRAVELLA_LOCAL_ORIGIN:-http://localhost:${TRAVELLA_FRONTEND_PORT:-5174}}"
echo "Travella is ready at ${origin}"
echo "Open that exact localhost origin so its session cookie matches the local auth service."
