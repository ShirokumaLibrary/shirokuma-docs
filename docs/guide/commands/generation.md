# ドキュメント生成コマンド

コードアノテーションや設定ファイルからドキュメントを自動生成するコマンド群です。

## generate - 一括生成

すべてのドキュメント生成コマンドをまとめて実行します。

```bash
shirokuma-docs generate
```

| オプション | 説明 |
|-----------|------|
| `-p, --project <path>` | プロジェクトパス |
| `-c, --config <file>` | 設定ファイルパス |
| `-o, --output <dir>` | 出力ディレクトリ |
| `--with-github` | GitHub Issues/Discussions データを含める |
| `-v, --verbose` | 詳細ログ |

```bash
# GitHub データも含めて一括生成
shirokuma-docs generate --with-github
```

---

## typedoc - API ドキュメント

TypeDoc を使って TypeScript コードから API ドキュメントを生成します。

```bash
shirokuma-docs typedoc -p .
```

### 設定例

```yaml
typedoc:
  entryPoints: ["apps/web/lib"]
  exclude: ["**/*.test.ts"]
```

### 出力

HTML 形式の API ドキュメントが `output.generated` で指定したディレクトリに出力されます。

---

## schema - ER 図

Drizzle ORM のスキーマ定義からデータベースの ER 図を生成します。

```bash
shirokuma-docs schema -p .
```

### 設定例

```yaml
schema:
  sources:
    - path: packages/database/src/schema
    - path: packages/analytics-db/src/schema
      description: Analytics database
```

### 出力

- DBML ファイル（テキスト形式のスキーマ定義）
- SVG ファイル（ER 図の画像）

---

## deps - 依存関係グラフ

dependency-cruiser を使ってモジュール間の依存関係グラフを生成します。

```bash
shirokuma-docs deps -p .
```

### 出力

SVG 形式の依存関係グラフが出力されます。循環参照がある場合はハイライトされます。

---

## test-cases - テストケース一覧

Jest / Playwright のテストファイルからテストケースを抽出し、一覧を生成します。

```bash
shirokuma-docs test-cases -p .
```

### 設定例

```yaml
testCases:
  jest:
    testMatch: ["**/__tests__/**/*.test.ts"]
  playwright:
    testDir: "./tests/e2e"
```

### 出力

テスト名、`@testdoc` コメント、テストファイルのパスを含む一覧が生成されます。

---

## coverage - テストカバレッジ

Jest のカバレッジ結果からレポートを生成します。

```bash
# サマリーを表示（デフォルト）
shirokuma-docs coverage -p .

# HTML 形式で出力
shirokuma-docs coverage -p . -f html -o docs/coverage

# JSON 形式で出力
shirokuma-docs coverage -p . -f json

# カバレッジ閾値を設定（下回ると失敗）
shirokuma-docs coverage -p . --fail-under 80
```

| オプション | 説明 |
|-----------|------|
| `-f, --format <format>` | `summary`（デフォルト）/ `html` / `json` |
| `--fail-under <number>` | 指定した % を下回ると終了コード 1 |

---

## feature-map - 機能階層マップ

コードアノテーション（`@screen`, `@component`, `@serverAction`, `@table`）から 4 層構造の機能マップを生成します。

```
Screen → Component → Action → Table
```

```bash
shirokuma-docs feature-map -p .
```

### 設定例

```yaml
featureMap:
  enabled: true
  include:
    - "apps/web/app/**/*.tsx"
    - "apps/web/components/**/*.tsx"
    - "apps/web/lib/actions/**/*.ts"
```

---

## portal - ドキュメントポータル

生成したドキュメントをまとめたダークテーマの HTML ポータルサイトを生成します。

```bash
# カード形式（デフォルト）
shirokuma-docs portal -p .

# ドキュメント形式
shirokuma-docs portal -p . -f document

# GitHub データも含める
shirokuma-docs portal -p . --with-github
```

| オプション | 説明 |
|-----------|------|
| `-f, --format <format>` | `card`（デフォルト）/ `document` |
| `--with-github` | GitHub Issues/Discussions データを含める |

---

