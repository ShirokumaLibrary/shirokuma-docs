# 画像最適化パターン

## 概要

Next.js の Image Optimization は自動リサイズ・最適化・遅延読み込みを提供する。ただし LocalStack を使う開発環境では、プライベート IP 制限に対する特別な対応が必要。

---

## LocalStack 開発環境の回避策

Next.js Image Optimization はプライベート IP（`172.x.x.x` 等）からの画像を拒否する。LocalStack の URL は `host-gateway`（通常 172.17.0.1）に解決されるため、400 Bad Request エラーが発生する。

### 問題

```
GET /_next/image?url=https://localstack.local.test/...
400 Bad Request: "url" parameter is not allowed
```

### 解決策: OptimizedAvatar コンポーネント

```typescript
"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface OptimizedAvatarProps {
  src?: string | null
  alt: string
  fallback: string
  size?: number
  className?: string
}

function shouldSkipOptimization(url: string): boolean {
  return url.includes("localstack.local.test") || url.includes("localhost:4566")
}

export function OptimizedAvatar({
  src,
  alt,
  fallback,
  size = 40,
  className,
}: OptimizedAvatarProps) {
  const [imageError, setImageError] = useState(false)

  // src 変更時にエラー状態をリセット
  useEffect(() => {
    setImageError(false)
  }, [src])

  const skipOptimization = src ? shouldSkipOptimization(src) : false

  return (
    <Avatar className={className} style={{ width: size, height: size }}>
      {src && !imageError ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="object-cover"
          onError={() => setImageError(true)}
          unoptimized={skipOptimization}
        />
      ) : (
        <AvatarFallback style={{ width: size, height: size }}>
          {fallback}
        </AvatarFallback>
      )}
    </Avatar>
  )
}
```

---

## 使用方法

```tsx
import { OptimizedAvatar } from "@/components/ui/optimized-avatar"

export function UserProfile({ user }: { user: User }) {
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?"

  return (
    <OptimizedAvatar
      src={user.image}
      alt={user.name || "User avatar"}
      fallback={initials}
      size={48}
    />
  )
}
```

---

## 実装のポイント

### 1. LocalStack URL の検出

```typescript
function shouldSkipOptimization(url: string): boolean {
  return url.includes("localstack.local.test") || url.includes("localhost:4566")
}
```

### 2. `unoptimized` プロップの使用

```tsx
<Image
  src={src}
  unoptimized={skipOptimization}  // Next.js の最適化をバイパス
/>
```

### 3. エラーフォールバック

```typescript
const [imageError, setImageError] = useState(false)

// エラー時にフォールバックを表示
onError={() => setImageError(true)}
```

### 4. ソース変更時のリセット

```typescript
useEffect(() => {
  setImageError(false)
}, [src])
```

---

## Docker 設定

コンテナが LocalStack URL を解決できるようにする：

```yaml
# docker-compose.yml
services:
  admin-app:
    extra_hosts:
      - "localstack.local.test:host-gateway"
    environment:
      - NODE_TLS_REJECT_UNAUTHORIZED=0  # 自己署名証明書用
```

---

## S3 バケットポリシー

アバター表示のためバケットをパブリック読み取り可能にする：

```bash
AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test \
aws --endpoint-url=http://localhost:4566 s3api put-bucket-policy \
  --bucket app-uploads \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::app-uploads/*"
    }]
  }' --region ap-northeast-1
```

---

## 本番環境 vs 開発環境

| 環境 | 画像ソース | 最適化 |
|------|-----------|--------|
| 本番 | AWS S3 / CloudFront | 有効 |
| 開発 | LocalStack | 無効（`unoptimized` 使用） |
| ローカルファイル | `public/` ディレクトリ | 有効 |

---

## テスト

```typescript
describe("OptimizedAvatar", () => {
  it("skips optimization for LocalStack URLs", () => {
    const { container } = render(
      <OptimizedAvatar
        src="https://localstack.local.test/app-uploads/avatar.jpg"
        alt="Avatar"
        fallback="AB"
      />
    )

    const img = container.querySelector("img")
    expect(img).toHaveAttribute("src", expect.stringContaining("localstack"))
    // /_next/image を経由しないこと
  })

  it("shows fallback on error", async () => {
    const { getByText } = render(
      <OptimizedAvatar
        src="https://invalid-url.test/broken.jpg"
        alt="Avatar"
        fallback="AB"
      />
    )

    // エラーをシミュレート
    fireEvent.error(screen.getByRole("img"))

    await waitFor(() => {
      expect(getByText("AB")).toBeInTheDocument()
    })
  })
})
```
