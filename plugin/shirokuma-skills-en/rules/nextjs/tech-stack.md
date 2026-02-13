# Tech Stack Reference

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

## Key Patterns

| Pattern | Summary |
|---------|---------|
| Async Params | `params: Promise<...>` → `await params` |
| Server Actions | Auth → CSRF → Validation → DB → Redirect |
| CSRF Protection | Queries: read-only check, Mutations: CSRF token |
| Rate Limiting | `checkRateLimit()` for destructive ops |
| Ownership Check | Verify `authorId === userId` before mutation |

## Radix UI Hydration (CRITICAL)

```typescript
const [mounted, setMounted] = useState(false)
useEffect(() => { setMounted(true) }, [])

if (!mounted) return <PlaceholderWithoutRadixUI />
return <ComponentWithRadixUI />
```

## Known Issues Quick Reference

| Issue | Fix |
|-------|-----|
| Hydration mismatch | Use `mounted` state pattern |
| CSS variable broken in prod | Use `@theme inline` |
| Login redirect loop | Use `window.location.href` |
| CSP: inline style blocked | Add `'unsafe-inline'` |
