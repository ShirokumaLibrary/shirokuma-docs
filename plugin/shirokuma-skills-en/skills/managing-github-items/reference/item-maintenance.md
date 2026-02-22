# Item Body Maintenance — Detailed Procedures

For Issues / Discussions / PRs. Supplements the overview in the `project-items` rule.

## When to Update

| Trigger | Action |
|---------|--------|
| New findings or corrections added via comments | Consolidate into body |
| Investigation results posted as comments | Merge into body's relevant section |
| Requirements changed via comments | Update body's Tasks/Deliverable sections |
| Decision made in comment thread | Record in body |
| 3+ comments accumulated since last body update | Consolidate into body |

## How to Update

```bash
# Issues
shirokuma-docs issues update {number} --body /tmp/shirokuma-docs/body.md

# Discussions
shirokuma-docs discussions update {number} --body /tmp/shirokuma-docs/body.md
```

## Workflow Order (Comment First)

When updating a body, ALWAYS follow this order:

1. **Post a comment** — Record the changes, findings, or corrections as a comment first
2. **Consolidate into body** — Integrate the comment content into the relevant body section

This order ensures the comment history preserves "what was changed and why", enabling detection and correction of AI judgment errors or hallucinations.

**Prohibited**: Updating the body directly and then adding a comment after the fact (reverse order). Updating the body without any comment.

## Substantive Compliance

Merely following the comment→body order is not enough. Comments must have **independent value as primary records** of the work.

**Heuristic**: If deleting a comment would not lose any information absent from the body, that comment is not substantive.

| Bad (Formal compliance) | Good (Substantive compliance) |
|------------------------|-------------------------------|
| "Plan created. See body for details." | "Selected approach A. Also considered B (reason), rejected due to X." |
| "Updated issue body." | "Investigation found module X is also affected. Added to tasks." |
| "Reflected review results." | "Review detected N issues: {summary of specific findings}" |

**Content that should be primary records in comments**:
- Decision rationale and alternatives considered
- Facts discovered during investigation
- Summary of review findings
- Reasons for requirement changes

**When consolidating into body**: Structure and merge comment content into relevant sections. Comments remain as historical record.

## Updating Body from Review Results

When `reviewing-on-issue` posts review results as PR comments or Issue comments, and a caller skill needs to update the body accordingly.

### Procedure

1. **Confirm review comment is already posted** — `reviewing-on-issue` Step 6 has completed comment posting
2. **Consolidate into relevant body sections** — Update task lists or add new sections based on review results

### Examples

| Scenario | Comment (already posted) | Body consolidation |
|----------|------------------------|-------------------|
| Missing task found in review | "Review detected X processing is not implemented. Adding to tasks." | Add `- [ ] Add X processing` to tasks section |
| Security finding | "Security review found 2 auth check gaps: {specific locations}" | Add fix tasks to tasks section |
| Plan review improvement | "Plan review noted impact on module A is missing from the plan." | Add to changed files in plan section |

### Notes

- `reviewing-on-issue` runs with `context: fork`, so it only posts comments and does not update bodies
- Body updates are the responsibility of caller skills (`creating-pr-on-issue`, `working-on-issue`)
- The review comment itself serves as the primary record, so no additional comment is needed (the review comment = the "comment" in comment-first)

## Guidelines

1. **Preserve structure** — Keep the original body template sections
2. **Update task checkboxes** — Check completed items, add new tasks discovered
3. **Summarize, don't duplicate** — Consolidate comment threads into concise body updates
4. **Comment first** — Always post a comment before updating the body (see Workflow Order above)
