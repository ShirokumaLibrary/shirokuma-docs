# Coding Conventions Review Criteria

## Overview

This file defines coding conventions for Next.js 16 + React 19 + TypeScript projects.
Use this for code review to ensure consistency and maintainability.

## File Naming

### Required Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case | `post-form.tsx`, `user-nav.tsx` |
| Pages | kebab-case | `page.tsx`, `layout.tsx` |
| Utilities | kebab-case | `auth-client.ts`, `utils.ts` |
| Server Actions | kebab-case | `posts.ts`, `categories.ts` |
| Test Files | kebab-case + `.test` or `.spec` | `posts.test.ts`, `auth.spec.ts` |
| Hooks | `use-` prefix + kebab-case | `use-mobile.tsx`, `use-auth.ts` |

### Review Checklist

- [ ] Component files use kebab-case (NOT PascalCase)
- [ ] Hook files start with `use-`
- [ ] Test files end with `.test.ts` or `.spec.ts`
- [ ] No spaces or special characters in filenames

---

## Variable & Function Naming

### Required Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userName`, `postCount`, `isLoading` |
| Functions | camelCase (verb + noun) | `getUserById`, `createPost` |
| Components | PascalCase | `UserProfile`, `PostForm` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |
| Types/Interfaces | PascalCase | `UserData`, `PostInput` |
| Booleans | `is`/`has`/`can`/`should` prefix | `isLoading`, `hasPermission` |

### Review Checklist

- [ ] Variables use camelCase
- [ ] Functions use camelCase with verb prefix (get, create, update, delete, handle)
- [ ] React components use PascalCase
- [ ] Constants use UPPER_SNAKE_CASE
- [ ] Boolean variables have appropriate prefix

### Examples

```typescript
// Good
const userName = "John"
const isLoading = false
const MAX_RETRIES = 3
function getUserById(id: string) { }
function PostForm({ post }: PostFormProps) { }

// Bad
const user_name = "John"     // snake_case
const loading = false        // missing boolean prefix
const maxRetries = 3         // constant should be UPPER_SNAKE
function GetUserById() { }   // PascalCase for function
function postForm() { }      // camelCase for component
```

---

## Import Organization

### Required Order

Imports must be grouped in this order with blank lines between groups:

1. **React/Next.js** (framework)
2. **External packages** (npm)
3. **Internal packages** (monorepo @repo/*)
4. **Local absolute imports** (@/ alias)
5. **Relative imports** (./)

### Review Checklist

- [ ] Imports are grouped by category
- [ ] Blank lines separate import groups
- [ ] Type imports use `import type` when possible
- [ ] No unused imports

### Example

```typescript
// 1. Framework
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// 2. External packages
import { z } from "zod"
import { useTranslations } from "next-intl"

// 3. Internal packages
import { db, posts, eq } from "@repo/database"

// 4. Local absolute
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"

// 5. Relative
import { formatDate } from "./utils"
import type { PostFormProps } from "./types"
```

---

## TypeScript Conventions

### Required Practices

- [ ] No `any` types (use `unknown` instead)
- [ ] Explicit return types on exported functions
- [ ] Type guards for runtime type checking
- [ ] Unused variables prefixed with `_`
- [ ] `interface` for object shapes, `type` for unions/aliases

### Examples

```typescript
// Good: unknown instead of any
function parse(data: unknown): Item[] {
  if (!isValidData(data)) throw new Error("Invalid")
  return data.items
}

// Good: Type guard
function isValidData(data: unknown): data is { items: Item[] } {
  return typeof data === "object" && data !== null && "items" in data
}

// Good: Explicit return type
export async function getPosts(): Promise<Post[]> { }

// Good: Unused variable prefix
function handler(_req: Request, res: Response) { }

// Bad
function parse(data: any): any { }  // any type
export async function getPosts() { }  // missing return type
function handler(req: Request) { }    // unused without prefix
```

---

## Component Structure

### Required Order

1. Directive (`"use client"` or `"use server"`)
2. Imports (grouped as above)
3. Type definitions (if small)
4. Component function
   - Hooks first
   - Derived values
   - Event handlers
   - Return JSX

### Review Checklist

- [ ] Directive is first line (if needed)
- [ ] Imports follow grouping rules
- [ ] Hooks are at the top of component body
- [ ] Event handlers are defined before return
- [ ] Component is exported

### Example

```typescript
"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"

interface Props {
  title: string
}

export function MyComponent({ title }: Props) {
  // 1. Hooks
  const [value, setValue] = useState("")
  const t = useTranslations("namespace")

  // 2. Derived values
  const isValid = value.length > 0

  // 3. Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value)
  }

  // 4. Render
  return (
    <div>
      <h1>{title}</h1>
      <input value={value} onChange={handleChange} />
      <Button disabled={!isValid}>{t("submit")}</Button>
    </div>
  )
}
```

---

## Server Action Structure

### Required Order

1. `"use server"` directive
2. Imports
3. Validation schema (internal)
4. Return type definition
5. Exported functions with JSDoc

### Required Patterns

- [ ] Auth check first
- [ ] Input validation with Zod
- [ ] Try/catch for database operations
- [ ] Consistent return type (`ActionResult<T>`)
- [ ] `revalidatePath` after mutations
- [ ] JSDoc for public functions

### Example

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { db, posts } from "@repo/database"
import { z } from "zod"

const Schema = z.object({
  title: z.string().min(1).max(200),
})

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

/**
 * Create a new post
 * @param formData - Form data containing post fields
 * @returns ActionResult with post ID on success
 */
export async function createPost(formData: FormData): Promise<ActionResult<{ id: string }>> {
  // 1. Auth
  const session = await verifyAdmin(await headers())
  if (!session) return { success: false, error: "Unauthorized" }

  // 2. Validate
  const validated = Schema.safeParse({ title: formData.get("title") })
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message }
  }

  // 3. Database with try/catch
  try {
    const [result] = await db.insert(posts).values(validated.data).returning()
    revalidatePath("/posts")
    return { success: true, data: { id: result.id } }
  } catch (error) {
    console.error("Failed:", error)
    return { success: false, error: "Operation failed" }
  }
}
```

---

## Code Style

### Maximum Nesting

- [ ] Maximum 3 levels of nesting
- [ ] Use early returns to reduce nesting

```typescript
// Bad: 4+ levels
if (a) {
  if (b) {
    if (c) {
      if (d) { }  // Too deep
    }
  }
}

