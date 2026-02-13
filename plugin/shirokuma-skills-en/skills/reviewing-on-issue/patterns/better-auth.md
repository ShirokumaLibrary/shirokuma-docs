# Better Auth Patterns

Related: [security.md](../criteria/security.md) (A01, A07), [e2e-testing.md](e2e-testing.md)

## Configuration

### Server-Side Auth Config

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import bcrypt from "bcryptjs"

const BCRYPT_ROUNDS = 12  // Minimum 12 for security

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    password: {
      hash: async (password) => bcrypt.hash(password, BCRYPT_ROUNDS),
      verify: async ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,  // 30 days
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  cookies: {
    sessionToken: {
      name: "better-auth.session_token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  rateLimit: {
    enabled: true,
    window: 15 * 60,  // 15 minutes
    max: process.env.NODE_ENV === "production" ? 5 : 1000,  // Relaxed for dev/test
  },
})
```

### Client-Side Auth Config

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  fetchOptions: { credentials: "include" },  // Required for cookies!
})

export const { signIn, signUp, signOut, useSession } = authClient
```

## Role-Based Access

Better Auth doesn't include custom fields in session. Query database for role:

```typescript
export async function verifyAdmin(headers: Headers) {
  const session = await auth.api.getSession({ headers })
  if (!session) return null

  // Query database for role
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))

  if (user?.role !== "admin") return null
  return { user: { ...session.user, role: user.role } }
}
```

### Admin Role Check Endpoint

For client-side admin verification:

```typescript
// app/api/auth/check-admin/route.ts
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 })
  }

  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Not admin" }, { status: 403 })
  }

  return NextResponse.json({ isAdmin: true }, { status: 200 })
}
```

## v1.4 Breaking Changes

| Change | Before | After |
|--------|--------|-------|
| Password Reset | `authClient.forgotPassword()` | `authClient.requestPasswordReset()` |
| Email Change Flow | `sendChangeEmailVerification` callback | Use `emailVerification.sendVerificationEmail` |
| Account Info | `POST /account-info` (body) | `GET /account-info` (query) |
| Passkey Plugin | Built into `better-auth` | Separated to `@better-auth/passkey` package |
| API Key Mock Session | Enabled by default | Disabled by default (must be explicitly enabled) |
| generateId | `advanced.generateId` | Removed. Use `advanced.database.generateId: "serial"` |

Plugin callback `request` argument changed to `ctx`:
- Email OTP: `sendVerificationOTP`, `generateOTP`
- Magic Link: `sendMagicLink`
- Phone Number: `sendOTP`, `sendPasswordResetOTP`
- Organization: `customCreateDefaultTeam`, `maximumTeams`

## Common Patterns

### Post-Login Redirect

Use `window.location.href` instead of `router.push()`:

```typescript
// Wrong: May not send cookies properly
router.push("/dashboard")

// Correct: Full page reload ensures cookies sent
window.location.href = "/dashboard"
```

### Session in Client Components

```typescript
"use client"
import { authClient } from "@/lib/auth-client"

export function UserNav() {
  const { data: session } = authClient.useSession()

  const handleLogout = () => {
    authClient.signOut()
    window.location.href = "/login"  // Use location, NOT router.push()
  }

  return session ? <UserDropdown user={session.user} /> : <LoginButton />
}
```

### Multi-Step Auth Flow (Admin)

Admin login with role verification involves multiple API calls:

1. `signIn` - Authenticate credentials
2. `get-session` - Get session data
3. `check-admin` - Verify admin role

This flow needs longer timeouts in E2E tests (~15 seconds).

## Database Schema Notes

- Passwords stored in `accounts` table (not `users` table)
- Sessions stored in `sessions` table
- Verification tokens in `verifications` table
- User custom fields (role, emailVerified) in `users` table

## Security Checklist

- [ ] `BETTER_AUTH_SECRET` >= 32 characters
- [ ] bcrypt rounds >= 12
- [ ] Cookie `httpOnly: true`
- [ ] Cookie `sameSite: "lax"`
- [ ] Cookie `secure: true` in production
- [ ] `credentials: "include"` on client
- [ ] Rate limiting enabled
