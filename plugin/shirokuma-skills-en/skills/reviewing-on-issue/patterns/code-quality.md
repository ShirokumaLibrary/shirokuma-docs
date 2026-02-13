# Code Quality Patterns

This document outlines code quality patterns and best practices for the Next.js TDD Blog CMS project.

## Form Data Parsing Pattern

Use the `parseFormData` utility for consistent parsing instead of manual parsing:

```typescript
// ✅ GOOD: Use parseFormData utility
import { parseFormData } from "@/lib/utils/form"

const data = parseFormData(formData, schema)

// ❌ BAD: Manual parsing
const data = Object.fromEntries(formData) as unknown as T
```

**Benefits:**
- Type-safe parsing with Zod schema validation
- Consistent error handling
- Reduces boilerplate code
- Centralized parsing logic

## Transaction Error Handling

Always wrap database transactions in try-catch blocks:

```typescript
// ✅ GOOD: Proper error handling
try {
  await db.transaction(async (tx) => {
    // database operations
    await tx.insert(table).values(data)
  })
} catch (error) {
  return { success: false, error: "database_error" }
}

// ❌ BAD: No error handling
await db.transaction(async (tx) => {
  await tx.insert(table).values(data)
})
```

**Benefits:**
- Prevents unhandled rejections
- Consistent error responses
- Rollback protection
- Better debugging

## Type Consolidation

Use the following criteria for organizing types:

### Shared Package (`@repo/shared`)
- Types used by 2 or more apps
- Common domain models
- Shared utility types

```typescript
// packages/shared/src/types/index.ts
export interface User {
  id: string
  email: string
  name: string
}
```

### App-Specific Types
- Types used within a single app
- Located in `lib/actions/types.ts`

```typescript
// apps/admin/lib/actions/types.ts
export interface CategoryFormState {
  success: boolean
  error?: string
}
```

**Criteria:**
- Used by 2+ apps → move to `@repo/shared` package
- Used by 1 app → keep in app's `lib/actions/types.ts`

## Date Handling

Use consistent date formats for different contexts:

### Database Storage
```typescript
// ✅ GOOD: Use Date object for DB inserts/updates
{
  createdAt: new Date(),
  updatedAt: new Date()
}
```

### API Responses
```typescript
// ✅ GOOD: Convert to ISO string for API responses
{
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}
```

**Benefits:**
- Consistent serialization
- Timezone awareness
- JSON compatibility
- Database type compatibility

## useActionState Pattern (React 19)

Use the modern `useActionState` hook for form handling:

```typescript
// ✅ GOOD: Modern React 19 pattern
import { useActionState } from "react"

const [state, formAction, isPending] = useActionState(
  serverAction,
  initialState
)

<form action={formAction}>
  {/* form fields */}
  <button disabled={isPending}>Submit</button>
</form>

// ❌ BAD: Older useTransition pattern
import { useTransition } from "react"

const [isPending, startTransition] = useTransition()

const handleSubmit = (formData: FormData) => {
  startTransition(async () => {
    await serverAction(formData)
  })
}
```

**Benefits:**
- Built-in pending state
- Automatic progressive enhancement
- Better error handling
- Type-safe action state
- Simpler API

---

## Common Anti-Patterns

### N+1 Queries

```typescript
// ❌ BAD: N+1 query pattern
for (const category of categories) {
  const posts = await getPostsByCategory(category.id)
}

// ✅ GOOD: Batch query
const allPosts = await db.select().from(posts).where(inArray(posts.categoryId, categoryIds))
```

### Missing Error Handling

```typescript
// ❌ BAD: No error handling
export async function create(formData: FormData) {
  return await db.insert(features).values({...})
}

// ✅ GOOD: Proper error handling
export async function create(formData: FormData): Promise<ActionResult> {
  try {
    const result = await db.insert(features).values({...})
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: "Operation failed" }
  }
}
```

### Hardcoded Strings (i18n violation)

```typescript
// ❌ BAD: Hardcoded string
<button>Save</button>

// ✅ GOOD: Use translations
const t = useTranslations("common")
<button>{t("save")}</button>
```

### Sequential Queries (Should be Parallel)

```typescript
// ❌ BAD: Sequential queries
const posts = await getPosts()
const categories = await getCategories()
const tags = await getTags()

// ✅ GOOD: Parallel queries
const [posts, categories, tags] = await Promise.all([
  getPosts(),
  getCategories(),
  getTags(),
])
```

### Missing setRequestLocale

```typescript
// ❌ BAD: Static rendering fails
export default async function Page({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations("namespace")
  return <h1>{t("title")}</h1>
}

// ✅ GOOD: Works with static rendering
export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)  // REQUIRED
  const t = await getTranslations("namespace")
  return <h1>{t("title")}</h1>
}
```

### Router Push After Login

```typescript
// ❌ BAD: Causes redirect loop
const handleLogout = () => {
  authClient.signOut()
  router.push("/login")
}

// ✅ GOOD: Full page reload
const handleLogout = () => {
  authClient.signOut()
  window.location.href = "/login"
}
```

### ILIKE Without Escape

```typescript
// ❌ BAD: SQL injection vulnerable
const pattern = `%${userInput}%`
db.select().from(posts).where(ilike(posts.title, pattern))

// ✅ GOOD: Escape special characters
function escapeLikePattern(query: string): string {
  return query.replace(/[%_\\]/g, "\\$&")
}
const pattern = `%${escapeLikePattern(userInput)}%`
db.select().from(posts).where(ilike(posts.title, pattern))
```

---

## Review Checklist

When reviewing code, ensure:

- [ ] Form data is parsed using `parseFormData` utility
- [ ] Database transactions are wrapped in try-catch blocks
- [ ] Types are in the appropriate location (shared vs app-specific)
- [ ] Dates use correct format (Date for DB, ISO string for API)
- [ ] Forms use `useActionState` instead of `useTransition`
- [ ] Error handling is consistent across all server actions
- [ ] Type safety is maintained throughout the code
- [ ] No N+1 queries (use batch queries with `inArray()`)
- [ ] No hardcoded UI strings (use i18n)
- [ ] Independent queries are parallel (`Promise.all`)
- [ ] `setRequestLocale()` is called in server components
- [ ] Auth redirects use `window.location.href`
- [ ] ILIKE patterns are properly escaped
