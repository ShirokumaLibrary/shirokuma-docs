# shirokuma-docs

Next.js + TypeScript プロジェクト向けのドキュメント自動生成 CLI。Claude Code スキル同梱。

[English](README.en.md)

## インストール

### 推奨: インストーラスクリプト（sudo 不要）

```bash
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash
```

`~/.local/` にインストールされます。Claude Code ユーザーは `~/.local/bin` が PATH に含まれているため追加設定不要です。インストーラが言語を対話的に確認します（`--lang ja` で事前指定も可）。

### npm / pnpm でグローバルインストール

```bash
# npm
npm install -g @shirokuma-library/shirokuma-docs

# pnpm
pnpm add -g @shirokuma-library/shirokuma-docs
```

### インストール確認

```bash
shirokuma-docs --version
# => 0.1.0-alpha.11
```

## はじめかた

### 1. 初期化

```bash
cd /path/to/your/project
shirokuma-docs init --with-skills --with-rules --lang ja
```

`shirokuma-docs.config.yaml` の作成、プラグインのインストール、`.claude/rules/shirokuma/` へのルールデプロイを一括で実行します。

### 2. 設定ファイルのカスタマイズ

`shirokuma-docs.config.yaml` を開き、自分のプロジェクト構成に合わせてパスを編集します:

```yaml
project:
  name: "MyProject"           # プロジェクト名
  description: "..."

typedoc:
  entryPoints:
    - "./src/lib/actions"      # ソースコードのパスに変更
    - "./src/db/schema"
  tsconfig: "./tsconfig.json"

schema:
  sources:
    - path: "./src/db/schema"  # Drizzle ORM スキーマのパス
```

**Drizzle ORM を使わない場合**は `schema` セクションをまるごと削除してください。
`deps`、`testCases`、`lintDocs` 等のオプションセクションも不要なら削除できます。`generate` 実行時は設定されたセクションのみ動作します。

### 3. GitHub Project セットアップ

```bash
# Project 作成 + フィールド設定を一括実行
shirokuma-docs projects create-project --title "プロジェクト名" --lang ja
```

> **Note:** `--lang` はフィールドの説明文（description）のみ翻訳します。オプション名（Backlog, Critical 等）は CLI コマンド互換性のため常に英語です。

Discussions と必須ラベル（feature, bug, chore, docs, research）はコマンド実行時に自動で作成されます。以下は GitHub API の制限により手動設定が必要です:

| 項目 | 設定場所 |
|------|---------|
| Discussion カテゴリ | リポジトリ Settings → Discussions |
| Project ワークフロー | Project Settings → Workflows |

**Discussion カテゴリ**（リポジトリ Settings → Discussions → カテゴリ新規作成）:

| カテゴリ | Emoji | Format | 用途 |
|---------|-------|--------|------|
| Handovers | 🔄 | Open-ended discussion | セッション間の引き継ぎ記録 |
| ADR | 📋 | Open-ended discussion | Architecture Decision Records |
| Knowledge | 📚 | Open-ended discussion | 確認されたパターン・解決策 |
| Research | 🔍 | Open-ended discussion | 調査が必要な事項 |

**Project ワークフロー**（Project Settings → Workflows）:

| ワークフロー | ターゲットステータス |
|-------------|-------------------|
| Item closed | Done |
| Pull request merged | Done |

セットアップ後の検証:

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
/github-project-setup このプロジェクトのセットアップをお願いします
```

スキルが対話的に Project 作成、フィールド設定、手動設定のガイドを実行します。

</details>

### 4. ドキュメント生成

```bash
# 全コマンド一括実行
shirokuma-docs generate

# 個別実行
shirokuma-docs test-cases -p .
shirokuma-docs deps -p .
shirokuma-docs portal -p .
```

### 5. Claude Code との連携

新しい Claude Code セッションを開始するとスキルが利用可能になります（例: `/working-on-issue #42`）。

詳細は[はじめかたガイド](docs/guide/getting-started.md)を参照してください。

## アップグレード

