# JSDoc Documentation Patterns

## Overview

JSDoc patterns for TypeDoc API documentation generation.
Server Actions, types, and interfaces should follow these patterns.

## Required Tags by Function Type

### Public Server Actions

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

### Internal Functions

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

### Types and Interfaces

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

## Tag Reference

| Tag | Required | Usage |
|-----|----------|-------|
| `@param` | Yes (if params) | パラメータの説明 |
| `@returns` | Yes (if returns) | 戻り値の説明 |
| `@example` | Recommended | 使用例（コードブロック付き） |
| `@see` | Recommended | 関連する関数・型への参照 |
| `@throws` | If applicable | スローする可能性のあるエラー |
| `@category` | Recommended | TypeDocでのカテゴリ分類 |
| `@internal` | If internal | 内部関数（ドキュメントから除外） |
| `@typeParam` | If generic | ジェネリック型の説明 |

## Category Standards

Use consistent category names:

| Category | Used For |
|----------|----------|
| `投稿取得` | Post read operations |
| `投稿操作` | Post write operations |
| `カテゴリ取得` | Category read operations |
| `カテゴリ操作` | Category write operations |
| `タグ取得` | Tag read operations |
| `タグ操作` | Tag write operations |
| `コメント取得` | Comment read operations |
| `コメント操作` | Comment write operations |
| `認証` | Authentication operations |
| `型定義` | Types and interfaces |

## Good Examples

### Server Action with Full Documentation

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
 * // 1ページ目を10件で取得
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

### Interface with Property Documentation

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

## Bad Examples

### Missing Required Tags

```typescript
// BAD: No @param, @returns, @example
/**
 * Get posts
 */
export async function getPosts(): Promise<Post[]> {
  // implementation
}
```

### Vague Description

```typescript
// BAD: Description doesn't explain what the function does
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

### Missing Property Documentation

```typescript
// BAD: No documentation on properties
export interface UserData {
  id: string
  name: string
  email: string
}
```

## Review Checklist

### Public Functions
- [ ] Has summary (first line)
- [ ] Has detailed description (if complex)
- [ ] All parameters documented with `@param`
- [ ] Return value documented with `@returns`
- [ ] Has `@example` with code block
- [ ] Has `@category` for TypeDoc grouping
- [ ] Has `@see` for related functions
- [ ] Has `@throws` if errors can be thrown

### Types/Interfaces
- [ ] Has type summary
- [ ] Has `@typeParam` for generics
- [ ] Has `@example` showing usage
- [ ] Has `@category` for TypeDoc grouping
- [ ] All properties have inline `/** comment */`

### Internal Functions
- [ ] Has `@internal` tag
- [ ] Has brief description

## TypeDoc Configuration

Reference: `typedoc.json`

```json
{
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeInternal": true,
  "categorizeByGroup": true,
  "categoryOrder": ["Server Actions", "Database", "*"]
}
```

- `@internal` tagged functions are excluded from docs
- `@category` groups functions in navigation
- Property-level `/** comments */` are included
