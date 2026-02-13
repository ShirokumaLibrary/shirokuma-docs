# /create-item ワークフロー

Issue または DraftIssue を作成する。引数なしの場合、会話コンテキストから自動推定する。

```
/create-item                    # コンテキスト自動推定モード
/create-item "タイトル"          # タイトル指定
/create-item --type feature     # タイプ指定
```

## ステップ 1: 詳細収集

引数あり: 指定されたタイトルを使用。
引数なし: 会話コンテキストから以下を推定する。

| 推定対象 | 情報源 | 推定方法 |
|---------|--------|---------|
| タイトル | 直前のユーザー発話 | 「Issue にして」の前に述べられた問題・機能の要約 |
| Type | 会話コンテキスト | バグ報告 → Bug、機能要望 → Feature、技術的負債 → Chore |
| Priority | 会話コンテキスト | 緊急性の表現（「すぐ」→ High、通常 → Medium） |
| 本文 | 会話コンテキスト全体 | 概要・背景・タスクを構造化 |
| Size | タスク推定 | タスク数・影響範囲から推定（デフォルト S） |

推定結果を AskUserQuestion で確認してから作成する。

タイプ一覧:

| タイプ | ラベル |
|--------|--------|
| Feature | `feature` |
| Bug | `bug` |
| Chore | `chore` |
| Docs | `docs` |
| Research | `research` |

## ステップ 2: 本文生成

```markdown
## 概要
{何を、なぜ行うか}

## 背景
{この Issue が存在する理由、現状の問題、関連する技術的制約や依存関係}

## タスク
- [ ] タスク 1

## 成果物
{"完了" の定義}
```

> **背景セクション**: 計画レビュー（`planning-on-issue` ステップ 4）で、Issue 本文だけから計画を評価する。背景・制約・依存関係が不足していると、レビュアーが NEEDS_REVISION を返す。軽量な Issue（タイポ修正等）では 1 行で十分。

## ステップ 3: フィールド設定

| フィールド | 選択肢 | デフォルト |
|-----------|--------|----------|
| Priority | Critical / High / Medium / Low | Medium |
| Size | XS / S / M / L / XL | S |
| Status | Backlog / Ready | Backlog |

## ステップ 4: 作成

```bash
# Issue（推奨 — #番号をサポート）
shirokuma-docs issues create \
  --title "Title" --body "Body" \
  --labels feature \
  --field-status "Backlog" --priority "Medium" --type "Feature" --size "M"

# DraftIssue（軽量）
shirokuma-docs projects create \
  --title "Title" --body "Body" \
  --field-status "Backlog" --priority "Medium"
```

## ステップ 5: 結果表示

```markdown
## アイテム作成完了
**Issue:** #123 | **タイプ:** Feature | **優先度:** Medium | **ステータス:** Backlog
```
