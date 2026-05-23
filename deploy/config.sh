#!/usr/bin/env bash
# Canonical deploy configuration — single source for repo URL, paths, SSH target.
# Override any value via environment (e.g. LG_REPO_URL for legacy rollback).
set -euo pipefail

# Canonical Git remote (local dev + future production pulls)
export CANONICAL_REPO_URL="${CANONICAL_REPO_URL:-https://github.com/letoceiling-coder/livegrid.git}"

# Legacy remote — production currently on this until switch-production-remote.sh is run
export LEGACY_REPO_URL="${LEGACY_REPO_URL:-https://github.com/letoceiling-coder/lg.git}"

# Active repo URL for clone/deploy (defaults to canonical)
export LG_REPO_URL="${LG_REPO_URL:-$CANONICAL_REPO_URL}"

export DEPLOY_ROOT="${DEPLOY_ROOT:-/var/www/lg}"
export DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
export DEPLOY_REMOTE="${DEPLOY_REMOTE:-origin}"
export LG_SSH="${LG_SSH:-root@85.198.64.93}"
