#!/usr/bin/env bash
set -Eeuo pipefail

cd /app

# Hold the OpenAI key only in this launcher until the agent is started. Database
# migrations and the other app services do not need provider credentials.
agent_openai_api_key="${OPENAI_API_KEY:-}"
unset OPENAI_API_KEY
agent_mcp_issuer="${MCP_GATEWAY_OAUTH_ISSUER:-}"
agent_mcp_audience="${MCP_GATEWAY_OAUTH_AUDIENCE:-}"
agent_mcp_client_id="${MCP_GATEWAY_OAUTH_CLIENT_ID:-}"
agent_mcp_scope="${MCP_GATEWAY_OAUTH_SCOPE:-}"
agent_mcp_jwt_key="${MCP_GATEWAY_OAUTH_JWT_KEY:-}"
agent_mcp_assertion_secret="${MCP_ASSERTION_SIGNING_SECRET:-}"
agent_mcp_assertion_audience="${MCP_ASSERTION_AUDIENCE:-}"
unset MCP_GATEWAY_OAUTH_ISSUER MCP_GATEWAY_OAUTH_AUDIENCE
unset MCP_GATEWAY_OAUTH_CLIENT_ID MCP_GATEWAY_OAUTH_SCOPE MCP_GATEWAY_OAUTH_JWT_KEY
unset MCP_ASSERTION_SIGNING_SECRET MCP_ASSERTION_AUDIENCE

uv run --frozen --no-sync alembic -c /app/services/crud/alembic.ini upgrade head

child_pids=()
stop_children() {
  local exit_code=$?
  trap - EXIT INT TERM
  for pid in "${child_pids[@]}"; do
    kill -TERM "$pid" 2>/dev/null || true
  done
  for pid in "${child_pids[@]}"; do
    wait "$pid" 2>/dev/null || true
  done
  exit "$exit_code"
}

trap stop_children EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

start_process() {
  "$@" &
  child_pids+=("$!")
}

# Re-export the key for the agent process only, then remove it before starting
# auth, CRUD, and Vite.
if [[ -n "$agent_openai_api_key" ]]; then
  export OPENAI_API_KEY="$agent_openai_api_key"
fi
export MCP_GATEWAY_OAUTH_ISSUER="$agent_mcp_issuer"
export MCP_GATEWAY_OAUTH_AUDIENCE="$agent_mcp_audience"
export MCP_GATEWAY_OAUTH_CLIENT_ID="$agent_mcp_client_id"
export MCP_GATEWAY_OAUTH_SCOPE="$agent_mcp_scope"
export MCP_GATEWAY_OAUTH_JWT_KEY="$agent_mcp_jwt_key"
export MCP_ASSERTION_SIGNING_SECRET="$agent_mcp_assertion_secret"
export MCP_ASSERTION_AUDIENCE="$agent_mcp_assertion_audience"
start_process uv run --frozen --no-sync uvicorn services.agent.app:create_app \
  --factory --host 0.0.0.0 --port 8002 --no-access-log
unset OPENAI_API_KEY agent_openai_api_key
unset MCP_GATEWAY_OAUTH_ISSUER MCP_GATEWAY_OAUTH_AUDIENCE
unset MCP_GATEWAY_OAUTH_CLIENT_ID MCP_GATEWAY_OAUTH_SCOPE MCP_GATEWAY_OAUTH_JWT_KEY
unset MCP_ASSERTION_SIGNING_SECRET MCP_ASSERTION_AUDIENCE
unset agent_mcp_issuer agent_mcp_audience agent_mcp_client_id agent_mcp_scope
unset agent_mcp_jwt_key agent_mcp_assertion_secret agent_mcp_assertion_audience
start_process uv run --frozen --no-sync uvicorn services.crud.server:app \
  --host 0.0.0.0 --port 8001 --no-access-log
start_process uv run --frozen --no-sync uvicorn services.auth.app:app \
  --host 0.0.0.0 --port 8000 --no-access-log
start_process node /app/frontend/node_modules/vite/bin/vite.js \
  /app/frontend --config /app/frontend/vite.config.js \
  --force --host 0.0.0.0

wait -n "${child_pids[@]}"
