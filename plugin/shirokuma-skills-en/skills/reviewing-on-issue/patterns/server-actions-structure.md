# Server Actions Module Structure Standard

Related: [server-actions.md](./server-actions.md)

## Purpose

Standard rules for Server Actions module **structure and JSDoc**.
Designed for automated checks by shirokuma-docs and efficient reviews.

---

## File Naming Convention

```
lib/actions/
├── types.ts              # Common types (ActionResult, PaginatedResult)
├── {module}.ts           # Server Actions (main file)
├── {module}-types.ts     # Module-specific types + constants
└── {module}-utils.ts     # Helper functions (only when needed)
```

| File | Role | Required Tags |
|------|------|--------------|
| `{module}.ts` | Server Actions | `@serverAction`, `@feature` |
| `{module}-types.ts` | Type definitions + constants | `@skip-test` |
| `{module}-utils.ts` | Helper functions | None (test target) |

---

## Module Structure Template

```typescript
"use server"

/**
 * [Module Name] Server Actions
 *
 * [1-2 line overview]
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
 * @category Server Actions - [Category]
 */

// ============================================================
// Imports
// ============================================================
import { revalidatePath } from "next/cache"
import { eq, desc, and } from "drizzle-orm"
import { db, table1, table2 } from "@repo/database"
import { verifyAuth, verifyAuthMutation } from "@/lib/auth-utils"
import { z } from "zod"
import type { ActionResult } from "./types"
import { CONSTANTS, type ModuleType } from "./{module}-types"

// ============================================================
// Validation Schemas
// ============================================================

/**
 * [Schema Name] Validation Schema
 *
 * @validation [SchemaName]
 */
const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  // ...
})

// ============================================================
// Server Actions (Read)
// ============================================================

/**
 * [Function description]
 *
 * @description [Detailed description]
 *
 * @serverAction
 * @feature [FeatureName]
 * @dbTables [tables]
 *
 * @param id - [Parameter description]
 * @returns [Return value description]
 * @throws Authentication error
 *
 * @example
 * ```ts
 * const result = await getItem("uuid")
 * ```
 */
export async function getItem(id: string): Promise<ItemType | null> {
  await verifyAuth()
  // implementation
}

// ============================================================
// Server Actions (Write)
// ============================================================

/**
 * [Function description]
 *
 * @description [Detailed description]
 *
 * @serverAction
 * @feature [FeatureName]
 * @dbTables [tables]
 *
 * @param formData - Form data
 * @returns Success: `{ success: true }` / Failure: `{ success: false, error }`
 *
 * @example
 * ```tsx
 * <form action={createItem}>
 *   <input name="name" />
 * </form>
 * ```
 */
export async function createItem(formData: FormData): Promise<ActionResult> {
  await verifyAuthMutation()
  // implementation
}
```

---

## Types File Template

```typescript
/**
 * [Module Name] Types
 *
 * Type definitions and constants for [Module Name]
 *
 * @skip-test Types only - no runtime logic
 */
import type { table } from "@repo/database"

// ============================================================
// Constants
// ============================================================

/**
 * [Constant Name] options
 */
export const STATUSES = ["active", "inactive", "archived"] as const

/**
 * [Constant Name] options
 */
export const TYPES = ["type1", "type2", "type3"] as const

// ============================================================
// Types
// ============================================================

/**
 * [Type Name] - Status
 */
export type Status = (typeof STATUSES)[number]

/**
 * [Type Name] - Base type (schema inference)
 */
export type Item = typeof table.$inferSelect

/**
 * [Type Name] - With details
 */
export type ItemWithDetails = Item & {
  relation1: Relation1Type
  relation2?: Relation2Type
}

/**
 * [Type Name] - For creation
 */
export type NewItem = typeof table.$inferInsert
```

---

## Required JSDoc Tags

### File Header (Module Header)

| Tag | Required | Description |
|-----|----------|-------------|
| `@serverAction` | Yes | Indicates a Server Action module |
| `@feature` | Yes | Feature classification (for feature-map) |
| `@dbTables` | Yes | DB tables used |
| `@category` | No | Documentation classification |
| `@usedInScreen` | No | Screens where used |
| `@usedComponents` | No | Components where used |

### Function JSDoc

| Tag | Required | Description |
|-----|----------|-------------|
| `@serverAction` | Yes | Indicates a Server Action function |
| `@feature` | Yes | Feature classification |
| `@param` | If params exist | Parameter description |
| `@returns` | Yes | Return value description |
| `@description` | No | Detailed description |
| `@example` | No | Usage example |
| `@throws` | No | Exception description |

---

## Section Separators

Use section separator comments to clarify structure:

```typescript
// ============================================================
// [Section Name]
// ============================================================
```

**Recommended section order**:
1. Imports
2. Validation Schemas
3. Helper Functions (internal, not exported)
4. Server Actions (Read)
5. Server Actions (Write)

---

## Validation Checklist

### File Structure
- [ ] `"use server"` at the top of the file
- [ ] Module header JSDoc present
- [ ] `@serverAction` tag in module header
- [ ] `@feature` tag in module header
- [ ] `@dbTables` tag in module header
- [ ] Section separator comments present

### Function Documentation
- [ ] All public functions have JSDoc
- [ ] All public functions have `@serverAction` tag
- [ ] All public functions have `@feature` tag
- [ ] All public functions have `@returns` tag
- [ ] `@param` tag present if function has parameters

### Types File
- [ ] File name follows `*-types.ts` convention
- [ ] `@skip-test` tag in header
- [ ] Constants and types are separated

---

## shirokuma-docs Integration

This rule is used by the following shirokuma-docs features:

1. **feature-map**: Auto-classification via `@serverAction`, `@feature` tags
2. **details**: Module detail pages show Types, Utilities sections
3. **lint-code** (planned): Automated structure and tag validation
