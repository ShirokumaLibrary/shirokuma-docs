# Server Action Module Template

## Usage

Server Actions モジュールを新規作成する際のテンプレート。

## File Structure

```
lib/actions/
├── {module}.ts           # Server Actions (このテンプレート)
├── {module}-types.ts     # 型定義+定数
└── types.ts              # 共通型（ActionResult）
```

## Template: {module}.ts

```typescript
"use server"

/**
 * [モジュール名]サーバーアクション / [Module Name] Server Actions
 *
 * [1-2行の概要説明]
 *
 * @serverAction
 * @feature [FeatureName]
 * @layer Application - Server Actions
 *
 * @usedInScreen [Screen1], [Screen2]
 * @usedComponents [Component1], [Component2]
 *
 * @dbTables [table1], [table2]
 * @dbOperations SELECT, INSERT, UPDATE, DELETE
 *
 * @authPattern
 *   1. verifyAuth() - Read operations
 *   2. verifyAuthMutation() - Write operations
 *
 * @category Server Actions - [カテゴリ名]
 */

// ============================================================
// Imports
// ============================================================
import { revalidatePath } from "next/cache"
import { eq, desc, and } from "drizzle-orm"
import { db, tableName } from "@repo/database"
import { verifyAuth, verifyAuthMutation } from "@/lib/auth-utils"
import { z } from "zod"
import type { ActionResult } from "./types"
import { CONSTANTS, type ModuleType } from "./{module}-types"

// ============================================================
// Validation Schemas
// ============================================================

/**
 * 作成用バリデーションスキーマ
 *
 * @validation CreateSchema
 */
const CreateSchema = z.object({
  name: z.string().min(1, "名前は必須です").max(100),
  // 他のフィールド
})

/**
 * 更新用バリデーションスキーマ
 *
 * @validation UpdateSchema
 */
const UpdateSchema = CreateSchema.partial()

// ============================================================
// Server Actions (Read)
// ============================================================

/**
 * [アイテム]一覧を取得 / Get [items] list
 *
 * @description 認証済みユーザーの[アイテム]一覧を取得します。
 *
 * @serverAction
 * @feature [FeatureName]
 * @dbTables [tableName]
 *
 * @returns [アイテム]の配列
 * @throws 認証エラー - ユーザーが認証されていない場合
 *
 * @example
 * ```ts
 * const items = await getItems()
 * ```
 */
export async function getItems(): Promise<ModuleType[]> {
  const session = await verifyAuth()
  if (!session?.user?.id) {
    return []
  }

  const items = await db
    .select()
    .from(tableName)
    .where(eq(tableName.userId, session.user.id))
    .orderBy(desc(tableName.createdAt))

  return items
}

/**
 * [アイテム]を取得 / Get [item] by ID
 *
 * @description 指定されたIDの[アイテム]を取得します。
 *
 * @serverAction
 * @feature [FeatureName]
 * @dbTables [tableName]
 *
 * @param id - [アイテム]ID
 * @returns [アイテム]、見つからない場合は null
 * @throws 認証エラー
 *
 * @example
 * ```ts
 * const item = await getItem("uuid-here")
 * ```
 */
export async function getItem(id: string): Promise<ModuleType | null> {
  await verifyAuth()

  const [item] = await db
    .select()
    .from(tableName)
    .where(eq(tableName.id, id))
    .limit(1)

  return item ?? null
}

// ============================================================
// Server Actions (Write)
// ============================================================

/**
 * [アイテム]を作成 / Create [item]
 *
 * @description 新しい[アイテム]を作成します。
 *
 * @serverAction
 * @feature [FeatureName]
 * @dbTables [tableName]
 *
 * @param formData - フォームデータ
 *   - name: [アイテム]名
 * @returns 成功: `{ success: true }` / 失敗: `{ success: false, error }`
 *
 * @example
 * ```tsx
 * <form action={createItem}>
 *   <input name="name" />
 *   <button type="submit">作成</button>
 * </form>
 * ```
 */
export async function createItem(formData: FormData): Promise<ActionResult> {
  const session = await verifyAuthMutation()
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" }
  }

  const validated = CreateSchema.safeParse({
    name: formData.get("name"),
  })

  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message }
  }

  try {
    await db.insert(tableName).values({
      ...validated.data,
      userId: session.user.id,
    })

    revalidatePath("/items")
    return { success: true }
  } catch (error) {
    console.error("Failed to create item:", error)
    return { success: false, error: "作成に失敗しました" }
  }
}

/**
 * [アイテム]を更新 / Update [item]
 *
 * @description 既存の[アイテム]を更新します。
 *
 * @serverAction
 * @feature [FeatureName]
 * @dbTables [tableName]
 *
 * @param id - [アイテム]ID
 * @param formData - フォームデータ
 * @returns 成功: `{ success: true }` / 失敗: `{ success: false, error }`
 */
export async function updateItem(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await verifyAuthMutation()
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" }
  }

  const validated = UpdateSchema.safeParse({
    name: formData.get("name"),
  })

  if (!validated.success) {
    return { success: false, error: validated.error.errors[0].message }
  }

  try {
    // オーナーシップ確認
    const [existing] = await db
      .select({ userId: tableName.userId })
      .from(tableName)
      .where(eq(tableName.id, id))
      .limit(1)

    if (!existing || existing.userId !== session.user.id) {
      return { success: false, error: "権限がありません" }
    }

    await db
      .update(tableName)
      .set({ ...validated.data, updatedAt: new Date() })
      .where(eq(tableName.id, id))

    revalidatePath("/items")
    return { success: true }
  } catch (error) {
    console.error("Failed to update item:", error)
    return { success: false, error: "更新に失敗しました" }
  }
}

/**
 * [アイテム]を削除 / Delete [item]
 *
 * @description 指定された[アイテム]を削除します。
 *
 * @serverAction
 * @feature [FeatureName]
 * @dbTables [tableName]
 *
 * @param id - [アイテム]ID
 * @returns 成功: `{ success: true }` / 失敗: `{ success: false, error }`
 */
export async function deleteItem(id: string): Promise<ActionResult> {
  const session = await verifyAuthMutation()
  if (!session?.user?.id) {
    return { success: false, error: "認証が必要です" }
  }

  try {
    // オーナーシップ確認
    const [existing] = await db
      .select({ userId: tableName.userId })
      .from(tableName)
      .where(eq(tableName.id, id))
      .limit(1)

    if (!existing || existing.userId !== session.user.id) {
      return { success: false, error: "権限がありません" }
    }

    await db.delete(tableName).where(eq(tableName.id, id))

    revalidatePath("/items")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete item:", error)
    return { success: false, error: "削除に失敗しました" }
  }
}
```

