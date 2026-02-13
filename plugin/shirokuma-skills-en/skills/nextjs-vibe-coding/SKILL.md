---
name: nextjs-vibe-coding
description: TDD implementation workflow for Next.js projects. Use when implementing features, creating components, building pages, or adding functionality.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, AskUserQuestion, TodoWrite
---

# Next.js Vibe Coding Skill

Test-first implementation workflow for Next.js projects with modern tech stack.

## When to Use

Automatically invoke when the user:
- Requests "implement feature", "機能追加", "実装して"
- Wants "create component", "コンポーネント作成"
- Says "build page", "ページ作成", "画面を作って"
- Mentions TDD implementation, test-first development
- Describes a feature in natural language (vibe coding)

## Core Philosophy

**Vibe Coding**: Transform natural language descriptions into working code
**Test-First**: ALWAYS write tests BEFORE implementation - NO EXCEPTIONS

```
User Request → Understand → Plan → WRITE TESTS → Verify Tests Exist → Implement → Run Tests → Verify Docs → Refine → Report → Portal
```

**10 Steps**: Understand → Plan → **Write Tests** → **Verify Tests** → Implement → Run Tests → **Verify Docs** → Refine → Report → **Portal** (optional)

> **CRITICAL RULE**: You MUST NOT proceed to Step 5 (Implement) until test files are created and verified. If you skip tests, you are violating the core contract of this skill.

## Architecture

- `SKILL.md` - This file (core workflow)
- `patterns/` - Generic patterns (testing, drizzle-orm, better-auth, etc.)
- `reference/` - Checklists, large-scale rules
- `templates/` - Code templates for Server Actions, components, pages
- `.claude/rules/` - Project-specific conventions (auto-loaded)

## Before Starting

1. Rules in `.claude/rules/` are auto-loaded based on file paths
2. Check project's `CLAUDE.md` for project-specific conventions
3. Use templates from `templates/` directory as starting points

## Workflow

### Step 1: Understand Request

Parse the user's natural language request:

- **What**: Feature/component/page to build
- **Where**: Which app and path
- **Why**: User-facing behavior expected
- **Constraints**: Performance, accessibility, i18n requirements

If unclear, use AskUserQuestion with specific options (e.g., "Server or Client Component?", "Which app?").

### Step 2: Plan Implementation

Use TodoWrite to create a progress tracker for the implementation steps (understand → plan → test → implement → verify). This helps the user see progress through the multi-step TDD workflow.

Create a checklist:

```markdown
## Implementation Plan

### Files to Create
- [ ] `lib/actions/feature.ts` - Server Actions
- [ ] `app/[locale]/(dashboard)/feature/page.tsx` - Page
- [ ] `components/feature-form.tsx` - Form component
- [ ] `__tests__/lib/actions/feature.test.ts` - Action tests
- [ ] `__tests__/components/feature-form.test.tsx` - Component tests

### Files to Modify
- [ ] `messages/ja/*.json` - Japanese translations
- [ ] `messages/en/*.json` - English translations

### Dependencies (if needed)
- [ ] `pnpm add package-name`
- [ ] `npx shadcn@latest add component`
```

### Step 3: Write Tests First (MANDATORY)

**THIS STEP IS MANDATORY - DO NOT SKIP**

Create test files BEFORE any implementation code:

1. **Read templates first**:
   ```bash
   cat .claude/skills/nextjs-vibe-coding/templates/server-action.test.ts.template
   cat .claude/skills/nextjs-vibe-coding/templates/component.test.tsx.template
   ```

2. **Create test files using templates**:
   - `__tests__/lib/actions/{{name}}.test.ts` - Server Action tests
   - `__tests__/components/{{name}}-form.test.tsx` - Component tests

3. **Add @testdoc comments (REQUIRED)**:
   Each test MUST have a JSDoc comment with description:

   ```typescript
   /**
    * @testdoc Can create a new user
    * @purpose Verify normal user creation API flow
    * @precondition Valid user data is provided
    * @expected User is saved to DB and ID is returned
    */
   it("should create a new user", async () => {
     // test implementation
   });
   ```

   > **Note**: Write @testdoc content in English.

4. **Minimum test coverage required**:
   - Server Actions: Create, Read (list + single), Update, Delete
   - Components: Render, Form submission, Validation errors, Loading states

See [patterns/testing.md](patterns/testing.md) for mock setup.

### Step 4: Verify Tests Exist (GATE)

**CHECKPOINT - DO NOT PROCEED WITHOUT PASSING THIS GATE**

Before implementing, verify test files exist:

```bash
# Verify test files were created
ls -la __tests__/lib/actions/{{name}}.test.ts
ls -la __tests__/components/{{name}}-form.test.tsx
```

**If test files do not exist, GO BACK TO STEP 3.**

Only after confirming test files exist, proceed to implementation.

### Step 5: Implement

Use templates from `templates/` directory:
- `server-action.ts.template` - Server Action implementation
- `form-component.tsx.template` - Form component
- `page-list.tsx.template` - List page
- `page-new.tsx.template` - Create page
- `page-edit.tsx.template` - Edit page
- `delete-button.tsx.template` - Delete button with dialog

See [patterns/code-patterns.md](patterns/code-patterns.md) for tech-specific patterns.

### Step 6: Run Tests (REQUIRED)

**ALL tests must pass before completing**

```bash
# Lint & Type Check
pnpm --filter {app} lint
pnpm --filter {app} tsc --noEmit

# Run Unit Tests - MUST PASS
pnpm --filter {app} test

