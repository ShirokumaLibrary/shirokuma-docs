# Testing Patterns

## Test Documentation (REQUIRED)

All tests MUST have JSDoc comments with @testdoc tags. This enables:
- Japanese test descriptions in documentation
- Automated documentation generation
- Test intent tracking

### JSDoc Format

```typescript
/**
 * @testdoc 日本語でのテスト説明
 * @purpose テストの目的を説明
 * @precondition 前提条件
 * @expected 期待される結果
 */
it("english test name for code", async () => {
  // test implementation
});
```

### Examples

```typescript
describe("createUser", () => {
  /**
   * @testdoc 有効なデータで新規ユーザーを作成できる
   * @purpose ユーザー作成の正常系確認
   * @precondition 有効なメールアドレスとパスワード
   * @expected ユーザーが作成され、IDが返される
   */
  it("should create user with valid data", async () => {
    // ...
  });

  /**
   * @testdoc 重複メールアドレスでエラーを返す
   * @purpose 重複チェックの動作確認
   * @expected DUPLICATE_EMAIL エラーが返される
   */
  it("should return error for duplicate email", async () => {
    // ...
  });
});
```

### Lint Test Documentation

```bash
# Check test documentation coverage
shirokuma-docs lint-tests -p . -c shirokuma-docs.config.yaml -f summary

# Detailed report
shirokuma-docs lint-tests -p . -c shirokuma-docs.config.yaml -f terminal

# CI mode with threshold
shirokuma-docs lint-tests -p . --strict --coverage-threshold 50
```

### Implementation-Test Coverage Check

```bash
# Check source-test file mapping
shirokuma-docs lint-coverage -p . -c shirokuma-docs.config.yaml

# Summary only
shirokuma-docs lint-coverage -p . -c shirokuma-docs.config.yaml -f summary

# Strict mode (fail on missing tests)
shirokuma-docs lint-coverage -p . -c shirokuma-docs.config.yaml -s
```

### @skip-test Annotation

For files that don't need tests, add JSDoc annotation:

```typescript
/**
 * @skip-test 自動生成コードのためテスト不要
 */
export const generatedSchema = { ... }
```

Valid skip reasons:
- 自動生成 (auto-generated code)
- shadcn/ui (library components)
- E2Eでカバー (covered by E2E tests)
- 外部ライブラリ (external library wrapper)
- 単純なre-export (simple re-export)

## Jest Configuration

```javascript
// jest.config.js
const nextJest = require("next/jest")

const createJestConfig = nextJest({ dir: "./" })

module.exports = createJestConfig({
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@repo/database$": "<rootDir>/../../packages/database/src",
  },
})
```

## Jest Setup (Mocks)

```typescript
// jest.setup.ts
import "@testing-library/jest-dom"

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "ja",
}))
```

## Testing Server Actions (Queue-Based Mock Pattern)

Server Actions often execute multiple database queries. Use the queue-based pattern:

```typescript
// Mock database with FIFO queue for multiple queries
jest.mock("@repo/database", () => {
  const queryResults: any[] = []  // FIFO queue

  const createQueryBuilder = () => {
    const builder: any = {
      from: jest.fn(() => builder),
      where: jest.fn(() => builder),
      orderBy: jest.fn(() => builder),
      limit: jest.fn(() => builder),
      offset: jest.fn(() => builder),
      set: jest.fn(() => builder),
      returning: jest.fn(() => builder),
      then: (resolve: any, reject: any) => {
        const result = queryResults.shift() ?? []
        if (result instanceof Error) return Promise.reject(result).catch(reject)
        return Promise.resolve(result).then(resolve)
      },
      catch: (handler: any) => Promise.resolve([]).catch(handler),
    }
    return builder
  }

  return {
    db: {
      select: jest.fn(() => createQueryBuilder()),
      insert: jest.fn(() => createQueryBuilder()),
      update: jest.fn(() => createQueryBuilder()),
      delete: jest.fn(() => createQueryBuilder()),
    },
    posts: { id: "id", title: "title", status: "status" },
    eq: jest.fn((col, val) => ({ type: "eq", col, val })),
    __queryResults__: queryResults,
  }
})

// Get queue reference
const dbModule = require("@repo/database") as any
const queryResults = dbModule.__queryResults__ as any[]
const queueQueryResult = (...results: any[]) => results.forEach(r => queryResults.push(r))
const clearQueryResults = () => { queryResults.length = 0 }

// Mock auth
jest.mock("@/lib/auth", () => ({
  verifyAdmin: jest.fn().mockResolvedValue({
    user: { id: "user-1", email: "admin@example.com", role: "admin" },
  }),
}))

// Mock headers & cache
jest.mock("next/headers", () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}))
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

// Usage in tests
beforeEach(() => { jest.clearAllMocks(); clearQueryResults() })

it("fetches paginated data", async () => {
  queueQueryResult([{ count: 50 }], [{ id: "1", title: "Post" }])
  const result = await getPaginatedPosts(1, 10)
  expect(result.data).toHaveLength(1)  // Note: `data` not `items`
})
```

## Testing Components with i18n

```typescript
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

const messages = { common: { save: "Save" }, features: { title: "Features" } }

function renderWithProviders(ui: React.ReactElement, locale = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}
```

## Redirect Mock Pattern

Server Actions that call `redirect()` need special handling in tests:

```typescript
// Mock next/navigation with redirect that throws
jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/",
}))

// Test redirect behavior
it("redirects on success", async () => {
  // Setup mocks...
  mockVerifyAdminMutation.mockResolvedValueOnce("user-1")
  queueQueryResult([])  // No duplicate found

  await expect(createFeature(validFormData())).rejects.toThrow("NEXT_REDIRECT:/features")
  expect(revalidatePath).toHaveBeenCalledWith("/features")
})
```

## i18n-Aware E2E Selectors

Use regex with both language alternatives:

```typescript
// Pattern: /English|日本語/i
await page.getByRole("heading", { name: /Post Management|投稿管理/i })
await page.getByText(/Draft|下書き/i)
await page.getByRole("button", { name: /Update|更新/i })
await page.getByLabel(/^Email$|^メールアドレス$/i)
await page.getByRole("button", { name: /login|ログイン|Log in/i })
```

## E2E Test Setup Pattern

```typescript
import { test, expect } from "@playwright/test"
import { TEST_USERS } from "../fixtures/test-users"
import { redisHelper } from "../helpers/redis"

test.describe.serial("Feature CRUD Operations", () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear state
    await context.clearCookies()
    await redisHelper.clearAllTestState()

    // Login with i18n-aware selectors
    await page.goto("/login")
    await page.getByRole("textbox", { name: /Email|メールアドレス/i }).fill(TEST_USERS.admin.email)
    await page.getByLabel(/^Password$|^パスワード$/i).fill(TEST_USERS.admin.password)
    await page.getByRole("button", { name: /login|ログイン|Log in/i }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 15000 })
  })

  test("can create an item", async ({ page }) => {
    await page.goto("/features/new")
    await page.getByRole("textbox", { name: /Name|名前/i }).fill("Test Feature")
    await page.getByRole("button", { name: /Create|作成/i }).click()
    await expect(page).toHaveURL(/\/features(?:\?.*)?$/, { timeout: 10000 })
  })
})
```

## Command Reference

```bash
# Testing
pnpm --filter admin test              # Run all
pnpm --filter admin test --watch      # Watch mode
pnpm --filter admin test --coverage   # With coverage

# E2E tests (Playwright Server)
npx playwright test --reporter=list
```
