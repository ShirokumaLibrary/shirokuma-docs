# E2E Testing Patterns

Related: [testing.md](../criteria/testing.md), [better-auth.md](better-auth.md)

## Directory Organization (App-Based)

Organize E2E tests by app in monorepo projects:

```
tests/e2e/
├── admin/           # Admin app tests
│   ├── auth/
│   ├── posts/
│   └── settings/
├── public/          # Public app tests
│   ├── blog/
│   ├── comments/
│   └── search/
├── shared/          # Cross-app tests (rare)
│   └── seo.test.ts
└── helpers/         # Shared test utilities
    ├── database.ts
    ├── fixtures.ts
    └── auth.ts
```

**Playwright Configuration**:
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: "admin", testDir: "./tests/e2e/admin", use: { baseURL: "https://admin-test.local.test" } },
    { name: "public", testDir: "./tests/e2e/public", use: { baseURL: "https://public-test.local.test" } },
  ],
})
```

**Benefits**: Clear ownership, parallel execution, easier maintenance, targeted CI/CD.

## Test Environment Isolation

Use separate test database and hosts:

| Environment | Host | Database |
|-------------|------|----------|
| Development | admin.local.test | blogcms_dev |
| E2E Test | admin-test.local.test | blogcms_test |

### Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: "http://admin-test.local.test",  // Test-specific host
  },
  webServer: undefined,  // Use external server
})
```

### Global Setup

```typescript
// tests/global-setup.ts
export default async function globalSetup() {
  // Reset test database before all tests
  execSync(`DATABASE_URL="${TEST_DB_URL}" pnpm --filter @repo/database db:push`)
  execSync(`DATABASE_URL="${TEST_DB_URL}" pnpm --filter @repo/database db:seed`)
}
```

## Rate Limiting for Tests

Better Auth rate limiting blocks E2E tests. Relax for development:

```typescript
// lib/auth.ts
rateLimit: {
  window: 15 * 60,
  max: process.env.NODE_ENV === "production" ? 5 : 1000,  // Relaxed for dev/test
}
```

## Multi-Step Auth Flow Timeouts

Admin login includes multiple API calls (signIn -> get-session -> check-admin):

```typescript
// Increase timeout for multi-step flows
await expect(page).toHaveURL(/\/$/, { timeout: 15000 })
```

## Loading State Testing

Use Promise-based blocking to reliably test loading states:

```typescript
test("should show loading state during login", async ({ page }) => {
  let resolveRequest: () => void
  const requestPromise = new Promise<void>((resolve) => {
    resolveRequest = resolve
  })

  // Block the request to keep loading state visible
  await page.route("**/api/auth/sign-in/**", async (route) => {
    await requestPromise
    await route.continue()
  })

  // Fill form
  await page.getByLabel("Email").fill("test@example.com")
  await page.getByLabel("Password").fill("password")

  // Get button reference before clicking
  const submitButton = page.getByRole("button", { name: /Log in/i })
  await submitButton.click()

  // Verify loading state - button text changes!
  const loadingButton = page.getByRole("button", { name: /Logging in/i })
  await expect(loadingButton).toBeVisible()
  await expect(loadingButton).toBeDisabled()

  // Release request to complete
  resolveRequest!()
})
```

## Button Text During Loading

Button locators need to account for text changes:

```typescript
// Before click: "Log in"
// During loading: "Logging in..."

// WRONG: Original locator fails during loading state
await expect(submitButton).toBeDisabled()  // Fails - locator can't find element

// CORRECT: Use new locator for loading state
const loadingButton = page.getByRole("button", { name: /Logging in/i })
await expect(loadingButton).toBeDisabled()
```

## Test Order Dependencies

When tests modify shared state (like passwords), handle order dependencies:

```typescript
test("should work after password change", async ({ page }) => {
  // Try multiple passwords if previous test changed it
  const passwords = [originalPassword, newPassword]
  let loggedIn = false

  for (const password of passwords) {
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: /Log in/i }).click()

    // Check if login succeeded
    if (page.url().includes("/dashboard")) {
      loggedIn = true
      break
    }
  }

  expect(loggedIn).toBe(true)
})
```

## i18n in E2E Tests

Handle both languages in assertions:

