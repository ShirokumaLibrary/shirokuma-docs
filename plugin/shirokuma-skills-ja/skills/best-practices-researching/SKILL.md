---
name: best-practices-researching
description: 公式ドキュメントとプロジェクトパターンを調査してから実装する。新機能の開始時、ベストプラクティスが不明な場合、「Xのベストプラクティスを調べて」「Yの実装方法は？」などのリクエスト時に使用。トリガー: "ベストプラクティス調査", "実装方法を調べて", "Drizzleでソフトデリートってどう実装するのがベスト？", "research best practices", "how should I implement".
context: fork
agent: general-purpose
model: opus
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch, Bash, AskUserQuestion, TodoWrite
---

# ベストプラクティス調査

公式ドキュメントとプロジェクトパターンを調査し、実装ガイダンスを提供する。`context: fork` で隔離実行。

## コア責務

- 公式ドキュメントから推奨パターンを検索
- 既存プロジェクトパターンとの一貫性を確認
- 調査結果を実行可能な推奨事項として統合
- 重要な調査結果を将来の参照用に保存

## 技術スタック ドキュメントソース

| 技術 | 公式ドキュメント |
|------|----------------|
| Next.js 16 | nextjs.org/docs |
| React 19 | react.dev |
| Drizzle ORM | orm.drizzle.team/docs |
| Better Auth | better-auth.com/docs |
| shadcn/ui | ui.shadcn.com |
| Tailwind CSS v4 | tailwindcss.com/docs |
| next-intl | next-intl.dev/docs |
| Playwright | playwright.dev/docs |

## ワークフロー

### 1. リクエスト分析

ユーザーが実装・理解したい内容を解析:
- 機能の種類（CRUD、認証、UIコンポーネント等）
- 関連技術
- 特定の懸念事項や制約

調査方向が不明確な場合は `AskUserQuestion` で確認。複数技術の調査時は `TodoWrite` で管理。

### 2. プロジェクトパターン検索

プロジェクト内の既存パターンを確認:

```bash
# プロジェクトコードを検索
Grep: [関連パターン] in {project}/
```

**参考パターン**（`nextjs-vibe-coding` スキルのナレッジベースで提供）:
- `code-patterns.md` - Server Actions、i18n、フォーム
- `better-auth.md` - 認証パターン
- `drizzle-orm.md` - データベースパターン
- `tailwind-v4.md` - スタイリングパターン

### 3. 公式ドキュメント検索

WebSearch で公式推奨を検索:

```
WebSearch: "[技術] [機能] best practices 2026"
WebSearch: "[技術] official documentation [トピック]"
```

**優先順位**:
1. 公式ドキュメント
2. GitHub issues/discussions
3. コミュニティベストプラクティス

### 4. 調査結果の統合

公式推奨とプロジェクトパターンを比較:
- ギャップや不一致を特定
- プロジェクト固有の適応を記録
- 矛盾がある場合はフラグ

### 5. 保存（任意）

重要な調査結果は Research カテゴリに Discussion を作成:

```bash
shirokuma-docs discussions create --category Research --title "[Research] {トピック}" --body "{調査結果}"
```

## 出力フォーマット

```markdown
# 調査: [トピック]

## サマリー
[調査結果の1-2行概要]

## 公式推奨事項
- **[ソース]**: [主要な推奨事項]
- **[ソース]**: [主要な推奨事項]

## プロジェクトパターン
- **[ファイル]**: [プロジェクト内の既存パターン]
- **[ファイル]**: [関連する実装]

## 推奨事項

### やるべき
- [コード例付きの具体的な推奨事項]

### 避けるべき
- [避けるべきアンチパターン]

## 実装メモ
[このプロジェクト固有の考慮事項]

## ソース
- [URL 1]
- [URL 2]
```

## 基本原則

1. **公式優先**: 常に公式ドキュメントを最優先
2. **プロジェクト一貫性**: 既存のプロジェクトパターンと整合
3. **実行可能な出力**: 具体的で実装可能な推奨事項を提供
4. **ソース帰属**: トレーサビリティのため常にソースを引用
5. **簡潔さ**: 調査結果は簡潔でスキャンしやすい形に

## アンチパターン

- 未検証の情報を推奨事項に含めない
- ソース URL を省略しない
- 古いバージョンのドキュメントを参照しない

## 完了チェックリスト

- [ ] 公式ドキュメントを最低 1 つ参照した
- [ ] すべての推奨事項にソースが付与されている
- [ ] プロジェクトパターンとの比較を行った

## 注意事項

- 調査結果は `nextjs-vibe-coding` スキルに渡して実装可能
- `context: fork` で隔離サブエージェントとして実行（メインコンテキストを汚染しない）
