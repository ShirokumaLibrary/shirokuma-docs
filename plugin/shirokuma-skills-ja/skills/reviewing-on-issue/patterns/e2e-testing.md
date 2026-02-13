# E2E テストパターン

関連: [testing.md](../criteria/testing.md), [better-auth.md](better-auth.md)

## ディレクトリ構成（アプリ別）

モノレポではアプリ単位で E2E テストを整理:

```
tests/e2e/
├── admin/           # 管理画面テスト
│   ├── auth/
│   ├── posts/
│   └── settings/
├── public/          # 公開サイトテスト
│   ├── blog/
│   ├── comments/
│   └── search/
├── shared/          # クロスアプリテスト（稀）
│   └── seo.test.ts
└── helpers/         # 共有ユーティリティ
    ├── database.ts
    ├── fixtures.ts
    └── auth.ts
```

**Playwright 設定**:
```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    { name: "admin", testDir: "./tests/e2e/admin", use: { baseURL: "https://admin-test.local.test" } },
    { name: "public", testDir: "./tests/e2e/public", use: { baseURL: "https://public-test.local.test" } },
  ],
})
```

## テスト環境の分離

| 環境 | ホスト | データベース |
|------|--------|------------|
| 開発 | admin.local.test | blogcms_dev |
| E2E テスト | admin-test.local.test | blogcms_test |

### 設定

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: "http://admin-test.local.test",  // テスト専用ホスト
  },
  webServer: undefined,  // 外部サーバー使用
})
```

### グローバルセットアップ

```typescript
// tests/global-setup.ts
export default async function globalSetup() {
  // テスト前にデータベースをリセット
  execSync(`DATABASE_URL="${TEST_DB_URL}" pnpm --filter @repo/database db:push`)
  execSync(`DATABASE_URL="${TEST_DB_URL}" pnpm --filter @repo/database db:seed`)
}
```

## レート制限の緩和

Better Auth のレート制限が E2E テストをブロックする。開発環境では緩和:

```typescript
// lib/auth.ts
rateLimit: {
  window: 15 * 60,
  max: process.env.NODE_ENV === "production" ? 5 : 1000,  // dev/test は緩和
}
```

## マルチステップ認証フローのタイムアウト

管理者ログインは複数の API 呼び出しを含む（signIn -> get-session -> check-admin）:

```typescript
// マルチステップフローのタイムアウト延長
await expect(page).toHaveURL(/\/$/, { timeout: 15000 })
```

## ローディング状態のテスト

Promise ベースのリクエストブロッキングでローディング状態を確実にテスト:

```typescript
test("should show loading state during login", async ({ page }) => {
  let resolveRequest: () => void
  const requestPromise = new Promise<void>((resolve) => {
    resolveRequest = resolve
  })

  // リクエストをブロックしてローディング状態を可視化
  await page.route("**/api/auth/sign-in/**", async (route) => {
    await requestPromise
    await route.continue()
  })

  await page.getByLabel("Email").fill("test@example.com")
  await page.getByLabel("Password").fill("password")

  const submitButton = page.getByRole("button", { name: /Log in/i })
  await submitButton.click()

  // ローディング状態の検証 - ボタンテキストが変わる
  const loadingButton = page.getByRole("button", { name: /Logging in/i })
  await expect(loadingButton).toBeVisible()
  await expect(loadingButton).toBeDisabled()

  resolveRequest!()
})
```

## ローディング中のボタンテキスト

ボタンロケーターはテキスト変更を考慮する必要がある:

```typescript
// クリック前: "Log in"
// ローディング中: "Logging in..."

// 間違い: 元のロケーターはローディング状態で失敗
await expect(submitButton).toBeDisabled()

