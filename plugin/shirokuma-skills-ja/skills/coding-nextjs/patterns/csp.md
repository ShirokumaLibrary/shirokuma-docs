# Content Security Policy (CSP) - Next.js 向け

## 本番環境の CSP 設定

Monaco Editor や Radix UI を使用する Next.js アプリに必要な CSP 設定：

```typescript
// lib/csp-nonce.ts
export function buildCspHeader(nonce: string, isDevelopment: boolean): string {
  const cspDirectives = isDevelopment
    ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // HMR に eval が必要
        "style-src 'self' 'unsafe-inline'",
        "worker-src 'self' blob:",  // Monaco Editor workers
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss:",  // HMR WebSocket
        "frame-ancestors 'none'",
      ]
    : [
        "default-src 'self'",
        "script-src 'self' 'nonce-${nonce}' 'strict-dynamic'",  // Nonce ベース
        "style-src 'self' 'unsafe-inline'",  // Radix UI/Monaco に必要
        "worker-src 'self' blob:",  // Monaco Editor workers
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
        "upgrade-insecure-requests",
      ]

  return cspDirectives.join("; ")
}
```

## `style-src 'unsafe-inline'` が必要な理由

- **Monaco Editor**: シンタックスハイライト・行番号等にインラインスタイルを動的生成
- **Radix UI**: ポップアップ配置・アニメーションにインラインスタイルを注入
- **next-themes**: テーマ切替時にインラインスタイルを注入する場合がある

これらはランタイムでスタイルを注入するため、nonce ベースのスタイルが使用できない。

## `worker-src 'self' blob:` が必要な理由

Monaco Editor が Web Worker を使用する項目：
- 言語サービス（TypeScript, JSON バリデーション）
- シンタックスハイライト
- コード補完

Worker は blob URL から生成されるため `worker-src` に `blob:` が必要。

## よくある CSP エラーと修正

| エラー | 不足している CSP ディレクティブ |
|--------|-------------------------------|
| "style-src ... violated" | style-src に `'unsafe-inline'` |
| "worker ... blob: violated" | worker-src に `blob:` |
| Monaco のシンタックスカラーなし | 上記の両方が不足 |

## ミドルウェア実装

リクエストごとの nonce で CSP を適用：

```typescript
// middleware.ts
import { generateNonce, buildCspHeader } from "@/lib/csp-nonce"

export default function middleware(request: NextRequest) {
  const nonce = generateNonce()
  const cspHeader = buildCspHeader(nonce)

  const response = handleI18nRouting(request)
  response.headers.set("Content-Security-Policy", cspHeader)
  response.headers.set("x-nonce", nonce)

  return response
}
```

## 外部ストレージの画像ホスト

S3 等の外部ストレージを使用する場合、`img-src` にホストを追加：

```typescript
const storageHost = process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL
  ? new URL(process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL).origin
  : ""

const imgSrc = storageHost
  ? `img-src 'self' data: blob: ${storageHost}`
  : "img-src 'self' data: blob:"
```
