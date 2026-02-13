# Account Lockout Pattern

## Overview

Redis-based account lockout system to prevent brute force attacks. Uses exponential backoff with privacy-preserving email hashing.

## Implementation Pattern

### Core Components

```typescript
// packages/database/src/rate-limit.ts
import { createHash } from "crypto";

export async function checkAccountLockout(
  redis: Redis,
  email: string
): Promise<{ locked: boolean; remainingTime?: number }> {
  const emailHash = hashEmail(email);
  const key = `account_lockout:${emailHash}`;

  const attempts = await redis.get(key);
  if (!attempts) return { locked: false };

  const count = parseInt(attempts, 10);
  const ttl = await redis.ttl(key);

  // 5 attempts in 15 minutes → lockout
  if (count >= 5) {
    return { locked: true, remainingTime: ttl };
  }

  return { locked: false };
}

export async function recordFailedAttempt(
  redis: Redis,
  email: string
): Promise<void> {
  const emailHash = hashEmail(email);
  const key = `account_lockout:${emailHash}`;

  const current = await redis.incr(key);

  if (current === 1) {
    // First attempt: 15 minute window
    await redis.expire(key, 15 * 60);
  } else if (current >= 5) {
    // Lockout: extend to 1 hour
    await redis.expire(key, 60 * 60);
  }
}

function hashEmail(email: string): string {
  return createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex");
}
```

## Thresholds

| Level | Attempts | Window | Action |
|-------|----------|--------|--------|
| Warning | 1-4 | 15 minutes | Track attempts |
| Lockout | 5+ | 1 hour | Block authentication |
| Extended | 10+ | 24 hours | Long-term block (future) |

## Privacy Considerations

1. **Email Hashing**: Use SHA-256 to prevent email exposure in Redis
2. **No PII in Keys**: Redis keys contain only hashes
3. **Consistent Timing**: Always check lockout even if user doesn't exist
4. **No User Feedback**: Don't reveal if email exists

## Fail-Closed Behavior

```typescript
// If Redis is unavailable, fail closed (reject auth)
export async function checkAccountLockout(
  redis: Redis,
  email: string
): Promise<{ locked: boolean; remainingTime?: number }> {
  try {
    // ... normal logic
  } catch (error) {
    console.error("Redis error during lockout check:", error);
    // Fail closed: treat as locked when Redis is down
    return { locked: true, remainingTime: 900 };
  }
}
```

## Integration with Auth

```typescript
// apps/admin/lib/actions/auth.ts
export async function signInAction(credentials: SignInInput) {
  const startTime = Date.now();

  // 1. Check lockout BEFORE any DB queries
  const lockout = await checkAccountLockout(redis, credentials.email);
  if (lockout.locked) {
    await waitForMinimumDuration(startTime, 500);
    return { error: "Too many failed attempts" };
  }

  // 2. Authenticate
  const result = await auth.api.signInEmail({ body: credentials });

  if (!result) {
    // 3. Record failure
    await recordFailedAttempt(redis, credentials.email);
    await waitForMinimumDuration(startTime, 500);
    return { error: "Invalid credentials" };
  }

  // 4. Clear lockout on success
  await clearAccountLockout(redis, credentials.email);

  return { success: true };
}
```

## Review Checklist

- [ ] Email is hashed before Redis storage
- [ ] Lockout checked BEFORE database queries
- [ ] Fail-closed behavior on Redis errors
- [ ] Timing attacks prevented (consistent duration)
- [ ] TTL set correctly (15min → 1hr escalation)
- [ ] Successful login clears lockout
- [ ] No user enumeration via error messages

## Common Issues

1. **Lockout not clearing**: Ensure `clearAccountLockout()` called on success
2. **User enumeration**: Use same error message for locked/invalid
3. **Redis memory**: Implement LRU eviction policy
4. **Distributed systems**: Consider centralized Redis for multi-instance deployments

## Testing

```typescript
// tests/e2e/account-lockout.spec.ts
test("locks account after 5 failed attempts", async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await signIn(page, "test@example.com", "wrongpassword");
  }

  // 6th attempt should be blocked
  const response = await signIn(page, "test@example.com", "correctpassword");
  expect(response.error).toContain("Too many failed attempts");
});

test("lockout expires after 1 hour", async ({ page }) => {
  // Trigger lockout
  for (let i = 0; i < 5; i++) {
    await signIn(page, "test@example.com", "wrongpassword");
  }

  // Fast-forward Redis time (in test environment)
  await redis.expire(`account_lockout:${hash}`, 1);
  await new Promise(resolve => setTimeout(resolve, 1100));

  // Should succeed now
  const response = await signIn(page, "test@example.com", "correctpassword");
  expect(response.success).toBe(true);
});
```

## Metrics to Monitor

- Lockout trigger rate (alerts for attacks)
- False positive rate (legitimate users locked)
- Redis latency/availability
- Average time to lockout clear
