# テストパターン

## テストドキュメント（必須）

全テストには @testdoc タグ付きの JSDoc コメントが必須。これにより以下が可能になる：
- ドキュメントでの日本語テスト説明
- ドキュメント自動生成
- テスト意図の追跡

### JSDoc 形式

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

### 例

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

### テストドキュメントの Lint

```bash
# テストドキュメントカバレッジチェック
shirokuma-docs lint-tests -p . -c shirokuma-docs.config.yaml -f summary

# 詳細レポート
shirokuma-docs lint-tests -p . -c shirokuma-docs.config.yaml -f terminal

# CI モード（閾値付き）
shirokuma-docs lint-tests -p . --strict --coverage-threshold 50
```

### 実装-テストカバレッジチェック

```bash
# ソースファイルとテストファイルの対応チェック
shirokuma-docs lint-coverage -p . -c shirokuma-docs.config.yaml

# サマリーのみ
shirokuma-docs lint-coverage -p . -c shirokuma-docs.config.yaml -f summary

# strict モード（テスト不足で失敗）
shirokuma-docs lint-coverage -p . -c shirokuma-docs.config.yaml -s
```

### @skip-test アノテーション

テスト不要なファイルには JSDoc アノテーションを追加：

```typescript
/**
 * @skip-test 自動生成コードのためテスト不要
 */
export const generatedSchema = { ... }
```

有効なスキップ理由：
- 自動生成（auto-generated code）
- shadcn/ui（ライブラリコンポーネント）
- E2Eでカバー（covered by E2E tests）
- 外部ライブラリ（external library wrapper）
- 単純なre-export（simple re-export）

## Jest 設定

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

## Jest セットアップ（モック）

```typescript
// jest.setup.ts
import "@testing-library/jest-dom"

// next/navigation のモック
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}))

// next-intl のモック
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "ja",
}))
```

## Server Actions のテスト（キューベースモックパターン）

Server Actions は複数のDBクエリを実行することが多い。キューベースパターンを使用：

```typescript
// FIFO キューを使ったDBモック
jest.mock("@repo/database", () => {
  const queryResults: any[] = []  // FIFO キュー

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

// キュー参照の取得
const dbModule = require("@repo/database") as any
const queryResults = dbModule.__queryResults__ as any[]
const queueQueryResult = (...results: any[]) => results.forEach(r => queryResults.push(r))
const clearQueryResults = () => { queryResults.length = 0 }

// 認証モック
jest.mock("@/lib/auth", () => ({
  verifyAdmin: jest.fn().mockResolvedValue({
    user: { id: "user-1", email: "admin@example.com", role: "admin" },
  }),
}))

// ヘッダー・キャッシュモック
jest.mock("next/headers", () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}))
jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

// テストでの使用
beforeEach(() => { jest.clearAllMocks(); clearQueryResults() })

it("fetches paginated data", async () => {
  queueQueryResult([{ count: 50 }], [{ id: "1", title: "Post" }])
  const result = await getPaginatedPosts(1, 10)
  expect(result.data).toHaveLength(1)  // 注意: `items` ではなく `data`
})
```

## i18n 対応コンポーネントのテスト

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

## リダイレクトモックパターン

`redirect()` を呼ぶ Server Actions にはテストで特別な対応が必要：

```typescript
// redirect を throw するようモック
jest.mock("next/navigation", () => ({
  redirect: jest.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  }),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  usePathname: () => "/",
}))

// リダイレクト動作のテスト
it("redirects on success", async () => {
  // モックのセットアップ...
  mockVerifyAdminMutation.mockResolvedValueOnce("user-1")
  queueQueryResult([])  // 重複なし

  await expect(createFeature(validFormData())).rejects.toThrow("NEXT_REDIRECT:/features")
  expect(revalidatePath).toHaveBeenCalledWith("/features")
})
```

## i18n 対応 E2E セレクタ

両言語対応の正規表現を使用：

```typescript
// パターン: /English|日本語/i
await page.getByRole("heading", { name: /Post Management|投稿管理/i })
await page.getByText(/Draft|下書き/i)
await page.getByRole("button", { name: /Update|更新/i })
await page.getByLabel(/^Email$|^メールアドレス$/i)
await page.getByRole("button", { name: /login|ログイン|Log in/i })
```

## E2E テストセットアップパターン

```typescript
import { test, expect } from "@playwright/test"
import { TEST_USERS } from "../fixtures/test-users"
import { redisHelper } from "../helpers/redis"

test.describe.serial("Feature CRUD Operations", () => {
  test.beforeEach(async ({ page, context }) => {
    // 状態クリア
    await context.clearCookies()
    await redisHelper.clearAllTestState()

    // i18n 対応セレクタでログイン
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

## コマンドリファレンス

```bash
# テスト
pnpm --filter admin test              # 全実行
pnpm --filter admin test --watch      # ウォッチモード
pnpm --filter admin test --coverage   # カバレッジ付き

# E2E テスト（Playwright Server）
npx playwright test --reporter=list
```
