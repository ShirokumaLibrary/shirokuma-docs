# Code Patterns

## Action Organization (Directory-Based)

Server Actions should be organized by their nature:

```
lib/actions/
├── crud/                    # Table-driven CRUD actions (1:1 with DB tables)
│   ├── organizations.ts     # CRUD for organizations table
│   ├── projects.ts          # CRUD for projects table
│   ├── sessions.ts          # CRUD for work_sessions table
│   ├── entities.ts          # CRUD for entities table
│   └── members.ts           # CRUD for team_members table
│
├── domain/                  # Domain-driven composite actions
│   ├── dashboard.ts         # Aggregates data from multiple tables
│   ├── contexts.ts          # User context management (cross-cutting)
│   ├── publishing.ts        # Post publishing workflow
│   ├── moderation.ts        # Content moderation operations
│   └── onboarding.ts        # User onboarding flow
│
└── types.ts                 # Shared types (ActionResult, etc.)
```

### CRUD Actions (`crud/`)

**Characteristics**:
- 1:1 mapping with database tables
- Standard CRUD operations: `get`, `list`, `create`, `update`, `delete`
- Single table focus (may join for reads, but writes to one table)
- Predictable naming: `get{Entity}`, `create{Entity}`, etc.

```typescript
// lib/actions/crud/projects.ts
/**
 * @serverAction
 * @feature ProjectManagement
 * @dbTables projects
 */

export async function getProjects(orgId: string) { /* ... */ }
export async function getProject(id: string) { /* ... */ }
export async function createProject(formData: FormData) { /* ... */ }
export async function updateProject(id: string, formData: FormData) { /* ... */ }
export async function deleteProject(id: string) { /* ... */ }
```

### Domain Actions (`domain/`)

**Characteristics**:
- Business capability focused
- Operates on multiple tables
- Complex workflows or aggregations
- Named by business operation, not table

```typescript
// lib/actions/domain/dashboard.ts
/**
 * @serverAction
 * @feature DashboardManagement
 * @dbTables projects, sessions, entities, activities
 */

export async function getDashboardStats(orgId: string) {
  // Aggregates from: projects, sessions, entities, activities
}

export async function getRecentActivity(orgId: string, limit: number) {
  // Joins: activities, users, projects
}
```

```typescript
// lib/actions/domain/publishing.ts
/**
 * @serverAction
 * @feature ContentPublishing
 * @dbTables posts, categories, tags, post_tags, related_posts
 */

export async function publishPost(postId: string) {
  // 1. Validate post is ready
  // 2. Update post status
  // 3. Create activity log
  // 4. Invalidate caches
  // 5. Send notifications
}

export async function schedulePost(postId: string, publishAt: Date) { /* ... */ }
export async function unpublishPost(postId: string) { /* ... */ }
```

### Decision Guide

| Question | CRUD | Domain |
|----------|------|--------|
| Operates on single table? | ✅ | ❌ |
| Standard get/create/update/delete? | ✅ | ❌ |
| Business workflow with steps? | ❌ | ✅ |
| Aggregates from multiple tables? | ❌ | ✅ |
| Named after table? | ✅ | ❌ |
| Named after business operation? | ❌ | ✅ |

### Import Pattern

```typescript
// From components/pages
import { getProjects, createProject } from "@/lib/actions/crud/projects"
import { getDashboardStats } from "@/lib/actions/domain/dashboard"

// Re-export for convenience (optional)
// lib/actions/index.ts
export * from "./crud/projects"
export * from "./crud/organizations"
export * from "./domain/dashboard"
```

---

## Next.js 16: Async Params

```typescript
type Props = {
  params: Promise<{ locale: string; id: string }>
  searchParams: Promise<{ page?: string }>
}

export default async function Page({ params, searchParams }: Props) {
  const { locale, id } = await params
  const { page } = await searchParams
}
```

## ActionResult with Error Codes

Always include error codes for programmatic handling:

```typescript
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; code?: ActionErrorCode }

type ActionErrorCode =
  | "UNAUTHORIZED"
  | "CSRF_INVALID"
  | "VALIDATION_FAILED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "DUPLICATE"
  | "RATE_LIMIT_EXCEEDED"
  | "INTERNAL_ERROR"
```

