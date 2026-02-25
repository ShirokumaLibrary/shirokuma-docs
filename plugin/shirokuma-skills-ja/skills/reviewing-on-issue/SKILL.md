---
name: reviewing-on-issue
description: 専門ロール別の包括的レビューワークフロー。「レビューして」「review」「セキュリティチェック」「security audit」「テストレビュー」「test quality」「Next.js review」「ドキュメントレビュー」「docs review」「計画レビュー」「plan review」、コード品質・セキュリティ・テストパターン・ドキュメント品質・計画品質のチェック時に使用。
context: fork
agent: general-purpose
model: opus
allowed-tools: Read, Grep, Glob, Bash, WebSearch, WebFetch
---

# Issue レビュー

専門ロール別の包括的レビューワークフロー。

## 利用可能なロール

| ロール | 焦点 | トリガー |
|--------|------|----------|
| **code** | 品質、パターン、スタイル | "review", "コードレビュー" |
| **code+annotation** | JSDoc アノテーション | "annotation review", "アノテーションレビュー" |
| **security** | OWASP、CVE、認証 | "security review", "セキュリティ" |
| **testing** | TDD、カバレッジ、モック | "test review", "テストレビュー" |
| **nextjs** | フレームワーク、パターン | "Next.js review", "プロジェクト" |
| **docs** | Markdown 構造、リンク、用語 | "docs review", "ドキュメントレビュー" |
| **plan** | 要件カバレッジ、タスク粒度、リスク | "plan review", "計画レビュー" |

## ワークフロー

```
ロール選択 → ナレッジ読み込み → Lint 実行 → コード分析/計画分析 → レポート生成 → レポート保存
```

**6ステップ**: ロール選択 → 読み込み → **Lint** → 分析 → レポート → 保存

### 1. ロール選択

ユーザーリクエストに基づき適切なロールを選択：

| キーワード | ロール | 読み込むファイル |
|------------|--------|-----------------|
| "review", "レビュー" | code | criteria/code-quality, criteria/coding-conventions, patterns/server-actions, patterns/drizzle-orm, patterns/jsdoc |
| "annotation", "アノテーション" | code+annotation | roles/code.md |
| "security", "セキュリティ" | security | criteria/security, patterns/better-auth |
| "test", "テスト" | testing | criteria/testing, patterns/e2e-testing |
| "Next.js", "nextjs" | nextjs | 全ナレッジファイル |
| "docs", "ドキュメント" | docs | roles/docs.md |
| "plan", "計画レビュー" | plan | roles/plan.md |

#### セルフレビュー時のロール自動選択

セルフレビューチェーンからの呼び出し時（PR コンテキストあり）、`git diff --name-only` で変更ファイルを分析しロールを自動選択する：

| 変更種別 | 判定条件 | ロール |
|---------|---------|--------|
| コード | `.ts/.tsx/.js/.jsx` を含む | `code` |
| ドキュメントのみ | `.md` ファイルのみ（設定パス配下を除く） | `docs` |
| 設定のみ | `.claude/skills/`, `.claude/rules/`, `.claude/agents/`, `.claude/output-styles/`, `.claude/commands/`, `plugin/` 配下のみ | `creating-pr-on-issue` が `reviewing-claude-config` にルーティング（本スキルは呼ばれない） |
| 混在 | コード + ドキュメント/設定 | `code`（設定部分は `reviewing-claude-config` が並行レビュー） |

**設定パス**: `.claude/skills/`, `.claude/rules/`, `.claude/agents/`, `.claude/output-styles/`, `.claude/commands/`, `plugin/`

**注意**: plan ロールはセルフレビュー自動選択の対象外。計画はコードファイルではないため `git diff --name-only` では検出できない。plan ロールはキーワード指定または Spec Review Issue の明示指定でのみ選択される。

### 2. ナレッジ読み込み

ロールに基づき必要なナレッジファイルを読み込む：

```
1. 自動読み込み: .claude/rules/*.md（ファイルパスに基づく）
2. ロール固有: roles/{role}.md
3. 基準: criteria/{relevant}.md
4. パターン: patterns/{relevant}.md
```

**注意**: プロジェクト固有のルールは `.claude/rules/` から自動読み込み — 手動読み込み不要。

### 3. shirokuma-docs Lint 実行（必須）

**手動レビューの前に自動チェックを実行。ロールに応じて実行する lint コマンドが異なる：**

