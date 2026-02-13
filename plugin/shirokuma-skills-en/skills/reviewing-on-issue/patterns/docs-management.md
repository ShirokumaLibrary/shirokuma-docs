# Documentation Management Patterns

## Project Documentation Structure

| Path | Purpose |
|------|---------|
| `docs/portal/index.html` | Main portal page |
| `docs/portal/viewer.html` | Markdown viewer |
| `docs/portal/*.html` | Guide pages |
| `docs/generated/api-html/` | TypeDoc API docs |
| `docs/generated/test-cases.md` | Test cases markdown |
| `docs/generated/deps/` | Dependency graphs |
| `docs/*.md` | Hand-written knowledge docs |
| `docs/phase*/` | Phase implementation docs |

## Document Types

### Hand-Written Knowledge Documents

Location: `docs/*.md` (root level)

| Document Type | Purpose | Update Frequency |
|---------------|---------|------------------|
| Pattern docs | Development patterns, best practices | When patterns change |
| Implementation records | Feature implementation history | One-time |
| Guide docs | How-to guides | As needed |
| Troubleshooting | Known issues and fixes | When issues discovered |

### Auto-Generated Documents

Location: `docs/generated/`

| Document Type | Generation Command | Update Trigger |
|---------------|-------------------|----------------|
| API docs | `pnpm docs:api` | After Server Action changes |
| Test cases | `pnpm docs:tests` | After test changes |
| Dependency graphs | `pnpm docs:deps` | After dependency changes |
| DB schema | `pnpm docs:dbml` | After schema changes |

## Documentation Review Checklist

When reviewing documentation:

### Content Accuracy

- [ ] Technical information matches current codebase
- [ ] Code examples are runnable and correct
- [ ] Version numbers are up-to-date
- [ ] Command examples work with current setup

### Status Tracking

- [ ] Implementation status reflects actual state (✅, ⏳, ❌)
- [ ] "Last Updated" date is current
- [ ] "Next Steps" items are still relevant
- [ ] Completed items are marked as such

### Structure Quality

- [ ] Has clear title and summary
- [ ] Organized with appropriate sections
- [ ] Code examples have syntax highlighting
- [ ] Tables are properly formatted

## Common Documentation Issues

### Outdated Status

```markdown
## Implementation Status

- ✅ Utility created: `packages/database/src/form-utils.ts`
- ✅ Tests added: 19 test cases, 100% coverage
- ✅ Exported from `@repo/database`
- ⏳ Refactor Server Actions (recommended next step)  ← CHECK IF DONE

## Next Steps  ← CHECK IF STILL RELEVANT

1. Refactor `apps/admin/lib/actions/*.ts` files
```

**Fix**: Update status when implementation is complete.

### Version Mismatch

```markdown
**Next.js Version**: 16.0.4  ← CHECK AGAINST package.json
```

**Fix**: Keep version numbers in sync with `package.json`.

### Dead Links

```markdown
<!-- EXAMPLE: This is a dead link anti-pattern -->
See [implementation details](./example-feature-doc.md)
```

**Fix**: Verify all internal links point to existing files.

## Documentation Maintenance Commands

```bash
# Check if docs are outdated
ls -la docs/*.md  # Compare dates with recent changes

# Verify doc links
grep -r "\[.*\](.*\.md)" docs/ | head -20

# Check implementation status
grep -r "⏳\|TODO\|WIP" docs/*.md

# Find outdated version references
grep -r "16\.0\.[0-9]" docs/  # Check Next.js versions
```

## Best Practices

1. **Update Promptly**: Update docs immediately after implementation changes
2. **Single Source of Truth**: Reference CLAUDE.md for authoritative versions
3. **Status Tracking**: Use consistent status markers (✅, ⏳, ❌)
4. **Date Stamps**: Include "Last Updated" in implementation docs
5. **Link to Agent Knowledge**: Complex patterns should be in agent knowledge files
