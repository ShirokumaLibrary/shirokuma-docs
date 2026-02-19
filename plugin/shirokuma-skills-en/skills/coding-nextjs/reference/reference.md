# Next.js Vibe Coder Knowledge Base

---

## Document Structure

各ファイルの責任範囲：

| ファイル | 責任 | 内容 |
|---------|------|------|
| **AGENT.md** | ワークフロー | 8ステップの実装手順のみ |
| **reference.md** (このファイル) | クイックリファレンス | Tech Stack, Pattern一覧, Known Issues |
| **checklists.md** | 品質ゲート | 実装完了前のチェックリスト |
| **templates/README.md** | テンプレート仕様 | テンプレート一覧と使い方 |
| **large-scale.md** | 分割ルール | ファイル分割の閾値とパターン |
| **patterns/*.md** | 詳細パターン | 個別の技術パターン（Source of Truth） |

**原則**: 情報は1箇所のみに記載。他は参照リンクのみ。

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 16 / React 19 / TypeScript 5 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Auth | Better Auth (DB sessions) |
| i18n | next-intl (ja/en) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Testing | Jest + Playwright |

> 詳細バージョン: プロジェクトの `CLAUDE.md` を参照

---

## Pattern Files

Detailed patterns are organized in `patterns/`.

| File | Description |
|------|-------------|
| [coding-conventions.md](patterns/coding-conventions.md) | Naming, imports, TypeScript, component structure |
| [testing.md](patterns/testing.md) | Jest config, mocks, redirect mock, i18n E2E selectors |
| [code-patterns.md](patterns/code-patterns.md) | Async params, Server Actions, i18n, forms, ownership check |
| [drizzle-orm.md](patterns/drizzle-orm.md) | Schema organization, queries, pagination, ILIKE |
| [better-auth.md](patterns/better-auth.md) | Admin verification, client-side session |
| [tailwind-v4.md](patterns/tailwind-v4.md) | CSS-first config, variable syntax, shadcn/ui |
| [radix-ui-hydration.md](patterns/radix-ui-hydration.md) | **CRITICAL** Mounted state pattern for DropdownMenu |
| [csp.md](patterns/csp.md) | Production CSP, style-src, worker-src configuration |
| [e2e-testing.md](patterns/e2e-testing.md) | Test isolation, fixtures, loading state testing |
| [documentation.md](patterns/documentation.md) | Test docs, API docs, JSDoc patterns |
| [csrf-protection.md](patterns/csrf-protection.md) | Two-function auth pattern, CSRF validation |
| [rate-limiting.md](patterns/rate-limiting.md) | Redis-based rate limiting, limiter config |
| [image-optimization.md](patterns/image-optimization.md) | LocalStack workaround, OptimizedAvatar |

---

## Quick Reference

詳細はパターンファイルを参照。ここでは最重要パターンのみ記載。

### Radix UI Hydration (CRITICAL)

```typescript
const [mounted, setMounted] = useState(false)
useEffect(() => { setMounted(true) }, [])

if (!mounted) return <PlaceholderWithoutRadixUI />
return <ComponentWithRadixUI />
```

→ 詳細: [radix-ui-hydration.md](patterns/radix-ui-hydration.md)

### Key Patterns (詳細は各ファイル参照)

| Pattern | File | 概要 |
|---------|------|------|
| Async Params | [code-patterns.md](patterns/code-patterns.md) | `params: Promise<...>` → `await params` |
| Server Actions | [code-patterns.md](patterns/code-patterns.md) | `verifyAdminMutation()` → Validation → DB → Redirect |
| CSRF Protection | [csrf-protection.md](patterns/csrf-protection.md) | Queries: `verifyAdmin()`, Mutations: `verifyAdminMutation()` |
| Rate Limiting | [rate-limiting.md](patterns/rate-limiting.md) | `checkRateLimit()` for destructive ops |
| Ownership Check | [code-patterns.md](patterns/code-patterns.md) | Verify `authorId === userId` before mutation |

---

## Known Issues

| Issue | Symptom | Fix |
|-------|---------|-----|
| Hydration mismatch | Console error "Hydration failed..." | Use `mounted` state pattern |
| Sidebar overlap | Layout breaks after adding shadcn component | Run CSS variable fix script |
| ILIKE injection | Search returns unexpected results | Use `escapeLikePattern()` |
| Slow page load | N+1 queries | Use batch queries with `inArray()` |
| Static rendering fails | Translations slow | Add `setRequestLocale(locale)` |
| Japanese 404 | Tag/category pages not found | Use `decodeURIComponent(slug)` |
| Login redirect loop | Returns to login after success | Use `window.location.href` |
| CSP: inline style blocked | Production: "style-src ... violated" | Add `'unsafe-inline'` to style-src |
| Monaco Editor broken | No syntax highlight, worker errors | Add `worker-src 'self' blob:'` to CSP |
| LocalStack image 400 | Avatar not displayed, 400 Bad Request | Use `unoptimized` prop. See [image-optimization.md](patterns/image-optimization.md) |
| Rate limit exceeded | "Try again in Xs" error | Expected behavior. Wait or adjust `RateLimiters` config |

---

## Command Reference

```bash
# Testing
pnpm --filter admin test              # Run all
pnpm --filter admin test --watch      # Watch mode
pnpm --filter admin test --coverage   # With coverage
npx playwright test --reporter=list   # E2E tests (Playwright Server)

# Linting
pnpm --filter admin lint              # ESLint
pnpm --filter admin lint --fix        # Auto-fix
pnpm --filter admin tsc --noEmit      # TypeScript

# Development
pnpm dev:admin                        # Start dev server
pnpm --filter admin build             # Production build

# Database
pnpm --filter @repo/database db:push  # Apply schema
pnpm --filter @repo/database db:seed  # Seed data
```

---

## Seed Data Structure

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | Admin@Test2024! |
| User | user@example.com | User@Test2024! |

### Content Data

| Entity | Count | Notes |
|--------|-------|-------|
| Categories | 5 | 技術, プログラミング, Web開発, etc. |
| Tags | 10 | JavaScript, TypeScript, React, etc. |
| Posts | 150 | 30 per category, with Markdown content |
| Comments | ~45 | Mix of approved/pending/deleted, includes replies |

### Running Seed

```bash
# Inside Docker (uses correct DATABASE_URL)
docker compose exec -T admin-app pnpm --filter @repo/database db:seed

# Direct with explicit URL
DATABASE_URL="postgresql://..." pnpm --filter @repo/database db:seed
```

---

## File Structure Reference

| Path | Purpose |
|------|---------|
| `app/[locale]/(dashboard)/features/page.tsx` | List page |
| `app/[locale]/(dashboard)/features/new/page.tsx` | Create page |
| `app/[locale]/(dashboard)/features/[id]/edit/page.tsx` | Edit page |
| `components/ui/` | shadcn/ui components |
| `components/feature-form.tsx` | Feature-specific form |
| `lib/actions/features.ts` | Server Actions |
| `messages/{ja,en}/` | i18n translations (directory format) |
| `__tests__/` | Unit tests |
