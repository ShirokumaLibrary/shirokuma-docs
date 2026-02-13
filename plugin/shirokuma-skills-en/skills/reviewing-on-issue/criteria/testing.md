# Testing Review Criteria

## Test Coverage Requirements

### Minimum Coverage

- **Server Actions**: 80%+ (critical path)
- **Components**: 70%+ (user-facing)
- **Utilities**: 90%+ (reusable logic)
- **E2E**: Critical user flows

### What to Test

| Priority | Type | Examples |
|----------|------|----------|
| **High** | Server Actions | Auth, CRUD, validation |
| **High** | E2E Flows | Login, post creation, form submit |
| **Medium** | Components | Forms, interactive elements |
| **Medium** | Hooks | Custom hooks with state |
| **Low** | Simple UI | Static displays, layouts |

## Unit Test Criteria

### Required for Server Actions

- [ ] Success case with valid input
- [ ] Unauthorized access (no session)
- [ ] Forbidden access (wrong role)
- [ ] Validation errors
- [ ] Database errors
- [ ] Edge cases (empty, max length, special chars)

### Test Structure

```typescript
describe("createPost", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearQueryResults()  // Clear mock DB queue
  })

  describe("authentication", () => {
    it("returns error when not authenticated", async () => { ... })
    it("returns error when not admin", async () => { ... })
  })

  describe("validation", () => {
    it("returns error for empty title", async () => { ... })
    it("returns error for title exceeding max length", async () => { ... })
  })

  describe("success", () => {
    it("creates post and returns id", async () => { ... })
    it("revalidates posts path", async () => { ... })
  })

  describe("error handling", () => {
    it("handles database errors gracefully", async () => { ... })
  })
})
```

## E2E Test Criteria

### Required Tests

- [ ] Happy path for each feature
- [ ] Error states (validation, auth errors)
- [ ] Loading states
- [ ] Empty states
- [ ] Multi-step flows (auth, checkout)

### Best Practices

- [ ] Use semantic locators (getByRole, getByLabel)
- [ ] Test both languages (i18n)
- [ ] Clear state between tests (cookies, rate limits)
- [ ] Use test fixtures for data (TEST_USERS, testDb)
- [ ] Avoid arbitrary timeouts
- [ ] Handle order dependencies with `test.describe.serial`
- [ ] Use `beforeAll`/`afterAll` for database state management
- [ ] Restore seed data after destructive tests

### Database Fixtures for E2E

```typescript
import { testDb, seedTestDatabase } from "../helpers/database"

test.describe("Empty State", () => {
  test.beforeAll(async () => {
    await testDb.connect()
    await testDb.clearAllPosts()  // Clear for empty state test
  })

  test.afterAll(async () => {
    await testDb.disconnect()
    await seedTestDatabase()  // Restore for subsequent tests
  })
})
```

### Icon Button Locators

```typescript
// For icon-only buttons, use title attribute
const button = page.locator("button[title='Restore'], button[title='復元']")
```

## TDD Compliance

### Check Git History

```bash
# Verify test-first approach
git log --oneline --name-only -- "*.test.ts" "*.spec.ts"
```

### Red-Green-Refactor

1. **Red**: Test written and failing
2. **Green**: Minimal code to pass
3. **Refactor**: Improve without breaking

### Indicators of TDD

- Tests committed before implementation
- Tests describe behavior, not implementation
- Small, focused test cases
- No tests written after the fact to "cover" code

## Mock Patterns

### Server Action Mocks (Queue-Based)

```typescript
jest.mock("@repo/database", () => {
  const queryResults: any[] = []

  const createQueryBuilder = () => {
    const builder: any = {
      from: jest.fn(() => builder),
      where: jest.fn(() => builder),
      then: (resolve: any) => {
        const result = queryResults.shift() ?? []
        return Promise.resolve(result).then(resolve)
      },
    }
    return builder
  }

  return {
    db: { select: jest.fn(() => createQueryBuilder()) },
    __queryResults__: queryResults,
  }
})

// Usage
queueQueryResult([{ count: 10 }], [{ id: "1" }])
```

### Thenable Pattern for Drizzle Query Builders

The thenable pattern makes Drizzle query builders work as Promises:

```typescript
const createQueryBuilder = () => {
  const builder: any = {
    from: jest.fn(() => builder),
    where: jest.fn(() => builder),
    leftJoin: jest.fn(() => builder),
    orderBy: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    // Thenable pattern: makes builder awaitable
    then: (resolve: any) => {
      const result = queryResults.shift() ?? []
      return Promise.resolve(result).then(resolve)
    },
  }
  return builder
}

// Usage: Can be awaited directly
const posts = await db.select().from(postsTable).where(eq(postsTable.id, "1"))
// Or chained
const posts = await db.select().from(postsTable).where(...).orderBy(...).limit(10)
```

### Transaction Mock Pattern

Mock Drizzle transactions for operations that require rollback:

