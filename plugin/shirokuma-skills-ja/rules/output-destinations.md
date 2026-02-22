---
paths:
  - ".claude/skills/**/*.md"
---

# 出力先ルール

## 概要

Claude Code のスキルは2種類の出力を生成する。それぞれを適切な出力先にルーティングする。

## 出力タイプ

| タイプ | 出力先 | 寿命 |
|--------|--------|------|
| **作業レポート**（レビュー、lint結果） | GitHub Discussions (Reports) | 一時的 |
| **最終ドキュメント**（API、アーキテクチャ） | shirokuma-docs ポータル | 永続的 |

## 作業レポート → Discussions

**用途**: レビューレポート、実装進捗、lint 結果

```bash
shirokuma-docs discussions create \
  --category Reports \
  --title "Review: {target}" \
  --body /tmp/shirokuma-docs/report.md
```

**特徴**: 作業セッション中に作成、人間の確認用、定期的にクリーンアップ可能

## 最終ドキュメント → ポータル

**用途**: 完成した機能ドキュメント、API リファレンス、アーキテクチャ図

```bash
shirokuma-docs portal -p . -o docs/portal
```

**特徴**: 作業完了後に作成、永続的なプロジェクトドキュメント、コードアノテーションから自動生成

## ローカルログからの移行

**旧パターン**（非推奨）:
```
logs/reports/YYYY-MM-DD-*.md
logs/reviews/YYYY-MM-DD-*.md
```

**新パターン**:
```
作業レポート → GitHub Discussions (Reports)
最終ドキュメント → shirokuma-docs ポータル
```

## スキル更新時の対応

スキルを更新する際、ローカルログ参照を置換：

| 旧 | 新 |
|----|-----|
| `logs/reports/ に保存` | `Reports カテゴリに Discussion を作成` |
| `logs/reviews/ に保存` | `Reports カテゴリに Discussion を作成` |
| レポートファイルパス出力 | Discussion URL 出力 |

## PR レビュー → PR コメント

PR を対象としたレビュー結果は、PR コメントに直接投稿する。

```bash
shirokuma-docs issues comment {PR#} --body - <<'EOF'
レビューサマリー内容
EOF
```

| 条件 | 出力先 |
|------|--------|
| PR レビュー（通常） | PR コメント（サマリー） |
| PR レビュー（error 5件以上） | PR コメント + Discussion（詳細） |
| ファイル/ディレクトリレビュー | Discussion (Reports) |

## Reports カテゴリの用途

| 用途 | 例 |
|------|-----|
| 包括的レビューレポート | プロジェクト全体のセキュリティ監査 |
| 調査・リサーチ結果 | ベストプラクティス調査、技術比較 |
| セルフレビューフィードバック | 自動レビューループの検出パターン蓄積 |

**Reports カテゴリに保存しないもの**: PR 固有のレビュー結果（→ PR コメントに投稿）

## ルール

- **ローカルファイルなし**: レポートをリポジトリに保存しない
- **ブラウザフレンドリー**: GitHub Discussions で人間が簡単にレビュー
- **明確な分離**: 一時的（Discussions）vs 永続的（ポータル）
- **PR レビュー → PR コメント**: PR 対象のレビューは PR に直接投稿
