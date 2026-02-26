# shirokuma-docs ユーザーマニュアル

shirokuma-docs は、Next.js + TypeScript プロジェクト向けの**ドキュメント自動生成 CLI ツール**です。

コードアノテーション（JSDoc タグ）からドキュメントを自動抽出し、API リファレンス、ER 図、テストケース一覧、機能マップなどを一括で生成します。また、GitHub Projects / Issues / Discussions との統合により、AI（Claude Code）との協働作業を効率化します。

## このマニュアルの対象読者

- shirokuma-docs をこれから導入するユーザー
- Claude Code と組み合わせてプロジェクト管理を行いたい開発者
- 各コマンドの具体的な使い方を知りたい人

## 目次

### 導入

- [Getting Started](getting-started.md) - インストールから初回セットアップまで
- [Next.js クイックスタート](quickstart-nextjs.md) - 新規プロジェクト作成から開発開始まで

### コマンドリファレンス

- [ドキュメント生成コマンド](commands/generation.md) - typedoc, schema, deps, portal など
- [検証（Lint）コマンド](commands/linting.md) - lint-tests, lint-code, lint-docs など
- [GitHub 連携コマンド](commands/github.md) - issues, projects, discussions
- [セッション管理コマンド](commands/session.md) - session start / end / check
- [管理・ユーティリティコマンド](commands/management.md) - init, update, update-skills, repo-pairs

### ガイド

- [プラグイン管理](plugins.md) - スキル・ルールのインストールと更新
- [設定ファイルリファレンス](config.md) - shirokuma-docs.config.yaml の全設定項目
- [トラブルシューティング](troubleshooting.md) - よくある問題と対処法

## shirokuma-docs でできること

### 1. ドキュメント自動生成

コードからドキュメントを自動的に生成します。手動で Markdown を書く必要はありません。

| コマンド | 生成物 |
|---------|-------|
| `typedoc` | TypeDoc API ドキュメント |
| `schema` | Drizzle ORM → DBML / SVG ER 図 |
| `deps` | 依存関係グラフ |
| `test-cases` | テストケース一覧 |
| `coverage` | テストカバレッジレポート |
| `feature-map` | 機能階層マップ（画面→コンポーネント→アクション→テーブル） |
| `portal` | ダークテーマ HTML ポータルサイト |
| `overview` | プロジェクト概要ページ |
| `screenshots` | Playwright スクリーンショットテスト |
| `search-index` | 全文検索用 JSON インデックス |
| `link-docs` | API-テスト双方向リンク |
| `details` | 各要素の詳細ページ |
| `impact` | 変更影響分析 |
| `api-tools` | MCP ツールドキュメント |
| `i18n` | i18n 翻訳ファイルドキュメント |
| `packages` | モノレポ共有パッケージドキュメント |

### 2. コード品質検証

コードやドキュメントの品質をチェックし、問題を早期に発見します。

| コマンド | 検証内容 |
|---------|---------|
| `lint-tests` | `@testdoc` コメントの品質 |
| `lint-coverage` | 実装ファイルとテストの対応 |
| `lint-docs` | ドキュメント構造（OVERVIEW.md 等） |
| `lint-code` | コードアノテーション・構造 |
| `lint-annotations` | アノテーション整合性 |
| `lint-structure` | プロジェクト構造・命名規則 |
| `lint-workflow` | AI ワークフロー規約 |

### 3. GitHub 連携

GitHub Projects V2 と統合し、Issue / Discussion の管理を CLI から一括で行えます。

| コマンド | 機能 |
|---------|------|
| `issues` | Issues の CRUD + Projects フィールド統合 |
| `projects` | Projects V2 の管理 |
| `discussions` | Discussions の管理 |
| `repo` | リポジトリ情報・ラベル管理 |
| `github-data` | GitHub データ JSON 出力 |
| `adr` | ADR（Architecture Decision Records）管理 |
| `session` | セッション管理（引き継ぎ + ステータス一括更新） |
| `discussion-templates` | Discussion テンプレート生成 |

### 4. AI 協働支援

Claude Code のスキル・ルールをバンドルし、AI との協働作業を標準化します。

- **スキル**: 実装、レビュー、コミット、PR 作成などの作業パターン
- **ルール**: ブランチ運用、コミットスタイル、GitHub 連携などの規約
- **フック**: 破壊的コマンドの自動ブロック

**日常ワークフロー（スキルを使った場合）:**

```
/starting-session        セッション開始（前回引き継ぎ + Issue 一覧）
  ↓
/creating-item           Issue 作成 → /working-on-issue に自動チェーン
  （または直接 /working-on-issue #42）
  ↓
/planning-on-issue       計画策定（未計画 Issue のみ）
  ↓
実装（coding-nextjs / designing-shadcn-ui）
  ↓
/committing-on-issue     コミット・プッシュ
  ↓
/creating-pr-on-issue    PR 作成 + セルフレビュー
  ↓
/ending-session          セッション終了（引き継ぎ保存）
```

詳しくは [プラグイン管理](plugins.md) を参照してください。

### 5. 管理・ユーティリティ

| コマンド | 機能 |
|---------|------|
| `init` | 設定ファイルの初期化 + スキル/ルールのインストール |
| `update` | スキル・ルール・フック更新 + キャッシュ同期（`update-skills --sync` の短縮形） |
| `update-skills` | スキル・ルール更新（詳細オプション付き） |
| `generate` | 全ドキュメント一括生成 |
| `md` | LLM 最適化 Markdown 管理（build, validate, analyze, lint 等） |
| `repo-pairs` | Private/Public リポジトリペア管理 |

## 必要な環境

| 要件 | バージョン |
|------|-----------|
| Node.js | 20.0.0 以上 |
| pnpm | 推奨（npm / yarn も可） |
| GitHub CLI (`gh`) | GitHub 連携を使う場合に必要 |
| Claude Code | AI 協働機能を使う場合に必要 |

## クイックスタート

```bash
# 1. インストール（ワンライナー推奨）
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash -s -- --lang ja

# 2. プロジェクトの初期化（Claude Code ユーザーはスキル・ルールも一緒に）
cd your-project
shirokuma-docs init --with-skills --with-rules --lang ja

# 3. ドキュメントを一括生成
shirokuma-docs generate
```

詳しいセットアップ手順は [Getting Started](getting-started.md) を参照してください。
