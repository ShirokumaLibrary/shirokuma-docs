# レビューワークタイプ リファレンス

`working-on-issue` から `reviewing-on-issue` スキルに委任する際のガイド。

## 委任タイミング

| 判定条件 | 委任先 |
|---------|--------|
| キーワード: `review`, `レビュー`, `audit`, `セキュリティチェック` | `reviewing-on-issue` |
| PR レビュー依頼 | `reviewing-on-issue` |

## 実行コンテキスト

`reviewing-on-issue` は `context: fork` で実行される（サブエージェント）。メインコンテキストを汚さない。

## TDD 非適用

レビューワークタイプでは TDD は適用しない。

## reviewing-on-issue が提供するもの

- 専門ロール別レビュー（code, security, test, docs, plan）
- Issue / PR コンテキストに基づくレビュー
- レビュー結果の PR コメント投稿

## チェーン

レビューワークタイプは通常のコミット→PR チェーンを**実行しない**（レビュー結果の報告で完了）。

```
reviewing-on-issue → レポート投稿 → 完了
```

## セルフレビュー

`working-on-issue` のステップ 5 でセルフレビューとして自動実行される場合は、`creating-pr-on-issue` のステップ 6 として組み込まれる。
