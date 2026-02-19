# CSRF Protection Pattern

## Overview

Server Actions are protected from CSRF attacks using Origin/Referer header validation. This project uses a two-function pattern to ensure CSRF protection is applied to all mutation operations.

---

## Implementation

### CSRF Validation Utility

```typescript
// lib/csrf.ts
import { headers } from "next/headers"

export async function validateCsrfToken(allowedOrigin?: string): Promise<void> {
  const expectedOrigin = allowedOrigin || process.env.NEXT_PUBLIC_APP_URL
  const headersList = await headers()
  const origin = headersList.get("origin")
  const referer = headersList.get("referer")

  // Check Origin header (preferred)
  if (origin && origin !== expectedOrigin) {
    throw new Error("CSRF validation failed: Invalid origin")
  }

  // Fallback to Referer header
  if (!origin && referer) {
    const refererOrigin = new URL(referer).origin
    if (refererOrigin !== expectedOrigin) {
      throw new Error("CSRF validation failed: Invalid referer")
    }
  }

  // Reject if both headers are missing
  if (!origin && !referer) {
    throw new Error("CSRF validation failed: Missing headers")
  }
}
```

---

## Two-Function Auth Pattern

```typescript
// lib/auth-utils.ts
import { headers } from "next/headers"
import { validateCsrfToken } from "./csrf"
import { verifyAdminAuth } from "./auth"

// For read operations (no CSRF needed)
export async function verifyAdmin(): Promise<string> {
  const session = await verifyAdminAuth(await headers())
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

// For mutations (CSRF + auth)
export async function verifyAdminMutation(): Promise<string> {
  await validateCsrfToken()  // Step 1: CSRF validation
  return await verifyAdmin() // Step 2: Auth check
}
```

---

## Usage Rules

| Operation Type | Function | CSRF Check |
|---------------|----------|------------|
| GET (list, detail) | `verifyAdmin()` | ❌ No |
| POST (create) | `verifyAdminMutation()` | ✅ Yes |
| PUT/PATCH (update) | `verifyAdminMutation()` | ✅ Yes |
| DELETE | `verifyAdminMutation()` | ✅ Yes |

---

## Example Usage

### Query (Read) - No CSRF

```typescript
export async function getFeatures(page: number = 1) {
  await verifyAdmin()  // No CSRF needed for reads
  return await db.select().from(features).limit(20)
}
```

### Mutation (Write) - CSRF Required

```typescript
export async function createFeature(formData: FormData): Promise<ActionResult | void> {
  const userId = await verifyAdminMutation()  // CSRF + Auth
  // ... validation and database operation
}
```

---

## Public App Pattern

For public-facing actions (like comments), use explicit CSRF validation:

```typescript
export async function createComment(postId: string, content: string): Promise<Result> {
  // CSRF protection - explicit call
  try {
    await validateCsrfToken()
  } catch (error) {
    return { success: false, error: "post.errors.csrfValidationFailed" }
  }

  // Auth - getUser instead of verifyAdmin
  const session = await getUser(await headers())
  if (!session?.user?.id) {
    return { success: false, error: "post.errors.loginRequired" }
  }

  // Continue with operation...
}
```

---

## Testing CSRF Protection

```typescript
// Test that CSRF is validated
it("rejects requests with invalid origin", async () => {
  // Mock headers with wrong origin
  mockHeaders.mockResolvedValueOnce(new Headers({
    origin: "https://evil.com"
  }))

  const result = await createFeature(validFormData())
  expect(result).toEqual({
    success: false,
    error: "CSRF validation failed",
    code: "CSRF_INVALID"
  })
})
```

---

## Security Considerations

1. **Never skip CSRF for mutations** - All POST/PUT/PATCH/DELETE operations must validate CSRF
2. **Use environment variable** - `NEXT_PUBLIC_APP_URL` should be set correctly in all environments
3. **Prefer Origin header** - More reliable than Referer header
4. **Handle missing headers** - Reject requests without both Origin and Referer
