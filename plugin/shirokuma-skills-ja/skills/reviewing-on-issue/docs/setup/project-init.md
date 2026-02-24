# Project Initialization

Guide for setting up a Next.js 16 monorepo project from scratch.

## Prerequisites

- Node.js 20.9.0+
- pnpm 8.0.0+
- Docker & Docker Compose

## 1. Create Monorepo Structure

```bash
mkdir my-project && cd my-project
pnpm init
```

### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### Root package.json

```json
{
  "name": "my-project",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  },
  "scripts": {
    "dev:admin": "pnpm --filter admin dev",
    "dev:public": "pnpm --filter public dev",
    "build": "pnpm --filter admin build && pnpm --filter public build",
    "lint": "pnpm --filter admin lint && pnpm --filter public lint"
  },
  "devDependencies": {
    "typescript": "^5.7.2"
  }
}
```

## 2. Create Next.js Apps

```bash
mkdir -p apps/admin apps/public packages/database
cd apps/admin
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

### tsconfig.json (App)

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    },
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## 3. Create Database Package

```bash
cd packages/database
pnpm init
```

### packages/database/package.json

```json
{
  "name": "@repo/database",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "drizzle-orm": "^0.44.7",
    "pg": "^8.16.3"
  },
  "devDependencies": {
    "drizzle-kit": "^0.31.7",
    "typescript": "^5.7.2"
  },
  "scripts": {
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/seed.ts"
  }
}
```

## 4. Link Packages

In apps/admin/package.json:

```json
{
  "dependencies": {
    "@repo/database": "workspace:*"
  }
}
```

## 5. Install Dependencies

```bash
cd /path/to/project-root
pnpm install
```

## Directory Structure

| Path | Purpose |
|------|---------|
| `apps/admin/` | Admin CMS |
| `apps/admin/app/[locale]/` | i18n routes |
| `apps/admin/lib/actions/` | Server Actions |
| `apps/admin/components/` | UI components |
| `apps/admin/messages/` | i18n files |
| `apps/public/` | Public site |
| `packages/database/` | Shared Drizzle ORM |
| `packages/database/src/schema/` | Table definitions |
| `pnpm-workspace.yaml` | Monorepo config |
| `docker-compose.yml` | Container setup |

## Environment Variables

Create `.env` in project root:

```bash
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/mydb

# Auth
BETTER_AUTH_SECRET=your-32-char-secret-here
BETTER_AUTH_URL=https://admin.local.test

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

## Next Steps

1. [Database Setup](database-setup.md) - Drizzle ORM configuration
2. [Auth Setup](auth-setup.md) - Better Auth integration
3. [Styling Setup](styling-setup.md) - Tailwind v4 + shadcn/ui
4. [Infra Setup](infra-setup.md) - Docker + Nginx
