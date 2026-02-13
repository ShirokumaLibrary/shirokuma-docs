# コード品質パターン

Next.js TDD Blog CMS プロジェクトのコード品質パターンとベストプラクティス。

## フォームデータパースパターン

手動パースの代わりに `parseFormData` ユーティリティを使用:

```typescript
// GOOD: parseFormData ユーティリティを使用
import { parseFormData } from "@/lib/utils/form"

const data = parseFormData(formData, schema)

// BAD: 手動パース
const data = Object.fromEntries(formData) as unknown as T
```

## トランザクションエラーハンドリング

DB トランザクションは必ず try-catch で囲む:

```typescript
// GOOD: 適切なエラーハンドリング
try {
  await db.transaction(async (tx) => {
    await tx.insert(table).values(data)
  })
} catch (error) {
  return { success: false, error: "database_error" }
}

// BAD: エラーハンドリングなし
await db.transaction(async (tx) => {
  await tx.insert(table).values(data)
})
```

## 型の整理

### 共有パッケージ (`@repo/shared`)
- 2つ以上のアプリで使用される型
- 共通ドメインモデル

```typescript
// packages/shared/src/types/index.ts
export interface User {
  id: string
  email: string
  name: string
}
```

### アプリ固有型
- 単一アプリ内で使用される型
- `lib/actions/types.ts` に配置

```typescript
// apps/admin/lib/actions/types.ts
export interface CategoryFormState {
  success: boolean
  error?: string
}
```

**基準**: 2つ以上のアプリで使用 → `@repo/shared`、1つのアプリのみ → アプリの `lib/actions/types.ts`

## 日付の取り扱い

### DB 格納
```typescript
// GOOD: DB insert/update には Date オブジェクト
{
  createdAt: new Date(),
  updatedAt: new Date()
}
```

### API レスポンス
```typescript
// GOOD: API レスポンスには ISO 文字列
{
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}
```

## useActionState パターン (React 19)

```typescript
// GOOD: モダンな React 19 パターン
import { useActionState } from "react"

const [state, formAction, isPending] = useActionState(
  serverAction,
  initialState
)

<form action={formAction}>
  {/* form fields */}
  <button disabled={isPending}>Submit</button>
</form>

// BAD: 古い useTransition パターン
import { useTransition } from "react"

const [isPending, startTransition] = useTransition()

const handleSubmit = (formData: FormData) => {
  startTransition(async () => {
    await serverAction(formData)
  })
}
```

---

## よくあるアンチパターン

### N+1 クエリ

```typescript
// BAD: N+1 クエリ
for (const category of categories) {
  const posts = await getPostsByCategory(category.id)
}

// GOOD: バッチクエリ
const allPosts = await db.select().from(posts).where(inArray(posts.categoryId, categoryIds))
```

### エラーハンドリング不足

```typescript
// BAD
export async function create(formData: FormData) {
  return await db.insert(features).values({...})
}

// GOOD
export async function create(formData: FormData): Promise<ActionResult> {
  try {
    const result = await db.insert(features).values({...})
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: "Operation failed" }
  }
}
```

### ハードコード文字列（i18n 違反）

```typescript
// BAD
<button>Save</button>

// GOOD
const t = useTranslations("common")
<button>{t("save")}</button>
```

### 逐次クエリ（並列にすべき）

```typescript
// BAD
const posts = await getPosts()
const categories = await getCategories()
const tags = await getTags()

// GOOD
const [posts, categories, tags] = await Promise.all([
  getPosts(),
  getCategories(),
  getTags(),
])
```

### setRequestLocale の欠落

```typescript
// BAD: 静的レンダリングが失敗
export default async function Page({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations("namespace")
  return <h1>{t("title")}</h1>
}

// GOOD: 静的レンダリングで動作
export default async function Page({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)  // 必須
  const t = await getTranslations("namespace")
  return <h1>{t("title")}</h1>
}
```

### ログイン後の Router Push

```typescript
// BAD: リダイレクトループの原因
const handleLogout = () => {
  authClient.signOut()
  router.push("/login")
}

// GOOD: フルページリロード
const handleLogout = () => {
  authClient.signOut()
  window.location.href = "/login"
}
```

### エスケープなしの ILIKE

```typescript
// BAD: SQL インジェクション脆弱性
const pattern = `%${userInput}%`
db.select().from(posts).where(ilike(posts.title, pattern))

// GOOD: 特殊文字のエスケープ
function escapeLikePattern(query: string): string {
  return query.replace(/[%_\\]/g, "\\$&")
}
const pattern = `%${escapeLikePattern(userInput)}%`
db.select().from(posts).where(ilike(posts.title, pattern))
```

---

## レビューチェックリスト

- [ ] フォームデータは `parseFormData` ユーティリティでパース
- [ ] DB トランザクションは try-catch で囲む
- [ ] 型が適切な場所（shared vs アプリ固有）にある
- [ ] 日付が正しい形式（DB には Date、API には ISO 文字列）
- [ ] フォームは `useTransition` ではなく `useActionState` を使用
- [ ] すべての Server Actions でエラーハンドリングが統一
- [ ] コード全体で型安全性が維持
- [ ] N+1 クエリなし（`inArray()` でバッチクエリ）
- [ ] ハードコード UI 文字列なし（i18n 使用）
- [ ] 独立クエリが並列（`Promise.all`）
- [ ] Server Components で `setRequestLocale()` を呼出
- [ ] 認証リダイレクトは `window.location.href` を使用
- [ ] ILIKE パターンが適切にエスケープ
