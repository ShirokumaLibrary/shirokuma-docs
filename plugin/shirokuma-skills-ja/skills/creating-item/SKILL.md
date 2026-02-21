---
name: creating-item
description: 会話コンテキストからIssue/Discussionを自動推定して作成し、working-on-issueへの自動チェーンを提供する。「Issue にして」「Issue 作って」「フォローアップ Issue」「仕様作成して」で使用。
allowed-tools: Bash, AskUserQuestion, Read, Write, TodoWrite
---

# アイテム作成

会話コンテキストから Issue メタデータを自動推定し、`managing-github-items` に委任して作成。作成後は `working-on-issue` への自動チェーンを提供する。

## いつ使うか

- `working-on-issue` の Step 1a（テキスト説明のみ）から委任された場合
- ユーザーが直接「Issue にして」「Issue 作って」「フォローアップ Issue」と言った場合
- 「仕様作成して」「Spec 作成」の場合

## 責務分担

| レイヤー | 責務 |
|---------|------|
| `creating-item` | ユーザーインターフェース。コンテキスト分析、メタデータ推定、チェーン制御 |
| `managing-github-items` | 内部エンジン。CLI コマンド実行、フィールド設定、バリデーション |

## ワークフロー

### ステップ 1: コンテキスト分析

会話コンテキストから以下を推定:

| フィールド | 推定ソース |
|-----------|-----------|
| タイトル | ユーザーの発話から簡潔に |
| Issue Type | 内容のキーワード（[reference/chain-rules.md](reference/chain-rules.md) 参照） |
| Priority | 影響範囲・緊急度 |
| Size | 作業量 |
| エリアラベル | 影響するコード領域 |

### ステップ 2: `managing-github-items` に委任

コンテキスト分析後、事前確認なしで即座に Skill ツールで `managing-github-items` を起動:

```
Skill: managing-github-items
Args: create-item --title "{タイトル}" --issue-type "{Type}" --labels "{area:ラベル}" --priority "{Priority}" --size "{Size}"
```

### ステップ 3: チェーン判定

作成完了後、AskUserQuestion で次のアクションを確認:

| 選択肢 | アクション |
|--------|----------|
| 計画を立てる | `working-on-issue` に `#{number}` で委任（計画から開始） |
| Backlog に置く | 終了（ステータスは Backlog のまま） |

チェーン判定の詳細は [reference/chain-rules.md](reference/chain-rules.md) 参照。

## スキル内ドキュメント

| ドキュメント | 内容 | 読み込みタイミング |
|-------------|------|-------------------|
| [reference/chain-rules.md](reference/chain-rules.md) | チェーン判定ルール・推定ロジック | アイテム作成時 |

## 次のステップ

`working-on-issue` チェーンではなく直接起動された場合:

```
アイテム作成完了: #{number}
→ `/working-on-issue #{number}` で計画から開始
→ またはそのまま Backlog に配置
```

## 注意事項

- 作成後にユーザーに案内し、修正指示の機会を提供する
- Issue 作成の CLI 実行は `managing-github-items` に委任（直接 CLI を叩かない）
- `managing-github-items` の `reference/create-item.md` に詳細な推定テーブルがある
