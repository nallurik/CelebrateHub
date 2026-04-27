# CelebrateHub Migration Guide: Local H2 to AWS + PostgreSQL

## 1) Purpose

This document describes:

- What has been implemented in CelebrateHub so far
- How to run the current code locally
- The migration approach to AWS with PostgreSQL
- What still needs to be done before production readiness
- Terraform and deployment scripts available in this repository

---

## 2) Current Implementation Snapshot

### Application stack

- Backend: Spring Boot 2.7, Java 17, Spring Web, Spring Data JPA, Validation
- Frontend: React 18 (Create React App), React Router, Recharts, Excel import/export utilities
- Local database (default profile): H2 file database
- Production profile database: PostgreSQL driver and prod datasource properties already present

### Functional modules already implemented

- Events management (CRUD and event detail workflows)
- Guests management (CRUD, bulk import, duplicate prevention by phone)
- Event-guest assignment and schedule management
- Meal preferences and meal summary flows
- Helpers management and assignment checks
- Accommodation place management with active/inactive state and occupancy logic
- Locations (drop-off/general location management)
- Activity log endpoints and UI page
- Auth context and themed UI support in frontend

### Existing deployment assets

- Dockerfiles for backend and frontend
- Docker Compose stack with backend + frontend + postgres for local containerized runs
- Terraform infrastructure for AWS (VPC, ALB, ECS Fargate, ECR, RDS PostgreSQL, S3, CloudFront)
- Deployment scripts under scripts/

---

## 3) Current Repository Structure

- backend/: Spring Boot API service
- frontend/: React UI
- infra/: Terraform infrastructure
- scripts/: Deployment and utility scripts
- docker-compose.yml: Local multi-container run with PostgreSQL

---

## 4) Local Run Guide (Current Code)

## Option A: Local development mode (H2 file DB)

Use this when developing quickly on your machine.

Prerequisites:

- Java 17
- Maven (or use ./mvnw)
- Node.js 18+

Steps:

1. Start backend

- cd backend
- ./mvnw spring-boot:run

Backend runs on http://localhost:8080.
Default profile uses H2 file DB configured in backend/src/main/resources/application.properties.

2. Start frontend

- cd frontend
- npm install
- npm start

Frontend runs on http://localhost:3000 and proxies API calls to http://localhost:8080 through frontend/package.json.

## Option B: Local container mode (PostgreSQL)

Use this to test behavior closer to production DB engine.

- docker compose up --build

This starts:

- backend service (SPRING_PROFILES_ACTIVE=prod)
- frontend service
- postgres service

Ports:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Postgres: localhost:5432

---

## 5) Migration Target Architecture on AWS

The Terraform in infra/ already defines:

- VPC with public and private subnets across 2 AZs
- Internet Gateway and NAT Gateway
- Security groups for ALB, ECS, and RDS
- RDS PostgreSQL instance (private subnet)
- ECS Fargate cluster/service for backend
- ECR repository for backend image
- ALB routing to backend container on port 8080
- S3 + CloudFront for frontend hosting
- CloudFront /api/* path forwarding to backend ALB

This is a good baseline for production-like deployment.

---

## 6) Terraform and Deployment Scripts in This Repo

Existing scripts:

- scripts/deploy.sh
  - Provisions infra with Terraform
  - Builds and pushes backend image to ECR
  - Builds frontend and uploads to S3
  - Invalidates CloudFront and forces ECS redeploy

- scripts/destroy.sh
  - Destroys Terraform-managed AWS resources

Added helper scripts (for safer infra workflow):

- scripts/terraform-plan.sh <db_password>
  - Runs terraform init + terraform plan

- scripts/terraform-apply.sh <db_password>
  - Runs terraform init + terraform apply

Recommended execution order:

1. scripts/terraform-plan.sh <db_password>
2. scripts/terraform-apply.sh <db_password>
3. scripts/deploy.sh <db_password>

---

## 7) Detailed Migration Plan

## Phase 0: Pre-migration checks

1. Confirm AWS CLI access and correct account
- aws sts get-caller-identity

2. Confirm Terraform and Docker are installed
- terraform -version
- docker --version

3. Decide region and naming conventions
- Validate values in infra/terraform.tfvars

4. Decide production database credentials policy
- Do not hardcode passwords in files
- Pass db_password at runtime

## Phase 1: Infrastructure provisioning

1. Plan infra changes
- ./scripts/terraform-plan.sh '<StrongPassword>'

2. Apply infra
- ./scripts/terraform-apply.sh '<StrongPassword>'

3. Capture Terraform outputs
- RDS endpoint
- ECR repo URL
- CloudFront URL
- ALB DNS

## Phase 2: Backend deployment to ECS

1. Build backend image
2. Push image to ECR
3. Ensure ECS task definition points to:
- SPRING_PROFILES_ACTIVE=prod
- DATABASE_URL=jdbc:postgresql://<rds-endpoint>/celebratehub
- DATABASE_USERNAME and DATABASE_PASSWORD

4. Verify ALB health check returns healthy status

## Phase 3: Frontend deployment to S3 + CloudFront

1. Build frontend static assets
2. Sync build output to S3 bucket
3. Invalidate CloudFront cache
4. Validate frontend can call /api/* through CloudFront

## Phase 4: Validation and cutover

1. Smoke test critical paths
- Login/auth flow
- Event create/update/delete
- Guest import and duplicate handling
- Accommodation occupancy and related dashboards

2. Verify logs and metrics
- CloudWatch log group for backend
- ALB target health
- ECS task stability

3. Finalize DNS/custom domain (optional)
- Route53 + ACM + CloudFront custom domain

---

## 8) Data Migration Notes (H2 to PostgreSQL)

Current backend uses spring.jpa.hibernate.ddl-auto=update.
This can create/alter schema automatically but is not ideal for strict production migrations.

Recommended approach:

1. Freeze local data for export (if preserving historical local data is required)
2. Export data from H2 (CSV or SQL script)
3. Map and import into PostgreSQL
4. Validate row counts and key relationships
5. Run app against PostgreSQL and verify all major workflows

If local test data does not need to be preserved, start with a clean PostgreSQL DB in AWS and seed manually.

---

## 9) What Still Needs To Be Done for Production Readiness

1. Introduce schema migration tooling
- Add Flyway or Liquibase
- Move from ddl-auto=update to validated migration scripts

2. Secrets management hardening
- Move DB credentials to AWS Secrets Manager or SSM Parameter Store
- Avoid plain values in task definition where possible

3. HTTPS and domain hardening
- Add ACM certificate and custom domain for CloudFront
- Consider HTTPS ALB listener for direct backend access needs

4. Observability
- Add CloudWatch alarms (ECS CPU/memory, ALB 5xx, RDS storage)
- Add structured application logging and request correlation

5. Backup and recovery
- Enable RDS automated backups and consider final snapshots on destroy for non-dev environments

6. CI/CD automation
- Add GitHub Actions pipeline for test/build/deploy
- Separate infra deploy and app deploy workflows

7. Environment strategy
- Add separate Terraform workspaces or directories for dev/stage/prod
- Use remote Terraform state (S3 + DynamoDB locking)

---

## 10) Suggested First Production Iteration

Use this pragmatic path:

1. Keep current Terraform baseline and deploy to one AWS environment
2. Use PostgreSQL on RDS as currently defined
3. Keep application behavior unchanged except prod datasource variables
4. Validate with smoke tests
5. Then introduce Flyway and Secrets Manager in the next hardening sprint

This sequence reduces risk by avoiding too many platform and app changes at once.

---

## 11) Quick Command Reference

From repository root:

- Infra plan:
  - ./scripts/terraform-plan.sh '<db_password>'

- Infra apply:
  - ./scripts/terraform-apply.sh '<db_password>'

- Full deploy (infra + backend image + frontend publish):
  - ./scripts/deploy.sh '<db_password>'

- Destroy AWS resources:
  - ./scripts/destroy.sh '<db_password>'

- Local backend:
  - cd backend && ./mvnw spring-boot:run

- Local frontend:
  - cd frontend && npm install && npm start

- Local full stack with postgres:
  - docker compose up --build