```typescript
// Match either English or Japanese
await expect(page.getByRole("button", { name: /Log in|ログイン/i })).toBeVisible()
await expect(page.getByText(/Invalid email or password|認証エラー/i)).toBeVisible()

// Link text varies by language
await expect(page.getByRole("link", { name: /Forgot password\?|パスワードをお忘れですか/i })).toBeVisible()
```

## Semantic Locators

Prefer semantic locators over CSS selectors:

```typescript
// Good: Semantic locators
await page.getByLabel("Email").fill("test@example.com")
await page.getByRole("button", { name: /Submit/i }).click()
await page.getByText("Success message").toBeVisible()

// Avoid: CSS selectors
await page.locator("#email-input").fill("test@example.com")
await page.locator(".submit-button").click()
```

## Test Isolation

Clear state between tests:

```typescript
test.beforeEach(async ({ page, context }) => {
  // Clear cookies for test isolation
  await context.clearCookies()
  // Clear rate limits
  await redisHelper.clearRateLimits("ratelimit:*")
  // Navigate to starting page
  await page.goto("/login")
})
```

## Database Fixtures (TestDatabaseClient)

Direct database access for E2E test data management:

```typescript
// tests/helpers/database.ts
import { Pool, PoolClient } from "pg"

const TEST_DATABASE_URL = "postgresql://postgres:password@localhost:5432/blogcms_test"
const pool = new Pool({ connectionString: TEST_DATABASE_URL, max: 5 })

export class TestDatabaseClient {
  private client: PoolClient | null = null

  async connect(): Promise<void> { this.client = await pool.connect() }
  async disconnect(): Promise<void> { this.client?.release(); this.client = null }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.client) throw new Error("Not connected")
    return (await this.client.query(sql, params)).rows as T[]
  }

  async clearTable(tableName: string): Promise<void> {
    const allowed = ["posts", "comments", "categories", "tags", "users"]
    if (!allowed.includes(tableName)) throw new Error("Table not allowed")
    await this.query(`TRUNCATE TABLE "${tableName}" CASCADE`)
  }

  async clearAllPosts(): Promise<void> {
    await this.query("TRUNCATE TABLE posts CASCADE")
  }

  async createComment(data: {
    postId: string; authorId: string; content: string;
    approved?: boolean; parentId?: string | null; deletedAt?: Date | null
  }): Promise<{ id: string }> {
    const result = await this.query<{ id: string }>(
      `INSERT INTO comments (id, post_id, author_id, content, approved, parent_id, deleted_at, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING id`,
      [data.postId, data.authorId, data.content, data.approved ?? false, data.parentId || null, data.deletedAt || null]
    )
    return result[0]
  }
}

export const testDb = new TestDatabaseClient()
```

### Empty State Testing Pattern

```typescript
import { testDb, seedTestDatabase } from "../helpers/database"

test.describe("Post List Empty State", () => {
  test.beforeAll(async () => {
    await testDb.connect()
    await testDb.clearAllPosts()
  })

  test.afterAll(async () => {
    await testDb.disconnect()
    await seedTestDatabase()  // Restore for other tests
  })

  test("should display empty state", async ({ page }) => {
    await page.goto("/posts")
    await expect(page.getByText(/No posts|投稿がありません/i)).toBeVisible()
  })
})
```

## Serial Test Execution

Use `test.describe.serial` for tests that modify shared state:

```typescript
test.describe.serial("Comment Moderation", () => {
  test("should approve a pending comment", async ({ page }) => {
    await page.goto("/comments?filter=pending")
    const initialCount = await page.locator("table tbody tr").count()
    await page.locator("button[title='Approve'], button[title='承認']").first().click()
    await page.waitForLoadState("networkidle")
    const newCount = await page.locator("table tbody tr").count()
    expect(newCount).toBeLessThan(initialCount)
  })

  test("should delete a comment", async ({ page }) => {
    // Runs after approval test
  })
})
```

## Icon Button Testing

For icon-only buttons with `title` attribute:

```typescript
// Find by title attribute (both languages)
const restoreButton = page.locator("button[title='Restore'], button[title='復元']").first()
await expect(restoreButton).toBeVisible({ timeout: 5000 })
await restoreButton.click()

// For buttons with confirmation dialog
const deleteButton = page.locator("button[title='Permanently Delete'], button[title='完全削除']").first()
await deleteButton.click()
await page.getByRole("button", { name: /Permanently Delete|完全削除/i }).click()  // Confirm
```

## Network Interception

Intercept and mock network requests:

```typescript
// Mock API response
await page.route("**/api/posts", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ posts: [] }),
  })
})

// Delay response to test loading states
await page.route("**/api/slow", async (route) => {
  await new Promise(resolve => setTimeout(resolve, 2000))
  await route.continue()
})

// Fail request to test error handling
await page.route("**/api/fail", async (route) => {
  await route.abort("failed")
})
```

## Debugging Tips

```typescript
// Take screenshot on failure
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.screenshot({ path: `screenshots/${testInfo.title}.png` })
  }
})

// Enable tracing for debugging
test.use({ trace: "retain-on-failure" })

// Visual debugging
await page.pause()  // Opens Playwright Inspector
```

## Anti-Patterns

### Timeout-Based Waiting

```typescript
// Bad: Arbitrary timeout
await page.waitForTimeout(3000)
await page.click("button")

// Good: Wait for specific condition
await expect(page.getByRole("button")).toBeEnabled()
await page.getByRole("button").click()
```

### Hard-Coded Test Data

```typescript
// Bad: Hard-coded credentials scattered in tests
await page.getByLabel("Email").fill("admin@example.com")

// Good: Use fixtures
import { TEST_USERS } from "../fixtures/test-users"
await page.getByLabel("Email").fill(TEST_USERS.admin.email)
```

### Testing Internal Implementation

```typescript
// Bad: Testing internal state
expect(page.evaluate(() => window.__internalState)).toBe(...)

// Good: Test user-visible behavior
await expect(page.getByText("Success")).toBeVisible()
```

### Force Click and Direct URL Navigation

```typescript
// Bad: Bypassing UI interaction
await link.click({ force: true })  // Hides real UI issues
await page.goto(`/posts/${slug}`)  // Skips navigation testing

// Good: Fix the UI issue or use viewport adjustment
test.use({ viewport: { width: 375, height: 667 } })  // Mobile view
await link.click()  // Normal click works
```

### Conditional test.skip() When Data Exists

```typescript
// Bad: Skip when seed data should exist
const link = page.getByRole("link", { name: /Read more/i }).first()
test.skip(!(await link.isVisible()), "No posts found")

// Good: Assert that seed data exists
const link = page.getByRole("link", { name: /Read more/i }).first()
await expect(link).toBeVisible({ timeout: 10000 })
await link.click()
```

## Sidebar Overlay Handling

When sidebar overlaps content on desktop, use mobile viewport:

```typescript
test.describe("Feature requiring main content click", () => {
  // Mobile viewport hides sidebar
  test.use({ viewport: { width: 375, height: 667 } })

  test("should click link in main content", async ({ page }) => {
    await page.goto("/posts")
    const link = page.getByRole("link", { name: /Read more/i }).first()
    await expect(link).toBeVisible()
    await link.click()  // Works without sidebar interference
  })
})
```

## Selector Patterns for shadcn/ui Components

### Password Input (type="password")

Password inputs are NOT `textbox` role in accessibility tree:

```typescript
// Bad: type="password" is not textbox
await page.getByRole("textbox", { name: /Password/i }).fill("...")

// Good: Use locator for password inputs
await page.locator('input[type="password"]').first().fill("...")

// Or use label association if unique
await page.getByLabel(/^Password$/i).fill("...")
```

### Combobox/Select Components

```typescript
// shadcn Select component
const select = page.getByRole("combobox").first()
await select.click()
await page.getByRole("option").first().click()
```

### Switch Component

```typescript
const publishSwitch = page.getByRole("switch", { name: /Published/i })
await expect(publishSwitch).not.toBeChecked()
await publishSwitch.click()
await expect(publishSwitch).toBeChecked()
```

### Pagination Component

```typescript
const pagination = page.getByRole("navigation", { name: "pagination" })
await expect(pagination).toBeVisible()
const nextButton = pagination.getByRole("link", { name: /next|次/i })
await nextButton.click()
```

## OpenGraph Meta Tag Testing

Use correct property names (NOT `og:article:*`):

```typescript
// Correct OpenGraph article properties
const publishedTime = page.locator('meta[property="article:published_time"]')
const modifiedTime = page.locator('meta[property="article:modified_time"]')
const author = page.locator('meta[property="article:author"]')

// Standard OG properties
const ogTitle = page.locator('meta[property="og:title"]')
const ogType = page.locator('meta[property="og:type"]')
const ogLocale = page.locator('meta[property="og:locale"]')
```

## Test Fixtures Pattern

Create reusable fixtures for test data:

```typescript
// tests/helpers/fixtures.ts
import { testDb } from "./database"

export interface MetadataTestFixtures {
  category: { id: string; name: string; slug: string }
  tag: { id: string; name: string; slug: string }
  post: { id: string; title: string; slug: string }
  authorId: string
}

export async function createMetadataTestFixtures(): Promise<MetadataTestFixtures> {
  await testDb.connect()

  // Get admin user
  const [admin] = await testDb.query<{ id: string }>(
    "SELECT id FROM users WHERE email = $1",
    ["admin@example.com"]
  )

  // Create category
  const [category] = await testDb.query<{ id: string; name: string; slug: string }>(
    `INSERT INTO categories (id, name, slug, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING id, name, slug`,
    [`Test Category ${Date.now()}`, `test-category-${Date.now()}`]
  )

  // Create post
  const [post] = await testDb.query<{ id: string; title: string; slug: string }>(
    `INSERT INTO posts (id, title, slug, content, published, published_at, author_id, category_id, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, true, NOW(), $4, $5, NOW(), NOW())
     RETURNING id, title, slug`,
    [`Test Post ${Date.now()}`, `test-post-${Date.now()}`, "Test content", admin.id, category.id]
  )

  await testDb.disconnect()
  return { category, tag, post, authorId: admin.id }
}

export async function cleanupMetadataTestFixtures(fixtures: MetadataTestFixtures | null): Promise<void> {
  if (!fixtures) return
  await testDb.connect()
  await testDb.query("DELETE FROM posts WHERE id = $1", [fixtures.post.id])
  await testDb.query("DELETE FROM categories WHERE id = $1", [fixtures.category.id])
  await testDb.disconnect()
}
```

### Using Fixtures in Tests

```typescript
let testFixtures: MetadataTestFixtures | null = null

test.beforeAll(async () => {
  testFixtures = await createMetadataTestFixtures()
})

test.afterAll(async () => {
  await cleanupMetadataTestFixtures(testFixtures)
  testFixtures = null
})

test("should have correct metadata", async ({ page }) => {
  await page.goto(`/posts/${testFixtures!.post.slug}`)
  // Test metadata...
})
```

## Prefer Seed Data Over Fixtures

When possible, use seed data instead of creating fixtures:

```typescript
// Good: Use seed data (150 posts exist)
test("should navigate to post detail", async ({ page }) => {
  await page.goto("/posts")
  const readMoreLink = page.getByRole("link", { name: /Read more/i }).first()
  await expect(readMoreLink).toBeVisible({ timeout: 10000 })
  await readMoreLink.click()
  await expect(page).toHaveURL(/\/posts\/[^/]+$/)
})

// Only use fixtures when:
// - Testing specific data conditions
// - ISR cache prevents seeing new data immediately
// - Need isolated test data that won't affect other tests
```

## Comment Section Testing

```typescript
test.describe("Comment functionality", () => {
  test.use({ viewport: { width: 375, height: 667 } })  // Mobile to avoid sidebar

  test("guest should see login prompt", async ({ page }) => {
    await page.goto("/posts")
    const readMoreLink = page.getByRole("link", { name: /続きを読む|Read more/i }).first()
    await expect(readMoreLink).toBeVisible()
    await readMoreLink.click()

    // Scroll to comment section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // Verify login prompt (i18n)
    await expect(page.getByText(/コメントするにはログイン|Please login to comment/i)).toBeVisible()
  })

  test("authenticated user should see comment form", async ({ page }) => {
    // Login first
    await page.goto("/login")
    await page.getByRole("textbox", { name: /Email|メール/i }).fill(TEST_USERS.user.email)
    await page.getByLabel(/^Password$|^パスワード$/i).fill(TEST_USERS.user.password)
    await page.getByRole("button", { name: /Login|ログイン/i }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 15000 })

    // Navigate to post
    await page.goto("/posts")
    const readMoreLink = page.getByRole("link", { name: /続きを読む|Read more/i }).first()
    await readMoreLink.click()
    await page.waitForLoadState("networkidle")

    // Scroll to comment section
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    // Verify comment form
    const commentInput = page.getByPlaceholder(/コメントを入力|Enter your comment/i)
    await expect(commentInput).toBeVisible({ timeout: 15000 })
  })
})
```

## Mailpit Email Testing Integration

Use the Mailpit helper for email verification flows:

```typescript
import { mailpit } from "../helpers/mailpit"

test.describe("Password Reset Flow", () => {
  test("should send password reset email", async ({ page }) => {
    // Clear all emails before test
    await mailpit.deleteAllMessages()

    // Request password reset
    await page.goto("/forgot-password")
    await page.getByLabel("Email").fill("user@example.com")
    await page.getByRole("button", { name: /Send Reset Link/i }).click()

    // Wait for success message
    await expect(page.getByText(/Check your email/i)).toBeVisible()

    // Verify email was sent
    const messages = await mailpit.getMessages()
    expect(messages.length).toBe(1)
    expect(messages[0].to[0].address).toBe("user@example.com")
    expect(messages[0].subject).toMatch(/Password Reset/i)

    // Extract verification link
    const verifyLink = extractVerificationLink(messages[0].body)
    expect(verifyLink).toBeTruthy()

    // Navigate to verification link
    await page.goto(verifyLink)
    await expect(page.getByText(/Enter new password/i)).toBeVisible()
  })

  test("should verify email for new user", async ({ page }) => {
    await mailpit.deleteAllMessages()

    // Register new user
    await page.goto("/register")
    const testEmail = `test-${Date.now()}@example.com`
    await page.getByLabel("Email").fill(testEmail)
    await page.getByLabel("Password").fill("Test@Pass123")
    await page.getByRole("button", { name: /Sign Up/i }).click()

    // Get verification email
    const messages = await mailpit.getMessages()
    expect(messages.length).toBe(1)

    const emailBody = messages[0].body
    const verifyLink = extractVerificationLink(emailBody)

    // Click verification link
    await page.goto(verifyLink)
    await expect(page.getByText(/Email verified/i)).toBeVisible()
  })
})

function extractVerificationLink(body: string): string {
  const match = body.match(/https?:\/\/[^\s<>"]+\/verify[^\s<>"]*/)
  return match ? match[0] : ""
}
```

### Mailpit Helper API

```typescript
// tests/helpers/mailpit.ts
interface MailpitMessage {
  id: string
  from: { address: string; name: string }
  to: Array<{ address: string; name: string }>
  subject: string
  body: string
  html: string
  created: string
}

class MailpitHelper {
  private baseUrl = "http://mailpit:8025/api/v1"

  async getMessages(): Promise<MailpitMessage[]> {
    const response = await fetch(`${this.baseUrl}/messages`)
    const data = await response.json()
    return data.messages || []
  }

  async getMessage(id: string): Promise<MailpitMessage> {
    const response = await fetch(`${this.baseUrl}/message/${id}`)
    return await response.json()
  }

  async deleteAllMessages(): Promise<void> {
    await fetch(`${this.baseUrl}/messages`, { method: "DELETE" })
  }
}

export const mailpit = new MailpitHelper()
```

## Redis Test Helper Integration

Clear rate limits and lockouts between tests:

```typescript
import { redisHelper } from "../helpers/redis"

test.describe("Login Rate Limiting", () => {
  test.beforeEach(async () => {
    // Clear all test state before each test
    await redisHelper.clearAllTestState()
  })

  test("should lock account after 5 failed attempts", async ({ page }) => {
    await page.goto("/login")

    // Attempt 5 failed logins
    for (let i = 0; i < 5; i++) {
      await page.getByLabel("Email").fill("user@example.com")
      await page.getByLabel("Password").fill("wrongpassword")
      await page.getByRole("button", { name: /Log in/i }).click()
      await expect(page.getByText(/Invalid credentials/i)).toBeVisible()
    }

    // 6th attempt should show lockout message
    await page.getByLabel("Email").fill("user@example.com")
    await page.getByLabel("Password").fill("wrongpassword")
    await page.getByRole("button", { name: /Log in/i }).click()
    await expect(page.getByText(/Account locked/i)).toBeVisible()
  })

  test("should allow login after clearing lockout", async ({ page }) => {
    // Simulate account lockout
    await page.goto("/login")
    for (let i = 0; i < 6; i++) {
      await page.getByLabel("Email").fill("user@example.com")
      await page.getByLabel("Password").fill("wrongpassword")
      await page.getByRole("button", { name: /Log in/i }).click()
    }

    // Clear rate limits via helper
    await redisHelper.clearRateLimits()

    // Should now allow login with correct password
    await page.getByLabel("Email").fill("user@example.com")
    await page.getByLabel("Password").fill("User@Test2024!")
    await page.getByRole("button", { name: /Log in/i }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 15000 })
  })
})
```

### Redis Helper API

```typescript
// tests/helpers/redis.ts
import { createClient, RedisClientType } from "redis"

class RedisTestHelper {
  private client: RedisClientType | null = null

  async connect(): Promise<void> {
    this.client = createClient({ url: process.env.REDIS_URL })
    await this.client.connect()
  }

  async disconnect(): Promise<void> {
    await this.client?.quit()
    this.client = null
  }

  /** Clear all rate limits (ratelimit:*, account-lockout:*) */
  async clearRateLimits(): Promise<void> {
    if (!this.client) throw new Error("Not connected")
    const keys = await this.client.keys("ratelimit:*")
    const lockoutKeys = await this.client.keys("account-lockout:*")
    const allKeys = [...keys, ...lockoutKeys]
    if (allKeys.length > 0) {
      await this.client.del(allKeys)
    }
  }

  /** Clear all test-related state (rate limits, lockouts, sessions) */
  async clearAllTestState(): Promise<void> {
    if (!this.client) throw new Error("Not connected")
    await this.clearRateLimits()
    // Add other cleanup as needed
  }
}

export const redisHelper = new RedisTestHelper()
```

## Request Blocking for Loading States (Advanced)

Use Promise-based request blocking to reliably test loading states:

```typescript
test("should show loading state during form submission", async ({ page }) => {
  let resolveRequest: () => void
  const requestPromise = new Promise<void>((resolve) => {
    resolveRequest = resolve
  })

  // Block API request to keep loading state visible
  await page.route("**/api/posts", async (route) => {
    await requestPromise
    await route.continue()
  })

  await page.goto("/posts/new")
  await page.getByLabel("Title").fill("Test Post")
  await page.getByLabel("Content").fill("Test content")

  // Get button reference before clicking
  const submitButton = page.getByRole("button", { name: /Publish/i })
  await submitButton.click()

  // Verify loading state - button text changes to "Publishing..."
  const loadingButton = page.getByRole("button", { name: /Publishing/i })
  await expect(loadingButton).toBeVisible()
  await expect(loadingButton).toBeDisabled()

  // Release request to complete
  resolveRequest!()

  // Verify success
  await expect(page).toHaveURL(/\/posts\/[^/]+$/, { timeout: 10000 })
})
```

### Multiple Request Blocking Pattern

```typescript
test("should show loading for multi-step operation", async ({ page }) => {
  let resolveStep1: () => void
  let resolveStep2: () => void

  const step1Promise = new Promise<void>(r => { resolveStep1 = r })
  const step2Promise = new Promise<void>(r => { resolveStep2 = r })

  // Block first API call
  await page.route("**/api/validate", async (route) => {
    await step1Promise
    await route.continue()
  })

  // Block second API call
  await page.route("**/api/submit", async (route) => {
    await step2Promise
    await route.continue()
  })

  await page.getByRole("button", { name: /Submit/i }).click()

  // Step 1: Validating
  await expect(page.getByText(/Validating/i)).toBeVisible()
  resolveStep1!()

  // Step 2: Submitting
  await expect(page.getByText(/Submitting/i)).toBeVisible()
  resolveStep2!()

  // Complete
  await expect(page.getByText(/Success/i)).toBeVisible()
})
```

## Playwright Version Info

### Playwright 1.58 (Latest)

- **Browsers**: Chromium 145.0, Firefox 146.0.1, WebKit 26.0
- **HTML Report**: Timeline display in merge reports
- **Breaking Changes**: `_react`/`_vue` selectors removed, `:light` selector engine removed, `devtools` launch option removed

### Playwright 1.57

- **Chrome for Testing**: Switched from Chromium to Chrome for Testing builds (both headed/headless)
- **Speedboard**: Added test execution time sorted tab in HTML report
- **Deprecated**: `page.accessibility` (removed after 3-year deprecation period)
- **New Features**: `testConfig.tag`, worker console events, locator descriptions

### Playwright 1.56

- **Playwright Agents**: LLM-powered test generation and repair agents (planner, generator, healer)
- **New Methods**: `page.consoleMessages()`, `page.pageErrors()`, `page.requests()`
