#!/usr/bin/env bash
# One-time: switch production /var/www/lg from lg.git → livegrid.git (canonical).
# Run ONLY after consolidated code is pushed to livegrid.git main.
#
#   bash deploy/switch-production-remote.sh
#   bash deploy/switch-production-remote.sh --dry-run
set -euo pipefail

_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "$_script_dir/config.sh"

DRY=false
[[ "${1:-}" == "--dry-run" ]] && DRY=true

echo "=== switch-production-remote ==="
echo "Server:    $LG_SSH"
echo "Path:      $DEPLOY_ROOT"
echo "From:      $LEGACY_REPO_URL"
echo "To:        $CANONICAL_REPO_URL"
echo "Branch:    $DEPLOY_BRANCH"
echo ""

REMOTE_CMD=$(cat <<EOF
set -euo pipefail
cd "$DEPLOY_ROOT"
echo "Current remote:"
git remote -v
echo "Current HEAD:"
git log -1 --oneline
CUR="\$(git remote get-url origin 2>/dev/null || echo none)"
if [ "\$CUR" = "$CANONICAL_REPO_URL" ]; then
  echo "Already on canonical remote — nothing to do."
  exit 0
fi
echo "→ git remote set-url origin $CANONICAL_REPO_URL"
git remote set-url origin "$CANONICAL_REPO_URL"
echo "→ git fetch origin $DEPLOY_BRANCH"
git fetch origin "$DEPLOY_BRANCH"
echo "New remote:"
git remote -v
echo "Remote main tip:"
git log -1 --oneline "origin/$DEPLOY_BRANCH" 2>/dev/null || true
echo ""
echo "NEXT: after verifying origin/main, run:"
echo "  cd $DEPLOY_ROOT && git pull --ff-only origin $DEPLOY_BRANCH && bash deploy/deploy-full.sh"
EOF
)

if $DRY; then
  echo "[dry-run] Would execute on $LG_SSH:"
  echo "$REMOTE_CMD"
  exit 0
fi

ssh -o BatchMode=yes -o ConnectTimeout=20 "$LG_SSH" bash -s <<< "$REMOTE_CMD"
echo "=== switch-production-remote: remote URL updated ==="
echo "Run deploy after push: bash deploy/remote-git-deploy.sh"