## Template: {module}-types.ts

```typescript
/**
 * [モジュール名]型定義 / [Module Name] Types
 *
 * [モジュール名]関連の型定義と定数
 *
 * @skip-test 型定義のみ - ランタイムロジックなし
 */
import type { tableName } from "@repo/database"

// ============================================================
// Constants
// ============================================================

/**
 * ステータスの選択肢
 */
export const STATUSES = ["active", "inactive", "archived"] as const

// ============================================================
// Types
// ============================================================

/**
 * ステータス型
 */
export type Status = (typeof STATUSES)[number]

/**
 * 基本型（スキーマ推論）
 */
export type ModuleType = typeof tableName.$inferSelect

/**
 * 新規作成用型
 */
export type NewModuleType = typeof tableName.$inferInsert
```

## Checklist

- [ ] `@serverAction` タグがモジュールヘッダーにある
- [ ] `@feature` タグがモジュールヘッダーにある
- [ ] `@dbTables` タグがモジュールヘッダーにある
- [ ] 全 public 関数に `@serverAction` `@feature` `@returns` タグ
- [ ] セクション区切りコメントがある
- [ ] 型定義は `*-types.ts` に分離（`@skip-test` タグ付き）

## Validation

```bash
# shirokuma-docs で検証
cd [project] && node ../shirokuma-docs/dist/index.js lint-code -v
```
