#!/usr/bin/env bash
# ============================================================
# git-push.sh — Stage, commit, and push to origin/main
# Usage: ./git-push.sh "your commit message"
# ============================================================
set -euo pipefail

COMMIT_MESSAGE="${1:-}"
if [[ -z "$COMMIT_MESSAGE" ]]; then
  echo "Usage: ./git-push.sh \"your commit message\""
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  git add .
  git commit -m "$COMMIT_MESSAGE"
else
  echo "No local changes to commit."
fi

git push origin main
echo "Pushed to origin/main successfully."