# コード品質レビュー基準

## TypeScript

### 必須プラクティス

- [ ] `any` ではなく `unknown` を使用
- [ ] 公開 API に明示的な戻り値型を付与
- [ ] ランタイム型チェックに型ガードを使用
- [ ] tsconfig.json で strict モード有効化
- [ ] 根拠なしの型アサーション (`as`) 禁止

### 例

```typescript
// Bad
function parse(data: any): any {
  return data.items
}

// Good
function parse(data: unknown): Item[] {
  if (!isValidData(data)) {
    throw new Error("Invalid data format")
  }
  return data.items
}

function isValidData(data: unknown): data is { items: Item[] } {
  return typeof data === "object" && data !== null && "items" in data
}
```

## エラーハンドリング

### 必須プラクティス

- [ ] 空の catch ブロック禁止
- [ ] エラーメッセージにコンテキストを含める
- [ ] エラー種別ごとにカスタムエラークラスを使用
- [ ] 適切なレベルでエラーをログ出力
- [ ] 内部エラー詳細をユーザーに公開しない

### 例

```typescript
// Bad
try {
  await saveData()
} catch {
  // empty
}

// Good
try {
  await saveData()
} catch (error) {
  console.error("Failed to save data:", { error, userId, action: "save" })
  return { success: false, error: "Operation failed" }
}
```

## 非同期パターン

### 必須プラクティス

- [ ] 並列操作には `Promise.all()` を使用
- [ ] 部分的失敗を許容する場合は `Promise.allSettled()` を使用
- [ ] async/await と `.then()` チェーンを混在させない
- [ ] Promise の reject を適切にハンドリング

### 例

```typescript
// Bad: 並列可能なのに逐次実行
const user = await getUser(id)
const posts = await getPosts(id)
const comments = await getComments(id)

// Good: 並列取得
const [user, posts, comments] = await Promise.all([
  getUser(id),
  getPosts(id),
  getComments(id),
])
```

## コードスタイル

### 必須プラクティス

- [ ] 関数は小さく、単一責任に集中
- [ ] ネスト最大3レベル
- [ ] 説明的な変数名（省略形を避ける）
- [ ] 命名規則の統一: 変数は camelCase、コンポーネントは PascalCase

### 命名ガイドライン

| 種類 | 規則 | 例 |
|------|------|-----|
| 変数 | camelCase | `userName`, `postCount` |
| 関数 | camelCase | `getUserById`, `createPost` |
| コンポーネント | PascalCase | `UserProfile`, `PostList` |
| 定数 | UPPER_SNAKE | `MAX_RETRIES`, `API_URL` |
| 型/インターフェース | PascalCase | `UserData`, `PostInput` |

## コードスメル

### 修正必須

1. **God Object**: 責務過多のクラス/モジュール
2. **マジックナンバー**: 説明のないハードコード値
3. **デッドコード**: 未使用の関数、import、変数
4. **重複コード**: 複数箇所の同一ロジック
5. **長いパラメータリスト**: 3-4個を超えるパラメータ
6. **Feature Envy**: 他クラスのデータに過度に依存するメソッド

### 修正例

```typescript
// Bad: マジックナンバー
if (password.length < 8) { ... }

// Good: 名前付き定数
const MIN_PASSWORD_LENGTH = 8
if (password.length < MIN_PASSWORD_LENGTH) { ... }

// Bad: 長いパラメータリスト
function createUser(name, email, password, role, department, manager, startDate) { ... }

// Good: オブジェクトパラメータ
function createUser(params: CreateUserParams) { ... }
```

## 関数設計

### ガイドライン

- **単一責任**: 1関数1目的
- **純粋関数**: 副作用のない関数を優先
- **早期リターン**: 無効ケースは早めに返す
- **最大パラメータ数**: 関数は3個、それ以上はオブジェクトを使用

### 例

