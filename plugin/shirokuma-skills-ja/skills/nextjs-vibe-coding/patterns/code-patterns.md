# コードパターン

## Action の整理（ディレクトリベース）

Server Actions は性質に応じてディレクトリで整理する：

```
lib/actions/
├── crud/                    # テーブル駆動の CRUD（DBテーブルと1:1）
│   ├── organizations.ts     # organizations テーブルの CRUD
│   ├── projects.ts          # projects テーブルの CRUD
│   ├── sessions.ts          # work_sessions テーブルの CRUD
│   ├── entities.ts          # entities テーブルの CRUD
│   └── members.ts           # team_members テーブルの CRUD
│
├── domain/                  # ドメイン駆動の複合アクション
│   ├── dashboard.ts         # 複数テーブルからの集計
│   ├── contexts.ts          # ユーザーコンテキスト管理（横断的）
│   ├── publishing.ts        # 投稿公開ワークフロー
│   ├── moderation.ts        # コンテンツモデレーション
│   └── onboarding.ts        # ユーザーオンボーディング
│
└── types.ts                 # 共通型（ActionResult 等）
```

### CRUD Actions (`crud/`)

**特徴**:
- DBテーブルと1:1マッピング
- 標準CRUD操作: `get`, `list`, `create`, `update`, `delete`
- 単一テーブルが対象（読み取りではJOIN可、書き込みは1テーブル）
- 命名規則: `get{Entity}`, `create{Entity}` 等

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

**特徴**:
- ビジネス機能を中心に設計
- 複数テーブルにまたがる操作
- 複雑なワークフローや集計
- テーブル名ではなくビジネス操作で命名

```typescript
// lib/actions/domain/dashboard.ts
/**
 * @serverAction
 * @feature DashboardManagement
 * @dbTables projects, sessions, entities, activities
 */

export async function getDashboardStats(orgId: string) {
  // 集計元: projects, sessions, entities, activities
}

export async function getRecentActivity(orgId: string, limit: number) {
  // JOIN: activities, users, projects
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
  // 1. 投稿が公開可能か検証
  // 2. ステータス更新
  // 3. アクティビティログ作成
  // 4. キャッシュ無効化
  // 5. 通知送信
}

export async function schedulePost(postId: string, publishAt: Date) { /* ... */ }
export async function unpublishPost(postId: string) { /* ... */ }
```

### 判断基準

| 質問 | CRUD | Domain |
|------|------|--------|
| 単一テーブルの操作？ | ✅ | ❌ |
| 標準的な get/create/update/delete？ | ✅ | ❌ |
| ステップのあるビジネスワークフロー？ | ❌ | ✅ |
| 複数テーブルからの集計？ | ❌ | ✅ |
| テーブル名で命名？ | ✅ | ❌ |
| ビジネス操作名で命名？ | ❌ | ✅ |

### Import パターン

```typescript
// コンポーネント/ページからの import
import { getProjects, createProject } from "@/lib/actions/crud/projects"
import { getDashboardStats } from "@/lib/actions/domain/dashboard"

// 便宜上の re-export（任意）
// lib/actions/index.ts
export * from "./crud/projects"
export * from "./crud/organizations"
export * from "./domain/dashboard"
```

---

## Next.js 16: 非同期 Params

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

## ActionResult とエラーコード

エラーコードを常に含め、プログラムによるハンドリングを可能にする：

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

## 二関数認証パターン

読み取りとミューテーションで関数を使い分ける：

```typescript
// lib/auth-utils.ts

// 読み取り操作用（CSRF不要）
export async function verifyAdmin(): Promise<string> {
  const session = await verifyAdminAuth(await headers())
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

// ミューテーション用（CSRF + 認証）
export async function verifyAdminMutation(): Promise<string> {
  await validateCsrfToken()  // Step 1: CSRF
  return await verifyAdmin() // Step 2: Auth
}
```

**使い分け:**
- 読み取り操作: `verifyAdmin()`
- ミューテーション (create/update/delete): `verifyAdminMutation()`

## Server Action パターン（ミューテーション）

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
  // Step 1: 認証 + CSRF（verifyAdminMutation で両方実行）
  const userId = await verifyAdminMutation()

  // Step 2: バリデーション
  const validated = Schema.safeParse({ name: formData.get("name") })
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message, code: "VALIDATION_FAILED" }
  }

  // Step 3: ビジネスロジック（重複チェック等）
  const existing = await db.select().from(features).where(eq(features.name, validated.data.name)).limit(1)
  if (existing.length > 0) {
    return { success: false, error: "Name already exists", code: "DUPLICATE" }
  }

  // Step 4: DB操作 + キャッシュ無効化 + リダイレクト
  await db.insert(features).values({ ...validated.data, authorId: userId })
  revalidatePath("/features")
  redirect("/features")
}
```

## オーナーシップチェックパターン

リソースのミューテーション前にユーザーの所有権を確認する：

```typescript
export async function updateFeature(id: string, formData: FormData): Promise<ActionResult | void> {
  const userId = await verifyAdminMutation()

  // オーナーシップチェック
  const existing = await db.select().from(features).where(eq(features.id, id)).limit(1)
  if (existing.length === 0) {
    return { success: false, error: "Not found", code: "NOT_FOUND" }
  }
  if (existing[0].authorId !== userId) {
    return { success: false, error: "Not authorized", code: "FORBIDDEN" }
  }

  // 更新処理を続行...
}
```

## レート制限パターン

認証の後、ビジネスロジックの前にレート制限を追加する：

```typescript
export async function deleteFeature(id: string): Promise<ActionResult> {
  const userId = await verifyAdminMutation()

  // レート制限チェック
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

  // 削除処理を続行...
}
```

## トランザクションパターン

関連データ操作にはトランザクションを使用する：

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

## オープンリダイレクト防止

コールバック URL を検証してオープンリダイレクトを防ぐ：

```typescript
function isInternalUrl(url: string | undefined): boolean {
  if (!url) return false
  return url.startsWith("/") && !url.startsWith("//")
}

// ログインフォームでの使用
const safeCallbackUrl = isInternalUrl(callbackUrl) ? callbackUrl! : "/"
window.location.href = safeCallbackUrl
```

## Server Component と i18n

```typescript
import { getTranslations, setRequestLocale } from "next-intl/server"

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)  // 静的レンダリングに必須

  const t = await getTranslations("namespace")
  return <h1>{t("title")}</h1>
}
```

## Client Component とフォーム

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
