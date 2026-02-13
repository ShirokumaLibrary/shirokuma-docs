---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "lib/actions/**/*.ts"
  - "**/app/**/page.tsx"
  - "components/**/*.tsx"
---

# shirokuma-docs Annotations

## Required by File Type

| File Type | Required Tags |
|-----------|---------------|
| Test (`*.test.ts`) | `@testdoc` on each `it()` |
| Server Action | `@serverAction`, `@feature`, `@dbTables` |
| Page component | `@screen`, `@route` |
| Component | `@component` |
| Type-only file | `@skip-test` |

## Test Annotation (REQUIRED)

```typescript
/**
 * @testdoc Creates a new user with valid data
 * @purpose Verify user creation happy path
 * @precondition Valid email and password
 * @expected User is created and ID is returned
 */
it("should create user with valid data", async () => {
  // test
});
```

## Screen Annotation

```typescript
/**
 * Dashboard screen
 *
 * @screen DashboardScreen
 * @route /dashboard
 * @usedComponents ProjectList, ActivityFeed
 * @usedActions getProjects, getActivities
 */
export default function DashboardPage() { }
```

## Server Action Annotation

```typescript
/**
 * Get project list
 *
 * @serverAction
 * @feature ProjectManagement
 * @dbTables projects
 * @authLevel member
 */
export async function getProjects(orgId: string) { }
```

## Skip Test Annotation

```typescript
/**
 * @skip-test Type definitions only - no runtime logic
 */
export type Project = typeof projects.$inferSelect
```

## Verification

```bash
shirokuma-docs lint-tests -p . -f terminal
shirokuma-docs lint-coverage -p . -f summary
```
