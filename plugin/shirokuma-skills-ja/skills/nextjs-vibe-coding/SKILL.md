---
name: nextjs-vibe-coding
description: Next.jsプロジェクト向けのTDD実装ワークフロー。「実装して」「機能追加」「コンポーネント作成」「ページ作成」「機能を作って」、機能実装、コンポーネント作成、ページ構築時に使用。
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch, WebFetch, AskUserQuestion, TodoWrite
---

# Next.js バイブコーディング

テストファースト実装ワークフロー。自然言語の説明を動くコードに変換する。

## いつ使うか

- 「実装して」「implement feature」「機能追加」
- 「コンポーネント作成」「create component」
- 「ページ作成」「build page」「画面を作って」
- TDD 実装、テストファースト開発
- 自然言語で機能を説明された場合（バイブコーディング）

## コアフィロソフィー

**バイブコーディング**: 自然言語の説明を動くコードに変換
**テストファースト**: 実装の前に**必ず**テストを書く — **例外なし**

```
User Request → 理解 → 計画 → テスト作成 → テスト確認 → 実装 → テスト実行 → ドキュメント検証 → 改善 → レポート → ポータル
```

**10 ステップ**: 理解 → 計画 → **テスト作成** → **テスト確認** → 実装 → テスト実行 → **ドキュメント検証** → 改善 → レポート → **ポータル**（任意）

> **必須ルール**: テストファイルが作成・確認されるまで、ステップ 5（実装）に進んではならない。テストをスキップした場合、スキルの基本契約に違反する。

## アーキテクチャ

- `SKILL.md` - コアワークフロー
- `patterns/` - 汎用パターン（テスト、drizzle-orm、better-auth 等）
- `reference/` - チェックリスト、大規模ルール
- `templates/` - Server Actions、コンポーネント、ページのコードテンプレート
- `.claude/rules/` - プロジェクト固有規約（自動読み込み）

## 開始前に

1. `.claude/rules/` のルールはファイルパスに基づき自動読み込み
2. プロジェクトの `CLAUDE.md` でプロジェクト固有規約を確認
3. `templates/` のテンプレートを出発点として使用

## ワークフロー

### ステップ 1: リクエストの理解

ユーザーの自然言語リクエストを解析:

- **What**: 構築する機能/コンポーネント/ページ
- **Where**: どのアプリとパス
- **Why**: 期待されるユーザー向け動作
- **Constraints**: パフォーマンス、アクセシビリティ、i18n 要件

不明確な場合は AskUserQuestion で具体的なオプションを提示（例: "Server or Client Component?", "Which app?"）。

### ステップ 2: 実装計画

TodoWrite で進捗トラッカーを作成（理解 → 計画 → テスト → 実装 → 検証）。ユーザーがマルチステップ TDD ワークフローの進捗を確認できるようにする。

チェックリストを作成:

```markdown
## Implementation Plan

### Files to Create
- [ ] `lib/actions/feature.ts` - Server Actions
- [ ] `app/[locale]/(dashboard)/feature/page.tsx` - Page
- [ ] `components/feature-form.tsx` - Form component
- [ ] `__tests__/lib/actions/feature.test.ts` - Action tests
- [ ] `__tests__/components/feature-form.test.tsx` - Component tests

### Files to Modify
- [ ] `messages/ja/*.json` - Japanese translations
- [ ] `messages/en/*.json` - English translations

### Dependencies (if needed)
- [ ] `pnpm add package-name`
- [ ] `npx shadcn@latest add component`
```

### ステップ 3: テストを先に書く（必須 — スキップ不可）

**このステップは必須 — スキップ不可**

実装コードの前にテストファイルを作成:

1. **まずテンプレートを読む**:
   ```bash
   cat .claude/skills/nextjs-vibe-coding/templates/server-action.test.ts.template
   cat .claude/skills/nextjs-vibe-coding/templates/component.test.tsx.template
   ```

2. **テンプレートを使用してテストファイルを作成**:
   - `__tests__/lib/actions/{{name}}.test.ts` - Server Action テスト
   - `__tests__/components/{{name}}-form.test.tsx` - コンポーネントテスト

3. **@testdoc コメントを追加（必須）**:
   各テストに説明付き JSDoc コメントが必要:

   ```typescript
   /**
    * @testdoc Can create a new user
    * @purpose Verify normal user creation API flow
    * @precondition Valid user data is provided
    * @expected User is saved to DB and ID is returned
    */
   it("should create a new user", async () => {
     // test implementation
   });
   ```

   > **Note**: @testdoc の内容は日本語で記述する。

4. **最低テストカバレッジ**:
   - Server Actions: Create, Read（リスト + 単一）, Update, Delete
   - コンポーネント: レンダリング、フォーム送信、バリデーションエラー、ローディング状態

モックセットアップは [patterns/testing.md](patterns/testing.md) 参照。

### ステップ 4: テスト存在確認（ゲート）

**チェックポイント — このゲートを通過せずに先に進まない**

実装前にテストファイルの存在を確認:

```bash
# テストファイルが作成されたことを確認
ls -la __tests__/lib/actions/{{name}}.test.ts
ls -la __tests__/components/{{name}}-form.test.tsx
```

**テストファイルが存在しなければ、ステップ 3 に戻る。**

テストファイルの存在を確認した後のみ、実装に進む。

### ステップ 5: 実装

`templates/` のテンプレートを使用:
- `server-action.ts.template` - Server Action 実装
- `form-component.tsx.template` - フォームコンポーネント
- `page-list.tsx.template` - リストページ
- `page-new.tsx.template` - 作成ページ
- `page-edit.tsx.template` - 編集ページ
- `delete-button.tsx.template` - 削除ボタン（ダイアログ付き）

技術パターンは [patterns/code-patterns.md](patterns/code-patterns.md) 参照。

### ステップ 6: テスト実行（必須）

**完了前にすべてのテストが通ること**

```bash
# Lint & 型チェック
pnpm --filter {app} lint
pnpm --filter {app} tsc --noEmit

# ユニットテスト実行 — 必須パス
pnpm --filter {app} test

# E2E（該当する場合）
pnpm test:e2e --grep "feature"
```

**テスト失敗時:**
1. テストではなく実装を修正
2. すべて通るまでテストを再実行
3. 通った後にのみステップ 6.5 に進む

### ステップ 6.5: shirokuma-docs 検証（必須）

**完了前にテストドキュメント品質を確認**

```bash
# テストドキュメント lint（@testdoc, @skip-reason）
shirokuma-docs lint-tests -p . -f terminal

# 実装-テストカバレッジチェック
shirokuma-docs lint-coverage -p . -f summary

# コード構造チェック（Server Actions, アノテーション）
shirokuma-docs lint-code -p . -f terminal
```

**必須チェック:**

| チェック | パス基準 | 修正方法 |
|---------|---------|---------|
| `skipped-test-report` | すべての `.skip` に `@skip-reason` あり | `@skip-reason` アノテーション追加 |
| `testdoc-required` | すべてのテストに `@testdoc` あり | 説明を追加 |
| `lint-coverage` | 新規ファイルにテストあり | テスト作成または `@skip-test` 追加 |

**問題がある場合:**
1. 不足している `@testdoc` コメントを追加
2. `.skip` テストに `@skip-reason` を追加
3. lint コマンドをクリーンになるまで再実行
4. クリーンになった後にのみステップ 7 に進む

### ステップ 7: 改善

テスト結果と lint フィードバックに基づき:
1. エッジケーステストを追加
2. UX を改善（ローディング状態、エラーハンドリング）
3. 最適化（再レンダリング削減、クエリ改善）
4. 必要に応じてドキュメントを更新

### ステップ 8: レポート生成

**Reports カテゴリに Discussion を作成:**

1. [reference/report-template.md](reference/report-template.md) の構造でレポートを作成
2. Discussion を作成:
   ```bash
   shirokuma-docs discussions create \
     --category Reports \
     --title "[Implementation] {feature-name}" \
     --body "$(cat report.md)"
   ```
3. Discussion URL をユーザーに報告

> 出力先ポリシーは `rules/output-destinations.md` 参照。

### ステップ 9: ポータル更新（重要な変更の場合）

**実行タイミング**: 重要な実装（新機能、複数ファイル、アーキテクチャ変更）の後

```bash
# ドキュメントポータルをビルド
shirokuma-docs portal -p . -o docs/portal

