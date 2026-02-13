# Audit Logging Pattern

## Overview

Comprehensive audit trail for security-relevant events. Logs authentication, authorization, and sensitive data access.

## Event Types

### Authentication Events

| Event | Trigger | Priority |
|-------|---------|----------|
| `login_success` | Successful sign-in | INFO |
| `login_failure` | Failed sign-in attempt | WARNING |
| `logout` | User signs out | INFO |
| `session_expired` | Session timeout | INFO |
| `account_locked` | Lockout triggered | WARNING |
| `account_unlocked` | Lockout expired/cleared | INFO |

### Authorization Events

| Event | Trigger | Priority |
|-------|---------|----------|
| `permission_denied` | Unauthorized access attempt | WARNING |
| `role_changed` | User role modified | INFO |
| `impersonation_start` | Admin impersonates user | WARNING |
| `impersonation_end` | Admin stops impersonation | INFO |

### Data Events

| Event | Trigger | Priority |
|-------|---------|----------|
| `password_change` | Password updated | INFO |
| `password_reset_request` | Reset email sent | INFO |
| `password_reset_complete` | Password reset via token | WARNING |
| `email_change` | Email address updated | WARNING |
| `profile_update` | Profile data modified | INFO |
| `sensitive_data_access` | PII/sensitive data viewed | INFO |

### Administrative Events

| Event | Trigger | Priority |
|-------|---------|----------|
| `user_created` | New user account | INFO |
| `user_deleted` | Account deletion | WARNING |
| `user_suspended` | Account suspended | WARNING |
| `user_reactivated` | Suspended account restored | INFO |
| `bulk_operation` | Mass updates/deletes | WARNING |

## Log Entry Schema

```typescript
// packages/database/src/schema/audit.ts
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Who
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  actorEmail: varchar("actor_email", { length: 255 }), // Snapshot in case user deleted
  actorRole: varchar("actor_role", { length: 50 }),

  // What
  action: varchar("action", { length: 100 }).notNull(), // e.g., "login_success"
  resourceType: varchar("resource_type", { length: 100 }), // e.g., "post", "user"
  resourceId: uuid("resource_id"), // ID of affected resource

  // When
  timestamp: timestamp("timestamp", { mode: "date", withTimezone: true })
    .defaultNow()
    .notNull(),

  // Where
  ipAddress: varchar("ip_address", { length: 45 }), // IPv6 max length
  userAgent: text("user_agent"),

  // How
  status: varchar("status", { length: 20 }).notNull(), // success, failure, pending
  errorMessage: text("error_message"),

  // Context
  metadata: jsonb("metadata"), // Additional structured data

  // Indexes
}, (table) => ({
  userIdIdx: index("audit_user_id_idx").on(table.userId),
  actionIdx: index("audit_action_idx").on(table.action),
  timestampIdx: index("audit_timestamp_idx").on(table.timestamp),
  resourceIdx: index("audit_resource_idx").on(table.resourceType, table.resourceId),
}));
```

## Implementation Pattern

### Helper Function

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
    // CRITICAL: Never let audit logging failure break the main flow
    console.error("Failed to create audit log:", error);
  }
}
```

### Usage in Server Actions

```typescript
// apps/admin/lib/actions/auth.ts
export async function signInAction(credentials: SignInInput) {
  const startTime = Date.now();

  try {
    const result = await auth.api.signInEmail({ body: credentials });

    if (!result) {
      // Log failed attempt
      await createAuditLog({
        actorEmail: credentials.email,
        action: "login_failure",
        status: "failure",
        errorMessage: "Invalid credentials",
      });

      await waitForMinimumDuration(startTime, 500);
      return { error: "Invalid credentials" };
    }

    // Log successful login
    await createAuditLog({
      userId: result.user.id,
      actorEmail: result.user.email,
      actorRole: result.user.role,
      action: "login_success",
      status: "success",
    });

    return { success: true };
  } catch (error) {
    // Log system error
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

### Usage in Password Reset

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

  // Reset password
  await updatePassword(verification.identifier, newPassword);

  // Log success
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

## Privacy Considerations

### Data Minimization

1. **Hash sensitive data**: Don't log passwords or tokens
2. **Truncate tokens**: Log only first 8 chars for debugging
3. **Anonymize IP**: Consider hashing or masking last octet
4. **No PII in metadata**: Use IDs instead of names/emails

### GDPR Compliance

```typescript
// Right to erasure: Anonymize user's audit logs
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

### Retention Policy

```typescript
// Delete logs older than 90 days (adjust per compliance needs)
export async function pruneOldAuditLogs(): Promise<void> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  await db.delete(auditLogs)
    .where(lt(auditLogs.timestamp, ninetyDaysAgo));
}
```

## Review Checklist

- [ ] All authentication events logged
- [ ] Sensitive operations (password change, role change) logged
- [ ] No passwords/tokens in logs
- [ ] IP and user agent captured
- [ ] Error messages sanitized (no stack traces)
- [ ] Audit logging failures don't break main flow
- [ ] Indexes on userId, action, timestamp
- [ ] Retention policy implemented
- [ ] GDPR anonymization function exists

## Query Examples

### Failed Login Attempts

```typescript
// Find users with multiple failed login attempts
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

### User Activity Timeline

```typescript
// Get all actions for a user
const userTimeline = await db.select()
  .from(auditLogs)
  .where(eq(auditLogs.userId, userId))
  .orderBy(desc(auditLogs.timestamp))
  .limit(100);
```

### Security Dashboard Metrics

```typescript
// Last 24h security events
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

## Monitoring & Alerts

### Alert Thresholds

- **High**: >100 failed logins/hour from single IP
- **Medium**: >10 permission_denied events/hour
- **Low**: Account lockouts >5/hour

### Log Shipping

Consider shipping audit logs to external SIEM (e.g., Datadog, Splunk) for:
- Centralized monitoring across services
- Long-term archival
- Advanced threat detection
- Compliance reporting

## Testing

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
  expect(log.metadata).not.toContain("oldpass"); // No password in logs
});
```
