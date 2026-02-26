<!-- managed-by: shirokuma-docs@0.1.0 -->

# ブランチワークフロー

## ブランチモデル

| ブランチ | 役割 | 分岐元 | マージ先 | 永続 | 保護 |
|----------|------|--------|----------|------|------|
| `main` | 本番リリース（タグ付け） | — | — | はい | はい |
| `develop` | 統合（PR デフォルト） | `main`（初期） | `main`（リリース PR） | はい | はい |
| `feat/*`, `fix/*`, `chore/*`, `docs/*` | 日常作業 | `develop` | `develop`（PR） | いいえ | いいえ |
| `hotfix/*` | 緊急本番修正 | `main` | `main`（PR）→ `develop` にチェリーピック | いいえ | いいえ |
| `epic/*` | エピック統合（integration） | `develop` | `develop`（最終 PR） | いいえ | いいえ |
| `release/X.x` | 旧メジャーバージョン保守（必要時のみ） | tag | ブランチ上に留まる（tag） | 条件付き | はい |

**基本原則:**
- `develop` = GitHub 上の**デフォルトブランチ**（PR ターゲット）
- `main` は**本番状態**のみを反映
- フィーチャーブランチは常に `develop` から分岐
- `develop` や `main` への直接コミット禁止

## ベースブランチ検出

日常作業のベースブランチは `develop`。動的に検出する:

```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
```

上記が失敗する場合（shallow clone 等）のフォールバック:

```bash
gh repo view --json defaultBranchRef -q .defaultBranchRef.name
```

結果は `develop` であるべき。`main` が返る場合、デフォルトブランチの変更が未実施（下記のデフォルトブランチ設定を参照）。

## ブランチ命名

### フィーチャーブランチ

```
{type}/{issue-number}-{slug}
```

| Type | 用途 |
|------|------|
| `feat` | 機能追加、機能拡張 |
| `fix` | バグ修正 |
| `chore` | 設定、リファクタ、調査 |
| `docs` | ドキュメント |

**slug ルール:**
- Issue タイトルから生成
- 小文字、ケバブケース
- 最大40文字
- 英語のみ

**例:**
```
feat/39-branch-workflow-rules
fix/34-cross-repo-project-resolution
chore/27-plugin-directory-structure
docs/32-session-naming-convention
```

### バッチブランチ

```
{type}/{issue-numbers}-batch-{slug}
```

複数の XS/S Issue をまとめて処理する場合に使用。適格性・品質基準・詳細は `batch-workflow` ルール参照。

**type の決定:** 単一 type → その type を使用。混在 → `chore`。

**例:**
```
chore/794-795-798-807-batch-docs-fixes
feat/101-102-batch-button-components
```

### Integration ブランチ（エピック）

エピック（親 Issue + サブ Issue 構成）で使用する統合ブランチ。

```
epic/{parent-issue-number}-{slug}
```

- `develop` から分岐し、サブ Issue のブランチは integration ブランチから分岐する
- サブ Issue の PR は integration ブランチをベースにする
- 全サブ Issue 完了後、integration ブランチから `develop` への最終 PR を作成

```
develop
  └── epic/958-octokit-migration           ← integration
        ├── feat/953-replace-graphql-client  ← サブ Issue
        └── fix/954-update-error-handling    ← サブ Issue
```

詳細は `epic-workflow` リファレンス参照。

### ホットフィックスブランチ

```
hotfix/{issue-number}-{slug}
```

`main` から分岐。`develop` ではない。緊急本番修正のみに使用。

### リリース保守ブランチ

```
release/{major}.x
```

旧メジャーバージョンにパッチが必要な場合にタグから作成。通常のリリースでは使用しない。

## 日常ワークフロー

1. `develop` から分岐
2. セッション中にコミット
3. ブランチをプッシュし `develop` への PR を作成
4. レビュー → マージ

### 1. ブランチ作成（セッション開始時）

ユーザーが作業アイテムを選択したとき:

