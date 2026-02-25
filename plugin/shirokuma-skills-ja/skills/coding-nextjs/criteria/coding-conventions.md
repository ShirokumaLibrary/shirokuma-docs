# コーディング規約レビュー基準

## 概要

Next.js 16 + React 19 + TypeScript プロジェクトのコーディング規約。
コードレビュー時の一貫性・保守性チェックに使用。

## ファイル命名

### 必須規約

| 種類 | 規則 | 例 |
|------|------|-----|
| コンポーネント | kebab-case | `post-form.tsx`, `user-nav.tsx` |
| ページ | kebab-case | `page.tsx`, `layout.tsx` |
| ユーティリティ | kebab-case | `auth-client.ts`, `utils.ts` |
| Server Actions | kebab-case | `posts.ts`, `categories.ts` |
| テストファイル | kebab-case + `.test` or `.spec` | `posts.test.ts`, `auth.spec.ts` |
| Hooks | `use-` prefix + kebab-case | `use-mobile.tsx`, `use-auth.ts` |

### レビューチェックリスト

- [ ] コンポーネントファイルは kebab-case（PascalCase ではない）
- [ ] Hook ファイルは `use-` で始まる
- [ ] テストファイルは `.test.ts` または `.spec.ts` で終わる
- [ ] ファイル名にスペースや特殊文字なし

---

## 変数・関数の命名

### 必須規約

| 種類 | 規則 | 例 |
|------|------|-----|
| 変数 | camelCase | `userName`, `postCount`, `isLoading` |
| 関数 | camelCase (動詞 + 名詞) | `getUserById`, `createPost` |
| コンポーネント | PascalCase | `UserProfile`, `PostForm` |
| 定数 | UPPER_SNAKE_CASE | `MAX_RETRIES`, `API_BASE_URL` |
| 型/インターフェース | PascalCase | `UserData`, `PostInput` |
| Boolean | `is`/`has`/`can`/`should` prefix | `isLoading`, `hasPermission` |

### レビューチェックリスト

- [ ] 変数は camelCase
- [ ] 関数は camelCase + 動詞 prefix (get, create, update, delete, handle)
- [ ] React コンポーネントは PascalCase
- [ ] 定数は UPPER_SNAKE_CASE
- [ ] Boolean 変数に適切な prefix あり

### 例

```typescript
// Good
const userName = "John"
const isLoading = false
const MAX_RETRIES = 3
function getUserById(id: string) { }
function PostForm({ post }: PostFormProps) { }

// Bad
const user_name = "John"     // snake_case
const loading = false        // boolean prefix なし
const maxRetries = 3         // 定数は UPPER_SNAKE
function GetUserById() { }   // 関数に PascalCase
function postForm() { }      // コンポーネントに camelCase
```

---

## import の整理

### 必須順序

グループ間に空行を入れて以下の順序で整理:

