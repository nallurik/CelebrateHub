#!/usr/bin/env bash
# ============================================================
# terraform-apply.sh — Apply AWS infra changes for CelebrateHub
# Usage: ./terraform-apply.sh <db_password>
# ============================================================
set -euo pipefail

DB_PASSWORD="${1:?Usage: ./terraform-apply.sh <db_password>}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_DIR="$SCRIPT_DIR/../infra"

cd "$INFRA_DIR"

echo "[1/2] Initializing Terraform..."
terraform init -input=false

echo "[2/2] Applying Terraform changes..."
terraform apply -auto-approve -var="db_password=$DB_PASSWORD"

echo "Apply complete."