## Two-Function Auth Pattern

Use different functions for reads vs mutations:

```typescript
// lib/auth-utils.ts

// For read operations (no CSRF needed)
export async function verifyAdmin(): Promise<string> {
  const session = await verifyAdminAuth(await headers())
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

// For mutations (CSRF + auth)
export async function verifyAdminMutation(): Promise<string> {
  await validateCsrfToken()  // Step 1: CSRF
  return await verifyAdmin() // Step 2: Auth
}
```

**Usage:**
- Read operations: `verifyAdmin()`
- Mutations (create/update/delete): `verifyAdminMutation()`

## Server Action Pattern (Mutations)

```typescript
"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { verifyAdminMutation } from "@/lib/auth-utils"

const Schema = z.object({
  name: z.string().min(1).max(100),
})

export async function createFeature(formData: FormData): Promise<ActionResult<{ id: string }> | void> {
  // Step 1: Auth + CSRF (verifyAdminMutation does both)
  const userId = await verifyAdminMutation()

  // Step 2: Validation
  const validated = Schema.safeParse({ name: formData.get("name") })
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message, code: "VALIDATION_FAILED" }
  }

  // Step 3: Business logic (duplicate check, etc.)
  const existing = await db.select().from(features).where(eq(features.name, validated.data.name)).limit(1)
  if (existing.length > 0) {
    return { success: false, error: "Name already exists", code: "DUPLICATE" }
  }

  // Step 4: Database operation + Cache invalidation + Redirect
  await db.insert(features).values({ ...validated.data, authorId: userId })
  revalidatePath("/features")
  redirect("/features")
}
```

## Ownership Check Pattern

Before mutating a resource, verify the user owns it:

```typescript
export async function updateFeature(id: string, formData: FormData): Promise<ActionResult | void> {
  const userId = await verifyAdminMutation()

  // Ownership check
  const existing = await db.select().from(features).where(eq(features.id, id)).limit(1)
  if (existing.length === 0) {
    return { success: false, error: "Not found", code: "NOT_FOUND" }
  }
  if (existing[0].authorId !== userId) {
    return { success: false, error: "Not authorized", code: "FORBIDDEN" }
  }

  // Continue with update...
}
```

## Rate Limiting Pattern

Add rate limiting AFTER auth, BEFORE business logic:

```typescript
export async function deleteFeature(id: string): Promise<ActionResult> {
  const userId = await verifyAdminMutation()

  // Rate limit check
  const rateLimitKey = `delete-feature:${userId}`
  const rateLimitResult = await checkRateLimit(rateLimitKey, RateLimiters.delete)

  if (!rateLimitResult.success) {
    const waitSeconds = Math.ceil((rateLimitResult.reset * 1000 - Date.now()) / 1000)
    return {
      success: false,
      error: `Rate limit exceeded. Try again in ${waitSeconds}s`,
      code: "RATE_LIMIT_EXCEEDED"
    }
  }

  // Continue with delete...
}
```

## Transaction Pattern

Use transactions for related data operations:

```typescript
await db.transaction(async (tx) => {
  const result = await tx.insert(posts).values(newPost).returning({ id: posts.id })
  const postId = result[0].id

  if (tagIds.length > 0) {
    await tx.insert(postTags).values(
      tagIds.map((tagId) => ({ postId, tagId }))
    )
  }
})
```

## Open Redirect Protection

Validate callback URLs to prevent open redirects:

```typescript
function isInternalUrl(url: string | undefined): boolean {
  if (!url) return false
  return url.startsWith("/") && !url.startsWith("//")
}

// Usage in login form
const safeCallbackUrl = isInternalUrl(callbackUrl) ? callbackUrl! : "/"
window.location.href = safeCallbackUrl
```

## Server Component with i18n

```typescript
import { getTranslations, setRequestLocale } from "next-intl/server"

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)  // REQUIRED for static rendering

  const t = await getTranslations("namespace")
  return <h1>{t("title")}</h1>
}
```

## Client Component with Form

```typescript
"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"

export function FeatureForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const t = useTranslations("features.form")

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createFeature(formData)
      if (!result.success) setError(result.error)
    })
  }

  return <form onSubmit={handleSubmit}>{/* ... */}</form>
}
```
