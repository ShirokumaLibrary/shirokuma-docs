# Better Auth パターン

関連: [security.md](../criteria/security.md) (A01, A07), [e2e-testing.md](e2e-testing.md)

## 設定

### サーバーサイド認証設定

```typescript
// lib/auth.ts
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import bcrypt from "bcryptjs"

const BCRYPT_ROUNDS = 12  // セキュリティ上最低12

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
    expiresIn: 60 * 60 * 24 * 30,  // 30日
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
    window: 15 * 60,  // 15分
    max: process.env.NODE_ENV === "production" ? 5 : 1000,  // dev/test は緩和
  },
})
```

### クライアントサイド認証設定

```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  fetchOptions: { credentials: "include" },  // Cookie に必須!
})

export const { signIn, signUp, signOut, useSession } = authClient
```

## ロールベースアクセス

Better Auth はセッションにカスタムフィールドを含めない。ロールは DB から取得:

```typescript
export async function verifyAdmin(headers: Headers) {
  const session = await auth.api.getSession({ headers })
  if (!session) return null

  // DB からロールを取得
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))

  if (user?.role !== "admin") return null
  return { user: { ...session.user, role: user.role } }
}
```

### 管理者ロールチェックエンドポイント

クライアントサイドの管理者検証用:

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

## v1.4 破壊的変更

| 変更 | Before | After |
|------|--------|-------|
| パスワードリセット | `authClient.forgotPassword()` | `authClient.requestPasswordReset()` |
| メール変更フロー | `sendChangeEmailVerification` コールバック | `emailVerification.sendVerificationEmail` を使用 |
| アカウント情報 | `POST /account-info` (body) | `GET /account-info` (query) |
| Passkey プラグイン | `better-auth` 内蔵 | `@better-auth/passkey` パッケージに分離 |
| API Key モックセッション | デフォルト有効 | デフォルト無効（明示的に有効化が必要） |
| generateId | `advanced.generateId` | 削除。`advanced.database.generateId: "serial"` を使用 |

プラグインコールバックの `request` 引数が `ctx` に変更:
- Email OTP: `sendVerificationOTP`, `generateOTP`
- Magic Link: `sendMagicLink`
- Phone Number: `sendOTP`, `sendPasswordResetOTP`
- Organization: `customCreateDefaultTeam`, `maximumTeams`

## 共通パターン

### ログイン後リダイレクト

`router.push()` ではなく `window.location.href` を使用:

```typescript
// 間違い: Cookie が正しく送信されない可能性
router.push("/dashboard")

// 正しい: フルページリロードで Cookie 送信を保証
window.location.href = "/dashboard"
```

### クライアントコンポーネントでのセッション

```typescript
"use client"
import { authClient } from "@/lib/auth-client"

export function UserNav() {
  const { data: session } = authClient.useSession()

  const handleLogout = () => {
    authClient.signOut()
    window.location.href = "/login"  // router.push() ではなく location を使用
  }

  return session ? <UserDropdown user={session.user} /> : <LoginButton />
}
```

### マルチステップ認証フロー（管理者）

管理者ログインのロール検証には複数の API 呼び出しが必要:

1. `signIn` - 資格情報の認証
2. `get-session` - セッションデータ取得
3. `check-admin` - 管理者ロール検証

このフローは E2E テストで長めのタイムアウト（約15秒）が必要。

## DB スキーマ注意点

- パスワードは `accounts` テーブルに格納（`users` テーブルではない）
- セッションは `sessions` テーブルに格納
- 検証トークンは `verifications` テーブルに格納
- ユーザーカスタムフィールド (role, emailVerified) は `users` テーブル

## セキュリティチェックリスト

- [ ] `BETTER_AUTH_SECRET` >= 32文字
- [ ] bcrypt ラウンド数 >= 12
- [ ] Cookie `httpOnly: true`
- [ ] Cookie `sameSite: "lax"`
- [ ] 本番で Cookie `secure: true`
- [ ] クライアントで `credentials: "include"`
- [ ] レート制限有効化
