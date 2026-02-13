# Next.js Review Role

## Responsibilities

Next.js project-specific review covering:
- App Router patterns
- Server/Client component usage
- Data fetching patterns
- Tailwind CSS v4 compliance
- shadcn/ui integration
- next-intl configuration

## Required Knowledge

Load ALL knowledge files for comprehensive review:

**Skill files (explicit load):**
- `../criteria/code-quality.md` - Quality criteria
- `../criteria/security.md` - Security criteria
- `../criteria/testing.md` - Testing criteria
- `../patterns/drizzle-orm.md` - Database patterns
- `../patterns/better-auth.md` - Auth patterns
- `../patterns/server-actions.md` - Server Action patterns
- `../patterns/i18n.md` - i18n patterns
- `../patterns/e2e-testing.md` - E2E testing patterns

**Rules (auto-loaded from `.claude/rules/`):**
- `tech-stack.md` - Version information
- `known-issues.md` - Known issues

## Review Checklist

### Next.js 16
- [ ] Async params handled (`await params`)
- [ ] Node.js 20.9.0+ used
- [ ] TypeScript 5.1.0+ used
- [ ] Parallel routes have default.js

### Server/Client Components
- [ ] Data fetching in Server Components
- [ ] `"use client"` only when needed
- [ ] No hooks in Server Components
- [ ] Proper component boundaries

### Server Actions
- [ ] `"use server"` directive
- [ ] Auth check at start
- [ ] Zod validation
- [ ] revalidatePath/Tag used
- [ ] Structured responses

### Tailwind CSS v4
- [ ] CSS-first config (no tailwind.config.ts)
- [ ] var() syntax used correctly
- [ ] Important modifier suffix (`h-10!`)
- [ ] Migration script run after shadcn add

### shadcn/ui
- [ ] canary version used
- [ ] Migration script run
- [ ] components.json configured
- [ ] No v3 CSS variable syntax

### next-intl
- [ ] setRequestLocale at top of pages
- [ ] Japanese slugs decoded
- [ ] Both locales have translations
- [ ] Client/Server patterns correct

### Better Auth
- [ ] Role check via database
- [ ] window.location.href for redirects
- [ ] credentials: "include" on client
- [ ] Secure cookie settings

### E2E Considerations
- [ ] Rate limiting relaxed for dev
- [ ] Multi-step auth timeouts
- [ ] i18n in test assertions

## Framework-Specific Issues

### Must Check

1. **CVE-2025-29927**: Middleware bypass
2. **Async params**: Breaking change in Next.js 16
3. **CSS variables**: v4 syntax required
4. **setRequestLocale**: Required for SSG

## Report Format

Use template from `templates/report.md`:

1. **Framework Summary**: Next.js/React compliance
2. **Version Issues**: Outdated or incompatible
3. **Pattern Violations**: Anti-patterns found
4. **Known Issues**: Matching CVEs/bugs
5. **Migration Needs**: Updates required

## Trigger Keywords

- "Next.js review"
- "プロジェクトレビュー"
- "nextjs review"
- "app router review"
