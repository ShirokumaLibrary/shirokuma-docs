# チェーン判定ルール

## Issue Type 推定

Issue Type は `managing-github-items` の `reference/create-item.md` の種別判定テーブルに従う。

| キーワード | Type |
|-----------|------|
| 機能追加、新機能、implement、add | Feature |
| バグ、不具合、修正、fix、bug | Bug |
| リファクタリング、設定変更、ツール、chore | Chore |
| ドキュメント、README、docs | Docs |
| 調査、検証、research | Research |

## Priority / Size 推定

`managing-github-items` の `reference/create-item.md` に従う。

## チェーン判定

作成後に `working-on-issue` へチェーンするかの判定:

| 条件 | チェーン | 理由 |
|------|---------|------|
| ユーザーが「すぐにやって」「計画立てて」と明示 | はい | 明示的な意図 |
| 会話中の課題を Issue 化した場合 | 確認 | コンテキストが温かいうちに計画開始可能 |
| バッチ作成（複数 Issue 連続作成） | いいえ | 個別着手は非効率 |
| Priority: Low | いいえ推奨 | 急ぎではない |
| Priority: Critical/High | はい推奨 | 緊急度が高い |

## Backlog 止まりパス

以下の場合は Backlog に置いてチェーンしない:

- ユーザーが明示的に「後で」「あとで」と言った場合
- 複数 Issue のバッチ作成中
- 現在別の Issue が In Progress の場合（WIP 制限）

## `working-on-issue` Step 1a との関係

`working-on-issue` がテキスト説明のみ（Issue 番号なし）で起動された場合、Step 1a で `creating-item` を呼び出す。`creating-item` は Issue を作成して番号を返し、`working-on-issue` が続行する。この場合、チェーン判定は不要（`working-on-issue` が自動的に続行するため）。
