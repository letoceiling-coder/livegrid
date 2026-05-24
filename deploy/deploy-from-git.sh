#!/usr/bin/env bash
set -euo pipefail

# ─── Деплой с обновлением кода из Git (стабильный сценарий для сервера) ───
# Первоначальная установка:
#   sudo mkdir -p /var/www && sudo chown "$USER" /var/www
#   git clone https://github.com/letoceiling-coder/livegrid.git /var/www/lg
#   cd /var/www/lg && bash deploy/deploy-from-git.sh
#
# Переменные: см. deploy/config.sh (DEPLOY_ROOT, DEPLOY_BRANCH, LG_REPO_URL)

_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$_script_dir/config.sh"

echo "=== LiveGrid deploy-from-git ==="
echo "Root: $DEPLOY_ROOT  branch: $DEPLOY_BRANCH  remote: $DEPLOY_REMOTE"
echo "Repo URL (clone only): $LG_REPO_URL"
echo ""

if [ ! -d "$DEPLOY_ROOT/.git" ]; then
  echo "ERROR: В $DEPLOY_ROOT нет репозитория Git."
  echo "Клонируйте проект: git clone <url> $DEPLOY_ROOT"
  exit 1
fi

cd "$DEPLOY_ROOT"

echo "→ git fetch $DEPLOY_REMOTE $DEPLOY_BRANCH"
git fetch "$DEPLOY_REMOTE" "$DEPLOY_BRANCH"

echo "→ git checkout $DEPLOY_BRANCH"
git checkout "$DEPLOY_BRANCH"

echo "→ git pull (ff-only)"
if ! git pull --ff-only "$DEPLOY_REMOTE" "$DEPLOY_BRANCH"; then
  echo "WARN: fast-forward blocked (server hotpatches). Resetting to origin/$DEPLOY_BRANCH (preserving .env)."
  cp -a .env /tmp/lg.env.backup 2>/dev/null || true
  git fetch "$DEPLOY_REMOTE" "$DEPLOY_BRANCH"
  git reset --hard "$DEPLOY_REMOTE/$DEPLOY_BRANCH"
  git clean -fd -e .env -e "apps/api/sitemaps"
  [ -f /tmp/lg.env.backup ] && cp -a /tmp/lg.env.backup .env
fi

echo "→ запуск deploy-full.sh"
exec bash "$DEPLOY_ROOT/deploy/deploy-full.sh"
