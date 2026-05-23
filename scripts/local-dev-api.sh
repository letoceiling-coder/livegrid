#!/usr/bin/env bash
# Build and run Nest API locally (production build — tsx dev mode has DI issue at HEAD).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh"
nvm use 22 >/dev/null

# Avoid CRLF-polluted shell env from earlier sessions
unset API_PORT API_PREFIX DATABASE_URL REDIS_URL JWT_ACCESS_SECRET JWT_REFRESH_SECRET 2>/dev/null || true
set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a

cd "$ROOT"
pnpm build:api
cd apps/api
exec node dist/main.js
