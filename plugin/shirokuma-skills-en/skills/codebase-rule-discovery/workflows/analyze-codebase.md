# Codebase Analysis Workflow

Step-by-step workflow for discovering patterns across applications.

## Prerequisites

- Access to all target applications
- shirokuma-docs installed
- Understanding of [discovery-categories.md](../patterns/discovery-categories.md)

## Workflow

### Phase 1: Preparation

#### 1.1 Define Scope

```bash
# Full analysis
APPS="admin public"
PATHS="nextjs-tdd-blog-cms/apps/admin nextjs-tdd-blog-cms/apps/public"

# Specific category
CATEGORY="error-handling"  # or: naming, types, async, jsdoc, etc.
```

#### 1.2 Check Existing Rules

```bash
ls shirokuma-docs/src/lint/rules/
```

Avoid duplicating:
- server-action-structure.ts
- annotation-required.ts
- testdoc-*.ts

### Phase 2: Data Collection

#### 2.1 Run Pattern Counts

For each pattern in discovery-categories.md:

```bash
# Template
echo "=== Pattern: {name} ==="
for app in $PATHS; do
  count=$(grep -rn "PATTERN" "$app" --include="*.ts" 2>/dev/null | wc -l)
  echo "$app: $count"
done
```

#### 2.2 Collect Examples

```bash
# Get first 3 examples per app
for app in $PATHS; do
  echo "--- $app ---"
  grep -rn "PATTERN" "$app" --include="*.ts" 2>/dev/null | head -3
done
```

#### 2.3 Record in Matrix

| Pattern | Admin | Public |
|---------|-------|--------|
| try-catch | X | X |
| console.error | X | X |
| ... | ... | ... |

### Phase 3: Analysis

#### 3.1 Identify Consistency

Consistent pattern (good candidate for rule):
- Same approach in 3+ apps
- High occurrence count (>10 per app)

#### 3.2 Identify Inconsistencies

```
App A: pattern X (100%)
App B: pattern X (80%) + pattern Y (20%) ← Inconsistency!
```

#### 3.3 Identify Missing Patterns

```
App A: pattern present
App B: pattern present
App C: pattern MISSING ← Candidate for required rule
```

### Phase 4: Prioritization

#### Priority Matrix

| Criterion | P0 | P1 | P2 |
|-----------|----|----|-----|
| Bug potential | High | Medium | Low |
| Occurrence | >100 | 50-100 | <50 |
| Inconsistency | Critical | Moderate | Minor |
| Fix complexity | Auto-fix | Semi-auto | Manual |

#### Decision Tree

```
Is it a security/auth issue?
├─ Yes → P0
└─ No
   Does it cause runtime bugs?
   ├─ Yes → P0
   └─ No
      Is it consistency issue across apps?
      ├─ Yes, >50 occurrences → P1
      └─ No → P2
```

### Phase 5: Proposal Generation

#### 5.1 Use Template

Copy [templates/rule-proposal.md](../templates/rule-proposal.md)

#### 5.2 Fill Sections

1. **Pattern Description**: What you found
2. **Occurrences**: Counts from Phase 2
3. **Inconsistencies**: From Phase 3
4. **Proposed Rule**: Detection logic
5. **Implementation**: Code sketch
6. **Priority**: From Phase 4

#### 5.3 Validate

- [ ] Not duplicating existing rule
- [ ] Occurrence count >10 total
- [ ] Clear detection logic
- [ ] Auto-fix feasibility assessed

### Phase 6: Output

#### 6.1 Save Report

```bash
# Save report to GitHub Discussions (Research category)
shirokuma-docs discussions create \
  --category Research \
  --title "[Research] Rule Discovery: ${CATEGORY}" \
  --body "# Rule Discovery Report: ${CATEGORY}
..."
```

#### 6.2 Link to Future Plans (if applicable)

For rules that relate to planned features:
- Check GitHub Discussions (Ideas category) for relevant proposals
- Link to GitHub Projects for roadmap tracking

#### 6.3 Create Follow-up Issue

Create a GitHub Issue if the proposed rule requires shirokuma-docs implementation.

## Quick Commands Reference

```bash
# Error handling patterns
grep -rn "try {" apps/ --include="*.ts" | wc -l
grep -rn "catch.*{" apps/ --include="*.ts" | wc -l
grep -rn "console.error\|logger.error" apps/ --include="*.ts" | wc -l

# Type safety
grep -rn ": any\|as any" apps/ --include="*.ts" | wc -l

# Async patterns
grep -rn "async function\|async (" apps/ --include="*.ts" | wc -l
grep -rn "\.then(" apps/ --include="*.ts" | wc -l

# JSDoc coverage
grep -rn "^/\*\*" apps/ --include="*.ts" | wc -l
grep -rn "@param" apps/ --include="*.ts" | wc -l

# Naming patterns
find apps/ -name "*.ts" | xargs basename -a | sort | uniq -c | sort -rn | head -20

# Export patterns
grep -r "^export default" apps/ --include="*.ts" | wc -l
grep -r "^export function" apps/ --include="*.ts" | wc -l
```

## Output Format

```markdown
# Rule Discovery Report: {Category}

**Date**: YYYY-MM-DD
**Apps Analyzed**: admin, public
**Patterns Found**: X
**Proposed Rules**: Y

## Summary

| Pattern | Occurrences | Consistency | Priority |
|---------|-------------|-------------|----------|
| {name} | X | High/Med/Low | P0/P1/P2 |

## Proposals

### 1. {Rule Name}
[Link to full proposal]

...
```
