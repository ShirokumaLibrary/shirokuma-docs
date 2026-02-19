# テンプレートディレクトリ

coding-nextjs スキル用のコードテンプレート。

## テンプレートの種類

### 単一ファイルテンプレート（デフォルト）

分割閾値未満の新機能用：

| テンプレート | 用途 | 閾値 |
|-------------|------|------|
| `server-action.ts.template` | 1ファイルの CRUD アクション | 300行未満 |
| `server-action.test.ts.template` | アクションテスト | 300行未満 |
| `form-component.tsx.template` | フォームコンポーネント | 250行未満 |
| `page-*.tsx.template` | ページテンプレート | 250行未満 |
| `translations.json.template` | 1機能の i18n | 50キー未満 |

### 分割テンプレート（大規模用）

閾値超過時の機能用：

#### Server Actions (`server-action-split/`)

アクションファイルが **300行または8関数以上** の場合に使用：

| ファイル | 用途 |
|---------|------|
| `lib/actions/{{name}}s/index.ts` | バレルエクスポート |
| `lib/actions/{{name}}s/types.ts` | 型とバリデーション |
| `lib/actions/{{name}}s/queries.ts` | 読み取り操作 |
| `lib/actions/{{name}}s/mutations.ts` | 書き込み操作 |

#### Messages (`messages-split/`)

メッセージが **300行または200キー以上** の場合に使用：

| ファイル | 用途 |
|---------|------|
| `messages/{{locale}}/index.ts` | 統合ファイル |
| `messages/{{locale}}/common.json` | 共通 UI 文字列 |
| `messages/{{locale}}/errors.json` | エラーメッセージ |
| `messages/{{locale}}/feature.json` | 機能固有 |

## 使い方

### 新機能の作成（小規模）

```bash
# 単一ファイルテンプレートを使用
cat templates/server-action.ts.template | sed 's/{{name}}/post/g; s/{{Name}}/Post/g'
```

### 既存機能の分割

ファイルが閾値を超えた場合：

1. ディレクトリ作成: `mkdir lib/actions/{{name}}s`
2. 分割テンプレートをコピー
3. コードを適切なファイルに移動
4. バレルエクスポート（index.ts）を作成
5. import を更新（バレル経由で変更不要のはず）

## テンプレート変数

| 変数 | 例 | 説明 |
|------|-----|------|
| `{{name}}` | `post` | 小文字単数形 |
| `{{Name}}` | `Post` | PascalCase 単数形 |
| `{{name}}s` | `posts` | 小文字複数形 |
| `{{locale}}` | `ja` | ロケールコード |

## ベストプラクティス

1. **単一ファイルから始める** - 閾値超過時のみ分割
2. **import を維持** - バレルエクスポートで後方互換性を確保
3. **テストは構造に従う** - 分割テストは分割アクションに対応
4. **CLAUDE.md を更新** - 新しい構造をドキュメント化

## 標準テンプレート（JSDoc 準拠）

**shirokuma-docs lint-code 準拠**のテンプレートは [server-action.md](./server-action.md) を参照。

このテンプレートが保証する内容：
- モジュールヘッダーに `@serverAction`, `@feature`, `@dbTables` タグ
- 関数 JSDoc に `@serverAction`, `@feature`, `@returns` タグ
- 可読性のためのセクション区切り
- 型定義を別ファイル `*-types.ts` に分離

### 検証

```bash
# shirokuma-docs でコンプライアンスチェック
node shirokuma-docs/dist/index.js lint-code -p path/to/project -v
```

## Server Action テンプレートの機能

`server-action.ts.template` に含まれるパターン：

| パターン | 説明 |
|---------|------|
| **二関数認証** | クエリ: `verifyAdmin()`、ミューテーション: `verifyAdminMutation()`（CSRF 含む） |
| **エラーコード** | `ActionErrorCode` 型（`NOT_FOUND`, `FORBIDDEN`, `RATE_LIMIT_EXCEEDED` 等） |
| **オーナーシップチェック** | 更新/削除前にユーザーがリソースを所有しているか検証 |
| **レート制限** | 破壊的操作（削除）を保護 |

→ 詳細は [code-patterns.md](../patterns/code-patterns.md) を参照
