---
name: managing-github-items
description: GitHubプロジェクトアイテム（Issue / Discussion）を作成・管理する内部エンジン。creating-item スキルから委任されて使用。直接起動は非推奨（creating-item を使用）。
allowed-tools: Bash, AskUserQuestion, Read, Write
---

# GitHub アイテムの管理

Issue / Discussion の作成と仕様 Discussion の管理を行う。

## コマンドルーティング

| コマンド | 用途 | リファレンス |
|---------|------|------------|
| `/create-item` | Issue / DraftIssue 作成 | [reference/create-item.md](reference/create-item.md) |
| `/create-spec` | 仕様 Discussion 作成 | [reference/create-spec.md](reference/create-spec.md) |

## パターン判定

| ユーザー発話 | ルート先 |
|-------------|---------|
| 「Issue にして」「Issue 作って」「フォローアップ Issue」 | `/create-item` |
| 引数なしで呼び出された場合 | `/create-item`（コンテキスト自動推定） |
| 「仕様を書いて」「Spec 作成」「Discussion で提案」 | `/create-spec` |

## 共通リファレンス

| ドキュメント | 内容 | 読み込みタイミング |
|-------------|------|-------------------|
| [reference/github-operations.md](reference/github-operations.md) | GitHub CLI コマンド・ステータスワークフロー | 全コマンド共通 |
| [reference/create-item.md](reference/create-item.md) | Issue 作成ワークフロー・コンテキスト推定 | `/create-item` 実行時 |
| [reference/create-spec.md](reference/create-spec.md) | 仕様 Discussion 作成ワークフロー | `/create-spec` 実行時 |

## エラーハンドリング

| エラー | 対処 |
|--------|------|
| プロジェクト未作成 | "`/setting-up-project` でプロジェクトを作成してください" |
| gh 未認証 | "`gh auth login` を実行してください" |
| フィールド未発見 | デフォルト値を使用、ユーザーに警告 |
| Issue 未発見 | "Issue #{n} が見つかりません。番号を確認してください" |
| Ideas カテゴリなし | General に作成、Ideas 追加を提案 |
| Discussions 無効 | `.claude/specs/` に保存 |
| 必須フィールド空 | ユーザーに入力を求める |

## 注意事項

- 新規アイテムには必ず必須フィールド（Status, Priority）を設定
- XL アイテムは分割を検討するようユーザーに提案
- 仕様タイトルには "[Spec]" プレフィックスを付与（フィルタリング用）
