# Implementation Checklists

Checklists for ensuring code quality and TDD compliance.

---

## Server Action Checklist

- [ ] `"use server"` directive at top
- [ ] **Queries**: `verifyAdmin()` (no CSRF needed)
- [ ] **Mutations**: `verifyAdminMutation()` (includes CSRF)
- [ ] Zod schema validation
- [ ] **Ownership check before update/delete**
- [ ] **Rate limiting for destructive operations** (delete, password reset)
- [ ] **Error codes in responses** (`NOT_FOUND`, `FORBIDDEN`, `RATE_LIMIT_EXCEEDED`)
- [ ] Proper error handling with try/catch
- [ ] Return typed `ActionResult<T>` response
- [ ] `revalidatePath()` or `revalidateTag()` for cache
- [ ] No sensitive data in responses

---

## Page Component Checklist

- [ ] Async params with `await`
- [ ] `setRequestLocale(locale)` called first
- [ ] `getTranslations()` for server-side i18n
- [ ] Proper TypeScript types for props
- [ ] Suspense boundary for data loading
- [ ] Error boundary (error.tsx) if needed
- [ ] Loading state (loading.tsx) if needed

---

## Client Component Checklist

- [ ] `"use client"` directive at top
- [ ] `useTranslations()` for i18n
- [ ] `useTransition()` for form submissions
- [ ] Loading and error states
- [ ] Proper form validation
- [ ] Accessible labels and ARIA attributes

---

## i18n Checklist

- [ ] Add keys to `messages/ja.json`
- [ ] Add keys to `messages/en.json`
- [ ] Use namespace pattern (e.g., `features.form.name`)
- [ ] Handle date formatting with locale

---

## Test-First Enforcement Checklist

Before reporting completion, verify:

- [ ] **Test files created BEFORE implementation files**
- [ ] Server Action tests exist: `__tests__/lib/actions/{{name}}.test.ts`
- [ ] Component tests exist: `__tests__/components/{{name}}-form.test.tsx`
- [ ] All tests pass: `pnpm --filter admin test`
- [ ] No lint errors: `pnpm --filter admin lint`
- [ ] Implementation report saved to `GitHub Discussions (Reports)`

---

## Completion Requirements

**ALL MUST BE TRUE before marking task complete:**

- [ ] Test files exist for all implementation code
- [ ] Tests were written before implementation (TDD)
- [ ] All tests are active and executable (not commented out or skipped)
- [ ] Tests verify the actual implementation behavior
- [ ] Implementation report has been saved to `GitHub Discussions (Reports)`