```typescript
const mockTransaction = jest.fn((callback) => {
  // Create a mock transaction context with all DB operations
  const tx = {
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: "new-id" }]),
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
  }

  // Execute callback with transaction context
  return callback(tx)
})

jest.mock("@repo/database", () => ({
  db: {
    transaction: mockTransaction,
    // ... other methods
  },
}))

// Usage in test
it("creates post with tags in transaction", async () => {
  const result = await createPost({
    title: "Test Post",
    tags: ["tag1", "tag2"],
  })

  // Verify transaction was called
  expect(mockTransaction).toHaveBeenCalledTimes(1)

  // Verify operations within transaction
  const tx = mockTransaction.mock.calls[0][0]
  expect(tx.insert).toHaveBeenCalled()
})
```

### Complete Transaction Mock Example

```typescript
describe("createPostWithTags", () => {
  let mockTransaction: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock transaction with proper chaining
    mockTransaction = jest.fn((callback) => {
      const tx = {
        insert: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([
          { id: "post-1", title: "Test Post" }
        ]),
        delete: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      }
      return callback(tx)
    })

    jest.mock("@repo/database", () => ({
      db: { transaction: mockTransaction },
    }))
  })

  it("creates post and tags atomically", async () => {
    const result = await createPostWithTags({
      title: "Test Post",
      content: "Content",
      tags: ["typescript", "testing"],
    })

    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(result.success).toBe(true)
    expect(result.data?.id).toBe("post-1")
  })

  it("rolls back on error", async () => {
    // Simulate error in transaction
    mockTransaction.mockImplementation(() => {
      throw new Error("Database error")
    })

    const result = await createPostWithTags({
      title: "Test Post",
      content: "Content",
      tags: ["typescript"],
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain("Failed to create post")
  })
})
```

### Auth Mocks

```typescript
jest.mock("@/lib/auth", () => ({
  verifyAdmin: jest.fn().mockResolvedValue({
    user: { id: "user-1", email: "admin@example.com", role: "admin" },
  }),
}))

// Override for specific test
import { verifyAdmin } from "@/lib/auth"
(verifyAdmin as jest.Mock).mockResolvedValueOnce(null)  // Unauthorized
```

### next/headers and next/cache Mocks

```typescript
jest.mock("next/headers", () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}))

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))
```

## Anti-Patterns

### Testing Implementation

```typescript
// Bad: Tests internal implementation
expect(db.select).toHaveBeenCalledWith(...)
expect(internalFunction).toHaveBeenCalled()

// Good: Tests behavior
const result = await getPost("123")
expect(result.success).toBe(true)
expect(result.data?.title).toBe("Expected Title")
```

### Flaky Tests

```typescript
// Bad: Time-dependent
expect(post.createdAt).toBe(new Date())

// Good: Time-independent
expect(post.createdAt).toBeInstanceOf(Date)

// Bad: Order-dependent
await page.click("button")
await page.waitForTimeout(1000)  // Arbitrary

// Good: Wait for condition
await expect(page.getByText("Success")).toBeVisible()
```

### Over-Mocking

```typescript
// Bad: Mock everything
jest.mock("@/lib/utils")
jest.mock("@/lib/helpers")
// Test now tests mocks, not real code

// Good: Mock only external dependencies
jest.mock("@repo/database")  // Database
jest.mock("next/cache")      // Framework
```

### E2E Anti-Patterns

```typescript
// Bad: Force click bypasses real UI issues
await link.click({ force: true })

// Bad: Direct URL navigation skips user journey
await page.goto(`/posts/${fixture.post.slug}`)

// Bad: Conditional skip when seed data should exist
const link = page.getByRole("link", { name: /Read more/i })
test.skip(!(await link.isVisible()), "No posts found")

// Good: Use mobile viewport to avoid sidebar overlay
test.use({ viewport: { width: 375, height: 667 } })

// Good: Assert seed data exists, then interact
await expect(link).toBeVisible({ timeout: 10000 })
await link.click()

// Good: Navigate through UI like a real user
await page.goto("/posts")
await page.getByRole("link", { name: /Read more/i }).first().click()
```

### Wrong Element Selectors

```typescript
// Bad: type="password" is NOT textbox role
await page.getByRole("textbox", { name: /Password/i })

// Bad: OG article tags don't have "og:" prefix
page.locator('meta[property="og:article:published_time"]')

// Good: Use CSS selector for password
await page.locator('input[type="password"]').first()

// Good: article:* is correct (no og: prefix)
page.locator('meta[property="article:published_time"]')
```

## Test Organization

### File Location

| Type | Path |
|------|------|
| Server Action | `apps/admin/lib/actions/posts.ts` |
| Action Test | `apps/admin/lib/actions/__tests__/posts.test.ts` |
| Component Test | `apps/admin/components/__tests__/post-form.test.tsx` |
| E2E Test | `tests/e2e/auth.spec.ts`, `tests/e2e/posts.spec.ts` |

### Naming Conventions

- Unit tests: `*.test.ts` or `*.test.tsx`
- E2E tests: `*.spec.ts`
- Test files in `__tests__/` directory
- Describe blocks match function/component names

## Test Commands

```bash
# Run all tests
pnpm --filter admin test

# Watch mode
pnpm --filter admin test --watch

# Coverage
pnpm --filter admin test --coverage

# E2E tests
npx playwright test --reporter=list

# Specific E2E file
npx playwright test auth.spec.ts
```