```typescript
// Bad: 複数の責務
function processUser(user: User) {
  // Validate
  if (!user.email) throw new Error("No email")
  // Transform
  user.name = user.name.trim()
  // Save
  await db.insert(users).values(user)
  // Notify
  await sendEmail(user.email, "Welcome!")
}

// Good: 単一責任
function validateUser(user: User): void { ... }
function normalizeUser(user: User): User { ... }
function saveUser(user: User): Promise<User> { ... }
function notifyUser(user: User): Promise<void> { ... }

async function createUser(input: CreateUserInput): Promise<User> {
  validateUser(input)
  const normalized = normalizeUser(input)
  const user = await saveUser(normalized)
  await notifyUser(user)
  return user
}
```

## import の整理

### 順序

1. 外部パッケージ (react, next, etc.)
2. 内部パッケージ (@repo/database)
3. ローカル絶対パス (@/lib, @/components)
4. 相対パス (./utils, ../types)

### 例

```typescript
// External
import { useState } from "react"
import { z } from "zod"

// Internal packages
import { db, posts } from "@repo/database"

// Local absolute
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"

// Relative
import { formatDate } from "./utils"
import type { PostFormProps } from "./types"
```

## コメント

### 使うべき場面

- 複雑なビジネスロジック
- 非自明なワークアラウンド
- Issue 参照付き TODO
- 公開 API のドキュメント

### 使わないべき場面

- 自明なコード
- コメントアウトされたコード
- 冗長な説明

```typescript
// Bad: 自明なコメント
// Loop through users
for (const user of users) { ... }

// Good: WHY を説明
// Skip inactive users to avoid sending emails to abandoned accounts
const activeUsers = users.filter(u => u.lastLoginAt > thirtyDaysAgo)
```

## ドキュメント品質

### 必須プラクティス

- [ ] 公開関数に JSDoc コメントあり
- [ ] すべてのパラメータを `@param` で記載
- [ ] 戻り値を `@returns` で記載
- [ ] 複雑な関数は `@example` 付き
- [ ] 関連関数を `@see` でリンク
- [ ] エラー条件を `@throws` で記載
- [ ] TypeDoc 用に `@category` で関数をグループ化
- [ ] 内部関数は `@internal` でマーク
- [ ] 型/インターフェースにプロパティレベルのドキュメントあり

### JSDoc 完全性

| 関数タイプ | 必須タグ |
|-----------|---------|
| 公開 Server Action | `@param`, `@returns`, `@example`, `@category` |
| 公開 Getter | `@returns`, `@example`, `@category` |
| 内部ヘルパー | `@internal` |
| 型/インターフェース | `@example`, `@category`, プロパティコメント |

### 例: 十分にドキュメント化された関数

```typescript
/**
 * ページネーション付きで投稿を取得
 *
 * 管理画面の投稿一覧ページで使用。指定したページの投稿と
 * ページネーション情報を返します。
 *
 * @param page - ページ番号（1から開始、デフォルト: 1）
 * @param pageSize - 1ページあたりの表示件数（デフォルト: 10）
 * @returns ページネーション結果
 *
 * @example
 * ```typescript
 * const result = await getPaginatedPosts(1, 10)
 * console.log(`${result.total}件中 ${result.items.length}件を表示`)
 * ```
 *
 * @see {@link getPosts} - 全件取得する場合
 *
 * @category 投稿取得
 */
export async function getPaginatedPosts(
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResult<Post>> {
  // implementation
}
```

### 例: 不十分なドキュメント

```typescript
// BAD: 必須タグがすべて欠落
/**
 * Get posts
 */
export async function getPosts() {
  // implementation
}
```

### レビュー基準

1. **完全性**: すべての公開 API に JSDoc あり
2. **正確性**: ドキュメントが実際の動作と一致
3. **例**: 現実的で動作するコード例
4. **相互参照**: 関連関数が @see でリンク
5. **カテゴリ**: 一貫した TypeDoc カテゴリ分類

### 関連ファイル

- `patterns/jsdoc.md` - 完全な JSDoc パターンとタグリファレンス
