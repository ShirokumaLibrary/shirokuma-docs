# Next.js パターン

## ISR キャッシュ戦略

コンテンツタイプ別の ISR revalidation 時間:

| コンテンツ種別 | Revalidate | 理由 |
|--------------|------------|------|
| ホームページ | 60秒 | 新鮮さ重視、高トラフィック |
| 投稿一覧 | 60秒 | 新しい投稿を早く表示 |
| 投稿詳細 | 300秒 | 個別投稿は変更頻度が低い |
| 静的ページ | 3600秒 | 非常に安定（About、Terms 等） |

```typescript
// app/[locale]/(main)/page.tsx
export const revalidate = 60 // ホームページ: 60秒

// app/[locale]/(main)/posts/[slug]/page.tsx
export const revalidate = 300 // 投稿詳細: 5分

// app/[locale]/(main)/about/page.tsx
export const revalidate = 3600 // 静的ページ: 1時間
```

**レビューチェックリスト:**
- [ ] 動的コンテンツページに適切な revalidate 時間
- [ ] 静的ページはより長い revalidate 期間
- [ ] 高トラフィックページは新鮮さとパフォーマンスのバランス
- [ ] `dynamicParams` の追加を検討

---

## useActionState パターン（React 19）

```typescript
"use client"
import { useActionState } from "react"
import type { FormState } from "@/lib/actions/types"

const initialState: FormState = {
  success: false,
  error: null,
  data: null,
}

export function MyForm() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: FormState, formData: FormData) => {
      return await serverAction(formData)
    },
    initialState
  )

  return (
    <form action={formAction}>
      {state.error && <ErrorMessage>{state.error}</ErrorMessage>}
      <SubmitButton disabled={isPending}>
        {isPending ? "Submitting..." : "Submit"}
      </SubmitButton>
    </form>
  )
}
```

**レビューチェックリスト:**
- [ ] 非推奨の `useFormState` ではなく `useActionState` を使用
- [ ] 初期状態が FormState 型に一致
- [ ] Server Action が FormState 型を返す
- [ ] isPending でローディング状態を表示
- [ ] エラーハンドリングがユーザーフレンドリーなメッセージを表示
- [ ] 送信中にフォームフィールドを無効化

**よくある間違い:**
```typescript
// Bad: 非推奨の useFormState
import { useFormState } from "react-dom"

// Bad: 初期状態なし
const [state, formAction] = useActionState(serverAction)

// Bad: isPending 未使用
<Button disabled={false}>Submit</Button>

// Good: モダンパターン
const [state, formAction, isPending] = useActionState(
  serverAction,
  initialState
)
```

---

## 非同期 Params（Next.js 16）

Next.js 16 では `params` と `searchParams` が非同期に。

**Before（Next.js 15）:**
```typescript
export default function Page({ params }: { params: { slug: string } }) {
  const { slug } = params
  return <div>{slug}</div>
}
```

**After（Next.js 16）:**
```typescript
export default async function Page({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <div>{slug}</div>
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return { title: slug }
}
```

**SearchParams 付き:**
```typescript
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug } = await params
  const { page = "1" } = await searchParams

  return <div>Post: {slug}, Page: {page}</div>
}
```

**レビューチェックリスト:**
- [ ] params を Promise として型定義
- [ ] params/searchParams を使用前に await
- [ ] すべてのページコンポーネントと generateMetadata を更新
- [ ] Promise ラッパーで型安全性を維持
- [ ] params への同期アクセスなし

---

## ローディング状態のアクセシビリティ

```typescript
export default function Loading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading posts"
      className="space-y-4"
    >
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <span className="sr-only">Loading content, please wait...</span>
    </div>
  )
}
```

**レビューチェックリスト:**
- [ ] ローディングコンポーネントに `role="status"`
- [ ] `aria-busy="true"` でローディング状態を示す
- [ ] `aria-label` で何がローディング中か説明
- [ ] `.sr-only` テキストでスクリーンリーダー向けコンテキスト
- [ ] ローディング状態がインタラクションを不必要にブロックしない

---

## 並列クエリパターン

独立したデータソースは `Promise.all` で並行フェッチ:

```typescript
// Good: 並列クエリ
export default async function Page() {
  const [posts, categories, tags] = await Promise.all([
    getPosts(),
    getCategories(),
    getTags(),
  ])

  return <Dashboard posts={posts} categories={categories} tags={tags} />
}

// Bad: 逐次クエリ（低速）
export default async function Page() {
  const posts = await getPosts()
  const categories = await getCategories()
  const tags = await getTags()
}
```

**パフォーマンス効果:**
```typescript
// 逐次: 300ms + 200ms + 150ms = 650ms
// 並列: max(300ms, 200ms, 150ms) = 300ms
```

**レビューチェックリスト:**
- [ ] 独立クエリに Promise.all 使用
- [ ] 不要な逐次 await なし
- [ ] エラーハンドリングが全クエリをカバー
- [ ] 依存クエリは適切に順序化
- [ ] オプショナルデータには Promise.allSettled を検討

---

## 検索ページの SEO

