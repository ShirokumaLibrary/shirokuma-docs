# /create-spec ワークフロー

Ideas カテゴリに仕様 Discussion を作成する。

```
/create-spec "機能名"
/create-spec                    # インタラクティブモード
```

## ステップ 1: カテゴリ ID 取得

```bash
OWNER=$(gh repo view --json owner -q '.owner.login')
REPO=$(gh repo view --json name -q '.name')
CATEGORY_ID=$(gh api graphql -f query='{
  repository(owner: "'$OWNER'", name: "'$REPO'") {
    discussionCategories(first: 10) { nodes { id name } }
  }
}' | jq -r '.data.repository.discussionCategories.nodes[] | select(.name == "Ideas") | .id')
```

## ステップ 2: 詳細収集

ユーザーに確認: タイトル、概要、課題、提案、代替案（任意）

## ステップ 3: 本文生成

> テンプレートの見出し・内容は `output-language` ルールの指定言語で記述すること。`github-writing-style` ルールにも従う。

```markdown
## 概要
{概要}

## 課題
{問題}

## 提案する解決策
{提案}

## 検討した代替案
{代替案 or "なし"}

## オープンクエスチョン
- [ ] {質問}

---
ステータス: ドラフト
```

## ステップ 4: Discussion 作成

```bash
gh api graphql \
  -f query='mutation($repoId: ID!, $catId: ID!, $title: String!, $body: String!) {
    createDiscussion(input: {repositoryId: $repoId, categoryId: $catId, title: $title, body: $body}) {
      discussion { url number }
    }
  }' \
  -f repoId="$REPO_ID" -f catId="$CATEGORY_ID" \
  -f title="[Spec] $TITLE" -f body="$BODY"
```

## ローカルフォールバック

Discussions が利用不可の場合:

```bash
mkdir -p .claude/specs
echo "$BODY" > .claude/specs/$(date +%Y-%m-%d)-{slug}.md
```
