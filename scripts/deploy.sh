#!/usr/bin/env bash
# ============================================================
# deploy.sh — Build & deploy CelebrateHub to AWS
# Usage: ./deploy.sh <db_password>
# Prerequisites: aws-cli, docker, terraform, npm
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

DB_PASSWORD="${1:?Usage: ./deploy.sh <db_password>}"
AWS_REGION="${AWS_REGION:-us-east-1}"
APP_NAME="celebratehub"

echo "========================================"
echo " CelebrateHub — AWS Deployment"
echo "========================================"

# ---- 1. Terraform: provision infrastructure ----
echo ""
echo "[1/4] Provisioning AWS infrastructure..."
cd "$SCRIPT_DIR/../infra"
terraform init -input=false
terraform apply -auto-approve -var="db_password=$DB_PASSWORD"

ECR_REPO=$(terraform output -raw ecr_repo_url)
S3_BUCKET=$(terraform output -raw frontend_bucket)
CF_DIST_ID=$(terraform output -raw cloudfront_distribution_id)
ALB_DNS=$(terraform output -raw alb_dns)

# ---- 2. Backend: build & push Docker image to ECR ----
echo ""
echo "[2/4] Building & pushing backend Docker image..."
cd "$PROJECT_DIR/backend"

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"

docker build -t "$APP_NAME-backend" .
docker tag "$APP_NAME-backend:latest" "$ECR_REPO:latest"
docker push "$ECR_REPO:latest"

# ---- 3. Frontend: build & upload to S3 ----
echo ""
echo "[3/4] Building & deploying frontend to S3..."
cd "$PROJECT_DIR/frontend"

# Point API calls to the ALB via CloudFront (no proxy needed in prod)
REACT_APP_API_URL="" npm run build

aws s3 sync build/ "s3://$S3_BUCKET" --delete
aws cloudfront create-invalidation --distribution-id "$CF_DIST_ID" --paths "/*" > /dev/null

# ---- 4. Force ECS to redeploy with new image ----
echo ""
echo "[4/4] Redeploying ECS service..."
aws ecs update-service \
  --cluster "$APP_NAME-cluster" \
  --service "$APP_NAME-backend" \
  --force-new-deployment \
  --region "$AWS_REGION" > /dev/null

# ---- Done! ----
CF_URL=$(cd "$SCRIPT_DIR/../infra" && terraform output -raw frontend_url)
echo ""
echo "========================================"
echo " Deployment complete!"
echo "========================================"
echo " Frontend : $CF_URL"
echo " Backend  : http://$ALB_DNS"
echo " API      : $CF_URL/api/events"
echo "========================================"