| ロール | 実行する lint コマンド |
|--------|----------------------|
| code, code+annotation, nextjs | lint-tests, lint-coverage, lint-code, lint-structure, lint-annotations（全5種） |
| security | lint-code, lint-structure（セキュリティ関連のみ） |
| testing | lint-tests, lint-coverage（テスト関連のみ） |
| docs | lint-docs（ドキュメント構造のみ） |
| plan | スキップ（対象が Issue 本文であり、コード/ドキュメントファイルではないため） |

**code / code+annotation / nextjs ロール:**

```bash
# テストドキュメント（@testdoc, @skip-reason）
shirokuma-docs lint-tests -p . -f terminal

# 実装-テストカバレッジ
shirokuma-docs lint-coverage -p . -f summary

# コード構造（Server Actions、アノテーション）
shirokuma-docs lint-code -p . -f terminal

# プロジェクト構造（ディレクトリ、命名）
shirokuma-docs lint-structure -p . -f terminal

# アノテーション整合性（@usedComponents, @screen）
shirokuma-docs lint-annotations -p . -f terminal
```

**docs ロール:**

```bash
# ドキュメント構造検証
shirokuma-docs lint-docs -p . -f terminal
```

**主要チェックルール：**

| ルール | 説明 |
|--------|------|
| `skipped-test-report` | `.skip` テストを報告（`@skip-reason` の存在確認） |
| `testdoc-required` | 全テストに `@testdoc` が必要 |
| `lint-coverage` | ソースファイルに対応テストが必要 |
| `annotation-required` | Server Actions に `@serverAction` が必要 |

プロジェクト固有の修正手順はワークフロードキュメントを参照。

### 4. コード分析 / 計画分析

**コードロール（code, security, testing, nextjs, docs）:**

1. 対象ファイルを読み込む
2. 読み込んだナレッジの基準を適用
3. 既知の問題と照合
4. shirokuma-docs lint 結果と相互参照
5. 違反と改善点を特定

**plan ロール:**

1. `shirokuma-docs issues show {number}` で Issue 本文を取得
2. `## 計画` セクションを抽出
3. レビューチェックリスト（`roles/plan.md`）の各項目を評価
4. アンチパターンとの照合
5. 要件・成果物との整合性を検証

### 5. レポート生成

`templates/report.md` 形式を使用：

1. サマリー（shirokuma-docs lint サマリーを含む）
2. 重大な問題
3. 改善点
4. ベストプラクティス
5. 推奨事項

### 6. レポート保存

レビューコンテキストに基づいて出力先をルーティングする。

#### PR レビュー（PR 番号がコンテキストにある場合）

PR にレビューサマリーをコメントとして投稿：

```bash
# Write ツールでファイル作成後
shirokuma-docs issues comment {PR#} --body-file /tmp/shirokuma-docs/{number}-review-summary.md
```

重大な問題（severity: error）が多数（5件以上）ある場合のみ、詳細レポートを Discussion にも保存し、PR コメントに Discussion URL をリンクする。

#### ファイル/ディレクトリレビュー（PR 番号なし）

Reports カテゴリに Discussion を作成（従来の動作）：

```bash
shirokuma-docs discussions create \
  --category Reports \
  --title "[Review] {role}: {target}" \
  --body-file report.md
```

Discussion URL をユーザーに報告。

#### ルーティングまとめ

| コンテキスト | メイン出力先 | 詳細レポート |
|-------------|------------|------------|
| PR 番号指定 | PR コメント（サマリー） | error 5件以上のみ Discussion |
| ファイル/ディレクトリ | Discussion (Reports) | — |
| Issue 番号指定（plan ロール） | Issue コメント | — |

> 出力先ポリシーの全体像は `rules/output-destinations.md` を参照。

## ナレッジ更新

ユーザーが `--update` を要求した場合：

技術知識（CVE、バージョン、フレームワークパターン等）のソースは knowledge-manager エージェントが一元管理している。ナレッジ更新は knowledge-manager に委任する：

```
ソース更新して
```

knowledge-manager が Web 検索で以下を最新化する：
- Next.js リリースと CVE
- React 更新
- Tailwind CSS 変更
- Better Auth 更新
- OWASP 更新

更新後、`配布して` コマンドで知識をスキルに再配布する。

## 段階的開示

トークン効率のため：

1. **自動読み込み**: `.claude/rules/*.md`（レビュー対象のファイルパスに基づく）
2. **オンデマンド**: ロール/発見に基づきナレッジファイルを読み込む
3. **最小出力**: まずサマリー、詳細は要求時

