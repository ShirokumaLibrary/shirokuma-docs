# Batch Workflow

Process multiple small issues in a single branch and PR when they share a common area or theme.

## Eligibility Criteria

All conditions must be met for batch processing:

| Criterion | Requirement |
|-----------|-------------|
| Size | XS or S only (M+ requires individual processing) |
| Relatedness | Same `area:*` label, or affecting the same file group |
| Independence | No blocking dependencies between issues (ordering preference is OK) |
| Upper limit | 5 issues or fewer per batch (recommended) |

**Not eligible:**
- Issues with different `area:*` labels and no file overlap
- Issues requiring TDD (each needs its own test cycle)
- Issues where any single item is M or larger

## Quality Standards

### Commit Granularity

- **1 issue = 1+ commits** — never mix changes from different issues in a single commit
- Scope `git add` to files relevant to the current issue only
- Reference the issue number in every commit: `{type}: {description} (#{issue-number})`

### Testing

- Run related tests after each issue's changes (before moving to the next issue)
- If a test suite is shared across issues, run it once after the final issue

### Review

- Single PR for the entire batch
- PR body includes an **issue-by-issue change summary** (auto-generated from commits)
- Self-review covers all changes in the batch

## Branch Naming

```
{type}/{issue-numbers}-batch-{slug}
```

**Type determination:**
- Single type across all issues → use that type
- Mixed types → default to `chore`

**Issue numbers:** Hyphen-separated, sorted ascending.

**Examples:**
```
chore/794-795-798-807-batch-docs-fixes
feat/101-102-batch-button-components
fix/200-201-203-batch-form-validation
```

## PR Template

```markdown
## Summary
{Overall description of the batch}

## Changes by Issue

### #{N1}: {title}
- {change description}

### #{N2}: {title}
- {change description}

## Related Issues
Closes #{N1}, #{N2}, #{N3}

## Test Plan
- [ ] {verification step}
```

## Status Management

### Exceptions to Standard Rules

Batch mode creates controlled exceptions to `project-items` rules:

| Standard Rule | Batch Exception |
|--------------|-----------------|
| One In Progress at a time | All batch issues move to In Progress simultaneously |
| Branch per issue | All batch issues share one branch |

### Status Transitions

| Event | Action |
|-------|--------|
| Batch starts | All issues → In Progress (bulk update) |
| PR created | All issues → Review (via PR `Closes` links) |
| PR merged | All issues → Done (automatic via `issues merge`) |
| Batch interrupted | Completed issues stay In Progress; see Interruption Recovery |

## Interruption Recovery

If a batch is interrupted mid-session:

1. **Completed issues** (changes committed): Remain In Progress on the shared branch
2. **Unstarted issues**: Move back to Backlog
3. **Branch**: Preserved for resumption in next session
4. **Recovery**: Resume with `working-on-issue #{remaining-issues}` on the existing branch

Use `session check --fix` to detect and correct any status inconsistencies after interruption.

## Batch Candidate Detection

Used by `starting-session` and `showing-github` to proactively suggest batches.

### Detection Algorithm

1. Filter: Backlog issues with Size XS or S
2. Group by:
   - **Primary**: `area:*` label (exact match)
   - **Fallback**: Title keyword extraction (2+ common nouns → same group)
3. Filter: Groups with 3+ issues
4. Display: Top 3 groups, sorted by group size descending

### Display Format

```markdown
### Batch Candidates
| Group | Issues | Area |
|-------|--------|------|
| Plugin fixes | #101, #102, #105 | area:plugin |
| CLI improvements | #110, #112, #115 | area:cli |
```

## Rules

1. **Eligibility gate** — Check all criteria before starting a batch
2. **1 issue 1 commit minimum** — Never mix issue changes in a single commit
3. **Scoped staging** — `git add` only files for the current issue
4. **Test between issues** — Run relevant tests after each issue's implementation
5. **Single PR** — One branch, one PR for the entire batch
6. **Bulk status update** — All issues move to In Progress at batch start
7. **Issue-by-issue summary** — PR body must contain per-issue change descriptions
