# 設定ファイルリファレンス

shirokuma-docs の設定は `shirokuma-docs.config.yaml` で管理します。`shirokuma-docs init` を実行すると、プロジェクトルートに雛形が生成されます。

## ファイルの場所

```
your-project/
└── shirokuma-docs.config.yaml    # ← ここ
```

コマンド実行時に `-c` オプションで別のパスを指定することもできます:

```bash
shirokuma-docs generate -c path/to/config.yaml
```

## 設定項目一覧

### project - プロジェクト基本情報

```yaml
project:
  name: "MyProject"
  description: "プロジェクトの説明"
  version: "1.0.0"
  repository: "https://github.com/org/repo"
```

| フィールド | 説明 |
|-----------|------|
| `name` | プロジェクト名 |
| `description` | プロジェクトの説明 |
| `version` | 現在のバージョン |
| `repository` | リポジトリ URL |

### output - 出力先ディレクトリ

```yaml
output:
  portal: "docs/portal"
  generated: "docs/generated"
  schema: "docs/schema"
```

| フィールド | 説明 | デフォルト |
|-----------|------|-----------|
| `portal` | ポータル HTML の出力先 | `docs/portal` |
| `generated` | 生成ドキュメントの出力先 | `docs/generated` |
| `schema` | スキーマドキュメントの出力先 | `docs/schema` |

### typedoc - API ドキュメント

```yaml
typedoc:
  entryPoints: ["apps/web/lib"]
  exclude: ["**/*.test.ts"]
```

| フィールド | 説明 |
|-----------|------|
| `entryPoints` | TypeDoc の解析対象ディレクトリ |
| `exclude` | 除外パターン |

### schema - ER 図

```yaml
schema:
  sources:
    - path: packages/database/src/schema
    - path: packages/analytics-db/src/schema
      description: Analytics database
```

| フィールド | 説明 |
|-----------|------|
| `sources[].path` | Drizzle ORM スキーマのパス |
| `sources[].description` | スキーマの説明（任意） |

### testCases - テストケース抽出

```yaml
testCases:
  jest:
    testMatch: ["**/__tests__/**/*.test.ts"]
  playwright:
    testDir: "./tests/e2e"
```

| フィールド | 説明 |
|-----------|------|
| `jest.testMatch` | Jest テストファイルのパターン |
| `playwright.testDir` | Playwright テストのディレクトリ |

### lintTests - テストコメント品質

```yaml
lintTests:
  rules:
    testdoc-required: { severity: "warning" }
    testdoc-japanese: { severity: "warning" }
    duplicate-testdoc: { severity: "error" }
```

各ルールの `severity` を `"error"` / `"warning"` / `"off"` で設定します。

### lintCoverage - 実装-テスト対応

```yaml
lintCoverage:
  enabled: true
  conventions:
    - source: "apps/web/lib/actions/*.ts"
      test: "apps/web/__tests__/lib/actions/*.test.ts"
  exclude:
    - "apps/web/components/ui/**"
    - "**/types.ts"
```

| フィールド | 説明 |
|-----------|------|
| `enabled` | 有効/無効 |
| `conventions` | ソースとテストのパス対応 |
| `exclude` | チェック対象外のパターン |

### lintDocs - ドキュメント構造検証

```yaml
lintDocs:
  enabled: true
  strict: false
  required:
    - file: "docs/OVERVIEW.md"
      description: "Project overview"
      sections:
        - pattern: "^# .+"
          description: "Main title"
          required: true
        - pattern: "^## (概要|Overview)"
          description: "Tool overview"
          required: true
      minLength: 100
      maxLength: 1000
  validateLinks:
    enabled: true
    checkInternal: true
    checkExternal: false
  formatting:
    maxLineLength: 120
    requireBlankLineBeforeHeading: true
```

| フィールド | 説明 |
|-----------|------|
| `required[].file` | 必須ドキュメントのパス |
| `required[].sections` | 必須セクションのパターン |
| `required[].minLength` / `maxLength` | 文字数の範囲 |
| `validateLinks` | リンク検証の設定 |
| `formatting` | フォーマットルール |

