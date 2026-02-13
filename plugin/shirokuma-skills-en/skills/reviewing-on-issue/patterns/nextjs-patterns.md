# Next.js Patterns

## ISR Caching Strategy

Incremental Static Regeneration (ISR) revalidation times for different content types:

| Content Type | Revalidate | Reason |
|--------------|------------|--------|
| Homepage | 60s | Fresh content, high traffic |
| Post list | 60s | New posts need to appear quickly |
| Post detail | 300s | Individual posts rarely change |
| Static pages | 3600s | Very stable content (About, Terms, etc.) |

**Implementation Example:**
```typescript
// app/[locale]/(main)/page.tsx
export const revalidate = 60 // Homepage: 60 seconds

// app/[locale]/(main)/posts/[slug]/page.tsx
export const revalidate = 300 // Post detail: 5 minutes

// app/[locale]/(main)/about/page.tsx
export const revalidate = 3600 // Static pages: 1 hour
```

**Review Checklist:**
- [ ] Dynamic content pages use appropriate revalidate times
- [ ] Static pages have longer revalidate periods
- [ ] High-traffic pages balance freshness with performance
- [ ] Consider adding `dynamicParams` for better control

---

## useActionState Pattern (React 19)

React 19's `useActionState` replaces the experimental `useFormState` hook for handling server actions with form state.

**Correct Pattern:**
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

**Review Checklist:**
- [ ] Uses `useActionState` not deprecated `useFormState`
- [ ] Initial state matches FormState type
- [ ] Server action returns FormState type
- [ ] isPending used for loading states
- [ ] Error handling displays user-friendly messages
- [ ] Form fields disabled during submission

**Common Mistakes:**
```typescript
// ❌ Wrong: Using deprecated useFormState
import { useFormState } from "react-dom"

// ❌ Wrong: No initial state
const [state, formAction] = useActionState(serverAction)

// ❌ Wrong: Not using isPending
<Button disabled={false}>Submit</Button>

// ✅ Correct: Modern pattern with all features
const [state, formAction, isPending] = useActionState(
  serverAction,
  initialState
)
```

---

## Async Params (Next.js 16)

Next.js 16 makes `params` and `searchParams` async to improve performance and enable streaming.

**Before (Next.js 15):**
```typescript
export default function Page({ params }: { params: { slug: string } }) {
  const { slug } = params
  return <div>{slug}</div>
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return { title: params.slug }
}
```

**After (Next.js 16):**
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

**With SearchParams:**
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

**Review Checklist:**
- [ ] params typed as Promise
- [ ] params/searchParams awaited before use
- [ ] All page components and generateMetadata updated
- [ ] Type safety maintained with Promise wrapper
- [ ] No synchronous access to params

---

## Loading State Accessibility

Loading states must be accessible to screen readers and assistive technologies.

**Best Practice Pattern:**
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

**Component Example:**
```typescript
export function PostList({ isLoading }: { isLoading: boolean }) {
  if (isLoading) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading posts"
      >
        <PostSkeleton />
        <span className="sr-only">Loading posts...</span>
      </div>
    )
  }

  return <div role="list" aria-label="Blog posts">{/* ... */}</div>
}
```

**Review Checklist:**
- [ ] Loading components have `role="status"`
- [ ] `aria-busy="true"` indicates loading state
- [ ] `aria-label` describes what's loading
- [ ] `.sr-only` text provides context for screen readers
- [ ] Loading states don't block interaction unnecessarily

**Accessibility Attributes:**
- `role="status"`: Announces loading to screen readers
- `aria-busy="true"`: Indicates element is loading
- `aria-label`: Describes what content is loading
- `aria-live="polite"`: For dynamic updates (optional)

---

## Parallel Query Pattern

Fetch multiple independent data sources concurrently using `Promise.all` to reduce page load time.

**Optimal Pattern:**
```typescript
// ✅ Good: Parallel queries
export default async function Page() {
  const [posts, categories, tags] = await Promise.all([
    getPosts(),
    getCategories(),
    getTags(),
  ])

  return <Dashboard posts={posts} categories={categories} tags={tags} />
}
```

**Anti-Pattern:**
```typescript
// ❌ Bad: Sequential queries (slow)
export default async function Page() {
  const posts = await getPosts()
  const categories = await getCategories()
  const tags = await getTags()

  return <Dashboard posts={posts} categories={categories} tags={tags} />
}
```

**With Error Handling:**
```typescript
export default async function Page() {
  try {
    const [posts, categories, tags] = await Promise.all([
      getPosts(),
      getCategories(),
      getTags(),
    ])

    return <Dashboard posts={posts} categories={categories} tags={tags} />
  } catch (error) {
    console.error("Failed to load dashboard data:", error)
    return <ErrorState />
  }
}
```

**Conditional Parallel Queries:**
```typescript
export default async function Page({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const [post, relatedPosts, comments] = await Promise.all([
    getPostBySlug(slug),
    getRelatedPosts(slug),
    getComments(slug),
  ])

  if (!post) {
    notFound()
  }

  return <PostDetail post={post} related={relatedPosts} comments={comments} />
}
```

**Review Checklist:**
- [ ] Independent queries use Promise.all
- [ ] No unnecessary sequential awaits
- [ ] Error handling covers all queries
- [ ] Dependent queries properly sequenced
- [ ] Consider Promise.allSettled for optional data