// 正しい: ローディング状態用の新しいロケーターを使用
const loadingButton = page.getByRole("button", { name: /Logging in/i })
await expect(loadingButton).toBeDisabled()
```

## テスト順序の依存関係

共有状態を変更するテスト（パスワード変更など）の順序依存を処理:

```typescript
test("should work after password change", async ({ page }) => {
  const passwords = [originalPassword, newPassword]
  let loggedIn = false

  for (const password of passwords) {
    await page.getByLabel("Password").fill(password)
    await page.getByRole("button", { name: /Log in/i }).click()

    if (page.url().includes("/dashboard")) {
      loggedIn = true
      break
    }
  }

  expect(loggedIn).toBe(true)
})
```

## i18n 対応のアサーション

```typescript
// 日英両方にマッチ
await expect(page.getByRole("button", { name: /Log in|ログイン/i })).toBeVisible()
await expect(page.getByText(/Invalid email or password|認証エラー/i)).toBeVisible()
await expect(page.getByRole("link", { name: /Forgot password\?|パスワードをお忘れですか/i })).toBeVisible()
```

## セマンティックロケーター

CSS セレクターよりセマンティックロケーターを優先:

```typescript
// Good: セマンティックロケーター
await page.getByLabel("Email").fill("test@example.com")
await page.getByRole("button", { name: /Submit/i }).click()
await page.getByText("Success message").toBeVisible()

// Avoid: CSS セレクター
await page.locator("#email-input").fill("test@example.com")
await page.locator(".submit-button").click()
```

## テスト分離

テスト間で状態をクリア:

```typescript
test.beforeEach(async ({ page, context }) => {
  await context.clearCookies()
  await redisHelper.clearRateLimits("ratelimit:*")
  await page.goto("/login")
})
```

## データベースフィクスチャ（TestDatabaseClient）

E2E テストデータ管理用の直接データベースアクセス:

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

### 空状態テストパターン

```typescript
import { testDb, seedTestDatabase } from "../helpers/database"

test.describe("Post List Empty State", () => {
  test.beforeAll(async () => {
    await testDb.connect()
    await testDb.clearAllPosts()
  })

  test.afterAll(async () => {
    await testDb.disconnect()
    await seedTestDatabase()  // 他のテストのために復元
  })

  test("should display empty state", async ({ page }) => {
    await page.goto("/posts")
    await expect(page.getByText(/No posts|投稿がありません/i)).toBeVisible()
  })
})
```

## シリアル実行

共有状態を変更するテストには `test.describe.serial` を使用:

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
    // 承認テストの後に実行
  })
})
```

## アイコンボタンのテスト

`title` 属性を持つアイコンのみのボタン:

```typescript
// title 属性で検索（日英両方）
const restoreButton = page.locator("button[title='Restore'], button[title='復元']").first()
await expect(restoreButton).toBeVisible({ timeout: 5000 })
await restoreButton.click()

// 確認ダイアログ付きボタン
const deleteButton = page.locator("button[title='Permanently Delete'], button[title='完全削除']").first()
await deleteButton.click()
await page.getByRole("button", { name: /Permanently Delete|完全削除/i }).click()  // 確認
```

## ネットワークインターセプト

```typescript
// API レスポンスのモック
await page.route("**/api/posts", async (route) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ posts: [] }),
  })
})

// レスポンス遅延（ローディング状態テスト用）
await page.route("**/api/slow", async (route) => {
  await new Promise(resolve => setTimeout(resolve, 2000))
  await route.continue()
})

// リクエスト失敗（エラーハンドリングテスト用）
await page.route("**/api/fail", async (route) => {
  await route.abort("failed")
})
```

## デバッグ

```typescript
// 失敗時にスクリーンショットを取得
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.screenshot({ path: `screenshots/${testInfo.title}.png` })
  }
})

// トレースを有効化
test.use({ trace: "retain-on-failure" })

// ビジュアルデバッグ
await page.pause()  // Playwright Inspector を開く
```

## アンチパターン

### タイムアウトベースの待機

