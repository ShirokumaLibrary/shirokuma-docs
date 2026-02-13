# Documentation Patterns

## Test Documentation Generation

Generate test documentation automatically from test files:

```bash
# Generate test documentation (HTML + Markdown)
pnpm docs:tests

# Output:
# - docs/portal/test-cases.html (interactive HTML with code display)
# - docs/generated/test-cases.md (Markdown format)
```

**Features:**
- サイドバーナビゲーション（ファイル別）
- テストコードの展開表示（クリックで詳細表示）
- JSDocコメントの抽出と表示
- 行番号表示（ソースへの参照）
- コピーボタン（クリップボードへコピー）
- 検索・フィルタリング機能

## JSDoc for Test Files

テストファイルにJSDocコメントを書くことで自動的にドキュメントに反映されます：

```typescript
/**
 * テストの説明（ファイルレベル）
 * テスト環境や前提条件を記載
 */
describe("機能名", () => {
  // describeの前にコメントを書くとドキュメントに表示される

  /**
   * 個別テストの詳細説明
   * 期待される動作や条件を記載
   */
  test("テスト名", async () => {
    // テストコード
  })
})
```

## API Documentation (TypeDoc)

Server Actions や型定義にJSDocを書くことでAPIドキュメントを自動生成：

```bash
# Generate API documentation
pnpm docs:api

# Output: docs/generated/api-html/
```

### JSDoc Best Practices

```typescript
/**
 * 関数の概要（1行目）
 *
 * 詳細な説明（2行目以降）。
 * 処理フローや注意点を記載。
 *
 * ## セクション見出し
 * - リスト項目1
 * - リスト項目2
 *
 * @param paramName - パラメータの説明
 * @returns 戻り値の説明
 *
 * @example
 * ```typescript
 * // 使用例
 * const result = await myFunction(params)
 * console.log(result)
 * ```
 *
 * @see {@link relatedFunction} - 関連する関数への参照
 * @throws {Error} エラー条件の説明
 *
 * @category カテゴリ名
 */
export async function myFunction(paramName: string): Promise<Result> {
  // implementation
}
```

### 使用するタグ

| Tag | 用途 |
|-----|------|
| `@param` | パラメータの説明 |
| `@returns` | 戻り値の説明 |
| `@example` | 使用例（コードブロック付き） |
| `@see` | 関連する関数・型への参照 |
| `@throws` | スローする可能性のあるエラー |
| `@category` | TypeDocでのカテゴリ分類 |
| `@internal` | 内部関数（ドキュメントから除外） |

### Interface/Type のドキュメント

```typescript
/**
 * 型の概要
 *
 * @typeParam T - ジェネリック型の説明
 *
 * @example
 * ```typescript
 * const result: PaginatedResult<Post> = {
 *   items: posts,
 *   total: 150,
 *   page: 1,
 *   pageSize: 10,
 *   totalPages: 15
 * }
 * ```
 *
 * @category 型定義
 */
export interface PaginatedResult<T> {
  /** 現在のページのアイテム配列 */
  items: T[]
  /** 全アイテム数 */
  total: number
  // ...
}
```

## Documentation Portal Architecture

A centralized documentation portal for Next.js projects with auto-generated content.

### Multi-App Support (Monorepo)

In monorepo projects with multiple apps, features are automatically categorized by app:

**Path-Based App Inference**:
| Path Pattern | Inferred App |
|--------------|--------------|
| `apps/admin/...` | Admin |
| `apps/public/...` | Public |
| `apps/web/...` | Web |
| `packages/...` | Shared |

**Portal Organization**:
```
docs/portal/
├── details/
│   ├── actions/
│   │   ├── AdminOnly/        # Admin app actions
│   │   ├── PublicOnly/       # Public app actions
│   │   └── Shared/           # Cross-app actions
│   ├── components/
│   └── screens/
└── feature-map/
    └── index.html            # App-based feature grouping
```

**Benefits**:
- Clear ownership: Which app owns which feature
- No extra annotations needed: Inferred from directory structure
- Consistent navigation: Feature map grouped by app

### Action Type Classification

Server Actions are classified by **directory structure** (not annotations):

**Directory Structure**:
```
lib/actions/
├── crud/                    # Table-driven CRUD actions
│   ├── organizations.ts     # → CRUD (inferred from directory)
│   ├── projects.ts
│   └── entities.ts
│
├── domain/                  # Domain-driven composite actions
│   ├── dashboard.ts         # → Domain (inferred from directory)
│   ├── publishing.ts
│   └── onboarding.ts
│
└── types.ts
```

**Classification Criteria**:
| Directory | Type | Characteristics | Example |
|-----------|------|----------------|---------|
| `crud/` | CRUD | Single table, standard CRUD ops | `getProjects`, `createEntity` |
| `domain/` | Domain | Multiple tables, business workflows | `getDashboardStats`, `publishPost` |

**Portal Display**:
- Feature map shows `[CRUD]` or `[Domain]` badge (inferred from path)
- Filtering by action type available
- Table relationships visualized for domain actions

### Directory Structure

| Path | Purpose |
|------|---------|
| `docs/portal/index.html` | Main portal page |
| `docs/portal/viewer.html` | Markdown viewer with syntax highlight |
| `docs/portal/test-cases.html` | Generated test documentation |
| `docs/portal/feature-map/` | Feature map (grouped by app) |
| `docs/generated/api-html/` | TypeDoc API docs |
| `docs/generated/test-cases.md` | Test cases markdown |
| `docs/generated/deps/` | Dependency graphs (SVG) |
| `docs/generated/dbml/` | Database schema diagrams |
| `docs/phase*/` | Implementation phase docs (optional) |

### Command Reference

```bash
# Documentation
pnpm docs:tests     # テストドキュメント生成
pnpm docs:api       # APIドキュメント生成（TypeDoc）
pnpm docs:dbml      # DBスキーマ図生成
pnpm docs:deps      # 依存関係図生成
```
