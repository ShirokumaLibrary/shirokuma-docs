# 推奨技術スタック

Next.js プロジェクト向けの推奨スタックとバージョン要件。

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

## バージョン要件

| ソフトウェア | 最小バージョン | 備考 |
|-------------|-------------|------|
| Node.js | 20.9.0+ | Next.js 16 要件 |
| TypeScript | 5.1.0+ | — |
| Safari | 16.4+ | Tailwind CSS v4 @property サポート |

## セキュリティ要件

| 設定 | 要件 |
|------|------|
| `BETTER_AUTH_SECRET` | 32文字以上（`openssl rand -base64 32` で生成） |
| bcrypt ラウンド数 | 12+ |
| レート制限 | 5回 / 15分（本番環境） |

## 主要パターン（クイックリファレンス）

| パターン | 概要 |
|----------|------|
| Async Params | `params: Promise<...>` → `await params` |
| Server Actions | Auth → CSRF → Validation → DB → Redirect |
| CSRF 保護 | クエリ: 読み取り専用チェック、ミューテーション: CSRF トークン |
| レート制限 | 破壊的操作に `checkRateLimit()` |
| 所有権チェック | ミューテーション前に `authorId === userId` を検証 |

詳細な実装パターンは `patterns/` 配下の各ファイルを参照。
