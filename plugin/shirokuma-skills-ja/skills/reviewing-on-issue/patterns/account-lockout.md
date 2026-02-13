# アカウントロックアウトパターン

## 概要

Redis ベースのアカウントロックアウトシステム。ブルートフォース攻撃を防止。指数バックオフとプライバシー保護のためのメールハッシュを使用。

## 実装パターン

### コアコンポーネント

```typescript
// packages/database/src/rate-limit.ts
import { createHash } from "crypto";

export async function checkAccountLockout(
  redis: Redis,
  email: string
): Promise<{ locked: boolean; remainingTime?: number }> {
  const emailHash = hashEmail(email);
  const key = `account_lockout:${emailHash}`;

  const attempts = await redis.get(key);
  if (!attempts) return { locked: false };

  const count = parseInt(attempts, 10);
  const ttl = await redis.ttl(key);

  // 15分以内に5回の試行でロックアウト
  if (count >= 5) {
    return { locked: true, remainingTime: ttl };
  }

  return { locked: false };
}

export async function recordFailedAttempt(
  redis: Redis,
  email: string
): Promise<void> {
  const emailHash = hashEmail(email);
  const key = `account_lockout:${emailHash}`;

  const current = await redis.incr(key);

  if (current === 1) {
    // 初回試行: 15分ウィンドウ
    await redis.expire(key, 15 * 60);
  } else if (current >= 5) {
    // ロックアウト: 1時間に延長
    await redis.expire(key, 60 * 60);
  }
}

function hashEmail(email: string): string {
  return createHash("sha256")
    .update(email.toLowerCase().trim())
    .digest("hex");
}
```

## しきい値

| レベル | 試行回数 | ウィンドウ | アクション |
|--------|----------|-----------|-----------|
| 警告 | 1-4 | 15分 | 試行を追跡 |
| ロックアウト | 5回以上 | 1時間 | 認証をブロック |
| 拡張 | 10回以上 | 24時間 | 長期ブロック（将来） |

## プライバシー考慮事項

1. **メールハッシュ**: Redis でのメール露出を防ぐため SHA-256 を使用
2. **キーに PII なし**: Redis キーにはハッシュのみ
3. **一定タイミング**: ユーザーが存在しなくても常にロックアウトをチェック
4. **ユーザーへのフィードバックなし**: メールの存在を明かさない

## Fail-Closed 動作

```typescript
// Redis が利用不可の場合、fail-closed（認証を拒否）
export async function checkAccountLockout(
  redis: Redis,
  email: string
): Promise<{ locked: boolean; remainingTime?: number }> {
  try {
    // ... 通常のロジック
  } catch (error) {
    console.error("Redis error during lockout check:", error);
    // Fail closed: Redis ダウン時はロック済みとして扱う
    return { locked: true, remainingTime: 900 };
  }
}
```

## 認証との統合

```typescript
// apps/admin/lib/actions/auth.ts
export async function signInAction(credentials: SignInInput) {
  const startTime = Date.now();

  // 1. DB クエリの前にロックアウトをチェック
  const lockout = await checkAccountLockout(redis, credentials.email);
  if (lockout.locked) {
    await waitForMinimumDuration(startTime, 500);
    return { error: "Too many failed attempts" };
  }

  // 2. 認証
  const result = await auth.api.signInEmail({ body: credentials });

  if (!result) {
    // 3. 失敗を記録
    await recordFailedAttempt(redis, credentials.email);
    await waitForMinimumDuration(startTime, 500);
    return { error: "Invalid credentials" };
  }

  // 4. 成功時にロックアウトをクリア
  await clearAccountLockout(redis, credentials.email);

  return { success: true };
}
```

## レビューチェックリスト

- [ ] Redis 格納前にメールがハッシュ化されている
- [ ] DB クエリの前にロックアウトをチェック
- [ ] Redis エラー時の fail-closed 動作
- [ ] タイミング攻撃の防止（一定時間）
- [ ] TTL が正しく設定（15分 → 1時間エスカレーション）
- [ ] ログイン成功時にロックアウトをクリア
- [ ] エラーメッセージによるユーザー列挙なし

## よくある問題

1. **ロックアウトが解除されない**: 成功時に `clearAccountLockout()` が呼ばれているか確認
2. **ユーザー列挙**: ロック時/無効時に同じエラーメッセージを使用
3. **Redis メモリ**: LRU エビクションポリシーを実装
4. **分散システム**: マルチインスタンスデプロイでは集中型 Redis を検討

## テスト

```typescript
// tests/e2e/account-lockout.spec.ts
test("locks account after 5 failed attempts", async ({ page }) => {
  for (let i = 0; i < 5; i++) {
    await signIn(page, "test@example.com", "wrongpassword");
  }

  // 6回目はブロックされるべき
  const response = await signIn(page, "test@example.com", "correctpassword");
  expect(response.error).toContain("Too many failed attempts");
});

test("lockout expires after 1 hour", async ({ page }) => {
  // ロックアウトをトリガー
  for (let i = 0; i < 5; i++) {
    await signIn(page, "test@example.com", "wrongpassword");
  }

  // Redis 時間を早送り（テスト環境）
  await redis.expire(`account_lockout:${hash}`, 1);
  await new Promise(resolve => setTimeout(resolve, 1100));

  // 成功するはず
  const response = await signIn(page, "test@example.com", "correctpassword");
  expect(response.success).toBe(true);
});
```

## 監視すべきメトリクス

- ロックアウト発生率（攻撃のアラート）
- 誤検知率（正規ユーザーのロック）
- Redis レイテンシ/可用性
- ロックアウト解除までの平均時間