# E2E if applicable
pnpm test:e2e --grep "feature"
```

**If tests fail:**
1. Fix the implementation (not the tests)
2. Re-run tests until all pass
3. Only then proceed to Step 6.5

### Step 6.5: shirokuma-docs Verification (REQUIRED)

**Verify test documentation quality before completing**

```bash
# Test documentation lint (@testdoc, @skip-reason)
shirokuma-docs lint-tests -p . -f terminal

# Implementation-test coverage check
shirokuma-docs lint-coverage -p . -f summary

# Code structure check (Server Actions, annotations)
shirokuma-docs lint-code -p . -f terminal
```

**Required checks:**

| Check | Pass Criteria | Fix |
|-------|---------------|-----|
| `skipped-test-report` | All `.skip` have `@skip-reason` | Add `@skip-reason` annotation |
| `testdoc-required` | All tests have `@testdoc` | Add Japanese description |
| `lint-coverage` | New files have tests | Create test or add `@skip-test` |

**If issues found:**
1. Add missing `@testdoc` comments
2. Add `@skip-reason` for any `.skip` tests
3. Re-run lint commands until clean
4. Only then proceed to Step 7

### Step 7: Refine

Based on test results and lint feedback:
1. Add edge case tests
2. Improve UX (loading states, error handling)
3. Optimize (reduce re-renders, improve queries)
4. Update documentation if needed

### Step 8: Generate Report

**Create Discussion in Reports category:**

1. Write report with structure from [reference/report-template.md](reference/report-template.md)
2. Create Discussion:
   ```bash
   shirokuma-docs discussions create \
     --category Reports \
     --title "[Implementation] {feature-name}" \
     --body "$(cat report.md)"
   ```
3. Report the Discussion URL to the user

> See `rules/output-destinations.md` for output destination policy.

### Step 9: Update Portal (For Significant Changes)

**When to run**: After significant implementations (new features, multiple files, architectural changes)

```bash
# Build documentation portal
shirokuma-docs portal -p . -o docs/portal

# Or use the shirokuma-md skill
/shirokuma-md build
```

**Triggers for portal update**:
- New Server Actions added
- New screens/pages created
- Database schema changes
- New components with `@usedComponents` annotations

**Skip if**: Minor fixes, single file changes, test-only updates

## Reference Documents

### Skill Documents

| Document | Content | When to Read |
|----------|---------|--------------|
| [patterns/testing.md](patterns/testing.md) | Test patterns and mock setup | Writing tests |
| [patterns/code-patterns.md](patterns/code-patterns.md) | Tech pattern collection | During implementation |
| [patterns/coding-conventions.md](patterns/coding-conventions.md) | Coding conventions | Writing code |
| [patterns/better-auth.md](patterns/better-auth.md) | Better Auth patterns | Auth implementation |
| [patterns/drizzle-orm.md](patterns/drizzle-orm.md) | Drizzle ORM patterns | DB operations |
| [patterns/e2e-testing.md](patterns/e2e-testing.md) | E2E test patterns | Playwright tests |
| [patterns/tailwind-v4.md](patterns/tailwind-v4.md) | Tailwind v4 CSS variable issues | Tailwind styling |
| [patterns/radix-ui-hydration.md](patterns/radix-ui-hydration.md) | Hydration error fixes | Radix UI usage |
| [patterns/csrf-protection.md](patterns/csrf-protection.md) | CSRF protection patterns | Server Action implementation |
| [patterns/csp.md](patterns/csp.md) | Content Security Policy | CSP configuration |
| [patterns/rate-limiting.md](patterns/rate-limiting.md) | Rate limiting patterns | API protection |
| [patterns/image-optimization.md](patterns/image-optimization.md) | Image optimization | next/image usage |
| [patterns/documentation.md](patterns/documentation.md) | Documentation conventions | Writing JSDoc |
| [reference/checklists.md](reference/checklists.md) | Quality checklists | After implementation |
| [reference/large-scale.md](reference/large-scale.md) | File split rules | Large features |
| [reference/report-template.md](reference/report-template.md) | Report template | Report generation |
| [reference/reference.md](reference/reference.md) | External references | Research |
| [templates/README.md](templates/README.md) | Template list and usage | Code generation |

## Quick Commands

```bash
# Lint & Format (recommended: batch fix)
pnpm --filter {app} fix          # ESLint + Prettier batch fix

# Lint & Type Check
pnpm --filter {app} lint         # ESLint check
pnpm --filter {app} lint:fix     # ESLint auto-fix
pnpm --filter {app} tsc --noEmit # Type check

# Format
pnpm --filter {app} format       # Prettier format
pnpm --filter {app} format:check # Prettier diff check

# Test
pnpm --filter {app} test
pnpm --filter {app} test --watch

# Build
pnpm --filter {app} build

# Dev
pnpm dev:{app}
```

## Language

All code, comments, JSDoc annotations, and commit messages MUST be in English (per `git-commit-style` rule). The `@testdoc` tag content must also be in English.

## Next Steps

When invoked directly (not via `working-on-issue`), suggest the next workflow step after implementation:

```
Implementation complete. Next step:
→ `/committing-on-issue` to stage and commit your changes
```

## Notes

- **TESTS ARE NOT OPTIONAL** - No exceptions, no excuses
- **REPORTS ARE REQUIRED** - Create Discussion in Reports category (see `rules/output-destinations.md`)
- **CONVENTIONS ARE MANDATORY** - Rules in `.claude/rules/` are auto-loaded
- Use templates as starting points, customize as needed
- If you cannot write tests, explain why and stop
