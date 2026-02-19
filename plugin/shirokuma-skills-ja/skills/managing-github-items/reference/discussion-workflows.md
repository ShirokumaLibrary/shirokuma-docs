# Discussion ワークフロー詳細

`discussions-usage` ルールの概要セクション補足。

## Knowledge → Rule 抽出ワークフロー

パターンや解決策が実践で確認されたら、AI 向けの Rule として抽出する。

```
1. 発見: 作業中にパターンを発見（コードレビュー、デバッグ、実装）
2. Knowledge Discussion: Knowledge カテゴリにコンテキストと根拠を記録
3. 検証: 2回以上のセッションでパターンの有効性を確認
4. Rule 提案: Knowledge Discussion から簡潔で実行可能なルールを抽出
5. Rule 作成: managing-rules スキルでルールファイルを作成
6. 相互参照: ルール内に Discussion # リンクをコメントで追加
```

| ステップ | アクション | 出力 |
|---------|----------|------|
| 発見 | 繰り返しパターンを特定 | メモまたはコメント |
| 記録 | Knowledge Discussion を作成 | Discussion #{N} |
| 検証 | 異なるコンテキストでの有効性を確認 | Discussion 更新 |
| 抽出 | AI が読める形式のルールに蒸留 | Rule `.md` ファイル |
| リンク | ルール内にソース Discussion を参照 | `<!-- Source: Discussion #{N} -->` |

**Discussion ステップをスキップしてよい場合**: 自明なパターンのみ（例: タイポ修正、明白な命名規約）。「なぜ」が重要なら先に Discussion を書く。

## 既存 Discussion の検索

新規 Discussion 作成前に、既存のものを検索して重複を避ける。

```bash
# キーワード検索
shirokuma-docs discussions search "{keyword}"

# カテゴリでフィルタ
shirokuma-docs discussions list --category Knowledge
shirokuma-docs discussions list --category Research
shirokuma-docs discussions list --category ADR

# 最近の引き継ぎ（セッションコンテキスト用）
shirokuma-docs discussions list --category Handovers --limit 5
```

**検索するタイミング**:
- 新しいセッション開始時（最近の Handovers を確認）
- Knowledge Discussion 作成前（既存のカバレッジを確認）
- 調査開始前（Research カテゴリの先行作業を確認）
- パターン調査時（Knowledge で関連する知見を検索）

## 相互参照

- Discussions は Issues と番号空間を共有（#1, #2, ...）
- コミットで参照: "See Discussion #30"
- トラッキングのため Projects に追加
