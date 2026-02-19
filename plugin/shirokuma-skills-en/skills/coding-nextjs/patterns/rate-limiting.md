# Rate Limiting Pattern

## Overview

Rate limiting protects against abuse and brute-force attacks. Apply to destructive or expensive operations like deletes, password resets, and API calls.

---

## Implementation

### Rate Limiter Configuration

```typescript
// lib/rate-limit.ts
import { Redis } from "@upstash/redis"  // or ioredis

const redis = new Redis({
  url: process.env.REDIS_URL!,
})

export const RateLimiters = {
  delete: { windowMs: 60_000, maxRequests: 10 },        // 10 deletes per minute
  create: { windowMs: 60_000, maxRequests: 30 },        // 30 creates per minute
  comment: { windowMs: 60_000, maxRequests: 5 },        // 5 comments per minute
  passwordReset: { windowMs: 3600_000, maxRequests: 3 }, // 3 per hour
  login: { windowMs: 300_000, maxRequests: 5 },         // 5 login attempts per 5 min
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number  // Unix timestamp when limit resets
}

export async function checkRateLimit(
  key: string,
  limiter: { windowMs: number; maxRequests: number }
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - limiter.windowMs

  // Remove old entries
  await redis.zremrangebyscore(key, 0, windowStart)

  // Count current requests
  const count = await redis.zcard(key)

  if (count >= limiter.maxRequests) {
    // Get oldest entry to calculate reset time
    const oldest = await redis.zrange(key, 0, 0, { withScores: true })
    const resetTime = oldest.length > 0 ? oldest[0].score + limiter.windowMs : now + limiter.windowMs

    return {
      success: false,
      remaining: 0,
      reset: resetTime / 1000,  // Convert to seconds
    }
  }

  // Add current request
  await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` })
  await redis.expire(key, Math.ceil(limiter.windowMs / 1000))

  return {
    success: true,
    remaining: limiter.maxRequests - count - 1,
    reset: (now + limiter.windowMs) / 1000,
  }
}
```

---

## Usage in Server Actions

Apply rate limiting AFTER auth, BEFORE business logic:

```typescript
export async function deleteFeature(id: string): Promise<ActionResult> {
  // Step 1: Auth + CSRF
  const userId = await verifyAdminMutation()

  // Step 2: Rate limiting
  const rateLimitKey = `delete-feature:${userId}`
  const rateLimitResult = await checkRateLimit(rateLimitKey, RateLimiters.delete)

  if (!rateLimitResult.success) {
    const waitSeconds = Math.ceil((rateLimitResult.reset * 1000 - Date.now()) / 1000)
    return {
      success: false,
      error: `Rate limit exceeded. Try again in ${waitSeconds}s`,
      code: "RATE_LIMIT_EXCEEDED",
    }
  }

  // Step 3: Continue with operation...
  // ...
}
```

---

## Operations Requiring Rate Limiting

| Operation | Limiter | Reason |
|-----------|---------|--------|
| Delete | `RateLimiters.delete` | Prevent mass deletion |
| Password Reset | `RateLimiters.passwordReset` | Prevent email flooding |
| Login Attempts | `RateLimiters.login` | Prevent brute force |
| Comment Creation | `RateLimiters.comment` | Prevent spam |
| Email Verification | `RateLimiters.passwordReset` | Prevent email flooding |
| File Uploads | `RateLimiters.create` | Prevent storage abuse |

---

## Key Patterns

### 1. User-Based Keys

```typescript
const rateLimitKey = `delete-feature:${userId}`
```

### 2. IP-Based Keys (for unauthenticated endpoints)

```typescript
const ip = headersList.get("x-forwarded-for") || "unknown"
const rateLimitKey = `password-reset:${ip}`
```

### 3. Combined Keys

```typescript
const rateLimitKey = `comment:${userId}:${postId}`
```

---

## Error Response Pattern

Always include `code` for programmatic handling:

```typescript
return {
  success: false,
  error: `Rate limit exceeded. Try again in ${waitSeconds}s`,
  code: "RATE_LIMIT_EXCEEDED",
}
```

---

## UI Handling

```typescript
const result = await deleteFeature(id)

if (!result.success) {
  if (result.code === "RATE_LIMIT_EXCEEDED") {
    toast.error(result.error)  // Shows wait time
    return
  }
  // Handle other errors
}
```

---

## Testing Rate Limits

```typescript
it("enforces rate limit on delete", async () => {
  // Mock rate limit exceeded
  mockCheckRateLimit.mockResolvedValueOnce({
    success: false,
    remaining: 0,
    reset: Date.now() / 1000 + 30,
  })

  const result = await deleteFeature("feature-1")

  expect(result).toEqual({
    success: false,
    error: expect.stringContaining("Rate limit"),
    code: "RATE_LIMIT_EXCEEDED",
  })
})
```
