# shirokuma-docs

AI 駆動の開発ワークフロー管理 CLI。Claude Code スキル同梱。TypeScript プロジェクト向けドキュメント自動生成も対応。

[English](README.en.md)

## インストール

```bash
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash
```

インストール方法の詳細（npm/pnpm、前提条件、GitHub 認証の設定）は [Getting Started ガイド](docs/guide/getting-started.md) を参照してください。

## はじめかた

> **前提**: Node.js 20.0.0 以上 + git リポジトリ + GitHub リモート。前提条件の詳細は [Getting Started ガイド](docs/guide/getting-started.md#前提条件) を参照。

```bash
# 1. 初期化（スキル・ルール付き）
cd /path/to/your/project
shirokuma-docs init --with-skills --with-rules --lang ja

# 2. 設定ファイルをカスタマイズ
#    shirokuma-docs.config.yaml を開いてパスを編集

# 3. GitHub Project セットアップ
shirokuma-docs projects create-project --title "プロジェクト名" --lang ja

# 4. Claude Code と連携
#    新しいセッションを開始 → /working-on-issue #42

# 5. (任意) ドキュメント生成
shirokuma-docs generate
```

詳細は [Getting Started ガイド](docs/guide/getting-started.md) を参照してください。

## 機能概要

| カテゴリ | コマンド数 | 例 |
|---------|-----------|-----|
| GitHub 連携 | 5 | `issues`, `projects`, `discussions`, `session start/end` |
| Claude Code スキル | 22 | `working-on-issue`, `committing-on-issue`, `creating-pr-on-issue` |
| Claude Code ルール | 21 | Git, GitHub, ワークフロー, shirokuma-docs 規約 |
| ドキュメント生成 | 16 | `typedoc`, `schema`, `deps`, `portal`, `test-cases`, `coverage` |
| 検証 | 7 | `lint-tests`, `lint-coverage`, `lint-docs`, `lint-code` |
| 管理 | 8 | `init`, `generate`, `update`, `adr`, `repo-pairs`, `md` |

全コマンド一覧は [コマンドリファレンス](docs/guide/commands/) を、スキル・ルール一覧は [プラグイン管理](docs/guide/plugins.md) を参照してください。

## 動作要件

- **Node.js**: 20.0.0 以上
- **Claude Code**: スキル・ルール連携に必要
- **GITHUB_TOKEN**: GitHub コマンドに必要（`gh auth login` でも可）

## ドキュメント

| ガイド | 内容 |
|--------|------|
| [Getting Started](docs/guide/getting-started.md) | インストール・初期化・GitHub セットアップ |
| [設定ファイルリファレンス](docs/guide/config.md) | `shirokuma-docs.config.yaml` の全項目 |
| [コマンドリファレンス](docs/guide/commands/) | 全コマンドの詳細 |
| [プラグイン管理](docs/guide/plugins.md) | スキル・ルール・フックの管理 |
| [トラブルシューティング](docs/guide/troubleshooting.md) | よくある問題と対処法 |

## ライセンス

MIT

サードパーティライセンスは [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) を参照してください。