```bash
# ステップ 1: CLI を更新
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash
# または: npm update -g @shirokuma-library/shirokuma-docs

# ステップ 2: プラグイン・ルール・キャッシュを更新
cd /path/to/your/project
shirokuma-docs update

# ステップ 3: 新しい Claude Code セッションを開始
```

### トラブルシューティング

`shirokuma-docs update` 後にスキルが更新されない場合:

```bash
# キャッシュを強制リフレッシュ
claude plugin uninstall shirokuma-skills-ja@shirokuma-library --scope project
claude plugin install shirokuma-skills-ja@shirokuma-library --scope project
```

## アンインストール

```bash
# インストーラスクリプト経由の場合
rm -f ~/.local/bin/shirokuma-docs
rm -rf ~/.local/share/shirokuma-docs

# npm 経由の場合
npm uninstall -g @shirokuma-library/shirokuma-docs
```

プロジェクトごとのファイルを削除する場合:

```bash
# ルールと設定ファイルを削除
rm -rf .claude/rules/shirokuma/
rm -f shirokuma-docs.config.yaml

# グローバルキャッシュからプラグインを削除
claude plugin uninstall shirokuma-skills-ja@shirokuma-library --scope project
claude plugin uninstall shirokuma-hooks@shirokuma-library --scope project
```

## 機能

### ドキュメント生成（16 コマンド）

| コマンド | 説明 |
|---------|------|
| `typedoc` | TypeDoc API ドキュメント |
| `schema` | Drizzle ORM → DBML/SVG ER図 |
| `deps` | 依存関係グラフ（dependency-cruiser） |
| `test-cases` | Jest/Playwright テストケース抽出 |
| `coverage` | Jest カバレッジダッシュボード |
| `portal` | ダークテーマ HTML ドキュメントポータル |
| `search-index` | 全文検索用 JSON インデックス |
| `overview` | プロジェクト概要ページ |
| `feature-map` | 機能階層マップ（4層構造） |
| `link-docs` | API-テスト双方向リンク |
| `screenshots` | Playwright スクリーンショット生成 |
| `details` | 各要素の詳細ページ（Screen, Component, Action, Table） |
| `impact` | 変更影響分析 |
| `api-tools` | MCP ツールドキュメント |
| `i18n` | i18n 翻訳ファイルドキュメント |
| `packages` | モノレポ共有パッケージドキュメント |

### 検証（7 コマンド）

| コマンド | 説明 |
|---------|------|
| `lint-tests` | @testdoc コメント品質チェック |
| `lint-coverage` | 実装-テスト対応チェック |
| `lint-docs` | ドキュメント構造検証 |
| `lint-code` | コードアノテーション・構造検証 |
| `lint-annotations` | アノテーション整合性検証 |
| `lint-structure` | プロジェクト構造検証 |
| `lint-workflow` | AI ワークフロー規約検証 |

### GitHub 連携（5 コマンド）

| コマンド | 説明 |
|---------|------|
| `issues` | GitHub Issues 管理（Projects フィールド統合） |
| `projects` | GitHub Projects V2 管理 |
| `discussions` | GitHub Discussions 管理 |
| `repo` | リポジトリ情報・ラベル管理 |
| `discussion-templates` | Discussion テンプレート生成（多言語対応） |

### セッション管理

| コマンド | 説明 |
|---------|------|
| `session start` | セッション開始（引き継ぎ + Issues + PRs 一括取得） |
| `session end` | セッション終了（引き継ぎ保存 + ステータス更新） |
| `session check` | Issue-Project ステータス整合性チェック（`--fix` で自動修正） |

### 管理・ユーティリティ

| コマンド | 説明 |
|---------|------|
| `init` | 設定ファイル初期化（`--with-skills --with-rules` 対応） |
| `generate` | 全コマンド一括実行 |
| `update` | スキル・ルール・キャッシュ更新（`update-skills --sync` の短縮形） |
| `update-skills` | スキル・ルール更新（詳細オプション付き） |
| `adr` | ADR 管理（GitHub Discussions 連携） |
| `repo-pairs` | Public/Private リポジトリペア管理 |
| `github-data` | GitHub データ JSON 生成 |
| `md` | LLM 最適化 Markdown 管理（build, validate, analyze, lint, list, extract） |

