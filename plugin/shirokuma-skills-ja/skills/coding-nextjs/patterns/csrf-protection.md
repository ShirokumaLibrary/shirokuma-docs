# CSRF 保護パターン

## 概要

Server Actions を Origin/Referer ヘッダー検証で CSRF 攻撃から保護する。二関数パターンにより、全ミューテーションに CSRF 保護を適用する。

---

## 実装

### CSRF バリデーションユーティリティ

```typescript
// lib/csrf.ts
import { headers } from "next/headers"

export async function validateCsrfToken(allowedOrigin?: string): Promise<void> {
  const expectedOrigin = allowedOrigin || process.env.NEXT_PUBLIC_APP_URL
  const headersList = await headers()
  const origin = headersList.get("origin")
  const referer = headersList.get("referer")

  // Origin ヘッダーを優先チェック
  if (origin && origin !== expectedOrigin) {
    throw new Error("CSRF validation failed: Invalid origin")
  }

  // Referer ヘッダーにフォールバック
  if (!origin && referer) {
    const refererOrigin = new URL(referer).origin
    if (refererOrigin !== expectedOrigin) {
      throw new Error("CSRF validation failed: Invalid referer")
    }
  }

  // 両ヘッダーが欠如している場合は拒否
  if (!origin && !referer) {
    throw new Error("CSRF validation failed: Missing headers")
  }
}
```

---

## 二関数認証パターン

```typescript
// lib/auth-utils.ts
import { headers } from "next/headers"
import { validateCsrfToken } from "./csrf"
import { verifyAdminAuth } from "./auth"

// 読み取り操作用（CSRF 不要）
export async function verifyAdmin(): Promise<string> {
  const session = await verifyAdminAuth(await headers())
  if (!session?.user?.id) throw new Error("Unauthorized")
  return session.user.id
}

// ミューテーション用（CSRF + 認証）
export async function verifyAdminMutation(): Promise<string> {
  await validateCsrfToken()  // Step 1: CSRF 検証
  return await verifyAdmin() // Step 2: 認証チェック
}
```

---

## 使い分けルール

| 操作タイプ | 関数 | CSRF チェック |
|-----------|------|--------------|
| GET（一覧、詳細） | `verifyAdmin()` | ❌ なし |
| POST（作成） | `verifyAdminMutation()` | ✅ あり |
| PUT/PATCH（更新） | `verifyAdminMutation()` | ✅ あり |
| DELETE | `verifyAdminMutation()` | ✅ あり |

---

## 使用例

### クエリ（読み取り）- CSRF なし

```typescript
export async function getFeatures(page: number = 1) {
  await verifyAdmin()  // 読み取りに CSRF は不要
  return await db.select().from(features).limit(20)
}
```

### ミューテーション（書き込み）- CSRF 必須

```typescript
export async function createFeature(formData: FormData): Promise<ActionResult | void> {
  const userId = await verifyAdminMutation()  // CSRF + 認証
  // ... バリデーションと DB 操作
}
```

---

## 公開アプリパターン

公開向けアクション（コメント等）では明示的に CSRF を検証：

```typescript
export async function createComment(postId: string, content: string): Promise<Result> {
  // CSRF 保護 - 明示的呼び出し
  try {
    await validateCsrfToken()
  } catch (error) {
    return { success: false, error: "post.errors.csrfValidationFailed" }
  }

  // 認証 - verifyAdmin ではなく getUser を使用
  const session = await getUser(await headers())
  if (!session?.user?.id) {
    return { success: false, error: "post.errors.loginRequired" }
  }

  // 操作を続行...
}
```

---

## CSRF 保護のテスト

```typescript
// CSRF が検証されることをテスト
it("rejects requests with invalid origin", async () => {
  // 不正な origin でヘッダーをモック
  mockHeaders.mockResolvedValueOnce(new Headers({
    origin: "https://evil.com"
  }))

  const result = await createFeature(validFormData())
  expect(result).toEqual({
    success: false,
    error: "CSRF validation failed",
    code: "CSRF_INVALID"
  })
})
```

---

## セキュリティ上の注意

1. **ミューテーションでは CSRF を絶対にスキップしない** - 全 POST/PUT/PATCH/DELETE 操作で CSRF を検証
2. **環境変数を使用** - `NEXT_PUBLIC_APP_URL` を全環境で正しく設定
3. **Origin ヘッダーを優先** - Referer ヘッダーより信頼性が高い
4. **ヘッダー欠如を処理** - Origin と Referer の両方がないリクエストを拒否
