# 監査ログパターン

## 概要

セキュリティ関連イベントの包括的な監査証跡。認証、認可、機密データアクセスをログ記録。

## イベント種類

### 認証イベント

| イベント | トリガー | 優先度 |
|---------|---------|--------|
| `login_success` | ログイン成功 | INFO |
| `login_failure` | ログイン失敗 | WARNING |
| `logout` | ログアウト | INFO |
| `session_expired` | セッションタイムアウト | INFO |
| `account_locked` | ロックアウト発動 | WARNING |
| `account_unlocked` | ロックアウト解除 | INFO |

### 認可イベント

| イベント | トリガー | 優先度 |
|---------|---------|--------|
| `permission_denied` | 未認可アクセス試行 | WARNING |
| `role_changed` | ユーザーロール変更 | INFO |
| `impersonation_start` | 管理者による代理ログイン | WARNING |
| `impersonation_end` | 代理ログイン終了 | INFO |

### データイベント

| イベント | トリガー | 優先度 |
|---------|---------|--------|
| `password_change` | パスワード更新 | INFO |
| `password_reset_request` | リセットメール送信 | INFO |
| `password_reset_complete` | トークンによるリセット完了 | WARNING |
| `email_change` | メールアドレス更新 | WARNING |
| `profile_update` | プロフィール変更 | INFO |
| `sensitive_data_access` | PII/機密データ閲覧 | INFO |

### 管理イベント

| イベント | トリガー | 優先度 |
|---------|---------|--------|
| `user_created` | 新規アカウント作成 | INFO |
| `user_deleted` | アカウント削除 | WARNING |
| `user_suspended` | アカウント停止 | WARNING |
| `user_reactivated` | 停止アカウント復活 | INFO |
| `bulk_operation` | 一括更新/削除 | WARNING |

## ログエントリスキーマ

```typescript
// packages/database/src/schema/audit.ts
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Who
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  actorEmail: varchar("actor_email", { length: 255 }),
  actorRole: varchar("actor_role", { length: 50 }),

  // What
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 100 }),
  resourceId: uuid("resource_id"),

  // When
  timestamp: timestamp("timestamp", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),

  // Where
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),

  // How
  status: varchar("status", { length: 20 }).notNull(),
  errorMessage: text("error_message"),

  // Context
  metadata: jsonb("metadata"),
}, (table) => ({
  userIdIdx: index("audit_user_id_idx").on(table.userId),
  actionIdx: index("audit_action_idx").on(table.action),
  timestampIdx: index("audit_timestamp_idx").on(table.timestamp),
  resourceIdx: index("audit_resource_idx").on(table.resourceType, table.resourceId),
}));
```

## 実装パターン

### ヘルパー関数

```typescript
// packages/database/src/audit.ts
import { headers } from "next/headers";
import { db } from "./client";
import { auditLogs } from "./schema/audit";

interface AuditLogParams {
  userId?: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  status: "success" | "failure" | "pending";
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress =
      headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
      headersList.get("x-real-ip") ||
      "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    await db.insert(auditLogs).values({
      ...params,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  } catch (error) {
    // 重要: 監査ログの失敗でメインフローを壊さない
    console.error("Failed to create audit log:", error);
  }
}
```

### Server Actions での使用

```typescript
// apps/admin/lib/actions/auth.ts
export async function signInAction(credentials: SignInInput) {
  const startTime = Date.now();

  try {
    const result = await auth.api.signInEmail({ body: credentials });

    if (!result) {
      await createAuditLog({
        actorEmail: credentials.email,
        action: "login_failure",
        status: "failure",
        errorMessage: "Invalid credentials",
      });

      await waitForMinimumDuration(startTime, 500);
      return { error: "Invalid credentials" };
    }

    await createAuditLog({
      userId: result.user.id,
      actorEmail: result.user.email,
      actorRole: result.user.role,
      action: "login_success",
      status: "success",
    });

    return { success: true };
  } catch (error) {
    await createAuditLog({
      actorEmail: credentials.email,
      action: "login_failure",
      status: "failure",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });

    throw error;
  }
}
```

### パスワードリセットでの使用

```typescript
// apps/public/lib/actions/password-reset.ts
export async function resetPasswordAction(token: string, newPassword: string) {
  const verification = await db.query.verifications.findFirst({
    where: eq(verifications.token, token),
  });

  if (!verification) {
    await createAuditLog({
      action: "password_reset_complete",
      status: "failure",
      errorMessage: "Invalid token",
      metadata: { tokenPrefix: token.substring(0, 8) },
    });
    return { error: "Invalid or expired token" };
  }

  await updatePassword(verification.identifier, newPassword);

  await createAuditLog({
    actorEmail: verification.identifier,
    action: "password_reset_complete",
    status: "success",
    resourceType: "user",
    metadata: {
      method: "token",
      tokenId: verification.id,
    },
  });

  return { success: true };
}
```