1. **React/Next.js** (フレームワーク)
2. **外部パッケージ** (npm)
3. **内部パッケージ** (モノレポ @repo/*)
4. **ローカル絶対パス** (@/ エイリアス)
5. **相対パス** (./)

### レビューチェックリスト

- [ ] import がカテゴリ別にグループ化
- [ ] グループ間に空行あり
- [ ] 型 import は `import type` を使用
- [ ] 未使用の import なし

### 例

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

## TypeScript 規約

### 必須プラクティス

- [ ] `any` 型禁止（`unknown` を使用）
- [ ] エクスポート関数に明示的な戻り値型
- [ ] ランタイム型チェックに型ガード使用
- [ ] 未使用変数は `_` prefix
- [ ] オブジェクト型は `interface`、ユニオン/エイリアスは `type`

### 例

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

## コンポーネント構造

### 必須順序

1. ディレクティブ (`"use client"` or `"use server"`)
2. import (上記グループ順)
3. 型定義 (小規模な場合)
4. コンポーネント関数
   - Hooks を最初に
   - 派生値
   - イベントハンドラ
   - JSX を return

### レビューチェックリスト

- [ ] ディレクティブが先頭行（必要な場合）
- [ ] import がグループ化ルールに従う
- [ ] Hooks がコンポーネント本体の先頭
- [ ] イベントハンドラが return 前に定義
- [ ] コンポーネントがエクスポート済み

### 例

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

## Server Action 構造

### 必須順序

1. `"use server"` ディレクティブ
2. import
3. バリデーションスキーマ（内部）
4. 戻り値型定義
5. JSDoc 付きエクスポート関数

### 必須パターン

- [ ] 認証チェックが最初
- [ ] Zod による入力バリデーション
- [ ] DB 操作に try/catch
- [ ] 一貫した戻り値型 (`ActionResult<T>`)
- [ ] ミューテーション後に `revalidatePath`
- [ ] 公開関数に JSDoc

### 例

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

## コードスタイル

### ネスト上限

- [ ] ネスト最大3レベル
- [ ] 早期リターンでネストを削減

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

### 関数の長さ

- [ ] 関数は50行未満
- [ ] 単一責任の原則
- [ ] 複雑なロジックはヘルパー関数に抽出

### パラメータ数

- [ ] 最大3パラメータ
- [ ] それ以上はオブジェクトパラメータを使用

```typescript
// Bad
function create(name, email, role, dept, manager) { }

// Good
function create(params: CreateParams) { }
```

### マジックナンバー

- [ ] コンテキストなしのハードコード数値禁止
- [ ] 名前付き定数を使用

```typescript
// Bad
if (password.length < 8) { }

// Good
const MIN_PASSWORD_LENGTH = 8
if (password.length < MIN_PASSWORD_LENGTH) { }
```

---

## ESLint + Prettier + Stylistic 設定

### 有効ルール

| ルール | レベル | 説明 |
|--------|--------|------|
| `@typescript-eslint/no-explicit-any` | warn | `any` 型の使用を抑制 |
| `@typescript-eslint/no-unused-vars` | warn | 未使用変数は `_` prefix 必須 |
| `react-hooks/rules-of-hooks` | error | Hooks ルールを強制 |
| `react-hooks/exhaustive-deps` | warn | 依存配列チェック |
| `@stylistic/object-curly-newline` | error | 型定義は必ず複数行 |
| `no-console` | warn | console.log禁止 (warn/error除く) |

### 型定義フォーマット（必須）

型リテラル・interfaceは必ず複数行にする:

```typescript
// Bad - 1行
topActions: { action: string; count: number }[]

// Good - 複数行
topActions: {
  action: string
  count: number
}[]
```

ESLint Stylistic ルール:
```javascript
"@stylistic/object-curly-newline": ["error", {
  TSTypeLiteral: "always",
  TSInterfaceBody: "always",
}]
```

### フォーマットコマンド

```bash
pnpm --filter {app} lint        # ESLintチェック
pnpm --filter {app} lint:fix    # ESLint自動修正
pnpm --filter {app} format      # Prettier整形
pnpm --filter {app} fix         # 一括修正（推奨）
```

### ESLint チェック

- [ ] `any` 型なし（または根拠付きコメントあり）
- [ ] すべての変数が使用されているか `_` prefix あり
- [ ] React hooks が rules of hooks に準拠
- [ ] **型定義が複数行になっているか**
- [ ] Next.js Image/Link コンポーネントが正しく使用されているか

---

## サマリーチェックリスト

### クイックレビュー

- [ ] ファイル命名が kebab-case 規約に準拠
- [ ] 変数/関数が正しいケーシングを使用
- [ ] import が整理・グループ化済み
- [ ] TypeScript 型が明示的（`any` なし）
- [ ] コンポーネントが構造パターンに準拠
- [ ] Server Actions に認証・バリデーション・エラーハンドリングあり
- [ ] 深いネストなし（最大3レベル）
- [ ] マジックナンバーなし
- [ ] 関数が集中的で短い

### よくある問題

| 問題 | 修正 |
|------|------|
| PascalCase ファイル名 | kebab-case にリネーム |
| `any` 型 | `unknown` + 型ガードに置換 |
| 整理されていない import | グループ化して空行追加 |
| 戻り値型の欠落 | 明示的な `Promise<T>` を追加 |
| 深いネスト | 早期リターンを使用 |
| マジックナンバー | 定数に抽出 |
| 長い関数 | 小さな関数に分割 |

---

## lib/ ディレクトリ構造

### 必須構造

```
lib/
├── actions/           # Server Actions
│   ├── crud/          # 単一テーブル CRUD
│   └── domain/        # 複数テーブルのビジネスロジック
├── auth/              # 認証
├── context/           # React Context
├── hooks/             # カスタムフック
├── utils/             # ユーティリティ関数
└── validations/       # Zod スキーマ
```

### 重要ルール

1. **lib/ 直下にファイルを置かない**
   ```
   lib/auth/index.ts  ← OK
   lib/auth.ts        ← NG
   ```

2. **再エクスポートに index.ts を使用**
   ```typescript
   export { auth } from "./config"
   export { verifyAdmin } from "./utils"
   ```

3. **`export *` を避ける**
   - 名前衝突によるビルドエラーの原因
   - 明示的な再エクスポートを使用

### Server Actions ディレクトリ分類

| ディレクトリ | タイプ | 特徴 |
|-------------|--------|------|
| `lib/actions/crud/` | CRUD | 単一テーブル、標準操作 |
| `lib/actions/domain/` | ドメイン | 複数テーブル、ビジネスワークフロー |
