# Templates Directory

Code templates for the nextjs-vibe-coding skill.

## Template Types

### Single File Templates (Default)

For new features under the split threshold:

| Template | Purpose | Threshold |
|----------|---------|-----------|
| `server-action.ts.template` | CRUD actions in one file | < 300 lines |
| `server-action.test.ts.template` | Action tests | < 300 lines |
| `form-component.tsx.template` | Form component | < 250 lines |
| `page-*.tsx.template` | Page templates | < 250 lines |
| `translations.json.template` | i18n for one feature | < 50 keys |

### Split Templates (Large Scale)

For features exceeding thresholds:

#### Server Actions (`server-action-split/`)

Use when actions file exceeds **300 lines or 8+ functions**:

| File | Purpose |
|------|---------|
| `lib/actions/{{name}}s/index.ts` | Barrel export |
| `lib/actions/{{name}}s/types.ts` | Types & validation |
| `lib/actions/{{name}}s/queries.ts` | Read operations |
| `lib/actions/{{name}}s/mutations.ts` | Write operations |

#### Messages (`messages-split/`)

Use when messages exceed **300 lines or 200+ keys**:

| File | Purpose |
|------|---------|
| `messages/{{locale}}/index.ts` | Aggregator |
| `messages/{{locale}}/common.json` | Shared UI strings |
| `messages/{{locale}}/errors.json` | Error messages |
| `messages/{{locale}}/feature.json` | Feature-specific |

## Usage

### Creating New Feature (Small)

```bash
# Use single file templates
cat templates/server-action.ts.template | sed 's/{{name}}/post/g; s/{{Name}}/Post/g'
```

### Splitting Existing Feature

When a file grows beyond threshold:

1. Create directory: `mkdir lib/actions/{{name}}s`
2. Copy split templates
3. Move code to appropriate files
4. Create barrel export (index.ts)
5. Update imports (should work unchanged via barrel)

## Template Variables

| Variable | Example | Description |
|----------|---------|-------------|
| `{{name}}` | `post` | Lowercase singular |
| `{{Name}}` | `Post` | PascalCase singular |
| `{{name}}s` | `posts` | Lowercase plural |
| `{{locale}}` | `ja` | Locale code |

## Best Practices

1. **Start with single file** - Use split only when threshold exceeded
2. **Preserve imports** - Barrel export ensures backward compatibility
3. **Tests follow structure** - Split tests match split actions
4. **Update CLAUDE.md** - Document new structure

## Standard Template (JSDoc Compliant)

See [server-action.md](./server-action.md) for the **shirokuma-docs lint-code compliant** template.

This template ensures:
- Module header with `@serverAction`, `@feature`, `@dbTables` tags
- Function JSDoc with `@serverAction`, `@feature`, `@returns` tags
- Section separators for readability
- Type definitions in separate `*-types.ts` file

### Validation

```bash
# Check compliance with shirokuma-docs
node shirokuma-docs/dist/index.js lint-code -p path/to/project -v
```

## Server Action Template Features

The `server-action.ts.template` includes these patterns:

| Pattern | Description |
|---------|-------------|
| **Two-function auth** | `verifyAdmin()` for queries, `verifyAdminMutation()` for mutations (includes CSRF) |
| **Error codes** | `ActionErrorCode` type (`NOT_FOUND`, `FORBIDDEN`, `RATE_LIMIT_EXCEEDED`, etc.) |
| **Ownership check** | Verify user owns resource before update/delete |
| **Rate limiting** | Protect destructive operations (delete) |

→ See [code-patterns.md](../patterns/code-patterns.md) for details