検索・フィルター・ページネーションページは重複コンテンツペナルティ回避のためインデックスしない:

```typescript
// app/[locale]/(main)/search/page.tsx
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Search",
  robots: {
    index: false,    // 検索結果をインデックスしない
    follow: true,    // ページ上のリンクはフォロー
  },
}
```

**動的メタデータ:**
```typescript
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}): Promise<Metadata> {
  const { q = "", page = "1" } = await searchParams

  if (page !== "1" || q) {
    return {
      robots: { index: false, follow: true },
    }
  }

  return {
    title: "All Posts",
    robots: { index: true, follow: true },
  }
}
```

**レビューチェックリスト:**
- [ ] 検索ページに `index: false`
- [ ] ページネーションページ（page > 1）はインデックスしない
- [ ] フィルター/ソートページはインデックスしない
- [ ] メインのカテゴリ/タグページはインデックスする
- [ ] `follow: true` でリンクエクイティを渡す
- [ ] ページネーションコンテンツに正規 URL を設定

---

## その他の Next.js 16 パターン

### Server Component のデータフェッチ
```typescript
export default async function Page() {
  const posts = await db.query.posts.findMany({
    where: eq(posts.published, true),
    orderBy: [desc(posts.publishedAt)],
  })

  return <PostList posts={posts} />
}
```

### 動的セグメント
```typescript
export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((post) => ({ slug: post.slug }))
}

export const dynamicParams = true // 不明なパスで 404
```

### Suspense によるストリーミング
```typescript
export default function Page() {
  return (
    <div>
      <Header />
      <Suspense fallback={<PostsSkeleton />}>
        <Posts />
      </Suspense>
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments />
      </Suspense>
    </div>
  )
}
```

---

## Radix UI ハイドレーションパターン

Radix UI コンポーネント（DropdownMenu, Select, Collapsible）は SSR とクライアントで異なる動的 ID を生成し、ハイドレーションエラーを引き起こす。

**解決策: mounted ステートパターン**

```typescript
"use client"

import { useState, useEffect } from "react"

export function MyDropdownComponent() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // SSR: Radix UI なしのプレースホルダー
  if (!mounted) {
    return <Button disabled><Icon /></Button>
  }

  // Client: Radix UI 付きの完全なコンポーネント
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button><Icon /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {/* ... */}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

**レビューチェックリスト:**
- [ ] DropdownMenu/Select/Collapsible を使うコンポーネントで mounted パターン使用
- [ ] プレースホルダーが元のコンポーネントの見た目と一致
- [ ] プレースホルダーが disabled で SSR 中のインタラクション防止
- [ ] アクセシビリティのために sr-only テキストを保持

**影響を受けるコンポーネント:**
- テーマ切替（ModeToggle）
- 言語切替（LocaleSwitcher）
- ユーザーメニュー（NavUser, NavGuest）
- shadcn/ui ドロップダウン付きコンポーネント全般

---

## Content Security Policy（CSP）

### 本番 CSP 要件

Monaco Editor や Radix UI を使用する Next.js アプリには特定の CSP 例外が必要:

```typescript
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'nonce-${nonce}' 'strict-dynamic'",
  "style-src 'self' 'unsafe-inline'",  // Radix UI/Monaco に必須
  "worker-src 'self' blob:",           // Monaco Editor workers
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
]
```

**`style-src 'unsafe-inline'` が必要な理由:**
- Monaco Editor がインラインスタイルを動的に生成
- Radix UI がランタイムで位置/アニメーションスタイルを注入
- ページロード後に作成されるため nonce は使用不可

**`worker-src 'self' blob:` が必要な理由:**
- Monaco Editor が blob URL から Web Workers を作成
- Workers がシンタックスハイライト、コード補完、言語サービスを処理

**レビューチェックリスト:**
- [ ] 本番 CSP で script-src に nonce 使用
- [ ] Monaco/Radix UI 使用時に style-src に `'unsafe-inline'` 含む
- [ ] Monaco Editor 使用時に worker-src に `blob:` 含む
- [ ] 本番で `'unsafe-eval'` なし（特定要件を除く）
- [ ] CSP 設定変更時にテストを更新

**よくある症状:**
| エラー | 不足している CSP ディレクティブ |
|-------|-------------------------------|
| "style-src ... violated" | style-src に `'unsafe-inline'` |
| "worker ... blob: violated" | worker-src に `blob:` |
| Monaco のシンタックスカラーなし | 上記両方が不足 |

---

## レビュー優先順位

Next.js コードレビュー時のチェック順序:

1. **パフォーマンス**: ISR タイミング、並列クエリ、ストリーミング
2. **互換性**: 非同期 params、useActionState の使用
3. **アクセシビリティ**: ローディング状態、ARIA 属性
4. **SEO**: robots メタ、正規 URL、構造化データ
5. **型安全性**: Promise 型、FormState 型
6. **エラーハンドリング**: try/catch、エラーバウンダリ、フォールバック
7. **ハイドレーション**: Radix UI コンポーネントの mounted パターン
8. **CSP**: 本番セキュリティの正しいディレクティブ