```bash
git checkout develop
git pull origin develop
git checkout -b {type}/{issue-number}-{slug}
```

- `{type}` は Issue のラベルやコンテキストから判断（feature→`feat`, bug→`fix`, chore→`chore`, docs→`docs`）
- `{slug}` は Issue タイトルから生成

### 2. 開発（セッション中）

- 説明的なメッセージで頻繁にコミット
- コミットに Issue 番号を参照: `feat: ブランチワークフロールールを追加 (#39)`
- 既存のコミットメッセージ規約に従う

### 3. PR 作成（セッション終了時）

作業完了またはセッション終了時:

```bash
git push -u origin {branch-name}
shirokuma-docs issues pr-create --base develop --title "{title}" --body-file /tmp/shirokuma-docs/pr-body.md
```

- PR タイトル: 簡潔なサマリー（70文字以内）
- PR 本文: サマリー箇条書き、テスト計画、関連 Issue
- Issue リンク: 本文に `Closes #{number}` または `Refs #{number}` を含める
- ステータスは **Review** へ

### 4. レビューとマージ

- ユーザーが GitHub で PR をレビュー
- **AI はユーザーの明示的な指示なしに PR をマージしてはならない** — PreToolUse フックで強制（下記の破壊的コマンド保護を参照）
- スカッシュマージ（推奨）はユーザー承認後のみ
- マージ後にブランチを削除
- ステータスは **Done** へ

## ホットフィックスワークフロー

通常の develop サイクルを待てない緊急本番修正用。

### 使用条件

- 本番環境（`main`）の致命的バグ
- 即時パッチが必要なセキュリティ脆弱性
- 通常のバグ修正には使用しない（`develop` 経由の通常ワークフローを使用）

### 手順

```bash
# 1. main から分岐
git checkout main
git pull origin main
git checkout -b hotfix/{issue-number}-{slug}

# 2. 修正してコミット

# 3. main への PR を作成
git push -u origin hotfix/{issue-number}-{slug}
shirokuma-docs issues pr-create --base main --title "hotfix: {description}" --body-file /tmp/shirokuma-docs/pr-body.md

# 4. main へのマージ後、develop に同期
git checkout develop
git pull origin develop
git cherry-pick {hotfix-commit-hash}
# または: git merge main（複数コミットの場合）
git push origin develop
```

**重要:** `main` へのマージ後、必ず `develop` に修正を同期し退行を防止する。

## リリースワークフロー

リリースは `develop` を `main` にマージして作成する。

### 手順

```bash
# 1. develop から main への PR を作成
shirokuma-docs issues pr-create --base main --head develop --title "release: v{version}" --body-file /tmp/shirokuma-docs/pr-body.md

# 2. PR マージ後、リリースにタグ付け
git checkout main
git pull origin main
git tag v{version}
git push origin v{version}
```

### タグ規約

```
v{major}.{minor}.{patch}
```

全バージョンをタグとして記録する。通常のリリースではリリースブランチは作成しない。

## 保守ブランチ

### `release/X.x` の作成条件

以下のすべてを満たす場合のみ:
- 新しいメジャーバージョンがリリース済み
- 旧メジャーバージョンにパッチが必要
- ユーザーが新メジャーバージョンにアップグレードできない

### 使用方法

```bash
# 当該メジャーバージョンの最後のタグから作成
git checkout v1.2.3
git checkout -b release/1.x
git push -u origin release/1.x

# このブランチ上で修正
git checkout release/1.x
git checkout -b fix/{issue-number}-{slug}
# ... 修正して release/1.x への PR

# パッチリリースにタグ付け
git tag v1.2.4
git push origin v1.2.4
```

`release/X.x` を `develop` や `main` にマージしないこと。

## デフォルトブランチ設定

デフォルトブランチを `main` から `develop` に切り替える手順:

### 1. develop ブランチの作成（存在しない場合）

```bash
git checkout main
git checkout -b develop
git push -u origin develop
```

### 2. GitHub でデフォルトブランチを変更

