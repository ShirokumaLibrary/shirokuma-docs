# TDD 共通ワークフロー

`working-on-issue` がオーケストレートする TDD（テスト駆動開発）の共通ステップ。
実装スキル（`coding-nextjs`, 直接編集等）の前後に挟んで実行する。

## フロー

```
テスト設計 → テスト作成 → テスト確認（ゲート）→ [実装スキル] → テスト実行 → 検証
```

## ステップ 1: テスト設計

対象機能のテストケースを設計する:

- **What**: テスト対象の機能・振る舞い
- **Scope**: ユニットテスト / 統合テスト / E2E テスト
- **Cases**: 正常系、異常系、エッジケース

### 最低テストカバレッジ

| 対象 | 必須テストケース |
|------|----------------|
| Server Actions | Create, Read（リスト + 単一）, Update, Delete |
| コンポーネント | レンダリング、フォーム送信、バリデーションエラー、ローディング状態 |
| API ルート | リクエスト成功、認証エラー、バリデーションエラー |
| ユーティリティ | 正常系、エッジケース、エラーケース |

## ステップ 2: テスト作成

実装コードの**前に**テストファイルを作成する。

### @testdoc コメント（必須）

各テストに説明付き JSDoc コメントを追加:

```typescript
/**
 * @testdoc ユーザーを新規作成できる
 * @purpose 正常なユーザー作成APIフローを検証
 * @precondition 有効なユーザーデータが提供される
 * @expected ユーザーがDBに保存されIDが返る
 */
it("should create a new user", async () => {
  // テスト実装
});
```

> @testdoc の内容は日本語で記述する。

## ステップ 3: テスト確認（ゲート）

**このゲートを通過せずに実装に進まない。**

テストファイルの存在を確認:

```bash
ls -la __tests__/lib/actions/{{name}}.test.ts
ls -la __tests__/components/{{name}}.test.tsx
```

テストファイルが存在しなければ、ステップ 2 に戻る。

## ステップ 4: テスト実行

実装完了後、すべてのテストが通ることを確認:

```bash
# ユニットテスト
pnpm --filter {app} test

# Lint & 型チェック
pnpm --filter {app} lint
pnpm --filter {app} tsc --noEmit
```

### テスト失敗時

1. **テストではなく実装を修正**
2. すべて通るまでテストを再実行
3. 通った後にのみ次のステップに進む

## ステップ 5: ドキュメント検証

```bash
# テストドキュメント lint
shirokuma-docs lint-tests -p . -f terminal

# 実装-テストカバレッジチェック
shirokuma-docs lint-coverage -p . -f summary

# コード構造チェック
shirokuma-docs lint-code -p . -f terminal
```

| チェック | パス基準 | 修正方法 |
|---------|---------|---------|
| `skipped-test-report` | すべての `.skip` に `@skip-reason` あり | `@skip-reason` 追加 |
| `testdoc-required` | すべてのテストに `@testdoc` あり | 説明を追加 |
| `lint-coverage` | 新規ファイルにテストあり | テスト作成 or `@skip-test` |

## 必須ルール

- テストは省略不可 — 例外なし
- テストファイルが作成・確認されるまで実装に進まない
- テストをスキップした場合、スキルの基本契約に違反する
