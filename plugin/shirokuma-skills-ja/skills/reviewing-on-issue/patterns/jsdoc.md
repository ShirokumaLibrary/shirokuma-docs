# JSDoc ドキュメントパターン

## 概要

TypeDoc API ドキュメント生成のための JSDoc パターン。
Server Actions、型、インターフェースはこのパターンに従う。

## 関数タイプ別の必須タグ

### 公開 Server Actions

```typescript
/**
 * 関数の概要（1行目）
 *
 * 詳細な説明（2行目以降）。
 * 処理フローや注意点を記載。
 *
 * @param paramName - パラメータの説明
 * @returns 戻り値の説明
 *
 * @example
 * ```typescript
 * const result = await myFunction(params)
 * ```
 *
 * @see {@link relatedFunction} - 関連する関数
 * @throws {Error} エラー条件の説明
 *
 * @category カテゴリ名
 */
export async function myFunction(paramName: string): Promise<Result> {
  // implementation
}
```

### 内部関数

```typescript
/**
 * 内部関数の説明
 *
 * @internal
 */
function internalHelper(): void {
  // implementation
}
```

### 型とインターフェース

```typescript
/**
 * 型の概要
 *
 * @typeParam T - ジェネリック型の説明
 *
 * @example
 * ```typescript
 * const result: PaginatedResult<Post> = {
 *   items: posts,
 *   total: 150,
 *   page: 1
 * }
 * ```
 *
 * @category 型定義
 */
export interface PaginatedResult<T> {
  /** 現在のページのアイテム配列 */
  items: T[]
  /** 全アイテム数 */
  total: number
}
```

## タグリファレンス

| タグ | 必須 | 用途 |
|-----|------|------|
| `@param` | パラメータがあれば必須 | パラメータの説明 |
| `@returns` | 戻り値があれば必須 | 戻り値の説明 |
| `@example` | 推奨 | 使用例（コードブロック付き） |
| `@see` | 推奨 | 関連する関数・型への参照 |
| `@throws` | 該当時 | スローする可能性のあるエラー |
| `@category` | 推奨 | TypeDoc でのカテゴリ分類 |
| `@internal` | 内部関数の場合 | ドキュメントから除外 |
| `@typeParam` | ジェネリクスの場合 | ジェネリック型の説明 |

## カテゴリ標準

一貫したカテゴリ名を使用:

| カテゴリ | 対象 |
|----------|------|
| `投稿取得` | 投稿の読み取り操作 |
| `投稿操作` | 投稿の書き込み操作 |
| `カテゴリ取得` | カテゴリの読み取り操作 |
| `カテゴリ操作` | カテゴリの書き込み操作 |
| `タグ取得` | タグの読み取り操作 |
| `タグ操作` | タグの書き込み操作 |
| `コメント取得` | コメントの読み取り操作 |
| `コメント操作` | コメントの書き込み操作 |
| `認証` | 認証操作 |
| `型定義` | 型とインターフェース |

## 良い例

### フルドキュメント付き Server Action

```typescript
/**
 * ページネーション付きで投稿を取得
 *
 * 管理画面の投稿一覧ページで使用。指定したページの投稿と
 * ページネーション情報（総数、総ページ数など）を返します。
 *
 * @param page - ページ番号（1から開始、デフォルト: 1）
 * @param pageSize - 1ページあたりの表示件数（デフォルト: 10）
 * @returns ページネーション結果（items, total, page, pageSize, totalPages）
 *
 * @example
 * ```typescript
 * const result = await getPaginatedPosts(1, 10)
 * console.log(`全${result.total}件中 ${result.items.length}件を表示`)
 * ```
 *
 * @see {@link getPosts} - 全件取得する場合
 * @see {@link PaginatedResult} - 戻り値の型定義
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

### プロパティドキュメント付きインターフェース

```typescript
/**
 * カテゴリーとタグを含む投稿型
 *
 * 投稿の詳細表示で使用される拡張型。
 * 基本の Post 型に加えて、関連するカテゴリーとタグの情報を含む。
 *
 * @example
 * ```typescript
 * const post: PostWithRelations = {
 *   id: "123",
 *   title: "記事タイトル",
 *   category: { id: "cat-1", name: "技術", slug: "tech" },
 *   tags: [{ id: "tag-1", name: "TypeScript", slug: "typescript" }]
 * }
 * ```
 *
 * @category 型定義
 */
export interface PostWithRelations extends Post {
  /** 投稿のカテゴリー（未分類の場合はnull） */
  category: { id: string; name: string; slug: string } | null
  /** 投稿に紐づくタグの配列 */
  tags: { id: string; name: string; slug: string }[]
}
```

## 悪い例

### 必須タグの欠落

```typescript
// BAD: @param, @returns, @example なし
/**
 * Get posts
 */
export async function getPosts(): Promise<Post[]> {
  // implementation
}
```

### 曖昧な説明

```typescript
// BAD: 関数が何をするか説明していない
/**
 * Handles posts
 *
 * @param id - id
 * @returns result
 */
export async function handlePost(id: string): Promise<Result> {
  // implementation
}
```

### プロパティドキュメントの欠落

```typescript
// BAD: プロパティにドキュメントなし
export interface UserData {
  id: string
  name: string
  email: string
}
```

## レビューチェックリスト

### 公開関数
- [ ] サマリー（1行目）あり
- [ ] 詳細説明あり（複雑な場合）
- [ ] すべてのパラメータに `@param` あり
- [ ] 戻り値に `@returns` あり
- [ ] コードブロック付き `@example` あり
- [ ] TypeDoc 分類用の `@category` あり
- [ ] 関連関数への `@see` あり
- [ ] エラー発生時の `@throws` あり

### 型/インターフェース
- [ ] 型サマリーあり
- [ ] ジェネリクスに `@typeParam` あり
- [ ] 使用例の `@example` あり
- [ ] TypeDoc 分類用の `@category` あり
- [ ] すべてのプロパティにインライン `/** コメント */` あり

### 内部関数
- [ ] `@internal` タグあり
- [ ] 簡潔な説明あり

## TypeDoc 設定

```json
{
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeInternal": true,
  "categorizeByGroup": true,
  "categoryOrder": ["Server Actions", "Database", "*"]
}
```

- `@internal` タグ付き関数はドキュメントから除外
- `@category` でナビゲーション内をグループ化
- プロパティレベルの `/** コメント */` も含まれる
