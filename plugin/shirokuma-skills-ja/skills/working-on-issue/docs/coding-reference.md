# 実装ワークタイプ リファレンス

`working-on-issue` から `coding-nextjs` スキルに委任する際のガイド。

## 委任タイミング

| 判定条件 | 委任先 |
|---------|--------|
| ラベル: `area:frontend`, `area:cli` + Next.js 関連 | `coding-nextjs` |
| キーワード: `implement`, `create`, `add`, `実装`, `作成`, `追加` | `coding-nextjs` |
| キーワード: `fix`, `bug`, `修正`, `バグ` | `coding-nextjs` or 直接編集 |

## TDD 統合

実装ワークタイプでは TDD 共通ワークフローが**必須**:

```
[TDD: テスト設計→作成→確認] → coding-nextjs → [TDD: テスト実行→検証]
```

`working-on-issue` が TDD ステップをオーケストレートし、`coding-nextjs` は実装のみに集中する。

## coding-nextjs が提供するもの

- Next.js 固有のテンプレート（Server Actions, コンポーネント, ページ）
- フレームワーク固有のパターン（Better Auth, Drizzle ORM, CSP, CSRF 等）
- 大規模機能実装のガイドライン

## 直接編集の場合

以下は `coding-nextjs` に委任せず直接編集:

- 設定ファイルの変更
- 単純なバグ修正（1-2ファイル）
- リファクタリング
- Chore タスク

直接編集でも TDD 適用の場合はテストが必要。
