# Auth Setup

Guide for setting up Better Auth with credential-based authentication.

## Prerequisites

- Database schema configured (see [database-setup.md](database-setup.md))
- Tables: users, sessions, accounts, verifications

## 1. Install Dependencies

```bash
pnpm --filter admin add better-auth bcryptjs
pnpm --filter admin add -D @types/bcrypt
```

## 2. Server-Side Auth Configuration

### lib/auth.ts

```typescript
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { db, users, sessions, accounts, verifications, eq } from "@repo/database"
import bcrypt from "bcryptjs"

const BCRYPT_ROUNDS = 12  // Minimum 12 for security

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    password: {
      hash: async (password) => bcrypt.hash(password, BCRYPT_ROUNDS),
      verify: async ({ hash, password }) => bcrypt.compare(password, hash),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes cache
    },
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
    window: 15 * 60, // 15 minutes
    max: process.env.NODE_ENV === "production" ? 5 : 1000, // Relaxed for dev
  },
  advanced: {
    database: {
      // Users table uses uuid defaultRandom(), let DB generate
      // Other tables use text, need our ID
      generateId: ({ model }) => {
        if (model === "user") return undefined
        return crypto.randomUUID()
      },
    },
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ],
})

// Helper: Verify admin role
export async function verifyAdmin(headers: Headers) {
  const session = await auth.api.getSession({ headers })
  if (!session) return null

  // Better Auth doesn't include role - query database
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (user?.role !== "admin") return null

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: user.role,
    },
  }
}

export type Auth = typeof auth
```

## 3. Client-Side Auth Configuration

### lib/auth-client.ts

```typescript
"use client"

import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3000",
  fetchOptions: {
    credentials: "include",  // REQUIRED for cookies
  },
})

export const { signIn, signUp, signOut, useSession } = authClient
```

## 4. API Route Handler

### app/api/auth/[...all]/route.ts

```typescript
import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)
```

## 5. Admin Role Check Endpoint

### app/api/auth/check-admin/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server"
import { db, users, eq } from "@repo/database"

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

  return NextResponse.json({ isAdmin: true })
}
```

## 6. Login Form Component

### components/login-form.tsx

```typescript
"use client"

import { useState, useTransition } from "react"
import { authClient } from "@/lib/auth-client"
import { useTranslations } from "next-intl"

export function LoginForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const t = useTranslations("auth")

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    startTransition(async () => {
      const result = await authClient.signIn.email({ email, password })

      if (result.error) {
        setError(t("loginError"))
        return
      }

      // Check admin role
      const adminCheck = await fetch(`/api/auth/check-admin?userId=${result.data.user.id}`)
      if (!adminCheck.ok) {
        await authClient.signOut()
        setError(t("notAdmin"))
        return
      }

      // IMPORTANT: Use window.location.href, NOT router.push()
      window.location.href = "/"
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="text-destructive">{error}</p>}
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <button type="submit" disabled={isPending}>
        {isPending ? t("loggingIn") : t("login")}
      </button>
    </form>
  )
}
```

## 7. Session in Server Components

```typescript
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export default async function Page() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/login")
  }

  return <div>Welcome {session.user.name}</div>
}
```

## 8. Protect Server Actions

```typescript
"use server"

import { verifyAdmin } from "@/lib/auth"
import { headers } from "next/headers"

export async function createPost(formData: FormData) {
  // 1. Auth check FIRST
  const session = await verifyAdmin(await headers())
  if (!session) {
    return { success: false, error: "Unauthorized" }
  }

  // 2. Rest of action...
}
```

## Environment Variables

```bash
# Required
BETTER_AUTH_SECRET=your-32-character-secret-minimum
BETTER_AUTH_URL=https://admin.local.test
NEXT_PUBLIC_BETTER_AUTH_URL=https://admin.local.test
```

## Security Checklist

- [ ] `BETTER_AUTH_SECRET` >= 32 characters
- [ ] bcrypt rounds >= 12
- [ ] Cookie `httpOnly: true`
- [ ] Cookie `sameSite: "lax"`
- [ ] Cookie `secure: true` in production
- [ ] `credentials: "include"` on client
- [ ] Rate limiting enabled

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Login redirect loop | Using router.push() | Use `window.location.href` |
| Session lost | Missing credentials | Add `credentials: "include"` |
| Role not found | Checking session.user.role | Query database for role |
| Password not found | Looking in users table | Better Auth stores in `accounts.password` |

## Next Steps

- [Styling Setup](styling-setup.md) - Add UI components
