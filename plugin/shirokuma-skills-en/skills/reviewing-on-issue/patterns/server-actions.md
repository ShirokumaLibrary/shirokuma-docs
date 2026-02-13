# Server Action Patterns

Related: [security.md](../criteria/security.md) (A01, A05, A08), [testing.md](../criteria/testing.md), [code-quality.md](../criteria/code-quality.md)

> **Terminology**: Since React 19, only Server Functions that are passed to the `action` prop or called from within an action are called "Server Actions". Not all Server Functions are Server Actions.

## Basic Pattern

```typescript
"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

const Schema = z.object({
  name: z.string().min(1).max(100),
})

export async function createFeature(formData: FormData): Promise<ActionResult<{ id: string }>> {
  // 1. Authentication
  const session = await verifyAdmin(await headers())
  if (!session) return { success: false, error: "Unauthorized" }

  // 2. CSRF Protection (via CSP nonce - see below)
  const headersList = await headers()
  const nonce = headersList.get("x-nonce")
  if (!nonce) {
    return { success: false, error: "Invalid request" }
  }

  // 3. Validation
  const validated = Schema.safeParse({ name: formData.get("name") })
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message }
  }

  // 4. Operation
  try {
    const [result] = await db
      .insert(features)
      .values(validated.data)
      .returning({ id: features.id })

    // 5. Revalidation
    revalidatePath("/features")

    return { success: true, data: { id: result.id } }
  } catch (error) {
    console.error("Failed:", error)
    return { success: false, error: "Operation failed" }
  }
}
```

## Requirements Checklist

- [ ] `"use server"` at top of file
- [ ] Authentication check at start
- [ ] CSRF protection (CSP nonce verification)
- [ ] Input validation with Zod
- [ ] Ownership verification for mutations
- [ ] Error handling with try/catch
- [ ] Use `revalidatePath` or `revalidateTag`
- [ ] Return structured response
- [ ] Don't expose internal error details

## Client Form Pattern

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
      if (!result.success) {
        setError(result.error)
      } else {
        window.location.href = "/features"  // Full page reload
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="text-red-500">{error}</p>}
      {/* form fields */}
      <button disabled={isPending}>
        {isPending ? t("submitting") : t("submit")}
      </button>
    </form>
  )
}
```

## useActionState Pattern (React 19)

```typescript
"use client"
import { useActionState } from "react"
import { createPost } from "@/lib/actions/posts"

function PostForm() {
  const [state, formAction, pending] = useActionState(createPost, null)

  return (
    <form action={formAction}>
      {state?.error && <p className="text-red-500">{state.error}</p>}
      <input name="title" disabled={pending} />
      <button disabled={pending}>
        {pending ? "Creating..." : "Create"}
      </button>
    </form>
  )
}
```

## Authorization Patterns

### Ownership Check

```typescript
export async function deletePost(id: string): Promise<ActionResult> {
  const session = await verifyAdmin(await headers())
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // Verify ownership
  const post = await db.query.posts.findFirst({
    where: and(eq(posts.id, id), eq(posts.authorId, session.user.id))
  })

  if (!post) {
    return { success: false, error: "Post not found" }
  }

  await db.delete(posts).where(eq(posts.id, id))
  revalidatePath("/posts")
  return { success: true }
}
```

### Role Check

```typescript
export async function updateUserRole(userId: string, newRole: string): Promise<ActionResult> {
  const session = await verifyAdmin(await headers())

  // Only super admins can change roles
  if (session?.user?.role !== "super_admin") {
    return { success: false, error: "Forbidden" }
  }

  await db.update(users).set({ role: newRole }).where(eq(users.id, userId))
  revalidatePath("/admin/users")
  return { success: true }
}
```

## Testing Pattern (Queue-Based Mock)

```typescript
jest.mock("@repo/database", () => {
  const queryResults: any[] = []  // FIFO queue

  const createQueryBuilder = () => {
    const builder: any = {
      from: jest.fn(() => builder),
      where: jest.fn(() => builder),
      orderBy: jest.fn(() => builder),
      limit: jest.fn(() => builder),
      offset: jest.fn(() => builder),
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
    posts: { id: "id", title: "title" },
    eq: jest.fn((col, val) => ({ type: "eq", col, val })),
    __queryResults__: queryResults,
  }
})

// Usage in tests
const dbModule = require("@repo/database") as any
const queryResults = dbModule.__queryResults__ as any[]
const queueQueryResult = (...results: any[]) => results.forEach(r => queryResults.push(r))

it("handles paginated query", async () => {
  queueQueryResult([{ count: 10 }], [{ id: "1", title: "Post" }])
  const result = await getPaginatedPosts(1, 10)
  expect(result.data).toHaveLength(1)
})
```

## CSP Nonce Pattern

### Middleware Setup

```typescript
// apps/admin/middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { randomBytes } from "crypto"

export function middleware(request: NextRequest) {
  // Generate nonce for CSP
  const nonce = randomBytes(32).toString("base64")

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Set CSP header with nonce
  response.headers.set(
    "Content-Security-Policy",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; object-src 'none'; base-uri 'self';`
  )

  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
```

### Client Component Usage

```typescript
"use client"

import { useEffect, useState } from "react"

export function SecureForm() {
  const [nonce, setNonce] = useState<string>("")

  useEffect(() => {
    // Retrieve nonce from meta tag or inline script
    const nonceElement = document.querySelector('meta[name="csp-nonce"]')
    if (nonceElement) {
      setNonce(nonceElement.getAttribute("content") || "")
    }
  }, [])

  const handleSubmit = async (formData: FormData) => {
    // Server Action automatically includes nonce from headers
    const result = await createFeature(formData)
    // ...
  }

  return <form onSubmit={handleSubmit}>{/* ... */}</form>
}
```

### Layout Integration

```typescript
// apps/admin/app/[locale]/layout.tsx
import { headers } from "next/headers"

export default async function RootLayout({ children }: Props) {
  const headersList = await headers()
  const nonce = headersList.get("x-nonce") || ""

  return (
    <html>
      <head>
        <meta name="csp-nonce" content={nonce} />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

## Timing Attack Prevention

### Constant-Time Operations

```typescript
// Prevent timing attacks on authentication/authorization
async function waitForMinimumDuration(
  startTime: number,
  minimumMs: number
): Promise<void> {
  const elapsed = Date.now() - startTime
  const remaining = minimumMs - elapsed
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining))
  }
}

