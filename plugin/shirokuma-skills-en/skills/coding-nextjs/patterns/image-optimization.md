# Image Optimization Pattern

## Overview

Next.js Image Optimization provides automatic resizing, optimization, and lazy loading. However, development environments using LocalStack require special handling due to private IP restrictions.

---

## LocalStack Development Workaround

Next.js Image Optimization rejects images from private IPs (like `172.x.x.x`). LocalStack URLs resolve to `host-gateway` (typically 172.17.0.1), causing 400 Bad Request errors.

### Problem

```
GET /_next/image?url=https://localstack.local.test/...
400 Bad Request: "url" parameter is not allowed
```

### Solution: OptimizedAvatar Component

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

  // Reset error state when src changes
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

## Usage

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

## Key Implementation Points

### 1. Detect LocalStack URLs

```typescript
function shouldSkipOptimization(url: string): boolean {
  return url.includes("localstack.local.test") || url.includes("localhost:4566")
}
```

### 2. Use `unoptimized` Prop

```tsx
<Image
  src={src}
  unoptimized={skipOptimization}  // Bypasses Next.js optimization
/>
```

### 3. Error Fallback

```typescript
const [imageError, setImageError] = useState(false)

// On error, show fallback
onError={() => setImageError(true)}
```

### 4. Reset on Source Change

```typescript
useEffect(() => {
  setImageError(false)
}, [src])
```

---

## Docker Configuration

Ensure containers can resolve LocalStack URLs:

```yaml
# docker-compose.yml
services:
  admin-app:
    extra_hosts:
      - "localstack.local.test:host-gateway"
    environment:
      - NODE_TLS_REJECT_UNAUTHORIZED=0  # For self-signed certs
```

---

## S3 Bucket Policy

Ensure bucket is publicly readable for avatar display:

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

## Production vs Development

| Environment | Image Source | Optimization |
|-------------|--------------|--------------|
| Production | AWS S3 / CloudFront | ✅ Enabled |
| Development | LocalStack | ❌ Disabled (via `unoptimized`) |
| Local File | `public/` directory | ✅ Enabled |

---

## Testing

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
    // Should NOT go through /_next/image
  })

  it("shows fallback on error", async () => {
    const { getByText } = render(
      <OptimizedAvatar
        src="https://invalid-url.test/broken.jpg"
        alt="Avatar"
        fallback="AB"
      />
    )

    // Simulate error
    fireEvent.error(screen.getByRole("img"))

    await waitFor(() => {
      expect(getByText("AB")).toBeInTheDocument()
    })
  })
})
```
