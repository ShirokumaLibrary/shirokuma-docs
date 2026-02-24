# Database Setup

Guide for setting up PostgreSQL with Drizzle ORM.

## Prerequisites

- PostgreSQL 16+
- packages/database created (see [project-init.md](project-init.md))

## 1. Drizzle Configuration

### drizzle.config.ts

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

## 2. Schema Organization

Path: `packages/database/src/`

| File | Purpose |
|------|---------|
| `schema/index.ts` | Barrel exports + relations |
| `schema/common.ts` | Shared column definitions |
| `schema/auth.ts` | users, sessions, accounts, verifications |
| `schema/content.ts` | posts, categories, tags |
| `schema/comments.ts` | comments |
| `index.ts` | DB client + re-exports |
| `seed.ts` | Seed data script |

## 3. Common Columns

### schema/common.ts

```typescript
import { timestamp } from 'drizzle-orm/pg-core';

// Shared timestamp columns
export const timestamps = {
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
};

// Better Auth compatible timestamps (mode: 'string' required)
export const authTimestamps = {
  createdAt: timestamp('created_at', { mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'string' }).notNull().defaultNow(),
};
```

## 4. Auth Schema (Better Auth)

### schema/auth.ts

```typescript
import { pgTable, text, timestamp, uuid, boolean, primaryKey } from 'drizzle-orm/pg-core';
import { authTimestamps } from './common';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('user'), // 'admin' | 'user'
  name: text('name').notNull().default(''),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  ...authTimestamps,
  deletedAt: timestamp('deleted_at', { mode: 'string' }),
});

// Better Auth Session table
export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  token: text('token').notNull().unique(),
  ...authTimestamps,
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
});

// Better Auth Account table (stores passwords for credential auth)
export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  password: text('password'), // Credential provider stores password here
  ...authTimestamps,
});

// Better Auth Verification table
export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { mode: 'string' }).notNull(),
  ...authTimestamps,
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

## 5. Content Schema

### schema/content.ts

```typescript
import { pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core';
import { timestamps } from './common';
import { users } from './auth';

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  ...timestamps,
});

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  status: text('status').notNull().default('draft'), // 'draft' | 'published'
  authorId: uuid('author_id').notNull().references(() => users.id),
  categoryId: uuid('category_id').references(() => categories.id),
  publishedAt: timestamp('published_at', { mode: 'string' }),
  ...timestamps,
});

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ...timestamps,
});

export const postTags = pgTable('post_tags', {
  postId: uuid('post_id').notNull().references(() => posts.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
});
```

## 6. Schema Index (with Relations)

### schema/index.ts

```typescript
// Re-export all tables
export * from './common';
export * from './auth';
export * from './content';
export * from './comments';

// Define relations in ONE place (avoid circular deps)
import { relations } from 'drizzle-orm';
import { users, sessions, accounts } from './auth';
import { posts, categories, tags, postTags } from './content';

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  category: one(categories, { fields: [posts.categoryId], references: [categories.id] }),
  postTags: many(postTags),
}));
```

## 7. Database Client

### src/index.ts

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

// Re-export schema and utilities
export * from './schema';
export { eq, and, or, desc, asc, count, sql, inArray, ilike } from 'drizzle-orm';
```

## 8. Apply Schema

```bash
# Development: Direct push (no migration files)
pnpm --filter @repo/database db:push

# Production: Generate and apply migrations
pnpm --filter @repo/database drizzle-kit generate
pnpm --filter @repo/database drizzle-kit migrate
```

## 9. Seed Data

### src/seed.ts

```typescript
import { db, users, accounts, categories, posts } from './index';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

async function seed() {
  // Create admin user
  const [admin] = await db.insert(users).values({
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
    emailVerified: true,
  }).returning();

  // Create credential account (Better Auth stores password here)
  const hashedPassword = await bcrypt.hash('Admin@Test2024!', BCRYPT_ROUNDS);
  await db.insert(accounts).values({
    id: crypto.randomUUID(),
    accountId: admin.id,
    providerId: 'credential',
    userId: admin.id,
    password: hashedPassword,
  });

  // Create categories
  const [techCategory] = await db.insert(categories).values({
    name: '技術',
    slug: 'tech',
  }).returning();

  // Create sample posts
  await db.insert(posts).values({
    title: 'サンプル記事',
    slug: 'sample-post',
    content: '# サンプル記事\n\nこれはサンプルです。',
    status: 'published',
    authorId: admin.id,
    categoryId: techCategory.id,
    publishedAt: new Date().toISOString(),
  });

  console.log('Seed completed');
}

seed().catch(console.error);
```

## Key Points

1. **Better Auth Compatibility**: Use `mode: 'string'` for timestamps
2. **Password Storage**: Better Auth stores passwords in `accounts.password`, not `users.password`
3. **UUID vs Text**: Users use `uuid`, other Better Auth tables use `text` for id
4. **Relations**: Define in schema/index.ts to avoid circular imports

## Next Steps

- [Auth Setup](auth-setup.md) - Configure Better Auth with this schema