export async function signInAction(credentials: SignInInput) {
  const startTime = Date.now()

  try {
    const result = await auth.api.signInEmail({ body: credentials })

    if (!result) {
      await waitForMinimumDuration(startTime, 500)
      return { error: "Invalid credentials" }
    }

    // Always take at least 500ms (prevents timing attacks)
    await waitForMinimumDuration(startTime, 500)
    return { success: true }
  } catch (error) {
    await waitForMinimumDuration(startTime, 500)
    throw error
  }
}
```

### Benefits

1. **User Enumeration Prevention**: Same timing regardless of user existence
2. **Password Complexity Detection**: Can't infer password strength from response time
3. **Database Query Timing**: Hides variations in query execution time
4. **Rate Limiting**: Makes automated attacks harder to optimize

## Anti-Patterns

### Missing Authentication

```typescript
// Bad: No auth check
export async function deletePost(id: string) {
  await db.delete(posts).where(eq(posts.id, id))  // Anyone can delete!
}
```

### Missing CSRF Protection

```typescript
// Bad: No nonce verification
export async function sensitiveAction(data: FormData) {
  const session = await verifyAdmin(await headers())
  // Missing: nonce check for CSRF protection
  await performSensitiveOperation(data)
}
```

### Exposing Internal Errors

```typescript
// Bad: Leaks database error details
catch (error) {
  return { success: false, error: error.message }
}

// Good: Generic error message
catch (error) {
  console.error("Failed:", error)  // Log internally
  return { success: false, error: "Operation failed" }  // Generic to user
}
```

### Missing Validation

```typescript
// Bad: Direct use of form data
export async function createPost(formData: FormData) {
  const title = formData.get("title") as string
  await db.insert(posts).values({ title })  // No validation!
}
```

### Timing Attacks Vulnerable

```typescript
// Bad: Early return reveals user existence
export async function signIn(email: string, password: string) {
  const user = await findUserByEmail(email)
  if (!user) {
    return { error: "Invalid credentials" }  // Fast return = user doesn't exist
  }

  const valid = await verifyPassword(user, password)  // Slow operation
  if (!valid) {
    return { error: "Invalid credentials" }  // Slow return = user exists
  }

  return { success: true }
}

// Good: Constant-time response
export async function signIn(email: string, password: string) {
  const startTime = Date.now()

  const user = await findUserByEmail(email)
  const valid = user ? await verifyPassword(user, password) : false

  await waitForMinimumDuration(startTime, 500)

  if (!valid) {
    return { error: "Invalid credentials" }
  }

  return { success: true }
}
```

## Security Warning: React2Shell (CVE-2025-66478)

Unsafe deserialization in the RSC protocol enables unauthenticated RCE through Server Functions (CVSS 10.0). Affects Next.js 15.x / 16.x (App Router).

**Required action**: Immediate upgrade to patched version. No workaround available.
See the "Critical CVEs" section in [security.md](../criteria/security.md) for details.
