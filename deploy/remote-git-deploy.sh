#!/usr/bin/env bash
set -euo pipefail

# Запуск с локальной машины (Linux/macOS/Git Bash): обновление с Git + деплой на сервере.
#   bash deploy/remote-git-deploy.sh
#
# Переменные: deploy/config.sh (LG_SSH, DEPLOY_ROOT, LG_REPO_URL, DEPLOY_BRANCH)

_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$_script_dir/config.sh"

echo "=== remote-git-deploy → $LG_SSH  DEPLOY_ROOT=$DEPLOY_ROOT  REPO=$LG_REPO_URL ==="

ssh -o BatchMode=yes -o ConnectTimeout=20 "$LG_SSH" "export DEPLOY_ROOT=$(printf %q "$DEPLOY_ROOT") DEPLOY_BRANCH=$(printf %q "$DEPLOY_BRANCH") LG_REPO_URL=$(printf %q "$LG_REPO_URL"); bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail
DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/lg}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
LG_REPO_URL="${LG_REPO_URL:-https://github.com/letoceiling-coder/livegrid.git}"
if [ ! -d "$DEPLOY_ROOT/.git" ]; then
  mkdir -p "$(dirname "$DEPLOY_ROOT")"
  if [ -e "$DEPLOY_ROOT" ] && [ -n "$(ls -A "$DEPLOY_ROOT" 2>/dev/null)" ]; then
    bak="${DEPLOY_ROOT}.pre-git-$(date +%Y%m%d%H%M%S)"
    echo "→ нет .git, непустой каталог — архив: $bak"
    mv "$DEPLOY_ROOT" "$bak"
    mkdir -p "$DEPLOY_ROOT"
    [ -f "$bak/.env" ] && cp -a "$bak/.env" "$DEPLOY_ROOT/.env" && echo "  (.env восстановлен)"
  fi
  echo "→ git clone → $DEPLOY_ROOT"
  git clone -b "$DEPLOY_BRANCH" "$LG_REPO_URL" "$DEPLOY_ROOT"
fi
bash "$DEPLOY_ROOT/deploy/deploy-from-git.sh"
REMOTE_SCRIPT

echo "=== remote-git-deploy: OK ==="
