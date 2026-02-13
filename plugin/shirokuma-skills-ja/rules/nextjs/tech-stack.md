# 技術スタックリファレンス

## 推奨スタック

| カテゴリ | テクノロジー |
|----------|-------------|
| フロントエンド | Next.js 16 / React 19 / TypeScript 5 |
| データベース | PostgreSQL 16 + Drizzle ORM |
| 認証 | Better Auth（DB セッション） |
| i18n | next-intl (ja/en) |
| スタイリング | Tailwind CSS v4 + shadcn/ui |
| テスト | Jest + Playwright |

> プロジェクトの `package.json` に合わせてバージョンを更新してください。

## 主要パターン

| パターン | 概要 |
|----------|------|
| Async Params | `params: Promise<...>` → `await params` |
| Server Actions | Auth → CSRF → Validation → DB → Redirect |
| CSRF 保護 | クエリ: 読み取り専用チェック、ミューテーション: CSRF トークン |
| レート制限 | 破壊的操作に `checkRateLimit()` |
| 所有権チェック | ミューテーション前に `authorId === userId` を検証 |

## Radix UI ハイドレーション（重要）

```typescript
const [mounted, setMounted] = useState(false)
useEffect(() => { setMounted(true) }, [])

if (!mounted) return <PlaceholderWithoutRadixUI />
return <ComponentWithRadixUI />
```

## 既知の問題クイックリファレンス

| 問題 | 修正 |
|------|------|
| ハイドレーション不一致 | `mounted` ステートパターンを使用 |
| 本番で CSS 変数が壊れる | `@theme inline` を使用 |
| ログインリダイレクトループ | `window.location.href` を使用 |
| CSP: インラインスタイルがブロック | `'unsafe-inline'` を追加 |
