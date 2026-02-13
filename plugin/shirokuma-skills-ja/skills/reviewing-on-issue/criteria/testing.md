# テストレビュー基準

## テストカバレッジ要件

### 最低カバレッジ

- **Server Actions**: 80%以上（クリティカルパス）
- **コンポーネント**: 70%以上（ユーザー向け）
- **ユーティリティ**: 90%以上（再利用ロジック）
- **E2E**: クリティカルユーザーフロー

### テスト対象

| 優先度 | 種類 | 例 |
|--------|------|-----|
| **高** | Server Actions | 認証、CRUD、バリデーション |
| **高** | E2E フロー | ログイン、投稿作成、フォーム送信 |
| **中** | コンポーネント | フォーム、インタラクティブ要素 |
| **中** | Hooks | ステート付きカスタム Hooks |
| **低** | シンプル UI | 静的表示、レイアウト |

## ユニットテスト基準

### Server Actions の必須テスト

- [ ] 有効な入力での成功ケース
- [ ] 未認証アクセス（セッションなし）
- [ ] 権限不足アクセス（ロール違い）
- [ ] バリデーションエラー
- [ ] データベースエラー
- [ ] エッジケース（空、最大長、特殊文字）

### テスト構造

```typescript
describe("createPost", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearQueryResults()  // モック DB キューをクリア
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

## E2E テスト基準

### 必須テスト

- [ ] 各機能のハッピーパス
- [ ] エラー状態（バリデーション、認証エラー）
- [ ] ローディング状態
- [ ] 空状態
- [ ] マルチステップフロー（認証、チェックアウト）

### ベストプラクティス

- [ ] セマンティックロケータ使用 (getByRole, getByLabel)
- [ ] 両言語でテスト（i18n）
- [ ] テスト間で状態クリア（Cookie、レート制限）
- [ ] テストフィクスチャ使用 (TEST_USERS, testDb)
- [ ] 任意のタイムアウトを避ける
- [ ] 順序依存は `test.describe.serial` で処理
- [ ] DB 状態管理に `beforeAll`/`afterAll` 使用
- [ ] 破壊的テスト後にシードデータを復元

### E2E 用 DB フィクスチャ

```typescript
import { testDb, seedTestDatabase } from "../helpers/database"

test.describe("Empty State", () => {
  test.beforeAll(async () => {
    await testDb.connect()
    await testDb.clearAllPosts()  // 空状態テスト用にクリア
  })

  test.afterAll(async () => {
    await testDb.disconnect()
    await seedTestDatabase()  // 後続テスト用に復元
  })
})
```

### アイコンボタンのロケータ

```typescript
// アイコンのみのボタンは title 属性を使用
const button = page.locator("button[title='Restore'], button[title='復元']")
```

## TDD 準拠

### Git 履歴で確認

```bash
# テストファースト手法の検証
git log --oneline --name-only -- "*.test.ts" "*.spec.ts"
```

### Red-Green-Refactor

1. **Red**: テスト作成、失敗確認
2. **Green**: テストをパスする最小限のコード
3. **Refactor**: 壊さずに改善

### TDD の指標

- テストが実装前にコミット
- テストが実装ではなく振る舞いを記述
- 小さく焦点を絞ったテストケース
- 後付けでコードを「カバー」するテストなし

## モックパターン

### Server Action モック（キューベース）

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

### Drizzle クエリビルダーの Thenable パターン

Drizzle クエリビルダーを Promise として動作させるパターン:

```typescript
const createQueryBuilder = () => {
  const builder: any = {
    from: jest.fn(() => builder),
    where: jest.fn(() => builder),
    leftJoin: jest.fn(() => builder),
    orderBy: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    // Thenable パターン: builder を await 可能にする
    then: (resolve: any) => {
      const result = queryResults.shift() ?? []
      return Promise.resolve(result).then(resolve)
    },
  }
  return builder
}

// Usage: 直接 await 可能
const posts = await db.select().from(postsTable).where(eq(postsTable.id, "1"))
// チェーンも可能
const posts = await db.select().from(postsTable).where(...).orderBy(...).limit(10)
```

### トランザクションモックパターン

ロールバックが必要な操作向け Drizzle トランザクションモック:

```typescript
const mockTransaction = jest.fn((callback) => {
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
  return callback(tx)
})

jest.mock("@repo/database", () => ({
  db: {
    transaction: mockTransaction,
  },
}))

