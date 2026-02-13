# Drizzle ORM パターン

## スキーマファイルの整理（大規模プロジェクト）

大規模プロジェクトではドメイン別にファイルを分割する：

| ファイル | 用途 |
|---------|------|
| `schema/index.ts` | バレルエクスポート + 全リレーション |
| `schema/common.ts` | 共通カラム定義 |
| `schema/auth.ts` | users, sessions, accounts, verifications |
| `schema/content.ts` | posts, categories, tags, post_tags |
| `schema/comments.ts` | comments |
| `index.ts` | DBクライアント + スキーマ再エクスポート |
| `constants.ts` | 共通定数 |

### common.ts - 再利用可能なカラム

```typescript
import { timestamp } from "drizzle-orm/pg-core"

export const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}
```

### auth.ts - ドメインテーブル

```typescript
import { pgTable, uuid, varchar, timestamp, text, boolean } from "drizzle-orm/pg-core"
import { timestamps } from "./common"

export const users = pgTable("user", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  emailVerified: timestamp("email_verified"),
  ...timestamps,
})

export const sessions = pgTable("session", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  ...timestamps,
})

// accounts, verifications テーブル...
```

### schema/index.ts - バレル + リレーション

```typescript
// 全テーブルを再エクスポート
export * from "./common"
export * from "./auth"
export * from "./content"
export * from "./comments"

// 循環依存を避けるためリレーションは1箇所で定義
import { relations } from "drizzle-orm"
import { users, sessions, accounts } from "./auth"
import { posts, categories, tags, postTags } from "./content"
import { comments } from "./comments"

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  sessions: many(sessions),
}))

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  category: one(categories, { fields: [posts.categoryId], references: [categories.id] }),
  comments: many(comments),
  postTags: many(postTags),
}))

// ... その他のリレーション
```

### drizzle.config.ts

```typescript
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema",  // 全ファイルを含むディレクトリパス
  out: "./drizzle",
})
```

### ファイル分割の理由

- ドメイン境界が明確（Auth / Content / Comments）
- チーム開発でのマージコンフリクト軽減
- 関連テーブルの検索・修正が容易
- プロジェクト成長時のスケーラビリティ（20テーブル以上）

### 重要ルール

1. リレーションは `schema/index.ts` でのみ定義（循環 import 回避）
2. バレルファイル経由で全エクスポート
3. 共通パターン（timestamps, soft delete）は `common.ts` に
4. 20テーブル / 500行未満のプロジェクトは単一ファイルで可

## リレーション付きクエリ

```typescript
const postsWithAuthor = await db
  .select({
    id: posts.id,
    title: posts.title,
    authorName: users.name,
  })
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id))
  .where(eq(posts.status, "published"))
```

## ページネーション

```typescript
const PAGE_SIZE = 20

export async function getPaginated(page: number = 1) {
  const offset = (page - 1) * PAGE_SIZE

  const [items, countResult] = await Promise.all([
    db.select().from(features).orderBy(desc(features.createdAt)).limit(PAGE_SIZE).offset(offset),
    db.select({ count: count() }).from(features),
  ])

  return {
    items,
    pagination: {
      page,
      pageSize: PAGE_SIZE,
      total: countResult[0]?.count ?? 0,
      totalPages: Math.ceil((countResult[0]?.count ?? 0) / PAGE_SIZE),
    },
  }
}
```

## ILIKE 検索（ワイルドカードエスケープ）

```typescript
function escapeLikePattern(query: string): string {
  return query.replace(/[%_\\]/g, "\\$&")
}

const pattern = `%${escapeLikePattern(userInput)}%`
db.select().from(posts).where(ilike(posts.title, pattern))
```

## アンチパターン

### N+1 クエリ

```typescript
// Bad: N+1 クエリ（アイテムごとに1クエリ）
for (const category of categories) {
  const posts = await getPostsByCategory(category.id)
}

// Good: inArray() でバッチクエリ
const allPosts = await db
  .select()
  .from(posts)
  .where(inArray(posts.categoryId, categoryIds))

const postsByCategory = allPosts.reduce((acc, post) => {
  (acc[post.categoryId] ||= []).push(post)
  return acc
}, {})
```

