---
name: coding-nextjs
description: Next.jsプロジェクト向けの実装スキル。フレームワーク固有のテンプレート・パターンを提供。TDD ワークフローは working-on-issue が管理。「実装して」「機能追加」「コンポーネント作成」「ページ作成」で使用。
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, AskUserQuestion, TodoWrite
---

# Next.js コーディング

Next.js 固有のテンプレート・パターンを使用してフレームワーク準拠の実装を行う。

> **TDD 管理**: テスト設計・作成・実行は `working-on-issue` がオーケストレートする。このスキルは**実装のみ**に集中する。

## 開始前に

1. `.claude/rules/` のルールはファイルパスに基づき自動読み込み
2. プロジェクトの `CLAUDE.md` でプロジェクト固有規約を確認
3. `templates/` のテンプレートを出発点として使用

## ワークフロー

> **注意**: テスト設計・作成・確認は `working-on-issue` の TDD ワークフローが管理済み。このスキルは**実装**から開始する。

### ステップ 1: 実装計画

TodoWrite で進捗トラッカーを作成。

```markdown
## Implementation Plan

### Files to Create
- [ ] `lib/actions/feature.ts` - Server Actions
- [ ] `app/[locale]/(dashboard)/feature/page.tsx` - Page
- [ ] `components/feature-form.tsx` - Form component

### Files to Modify
- [ ] `messages/ja/*.json` - Japanese translations
- [ ] `messages/en/*.json` - English translations

### Dependencies (if needed)
- [ ] `pnpm add package-name`
- [ ] `npx shadcn@latest add component`
```

### ステップ 2: 実装

`templates/` のテンプレートを使用:
- `server-action.ts.template` - Server Action 実装
- `form-component.tsx.template` - フォームコンポーネント
- `page-list.tsx.template` - リストページ
- `page-new.tsx.template` - 作成ページ
- `page-edit.tsx.template` - 編集ページ
- `delete-button.tsx.template` - 削除ボタン（ダイアログ付き）

技術パターンは [patterns/code-patterns.md](patterns/code-patterns.md) 参照。

> **テスト実行・検証**: 実装完了後のテスト実行と検証は `working-on-issue` の TDD ワークフローが管理する。

### ステップ 3: 改善

実装フィードバックに基づき:
1. エッジケーステストを追加
2. UX を改善（ローディング状態、エラーハンドリング）
3. 最適化（再レンダリング削減、クエリ改善）

### ステップ 4: レポート生成

**Reports カテゴリに Discussion を作成:**

```bash
shirokuma-docs discussions create \
  --category Reports \
  --title "[Implementation] {feature-name}" \
  --body-file report.md
```

### ステップ 5: ポータル更新（重要な変更の場合）

```bash
shirokuma-docs portal -p . -o docs/portal
```

**トリガー**: 新しい Server Actions、画面/ページ、DB スキーマ変更
**スキップ**: 軽微な修正、単一ファイル変更

## リファレンスドキュメント

| ドキュメント | 内容 | 読むタイミング |
|------------|------|--------------|
| [criteria/coding-conventions.md](criteria/coding-conventions.md) | コーディング規約 | コード記述時 |
| [reference/tech-stack.md](reference/tech-stack.md) | 推奨技術スタック・バージョン要件 | 技術選定・バージョン確認時 |
| [patterns/testing.md](patterns/testing.md) | テストパターン・モック設定 | テスト作成時 |
| [patterns/code-patterns.md](patterns/code-patterns.md) | 技術パターン集 | 実装時 |
| [patterns/coding-conventions.md](patterns/coding-conventions.md) | 命名・ディレクトリ規約（簡易版） | コード記述時 |
| [patterns/better-auth.md](patterns/better-auth.md) | Better Auth 認証パターン | 認証実装時 |
| [patterns/drizzle-orm.md](patterns/drizzle-orm.md) | Drizzle ORM パターン | DB 操作実装時 |
| [patterns/e2e-testing.md](patterns/e2e-testing.md) | E2E テストパターン | Playwright テスト作成時 |
| [patterns/tailwind-v4.md](patterns/tailwind-v4.md) | Tailwind v4 CSS 変数問題 | Tailwind スタイリング時 |
| [patterns/radix-ui-hydration.md](patterns/radix-ui-hydration.md) | ハイドレーション対策 | Radix UI 使用時 |
| [patterns/csrf-protection.md](patterns/csrf-protection.md) | CSRF 防御パターン | Server Action 実装時 |
| [patterns/csp.md](patterns/csp.md) | Content Security Policy | CSP 設定時 |
| [patterns/rate-limiting.md](patterns/rate-limiting.md) | レート制限パターン | API 保護実装時 |
| [patterns/image-optimization.md](patterns/image-optimization.md) | 画像最適化 | next/image 使用時 |
| [patterns/documentation.md](patterns/documentation.md) | ドキュメント規約 | JSDoc 記述時 |
| [reference/checklists.md](reference/checklists.md) | 品質チェックリスト | 実装完了後 |
| [reference/large-scale.md](reference/large-scale.md) | ファイル分割ルール | 大規模機能実装時 |
| [reference/report-template.md](reference/report-template.md) | レポートテンプレート | レポート生成時 |
| [reference/reference.md](reference/reference.md) | 外部リファレンス集 | 調査時 |
| [templates/README.md](templates/README.md) | テンプレート一覧 | コード生成時 |

## クイックコマンド

```bash
pnpm --filter {app} fix          # ESLint + Prettier 一括修正
pnpm --filter {app} lint         # ESLint チェック
pnpm --filter {app} tsc --noEmit # 型チェック
pnpm --filter {app} test         # テスト実行
pnpm --filter {app} build        # ビルド
pnpm dev:{app}                   # 開発
```

## 言語

`@testdoc` タグの内容は日本語で記述する。コード、変数名は English。

## 次のステップ

`working-on-issue` チェーンではなくスタンドアロンで起動された場合:

```
Implementation complete. Next step:
→ `/committing-on-issue` to stage and commit your changes
```

## 注意事項

- **レポートは必須** — Reports カテゴリに Discussion 作成
- **規約は必須** — `.claude/rules/` のルールは自動読み込み
- テンプレートを出発点として使い、必要に応じてカスタマイズ