# または shirokuma-md スキルを使用
/shirokuma-md build
```

**ポータル更新のトリガー**:
- 新しい Server Actions を追加
- 新しい画面/ページを作成
- データベーススキーマ変更
- `@usedComponents` アノテーション付きの新コンポーネント

**スキップ**: 軽微な修正、単一ファイル変更、テストのみの更新

## リファレンスドキュメント

### スキル内ドキュメント

| ドキュメント | 内容 | 読むタイミング |
|------------|------|--------------|
| [patterns/testing.md](patterns/testing.md) | テストパターン・モック設定 | テスト作成時 |
| [patterns/code-patterns.md](patterns/code-patterns.md) | 技術パターン集 | 実装時 |
| [patterns/coding-conventions.md](patterns/coding-conventions.md) | コーディング規約 | コード記述時 |
| [patterns/better-auth.md](patterns/better-auth.md) | Better Auth 認証パターン | 認証実装時 |
| [patterns/drizzle-orm.md](patterns/drizzle-orm.md) | Drizzle ORM パターン | DB 操作実装時 |
| [patterns/e2e-testing.md](patterns/e2e-testing.md) | E2E テストパターン | Playwright テスト作成時 |
| [patterns/tailwind-v4.md](patterns/tailwind-v4.md) | Tailwind v4 CSS 変数問題 | Tailwind スタイリング時 |
| [patterns/radix-ui-hydration.md](patterns/radix-ui-hydration.md) | ハイドレーションエラー対策 | Radix UI 使用時 |
| [patterns/csrf-protection.md](patterns/csrf-protection.md) | CSRF 防御パターン | Server Action 実装時 |
| [patterns/csp.md](patterns/csp.md) | Content Security Policy | CSP 設定時 |
| [patterns/rate-limiting.md](patterns/rate-limiting.md) | レート制限パターン | API 保護実装時 |
| [patterns/image-optimization.md](patterns/image-optimization.md) | 画像最適化 | next/image 使用時 |
| [patterns/documentation.md](patterns/documentation.md) | ドキュメント規約 | JSDoc 記述時 |
| [reference/checklists.md](reference/checklists.md) | 品質チェックリスト | 実装完了後 |
| [reference/large-scale.md](reference/large-scale.md) | ファイル分割ルール | 大規模機能実装時 |
| [reference/report-template.md](reference/report-template.md) | レポートテンプレート | レポート生成時 |
| [reference/reference.md](reference/reference.md) | 外部リファレンス集 | 調査時 |
| [templates/README.md](templates/README.md) | テンプレート一覧・使い方 | コード生成時 |

## クイックコマンド

```bash
# Lint & フォーマット（推奨: 一括修正）
pnpm --filter {app} fix          # ESLint + Prettier 一括修正

# Lint & 型チェック
pnpm --filter {app} lint         # ESLint チェック
pnpm --filter {app} lint:fix     # ESLint 自動修正
pnpm --filter {app} tsc --noEmit # 型チェック

# フォーマット
pnpm --filter {app} format       # Prettier フォーマット
pnpm --filter {app} format:check # Prettier 差分チェック

# テスト
pnpm --filter {app} test
pnpm --filter {app} test --watch

# ビルド
pnpm --filter {app} build

# 開発
pnpm dev:{app}
```

## 言語

`@testdoc` タグの内容は日本語で記述する。コード、変数名は English（`git-commit-style` ルール参照）。

## 次のステップ

`working-on-issue` チェーンではなく直接起動された場合、実装後の次のワークフローステップを提案:

```
Implementation complete. Next step:
→ `/committing-on-issue` to stage and commit your changes
```

## 注意事項

- **テストは省略不可** — 例外なし、言い訳なし
- **レポートは必須** — Reports カテゴリに Discussion 作成（`rules/output-destinations.md` 参照）
- **規約は必須** — `.claude/rules/` のルールは自動読み込み
- テンプレートを出発点として使い、必要に応じてカスタマイズ
- テストを書けない場合、理由を説明して停止
