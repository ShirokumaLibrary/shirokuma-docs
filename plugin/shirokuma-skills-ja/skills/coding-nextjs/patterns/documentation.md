# ドキュメントパターン

## テストドキュメント生成

テストファイルからドキュメントを自動生成する：

```bash
# テストドキュメント生成（HTML + Markdown）
pnpm docs:tests

# 出力:
# - docs/portal/test-cases.html（インタラクティブHTML、コード表示付き）
# - docs/generated/test-cases.md（Markdown形式）
```

**機能:**
- サイドバーナビゲーション（ファイル別）
- テストコードの展開表示（クリックで詳細表示）
- JSDocコメントの抽出と表示
- 行番号表示（ソースへの参照）
- コピーボタン（クリップボードへコピー）
- 検索・フィルタリング機能

## テストファイルの JSDoc

テストファイルにJSDocコメントを書くことで自動的にドキュメントに反映される：

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

## API ドキュメント（TypeDoc）

Server Actions や型定義にJSDocを書くことでAPIドキュメントを自動生成：

```bash
# APIドキュメント生成
pnpm docs:api

# 出力: docs/generated/api-html/
```

### JSDoc ベストプラクティス

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

| タグ | 用途 |
|------|------|
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

## ドキュメントポータルのアーキテクチャ

自動生成コンテンツを含む Next.js プロジェクト向け統合ドキュメントポータル。

### マルチアプリ対応（モノレポ）

モノレポで複数アプリがある場合、機能はアプリごとに自動分類される：

**パスベースのアプリ推定**:
| パスパターン | 推定アプリ |
|-------------|-----------|
| `apps/admin/...` | Admin |
| `apps/public/...` | Public |
| `apps/web/...` | Web |
| `packages/...` | Shared |

**ポータル構成**:
```
docs/portal/
├── details/
│   ├── actions/
│   │   ├── AdminOnly/        # Admin アプリのアクション
│   │   ├── PublicOnly/       # Public アプリのアクション
│   │   └── Shared/           # 横断的なアクション
│   ├── components/
│   └── screens/
└── feature-map/
    └── index.html            # アプリベースの機能グルーピング
```

**メリット**:
- 所有権の明確化: どのアプリがどの機能を所有するか
- アノテーション不要: ディレクトリ構造から推定
- 一貫したナビゲーション: アプリごとにグループ化された機能マップ

### Action タイプの分類

Server Actions はアノテーションではなく**ディレクトリ構造**で分類：

**ディレクトリ構造**:
```
lib/actions/
├── crud/                    # テーブル駆動の CRUD アクション
│   ├── organizations.ts     # → CRUD（ディレクトリから推定）
│   ├── projects.ts
│   └── entities.ts
│
├── domain/                  # ドメイン駆動の複合アクション
│   ├── dashboard.ts         # → Domain（ディレクトリから推定）
│   ├── publishing.ts
│   └── onboarding.ts
│
└── types.ts
```

**分類基準**:
| ディレクトリ | タイプ | 特徴 | 例 |
|-------------|--------|------|-----|
| `crud/` | CRUD | 単一テーブル、標準CRUD | `getProjects`, `createEntity` |
| `domain/` | Domain | 複数テーブル、ビジネスワークフロー | `getDashboardStats`, `publishPost` |

**ポータル表示**:
- 機能マップに `[CRUD]` または `[Domain]` バッジ（パスから推定）
- アクションタイプでフィルタリング可能
- Domain アクションのテーブル関係を可視化

### ディレクトリ構造

| パス | 用途 |
|------|------|
| `docs/portal/index.html` | メインポータルページ |
| `docs/portal/viewer.html` | Markdown ビューア（シンタックスハイライト付き） |
| `docs/portal/test-cases.html` | 生成されたテストドキュメント |
| `docs/portal/feature-map/` | 機能マップ（アプリ別グルーピング） |
| `docs/generated/api-html/` | TypeDoc API ドキュメント |
| `docs/generated/test-cases.md` | テストケース Markdown |
| `docs/generated/deps/` | 依存関係グラフ（SVG） |
| `docs/generated/dbml/` | データベーススキーマ図 |
| `docs/phase*/` | 実装フェーズドキュメント（任意） |

### コマンドリファレンス

```bash
# ドキュメント生成
pnpm docs:tests     # テストドキュメント生成
pnpm docs:api       # APIドキュメント生成（TypeDoc）
pnpm docs:dbml      # DBスキーマ図生成
pnpm docs:deps      # 依存関係図生成
```
