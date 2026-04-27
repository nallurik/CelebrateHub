#!/usr/bin/env bash
# ============================================================
# destroy.sh — Tear down all AWS resources
# Usage: ./destroy.sh <db_password>
# ============================================================
set -euo pipefail

DB_PASSWORD="${1:?Usage: ./destroy.sh <db_password>}"

cd "$(dirname "$0")/../infra"
terraform destroy -auto-approve -var="db_password=$DB_PASSWORD"
echo "All AWS resources destroyed."