## overview - プロジェクト概要

プロジェクトの概要ページを生成します。

```bash
shirokuma-docs overview -p .
```

### 設定例

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

---

## その他の生成コマンド

### search-index - 検索インデックス

全文検索用の JSON インデックスを生成します。ポータルの検索機能で使用します。

```bash
shirokuma-docs search-index -p .
```

### link-docs - API-テスト双方向リンク

API ドキュメントとテストケースの関連付けドキュメントを生成します。

```bash
shirokuma-docs link-docs -p .
```

### screenshots - スクリーンショットテスト

`@screen` アノテーションから Playwright のスクリーンショットテストを生成します。

```bash
# テストファイルを生成
shirokuma-docs screenshots -p .

# 生成後にテストを実行
shirokuma-docs screenshots -p . -r
```

### details - 詳細ページ

Screen, Component, Action, Table の各要素の詳細ページを生成します。

```bash
shirokuma-docs details -p .
```

### impact - 変更影響分析

指定したファイルや要素を変更した場合の影響範囲を表示します。

```bash
# テーブル形式で表示
shirokuma-docs impact -t "UserProfile"

# JSON で出力
shirokuma-docs impact -t "src/lib/actions/auth.ts" -f json

# 探索深度を制限
shirokuma-docs impact -t "Button" -d 3
```

| オプション | 説明 |
|-----------|------|
| `-t, --target <name>` | 分析対象のアイテム名またはファイルパス |
| `-d, --max-depth <n>` | 最大探索深度（デフォルト: 5） |
| `-f, --format <type>` | `table`（デフォルト）/ `json` / `html` |
| `-o, --output <dir>` | 出力ディレクトリ |

> `impact` コマンドは他の生成コマンドと異なり `-p` / `-c` オプションがありません。

### api-tools - MCP ツールドキュメント

Model Context Protocol (MCP) ツールのドキュメントを生成します。

```bash
shirokuma-docs api-tools -p .
```

### i18n - 翻訳ファイルドキュメント

i18n 翻訳ファイルの一覧と翻訳率のドキュメントを生成します。

```bash
shirokuma-docs i18n -p .
```

### packages - モノレポパッケージドキュメント

モノレポの共有パッケージに関するドキュメントを生成します。

```bash
shirokuma-docs packages -p .
```

---

## md - Markdown ドキュメント管理

LLM に最適化された Markdown ドキュメントの結合・検証・分析を行うサブコマンド群です。

> **設定ファイル**: `md` コマンドは `shirokuma-docs.config.yaml` とは別の独立した設定ファイル `shirokuma-md.config.yaml` を使用します。詳しくは [設定ファイルリファレンス](../config.md#md-コマンドの設定) を参照してください。

| サブコマンド | 機能 | 主なオプション |
|-------------|------|---------------|
| `md build` | ドキュメントを結合してビルド | `-c`, `-o`, `--include`, `--exclude`, `-w`（watch モード） |
| `md validate` | Markdown の検証 | `-c`, `--severity` |
| `md analyze` | ドキュメント構造の分析 | `-c`, `-g`（グラフ）, `-m`（メトリクス）, `-s`（分割提案） |
| `md lint` | Markdown の lint | `-c`, `--fix`, `--suggest-fixes`, `--format` |
| `md list` | ドキュメントファイル一覧 | `-c`, `-f`（format）, `--layer`, `--type`, `--group-by`, `--sort-by` |
| `md extract` | 単一ファイルから情報抽出 | `-t`（type, 必須）, `-i`（input, 必須）, `--dry-run`, `--validate` |
| `md batch-extract` | 複数ファイルから一括抽出 | `-t`（type, 必須）, `-i`（input-dir, 必須）, `-p`（pattern）, `-r`（report） |

```bash
# ドキュメントを結合してビルド（watch モード）
shirokuma-docs md build -w

# lint して自動修正
shirokuma-docs md lint --fix

# ドキュメント構造の分析（メトリクス + 分割提案）
shirokuma-docs md analyze -m -s
```

各サブコマンドの詳細は `shirokuma-docs md <subcommand> --help` で確認できます。