```typescript
// Bad: 任意のタイムアウト
await page.waitForTimeout(3000)
await page.click("button")

// Good: 特定の条件を待機
await expect(page.getByRole("button")).toBeEnabled()
await page.getByRole("button").click()
```

### ハードコードされたテストデータ

```typescript
// Bad: テスト内に散在するハードコード
await page.getByLabel("Email").fill("admin@example.com")

// Good: フィクスチャを使用
import { TEST_USERS } from "../fixtures/test-users"
await page.getByLabel("Email").fill(TEST_USERS.admin.email)
```

### 内部実装のテスト

```typescript
// Bad: 内部状態のテスト
expect(page.evaluate(() => window.__internalState)).toBe(...)

// Good: ユーザー可視の動作をテスト
await expect(page.getByText("Success")).toBeVisible()
```

### Force Click と直接 URL ナビゲーション

```typescript
// Bad: UI インタラクションのバイパス
await link.click({ force: true })  // 実際の UI 問題を隠す
await page.goto(`/posts/${slug}`)  // ナビゲーションテストをスキップ

// Good: UI の問題を修正するかビューポートを調整
test.use({ viewport: { width: 375, height: 667 } })  // モバイルビュー
await link.click()
```

### 条件付き test.skip()

```typescript
// Bad: シードデータが存在すべき場合のスキップ
const link = page.getByRole("link", { name: /Read more/i }).first()
test.skip(!(await link.isVisible()), "No posts found")

// Good: シードデータの存在をアサート
const link = page.getByRole("link", { name: /Read more/i }).first()
await expect(link).toBeVisible({ timeout: 10000 })
await link.click()
```

## サイドバーオーバーレイの処理

サイドバーがデスクトップでコンテンツに重なる場合、モバイルビューポートを使用:

```typescript
test.describe("Feature requiring main content click", () => {
  test.use({ viewport: { width: 375, height: 667 } })

  test("should click link in main content", async ({ page }) => {
    await page.goto("/posts")
    const link = page.getByRole("link", { name: /Read more/i }).first()
    await expect(link).toBeVisible()
    await link.click()  // サイドバー干渉なし
  })
})
```

## shadcn/ui コンポーネントのセレクターパターン

### パスワード入力（type="password"）

パスワード入力はアクセシビリティツリーで `textbox` ロールではない:

```typescript
// Bad: type="password" は textbox ではない
await page.getByRole("textbox", { name: /Password/i }).fill("...")

// Good: パスワード入力にはロケーターを使用
await page.locator('input[type="password"]').first().fill("...")

// または一意のラベル関連付け
await page.getByLabel(/^Password$/i).fill("...")
```

### Combobox/Select

```typescript
const select = page.getByRole("combobox").first()
await select.click()
await page.getByRole("option").first().click()
```

### Switch

```typescript
const publishSwitch = page.getByRole("switch", { name: /Published/i })
await expect(publishSwitch).not.toBeChecked()
await publishSwitch.click()
await expect(publishSwitch).toBeChecked()
```

### Pagination

```typescript
const pagination = page.getByRole("navigation", { name: "pagination" })
await expect(pagination).toBeVisible()
const nextButton = pagination.getByRole("link", { name: /next|次/i })
await nextButton.click()
```

## OpenGraph メタタグのテスト

正しいプロパティ名を使用（`og:article:*` ではなく）:

```typescript
// 正しい OpenGraph article プロパティ
const publishedTime = page.locator('meta[property="article:published_time"]')
const modifiedTime = page.locator('meta[property="article:modified_time"]')
const author = page.locator('meta[property="article:author"]')

// 標準 OG プロパティ
const ogTitle = page.locator('meta[property="og:title"]')
const ogType = page.locator('meta[property="og:type"]')
const ogLocale = page.locator('meta[property="og:locale"]')
```