**Performance Impact:**
```typescript
// Sequential: 300ms + 200ms + 150ms = 650ms total
// Parallel: max(300ms, 200ms, 150ms) = 300ms total
```

---

## Search Page SEO

Search, filter, and pagination pages should not be indexed to avoid duplicate content penalties.

**Correct Pattern:**
```typescript
// app/[locale]/(main)/search/page.tsx
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Search",
  robots: {
    index: false,    // Don't index search results
    follow: true,    // But follow links on the page
  },
}

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q = "" } = await searchParams
  // ...
}
```

**Dynamic Metadata:**
```typescript
// For pages with query parameters
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}): Promise<Metadata> {
  const { q = "", page = "1" } = await searchParams

  // Prevent indexing of paginated or filtered pages
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

**Review Checklist:**
- [ ] Search pages have `index: false`
- [ ] Pagination pages (page > 1) not indexed
- [ ] Filter/sort pages not indexed
- [ ] Main category/tag pages ARE indexed
- [ ] `follow: true` to pass link equity
- [ ] Canonical URLs set for paginated content

**Robots Configuration:**
```typescript
// Search results
robots: { index: false, follow: true }

// Paginated pages
robots: { index: false, follow: true }

// Filtered pages (?category=x&sort=y)
robots: { index: false, follow: true }

// Main listing page (no params)
robots: { index: true, follow: true }
```

**Canonical URL Pattern:**
```typescript
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}): Promise<Metadata> {
  const { page } = await searchParams

  return {
    robots: page && page !== "1"
      ? { index: false, follow: true }
      : { index: true, follow: true },
    alternates: {
      canonical: "/posts", // Always point to page 1
    },
  }
}
```

---

## Additional Next.js 16 Patterns

### Server Component Data Fetching
```typescript
// ✅ Good: Direct database queries in Server Components
export default async function Page() {
  const posts = await db.query.posts.findMany({
    where: eq(posts.published, true),
    orderBy: [desc(posts.publishedAt)],
  })

  return <PostList posts={posts} />
}
```

### Dynamic Segments
```typescript
// Generate static paths at build time
export async function generateStaticParams() {
  const posts = await getPosts()

  return posts.map((post) => ({
    slug: post.slug,
  }))
}

// Control what happens for unknown paths
export const dynamicParams = true // 404 for unknown paths
```

### Streaming with Suspense
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

## Radix UI Hydration Pattern

Radix UI components (DropdownMenu, Select, Collapsible) generate dynamic IDs that differ between SSR and client, causing hydration errors.

**Solution: Mounted State Pattern**

```typescript
"use client"

import { useState, useEffect } from "react"

export function MyDropdownComponent() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // SSR: Placeholder without Radix UI
  if (!mounted) {
    return <Button disabled><Icon /></Button>
  }

  // Client: Full component with Radix UI
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

**Review Checklist:**
- [ ] Components using DropdownMenu/Select/Collapsible use mounted pattern
- [ ] Placeholder matches original component's visual appearance
- [ ] Placeholder is disabled to prevent interaction during SSR
- [ ] sr-only text preserved in placeholder for accessibility

**Affected Components:**
- Theme toggle (ModeToggle)
- Language switcher (LocaleSwitcher)
- User menu (NavUser, NavGuest)
- Any component with shadcn/ui dropdown

---

## Content Security Policy (CSP)

### Production CSP Requirements

Next.js apps with Monaco Editor or Radix UI need specific CSP exceptions:

```typescript
// Production CSP
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'nonce-${nonce}' 'strict-dynamic'",
  "style-src 'self' 'unsafe-inline'",  // Required for Radix UI/Monaco
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

**Why `style-src 'unsafe-inline'`:**
- Monaco Editor generates inline styles dynamically
- Radix UI injects positioning/animation styles at runtime
- These cannot use nonces because they're created after page load

**Why `worker-src 'self' blob:`:**
- Monaco Editor creates Web Workers from blob URLs
- Workers handle syntax highlighting, code completion, language services

**Review Checklist:**
- [ ] Production CSP uses nonce for script-src
- [ ] style-src includes 'unsafe-inline' if using Monaco/Radix UI
- [ ] worker-src includes 'blob:' if using Monaco Editor
- [ ] No 'unsafe-eval' in production (except for specific requirements)
- [ ] CSP tests updated when configuration changes

**Common Symptoms:**
| Error | Missing CSP Directive |
|-------|----------------------|
| "style-src ... violated" | `'unsafe-inline'` in style-src |
| "worker ... blob: violated" | `blob:` in worker-src |
| Monaco no syntax colors | Both above missing |

---

## Review Priorities

When reviewing Next.js code, check in this order:

1. **Performance**: ISR timing, parallel queries, streaming
2. **Compatibility**: Async params, useActionState usage
3. **Accessibility**: Loading states, ARIA attributes
4. **SEO**: Robots meta, canonical URLs, structured data
5. **Type Safety**: Promise types, FormState types
6. **Error Handling**: Try/catch, error boundaries, fallbacks
7. **Hydration**: Mounted pattern for Radix UI components
8. **CSP**: Correct directives for production security
