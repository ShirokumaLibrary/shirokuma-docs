# Infrastructure Setup

Guide for setting up shared infrastructure (nextjs-infra) with Traefik, PostgreSQL, Redis, and AWS-like services.

## Architecture Overview

**nextjs-infra (共有インフラ)**

| Service | Description |
|---------|-------------|
| alb-traefik | リバースプロキシ (HTTPS終端) |
| local-dns | `*.local.test` → 127.0.0.1 |
| rds-postgres | PostgreSQL 16 |
| elasticache-redis | Redis 7 |
| ses-mailpit | メールテスト |
| playwright | E2Eテスト用ブラウザサーバー |
| localstack | AWS S3/SQS/SNS/DynamoDB等 |

↕ `app-network` (external Docker network)

**Application Projects** (e.g., nextjs-tdd-blog-cms)

| Service | Domain |
|---------|--------|
| admin-app | admin.local.test |
| public-app | public.local.test |
| admin-test-app | admin-test.local.test (E2E用) |

## Prerequisites

- Docker & Docker Compose
- mkcert (for HTTPS certificates)

## 1. Generate SSL Certificates

```bash
# Install mkcert
brew install mkcert  # macOS
# or: sudo apt install mkcert  # Linux

# Install local CA
mkcert -install

# Generate wildcard certificate for .local.test
cd nextjs-infra/traefik/certs
mkcert -cert-file local.pem -key-file local-key.pem "*.local.test" "localhost"
```

## 2. Create Docker Network

```bash
docker network create app-network
```

## 3. Start Infrastructure

```bash
cd nextjs-infra
./scripts/start.sh
```

Or manually:

```bash
docker compose up -d
```

## 4. Application docker-compose.yml

Applications connect to shared infra via external network and Traefik labels:

```yaml
services:
  admin-app:
    image: node:20-alpine
    volumes:
      - .:/app
    working_dir: /app
    command: npx pnpm --filter admin dev --port 3000
    environment:
      - NODE_ENV=development
      # Connect to shared infra services
      - DATABASE_URL=postgresql://postgres:postgres@rds-postgres:5432/blogcms_dev
      - REDIS_URL=redis://elasticache-redis:6379
      - EMAIL_SERVER_HOST=ses-mailpit
      - EMAIL_SERVER_PORT=1025
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=https://admin.local.test
    networks:
      - app-network
    # Traefik auto-discovery via labels
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.admin.rule=Host(`admin.local.test`)"
      - "traefik.http.routers.admin.tls=true"
      - "traefik.http.services.admin.loadbalancer.server.port=3000"

networks:
  app-network:
    external: true
    name: app-network
```

## 5. Traefik Label Configuration

Traefik automatically routes traffic based on container labels:

```yaml
labels:
  # Enable Traefik for this container
  - "traefik.enable=true"
  # Define routing rule (Host-based)
  - "traefik.http.routers.{name}.rule=Host(`{hostname}.local.test`)"
  # Enable TLS
  - "traefik.http.routers.{name}.tls=true"
  # Define backend port
  - "traefik.http.services.{name}.loadbalancer.server.port={port}"
```

## 6. Service Endpoints

### From Application Containers

| Service | Hostname | Port |
|---------|----------|------|
| PostgreSQL | rds-postgres | 5432 |
| Redis | elasticache-redis | 6379 |
| Mailpit SMTP | ses-mailpit | 1025 |
| LocalStack | localstack | 4566 |

### From Host Machine

| Service | URL | localhost Port |
|---------|-----|----------------|
| Admin App | https://admin.local.test | - |
| PostgreSQL | - | 5432 |
| Redis | - | 6379 |
| Mailpit Web | https://mailpit.local.test | 8025 |
| Traefik Dashboard | https://traefik.local.test | 8888 |
| Adminer | https://adminer.local.test | - |
| LocalStack | https://localstack.local.test | 4566 |
| Playwright | - | 9323 |

## 7. Database Setup

```bash
# Push schema to database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/blogcms_dev" \
  pnpm --filter @repo/database db:push

# Seed data (from inside container)
docker compose exec -T admin-app pnpm --filter @repo/database db:seed

# Or from host
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/blogcms_dev" \
  pnpm --filter @repo/database db:seed
```

## 8. E2E Test Environment

Separate test apps with isolated database:

```yaml
admin-test-app:
  image: node:20-alpine
  command: sh -c "npx pnpm --filter admin build && npx pnpm --filter admin start --port 3000"
  environment:
    - NODE_ENV=production
    - DATABASE_URL=postgresql://postgres:postgres@rds-postgres:5432/blogcms_test
    - BETTER_AUTH_URL=https://admin-test.local.test
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.admin-test.rule=Host(`admin-test.local.test`)"
    - "traefik.http.routers.admin-test.tls=true"
    - "traefik.http.services.admin-test.loadbalancer.server.port=3000"
  profiles:
    - development
```

Run E2E tests:

```bash
# Start test apps
docker compose --profile development up -d admin-test-app public-test-app

# Run Playwright tests (uses shared Playwright server)
npx playwright test
```

## 9. Playwright Configuration

Configure Playwright to use shared server:

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    connectOptions: {
      wsEndpoint: "ws://localhost:9323",
    },
    ignoreHTTPSErrors: true,
  },
})
```

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| .test domain not resolving | DNS not configured | Run `./scripts/start.sh` in nextjs-infra |
| SSL certificate error | mkcert CA not installed | Run `mkcert -install` |
| Container can't connect to DB | Wrong hostname | Use `rds-postgres` not `localhost` |
| E2E tests fail with connection refused | Playwright can't reach app | Check `extra_hosts` in Playwright container |
| Network error between containers | Not on same network | Both must use `app-network` |

## Adding New Applications

1. Add services to your app's `docker-compose.yml`
2. Use `app-network` (external)
3. Add Traefik labels for routing
4. Connect to infra services via container hostnames
5. Add database to `nextjs-infra/rds/init/01-create-databases.sql` if needed