## Claude Code 連携

shirokuma-docs は **shirokuma-skills** プラグイン（EN/JA）を同梱しており、Claude Code 向けのスキル・エージェント・ルールを提供します。

### 主要スキル（全 22 件）

スラッシュコマンドで起動: `/<skill-name>`（例: `/committing-on-issue`、`/working-on-issue #42`）

| カテゴリ | スキル | 用途 |
|---------|--------|------|
| **オーケストレーション** | `working-on-issue` | ワークディスパッチャー（エントリポイント） |
| | `planning-on-issue` | Issue 計画策定 |
| **セッション** | `starting-session` | 作業セッション開始 |
| | `ending-session` | セッション終了・引き継ぎ保存 |
| **開発** | `nextjs-vibe-coding` | Next.js 向け TDD 実装 |
| | `frontend-designing` | 印象的な UI デザイン |
| | `codebase-rule-discovery` | パターン発見・規約提案 |
| | `reviewing-on-issue` | コード / セキュリティレビュー |
| | `best-practices-researching` | ベストプラクティス調査 |
| | `claude-config-reviewing` | 設定ファイル品質チェック |
| **Git / GitHub** | `committing-on-issue` | ステージ・コミット・プッシュ |
| | `creating-pr-on-issue` | プルリクエスト作成 |
| | `managing-github-items` | Issue / Discussion 作成 |
| | `showing-github` | プロジェクトデータ表示 |
| | `github-project-setup` | プロジェクト初期セットアップ |
| **設定管理** | `managing-skills` | スキル作成・更新 |
| | `managing-agents` | エージェント作成・更新 |
| | `managing-rules` | ルール作成・更新 |
| | `managing-plugins` | プラグイン作成・更新 |
| | `managing-output-styles` | 出力スタイル管理 |
| **その他** | `project-config-generator` | プロジェクト設定ファイル生成 |
| | `publishing` | repo-pairs 経由のパブリックリリース |

### ルール（全 21 件）

`.claude/rules/shirokuma/` にデプロイ。以下をカバー:
- Git コミットスタイルとブランチワークフロー
- GitHub プロジェクトアイテム管理と Discussion 活用
- Next.js ベストプラクティス（技術スタック、既知の問題、テスト、Tailwind v4）
- shirokuma-docs CLI 呼び出しとプラグインキャッシュ管理
- メモリ運用と設定ファイル作成

## 設定ファイル

`shirokuma-docs init` で `shirokuma-docs.config.yaml` が生成されます。各セクションにはインラインコメントで説明が記載されています。

| セクション | 用途 | 必須 |
|-----------|------|------|
| `project` | プロジェクト名・説明 | はい |
| `output` | 出力ディレクトリ | はい |
| `typedoc` | TypeDoc API ドキュメント | いいえ |
| `schema` | Drizzle ORM ER図 | いいえ |
| `deps` | 依存関係グラフ | いいえ |
| `testCases` | テストケース抽出（Jest/Playwright） | いいえ |
| `portal` | ドキュメントポータル | いいえ |
| `lintDocs` / `lintCode` / `lintStructure` | 検証ルール | いいえ |
| `github` | GitHub Projects / Discussions 連携 | いいえ |
| `adr` | ADR（Architecture Decision Records） | いいえ |

不要なセクションは削除できます。設定されたセクションのみが有効です。全スキーマは[設定ファイルリファレンス](docs/guide/config.md)を参照してください。

## 出力構造

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

## 動作要件

- **Node.js**: 20.0.0 以上
- **Claude Code**: スキル・ルール連携に必要
- **gh CLI**: GitHub コマンドに必要（`gh auth login` 要）

### オプション依存

| ツール | 用途 | インストール |
|--------|------|-------------|
| graphviz | 依存関係グラフ SVG | `apt install graphviz` |
| typedoc | API ドキュメント | `npm i -D typedoc typedoc-plugin-markdown` |
| dependency-cruiser | 依存関係分析 | `npm i -D dependency-cruiser` |
| drizzle-dbml-generator | DBML 生成 | `npm i -D drizzle-dbml-generator` |

## ライセンス

MIT

サードパーティライセンスは [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。
