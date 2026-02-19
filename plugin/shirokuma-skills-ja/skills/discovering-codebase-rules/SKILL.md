---
name: discovering-codebase-rules
description: TypeScriptアプリケーションを分析してパターンを発見し、shirokuma-docs lintルール向けのコーディング規約を提案します。「ルール発見」「rule discovery」「規約提案」「convention proposal」「パターン分析」、コードベースからパターン抽出や新しい規約提案を調査する場合に使用。
allowed-tools: Read, Grep, Glob, Bash, AskUserQuestion, TodoWrite
---

# コードベースルール発見

TypeScript アプリケーションを分析して以下の2つの目的で使用：
1. **パターン発見**: アプリ横断で既存パターンを抽出
2. **規約提案**: 機械的チェックを可能にする新規約を提案

## 使用タイミング

- 「ルール発見」「rule discovery」を要求された場合
- 「パターン分析」「pattern analysis」を要求された場合
- 「規約提案」「convention proposal」を要求された場合
- 「もっとチェックできるようにしたい」と言われた場合
- 「統一感を上げたい」「機械的チェックを増やしたい」と言われた場合

## 2つのモード

### モード 1: パターン発見

**目的**: アプリ横断で既存パターンを発見する

```
既存コード分析 → 共通パターン発見 → ルール提案
```

### モード 2: 規約提案

**目的**: 機械的チェックを可能にする規約を提案する

```
チェック可能性分析 → 規約提案 → 採用後にルール実装
```

**重要な問い**: 「機械的チェックを可能にするために、コードはどう書くべきか？」

## 対象アプリケーション

| アプリ | パス | 説明 |
|--------|------|------|
| Blog CMS (admin) | `nextjs-tdd-blog-cms/apps/admin/` | CMS 管理画面 |
| Blog CMS (public) | `nextjs-tdd-blog-cms/apps/public/` | 公開ブログ |
| shirokuma-docs | `shirokuma-docs/src/` | ドキュメント生成 CLI |

## ワークフロー: パターン発見

6ステップ以上のため TodoWrite で進捗管理すること。規約提案の優先度判断時は AskUserQuestion でユーザー確認。

### ステップ概要

1. スコープ定義 + 既存ルール確認
2. パターンカウント実行 + サンプル収集
3. 一貫性・不整合・欠落パターンの分析
4. 優先度付け（P0/P1/P2）
5. 提案生成（テンプレート使用）
6. レポート保存 + フォローアップ Issue 作成

### 詳細ワークフロー

[workflows/analyze-codebase.md](workflows/analyze-codebase.md) を参照

## ワークフロー: 規約提案

### ステップ 1: チェック可能な機会を特定

規約があればチェック可能になる箇所を分析：

| カテゴリ | 現状 | 標準化した場合 |
|----------|------|---------------|
| ファイル配置 | 混在 | ドメインベース配置チェックが可能 |
| 命名 | 部分的に統一 | 自動リネーム提案が可能 |
| i18n キー | 自由形式 | キーフォーマット検証が可能 |

### ステップ 2: 現状の構造を分析

```bash
# ファイル構造分析
find apps/ -name "*.ts" -o -name "*.tsx" | head -100

# ディレクトリパターン
ls -la apps/admin/lib/
ls -la apps/public/lib/

# 命名規約
find apps/ -name "*.tsx" | xargs basename -a | sort | uniq -c | sort -rn
```

### ステップ 3: 規約を提案

各機会について以下を文書化：

1. **現状**: 現在の実装方法（バリエーション含む）
2. **提案する規約**: 具体的なルール
3. **移行コスト**: 既存コードの変更量
4. **可能になるチェック**: 実装可能になる lint ルール
5. **メリット**: 標準化の価値

### ステップ 4: 規約提案書を生成

[templates/convention-proposal.md](templates/convention-proposal.md) を使用

### ステップ 5: Knowledge Discussion として保存

ルール提案前に、コンテキストと根拠を保存するため Knowledge Discussion を作成。