## テストフィクスチャパターン

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

  const [admin] = await testDb.query<{ id: string }>(
    "SELECT id FROM users WHERE email = $1",
    ["admin@example.com"]
  )

  const [category] = await testDb.query<{ id: string; name: string; slug: string }>(
    `INSERT INTO categories (id, name, slug, created_at, updated_at)
     VALUES (gen_random_uuid(), $1, $2, NOW(), NOW()) RETURNING id, name, slug`,
    [`Test Category ${Date.now()}`, `test-category-${Date.now()}`]
  )

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

### フィクスチャの使用

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
  // メタデータのテスト...
})
```

## シードデータの優先

可能な限りフィクスチャの代わりにシードデータを使用:

```typescript
// Good: シードデータを使用（150件の投稿が存在）
test("should navigate to post detail", async ({ page }) => {
  await page.goto("/posts")
  const readMoreLink = page.getByRole("link", { name: /Read more/i }).first()
  await expect(readMoreLink).toBeVisible({ timeout: 10000 })
  await readMoreLink.click()
  await expect(page).toHaveURL(/\/posts\/[^/]+$/)
})

// フィクスチャを使うのは以下の場合のみ:
// - 特定のデータ条件のテスト
// - ISR キャッシュで新しいデータがすぐに見えない場合
// - 他のテストに影響しない分離テストデータが必要な場合
```

## コメントセクションのテスト

```typescript
test.describe("Comment functionality", () => {
  test.use({ viewport: { width: 375, height: 667 } })  // サイドバー回避

  test("guest should see login prompt", async ({ page }) => {
    await page.goto("/posts")
    const readMoreLink = page.getByRole("link", { name: /続きを読む|Read more/i }).first()
    await expect(readMoreLink).toBeVisible()
    await readMoreLink.click()

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    await expect(page.getByText(/コメントするにはログイン|Please login to comment/i)).toBeVisible()
  })

  test("authenticated user should see comment form", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("textbox", { name: /Email|メール/i }).fill(TEST_USERS.user.email)
    await page.getByLabel(/^Password$|^パスワード$/i).fill(TEST_USERS.user.password)
    await page.getByRole("button", { name: /Login|ログイン/i }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 15000 })

    await page.goto("/posts")
    const readMoreLink = page.getByRole("link", { name: /続きを読む|Read more/i }).first()
    await readMoreLink.click()
    await page.waitForLoadState("networkidle")

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    const commentInput = page.getByPlaceholder(/コメントを入力|Enter your comment/i)
    await expect(commentInput).toBeVisible({ timeout: 15000 })
  })
})
```

## Mailpit メールテスト統合

```typescript
import { mailpit } from "../helpers/mailpit"

