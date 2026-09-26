#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --locked
uv run --locked ruff check services
uv run --locked ruff format --check services
uv run --locked pytest -q
npm ci --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
