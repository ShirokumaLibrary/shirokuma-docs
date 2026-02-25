# Recommended Tech Stack

Recommended stack and version requirements for Next.js projects.

## Recommended Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 16 / React 19 / TypeScript 5 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Auth | Better Auth (DB sessions) |
| i18n | next-intl (ja/en) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Testing | Jest + Playwright |

> Update versions to match your project's `package.json`.

## Version Requirements

| Software | Minimum Version | Notes |
|----------|----------------|-------|
| Node.js | 20.9.0+ | Next.js 16 requirement |
| TypeScript | 5.1.0+ | -- |
| Safari | 16.4+ | Tailwind CSS v4 @property support |

## Security Requirements

| Setting | Requirement |
|---------|------------|
| `BETTER_AUTH_SECRET` | 32+ characters (generate with `openssl rand -base64 32`) |
| bcrypt rounds | 12+ |
| Rate limiting | 5 attempts / 15 min (production) |

## Key Patterns (Quick Reference)

| Pattern | Summary |
|---------|---------|
| Async Params | `params: Promise<...>` -> `await params` |
| Server Actions | Auth -> CSRF -> Validation -> DB -> Redirect |
| CSRF Protection | Queries: read-only check, Mutations: CSRF token |
| Rate Limiting | `checkRateLimit()` for destructive operations |
| Ownership Check | Verify `authorId === userId` before mutation |

See individual files under `patterns/` for detailed implementation patterns.
