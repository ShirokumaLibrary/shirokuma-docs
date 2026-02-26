# 検証（Lint）コマンド

コードやドキュメントの品質をチェックするコマンド群です。CI/CD に組み込んだり、開発中に手動で実行したりして使います。

## 共通オプション

すべての lint コマンドで使えるオプション:

| オプション | 省略形 | 説明 |
|-----------|--------|------|
| `--project <path>` | `-p` | プロジェクトパス |
| `--config <file>` | `-c` | 設定ファイルパス |
| `--format <format>` | `-f` | 出力形式（下記参照） |
| `--output <file>` | `-o` | 出力ファイルパス |
| `--strict` | `-s` | strict モード（エラーがあれば終了コード 1） |
| `--verbose` | `-v` | 詳細ログ |

### `--format` の選択肢

ほとんどのコマンドは `terminal`（デフォルト）/ `json` / `summary` の 3 種類です。

| コマンド | 選択肢 | デフォルト |
|---------|--------|-----------|
| `lint-tests` | `terminal` / `json` / `summary` | `terminal` |
| `lint-coverage` | `terminal` / `json` / `summary` | `terminal` |
| `lint-docs` | `terminal` / `json` / `summary` | `terminal` |
| `lint-code` | `terminal` / `json` / `summary` | `terminal` |
| `lint-annotations` | `terminal` / `json` / `summary` | `terminal` |
| `lint-structure` | `yaml` / `json` / `terminal` | **`yaml`** |
| `lint-workflow` | `terminal` / `json` / `summary` | `terminal` |

> `lint-structure` のみデフォルトが `yaml` です。他のコマンドとは異なるので注意してください。

### `--strict` モードについて

デフォルトではエラーがあっても終了コード 0 で終了します。`--strict` を付けると、エラーがあれば終了コード 1 になります。CI での利用に便利です。

設定ファイルでもデフォルト値を指定できます（例: `lintTests.strict: true`）。CLI の `--strict` フラグは設定ファイルの値を上書きします。

> **例外**: `lint-coverage` のみデフォルトで strict が有効です（`strict: true`）。無効にするには設定ファイルで `lintCoverage.strict: false` を指定します。

```bash
# CI 用: エラーがあれば失敗
shirokuma-docs lint-tests -p . -s
```

---

## lint-tests - テストコメント品質チェック

テストファイルの `@testdoc` コメントの品質をチェックします。

```bash
shirokuma-docs lint-tests -p .
```

### チェック内容

- `@testdoc` コメントが存在するか
- コメント内容が適切か（空でないか、日本語かどうか等）
- 重複した `@testdoc` がないか

### 設定例

```yaml
lintTests:
  rules:
    testdoc-required: { severity: "warning" }
    testdoc-japanese: { severity: "warning" }
    duplicate-testdoc: { severity: "error" }
```

### 追加オプション

| オプション | 説明 |
|-----------|------|
| `--coverage-threshold <number>` | `@testdoc` カバー率の最小閾値（%） |
| `-i, --ignore <patterns...>` | 無視するファイルパターン |

---

## lint-coverage - 実装-テスト対応チェック

実装ファイルに対応するテストファイルが存在するかチェックします。

```bash
shirokuma-docs lint-coverage -p .
```

### 設定例

```yaml
lintCoverage:
  enabled: true
  conventions:
    - source: "apps/web/lib/actions/*.ts"
      test: "apps/web/__tests__/lib/actions/*.test.ts"
  exclude:
    - "apps/web/components/ui/**"    # shadcn/ui は除外
    - "**/types.ts"
```

`conventions` でソースファイルとテストファイルのパスパターンの対応を定義します。

---

## lint-docs - ドキュメント構造検証

OVERVIEW.md などの手動ドキュメントの構造（セクション構成、リンク整合性）をチェックします。

```bash
shirokuma-docs lint-docs -p .
```

### チェック内容

- 必須ドキュメントの存在チェック
- 必須セクション（見出し）の存在チェック
- 内部リンクの整合性チェック
- 文字数の範囲チェック

### 設定例

```yaml
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
```

---

## lint-code - コード構造検証

コードのアノテーション（JSDoc タグ）や構造をチェックします。Server Actions の JSDoc タグが正しく付いているかなどを検証します。

```bash
shirokuma-docs lint-code -p .
```

---

## lint-annotations - アノテーション整合性検証

`@usedComponents`, `@screen`, `@component` などのアノテーション間の整合性をチェックします。

```bash
# チェックのみ
shirokuma-docs lint-annotations -p .

# 問題を自動修正
shirokuma-docs lint-annotations -p . --fix
```

| オプション | 説明 |
|-----------|------|
| `--fix` | 検出した問題を自動的に修正 |

---

## lint-structure - プロジェクト構造検証

プロジェクトのディレクトリ構成や命名規則をチェックします。

```bash
shirokuma-docs lint-structure -p .

# ターミナル形式で出力
shirokuma-docs lint-structure -p . -f terminal
```

> このコマンドの `--format` デフォルトは `yaml` です（他の lint コマンドは `terminal`）。ターミナルで読みやすい出力が必要な場合は `-f terminal` を明示してください。

---

## lint-workflow - AI ワークフロー規約検証

GitHub Issue のフィールド、ブランチ命名規則、コミットメッセージ規約などをチェックします。AI との協働ワークフローの品質を保つために使用します。

```bash
# すべてチェック
shirokuma-docs lint-workflow -p .

# Issue フィールドのみ
shirokuma-docs lint-workflow -p . --issues

# ブランチ命名のみ
shirokuma-docs lint-workflow -p . --branches

# コミット規約のみ
shirokuma-docs lint-workflow -p . --commits
```

| オプション | 説明 |
|-----------|------|
| `--issues` | Issue フィールドのみチェック |
| `--branches` | ブランチ命名のみチェック |
| `--commits` | コミット規約のみチェック |

---

## CI/CD での活用例

```yaml
# GitHub Actions の例
- name: Lint tests
  run: shirokuma-docs lint-tests -p . -s

- name: Lint coverage
  run: shirokuma-docs lint-coverage -p . -s

- name: Lint docs
  run: shirokuma-docs lint-docs -p . -s
```

`--strict` を付けることで、問題があればステップが失敗します。