### マスアサインメント

```typescript
// Bad: スプレッドで意図しないフィールドを許可
await db.update(posts).set({ ...formData })

// Good: バリデーション済みフィールドのみ明示的に指定
const validated = Schema.parse(formData)
await db.update(posts).set({
  title: validated.title,
  content: validated.content,
})
```

## マイグレーション戦略

- **開発**: `drizzle-kit push` で高速イテレーション
- **本番**: `drizzle-kit generate` + `migrate` でバージョン管理されたマイグレーション

## 非推奨 API

- `InferModel` -> `InferSelectModel` と `InferInsertModel` を使用

## v1.0 (beta) 破壊的変更

### マイグレーションフォルダ構造

`journal.json` が廃止され、SQL ファイルとスナップショットが個別フォルダにグループ化された。`drizzle-kit drop` コマンドも廃止。

```bash
# 既存フォルダを新フォーマットに変換
npx drizzle-kit up
```

### バリデータパッケージの統合

| 旧 import | 新 import |
|-----------|-----------|
| `drizzle-zod` | `drizzle-orm/zod` |
| `drizzle-valibot` | `drizzle-orm/valibot` |
| `drizzle-typebox` | `drizzle-orm/typebox` |
| `drizzle-arktype` | `drizzle-orm/arktype` |

### PostgreSQL Array

`.array()` はチェーン不可に。多次元配列は `.array('[][]')` を使用。

### Relational Query Builder v2 (RQBv2)

RQBv1 から RQBv2 への移行が必要。`drizzle()` 初期化時に全テーブルとリレーションを提供し、`db.query` API を使用する。

```typescript
// v1: relations() で定義
import { relations } from "drizzle-orm"

// v2: defineRelations() で定義（推奨）
// 詳細: orm.drizzle.team/docs/relations-v1-v2
```

## 型安全性

```typescript
// スキーマから型を定義
type Post = InferSelectModel<typeof posts>
type NewPost = InferInsertModel<typeof posts>

// 関数で使用
async function createPost(data: NewPost): Promise<Post> {
  const [result] = await db.insert(posts).values(data).returning()
  return result
}
```

## スキーマドキュメント（shirokuma-docs）

カラムとインデックスの説明はインラインJSDocコメントで記述する。shirokuma-docsが自動抽出してドキュメント化。

### カラムコメント

カラム定義の直前にJSDocコメントを配置：

```typescript
export const organizations = pgTable("organizations", {
  /** 組織ID（UUID） */
  id,
  /** 組織名（表示名） */
  name: text("name").notNull(),
  /** 組織スラッグ（URLに使用、一意制約あり） */
  slug: text("slug").notNull().unique(),
  /** 組織の説明文 */
  description: text("description"),
  ...timestamps,
})
```

### インデックスコメント

インデックス定義の直前にJSDocコメントを配置：

```typescript
export const organizationMembers = pgTable(
  "organization_members",
  {
    /** メンバーシップID */
    id,
    /** 組織ID */
    organizationId: uuid("organization_id").notNull(),
    /** ユーザーID */
    userId: text("user_id").notNull(),
    ...timestamps,
  },
  (table) => [
    /** 組織とユーザーの組み合わせで一意制約（重複メンバーシップを防止） */
    uniqueIndex("org_members_org_user_idx").on(table.organizationId, table.userId),
  ]
)
```

### 使用しないこと

`@columns` や `@indexes` JSDocタグは使用しない（インラインコメントと重複するため）：

```typescript
// NG - これらのタグは使わない
/**
 * @columns
 *   - id: 組織ID
 *   - name: 組織名
 * @indexes
 *   - org_slug_idx: スラッグの一意インデックス
 */

// OK - 上記のようにインラインコメントを使用
```
