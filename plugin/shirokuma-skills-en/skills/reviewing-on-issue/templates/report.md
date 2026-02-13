# Review Report Template

## Header

```markdown
# [Review Type] Review Report

**Date**: YYYY-MM-DD HH:MM
**Reviewer**: Claude (reviewer agent)
**Target**: [file/directory path]
**Role**: [code|security|testing|nextjs|plan]
```

## Sections

### 1. Summary

Brief overview (2-3 sentences):
- What was reviewed
- Overall assessment (Good/Needs Work/Critical)
- Key finding

### 2. Critical Issues

**Must fix before merge** (See [Severity Definitions](#severity-definitions))

| Issue | Location | Severity | Description |
|-------|----------|----------|-------------|
| Issue name | file:line | Critical/High | What's wrong and why |

### 3. Improvements

**Recommended changes** (See [Severity Definitions](#severity-definitions))

| Issue | Location | Severity | Description |
|-------|----------|----------|-------------|
| Issue name | file:line | Medium/Low | What to improve |

### 4. Best Practices

**Positive findings**

- What's done well
- Patterns followed correctly
- Good examples to replicate

### 5. Recommendations

**Prioritized action items**

1. **Immediate**: Critical fixes
2. **Before merge**: Important improvements
3. **Future**: Technical debt items

---

## Example Report

```markdown
# Security Review Report

**Date**: 2025-11-28 14:30
**Reviewer**: Claude (reviewer agent)
**Target**: apps/admin/lib/actions/
**Role**: security

## Summary

Reviewed 5 Server Action files. Overall security posture is **Good** with one critical issue: missing authorization check in `deleteComment`. All other actions follow secure patterns.

## Critical Issues

| Issue | Location | Severity | Description |
|-------|----------|----------|-------------|
| Missing auth check | comments.ts:45 | Critical | `deleteComment` has no session verification |
| ILIKE injection | posts.ts:112 | High | Search query not escaped |

## Improvements

| Issue | Location | Severity | Description |
|-------|----------|----------|-------------|
| Rate limiting | auth.ts:23 | Medium | Consider stricter limits for password reset |
| Error logging | categories.ts:78 | Low | Add structured logging context |

## Best Practices

- All actions use Zod validation
- Proper ownership checks in post mutations
- Structured error responses
- revalidatePath used consistently

## Recommendations

1. **Immediate**: Add auth check to `deleteComment`
2. **Before merge**: Escape ILIKE wildcards in search
3. **Future**: Implement rate limiting for sensitive actions
```

## Severity Definitions

| Level | Impact | Action |
|-------|--------|--------|
| **Critical** | Security vulnerability, data loss risk | Block merge |
| **High** | Significant bug, security gap | Fix before merge |
| **Medium** | Performance issue, maintainability | Fix recommended |
| **Low** | Style issue, minor improvement | Track for later |

## Output Location

**Create Discussion in Reports category:**

```bash
shirokuma-docs discussions create \
  --category Reports \
  --title "[Review] security: apps/admin/lib/actions/" \
  --body "$(cat report.md)"
```

Report the Discussion URL to the user.

> See `rules/output-destinations.md` for output destination policy.
