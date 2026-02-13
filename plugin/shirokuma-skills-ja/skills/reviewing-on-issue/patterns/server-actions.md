# Server Action パターン

関連: [security.md](../criteria/security.md) (A01, A05, A08), [testing.md](../criteria/testing.md), [code-quality.md](../criteria/code-quality.md)

> **用語**: React 19 以降、Server Function のうち `action` prop に渡されるか action 内から呼ばれるものだけを「Server Action」と呼ぶ。全ての Server Function が Server Action ではない。

## 基本パターン

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
  // 1. 認証
  const session = await verifyAdmin(await headers())
  if (!session) return { success: false, error: "Unauthorized" }

  // 2. CSRF 保護（CSP nonce 経由）
  const headersList = await headers()
  const nonce = headersList.get("x-nonce")
  if (!nonce) {
    return { success: false, error: "Invalid request" }
  }

  // 3. バリデーション
  const validated = Schema.safeParse({ name: formData.get("name") })
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message }
  }

  // 4. 操作
  try {
    const [result] = await db
      .insert(features)
      .values(validated.data)
      .returning({ id: features.id })

    // 5. 再検証
    revalidatePath("/features")

    return { success: true, data: { id: result.id } }
  } catch (error) {
    console.error("Failed:", error)
    return { success: false, error: "Operation failed" }
  }
}
```

## 要件チェックリスト

- [ ] ファイル先頭に `"use server"`
- [ ] 冒頭で認証チェック
- [ ] CSRF 保護（CSP nonce 検証）
- [ ] Zod によるバリデーション
- [ ] ミューテーション前の所有権検証
- [ ] try/catch によるエラーハンドリング
- [ ] `revalidatePath` または `revalidateTag` を使用
- [ ] 構造化レスポンスを返す
- [ ] 内部エラー詳細を露出しない

## クライアントフォームパターン

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
        window.location.href = "/features"  // フルページリロード
      }
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p className="text-red-500">{error}</p>}
      {/* フォームフィールド */}
      <button disabled={isPending}>
        {isPending ? t("submitting") : t("submit")}
      </button>
    </form>
  )
}
```

## useActionState パターン（React 19）

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

## 認可パターン

### 所有権チェック

```typescript
export async function deletePost(id: string): Promise<ActionResult> {
  const session = await verifyAdmin(await headers())
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" }
  }

  // 所有権の検証
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

### ロールチェック

```typescript
export async function updateUserRole(userId: string, newRole: string): Promise<ActionResult> {
  const session = await verifyAdmin(await headers())

  // スーパー管理者のみロール変更可能
  if (session?.user?.role !== "super_admin") {
    return { success: false, error: "Forbidden" }
  }

  await db.update(users).set({ role: newRole }).where(eq(users.id, userId))
  revalidatePath("/admin/users")
  return { success: true }
}
```

## テストパターン（キューベースモック）

```typescript
jest.mock("@repo/database", () => {
  const queryResults: any[] = []  // FIFO キュー

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

// テストでの使用
const dbModule = require("@repo/database") as any
const queryResults = dbModule.__queryResults__ as any[]
const queueQueryResult = (...results: any[]) => results.forEach(r => queryResults.push(r))

it("handles paginated query", async () => {
  queueQueryResult([{ count: 10 }], [{ id: "1", title: "Post" }])
  const result = await getPaginatedPosts(1, 10)
  expect(result.data).toHaveLength(1)
})
```

## CSP Nonce パターン

### Middleware セットアップ

```typescript
// apps/admin/middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { randomBytes } from "crypto"

export function middleware(request: NextRequest) {
  const nonce = randomBytes(32).toString("base64")

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })

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

### Layout 統合

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

## タイミング攻撃の防止

### 定時間操作

```typescript
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

    await waitForMinimumDuration(startTime, 500)
    return { success: true }
  } catch (error) {
    await waitForMinimumDuration(startTime, 500)
    throw error
  }
}
```

### 効果

1. **ユーザー列挙防止**: ユーザー存在有無に関わらず同じタイミング
2. **パスワード強度推測防止**: レスポンス時間からパスワード強度を推測不可
3. **DB クエリタイミング隠蔽**: クエリ実行時間のばらつきを隠す

## アンチパターン

### 認証の欠落

```typescript
// Bad: 認証チェックなし
export async function deletePost(id: string) {
  await db.delete(posts).where(eq(posts.id, id))  // 誰でも削除可能!
}
```

### 内部エラーの露出

```typescript
// Bad: DB エラー詳細の漏洩
catch (error) {
  return { success: false, error: error.message }
}

// Good: 汎用エラーメッセージ
catch (error) {
  console.error("Failed:", error)  // 内部ログ
  return { success: false, error: "Operation failed" }  // ユーザーには汎用メッセージ
}
```

### バリデーションの欠落

```typescript
// Bad: フォームデータの直接使用
export async function createPost(formData: FormData) {
  const title = formData.get("title") as string
  await db.insert(posts).values({ title })  // バリデーションなし!
}
```

### タイミング攻撃に脆弱

```typescript
// Bad: 早期リターンでユーザー存在が判明
export async function signIn(email: string, password: string) {
  const user = await findUserByEmail(email)
  if (!user) {
    return { error: "Invalid credentials" }  // 高速リターン = ユーザー不存在
  }

  const valid = await verifyPassword(user, password)  // 低速操作
  if (!valid) {
    return { error: "Invalid credentials" }  // 低速リターン = ユーザー存在
  }

  return { success: true }
}

// Good: 定時間レスポンス
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

## セキュリティ警告: React2Shell (CVE-2025-66478)

RSC プロトコルの安全でないデシリアライゼーションにより、Server Functions を通じた未認証 RCE が可能（CVSS 10.0）。Next.js 15.x / 16.x (App Router) が影響。

**必須対応**: パッチバージョンへの即座のアップグレード。ワークアラウンドなし。
詳細は [security.md](../criteria/security.md) の「重大な CVE」セクション参照。