// Good: Early returns
if (!a) return
if (!b) return
if (!c) return
// Process d
```

### Function Length

- [ ] Functions should be < 50 lines
- [ ] Single responsibility principle
- [ ] Extract helper functions for complex logic

### Parameter Count

- [ ] Maximum 3 parameters
- [ ] Use object parameter for more

```typescript
// Bad
function create(name, email, role, dept, manager) { }

// Good
function create(params: CreateParams) { }
```

### Magic Numbers

- [ ] No hardcoded numbers without context
- [ ] Use named constants

```typescript
// Bad
if (password.length < 8) { }

// Good
const MIN_PASSWORD_LENGTH = 8
if (password.length < MIN_PASSWORD_LENGTH) { }
```

---

## ESLint + Prettier + Stylistic Configuration

### Active Rules

| Rule | Level | Description |
|------|-------|-------------|
| `@typescript-eslint/no-explicit-any` | warn | Discourage `any` type |
| `@typescript-eslint/no-unused-vars` | warn | Unused vars must have `_` prefix |
| `react-hooks/rules-of-hooks` | error | Hooks rules enforced |
| `react-hooks/exhaustive-deps` | warn | Dependency array checks |
| `@stylistic/object-curly-newline` | error | Type definitions must be multi-line |
| `no-console` | warn | No console.log (warn/error allowed) |

### Type Definition Formatting (REQUIRED)

Type literals and interfaces must always be multi-line:

```typescript
// Bad - single line
topActions: { action: string; count: number }[]

// Good - multi-line
topActions: {
  action: string
  count: number
}[]
```

ESLint Stylistic rule:
```javascript
"@stylistic/object-curly-newline": ["error", {
  TSTypeLiteral: "always",
  TSInterfaceBody: "always",
}]
```

### Formatting Commands

```bash
pnpm --filter {app} lint        # ESLint check
pnpm --filter {app} lint:fix    # ESLint auto-fix
pnpm --filter {app} format      # Prettier format
pnpm --filter {app} fix         # All-in-one fix (recommended)
```

### Review Against ESLint

- [ ] No `any` types (or justified with comment)
- [ ] All variables are used or prefixed with `_`
- [ ] React hooks follow rules of hooks
- [ ] **Type definitions are multi-line**
- [ ] Next.js Image/Link components used correctly

---

## Summary Checklist

### Quick Review

- [ ] File naming follows kebab-case convention
- [ ] Variables/functions use correct casing
- [ ] Imports are organized and grouped
- [ ] TypeScript types are explicit (no `any`)
- [ ] Components follow structure pattern
- [ ] Server Actions have auth, validation, error handling
- [ ] No deep nesting (max 3 levels)
- [ ] No magic numbers
- [ ] Functions are focused and short

### Common Issues

| Issue | Fix |
|-------|-----|
| PascalCase file name | Rename to kebab-case |
| `any` type | Replace with `unknown` + type guard |
| Unorganized imports | Group and add blank lines |
| Missing return type | Add explicit `Promise<T>` |
| Deep nesting | Use early returns |
| Magic numbers | Extract to constants |
| Long function | Split into smaller functions |

---

## lib/ Directory Structure

### Required Structure

```
lib/
├── actions/           # Server Actions
│   ├── crud/          # Single table CRUD
│   └── domain/        # Multi-table business logic
├── auth/              # Authentication
├── context/           # React Context
├── hooks/             # Custom hooks
├── utils/             # Utility functions
└── validations/       # Zod schemas
```

### Key Rules

1. **No files directly under lib/**
   ```
   lib/auth/index.ts  <- OK
   lib/auth.ts        <- NG
   ```

2. **Use index.ts for re-exports**
   ```typescript
   export { auth } from "./config"
   export { verifyAdmin } from "./utils"
   ```

3. **Avoid `export *`**
   - Causes build errors due to name collisions
   - Use explicit re-exports instead

### Server Actions Directory Classification

| Directory | Type | Characteristics |
|-----------|------|----------------|
| `lib/actions/crud/` | CRUD | Single table, standard operations |
| `lib/actions/domain/` | Domain | Multi-table, business workflows |
