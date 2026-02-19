# Next.js Vibe Coder ナレッジベース

---

## ドキュメント構造

各ファイルの責任範囲：

| ファイル | 責任 | 内容 |
|---------|------|------|
| **AGENT.md** | ワークフロー | 8ステップの実装手順のみ |
| **reference.md**（このファイル） | クイックリファレンス | Tech Stack, Pattern一覧, Known Issues |
| **checklists.md** | 品質ゲート | 実装完了前のチェックリスト |
| **templates/README.md** | テンプレート仕様 | テンプレート一覧と使い方 |
| **large-scale.md** | 分割ルール | ファイル分割の閾値とパターン |
| **patterns/*.md** | 詳細パターン | 個別の技術パターン（Source of Truth） |

**原則**: 情報は1箇所のみに記載。他は参照リンクのみ。

---

## 技術スタック

| カテゴリ | テクノロジー |
|----------|-------------|
| フロントエンド | Next.js 16 / React 19 / TypeScript 5 |
| データベース | PostgreSQL 16 + Drizzle ORM |
| 認証 | Better Auth（DBセッション） |
| i18n | next-intl (ja/en) |
| スタイリング | Tailwind CSS v4 + shadcn/ui |
| テスト | Jest + Playwright |

> 詳細バージョン: プロジェクトの `CLAUDE.md` を参照

---

## パターンファイル

詳細パターンは `patterns/` に整理されている。

| ファイル | 説明 |
|---------|------|
| [coding-conventions.md](patterns/coding-conventions.md) | 命名規則、import順序、TypeScript、コンポーネント構造 |
| [testing.md](patterns/testing.md) | Jest設定、モック、リダイレクトモック、i18n E2Eセレクタ |
| [code-patterns.md](patterns/code-patterns.md) | 非同期params、Server Actions、i18n、フォーム、オーナーシップチェック |
| [drizzle-orm.md](patterns/drizzle-orm.md) | スキーマ構成、クエリ、ページネーション、ILIKE |
| [better-auth.md](patterns/better-auth.md) | 管理者認証、クライアントサイドセッション |
| [tailwind-v4.md](patterns/tailwind-v4.md) | CSSファースト設定、変数構文、shadcn/ui |
| [radix-ui-hydration.md](patterns/radix-ui-hydration.md) | **重要** DropdownMenu 用の mounted ステートパターン |
| [csp.md](patterns/csp.md) | 本番CSP、style-src、worker-src 設定 |
| [e2e-testing.md](patterns/e2e-testing.md) | テスト分離、フィクスチャ、ローディング状態テスト |
| [documentation.md](patterns/documentation.md) | テストドキュメント、APIドキュメント、JSDocパターン |
| [csrf-protection.md](patterns/csrf-protection.md) | 二関数認証パターン、CSRFバリデーション |
| [rate-limiting.md](patterns/rate-limiting.md) | Redisベースレート制限、リミッター設定 |
| [image-optimization.md](patterns/image-optimization.md) | LocalStack回避策、OptimizedAvatar |

---

## クイックリファレンス

詳細はパターンファイルを参照。ここでは最重要パターンのみ記載。

### Radix UI ハイドレーション（重要）

```typescript
const [mounted, setMounted] = useState(false)
useEffect(() => { setMounted(true) }, [])

if (!mounted) return <PlaceholderWithoutRadixUI />
return <ComponentWithRadixUI />
```

→ 詳細: [radix-ui-hydration.md](patterns/radix-ui-hydration.md)

### 主要パターン（詳細は各ファイル参照）

| パターン | ファイル | 概要 |
|---------|---------|------|
| 非同期 Params | [code-patterns.md](patterns/code-patterns.md) | `params: Promise<...>` → `await params` |
| Server Actions | [code-patterns.md](patterns/code-patterns.md) | `verifyAdminMutation()` → Validation → DB → Redirect |
| CSRF 保護 | [csrf-protection.md](patterns/csrf-protection.md) | クエリ: `verifyAdmin()`, ミューテーション: `verifyAdminMutation()` |
| レート制限 | [rate-limiting.md](patterns/rate-limiting.md) | 破壊的操作に `checkRateLimit()` |
| オーナーシップチェック | [code-patterns.md](patterns/code-patterns.md) | ミューテーション前に `authorId === userId` を検証 |

---

## 既知の問題

| 問題 | 症状 | 修正 |
|------|------|------|
| ハイドレーション不一致 | コンソールエラー "Hydration failed..." | `mounted` ステートパターンを使用 |
| サイドバーの重なり | shadcn コンポーネント追加後にレイアウト崩れ | CSS 変数 fix スクリプトを実行 |
| ILIKE インジェクション | 検索で予期しない結果 | `escapeLikePattern()` を使用 |
| ページ読み込み遅延 | N+1 クエリ | `inArray()` でバッチクエリ |
| 静的レンダリング失敗 | 翻訳が遅い | `setRequestLocale(locale)` を追加 |
| 日本語 404 | タグ/カテゴリページが見つからない | `decodeURIComponent(slug)` を使用 |
| ログインリダイレクトループ | ログイン成功後もログインに戻る | `window.location.href` を使用 |
| CSP: インラインスタイルブロック | 本番: "style-src ... violated" | style-src に `'unsafe-inline'` 追加 |
| Monaco Editor 壊れ | シンタックスハイライトなし、Worker エラー | CSP に `worker-src 'self' blob:'` 追加 |
| LocalStack 画像 400 | アバター非表示、400 Bad Request | `unoptimized` プロップ使用。[image-optimization.md](patterns/image-optimization.md) 参照 |
| レート制限超過 | "Try again in Xs" エラー | 想定動作。待機するか `RateLimiters` 設定を調整 |

---

## コマンドリファレンス

```bash
# テスト
pnpm --filter admin test              # 全実行
pnpm --filter admin test --watch      # ウォッチモード
pnpm --filter admin test --coverage   # カバレッジ付き
npx playwright test --reporter=list   # E2E テスト（Playwright Server）

# Lint
pnpm --filter admin lint              # ESLint
pnpm --filter admin lint --fix        # 自動修正
pnpm --filter admin tsc --noEmit      # TypeScript

# 開発
pnpm dev:admin                        # 開発サーバー起動
pnpm --filter admin build             # 本番ビルド

# データベース
pnpm --filter @repo/database db:push  # スキーマ適用
pnpm --filter @repo/database db:seed  # シードデータ投入
```

---

## シードデータ構造

### テストアカウント

| ロール | メール | パスワード |
|--------|--------|-----------|
| Admin | admin@example.com | Admin@Test2024! |
| User | user@example.com | User@Test2024! |

### コンテンツデータ

| エンティティ | 件数 | 備考 |
|-------------|------|------|
| カテゴリ | 5 | 技術, プログラミング, Web開発 等 |
| タグ | 10 | JavaScript, TypeScript, React 等 |
| 投稿 | 150 | カテゴリあたり30件、Markdown コンテンツ付き |
| コメント | ~45 | 承認/保留/削除済みの混在、返信を含む |

### シード実行

```bash
# Docker 内（正しい DATABASE_URL を使用）
docker compose exec -T admin-app pnpm --filter @repo/database db:seed

# 直接実行（明示的な URL）
DATABASE_URL="postgresql://..." pnpm --filter @repo/database db:seed
```

---

## ファイル構造リファレンス

| パス | 用途 |
|------|------|
| `app/[locale]/(dashboard)/features/page.tsx` | 一覧ページ |
| `app/[locale]/(dashboard)/features/new/page.tsx` | 作成ページ |
| `app/[locale]/(dashboard)/features/[id]/edit/page.tsx` | 編集ページ |
| `components/ui/` | shadcn/ui コンポーネント |
| `components/feature-form.tsx` | 機能固有のフォーム |
| `lib/actions/features.ts` | Server Actions |
| `messages/{ja,en}/` | i18n 翻訳（ディレクトリ形式） |
| `__tests__/` | ユニットテスト |
