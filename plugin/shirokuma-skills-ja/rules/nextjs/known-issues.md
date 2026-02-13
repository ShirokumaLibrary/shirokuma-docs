# 既知の問題と CVE

## 重大な CVE

### CVE-2025-29927 (Next.js)

**深刻度**: Critical (9.1)
**影響**: Next.js < 15.2.3
**問題**: `x-middleware-subrequest` ヘッダーによるミドルウェア認証バイパス

**緩和策**（アップグレードできない場合）:
```nginx
if ($http_x_middleware_subrequest) {
    return 403;
}
proxy_set_header x-middleware-subrequest "";
```

## フレームワークの問題

### Next.js 16

| 問題 | 修正 |
|------|------|
| 非同期 params エラー | `const { slug } = await params` |
| Node.js 18 のサポート終了 | Node.js 20.9.0+ にアップグレード |

### React 19

| 問題 | 修正 |
|------|------|
| ハイドレーション不一致 | mounted ステートパターンを使用 |
| ref を prop として渡す（非推奨） | `element.props.ref` を使用 |

### Tailwind CSS v4

| 問題 | 修正 |
|------|------|
| CSS 変数構文 | `var()` を使用: `w-[var(--width)]` |
| @property の継承 | `@theme inline` を使用 |

### Better Auth

| 問題 | 修正 |
|------|------|
| ログインリダイレクトループ | `window.location.href` を使用 |
| セッションにロールがない | ロールをデータベースから照会 |

## バージョン要件

- **Node.js**: 20.9.0+
- **TypeScript**: 5.1.0+
- **Safari**: 16.4+（Tailwind v4）

## セキュリティ要件

- **BETTER_AUTH_SECRET**: 32文字以上
- **bcrypt ラウンド数**: 12+
- **レート制限**: 5回 / 15分（本番環境）
