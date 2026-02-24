# TDD Common Workflow

Common TDD (Test-Driven Development) steps orchestrated by `working-on-issue`.
Executed before and after the implementation skill (`coding-nextjs`, direct edit, etc.).

## Flow

```
Test Design → Test Creation → Test Gate → [Implementation Skill] → Test Run → Verification
```

## Step 1: Test Design

Design test cases for the target feature:

- **What**: Feature/behavior to test
- **Scope**: Unit / Integration / E2E
- **Cases**: Happy path, error cases, edge cases

### Minimum Test Coverage

| Target | Required Test Cases |
|--------|-------------------|
| Server Actions | Create, Read (list + single), Update, Delete |
| Components | Render, form submission, validation errors, loading state |
| API Routes | Success, auth error, validation error |
| Utilities | Happy path, edge cases, error cases |

## Step 2: Test Creation

Create test files **before** implementation code.

### @testdoc Comments (Required)

Add descriptive JSDoc comments to each test:

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

## Step 3: Test Gate

**Do NOT proceed to implementation without passing this gate.**

Verify test files exist:

```bash
ls -la __tests__/lib/actions/{{name}}.test.ts
ls -la __tests__/components/{{name}}.test.tsx
```

If test files don't exist, go back to Step 2.

## Step 4: Test Run

After implementation, verify all tests pass:

```bash
# Unit tests
pnpm --filter {app} test

# Lint & type check
pnpm --filter {app} lint
pnpm --filter {app} tsc --noEmit
```

### On Test Failure

1. **Fix the implementation, not the tests**
2. Re-run tests until all pass
3. Proceed to next step only after all pass

## Step 5: Documentation Verification

```bash
# Test documentation lint
shirokuma-docs lint-tests -p . -f terminal

# Implementation-test coverage check
shirokuma-docs lint-coverage -p . -f summary

# Code structure check
shirokuma-docs lint-code -p . -f terminal
```

| Check | Pass Criteria | Fix |
|-------|-------------|-----|
| `skipped-test-report` | All `.skip` have `@skip-reason` | Add `@skip-reason` |
| `testdoc-required` | All tests have `@testdoc` | Add description |
| `lint-coverage` | New files have tests | Create test or `@skip-test` |

## Required Rules

- Tests are NOT optional — no exceptions
- Do NOT proceed to implementation until test files are created and verified
- Skipping tests violates the skill's fundamental contract
