# Issue Types リファレンス

## 概要

GitHub Issue Types は**組織レベル**の設定で、全リポジトリの Issue を分類する。Projects のカスタム "Type" フィールドの代替。

**設定 URL**: `https://github.com/organizations/{org}/settings/issue-types`

**要件**: 組織オーナーロール（UI 設定時）。API 操作には `admin:org` OAuth スコープが必要。

## 推奨タイプ

### デフォルトタイプ（事前設定済み）

| タイプ | 説明 | 色 |
|-------|------|-----|
| Task | 具体的な作業項目 | Default |
| Bug | 予期しない問題や動作 | Default |
| Feature | リクエスト、アイデア、新機能 | Default |

### カスタムタイプ（手動追加）

| タイプ | 説明 | 色 |
|-------|------|-----|
| Chore | メンテナンス、設定、ツール、リファクタリング | Gray |
| Docs | ドキュメントの改善・追加 | Blue |
| Research | 調査、スパイク、探索 | Purple |

## 移行: Project Type フィールド → Issue Types

Project で "Type" single-select フィールドを使用している場合、ビルトイン Issue Types に移行する。

### Step 1: Issue Types の作成

1. `https://github.com/organizations/{org}/settings/issue-types` にアクセス
2. Chore、Docs、Research タイプを追加（Bug、Feature、Task は既存）

### Step 2: 既存 Issue にタイプを割り当て

各オープン Issue について、現在の Project Type フィールド値に合わせて Issue Type を設定:

```bash
shirokuma-docs issues list
```

GitHub UI（Issue サイドバー → Type ドロップダウン）または API で設定:

```bash
gh api graphql \
  -H 'GraphQL-Features: issue_types' \
  -f query='
    mutation($issueId: ID!, $typeId: ID!) {
      updateIssue(input: {id: $issueId, issueTypeId: $typeId}) {
        issue { number title }
      }
    }
  ' -f issueId="$ISSUE_NODE_ID" -f typeId="$TYPE_ID"
```

### Step 3: Project Type フィールドの削除

全 Issue の移行完了後:

1. Project Settings → Custom Fields
2. "Type" single-select フィールドを削除
3. `shirokuma-docs issues` コマンドが Project Type フィールドを参照している場合は更新

### Step 4: ワークフローの更新

Project "Type" フィールドを参照しているファイルを更新:

- `.claude/rules/shirokuma/github/project-items.md` — Type フィールド定義
- `plugin/shirokuma-skills-ja/skills/github-project-setup/reference/custom-fields.md` — Type フィールドリファレンス
- `plugin/shirokuma-skills-ja/skills/github-project-setup/scripts/setup-project.py` — Type フィールド作成
- `plugin/shirokuma-skills-ja/skills/github-project-setup/SKILL.md` — Step 6 Type フィールド一覧

## 注意事項

- Issue Types は**組織**リポジトリでのみ利用可能（個人リポジトリは対象外）
- Issue Types は組織内の全リポジトリで共有
- 組織オーナーのみが Issue Types を作成・変更可能
- Issue Types は Issue サイドバーに表示（Project ボードのフィールドではない）
- Project "Type" カスタムフィールドと Issue Types は別システム — 移行中は一時的に共存可能
- 組織あたり最大25のカスタム Issue Types が作成可能
