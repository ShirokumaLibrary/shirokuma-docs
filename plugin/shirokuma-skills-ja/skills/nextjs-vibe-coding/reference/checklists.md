# 実装チェックリスト

コード品質と TDD 準拠を確認するためのチェックリスト。

---

## Server Action チェックリスト

- [ ] `"use server"` ディレクティブがファイル先頭にある
- [ ] **クエリ**: `verifyAdmin()` を使用（CSRF 不要）
- [ ] **ミューテーション**: `verifyAdminMutation()` を使用（CSRF 含む）
- [ ] Zod スキーマバリデーション
- [ ] **更新/削除前にオーナーシップチェック**
- [ ] **破壊的操作にレート制限**（削除、パスワードリセット）
- [ ] **レスポンスにエラーコード**（`NOT_FOUND`, `FORBIDDEN`, `RATE_LIMIT_EXCEEDED`）
- [ ] try/catch による適切なエラーハンドリング
- [ ] 型付き `ActionResult<T>` レスポンスを返す
- [ ] キャッシュに `revalidatePath()` または `revalidateTag()`
- [ ] レスポンスに機密データを含まない

---

## ページコンポーネントチェックリスト

- [ ] 非同期 params を `await` で取得
- [ ] `setRequestLocale(locale)` を最初に呼び出す
- [ ] サーバーサイド i18n に `getTranslations()` を使用
- [ ] props に適切な TypeScript 型
- [ ] データ読み込みに Suspense バウンダリ
- [ ] 必要に応じて Error boundary (error.tsx)
- [ ] 必要に応じて Loading state (loading.tsx)

---

## Client Component チェックリスト

- [ ] `"use client"` ディレクティブがファイル先頭にある
- [ ] i18n に `useTranslations()` を使用
- [ ] フォーム送信に `useTransition()` を使用
- [ ] ローディング状態とエラー状態
- [ ] 適切なフォームバリデーション
- [ ] アクセシブルなラベルと ARIA 属性

---

## i18n チェックリスト

- [ ] `messages/ja.json` にキーを追加
- [ ] `messages/en.json` にキーを追加
- [ ] namespace パターンを使用（例: `features.form.name`）
- [ ] ロケールに応じた日付フォーマット

---

## テストファーストチェックリスト

完了報告前に確認：

- [ ] **テストファイルを実装ファイルより先に作成**
- [ ] Server Action テストが存在: `__tests__/lib/actions/{{name}}.test.ts`
- [ ] コンポーネントテストが存在: `__tests__/components/{{name}}-form.test.tsx`
- [ ] 全テストパス: `pnpm --filter admin test`
- [ ] Lint エラーなし: `pnpm --filter admin lint`
- [ ] 実装レポートを `GitHub Discussions (Reports)` に保存

---

## 完了要件

**タスク完了前に全て TRUE であること：**

- [ ] 全実装コードにテストファイルが存在
- [ ] テストは実装前に作成（TDD）
- [ ] 全テストが有効かつ実行可能（コメントアウトやスキップなし）
- [ ] テストが実際の実装動作を検証
- [ ] 実装レポートを `GitHub Discussions (Reports)` に保存済み
