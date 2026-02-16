# GitHub Discussions 活用ガイド

## 目的

Discussions は人間向けの知識を蓄積し、Rules は AI 向けの抽出情報を格納します。

| レイヤー | 対象 | 言語 | 内容 |
|---------|------|------|------|
| Discussions | 人間 | 日本語 | コンテキスト、根拠、詳細 |
| Rules/Skills | AI | 英語 | 簡潔なパターン、コマンド |

## カテゴリ

| カテゴリ | Emoji | Format | 用途 |
|---------|-------|--------|------|
| Handovers | 🤝 | Open-ended discussion | セッション終了時 - `/ending-session` で作成 |
| ADR | 📐 | Open-ended discussion | 確定したアーキテクチャ決定 |
| Knowledge | 💡 | Open-ended discussion | 確認されたパターン・解決策 |
| Research | 🔬 | Open-ended discussion | 調査が必要な事項 |

## ワークフロー

```
Research → ADR（決定の場合）→ Knowledge → Rule 抽出
```

### Discussion → Issue フロー

アイデアや提案は、実装が決定されるまで Discussions に置きます。

```
Discussion（アイデア）→ 実装決定 → Issue（Backlog）→ Ready → In Progress
```

| アクション | タイミング |
|-----------|-----------|
| Discussion を作成 | 新しいアイデア、提案、調査トピック |
| Issue に変換 | チームが実装を決定 |
| Discussion のまま | アイデアが却下、延期、または情報提供のみ |

未決定のアイデアで Issue を作成しないでください。まず Discussions で探索と意思決定を行います。

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

## Auto Memory との使い分け

Claude Code の auto memory に詳細情報を書かない。memory はポインタのみ、詳細は Discussion に記録する。`memory-operations` ルール参照。

## AI の行動指針

1. **検索**: 新規作成前に既存の Discussions を確認
2. **読む**: リサーチ時にコンテキストとして Discussions を確認
3. **書く**: 重要な知見について Discussions を作成
4. **抽出**: パターンが確認されたら Rule を提案
5. **参照**: Rule コメントに Discussion # をリンク

## 本文メンテナンス

Discussion 本文は常に最新の統合版を維持する（`project-items` ルールの「アイテム本文メンテナンス」参照）。

- コメントで追加調査・訂正・新知見を投稿した場合、**本文も即座に統合版として更新する**
- コメントは議論の経緯・履歴として残す
- 本文が「この Discussion の結論を知りたければここだけ読めばいい」状態を維持する

```bash
# Write ツールでファイル作成後
shirokuma-docs discussions update {number} --body /tmp/body.md
```

## タイトル形式

| カテゴリ | 形式 |
|---------|------|
| Handovers | `YYYY-MM-DD - {サマリー}` |
| ADR | `ADR-{NNN}: {タイトル}` |
| Knowledge | `{トピック名}` |
| Research | `[Research] {トピック}` |