test.describe("Password Reset Flow", () => {
  test("should send password reset email", async ({ page }) => {
    await mailpit.deleteAllMessages()

    await page.goto("/forgot-password")
    await page.getByLabel("Email").fill("user@example.com")
    await page.getByRole("button", { name: /Send Reset Link/i }).click()

    await expect(page.getByText(/Check your email/i)).toBeVisible()

    const messages = await mailpit.getMessages()
    expect(messages.length).toBe(1)
    expect(messages[0].to[0].address).toBe("user@example.com")
    expect(messages[0].subject).toMatch(/Password Reset/i)

    const verifyLink = extractVerificationLink(messages[0].body)
    expect(verifyLink).toBeTruthy()

    await page.goto(verifyLink)
    await expect(page.getByText(/Enter new password/i)).toBeVisible()
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

## Redis テストヘルパー統合

テスト間でレート制限とロックアウトをクリア:

```typescript
import { redisHelper } from "../helpers/redis"

test.describe("Login Rate Limiting", () => {
  test.beforeEach(async () => {
    await redisHelper.clearAllTestState()
  })

  test("should lock account after 5 failed attempts", async ({ page }) => {
    await page.goto("/login")

    for (let i = 0; i < 5; i++) {
      await page.getByLabel("Email").fill("user@example.com")
      await page.getByLabel("Password").fill("wrongpassword")
      await page.getByRole("button", { name: /Log in/i }).click()
      await expect(page.getByText(/Invalid credentials/i)).toBeVisible()
    }

    await page.getByLabel("Email").fill("user@example.com")
    await page.getByLabel("Password").fill("wrongpassword")
    await page.getByRole("button", { name: /Log in/i }).click()
    await expect(page.getByText(/Account locked/i)).toBeVisible()
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

  /** レート制限をすべてクリア (ratelimit:*, account-lockout:*) */
  async clearRateLimits(): Promise<void> {
    if (!this.client) throw new Error("Not connected")
    const keys = await this.client.keys("ratelimit:*")
    const lockoutKeys = await this.client.keys("account-lockout:*")
    const allKeys = [...keys, ...lockoutKeys]
    if (allKeys.length > 0) {
      await this.client.del(allKeys)
    }
  }

  /** テスト関連の全状態をクリア */
  async clearAllTestState(): Promise<void> {
    if (!this.client) throw new Error("Not connected")
    await this.clearRateLimits()
  }
}

export const redisHelper = new RedisTestHelper()
```

## リクエストブロッキングによるローディング状態テスト（応用）

```typescript
test("should show loading state during form submission", async ({ page }) => {
  let resolveRequest: () => void
  const requestPromise = new Promise<void>((resolve) => {
    resolveRequest = resolve
  })

  await page.route("**/api/posts", async (route) => {
    await requestPromise
    await route.continue()
  })

  await page.goto("/posts/new")
  await page.getByLabel("Title").fill("Test Post")
  await page.getByLabel("Content").fill("Test content")

  const submitButton = page.getByRole("button", { name: /Publish/i })
  await submitButton.click()

  const loadingButton = page.getByRole("button", { name: /Publishing/i })
  await expect(loadingButton).toBeVisible()
  await expect(loadingButton).toBeDisabled()

  resolveRequest!()

  await expect(page).toHaveURL(/\/posts\/[^/]+$/, { timeout: 10000 })
})
```

### 複数リクエストブロッキングパターン

```typescript
test("should show loading for multi-step operation", async ({ page }) => {
  let resolveStep1: () => void
  let resolveStep2: () => void

  const step1Promise = new Promise<void>(r => { resolveStep1 = r })
  const step2Promise = new Promise<void>(r => { resolveStep2 = r })

  await page.route("**/api/validate", async (route) => {
    await step1Promise
    await route.continue()
  })

  await page.route("**/api/submit", async (route) => {
    await step2Promise
    await route.continue()
  })

  await page.getByRole("button", { name: /Submit/i }).click()

  await expect(page.getByText(/Validating/i)).toBeVisible()
  resolveStep1!()

  await expect(page.getByText(/Submitting/i)).toBeVisible()
  resolveStep2!()

  await expect(page.getByText(/Success/i)).toBeVisible()
})
```

## Playwright バージョン情報

### Playwright 1.58 (最新)

- **ブラウザ**: Chromium 145.0, Firefox 146.0.1, WebKit 26.0
- **HTML レポート**: マージレポートに Timeline 表示
- **破壊的変更**: `_react`/`_vue` セレクター廃止、`:light` セレクターエンジン廃止、`devtools` 起動オプション廃止

### Playwright 1.57

- **Chrome for Testing**: Chromium から Chrome for Testing ビルドに切替（headed/headless 両方）
- **Speedboard**: HTML レポートに実行時間順テスト表示タブ追加
- **廃止**: `page.accessibility`（3年の非推奨期間後に削除）
- **新機能**: `testConfig.tag`, worker コンソールイベント, ロケーター説明

### Playwright 1.56

- **Playwright Agents**: LLM 向けテスト生成・修復エージェント（planner, generator, healer）
- **新メソッド**: `page.consoleMessages()`, `page.pageErrors()`, `page.requests()`