// テストでの使用
it("creates post with tags in transaction", async () => {
  const result = await createPost({
    title: "Test Post",
    tags: ["tag1", "tag2"],
  })

  expect(mockTransaction).toHaveBeenCalledTimes(1)

  const tx = mockTransaction.mock.calls[0][0]
  expect(tx.insert).toHaveBeenCalled()
})
```

### 完全なトランザクションモック例

```typescript
describe("createPostWithTags", () => {
  let mockTransaction: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

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

### 認証モック

```typescript
jest.mock("@/lib/auth", () => ({
  verifyAdmin: jest.fn().mockResolvedValue({
    user: { id: "user-1", email: "admin@example.com", role: "admin" },
  }),
}))

// 特定テストでオーバーライド
import { verifyAdmin } from "@/lib/auth"
(verifyAdmin as jest.Mock).mockResolvedValueOnce(null)  // Unauthorized
```

### next/headers と next/cache のモック

```typescript
jest.mock("next/headers", () => ({
  headers: jest.fn().mockResolvedValue(new Headers()),
}))

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))
```

## アンチパターン

### 実装のテスト

```typescript
// Bad: 内部実装をテスト
expect(db.select).toHaveBeenCalledWith(...)
expect(internalFunction).toHaveBeenCalled()

// Good: 振る舞いをテスト
const result = await getPost("123")
expect(result.success).toBe(true)
expect(result.data?.title).toBe("Expected Title")
```

### 不安定なテスト

```typescript
// Bad: 時間依存
expect(post.createdAt).toBe(new Date())

// Good: 時間非依存
expect(post.createdAt).toBeInstanceOf(Date)

// Bad: 順序依存
await page.click("button")
await page.waitForTimeout(1000)  // 任意

// Good: 条件待ち
await expect(page.getByText("Success")).toBeVisible()
```

### 過剰モック

```typescript
// Bad: すべてをモック
jest.mock("@/lib/utils")
jest.mock("@/lib/helpers")
// テストが実コードではなくモックをテスト

// Good: 外部依存のみモック
jest.mock("@repo/database")  // Database
jest.mock("next/cache")      // Framework
```

### E2E アンチパターン

```typescript
// Bad: force click は実際の UI 問題を隠す
await link.click({ force: true })

// Bad: 直接 URL 遷移はユーザージャーニーをスキップ
await page.goto(`/posts/${fixture.post.slug}`)

// Bad: シードデータが存在すべき時の条件付きスキップ
const link = page.getByRole("link", { name: /Read more/i })
test.skip(!(await link.isVisible()), "No posts found")

// Good: モバイルビューポートでサイドバーのオーバーレイを回避
test.use({ viewport: { width: 375, height: 667 } })

// Good: シードデータの存在をアサートしてインタラクト
await expect(link).toBeVisible({ timeout: 10000 })
await link.click()

// Good: 実ユーザーのように UI を通じて遷移
await page.goto("/posts")
await page.getByRole("link", { name: /Read more/i }).first().click()
```

### 不正な要素セレクタ

```typescript
// Bad: type="password" は textbox ロールではない
await page.getByRole("textbox", { name: /Password/i })

// Bad: OG article タグに "og:" prefix はない
page.locator('meta[property="og:article:published_time"]')

// Good: password には CSS セレクタを使用
await page.locator('input[type="password"]').first()

// Good: article:* が正しい（og: prefix なし）
page.locator('meta[property="article:published_time"]')
```

## テストの整理

### ファイル配置

| 種類 | パス |
|------|------|
| Server Action | `apps/admin/lib/actions/posts.ts` |
| Action テスト | `apps/admin/lib/actions/__tests__/posts.test.ts` |
| コンポーネントテスト | `apps/admin/components/__tests__/post-form.test.tsx` |
| E2E テスト | `tests/e2e/auth.spec.ts`, `tests/e2e/posts.spec.ts` |

### 命名規約

- ユニットテスト: `*.test.ts` または `*.test.tsx`
- E2E テスト: `*.spec.ts`
- テストファイルは `__tests__/` ディレクトリに配置
- describe ブロックは関数/コンポーネント名と一致

## テストコマンド

```bash
# 全テスト実行
pnpm --filter admin test

# ウォッチモード
pnpm --filter admin test --watch

# カバレッジ
pnpm --filter admin test --coverage

# E2E テスト
npx playwright test --reporter=list

# 特定の E2E ファイル
npx playwright test auth.spec.ts
```
