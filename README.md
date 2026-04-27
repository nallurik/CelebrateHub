# CelebrateHub

CelebrateHub is a full-stack event operations app for managing events, guests, schedules, helpers, accommodations, locations, and activity logs.

## Tech Stack

- Backend: Spring Boot 2.7, Java 17, Spring Data JPA, Validation
- Frontend: React 18 (Create React App)
- Local DB (default): H2 file database
- Production DB profile: PostgreSQL
- Infrastructure: Terraform (AWS VPC, ECS Fargate, ALB, RDS, S3, CloudFront)

## Project Structure

- `backend/`: Spring Boot API
- `frontend/`: React application
- `infra/`: Terraform scripts for AWS infrastructure
- `scripts/`: Deployment and helper scripts
- `docker-compose.yml`: Local multi-container stack
- `docs/`: Project documentation

## Features Implemented

- Event management (create, update, clone, delete)
- Guest management with bulk import and duplicate prevention by phone
- Event guest assignment, schedules, and meal tracking
- Helper management with assignment checks
- Accommodation places with active/inactive status and occupancy checks
- Locations management
- Activity logs
- Frontend dashboards and event detail workflows

## Prerequisites

- Java 17+
- Node.js 18+
- npm
- Docker (optional, for compose mode)
- Terraform and AWS CLI (for AWS deployment)

## Run Locally (Development Mode: H2)

1. Start backend:

```bash
cd backend
./mvnw spring-boot:run
```

Backend URL: `http://localhost:8080`

2. Start frontend in a second terminal:

```bash
cd frontend
npm install
npm start
```

Frontend URL: `http://localhost:3000`

The frontend proxies API requests to backend using `frontend/package.json`.

## Run Locally (Container Mode: PostgreSQL)

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080`
- PostgreSQL: `localhost:5432`

## Configuration Profiles

- `backend/src/main/resources/application.properties`
  - Default local profile using H2 file database

- `backend/src/main/resources/application-prod.properties`
  - Production profile using PostgreSQL via environment variables:
    - `DATABASE_URL`
    - `DATABASE_USERNAME`
    - `DATABASE_PASSWORD`

## AWS Deployment (Terraform + Scripts)

Infrastructure is defined in `infra/` and includes:

- VPC with public/private subnets
- NAT and internet gateway
- ECS Fargate backend service
- ECR backend repository
- RDS PostgreSQL
- ALB for backend traffic
- S3 + CloudFront for frontend hosting

### Scripts

- Full deployment:

```bash
./scripts/deploy.sh '<db_password>'
```

- Destroy AWS resources:

```bash
./scripts/destroy.sh '<db_password>'
```

- Terraform plan:

```bash
./scripts/terraform-plan.sh '<db_password>'
```

- Terraform apply:

```bash
./scripts/terraform-apply.sh '<db_password>'
```

## Git Helper

Use the one-command helper to commit and push to `origin/main`:

```bash
./scripts/git-push.sh "your commit message"
```

## Migration Guide

Detailed migration and rollout plan from local temporary DB to AWS PostgreSQL:

- `docs/aws-postgres-migration-guide.md`

This guide includes:

- Current implementation summary
- Local run instructions
- Migration phases
- Data migration notes
- Production hardening checklist

## Notes

- Current backend schema management uses `spring.jpa.hibernate.ddl-auto=update`.
- For production maturity, add a migration tool (Flyway or Liquibase) and centralize secrets in AWS Secrets Manager or SSM Parameter Store.
