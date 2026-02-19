# 大規模ファイル分割ルール

大規模プロジェクトでのファイル分割に関するルール。

---

## 分割閾値

| ファイル種類 | 閾値 | アクション |
|-------------|------|----------|
| Server Actions | 300行 or 8関数以上 | ドメイン/操作で分割 |
| i18n メッセージ | 300行 or 200キー以上 | namespace で分割 |
| コンポーネント | 250行 | サブコンポーネントを抽出 |
| スキーマ | 20テーブル以上 or 500行以上 | ドメインで分割（reference.md 参照） |

---

## Server Actions 分割パターン

**300行を超えた場合、機能別に分割：**

| ファイル | 用途 |
|---------|------|
| `lib/actions/posts/index.ts` | バレルエクスポート |
| `lib/actions/posts/queries.ts` | getPaginatedPosts, getPostBySlug |
| `lib/actions/posts/mutations.ts` | createPost, updatePost, deletePost |
| `lib/actions/posts/filters.ts` | getPostsByCategory, getPostsByTag |
| `lib/actions/__tests__/posts.test.ts` | テスト（元の場所を維持） |

**重要**: テストファイルは `lib/actions/__tests__/` に維持。アクション分割時にテスト構造を変更しない。

**index.ts:**
```typescript
export * from './queries'
export * from './mutations'
export * from './filters'
```

---

## i18n メッセージ分割パターン

**300行を超えた場合、namespace 別に分割：**

| ファイル | 用途 |
|---------|------|
| `messages/{locale}/index.ts` | 統合エクスポート |
| `messages/{locale}/common.json` | 共通 UI（ボタン、ラベル） |
| `messages/{locale}/auth.json` | 認証（ログイン、サインアップ） |
| `messages/{locale}/content.json` | コンテンツ（投稿、カテゴリ） |
| `messages/{locale}/errors.json` | エラーメッセージ |
| `messages/{locale}/validation.json` | 入力バリデーション |

**index.ts:**
```typescript
import common from './common.json'
import auth from './auth.json'
import content from './content.json'
import errors from './errors.json'
import validation from './validation.json'

export default { common, auth, content, errors, validation }
```

**next-intl 設定の更新 (`i18n/request.ts`):**
```typescript
import messages from `@/messages/${locale}`
return { locale, messages }
```

---

## コンポーネント分割パターン

**250行を超えるコンポーネントはサブコンポーネントに分割：**

| ファイル | 用途 |
|---------|------|
| `post-form.tsx` | メインラッパー（~80行） |
| `post-form-editor.tsx` | Markdown エディタセクション |
| `post-form-meta.tsx` | タイトル、スラッグ、抜粋 |
| `post-form-category.tsx` | カテゴリ選択 |
| `post-form-tags.tsx` | タグ選択 |
| `post-form-actions.tsx` | 保存/キャンセルボタン |

**post-form.tsx:**
```tsx
export function PostForm({ post, categories, tags }: PostFormProps) {
  return (
    <form action={handleSubmit}>
      <PostFormMeta defaultValues={post} />
      <PostFormEditor content={post?.content} />
      <PostFormCategory categories={categories} />
      <PostFormTags tags={tags} />
      <PostFormActions isPending={isPending} />
    </form>
  )
}
```

---

## 共有ユーティリティの抽出

**複数ファイルで使用するロジックを抽出：**

| ファイル | 用途 |
|---------|------|
| `lib/actions/shared/pagination.ts` | ページネーションヘルパー |
| `lib/actions/shared/filters.ts` | フィルタリングヘルパー |
| `lib/actions/shared/validation.ts` | 共通バリデーション |

---

## 分割チェックリスト

- [ ] バレルエクスポート（index.ts）を作成
- [ ] 既存の import パスを維持（後方互換性）
- [ ] テストは `lib/actions/__tests__/` に維持（分割不要）
- [ ] ドキュメントを更新（CLAUDE.md）

---

## 分割テンプレート

閾値超過時はこれらのテンプレートを使用：

| ディレクトリ | 用途 |
|-------------|------|
| `templates/server-action-split/` | Server Actions の分割 |
| `templates/messages-split/` | i18n メッセージの分割 |

詳細は [templates/README.md](templates/README.md) を参照。

---

## 参考

- **テンプレート詳細**: [templates/README.md](templates/README.md)
- **スキーマ分割**: [reference.md - Drizzle ORM](reference.md)
- **テストパターン**: [patterns/testing.md](patterns/testing.md)