```bash
gh repo edit --default-branch develop
```

または: GitHub Settings > General > Default branch > `develop` に変更

### 3. ローカル HEAD 参照を更新

```bash
git remote set-head origin develop
```

### 4. 両ブランチを保護

`main` と `develop` の両方にブランチ保護ルールを設定:
- マージ前の PR レビューを必須
- ステータスチェックの通過を必須
- 直接プッシュ禁止

## ルール

1. **常に `develop` から分岐**（最新化してから。例外: サブ Issue は integration ブランチから分岐）
2. **1 Issue 1ブランチ**（例外: バッチモードは `batch-workflow` ルール、エピックは `epic-workflow` リファレンス参照）
3. **セッション終了前にプッシュ** — プッシュしていない作業は消失リスクあり
4. **マージには PR が必要**（直接プッシュ禁止）
5. **ユーザー承認なしにマージしない**（PreToolUse フックで強制）
6. **マージ後にブランチ削除** — リポジトリを清潔に保つ
7. **日常作業の PR は `develop` へ** — `main` を直接ターゲットにするのはホットフィックスのみ
8. **全リリースにタグ付け** — 全バージョンを `main` 上のタグとして記録

## 破壊的コマンド保護

PreToolUse フックが破壊的コマンドの実行前に**ブロック**する。これは助言ではなく、ツールレベルでの拒否。

### デフォルトブロックコマンド

`hooks/blocked-commands.json` で定義:

| Rule ID | ブロック対象 | 理由 |
|---------|-------------|------|
| `pr-merge` | `gh pr merge` / `issues merge` | PR マージにはユーザー承認が必要 |
| `force-push` | `git push --force` / `git push -f` | 強制プッシュはリモート履歴を上書き |
| `hard-reset` | `git reset --hard` | 未コミットの変更をすべて破棄 |
| `discard-worktree` | `git checkout .` / `git restore .` | ワーキングツリーの変更を破棄 |
| `clean-untracked` | `git clean -f` | 未追跡ファイルを削除 |
| `force-delete-branch` | `git branch -D` | ブランチを強制削除 |

ブロック時、AI は拒否理由を受け取り、リトライ前にユーザーに承認を求める必要がある。

### プロジェクトオーバーライド

`shirokuma-docs.config.yaml` で特定のコマンドを許可できる:

```yaml
# shirokuma-docs.config.yaml
hooks:
  allow:
    - pr-merge              # gh pr merge / issues merge を許可
    # - force-push          # git push --force を許可
    # - hard-reset          # git reset --hard を許可
    # - discard-worktree    # git checkout/restore . を許可
    # - clean-untracked     # git clean -f を許可
    # - force-delete-branch # git branch -D を許可
```

`hooks.allow` 未設定時はすべてのルールが有効（全ブロック）。コメントを外して特定のコマンドを許可する。

### 誤検知防止

フックはパターンマッチ前にクォート文字列を除去する。`--body "..."` 等の引数内のテキストはブロックをトリガーしない。

### ファイル

- `hooks/hooks.json` — フック登録
- `hooks/blocked-commands.json` — ルール定義（デフォルト設定）
- `hooks/scripts/block-destructive-commands.sh` — フックスクリプト

## エッジケース

| 状況 | アクション |
|------|----------|
| すでにフィーチャーブランチ | 続行、ブランチ作成をスキップ |
| 1セッションに複数 Issue | ブランチを分ける、または関連項目をグループ化 |
| develop に未コミット変更 | スタッシュまたはコミット後にブランチ作成 |
| Issue のブランチが既存 | 既存ブランチに切り替え |
| develop とコンフリクト | PR 前にリベース: `git rebase develop` |
| デフォルトブランチが未変更（`main`のまま） | デフォルトブランチ設定セクションに従う |
| 本番で緊急修正が必要 | ホットフィックスワークフローを使用 |
| サブ Issue で integration ブランチが見つからない | `develop` をベースにし警告 |
