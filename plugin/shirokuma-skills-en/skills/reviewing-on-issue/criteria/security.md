# Security Review Criteria

Based on OWASP Top 10 2025 (Released November 6, 2025)

## A01:2025 - Broken Access Control

**Position:** #1 (3.73% of apps affected)

### Checklist

- [ ] Authorization checks on ALL protected operations
- [ ] Server-side validation (not just client-side)
- [ ] Role-based access control enforced
- [ ] No direct object references without ownership validation
- [ ] IDOR (Insecure Direct Object Reference) prevention

### Example

```typescript
// Vulnerable: No ownership check
export async function deletePost(id: string) {
  await db.delete(posts).where(eq(posts.id, id))  // Anyone can delete!
}

// Secure: Ownership verification
export async function deletePost(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await db.delete(posts).where(
    and(eq(posts.id, id), eq(posts.authorId, session.user.id))
  )
}
```

## A02:2025 - Security Misconfiguration

**Position:** #2 (every tested app had issues)

### Checklist

- [ ] .env in .gitignore
- [ ] No secrets in source code
- [ ] Proper CORS configuration
- [ ] Security headers configured
- [ ] Default credentials changed
- [ ] Debug mode disabled in production

### Required Security Headers

```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]
```

## A03:2025 - Software Supply Chain Failures (NEW)

**Position:** #3

### Checklist

- [ ] Dependencies up to date
- [ ] No known CVEs in packages
- [ ] Regular `pnpm audit` runs
- [ ] Lock file committed
- [ ] Trusted package sources only

### Commands

```bash
pnpm audit --audit-level=moderate
pnpm outdated
```

## A04:2025 - Cryptographic Failures

**Position:** #4

### Checklist

- [ ] Passwords hashed with bcrypt (rounds >= 12)
- [ ] Secrets stored in environment variables
- [ ] AUTH_SECRET >= 32 characters
- [ ] No sensitive data in JWT payload
- [ ] HTTPS in production

## A05:2025 - Injection

**Position:** #5

### Checklist

- [ ] Parameterized queries (no string interpolation)
- [ ] ILIKE wildcards escaped (`%`, `_`, `\`)
- [ ] No raw SQL with user input
- [ ] No eval() or Function() constructor
- [ ] All user input validated with Zod

### SQL Injection Prevention

```typescript
// Vulnerable: ILIKE without escaping
const searchTerm = `%${query}%`  // "100%" matches everything!
db.select().from(posts).where(ilike(posts.title, searchTerm))

// Secure: Escaped wildcards
function escapeLikePattern(query: string): string {
  return query.replace(/[%_\\]/g, '\\$&')
}
const searchTerm = `%${escapeLikePattern(query)}%`
```

## A06:2025 - Insecure Design

**Position:** #6

### Checklist

- [ ] Rate limiting on sensitive operations
- [ ] Input validation before processing
- [ ] Proper error handling without info leak
- [ ] Defense in depth

## A07:2025 - Authentication Failures

**Position:** #7

### Checklist

- [ ] Session timeout configured
- [ ] Password complexity enforced
- [ ] Account lockout after failed attempts
- [ ] Secure session cookies
- [ ] Email verification for new accounts

### Better Auth Specific

- [ ] `BETTER_AUTH_SECRET` >= 32 chars
- [ ] bcrypt rounds >= 12
- [ ] Cookie `httpOnly: true`
- [ ] Cookie `sameSite: "lax"`
- [ ] Cookie `secure: true` in production
- [ ] Rate limiting enabled
- [ ] Role check via database (not session)

## A08:2025 - Data Integrity Failures

**Position:** #8

### Checklist

- [ ] Input validation with Zod schemas
- [ ] Mass assignment prevention
- [ ] Update operations use explicit fields

```typescript
// Bad: Mass assignment
await db.update(posts).set({ ...formData })

// Good: Explicit validated fields
const validated = Schema.parse(formData)
await db.update(posts).set({
  title: validated.title,
  content: validated.content,
})
```

## A09:2025 - Logging & Alerting Failures

**Position:** #9

### Checklist

- [ ] Failed auth attempts logged
- [ ] Sensitive operations audited
- [ ] No sensitive data in logs (passwords, tokens)
- [ ] Structured logging with context

## A10:2025 - Mishandling of Exceptional Conditions (NEW)

**Position:** #10

### Checklist

- [ ] Proper error handling (no failing open)
- [ ] Graceful degradation
- [ ] Error messages don't leak information
- [ ] All code paths have error handling

```typescript
// Vulnerable: Failing open
try {
  return await getPost(id)
} catch {
  return null  // Silently fails, may expose data
}

// Secure: Explicit error handling
try {
  const post = await getPost(id)
  if (!post) return { error: "Not found", status: 404 }
  return { data: post }
} catch (error) {
  console.error("Database error:", error)
  return { error: "Internal error", status: 500 }
}
```

## Critical CVEs (Late 2025)

All fixed in the latest Next.js. Upgrade immediately if using an older version.

### CVE-2025-66478 / CVE-2025-55182 (React Server Components RCE)

**Severity**: Critical (CVSS 10.0)
**Issue**: Unsafe deserialization in RSC protocol enables unauthenticated RCE
**Affected**: Next.js 16.0.6 and earlier, all 15.x (App Router)
**Response**: Upgrade to latest patch version. See [Next.js Advisory](https://nextjs.org/blog/CVE-2025-66478) for details

### CVE-2025-55184 / CVE-2025-67779 (DoS)

**Severity**: High (CVSS 7.5)
**Issue**: Crafted HTTP requests hang the server process

### CVE-2025-55183 (Source Code Exposure)

**Severity**: Medium (CVSS 5.3)
**Issue**: Compiled Server Functions source code may leak

### CVE-2026-23864 (React DoS)

**Severity**: High (CVSS 7.5)
**Issue**: Denial-of-Service vulnerability against React Server Components

## Server Actions Security

### Checklist

- [ ] `"use server"` directive present
- [ ] Authentication check at start
- [ ] Input validation with Zod
- [ ] Authorization/ownership verification
- [ ] No sensitive data in error responses
- [ ] Rate limiting on sensitive actions

## Environment Variables

### Required in .gitignore

```
.env
.env.local
.env.*.local
```

### Secret Requirements

- `BETTER_AUTH_SECRET`: 32+ characters (use `openssl rand -base64 32`)
- `DATABASE_URL`: No hardcoded credentials in code
