---
name: showing-github
description: GitHubプロジェクトデータ（ダッシュボード、アイテム、Issue、PR、引き継ぎ、仕様）を表示します。「ダッシュボード」「アイテム確認」「Issue一覧」「PR一覧」「引き継ぎ確認」「仕様一覧」「dashboard」で使用。
allowed-tools: Bash, Read, Glob
---

# GitHub データ表示

ダッシュボード、アイテム、Issue、PR、引き継ぎ、仕様を1つのスキルに統合して表示。

> **リファレンス**: CLI コマンド、ステータスワークフロー、エラーハンドリングは `reference/github-operations.md` 参照。

## /show-dashboard

プロジェクト全体のダッシュボード。GitHub データを集約表示。

```
/show-dashboard              # フルダッシュボード
/show-dashboard --quick      # クイックサマリーのみ
```

### ワークフロー

1. リポジトリ情報取得: `gh repo view --json nameWithOwner -q '.nameWithOwner'`
2. 並列実行:
   - `shirokuma-docs issues list`（ステータス別アイテム + `total_issues` でオープン Issue 数を導出）
   - `shirokuma-docs issues pr-list`（オープン PR 一覧 + 行数から PR 数を導出）
   - `gh api repos/{owner}/{repo}/commits?per_page=5`（最近のコミット）
   - `shirokuma-docs discussions list --category Handovers --limit 3`（最近の引き継ぎ）

### 表示フォーマット

```markdown
# Project Dashboard

**Repository:** {owner}/{repo}
**Generated:** {timestamp}

## Project Items
| Status | Count | Bar |
|--------|-------|-----|
| In Progress | 1 | ██ |
| Backlog | 2 | ████ |

**Total:** {total} | **Completion:** {done/total * 100}%

## Activity
| Metric | Count |
|--------|-------|
| Open Issues | {count} |
| Open PRs | {count} |
| Commits (7d) | {count} |

## Recent Handovers
| Date | Title |
|------|-------|
| {date} | {title} |
```

### クイックモード (--quick)

```markdown
## Quick Status
**Items:** 6 Done / 1 In Progress / 2 Backlog
**Issues:** 3 open | **PRs:** 1 open
**Last commit:** {message} ({time ago})
```

---

## /show-items [フィルター]

GitHub Project アイテムをステータスフィルター付きで表示。

```
/show-items              # アクティブなアイテム（Done/Released 除く）
/show-items all          # Done 含む全アイテム
/show-items ready        # "Ready" ステータスのアイテム
/show-items in-progress  # "In Progress" ステータスのアイテム
```

### ワークフロー

```bash
# デフォルト（オープン Issue）
shirokuma-docs issues list

# フィルター付き
shirokuma-docs issues list --all
shirokuma-docs issues list --status Ready
shirokuma-docs issues list --status "In Progress" --status Ready
```

### 表示フォーマット（グループ化ビュー）

```markdown
## Project Items

**In Progress (1):**
- #9 Task title (XL, Medium)

**Backlog (2):**
- #10 Feature A (M, High)

**Icebox (1):**
- #8 Future enhancement (L, Low)

---
Total: 4 active items
```

### フィルター適用ビュー

```markdown
## Ready Items (2)
| # | Title | Priority | Size |
|---|-------|----------|------|
| #10 | Feature A | High | M |
```

---

## /show-issues [--label X] [--assignee X]

GitHub Issue リストをフィルタリング付きで表示。

```
/show-issues                 # 全オープン Issue
/show-issues --all           # クローズ済み含む
/show-issues --label bug     # ラベルでフィルター
/show-issues --assignee @me  # 自分の Issue
```

### ワークフロー

```bash
gh issue list --state open \
  --json number,title,state,labels,assignees,createdAt,updatedAt \
  --limit 20
```

### 表示フォーマット

```markdown
## Issues

**Filter:** {description} | **Total:** {count}

| # | Title | Labels | Assignee | Updated |
|---|-------|--------|----------|---------|
| #123 | Fix login bug | `bug` | @user | 2d ago |
```

---

## /show-prs [フィルター|番号]

PR 一覧・詳細を表示。

```
/show-prs                  # オープン PR 一覧
/show-prs --state closed   # クローズ済み PR
/show-prs --state merged   # マージ済み PR
/show-prs --state all      # 全 PR
/show-prs 42               # 特定 PR の詳細
```

### ワークフロー

