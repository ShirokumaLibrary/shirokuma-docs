# Getting Started

shirokuma-docs のインストールからプロジェクトへの導入までを説明します。

## インストール

### 方法 1: ワンライナーインストール（推奨）

```bash
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash
```

言語を事前に指定する場合:

```bash
# 日本語
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash -s -- --lang ja

# 英語
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash -s -- --lang en
```

> `--lang` を省略した場合は対話的に言語を選択できます。パイプ経由（`curl ... | bash`）で `--lang` を省略するとデフォルトで英語版（en）がインストールされます。

`~/.local/` にインストールされます。Claude Code ユーザーは `~/.local/bin` が既に PATH に含まれているため、追加設定は不要です。

### 方法 2: npm / pnpm でグローバルインストール

```bash
# npm
npm install -g @shirokuma-library/shirokuma-docs

# pnpm
pnpm add -g @shirokuma-library/shirokuma-docs
```

### インストールの確認

```bash
shirokuma-docs --version
# => 0.2.0-alpha.5
```

## 前提条件

| ソフトウェア | バージョン | 用途 |
|-------------|-----------|------|
| Node.js | 20.0.0 以上 | 実行環境 |
| `GITHUB_TOKEN` | — | GitHub 連携コマンドに必要（推奨） |
| GitHub CLI (`gh`) | 最新版 | 認証のフォールバック手段（任意） |
| Claude Code | 最新版 | AI 協働機能（スキル・ルール）に必要 |

### GitHub 認証の設定

**方法 1: `GITHUB_TOKEN` 環境変数（推奨）**

GitHub Personal Access Token を環境変数に設定します。`gh` CLI のインストールは不要です:

```bash
export GITHUB_TOKEN="ghp_xxxxx"
```

必要なスコープ: `repo`, `read:project`, `project`

> `read:project` は `session start` での Issue 一覧取得、`project` は `issues create` でのプロジェクトボードへの追加に必要です。
> このスコープが不足していると Issue 一覧が空になるなど、初見では原因がわかりにくいエラーが発生します。

**方法 2: `gh auth login`（フォールバック）**

GitHub CLI がインストール済みの場合、`gh auth token` の出力をフォールバックとして利用します:

```bash
gh auth login
gh auth refresh -s read:project,project
```

## プロジェクトの初期化

プロジェクトのルートディレクトリで `init` コマンドを実行します。

### 基本的な初期化

```bash
cd your-project
shirokuma-docs init
```

これにより以下が作成されます:

- `shirokuma-docs.config.yaml` - 設定ファイル

### スキル・ルール付きの初期化（Claude Code ユーザー向け）

Claude Code と組み合わせて使う場合は、スキルとルールも一緒にインストールします:

```bash
shirokuma-docs init --with-skills --with-rules --lang ja
```

| オプション | 効果 |
|-----------|------|
| `--with-skills` | Claude Code 用のスキルファイル + 安全フック（`shirokuma-hooks`）をインストール |
| `--with-rules` | Claude Code 用のルールファイルを `.claude/rules/shirokuma/` にデプロイ |
| `--lang ja` | 言語を日本語に設定（`en` で英語） |
| `-f, --force` | 既存ファイルを強制上書き |

インストールされるファイル:

```
your-project/
├── shirokuma-docs.config.yaml    # 設定ファイル
└── .claude/
    ├── settings.json             # 言語設定
    └── rules/
        └── shirokuma/            # ルールファイル群
```

スキルプラグイン（`shirokuma-skills-ja` 等）と安全フック（`shirokuma-hooks`）はグローバルキャッシュ（`~/.claude/plugins/cache/`）にインストールされます。プロジェクトローカルにはコピーされません。

> **`--with-skills` と `--with-rules` の関係**: ルールはスキルプラグインに同梱されていますが、`.claude/rules/` に展開しないと Claude Code に認識されません。**両方を指定する**のが推奨です。

## アップグレード

### ステップ 1: CLI を更新

```bash
# ワンライナーインストーラ（再実行で上書き更新）
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash

# npm の場合
npm update -g @shirokuma-library/shirokuma-docs
```

### ステップ 2: プラグイン・ルール・キャッシュを更新

プロジェクトディレクトリで実行します:

```bash
cd your-project
shirokuma-docs update
```

プロジェクトローカルのルール再デプロイとグローバルキャッシュの同期を一括で実行します。詳しくは [プラグイン管理](plugins.md#プラグインの更新) を参照してください。

### ステップ 3: Claude Code セッションを再起動

更新後は新しい Claude Code セッションを開始してください。キャッシュの読み込みはセッション起動時に行われます。

### アップグレードのトラブルシューティング

`shirokuma-docs update` 後にスキルが更新されない場合:

```bash
# キャッシュを強制リフレッシュ
claude plugin uninstall shirokuma-skills-ja@shirokuma-library --scope project
claude plugin install shirokuma-skills-ja@shirokuma-library --scope project
```

marketplace が古い状態（`Source: Directory` 等）で最新を取得しない場合:

```bash
# marketplace を再登録して fresh clone を取得
claude plugin marketplace remove shirokuma-library
claude plugin marketplace add ShirokumaLibrary/shirokuma-plugins
claude plugin install shirokuma-skills-ja@shirokuma-library --scope project
```

その他の問題は [トラブルシューティング](troubleshooting.md) を参照してください。

## 設定ファイルの編集

`shirokuma-docs.config.yaml` を開いてプロジェクトに合わせて設定します。

```yaml
# プロジェクト基本情報
project:
  name: "MyProject"
  description: "プロジェクトの説明"
  version: "1.0.0"
  repository: "https://github.com/org/repo"

# 出力先ディレクトリ
output:
  portal: "docs/portal"
  generated: "docs/generated"
  schema: "docs/schema"
```

設定ファイルの全項目は [設定ファイルリファレンス](config.md) を参照してください。

## 最初のドキュメント生成

### 全コマンド一括実行

```bash
shirokuma-docs generate
```

すべてのドキュメント生成コマンドをまとめて実行します。設定ファイルに記述されたコマンドのみが実行されます。

### 個別コマンドの実行

特定のドキュメントだけ生成したい場合は、個別にコマンドを実行します:

```bash
# テストケース一覧を生成
shirokuma-docs test-cases -p .

# 依存関係グラフを生成
shirokuma-docs deps -p .

# ドキュメントポータルを生成
shirokuma-docs portal -p .
```

### 共通オプション

ドキュメント生成・lint 系コマンドで使える共通オプション（GitHub 連携・セッション系では一部使用不可）:

| オプション | 省略形 | 説明 |
|-----------|--------|------|
| `--project <path>` | `-p` | プロジェクトのパス（デフォルト: カレントディレクトリ） |
| `--config <file>` | `-c` | 設定ファイルのパス（デフォルト: `shirokuma-docs.config.yaml`） |
| `--output <dir>` | `-o` | 出力ディレクトリ |
| `--verbose` | `-v` | 詳細ログを表示 |

> 一部のコマンド（`impact` 等）ではオプション体系が異なります。各コマンドの `--help` で確認してください。

## 出力構造

ドキュメント生成コマンドは、設定ファイルの `output` で指定したディレクトリに出力します:

```
docs/
├── portal/
│   ├── index.html       # ポータルトップページ
│   ├── viewer.html      # Markdown/DBML/SVG ビューア
│   └── test-cases.html  # テストケース一覧
└── generated/
    ├── api/             # TypeDoc Markdown
    ├── api-html/        # TypeDoc HTML
    ├── schema/
    │   ├── schema.dbml
    │   └── schema-docs.md
    ├── dependencies.svg
    ├── dependencies.html
    └── test-cases.md
```

## コード品質チェック

ドキュメントやコードの品質をチェックすることもできます:

```bash
# テストコメントの品質チェック
shirokuma-docs lint-tests -p .

# 実装とテストの対応チェック
shirokuma-docs lint-coverage -p .

# ドキュメント構造の検証
shirokuma-docs lint-docs -p .
```

詳しくは [検証コマンド](commands/linting.md) を参照してください。

## GitHub 連携のセットアップ

GitHub Projects V2 と連携するには、設定ファイルに GitHub セクションを追加します:

```yaml
github:
  discussionsCategory: "Handovers"
  listLimit: 20
```

> **前提**: GitHub Projects V2 がリポジトリに設定されている必要があります。未設定の場合は、Claude Code の `setting-up-project` スキルでセットアップできます。

### Project の作成

```bash
shirokuma-docs projects create-project --title "プロジェクト名" --lang ja
```

> `--lang` はフィールドの説明文（description）のみ翻訳します。オプション名（Backlog, Critical 等）は CLI コマンド互換性のため常に英語です。

Discussions はコマンド実行時に自動で有効化されます。

### 手動設定が必要な項目

以下は GitHub API の制限により手動設定が必要です:

**Issue Types**（Organization 設定 → Issue types: `https://github.com/organizations/{org}/settings/issue-types`）:

デフォルトタイプ（Organization に最初から存在）:

| タイプ | 用途 | 色 |
|--------|------|----|
| Feature | 新機能 | Blue |
| Bug | バグ報告 | Red |
| Task | タスク | Yellow |

以下のカスタムタイプを追加:

| タイプ | Description | 用途 | 色 |
|--------|-------------|------|----|
| Chore | Configuration, tooling, and refactoring | 設定・ツール・リファクタリング | Gray |
| Docs | Documentation improvements | ドキュメント | Green |
| Research | Investigation and validation | 調査・検証 | Purple |
| Evolution | Rule/skill evolution signals and improvement tracking | ルール・スキル進化シグナル | Pink |

> カスタムタイプ追加時はデフォルトタイプとの色の重複を避けること。

**Discussion カテゴリ**（リポジトリ設定 → Discussions → カテゴリ新規作成）:

| カテゴリ | Emoji | 検索ワード | Format | 用途 |
|---------|-------|-----------|--------|------|
| Handovers | 🤝 | handshake | Open-ended discussion | セッション間の引き継ぎ記録 |
| ADR | 📐 | triangular ruler | Open-ended discussion | Architecture Decision Records |
| Knowledge | 💡 | bulb | Open-ended discussion | 確認されたパターン・解決策 |
| Research | 🔬 | microscope | Open-ended discussion | 調査が必要な事項 |
| Reports | 📊 | chart | Open-ended discussion | レビュー・分析レポート（任意） |

**Project ワークフロー**（Project 設定 → Workflows）:

| ワークフロー | ターゲットステータス |
|-------------|-------------------|
| Item closed | Done |
| Pull request merged | Done |

**View リネーム**（Project ページ → View タブ、API 未対応）:

| レイアウト | 推奨名 | 用途 |
|-----------|--------|------|
| TABLE | Board | 全アイテム一覧（デフォルト） |
| BOARD | Kanban | Status でグルーピングしたカンバン |
| ROADMAP | Roadmap | タイムライン表示 |

### セットアップの検証

```bash
shirokuma-docs session check --setup
```

Discussion カテゴリ、Project フィールド、ワークフロー自動化の設定状況を確認できます。

<details>
<summary>AI に委任する場合（コピペ用）</summary>

まず手動で初期化を実行し、スキルとルールを有効にします:

```bash
cd /path/to/your/project
shirokuma-docs init --with-skills --with-rules --lang ja
```

新しい Claude Code セッションを開始し、以下を貼り付けてください:

```
/setting-up-project このプロジェクトのセットアップをお願いします
```

スキルが対話的に Project 作成、フィールド設定、手動設定のガイドを実行します。

</details>

### GitHub コマンドの使用

`GITHUB_TOKEN` が設定済み（または `gh auth login` 済み）であれば、すぐに使えます:

```bash
# Issue 一覧を取得（Projects フィールド付き）
shirokuma-docs issues list

# セッション開始（引き継ぎ + アクティブ Issue 表示）
shirokuma-docs session start
```

詳しくは [GitHub 連携コマンド](commands/github.md) を参照してください。

## 次のステップ

- 各コマンドの詳細 → [ドキュメント生成コマンド](commands/generation.md)
- 品質チェック → [検証コマンド](commands/linting.md)
- GitHub 連携 → [GitHub 連携コマンド](commands/github.md)
- 管理コマンド → [管理・ユーティリティコマンド](commands/management.md)
- AI 協働 → [プラグイン管理](plugins.md)
- 設定の詳細 → [設定ファイルリファレンス](config.md)