## クイックリファレンス

```bash
# コード品質レビュー
"review lib/actions/"

# アノテーション整合性レビュー
"annotation review components/"
"アノテーションレビュー components/"
"check usedComponents in nav-tags.tsx"

# セキュリティレビュー
"security review lib/actions/"

# テストレビュー
"test review"

# Next.js プロジェクトレビュー
"Next.js review"

# 計画レビュー
"plan review #42"
"計画レビュー #42"

# ナレッジベース更新
"reviewer --update"
```

## 次のステップ

直接起動時（`working-on-issue` 経由でない場合）、レビュー後の次のワークフローステップを提案：

```
レビュー完了。発見に基づいて変更を行った場合：
→ `/committing-on-issue` で変更をステージしてコミット
```

## オーケストレーション（サブエージェントとして起動時）

このスキルが `context: fork` で実行される場合、隔離されたサブエージェントとして動作：

### 進捗報告

```text
ステップ 1/6: ロール選択中...
  ロール: security
  読み込みファイル: tech-stack, security, better-auth, known-issues

ステップ 2/6: ナレッジ読み込み中...

ステップ 3/6: shirokuma-docs lint 実行中...

ステップ 4/6: コード分析中...
  lib/auth.ts - 3 件の発見
  lib/actions/users.ts - 1 件の発見

ステップ 5/6: レポート生成中...
  2 件重大、1 件警告、1 件情報

ステップ 6/6: レポート保存中...
  GitHub Discussions (Reports)
```

**plan ロール時の進捗報告例:**

```text
ステップ 1/6: ロール選択中...
  ロール: plan
  読み込みファイル: CLAUDE.md, .claude/rules/

ステップ 2/6: ナレッジ読み込み中...

ステップ 3/6: Lint 実行... スキップ（plan ロール）

ステップ 4/6: 計画分析中...
  Issue #42 - 計画セクション分析
  要件カバレッジ: 5/5、タスク粒度: 適切

ステップ 5/6: レポート生成中...
  0 件重大、2 件改善提案

ステップ 6/6: レポート保存中...
  Issue #42 コメント
```

### エラー回復

分析が不完全な場合：
1. カバレッジ不足箇所を特定
2. 追加パターンを読み込む
3. 未分析箇所を再分析
4. レポートを更新

## 注意事項

- **レポート保存**: コンテキストに応じてルーティング（PR → PR コメント、ファイル → Discussion Reports、`rules/output-destinations.md` 参照）
- **ロールベース**: 関連するナレッジファイルのみ読み込む
- **段階的**: まずサマリー、詳細は要求時
- **更新可能**: `--update` でナレッジを更新
- **ルール自動読み込み**: `.claude/rules/` からプロジェクト規約
- **サブエージェントモード**: `context: fork` で隔離実行
- **fork 制約**: `context: fork` のため TodoWrite / AskUserQuestion は使用不可。結果はレポートとして返す
- **セルフレビュー**: 委任チェーンから起動時は構造化出力（Self-Review Result）を返す
- **呼び出し元のコメントファースト遵守**: このスキルは `context: fork` のため本文更新を行わないが、呼び出し元スキル（`creating-pr-on-issue`, `working-on-issue`）がレビュー結果に基づいて Issue/PR 本文を更新する場合は、`item-maintenance.md` のコメントファースト原則に従うこと。具体的な手順パターンは `item-maintenance.md` の「レビュー結果からの本文更新」セクションを参照

## セルフレビューモード

`working-on-issue` の委任チェーンまたは `creating-pr-on-issue` のセルフレビューチェーンから起動された場合、呼び出し元が自動判定できるよう構造化された出力を返す。

> **重要**: セルフレビューモードでもステップ 6（レポート保存）は省略不可。PR 番号がコンテキストにある場合は、必ず PR コメントとしてレビューレポートを投稿した上で、以下の構造化出力も返すこと。

### 構造化出力形式

通常のレポート保存（ステップ 6）に加え、以下の形式でサマリーを返す：

```text
## Self-Review Result
**Status:** {PASS | FAIL}
**Critical:** {n} issues
**Fixable-warning:** {n} issues
**Out-of-scope:** {n} issues
**Files with issues:**
- {file1}: {summary} [critical | fixable-warning]
- {file2}: {summary} [critical | fixable-warning]
**Auto-fixable:** {yes | no}
**Out-of-scope items:**
- {description1}
- {description2}
```

