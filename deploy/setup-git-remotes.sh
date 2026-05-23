#!/usr/bin/env bash
# Configure local git remotes for canonical + legacy mirror workflow.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT/deploy/config.sh"

cd "$ROOT"

echo "=== setup-git-remotes ==="
echo "origin (canonical): $CANONICAL_REPO_URL"

if git remote get-url origin 2>/dev/null | grep -q livegrid; then
  echo "origin already points to livegrid.git"
else
  echo "→ git remote set-url origin $CANONICAL_REPO_URL"
  git remote set-url origin "$CANONICAL_REPO_URL" 2>/dev/null || \
    git remote add origin "$CANONICAL_REPO_URL"
fi

if git remote get-url legacy-lg 2>/dev/null; then
  echo "legacy-lg already configured"
else
  echo "→ git remote add legacy-lg $LEGACY_REPO_URL"
  git remote add legacy-lg "$LEGACY_REPO_URL"
fi

echo ""
git remote -v
echo ""
echo "Workflow:"
echo "  git push origin main          # canonical (livegrid.git)"
echo "  git push legacy-lg main       # optional mirror during transition"
echo "  bash deploy/remote-git-deploy.sh  # deploy from canonical after prod switch"
