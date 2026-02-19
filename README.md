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
npm install -g @shirokuma-library/shirokuma-docs
# または
pnpm add -g @shirokuma-library/shirokuma-docs
```

## はじめかた

> **前提**: git リポジトリ + GitHub リモート + `gh auth login` 済み。詳細は [Getting Started ガイド](docs/guide/getting-started.md) を参照。

```bash
# 0. GitHub Projects V2 に必要なスコープを追加
gh auth refresh -s read:project,project

# 1. 初期化（スキル・ルール付き）
cd /path/to/your/project
shirokuma-docs init --with-skills --with-rules --lang ja

# 2. 設定ファイルをカスタマイズ
#    shirokuma-docs.config.yaml を開いてパスを編集

# 3. GitHub Project セットアップ
shirokuma-docs projects create-project --title "プロジェクト名" --lang ja

# 4. ドキュメント生成
shirokuma-docs generate

# 5. Claude Code と連携
#    新しいセッションを開始 → /working-on-issue #42
```

詳細は [Getting Started ガイド](docs/guide/getting-started.md) を参照してください。

## 機能概要

| カテゴリ | コマンド数 | 例 |
|---------|-----------|-----|
| ドキュメント生成 | 16 | `typedoc`, `schema`, `deps`, `portal`, `test-cases`, `coverage` |
| 検証 | 7 | `lint-tests`, `lint-coverage`, `lint-docs`, `lint-code` |
| GitHub 連携 | 5 | `issues`, `projects`, `discussions`, `session start/end` |
| 管理 | 8 | `init`, `generate`, `update`, `adr`, `repo-pairs`, `md` |
| Claude Code スキル | 22 | `working-on-issue`, `committing-on-issue`, `creating-pr-on-issue` |
| Claude Code ルール | 21 | Git, GitHub, Next.js, shirokuma-docs 規約 |

全コマンド一覧は [コマンドリファレンス](docs/guide/commands/) を、スキル・ルール一覧は [プラグイン管理](docs/guide/plugins.md) を参照してください。

## 動作要件

- **Node.js**: 20.0.0 以上
- **Claude Code**: スキル・ルール連携に必要
- **gh CLI**: GitHub コマンドに必要（`gh auth login` 要）

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