### lintCode - コード構造検証

```yaml
lintCode:
  enabled: true
  strict: false
  serverActions:
    enabled: true
```

| フィールド | 説明 | デフォルト |
|-----------|------|-----------|
| `enabled` | 有効/無効 | `true` |
| `strict` | strict モード | `false` |
| `serverActions.enabled` | Server Actions のチェック | `true` |

### lintAnnotations - アノテーション整合性検証

```yaml
lintAnnotations:
  enabled: true
  strict: false
  rules:
    missing-component-ref: { severity: "warning" }
    invalid-screen-path: { severity: "error" }
```

| フィールド | 説明 | デフォルト |
|-----------|------|-----------|
| `enabled` | 有効/無効 | `true` |
| `strict` | strict モード | `false` |
| `rules` | 各ルールの severity（`error` / `warning` / `off`） | — |

### lintStructure - プロジェクト構造検証

```yaml
lintStructure:
  enabled: true
  strict: false
  excludeApps: []
  rules:
    naming-convention: { severity: "warning" }
    directory-structure: { severity: "warning" }
```

| フィールド | 説明 | デフォルト |
|-----------|------|-----------|
| `enabled` | 有効/無効 | `true` |
| `strict` | strict モード | `false` |
| `excludeApps` | チェック対象外のアプリ | `[]` |
| `rules` | 各ルールの severity | — |

### lintWorkflow - AI ワークフロー規約検証

```yaml
lintWorkflow:
  enabled: true
  strict: false
  rules:
    issue-fields: { severity: "warning" }
    branch-naming: { severity: "warning" }
    commit-format: { severity: "warning" }
  prefixes:
    - feat
    - fix
    - chore
    - docs
```

| フィールド | 説明 | デフォルト |
|-----------|------|-----------|
| `enabled` | 有効/無効 | `true` |
| `strict` | strict モード | `false` |
| `rules` | 各ルールの severity | — |
| `prefixes` | 許可するブランチプレフィックス | `[feat, fix, chore, docs]` |

### featureMap - 機能階層マップ

```yaml
featureMap:
  enabled: true
  include:
    - "apps/web/app/**/*.tsx"
    - "apps/web/components/**/*.tsx"
    - "apps/web/lib/actions/**/*.ts"
  externalDocs:
    - name: "shadcn-ui"
      pattern: "^(Button|Card|...)$"
      urlTemplate: "https://ui.shadcn.com/docs/components/{kebab-name}"
```

| フィールド | 説明 |
|-----------|------|
| `include` | 解析対象のファイルパターン |
| `externalDocs` | 外部ドキュメントへのリンク設定 |

### screenshots - スクリーンショット

```yaml
screenshots:
  enabled: true
  source: "annotations"
  accounts:
    admin:
      email: "admin@example.com"
      password: "Admin@Test2024!"
    user:
      email: "user@example.com"
      password: "User@Test2024!"
```

| フィールド | 説明 |
|-----------|------|
| `source` | テスト生成元（`annotations`） |
| `accounts` | テスト用アカウント |

### overview - プロジェクト概要

```yaml
overview:
  enabled: true
  file: "docs/OVERVIEW.md"
  layers:
    - name: "Presentation"
      description: "Next.js + React"
      icon: "monitor"
  features:
    - name: "UserAuth"
      status: "stable"
      priority: "core"
```

| フィールド | 説明 |
|-----------|------|
| `file` | 概要ファイルのパス |
| `layers` | アーキテクチャレイヤー定義 |
| `features` | 機能一覧と状態 |

### metrics - 開発メトリクス

```yaml
metrics:
  enabled: true
```

ステータス遷移時に Projects V2 の Text フィールドへ ISO 8601 タイムスタンプを自動記録します。`session check --fix` で既存アイテムのバックフィルも可能です。

