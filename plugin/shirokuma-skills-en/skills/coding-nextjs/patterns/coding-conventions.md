# Coding Conventions

## File & Directory Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | kebab-case | `post-form.tsx`, `user-nav.tsx` |
| Pages | kebab-case | `page.tsx`, `layout.tsx` |
| Utilities | kebab-case | `auth-client.ts`, `utils.ts` |
| Server Actions | kebab-case | `posts.ts`, `categories.ts` |
| Test Files | kebab-case + `.test` | `posts.test.ts`, `auth.spec.ts` |
| Hooks | kebab-case + `use-` | `use-mobile.tsx` |
| Constants | kebab-case | `constants.ts` |

## Variable & Function Naming

```typescript
// Variables: camelCase
const userName = "John"
const postCount = 10
const isLoading = false

// Functions: camelCase (verb + noun)
function getUserById(id: string) { }
function createPost(data: PostInput) { }
async function handleSubmit(e: FormEvent) { }

// Components: PascalCase
function UserProfile() { }
function PostForm({ post }: PostFormProps) { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3
const API_BASE_URL = "/api"
const DEFAULT_PAGE_SIZE = 10

// Types/Interfaces: PascalCase
interface UserData { }
type PostInput = { }
type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

// Enums: PascalCase with PascalCase members
enum UserRole {
  Admin = "admin",
  Editor = "editor",
  User = "user",
}
```

## Import Organization

Imports should be grouped in this order (with blank lines between groups):

```typescript
// 1. React/Next.js (framework)
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// 2. External packages (npm)
import { z } from "zod"
import { useTranslations } from "next-intl"

// 3. Internal packages (monorepo)
import { db, posts, eq } from "@repo/database"

// 4. Local absolute imports (@/ alias)
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"

// 5. Relative imports
import { formatDate } from "./utils"
import type { PostFormProps } from "./types"
```

## TypeScript Conventions

```typescript
// Use explicit return types for public APIs
export async function getPosts(): Promise<Post[]> { }

// Use `unknown` instead of `any`
function parse(data: unknown): Item[] {
  if (!isValidData(data)) throw new Error("Invalid")
  return data.items
}

// Use type guards for runtime checks
function isValidData(data: unknown): data is { items: Item[] } {
  return typeof data === "object" && data !== null && "items" in data
}

// Prefix unused variables with underscore
function handler(_req: Request, res: Response) {
  // _req is intentionally unused
}

// Use interfaces for object shapes
interface PostFormProps {
  post?: Post
  categories: Category[]
}

// Use type for unions, intersections, or aliases
type ActionResult<T> = { success: true; data: T } | { success: false; error: string }
type PostStatus = "draft" | "published" | "archived"
```

## Component Structure

```typescript
"use client" // or "use server" - directive first

// Imports (grouped as above)
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { Props } from "./types"

// Type definitions (if small, otherwise separate file)
interface ComponentProps {
  title: string
  onSubmit: (data: FormData) => Promise<void>
}

// Component function (PascalCase)
export function MyComponent({ title, onSubmit }: ComponentProps) {
  // 1. Hooks first
  const [state, setState] = useState("")
  const t = useTranslations("namespace")

  // 2. Derived values
  const isValid = state.length > 0

  // 3. Event handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(e.target.value)
  }

  // 4. Render
  return (
    <div className="space-y-4">
      {/* JSX content */}
    </div>
  )
}
```

## Server Action Structure

```typescript
"use server"

// Imports
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { db, posts, eq } from "@repo/database"
import { z } from "zod"

// Validation schema (internal)
const Schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
})

// Return type definition
// Return type definition
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

/**
 * JSDoc comment for public actions
 */
export async function createPost(formData: FormData): Promise<ActionResult<{ id: string }>> {
  // 1. Auth check
  const session = await verifyAdmin(await headers())
  if (!session) return { success: false, error: "Unauthorized" }

  // 2. Validation
  const validated = Schema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  })
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message }
  }

  // 3. Database operation with try/catch
  try {
    const [result] = await db.insert(posts).values(validated.data).returning()
    revalidatePath("/posts")
    return { success: true, data: { id: result.id } }
  } catch (error) {
    console.error("Failed to create post:", error)
    return { success: false, error: "Operation failed" }
  }
}
```

## ESLint + Prettier + Stylistic Setup

### eslint.config.mjs

```javascript
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import stylistic from "@stylistic/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,  // Prettier互換（先に配置）
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "@stylistic": stylistic,
    },
    rules: {
      // TypeScript
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "off",

      // React hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Stylistic - 型定義は必ず複数行
      "@stylistic/object-curly-newline": ["error", {
        TSTypeLiteral: "always",
        TSInterfaceBody: "always",
      }],

      // General
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  { ignores: [".next/**", "node_modules/**", "coverage/**", "**/*.d.ts"] }
);
```

### .prettierrc

```json
{
  "semi": false,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always"
}
```

### Commands

```bash
pnpm --filter {app} lint        # ESLintチェック
pnpm --filter {app} lint:fix    # ESLint自動修正
pnpm --filter {app} format      # Prettier整形
pnpm --filter {app} format:check # Prettier差分確認
pnpm --filter {app} fix         # 一括修正（推奨）
```

**Key Rules:**
- No `any` types (use `unknown`) - warning level
- Unused variables must be prefixed with `_`
- React hooks rules enforced
- **型定義は必ず複数行** (`@stylistic/object-curly-newline`)

## Code Style Guidelines

1. **Maximum Nesting**: 3 levels deep
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

2. **Function Length**: Keep functions focused (< 50 lines)

3. **Parameter Count**: Maximum 3, use object for more
   ```typescript
   // Bad
   function create(name, email, role, dept, manager) { }

   // Good
   function create(params: CreateParams) { }
   ```

4. **Magic Numbers**: Use named constants
   ```typescript
   // Bad
   if (password.length < 8) { }

   // Good
   const MIN_PASSWORD_LENGTH = 8
   if (password.length < MIN_PASSWORD_LENGTH) { }
   ```

5. **Boolean Naming**: Use `is`, `has`, `can`, `should` prefix
   ```typescript
   const isLoading = true
   const hasPermission = user.role === "admin"
   const canEdit = isOwner || isAdmin
   ```
