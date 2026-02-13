# コーディング規約

## ファイル・ディレクトリ命名

| 種類 | 規約 | 例 |
|------|------|-----|
| コンポーネント | kebab-case | `post-form.tsx`, `user-nav.tsx` |
| ページ | kebab-case | `page.tsx`, `layout.tsx` |
| ユーティリティ | kebab-case | `auth-client.ts`, `utils.ts` |
| Server Actions | kebab-case | `posts.ts`, `categories.ts` |
| テストファイル | kebab-case + `.test` | `posts.test.ts`, `auth.spec.ts` |
| Hooks | kebab-case + `use-` | `use-mobile.tsx` |
| 定数 | kebab-case | `constants.ts` |

## 変数・関数命名

```typescript
// 変数: camelCase
const userName = "John"
const postCount = 10
const isLoading = false

// 関数: camelCase（動詞 + 名詞）
function getUserById(id: string) { }
function createPost(data: PostInput) { }
async function handleSubmit(e: FormEvent) { }

// コンポーネント: PascalCase
function UserProfile() { }
function PostForm({ post }: PostFormProps) { }

// 定数: UPPER_SNAKE_CASE
const MAX_RETRIES = 3
const API_BASE_URL = "/api"
const DEFAULT_PAGE_SIZE = 10

// 型/インターフェース: PascalCase
interface UserData { }
type PostInput = { }
type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

// Enum: PascalCase（メンバーも PascalCase）
enum UserRole {
  Admin = "admin",
  Editor = "editor",
  User = "user",
}
```

## Import 順序

グループ間に空行を入れて以下の順序で整理する：

```typescript
// 1. React/Next.js（フレームワーク）
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// 2. 外部パッケージ（npm）
import { z } from "zod"
import { useTranslations } from "next-intl"

// 3. 内部パッケージ（モノレポ）
import { db, posts, eq } from "@repo/database"

// 4. ローカル絶対パス（@/ エイリアス）
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"

// 5. 相対パス
import { formatDate } from "./utils"
import type { PostFormProps } from "./types"
```

## TypeScript 規約

```typescript
// パブリック API には明示的な戻り値型を指定
export async function getPosts(): Promise<Post[]> { }

// `any` ではなく `unknown` を使用
function parse(data: unknown): Item[] {
  if (!isValidData(data)) throw new Error("Invalid")
  return data.items
}

// 型ガードでランタイムチェック
function isValidData(data: unknown): data is { items: Item[] } {
  return typeof data === "object" && data !== null && "items" in data
}

// 未使用変数はアンダースコアプレフィックス
function handler(_req: Request, res: Response) {
  // _req は意図的に未使用
}

// オブジェクト形状には interface
interface PostFormProps {
  post?: Post
  categories: Category[]
}

// ユニオン・交差・エイリアスには type
type ActionResult<T> = { success: true; data: T } | { success: false; error: string }
type PostStatus = "draft" | "published" | "archived"
```

## コンポーネント構造

```typescript
"use client" // または "use server" - ディレクティブが最初

// Import（上記の順序でグループ化）
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { Props } from "./types"

// 型定義（小さければ同一ファイル、大きければ別ファイル）
interface ComponentProps {
  title: string
  onSubmit: (data: FormData) => Promise<void>
}

// コンポーネント関数（PascalCase）
export function MyComponent({ title, onSubmit }: ComponentProps) {
  // 1. Hooks を最初に
  const [state, setState] = useState("")
  const t = useTranslations("namespace")

  // 2. 導出値
  const isValid = state.length > 0

  // 3. イベントハンドラ
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(e.target.value)
  }

  // 4. レンダリング
  return (
    <div className="space-y-4">
      {/* JSX コンテンツ */}
    </div>
  )
}
```

## Server Action 構造

```typescript
"use server"

// Import
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { db, posts, eq } from "@repo/database"
import { z } from "zod"

// バリデーションスキーマ（内部用）
const Schema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
})

// 戻り値型定義
type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

/**
 * パブリックアクションの JSDoc コメント
 */
export async function createPost(formData: FormData): Promise<ActionResult<{ id: string }>> {
  // 1. 認証チェック
  const session = await verifyAdmin(await headers())
  if (!session) return { success: false, error: "Unauthorized" }

  // 2. バリデーション
  const validated = Schema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
  })
  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message }
  }

  // 3. DB操作（try/catch）
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

## ESLint + Prettier + Stylistic 設定

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

### コマンド

```bash
pnpm --filter {app} lint        # ESLintチェック
pnpm --filter {app} lint:fix    # ESLint自動修正
pnpm --filter {app} format      # Prettier整形
pnpm --filter {app} format:check # Prettier差分確認
pnpm --filter {app} fix         # 一括修正（推奨）
```

**主要ルール:**
- `any` 型禁止（`unknown` を使用）- warning レベル
- 未使用変数は `_` プレフィックス必須
- React hooks ルール適用
- **型定義は必ず複数行** (`@stylistic/object-curly-newline`)

## コードスタイルガイドライン

1. **最大ネスト**: 3階層まで
   ```typescript
   // NG: 4階層以上
   if (a) {
     if (b) {
       if (c) {
         if (d) { }  // 深すぎる
       }
     }
   }

   // OK: 早期リターン
   if (!a) return
   if (!b) return
   if (!c) return
   // d を処理
   ```

2. **関数の長さ**: 1関数50行以内

3. **パラメータ数**: 最大3個、それ以上はオブジェクトで
   ```typescript
   // NG
   function create(name, email, role, dept, manager) { }

   // OK
   function create(params: CreateParams) { }
   ```

4. **マジックナンバー禁止**: 名前付き定数を使用
   ```typescript
   // NG
   if (password.length < 8) { }

   // OK
   const MIN_PASSWORD_LENGTH = 8
   if (password.length < MIN_PASSWORD_LENGTH) { }
   ```

5. **Boolean 命名**: `is`, `has`, `can`, `should` プレフィックス
   ```typescript
   const isLoading = true
   const hasPermission = user.role === "admin"
   const canEdit = isOwner || isAdmin
   ```
