---
paths:
  - "lib/actions/**/*.ts"
  - "**/lib/actions/**/*.ts"
  - "**/actions.ts"
---

# Server Actions Conventions

## Required Order

1. **Authentication check**
2. **CSRF verification** (mutations only)
3. **Zod validation**
4. **Business logic**
5. **Revalidate path**

## Template

```typescript
"use server"

export async function createResource(formData: FormData): Promise<ActionResult> {
  // 1. Auth
  const { user } = await auth()
  if (!user) return { error: "Unauthorized" }

  // 2. CSRF (mutations only)
  await verifyCsrfToken(formData)

  // 3. Validation
  const validated = schema.safeParse(Object.fromEntries(formData))
  if (!validated.success) return { error: validated.error.message }

  // 4. Business logic
  const result = await db.insert(table).values(validated.data)

  // 5. Revalidate
  revalidatePath("/resources")
  return { data: result }
}
```

## Security Checklist

- [ ] Auth check before any DB operation
- [ ] CSRF token verified for mutations
- [ ] Input validated with Zod
- [ ] Ownership verified before update/delete
- [ ] Rate limiting for destructive operations
