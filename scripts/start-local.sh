#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI not found. Install Docker or Colima, then try again." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is not available. Install Docker Compose and try again." >&2
  exit 1
fi

if command -v colima >/dev/null 2>&1 && ! colima status >/dev/null 2>&1; then
  echo "Colima is not running; starting it..."
  colima start
fi

echo "Starting Travella at http://localhost:5173"
echo "Press Ctrl-C to stop the foreground services."
docker compose up --build "$@"
