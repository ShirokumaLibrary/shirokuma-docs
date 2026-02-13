---
name: publishing
description: shirokuma-docs repo-pairs CLIを使用して公開リリースを管理します。ステータスチェック、ドライランプレビュー、リリース実行、.shirokumaignore設定を処理します。
allowed-tools: Bash, Read, Grep, Glob, AskUserQuestion, TodoWrite
---

# パブリッシング

`shirokuma-docs repo-pairs` CLI で Private → Public リポジトリへのリリースを管理。

## いつ使うか

以下の場合に自動起動:
- "publish" や "release" で公開リポに反映したい場合
- "公開リポに反映", "パブリックに出して", "リリースして"
- リリース状況や公開リポとの差分を確認したい場合
- "repo-pairs", ".shirokumaignore", 公開リポ同期に言及した場合

## 前提条件

- `shirokuma-docs` CLI が PATH で利用可能
- `gh` CLI 認証済み（`gh auth status`）
- `shirokuma-docs.config.yaml` がプロジェクトルートに存在
- リポジトリペアが設定済み（`shirokuma-docs repo-pairs list`）

## CLI リファレンス

### コアコマンド

```bash
# 設定済みリポペア一覧
shirokuma-docs repo-pairs list

# リリース状況確認（両リポの最新タグ）
shirokuma-docs repo-pairs status <alias>

# リリースプレビュー（変更なし）
shirokuma-docs repo-pairs release <alias> --tag <version> --dry-run

# リリース実行
shirokuma-docs repo-pairs release <alias> --tag <version>

# デバッグ用の詳細出力
shirokuma-docs repo-pairs release <alias> --tag <version> -v
```

### 新しいリポペアの初期化

```bash
shirokuma-docs repo-pairs init <alias> \
  --private <owner/repo> \
  --public <owner/repo> \
  --exclude ".claude/" --exclude "docs/internal/"
```

設定は `shirokuma-docs.config.yaml` に保存される。

## ワークフロー

### ステップ 1: リリース前チェック

リリース前に以下のチェックを実行:

```bash
# 1. クリーンな作業ディレクトリを確認
git status

# 2. 現在のリリース状況確認
shirokuma-docs repo-pairs status <alias>

# 3. 除外対象を確認
cat .shirokumaignore

# 4. リリースプレビュー
shirokuma-docs repo-pairs release <alias> --tag <version> --dry-run
```

ユーザーに報告:
- 現在の公開バージョン（最新タグ）
- 提案する新バージョン
- 除外されるファイル
- 未コミット変更（あれば先にコミットが必要）

### ステップ 2: バージョン決定

`AskUserQuestion` でバージョン番号をユーザーに確認。

セマンティックバージョニングに従う:

| 変更の種類 | バンプ | 例 |
|-----------|--------|-----|
| 破壊的変更 | メジャー | v1.0.0 → v2.0.0 |
| 新スキル/ルール、新機能 | マイナー | v0.1.0 → v0.2.0 |
| バグ修正、タイポ修正 | パッチ | v0.1.0 → v0.1.1 |

前回リリースからの変更に基づきバージョンを提案:

```bash
# 前回タグからのコミット確認（Private リポ）
git log $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~10")..HEAD --oneline

# Private にタグがない場合、Public リポの最新タグを確認
shirokuma-docs repo-pairs status <alias>
```

### ステップ 3: リリース実行

```bash
shirokuma-docs repo-pairs release <alias> --tag <version>
```

CLI の処理内容:
1. Private リポを一時ディレクトリにクローン
2. `.shirokumaignore` と `--exclude` パターンに該当するファイルを除外
3. `.shirokumaignore` 自体と `.claude/`（デフォルト除外）を除外
4. Public リポにタグ付きでプッシュ

### ステップ 4: リリース後検証

```bash
# リリースタグを検証
shirokuma-docs repo-pairs status <alias>

# GitHub API で公開リポの内容を確認
gh repo view <public-owner/repo> --json description
gh api repos/<public-owner/repo>/git/trees/main?recursive=1 -q '.tree[].path' | head -30
```

ユーザーに報告:
- 作成されたリリースタグ
- 公開リポ URL
- 公開リポのファイル数

## ファイル除外

### .shirokumaignore

公開リリースから除外するパターンを記述する gitignore 構文ファイル。

```
# 開発用設定
CLAUDE.md
shirokuma-docs.config.yaml

# リポ固有の CI/テンプレート
.github/
```

### デフォルト除外（CLI が常時適用）

| パターン | 理由 |
|---------|------|
| `.shirokumaignore` | メタファイル、公開不要 |
| `.claude/` | プロジェクト固有の AI 設定 |
| `.mcp.json` | ローカル MCP サーバー設定 |

### 設定経由の除外（repo-pairs init）

`repo-pairs init` 時に設定したパターンは設定に保存され常時適用:

```bash
shirokuma-docs repo-pairs list  # 設定済みの除外パターンを表示
```

## エラーハンドリング

| エラー | 原因 | 修正 |
|-------|------|------|
| `repo pair not found` | エイリアス未設定 | `repo-pairs init` を実行 |
| `tag already exists` | バージョンリリース済み | バージョンを上げる |
| `working directory not clean` | 未コミット変更あり | コミットまたは stash |
| `authentication failed` | gh 未ログイン | `gh auth login` を実行 |
| `public repo not found` | リポ未作成 | GitHub でリポを先に作成 |
| `.shirokumaignore not supported` | CLI バージョンが古い | 手動ワークフロー（下記）を使用 |

## 手動ワークフロー（フォールバック）

`repo-pairs release` が失敗した場合、または `.shirokumaignore` が未サポートの場合:

```bash
ALIAS="<alias>"
PUBLIC_REPO="<owner/repo>"
VERSION="<version>"

TMPDIR=$(mktemp -d)
rsync -a \
  --exclude='.git' \
  --exclude='.claude/' \
  --exclude='.github/' \
  --exclude='.shirokumaignore' \
  --exclude='CLAUDE.md' \
  --exclude='shirokuma-docs.config.yaml' \
  --exclude='.mcp.json' \
  "$(pwd)/" "$TMPDIR/"

cd "$TMPDIR"
git init && git add -A
git commit -m "$VERSION: Release"
git tag "$VERSION"
git remote add origin "git@github.com:$PUBLIC_REPO.git"
git push -u origin main --tags --force
cd - && rm -rf "$TMPDIR"
```

**重要**: `--force` プッシュ前に必ずユーザーに確認。

## 注意事項

- `TodoWrite` で進捗管理（4ステップ）
- ドライラン（`--dry-run`）なしでリリースを実行しない
- 作業ディレクトリがクリーンでない状態でリリースしない

## クイックコマンド

```bash
# 状況確認
"release status" / "リリース状況確認"

# ドライラン
"preview release" / "リリースプレビュー"

# 実行
"release v0.2.0" / "v0.2.0 をリリース"

# フルワークフロー
"publish to public repo" / "パブリックに反映"
```