## プライバシー考慮事項

### データ最小化

1. **機密データのハッシュ化**: パスワードやトークンをログに記録しない
2. **トークンの切り詰め**: デバッグ用に先頭8文字のみ記録
3. **IP の匿名化**: 最後のオクテットのハッシュ化またはマスキングを検討
4. **メタデータに PII なし**: 名前/メールの代わりに ID を使用

### GDPR 準拠

```typescript
// 忘れられる権利: ユーザーの監査ログを匿名化
export async function anonymizeUserAuditLogs(userId: string): Promise<void> {
  await db.update(auditLogs)
    .set({
      actorEmail: "deleted@example.com",
      ipAddress: "0.0.0.0",
      userAgent: "deleted",
      metadata: null,
    })
    .where(eq(auditLogs.userId, userId));
}
```

### 保持ポリシー

```typescript
// 90日以上古いログを削除（コンプライアンス要件に応じて調整）
export async function pruneOldAuditLogs(): Promise<void> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  await db.delete(auditLogs)
    .where(lt(auditLogs.timestamp, ninetyDaysAgo));
}
```

## レビューチェックリスト

- [ ] すべての認証イベントをログ記録
- [ ] 機密操作（パスワード変更、ロール変更）をログ記録
- [ ] ログにパスワード/トークンなし
- [ ] IP とユーザーエージェントを取得
- [ ] エラーメッセージがサニタイズ済み（スタックトレースなし）
- [ ] 監査ログの失敗がメインフローを壊さない
- [ ] userId, action, timestamp にインデックスあり
- [ ] 保持ポリシーが実装済み
- [ ] GDPR 匿名化関数が存在

## クエリ例

### ログイン失敗試行

```typescript
const failedAttempts = await db.select({
  actorEmail: auditLogs.actorEmail,
  count: sql<number>`count(*)`,
  lastAttempt: sql<Date>`max(timestamp)`,
})
  .from(auditLogs)
  .where(
    and(
      eq(auditLogs.action, "login_failure"),
      gte(auditLogs.timestamp, new Date(Date.now() - 24 * 60 * 60 * 1000))
    )
  )
  .groupBy(auditLogs.actorEmail)
  .having(sql`count(*) >= 5`);
```

### ユーザーアクティビティタイムライン

```typescript
const userTimeline = await db.select()
  .from(auditLogs)
  .where(eq(auditLogs.userId, userId))
  .orderBy(desc(auditLogs.timestamp))
  .limit(100);
```

### セキュリティダッシュボードメトリクス

```typescript
const securityMetrics = await db.select({
  action: auditLogs.action,
  count: sql<number>`count(*)`,
})
  .from(auditLogs)
  .where(
    and(
      gte(auditLogs.timestamp, new Date(Date.now() - 24 * 60 * 60 * 1000)),
      inArray(auditLogs.action, [
        "login_failure",
        "permission_denied",
        "account_locked",
      ])
    )
  )
  .groupBy(auditLogs.action);
```

## 監視とアラート

### アラートしきい値

- **高**: 単一 IP から1時間に100回以上のログイン失敗
- **中**: 1時間に10件以上の permission_denied イベント
- **低**: 1時間に5件以上のアカウントロックアウト

### ログシッピング

外部 SIEM（Datadog, Splunk 等）への監査ログ転送を検討:
- サービス間の集中監視
- 長期アーカイブ
- 高度な脅威検出
- コンプライアンスレポート

## テスト

```typescript
// tests/e2e/audit-logging.spec.ts
test("logs successful login", async ({ page }) => {
  await signIn(page, "admin@example.com", "password");

  const log = await db.query.auditLogs.findFirst({
    where: and(
      eq(auditLogs.actorEmail, "admin@example.com"),
      eq(auditLogs.action, "login_success")
    ),
    orderBy: desc(auditLogs.timestamp),
  });

  expect(log).toBeDefined();
  expect(log.status).toBe("success");
  expect(log.ipAddress).toBeTruthy();
});

test("logs password change", async ({ page, authenticatedContext }) => {
  await changePassword(page, "oldpass", "newpass");

  const log = await db.query.auditLogs.findFirst({
    where: eq(auditLogs.action, "password_change"),
    orderBy: desc(auditLogs.timestamp),
  });

  expect(log).toBeDefined();
  expect(log.userId).toBeTruthy();
  expect(log.metadata).not.toContain("oldpass"); // ログにパスワードなし
});
```
