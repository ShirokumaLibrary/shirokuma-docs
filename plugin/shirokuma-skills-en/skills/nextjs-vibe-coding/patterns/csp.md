# Content Security Policy (CSP) for Next.js

## Production CSP Configuration

Next.js apps with Monaco Editor or Radix UI require specific CSP settings:

```typescript
// lib/csp-nonce.ts
export function buildCspHeader(nonce: string, isDevelopment: boolean): string {
  const cspDirectives = isDevelopment
    ? [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // HMR requires eval
        "style-src 'self' 'unsafe-inline'",
        "worker-src 'self' blob:",  // Monaco Editor workers
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss:",  // HMR WebSocket
        "frame-ancestors 'none'",
      ]
    : [
        "default-src 'self'",
        "script-src 'self' 'nonce-${nonce}' 'strict-dynamic'",  // Nonce-based
        "style-src 'self' 'unsafe-inline'",  // Required for Radix UI/Monaco
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

## Why `style-src 'unsafe-inline'`?

- **Monaco Editor**: Dynamically generates inline styles for syntax highlighting, line numbers, etc.
- **Radix UI**: Injects inline styles for positioning popups, animations
- **next-themes**: May inject inline styles for theme switching

These libraries cannot use nonce-based styles because they inject styles at runtime.

## Why `worker-src 'self' blob:`?

Monaco Editor uses Web Workers for:
- Language services (TypeScript, JSON validation)
- Syntax highlighting
- Code completion

Workers are created from blob URLs, which require `blob:` in `worker-src`.

## Common CSP Errors and Fixes

| Error | Missing CSP Directive |
|-------|----------------------|
| "style-src ... violated" | `'unsafe-inline'` in style-src |
| "worker ... blob: violated" | `blob:` in worker-src |
| Monaco no syntax colors | Both above missing |

## Middleware Implementation

CSP is applied in middleware with per-request nonce:

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

## Storage Host for Images

If using external storage (S3, etc.), add the host to `img-src`:

```typescript
const storageHost = process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL
  ? new URL(process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL).origin
  : ""

const imgSrc = storageHost
  ? `img-src 'self' data: blob: ${storageHost}`
  : "img-src 'self' data: blob:"
```
