# レート制限パターン

## 概要

レート制限は不正利用やブルートフォース攻撃から保護する。削除、パスワードリセット、API 呼び出し等の破壊的・高コスト操作に適用する。

---

## 実装

### レートリミッター設定

```typescript
// lib/rate-limit.ts
import { Redis } from "@upstash/redis"  // または ioredis

const redis = new Redis({
  url: process.env.REDIS_URL!,
})

export const RateLimiters = {
  delete: { windowMs: 60_000, maxRequests: 10 },        // 1分あたり10回の削除
  create: { windowMs: 60_000, maxRequests: 30 },        // 1分あたり30回の作成
  comment: { windowMs: 60_000, maxRequests: 5 },        // 1分あたり5回のコメント
  passwordReset: { windowMs: 3600_000, maxRequests: 3 }, // 1時間あたり3回
  login: { windowMs: 300_000, maxRequests: 5 },         // 5分あたり5回のログイン試行
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  reset: number  // 制限リセットの Unix タイムスタンプ
}

export async function checkRateLimit(
  key: string,
  limiter: { windowMs: number; maxRequests: number }
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - limiter.windowMs

  // 古いエントリを削除
  await redis.zremrangebyscore(key, 0, windowStart)

  // 現在のリクエスト数をカウント
  const count = await redis.zcard(key)

  if (count >= limiter.maxRequests) {
    // 最古のエントリからリセット時間を計算
    const oldest = await redis.zrange(key, 0, 0, { withScores: true })
    const resetTime = oldest.length > 0 ? oldest[0].score + limiter.windowMs : now + limiter.windowMs

    return {
      success: false,
      remaining: 0,
      reset: resetTime / 1000,  // 秒に変換
    }
  }

  // 現在のリクエストを追加
  await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` })
  await redis.expire(key, Math.ceil(limiter.windowMs / 1000))

  return {
    success: true,
    remaining: limiter.maxRequests - count - 1,
    reset: (now + limiter.windowMs) / 1000,
  }
}
```

---

## Server Actions での使用

認証の後、ビジネスロジックの前にレート制限を適用する：

```typescript
export async function deleteFeature(id: string): Promise<ActionResult> {
  // Step 1: 認証 + CSRF
  const userId = await verifyAdminMutation()

  // Step 2: レート制限
  const rateLimitKey = `delete-feature:${userId}`
  const rateLimitResult = await checkRateLimit(rateLimitKey, RateLimiters.delete)

  if (!rateLimitResult.success) {
    const waitSeconds = Math.ceil((rateLimitResult.reset * 1000 - Date.now()) / 1000)
    return {
      success: false,
      error: `Rate limit exceeded. Try again in ${waitSeconds}s`,
      code: "RATE_LIMIT_EXCEEDED",
    }
  }

  // Step 3: 操作を続行...
  // ...
}
```

---

## レート制限が必要な操作

| 操作 | リミッター | 理由 |
|------|-----------|------|
| 削除 | `RateLimiters.delete` | 大量削除の防止 |
| パスワードリセット | `RateLimiters.passwordReset` | メール送信の濫用防止 |
| ログイン試行 | `RateLimiters.login` | ブルートフォース防止 |
| コメント作成 | `RateLimiters.comment` | スパム防止 |
| メール認証 | `RateLimiters.passwordReset` | メール送信の濫用防止 |
| ファイルアップロード | `RateLimiters.create` | ストレージ濫用防止 |

---

## キーのパターン

### 1. ユーザーベースのキー

```typescript
const rateLimitKey = `delete-feature:${userId}`
```

### 2. IP ベースのキー（未認証エンドポイント用）

```typescript
const ip = headersList.get("x-forwarded-for") || "unknown"
const rateLimitKey = `password-reset:${ip}`
```

### 3. 複合キー

```typescript
const rateLimitKey = `comment:${userId}:${postId}`
```

---

## エラーレスポンスパターン

プログラム的なハンドリングのため `code` を常に含める：

```typescript
return {
  success: false,
  error: `Rate limit exceeded. Try again in ${waitSeconds}s`,
  code: "RATE_LIMIT_EXCEEDED",
}
```

---

## UI でのハンドリング

```typescript
const result = await deleteFeature(id)

if (!result.success) {
  if (result.code === "RATE_LIMIT_EXCEEDED") {
    toast.error(result.error)  // 待機時間を表示
    return
  }
  // その他のエラーを処理
}
```

---

## レート制限のテスト

```typescript
it("enforces rate limit on delete", async () => {
  // レート制限超過をモック
  mockCheckRateLimit.mockResolvedValueOnce({
    success: false,
    remaining: 0,
    reset: Date.now() / 1000 + 30,
  })

  const result = await deleteFeature("feature-1")

  expect(result).toEqual({
    success: false,
    error: expect.stringContaining("Rate limit"),
    code: "RATE_LIMIT_EXCEEDED",
  })
})
```
