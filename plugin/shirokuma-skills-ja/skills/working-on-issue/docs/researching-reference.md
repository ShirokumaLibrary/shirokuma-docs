# リサーチワークタイプ リファレンス

`working-on-issue` から `researching-best-practices` スキルに委任する際のガイド。

## 委任タイミング

| 判定条件 | 委任先 |
|---------|--------|
| キーワード: `research`, `調査`, `best practices`, `ベストプラクティス` | `researching-best-practices` |
| Issue タイプ: Research | `researching-best-practices` |

## 実行コンテキスト

`researching-best-practices` は `context: fork` で実行される（サブエージェント）。メインコンテキストを汚さない。

## TDD 非適用

リサーチワークタイプでは TDD は適用しない。

## researching-best-practices が提供するもの

- Web 検索を活用した技術調査
- ベストプラクティスの比較・分析
- 調査結果の構造化レポート

## チェーン

リサーチはコミット→PR チェーンではなく、Discussion 保存で完了する。

```
researching-best-practices → Discussion (Research) 作成 → 完了
```

## Discussion 保存

調査結果は Research カテゴリの Discussion に保存する:

```bash
shirokuma-docs discussions create \
  --category Research \
  --title "[Research] {トピック}" \
  --body-file research-result.md
```
