---
name: coding-nextjs
description: Implementation skill for Next.js projects. Provides framework-specific templates and patterns. TDD workflow is managed by working-on-issue. Use when implementing features, creating components, building pages.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, AskUserQuestion, TodoWrite
---

# Next.js Coding

Framework-compliant implementation using Next.js-specific templates and patterns.

> **TDD Management**: Test design, creation, and execution are orchestrated by `working-on-issue`. This skill focuses on **implementation only**.

## When to Use

- When delegated from `working-on-issue` dispatch condition table
- Next.js-specific implementation (Server Actions, pages, components)

## Architecture

- `SKILL.md` - Core workflow (implementation only)
- `patterns/` - Next.js-specific patterns (drizzle-orm, better-auth, csrf, etc.)
- `reference/` - Checklists, large-scale rules
- `templates/` - Server Actions, component, and page code templates

## Before Starting

1. Rules in `.claude/rules/` are auto-loaded based on file paths
2. Check project `CLAUDE.md` for project-specific conventions
3. Use `templates/` as starting points

## Workflow

> **Note**: Test design, creation, and gate are managed by `working-on-issue` TDD workflow. This skill starts from **implementation**.

### Step 1: Implementation Plan

Create progress tracker with TodoWrite.

```markdown
## Implementation Plan

### Files to Create
- [ ] `lib/actions/feature.ts` - Server Actions
- [ ] `app/[locale]/(dashboard)/feature/page.tsx` - Page
- [ ] `components/feature-form.tsx` - Form component

### Dependencies (if needed)
- [ ] `pnpm add package-name`
- [ ] `npx shadcn@latest add component`
```

### Step 2: Implementation

Use `templates/`:
- `server-action.ts.template` - Server Action implementation
- `form-component.tsx.template` - Form component
- `page-list.tsx.template` - List page
- `page-new.tsx.template` - Create page
- `page-edit.tsx.template` - Edit page
- `delete-button.tsx.template` - Delete button with dialog

See [patterns/code-patterns.md](patterns/code-patterns.md) for technical patterns.

> **Test execution and verification** are managed by `working-on-issue` TDD workflow.

### Step 3: Refinement

Based on implementation feedback:
1. Add edge case tests
2. Improve UX (loading states, error handling)
3. Optimize (reduce re-renders, improve queries)

### Step 4: Report Generation

```bash
shirokuma-docs discussions create \
  --category Reports \
  --title "[Implementation] {feature-name}" \
  --body report.md
```

### Step 5: Portal Update (for significant changes)

```bash
shirokuma-docs portal -p . -o docs/portal
```

**Trigger**: New Server Actions, screens/pages, DB schema changes
**Skip**: Minor fixes, single-file changes

## Reference Documents

| Document | Content | When to Read |
|----------|---------|-------------|
| [patterns/testing.md](patterns/testing.md) | Test patterns, mock setup | Test creation |
| [patterns/code-patterns.md](patterns/code-patterns.md) | Technical patterns | Implementation |
| [patterns/coding-conventions.md](patterns/coding-conventions.md) | Coding conventions | When writing code |
| [patterns/better-auth.md](patterns/better-auth.md) | Better Auth patterns | Auth implementation |
| [patterns/drizzle-orm.md](patterns/drizzle-orm.md) | Drizzle ORM patterns | DB operations |
| [patterns/e2e-testing.md](patterns/e2e-testing.md) | E2E test patterns | Playwright test creation |
| [patterns/tailwind-v4.md](patterns/tailwind-v4.md) | Tailwind v4 CSS variable issues | Tailwind styling |
| [patterns/radix-ui-hydration.md](patterns/radix-ui-hydration.md) | Hydration fix patterns | When using Radix UI |
| [patterns/csrf-protection.md](patterns/csrf-protection.md) | CSRF defense | Server Action implementation |
| [patterns/csp.md](patterns/csp.md) | Content Security Policy | CSP configuration |
| [patterns/rate-limiting.md](patterns/rate-limiting.md) | Rate limiting patterns | API protection |
| [patterns/image-optimization.md](patterns/image-optimization.md) | Image optimization | When using next/image |
| [patterns/documentation.md](patterns/documentation.md) | Documentation conventions | When writing JSDoc |
| [reference/checklists.md](reference/checklists.md) | Quality checklists | After implementation |
| [reference/large-scale.md](reference/large-scale.md) | File splitting rules | Large feature implementation |
| [reference/report-template.md](reference/report-template.md) | Report template | Report generation |
| [reference/reference.md](reference/reference.md) | External references | Research |
| [templates/README.md](templates/README.md) | Template list | Code generation |

## Quick Commands

```bash
pnpm --filter {app} fix          # ESLint + Prettier auto-fix
pnpm --filter {app} lint         # ESLint check
pnpm --filter {app} tsc --noEmit # Type check
pnpm --filter {app} test         # Run tests
pnpm --filter {app} build        # Build
```

## Next Steps

When invoked directly (not via `working-on-issue` chain):

```
Implementation complete. Next step:
→ `/committing-on-issue` to stage and commit your changes
```

## Notes

- **Reports are required** — Create Discussion in Reports category
- **Conventions are required** — `.claude/rules/` rules are auto-loaded
- Use templates as starting points, customize as needed
