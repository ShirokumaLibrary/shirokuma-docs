# Large-Scale File Organization Rules

Follow these rules for splitting files in large-scale projects.

---

## Split Thresholds

| File Type | Threshold | Action |
|-----------|-----------|--------|
| Server Actions | 300 lines or 8+ functions | Split by domain/operation |
| i18n Messages | 300 lines or 200+ keys | Split by namespace |
| Components | 250 lines | Extract sub-components |
| Schema | 20+ tables or 500+ lines | Split by domain (see reference.md) |

---

## Server Actions Split Pattern

**When exceeding 300 lines, split by functionality:**

| File | Purpose |
|------|---------|
| `lib/actions/posts/index.ts` | Barrel export |
| `lib/actions/posts/queries.ts` | getPaginatedPosts, getPostBySlug |
| `lib/actions/posts/mutations.ts` | createPost, updatePost, deletePost |
| `lib/actions/posts/filters.ts` | getPostsByCategory, getPostsByTag |
| `lib/actions/__tests__/posts.test.ts` | Tests (keep in original location) |

**Important**: Keep test files in `lib/actions/__tests__/`. Do not change test structure when splitting actions.

**index.ts:**
```typescript
export * from './queries'
export * from './mutations'
export * from './filters'
```

---

## i18n Messages Split Pattern

**When exceeding 300 lines, split by namespace:**

| File | Purpose |
|------|---------|
| `messages/{locale}/index.ts` | Combined export |
| `messages/{locale}/common.json` | Common UI (buttons, labels) |
| `messages/{locale}/auth.json` | Authentication (login, signup) |
| `messages/{locale}/content.json` | Content (posts, categories) |
| `messages/{locale}/errors.json` | Error messages |
| `messages/{locale}/validation.json` | Input validation |

**index.ts:**
```typescript
import common from './common.json'
import auth from './auth.json'
import content from './content.json'
import errors from './errors.json'
import validation from './validation.json'

export default { common, auth, content, errors, validation }
```

**Update next-intl config (`i18n/request.ts`):**
```typescript
import messages from `@/messages/${locale}`
return { locale, messages }
```

---

## Components Split Pattern

**Components exceeding 250 lines should be split into sub-components:**

| File | Purpose |
|------|---------|
| `post-form.tsx` | Main wrapper (~80 lines) |
| `post-form-editor.tsx` | Markdown editor section |
| `post-form-meta.tsx` | Title, slug, excerpt |
| `post-form-category.tsx` | Category selection |
| `post-form-tags.tsx` | Tag selection |
| `post-form-actions.tsx` | Save/Cancel buttons |

**post-form.tsx:**
```tsx
export function PostForm({ post, categories, tags }: PostFormProps) {
  return (
    <form action={handleSubmit}>
      <PostFormMeta defaultValues={post} />
      <PostFormEditor content={post?.content} />
      <PostFormCategory categories={categories} />
      <PostFormTags tags={tags} />
      <PostFormActions isPending={isPending} />
    </form>
  )
}
```

---

## Shared Utility Extraction

**Extract logic used across multiple files:**

| File | Purpose |
|------|---------|
| `lib/actions/shared/pagination.ts` | Pagination helpers |
| `lib/actions/shared/filters.ts` | Filtering helpers |
| `lib/actions/shared/validation.ts` | Common validation |

---

## Split Checklist

- [ ] Create barrel export (index.ts)
- [ ] Maintain existing import paths (backward compatibility)
- [ ] Keep tests in `lib/actions/__tests__/` (no split needed)
- [ ] Update documentation (CLAUDE.md)

---

## Split Templates

When thresholds are exceeded, use these templates:

| Directory | Purpose |
|-----------|---------|
| `templates/server-action-split/` | Server Actions splitting |
| `templates/messages-split/` | i18n Messages splitting |

See [templates/README.md](templates/README.md) for details.

---

## References

- **Template details**: [templates/README.md](templates/README.md)
- **Schema splitting**: [reference.md - Drizzle ORM](reference.md)
- **Testing patterns**: [patterns/testing.md](patterns/testing.md)