| フィールド | 説明 | デフォルト |
|-----------|------|-----------|
| `enabled` | メトリクス記録の有効/無効 | `false` |
| `dateFields` | 各タイムスタンプの Text フィールド名 | 下記参照 |
| `statusToDateMapping` | Status → Text フィールドの対応 | 下記参照 |
| `staleThresholdDays` | In Progress が stale と見なされる日数 | `14` |

`dateFields` のデフォルト値:

| キー | デフォルトフィールド名 |
|------|---------------------|
| `planningAt` | `Planning At` |
| `specReviewAt` | `Spec Review At` |
| `inProgressAt` | `In Progress At` |
| `reviewAt` | `Review At` |
| `completedAt` | `Completed At` |

`statusToDateMapping` のデフォルト値:

| Status | 記録先フィールド |
|--------|----------------|
| `Planning` | `Planning At` |
| `Spec Review` | `Spec Review At` |
| `In Progress` | `In Progress At` |
| `Review` | `Review At` |
| `Done` | `Completed At` |

デフォルト値をそのまま使う場合は `enabled: true` だけで動作します。フィールド名をカスタマイズする場合のみ `dateFields` や `statusToDateMapping` を指定してください。

### github - GitHub 連携

```yaml
github:
  discussionsCategory: "Handovers"
  listLimit: 20
  defaultStatus: "Backlog"
  labels:
    feature: "feature"
    bug: "bug"
    chore: "chore"
    docs: "docs"
    research: "research"
```

| フィールド | 説明 | デフォルト |
|-----------|------|-----------|
| `discussionsCategory` | セッション引き継ぎのカテゴリ名 | `Handovers` |
| `listLimit` | Issue/Discussion の取得件数上限 | `20` |
| `defaultStatus` | Issue 作成時のデフォルト Status | `Backlog` |
| `labels` | Issue Type に対応するラベル名マッピング | 下記参照 |

`labels` のデフォルト値:

| Type | デフォルトラベル名 |
|------|------------------|
| Feature | `feature` |
| Bug | `bug` |
| Chore | `chore` |
| Docs | `docs` |
| Research | `research` |

### crossRepos - クロスリポジトリ

```yaml
crossRepos:
  frontend:
    owner: "my-org"
    repo: "frontend-app"
  backend:
    owner: "my-org"
    repo: "backend-api"
```

`--repo` オプションでエイリアスを指定してクロスリポジトリ操作ができます:

```bash
shirokuma-docs issues list --repo frontend
```

### repoPairs - リポジトリペア

```yaml
repoPairs:
  main:
    private: "MyOrg/my-project"
    public: "MyPublicOrg/my-project"
    exclude:
      - ".env*"
      - "internal/"
```

Private → Public の公開リリース管理に使用します。

## md コマンドの設定

`md` コマンド（LLM 最適化 Markdown 管理）は、`shirokuma-docs.config.yaml` とは別の独立した設定ファイル `shirokuma-md.config.yaml` を使用します。

```yaml
# shirokuma-md.config.yaml
output: "docs/combined.md"
include:
  - "docs/**/*.md"
exclude:
  - "node_modules/**"
```

詳しくは `shirokuma-docs md --help` を参照してください。

## 最小構成の例

```yaml
project:
  name: "MyApp"
  repository: "https://github.com/org/my-app"

output:
  generated: "docs/generated"

testCases:
  jest:
    testMatch: ["**/__tests__/**/*.test.ts"]
```

## よくある設定パターン

### パターン 1: CLI ツール専用（GitHub 連携なし）

ローカルでドキュメント生成・テスト検証のみ行うケース:

```yaml
project:
  name: "MyApp"
  repository: "https://github.com/org/my-app"

output:
  generated: "docs/generated"

testCases:
  jest:
    testMatch: ["**/__tests__/**/*.test.ts"]

lintTests:
  rules:
    testdoc-required: { severity: "warning" }
```

### パターン 2: GitHub 連携あり（基本）

Issues / Projects / セッション管理を活用するケース:

```yaml
project:
  name: "MyApp"
  repository: "https://github.com/org/my-app"

output:
  generated: "docs/generated"

testCases:
  jest:
    testMatch: ["**/__tests__/**/*.test.ts"]

lintTests:
  rules:
    testdoc-required: { severity: "warning" }

github:
  discussionsCategory: "Handovers"
  listLimit: 20

metrics:
  enabled: true
```

### パターン 3: フロントエンド開発フル装備

Next.js アプリ開発で全機能を活用するケース:

```yaml
project:
  name: "MyApp"
  description: "Next.js フロントエンドアプリ"
  version: "1.0.0"
  repository: "https://github.com/org/my-app"

output:
  portal: "docs/portal"
  generated: "docs/generated"
  schema: "docs/schema"

testCases:
  jest:
    testMatch: ["**/__tests__/**/*.test.ts"]
  playwright:
    testDir: "./tests/e2e"

lintTests:
  rules:
    testdoc-required: { severity: "warning" }

screenshots:
  enabled: true
  source: "annotations"
  accounts:
    admin:
      email: "admin@example.com"
      password: "Admin@Test2024!"

featureMap:
  enabled: true
  include:
    - "apps/web/app/**/*.tsx"
    - "apps/web/components/**/*.tsx"
    - "apps/web/lib/actions/**/*.ts"

schema:
  sources:
    - path: packages/database/src/schema

github:
  discussionsCategory: "Handovers"
  listLimit: 20
```

## フルスキーマの例

すべての設定項目を含む完全な設定ファイルの例:

```yaml
project:
  name: "MyProject"
  description: "プロジェクトの説明"
  version: "1.0.0"
  repository: "https://github.com/org/repo"

output:
  portal: "docs/portal"
  generated: "docs/generated"
  schema: "docs/schema"

typedoc:
  entryPoints: ["apps/web/lib"]
  exclude: ["**/*.test.ts"]

schema:
  sources:
    - path: packages/database/src/schema
    - path: packages/analytics-db/src/schema
      description: Analytics database

testCases:
  jest:
    testMatch: ["**/__tests__/**/*.test.ts"]
  playwright:
    testDir: "./tests/e2e"

lintTests:
  rules:
    testdoc-required: { severity: "warning" }
    testdoc-japanese: { severity: "warning" }
    duplicate-testdoc: { severity: "error" }

lintCoverage:
  enabled: true
  conventions:
    - source: "apps/web/lib/actions/*.ts"
      test: "apps/web/__tests__/lib/actions/*.test.ts"
  exclude:
    - "apps/web/components/ui/**"
    - "**/types.ts"

lintDocs:
  enabled: true
  strict: false
  required:
    - file: "docs/OVERVIEW.md"
      sections:
        - pattern: "^# .+"
          required: true
        - pattern: "^## (概要|Overview)"
          required: true
  validateLinks:
    enabled: true
    checkInternal: true
    checkExternal: false

lintCode:
  enabled: true
  strict: false
  serverActions:
    enabled: true

lintAnnotations:
  enabled: true
  strict: false

lintStructure:
  enabled: true
  strict: false

lintWorkflow:
  enabled: true
  strict: false
  prefixes: [feat, fix, chore, docs]

featureMap:
  enabled: true
  include:
    - "apps/web/app/**/*.tsx"
    - "apps/web/components/**/*.tsx"
    - "apps/web/lib/actions/**/*.ts"

screenshots:
  enabled: true
  source: "annotations"
  accounts:
    admin:
      email: "admin@example.com"
      password: "Admin@Test2024!"

overview:
  enabled: true
  file: "docs/OVERVIEW.md"

github:
  discussionsCategory: "Handovers"
  listLimit: 20
  defaultStatus: "Backlog"
  labels:
    feature: "feature"
    bug: "bug"
    chore: "chore"
    docs: "docs"
    research: "research"

metrics:
  enabled: true

crossRepos:
  frontend:
    owner: "my-org"
    repo: "frontend-app"

repoPairs:
  main:
    private: "MyOrg/my-project"
    public: "MyPublicOrg/my-project"
    exclude:
      - ".env*"
      - "internal/"
```
