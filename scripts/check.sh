#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --locked
uv run --locked ruff check services
uv run --locked ruff format --check services
uv run --locked pytest -q services/auth/tests services/crud/tests
npm ci --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend

# Parse only: this does not start containers or contact AWS.
if docker compose version >/dev/null 2>&1; then
  docker compose config --quiet
elif command -v docker-compose >/dev/null 2>&1; then
  docker-compose config --quiet
else
  echo "Docker Compose is required to validate local service wiring." >&2
  exit 1
fi
