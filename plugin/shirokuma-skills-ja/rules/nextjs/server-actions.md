---
paths:
  - "lib/actions/**/*.ts"
  - "**/lib/actions/**/*.ts"
  - "**/actions.ts"
---

# Server Actions 規約

## 必須順序

1. **認証チェック**
2. **CSRF 検証**（ミューテーションのみ）
3. **Zod バリデーション**
4. **ビジネスロジック**
5. **パス再検証**

## テンプレート

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

## セキュリティチェックリスト

- [ ] DB 操作前に Auth チェック
- [ ] ミューテーションで CSRF トークン検証
- [ ] Zod で入力バリデーション
- [ ] 更新/削除前に所有権検証
- [ ] 破壊的操作にレート制限