**一覧表示:**

```bash
# デフォルト（オープン PR）
shirokuma-docs issues pr-list

# フィルター付き
shirokuma-docs issues pr-list --state merged --limit 10
shirokuma-docs issues pr-list --state all
```

**詳細表示:**

```bash
shirokuma-docs issues pr-show {number}
```

### 表示フォーマット（一覧）

```markdown
## Pull Requests

**Filter:** {description} | **Total:** {count}

| # | Title | Branch | Review |
|---|-------|--------|--------|
| #42 | feat: 新機能追加 | feat/42-new-feature | APPROVED |
```

### 表示フォーマット（詳細）

```markdown
## PR #{number}: {title}

**ステータス:** {state} | **レビュー:** {review_decision}
**ブランチ:** {head} → {base}

### 概要
{body}

### 変更統計
| ファイル | 追加 | 削除 |
|---------|------|------|
| src/file.ts | +50 | -10 |

### リンクされた Issue
- #42 (Closes)
```

---

## /show-handovers [件数]

過去のセッション引き継ぎ情報を表示。

```
/show-handovers       # 直近5件
/show-handovers 10    # 直近10件
/show-handovers all   # 全件
```

### データソース（優先順）

1. GitHub Discussions（Handovers カテゴリ）
2. ローカルファイル（`.claude/sessions/*.md`）

### ワークフロー

```bash
# Discussions から
shirokuma-docs discussions list --category Handovers --limit {count}

# 特定の引き継ぎを取得
shirokuma-docs discussions get {number}

# ローカルファイル（フォールバック）
ls -t .claude/sessions/*-handover.md 2>/dev/null | head -{count}
```

### 表示フォーマット（リストビュー）

```markdown
## Recent Handovers

**2025-01-25** - Blog CMS article management
   Summary: Implemented post CRUD with draft/publish workflow
   Next: Add category filtering
   Issues: #10, #12

**2025-01-24** - Session management skill
   Summary: Created session skills
   Next: Test with Discussions
```

### 引き継ぎコンテンツのパース

| セクション | パターン |
|-----------|---------|
| Summary | `## Summary` 以降のテキスト |
| Issues | `## Related` 以降の `#\d+` にマッチする行 |
| Next Steps | `## Next Steps` 以降のチェックボックスアイテム |

---

## /show-specs [--recent] ["キーワード"]

Ideas カテゴリの仕様 Discussion を表示。

```
/show-specs              # 全仕様
/show-specs --recent     # 直近5件
/show-specs "keyword"    # 検索
```

### ワークフロー

```bash
gh api graphql -f query='{
  repository(owner: "{owner}", name: "{repo}") {
    discussions(first: 20, categoryId: "{ideas_id}", orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { number title createdAt author { login } comments { totalCount } url }
    }
  }
}'
```

### 表示フォーマット

```markdown
## Specifications

| # | Title | Author | Comments | Created |
|---|-------|--------|----------|---------|
| #10 | [Spec] Auth Flow | @user | 5 | 1w ago |
```

### ステータスインジケーター

```
Draft | Review | Approved | Rejected | Implementing
```

---

## エラーハンドリング

| エラー | 対処 |
|--------|------|
| プロジェクト未発見 | Issue/PR/コミットのみ表示 |
| フィルター不一致 | 「該当なし。`/show-items` を試してください。」 |
| Discussion/カテゴリなし | ローカルファイルを確認またはスキップ |
| 引き継ぎなし | 「引き継ぎ履歴なし。`/ending-session` で開始。」 |
| 仕様なし | 「仕様なし。`/create-spec` で作成。」 |
| gh 未認証 | `gh auth login` を案内 |

## リファレンスドキュメント

### スキル内ドキュメント

| ドキュメント | 内容 | 読み込みタイミング |
|-------------|------|-------------------|
| [reference/github-operations.md](reference/github-operations.md) | GitHub CLI コマンド・ステータスワークフロー | 全サブコマンド共通 |

## 注意事項

- 全データはオンデマンド取得（キャッシュなし）
- アイテムは各ステータス内で Priority 順にソート
- Discussion とローカル引き継ぎの両方が存在する場合は統合
- 仕様は慣例として "Ideas" カテゴリに格納
- 要求が曖昧な場合は AskUserQuestion でサブコマンド（dashboard/items/issues/prs/handovers/specs）を確認
- 表示系タスクのため TodoWrite は不要
