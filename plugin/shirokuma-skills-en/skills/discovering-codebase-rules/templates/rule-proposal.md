# Rule Proposal Template

Use this template when proposing a new lint rule for shirokuma-docs.

---

# Rule Proposal: {rule-name}

**Date**: YYYY-MM-DD
**Category**: {Structural | Quality | Framework | Documentation}
**Priority**: {P0 | P1 | P2}

## Pattern Description

{What pattern was discovered and why it matters}

## Occurrences

| App | Count | Example |
|-----|-------|---------|
| admin | X | `lib/actions/posts.ts:10` |
| public | X | `lib/actions/comments.ts:5` |
| web | X | `lib/actions/sessions.ts:15` |
| mcp | X | `src/tools/entity.ts:20` |
| shirokuma | X | `src/commands/lint.ts:30` |

**Total**: X occurrences across Y apps

## Inconsistencies Found

{List deviations from the expected pattern}

- App `admin`: {deviation description}
- App `web`: {deviation description}

## Proposed Rule

### Specification

```yaml
rule:
  id: "{rule-name}"
  severity: "{error | warning | info}"
  description: "{What the rule checks}"
  fixable: {true | false}

  options:
    option1: value
    option2: value
```

### Detection Logic

```
1. Find {pattern}
2. Check {condition}
3. Report if {violation}
```

### Auto-fix (if applicable)

```
1. {Fix step 1}
2. {Fix step 2}
```

## Implementation Sketch

```typescript
import type { LintRule, LintIssue } from "../types.js";

export const {ruleName}Rule: LintRule = {
  id: "{rule-name}",
  severity: "{severity}",
  description: "{description}",

  check(file: SourceFile, allFiles: SourceFile[]): LintIssue[] {
    const issues: LintIssue[] = [];

    // TODO: Implementation
    // 1. Parse file content
    // 2. Find pattern occurrences
    // 3. Check for violations
    // 4. Report issues

    return issues;
  }
};
```

## Configuration

```yaml
# shirokuma-docs.config.yaml
lintQuality:
  {ruleName}:
    enabled: true
    severity: "{severity}"
    # rule-specific options
    option1: value
```

## Test Cases

### Should Pass

```typescript
// Valid code example
{valid code}
```

### Should Fail

```typescript
// Invalid code example
{invalid code}
```

### Edge Cases

- {Edge case 1}
- {Edge case 2}

## Priority Justification

**P0**: {Critical - blocks deployment or causes bugs}
**P1**: {Important - improves quality/consistency}
**P2**: {Nice to have - minor improvements}

{Explain why this priority was chosen}

## Related

- Existing rules: {related existing rules}
- ADR: {related ADR if any}
- Issue: {related issue if any}

---

## Checklist

- [ ] Pattern validated across all apps
- [ ] Occurrence counts documented
- [ ] Inconsistencies identified
- [ ] Implementation sketch provided
- [ ] Test cases defined
- [ ] Priority justified
- [ ] Not duplicating existing rule