```bash
# 確認済みパターン → Knowledge カテゴリ
shirokuma-docs discussions create --category Knowledge --title "{パターン名}" --body /tmp/body.md

# 調査中 → Research カテゴリ
shirokuma-docs discussions create --category Research --title "[Research] convention-{category}" --body /tmp/body.md
```

**確信度に基づきカテゴリを選択：**

| 確信度 | カテゴリ | 次のステップ |
|--------|----------|-------------|
| 確認済み（パターンが2回以上観測） | Knowledge | ルール抽出に進む（ステップ 6） |
| 暫定的（更なる検証が必要） | Research | より多くの証拠を待つ |

Discussion はルールの根拠の**ソースオブトゥルース**。ルール提案前に必ず作成すること。

### ステップ 6: ルール抽出（Knowledge の場合）

パターンが Knowledge（確認済み）として記録された場合、AI 向けのルールを提案：

1. `managing-rules` スキルを使用してルールファイルを作成
2. ルールは簡潔で実行可能に（AI 向け）
3. ソース参照を追加: `<!-- Source: Discussion #{N} -->`
4. Knowledge Discussion が完全なコンテキストを保持、ルールはその抽出版

## 規約カテゴリ

### 1. ファイル配置規約

| 領域 | 規約 | 可能になるチェック |
|------|------|-------------------|
| Server Actions | `lib/actions/{domain}.ts` | ドメイン網羅性チェック |
| コンポーネント | `components/{Domain}/` | コンポーネント依存チェック |
| Hooks | `hooks/use{Name}.ts` | Hook 命名チェック |
| 型定義 | `types/{domain}.ts` | 型定義重複チェック |

### 2. 命名規約

| 対象 | 規約 | 例 |
|------|------|-----|
| Server Action ファイル | `{domain}-actions.ts` | `post-actions.ts` |
| コンポーネントファイル | `{Name}.tsx` (PascalCase) | `PostCard.tsx` |
| Hook ファイル | `use{Name}.ts` | `useAuth.ts` |
| テストファイル | `{name}.test.ts` | `post-actions.test.ts` |

### 3. コード構造規約

| 領域 | 規約 | 可能になるチェック |
|------|------|-------------------|
| Server Action の順序 | Auth → CSRF → Validation → Processing | 順序チェック |
| エクスポートスタイル | 名前付きエクスポート推奨 | 未使用エクスポート検出の改善 |
| i18n キー | `{domain}.{action}.{element}` | キーフォーマットチェック |

### 4. アノテーション規約

| タグ | 必須対象 | 可能になるチェック |
|------|----------|-------------------|
| `@serverAction` | Server Actions | 自動ドキュメント生成 |
| `@screen` | ページコンポーネント | 画面カタログ生成 |
| `@usedComponents` | 画面 | 依存関係グラフ生成 |

## 既存ルール（参考）

| ルール | ステータス |
|--------|-----------|
| server-action-structure | 実装済み |
| annotation-required | 実装済み |
| testdoc-* | 実装済み |

現在の実装は `shirokuma-docs/src/lint/rules/` を確認。

## NGケース

- 既存ルールと重複する提案をしない
- 2回未満の観測でパターン確認済みとしない

## クイックリファレンス

```bash
# パターン発見（モード 1）
"discover patterns in blog-cms"

# 規約提案（モード 2）
"propose conventions for better checking"

# 特定領域
"propose file placement conventions"
"propose naming conventions"
"propose i18n key conventions"
```

## 関連リソース

- [patterns/discovery-categories.md](patterns/discovery-categories.md) - 発見対象
- [templates/rule-proposal.md](templates/rule-proposal.md) - ルール提案フォーマット
- [templates/convention-proposal.md](templates/convention-proposal.md) - 規約提案フォーマット
- [workflows/analyze-codebase.md](workflows/analyze-codebase.md) - 詳細ワークフロー

## 出力

規約提案は以下に回答すべき：

1. **何を**: 具体的な規約内容
2. **なぜ**: その規約が必要な理由
3. **チェック**: 可能になるチェック
4. **移行**: 既存コードの移行コスト
5. **優先度**: P0/P1/P2