- **PASS**: critical = 0 かつ fixable-warning = 0（out-of-scope のみでも PASS）
- **FAIL**: critical > 0 または fixable-warning > 0
- **Auto-fixable**: critical/fixable-warning がコード修正で解決可能か（設計変更が必要な場合は no）
- **Out-of-scope items**: フォローアップ Issue 作成の入力となる概要リスト

### セルフレビュー 3 分類マッピング

レポートテンプレートの表示用 4 段階（Critical/High/Medium/Low）は人間向けレビューレポートとして維持し、セルフレビューの構造化出力にのみ 3 分類を導入する**二層構造**。

#### レポート深刻度 → セルフレビュー分類

| レポート深刻度 | スコープ判定 | マッピング先 |
|--------------|------------|-------------|
| Critical / High | 不問（常に修正対象） | → critical |
| Medium / Low | PR 変更ファイル内 | → fixable-warning |
| Medium / Low | PR スコープ外 | → out-of-scope |

Critical/High はスコープ外であっても `critical` に分類する。重大な問題は発見した時点で修正すべきであり、スコープ外への先送りは品質リスクが高いため。

#### fixable-warning vs out-of-scope の判定基準

| 条件 | 分類 |
|------|------|
| 当該 PR で変更したファイル内の修正 | fixable-warning |
| 当該 PR で変更したファイルに依存する未変更ファイルの修正 | out-of-scope |
| 新規ファイルの追加が必要 | out-of-scope |
| 設計パターンの変更が必要 | out-of-scope |

### フィードバック蓄積

セルフレビューで検出された指摘パターンを蓄積し、スキル・ルールの改善材料にする。

**記録タイミング**: セルフレビューループの各イテレーションで指摘を記録。

**蓄積先**: Discussion (Reports) に `[Self-Review Feedback]` プレフィックスで保存。

```bash
shirokuma-docs discussions create \
  --category Reports \
  --title "[Self-Review Feedback] {branch}: iteration {n}" \
  --body-file /tmp/shirokuma-docs/{number}-feedback.md
```

**ルール化提案**: 頻出パターン（3回以上）が検出された場合、レポート末尾に追記：

```markdown
## ルール化候補
- **パターン**: {description}
- **検出回数**: {n}
- **提案**: {rule-file} に追加を検討
```

## 言語

レビューレポート（PR コメント、Discussion）の言語は `output-language` ルールに準拠する。

## NGケース

- コードを修正しない（レビュー結果の報告のみ）
- 全ナレッジファイルを一度に読み込まない（ロール固有のファイルのみ）

## リファレンスドキュメント

| ディレクトリ | ファイル |
|-------------|---------|
| `criteria/` | [code-quality](criteria/code-quality.md), [coding-conventions](criteria/coding-conventions.md), [security](criteria/security.md), [testing](criteria/testing.md) |
| `patterns/` | [server-actions](patterns/server-actions.md), [server-actions-structure](patterns/server-actions-structure.md), [drizzle-orm](patterns/drizzle-orm.md), [better-auth](patterns/better-auth.md), [e2e-testing](patterns/e2e-testing.md), [tailwind-v4](patterns/tailwind-v4.md), [radix-ui-hydration](patterns/radix-ui-hydration.md), [jsdoc](patterns/jsdoc.md), [nextjs-patterns](patterns/nextjs-patterns.md), [i18n](patterns/i18n.md), [code-quality](patterns/code-quality.md), [account-lockout](patterns/account-lockout.md), [audit-logging](patterns/audit-logging.md), [docs-management](patterns/docs-management.md) |
| `reference/` | [tech-stack](reference/tech-stack.md) |
| `roles/` | [code](roles/code.md), [security](roles/security.md), [testing](roles/testing.md), [nextjs](roles/nextjs.md), [docs](roles/docs.md), [plan](roles/plan.md) |
| `templates/` | [report](templates/report.md) |
| `docs/setup/` | [auth-setup](docs/setup/auth-setup.md), [database-setup](docs/setup/database-setup.md), [infra-setup](docs/setup/infra-setup.md), [project-init](docs/setup/project-init.md), [styling-setup](docs/setup/styling-setup.md) |
| `docs/workflows/` | [annotation-consistency](docs/workflows/annotation-consistency.md), [shirokuma-docs-verification](docs/workflows/shirokuma-docs-verification.md) |

ロールごとの読み込みファイルはステップ 1 のロール選択テーブルを参照。
