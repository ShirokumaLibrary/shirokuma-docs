# Drizzle ORM Patterns

## Schema File Organization (Large Projects)

Split schema files by domain for large projects:

| File | Purpose |
|------|---------|
| `schema/index.ts` | Barrel exports + all relations |
| `schema/common.ts` | Common column definitions |
| `schema/auth.ts` | users, sessions, accounts, verifications |
| `schema/content.ts` | posts, categories, tags, post_tags |
| `schema/comments.ts` | comments |
| `index.ts` | DB client + schema re-exports |
| `constants.ts` | Common constants |

### common.ts - Reusable Columns

```typescript
import { timestamp } from "drizzle-orm/pg-core"

export const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}
```

### auth.ts - Domain Tables

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

// accounts, verifications tables...
```

### schema/index.ts - Barrel + Relations

```typescript
// Re-export all tables
export * from "./common"
export * from "./auth"
export * from "./content"
export * from "./comments"

// Define relations in one place to avoid circular imports
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

// ... other relations
```

### drizzle.config.ts

```typescript
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema",  // Directory path including all files
  out: "./drizzle",
})
```

### Why Split Files

- Clear domain boundaries (Auth / Content / Comments)
- Reduced merge conflicts in team development
- Easier to find and modify related tables
- Scalability for growing projects (20+ tables)

### Key Rules

1. Define relations only in `schema/index.ts` (avoid circular imports)
2. Export everything through barrel file
3. Common patterns (timestamps, soft delete) go in `common.ts`
4. Projects under 20 tables / 500 lines can use a single file

## Queries with Relations

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

## Pagination

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

## ILIKE Search (Wildcard Escaping)

```typescript
function escapeLikePattern(query: string): string {
  return query.replace(/[%_\\]/g, "\\$&")
}

const pattern = `%${escapeLikePattern(userInput)}%`
db.select().from(posts).where(ilike(posts.title, pattern))
```

## Anti-Patterns

### N+1 Queries

```typescript
// Bad: N+1 queries (one query per item)
for (const category of categories) {
  const posts = await getPostsByCategory(category.id)
}

// Good: Batch query with inArray()
const allPosts = await db
  .select()
  .from(posts)
  .where(inArray(posts.categoryId, categoryIds))

const postsByCategory = allPosts.reduce((acc, post) => {
  (acc[post.categoryId] ||= []).push(post)
  return acc
}, {})
```

### Mass Assignment

```typescript
// Bad: Direct spread allows unintended fields
await db.update(posts).set({ ...formData })

// Good: Explicit validated fields only
const validated = Schema.parse(formData)
await db.update(posts).set({
  title: validated.title,
  content: validated.content,
})
```

## Migration Strategy

- **Development**: `drizzle-kit push` for rapid iteration
- **Production**: `drizzle-kit generate` + `migrate` for versioned migrations

## Deprecated APIs

- `InferModel` -> Use `InferSelectModel` and `InferInsertModel`

## v1.0 (beta) Breaking Changes

### Migration Folder Structure

`journal.json` has been deprecated, and SQL files and snapshots are now grouped into individual folders. The `drizzle-kit drop` command has also been deprecated.

```bash
# Convert existing folder to new format
npx drizzle-kit up
```

### Validator Package Consolidation

| Old import | New import |
|------------|-----------|
| `drizzle-zod` | `drizzle-orm/zod` |
| `drizzle-valibot` | `drizzle-orm/valibot` |
| `drizzle-typebox` | `drizzle-orm/typebox` |
| `drizzle-arktype` | `drizzle-orm/arktype` |

### PostgreSQL Array

`.array()` is no longer chainable. Use `.array('[][]')` for multidimensional arrays.

### Relational Query Builder v2 (RQBv2)

Migration from RQBv1 to RQBv2 is required. Provide all tables and relations during `drizzle()` initialization and use the `db.query` API.

```typescript
// v1: Define with relations()
import { relations } from "drizzle-orm"

// v2: Define with defineRelations() (recommended)
// Details: orm.drizzle.team/docs/relations-v1-v2
```

## Type Safety

```typescript
// Define types from schema
type Post = InferSelectModel<typeof posts>
type NewPost = InferInsertModel<typeof posts>

// Use in functions
async function createPost(data: NewPost): Promise<Post> {
  const [result] = await db.insert(posts).values(data).returning()
  return result
}
```

## Schema Documentation (shirokuma-docs)

Describe columns and indexes using inline JSDoc comments. shirokuma-docs auto-extracts and generates documentation.

### Column Comments

Place JSDoc comments directly before column definitions:

```typescript
export const organizations = pgTable("organizations", {
  /** Organization ID (UUID) */
  id,
  /** Organization name (display name) */
  name: text("name").notNull(),
  /** Organization slug (used in URL, unique constraint) */
  slug: text("slug").notNull().unique(),
  /** Organization description */
  description: text("description"),
  ...timestamps,
})
```

### Index Comments

Place JSDoc comments directly before index definitions:

```typescript
export const organizationMembers = pgTable(
  "organization_members",
  {
    /** Membership ID */
    id,
    /** Organization ID */
    organizationId: uuid("organization_id").notNull(),
    /** User ID */
    userId: text("user_id").notNull(),
    ...timestamps,
  },
  (table) => [
    /** Unique constraint on org-user combination (prevents duplicate memberships) */
    uniqueIndex("org_members_org_user_idx").on(table.organizationId, table.userId),
  ]
)
```

### Do Not Use

Do not use `@columns` or `@indexes` JSDoc tags (they duplicate inline comments):

```typescript
// NG - Do not use these tags
/**
 * @columns
 *   - id: Organization ID
 *   - name: Organization name
 * @indexes
 *   - org_slug_idx: Unique index for slug
 */

// OK - Use inline comments as shown above
```
