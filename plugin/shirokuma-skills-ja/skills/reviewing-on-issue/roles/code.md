# コードレビューロール

## 責務

包括的なコード品質レビュー:
- TypeScript ベストプラクティス
- エラーハンドリングパターン
- 非同期操作
- コード構造と命名規則
- コードスメル検出

## 必要な知識

以下のファイルをコンテキストとして読み込む:

**スキルファイル（明示的に読み込む）:**
- `../criteria/code-quality.md` - 品質基準
- `../criteria/coding-conventions.md` - コーディング規約（命名、imports、構造）
- `../patterns/server-actions.md` - Server Action パターン
- `../patterns/drizzle-orm.md` - データベースパターン
- `../patterns/jsdoc.md` - JSDoc ドキュメントパターン

**ルール（`.claude/rules/` から自動読み込み）:**
- `tech-stack.md` - バージョン情報
- `lib-structure.md` - lib/ ディレクトリ構造ルール
- `known-issues.md` - 既知の問題

## レビューチェックリスト

### TypeScript
- [ ] `any` 型を使用していない（`unknown` を使用）
- [ ] 公開 API に明示的な戻り値型
- [ ] ランタイムチェックに型ガード使用
- [ ] strict モード準拠

### エラーハンドリング
- [ ] 空の catch ブロックなし
- [ ] エラーコンテキストを含む
- [ ] 適切なエラー型
- [ ] 内部エラーの露出なし

### 非同期パターン
- [ ] 並列操作に `Promise.all()`
- [ ] 適切な rejection ハンドリング
- [ ] 非同期パターンの混在なし

### コードスタイル
- [ ] 小さく焦点を絞った関数
- [ ] ネスト最大3レベル
- [ ] 説明的な命名
- [ ] 一貫した規約

### コードスメル
- [ ] God オブジェクトなし
- [ ] マジックナンバーなし
- [ ] デッドコードなし
- [ ] 重複コードなし
- [ ] 短いパラメータリスト

### コーディング規約
- [ ] ファイル名は kebab-case
- [ ] 変数/関数は camelCase
- [ ] コンポーネントは PascalCase
- [ ] 定数は UPPER_SNAKE_CASE
- [ ] import は整理済み（framework → npm → monorepo → local → relative）
- [ ] Boolean は `is`/`has`/`can` プレフィックス
- [ ] 未使用変数は `_` プレフィックス
- [ ] 最大3レベルのネスト
- [ ] Server Actions は構造に従う（auth → validate → try/catch）

### lib/ ディレクトリ構造
- [ ] `lib/` 直下にファイルなし（ディレクトリのみ）
- [ ] 各ディレクトリに `index.ts`（再エクスポート用）
- [ ] 外部インポートは `@/lib/{module}` を使用（直接ファイルパスではない）
- [ ] テスト可能なモジュールに `__tests__/` ディレクトリ
- [ ] `@module` と `@feature` タグが存在

参照: `patterns/lib-structure.md`

### ドキュメント品質
- [ ] 公開関数に JSDoc コメント
- [ ] すべての `@param` タグが存在し説明的
- [ ] すべての `@returns` タグが存在
- [ ] 複雑な関数に `@example`
- [ ] TypeDoc 用の `@category`
- [ ] 関連関数に `@see` リンク
- [ ] エラーケースに `@throws`
- [ ] 内部関数に `@internal`
- [ ] 型/インターフェースにプロパティコメント

### アノテーション整合性（shirokuma-docs）
- [ ] `@usedComponents` が実際の import と一致
- [ ] `@usedActions` が実際の関数呼び出しと一致
- [ ] `@dbTables` が実際の Drizzle クエリと一致
- [ ] `@route` が実際のファイルパスと一致
- [ ] `@usedInScreen` が双方向に一貫
- [ ] コンポーネント/アクション名にタイポなし

参照: `workflows/annotation-consistency.md`

## 検出すべきアンチパターン

### TypeScript アンチパターン
- [ ] `any` 型の使用（`unknown` を使うべき）
- [ ] 正当な理由のない型アサーション（`as`）
- [ ] 暗黙的 `any` の許容

### エラーハンドリング アンチパターン
- [ ] 空の catch ブロック
- [ ] エラーの握りつぶし（catch 内で処理なし）
- [ ] 内部エラー詳細のユーザーへの露出
- [ ] console.log/error のみのエラーハンドリング

### 非同期アンチパターン
- [ ] 並列化可能な逐次 `await`
- [ ] 未処理の Promise rejection
- [ ] `.then()` と `async/await` の混在

### コードスタイル アンチパターン
- [ ] God オブジェクト（責務過多のクラス/モジュール）
- [ ] マジックナンバー（説明のない数値リテラル）
- [ ] デッドコード（未使用の関数/変数/import）
- [ ] 重複コード（複数箇所の同じロジック）
- [ ] 長いパラメータリスト（4個以上）
- [ ] 深いネスト（4レベル以上）

### lib/ 構造アンチパターン
- [ ] `lib/` 直下のファイル（例: `lib/utils.ts`）
- [ ] lib サブディレクトリに `index.ts` がない
- [ ] 直接ファイルインポート（例: `from "@/lib/auth/config"`）
- [ ] `index.ts` 内のロジック（再エクスポートのみであるべき）
- [ ] テスト可能なモジュールに `__tests__/` がない
- [ ] lib 内の深いネスト（2レベル超）

### ドキュメント アンチパターン
- [ ] 公開 API に JSDoc がない
- [ ] 実装と一致しない古い JSDoc
- [ ] コメントアウトされたコードの残存

### アノテーション アンチパターン（shirokuma-docs）
- [ ] `@usedComponents` にインポートされたコンポーネントが欠落
- [ ] `@usedComponents` に未使用コンポーネントが記載
- [ ] `@usedActions` が実際の呼び出しと不一致
- [ ] `@dbTables` にアクセスされたテーブルが欠落
- [ ] 古い `@usedInScreen` 参照
- [ ] アノテーション値のタイポ（例: `SideBarGroup` vs `SidebarGroup`）

### Server Action アンチパターン（Next.js）
- [ ] 認証チェック前の処理
- [ ] CSRF バリデーションのスキップ
- [ ] Zod バリデーション前のデータ使用
- [ ] レスポンスへの機密データの含有

### テスト アンチパターン
- [ ] 実装後にテスト作成（TDD 違反）
- [ ] コメントアウトまたはスキップされたテスト
- [ ] 過度なモック（実コードのテストが不十分）
- [ ] 実装詳細のテスト（振る舞いをテストすべき）

## レポート形式

`templates/report.md` のテンプレートを使用:

1. **概要**: 発見事項の簡潔な概要
2. **重大な問題**: マージ前に修正必須
3. **検出されたアンチパターン**: 違反事項
4. **改善提案**: 推奨される変更
5. **コードスメル**: 検出されたアンチパターン
6. **コーディング規約**: 命名、import、構造の違反
7. **ドキュメントの問題**: 不足または不完全な JSDoc
8. **ベストプラクティス**: 従うべきパターン

## トリガーキーワード

- "code review"
- "review code"
- "レビューして"
- "コードレビュー"
- "annotation review", "アノテーションレビュー"
- "check usedComponents", "usedComponents確認"
- "verify annotations", "アノテーション検証"
