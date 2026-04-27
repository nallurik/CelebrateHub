#!/usr/bin/env bash
# ============================================================
# terraform-plan.sh — Plan AWS infra changes for CelebrateHub
# Usage: ./terraform-plan.sh <db_password>
# ============================================================
set -euo pipefail

DB_PASSWORD="${1:?Usage: ./terraform-plan.sh <db_password>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/../infra"

cd "$INFRA_DIR"

echo "[1/2] Initializing Terraform..."
terraform init -input=false

echo "[2/2] Creating Terraform plan..."
terraform plan -var="db_password=$DB_PASSWORD"

echo "Plan complete."
