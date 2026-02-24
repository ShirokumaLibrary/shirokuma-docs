# デザインワークタイプ リファレンス

`working-on-issue` から `designing-shadcn-ui` スキルに委任する際のガイド。

## 委任タイミング

| 判定条件 | 委任先 |
|---------|--------|
| キーワード: `デザイン`, `UI`, `印象的`, `design`, `memorable` | `designing-shadcn-ui` |
| キーワード: `ランディングページ`, `landing page` | `designing-shadcn-ui` |
| ジェネリックな見た目を避けたい場合 | `designing-shadcn-ui` |

## TDD 非適用

デザインワークタイプでは TDD は適用しない。代わりに:

1. `designing-shadcn-ui` がデザインディスカバリー → 実装 → ビルド検証を実行
2. ビルドが通ることを確認

## designing-shadcn-ui が提供するもの

- デザインディスカバリーワークフロー（美学方向性の決定）
- 特徴的なタイポグラフィ・カラー・モーションのガイドライン
- アンチパターン回避（ジェネリック AI 美学の排除）
- shadcn/ui コンポーネントのカスタマイズパターン

## チェーン

```
designing-shadcn-ui → Commit → PR → Review
```

デザイン完了後は通常のコミット→PR→レビューチェーンに合流する。
