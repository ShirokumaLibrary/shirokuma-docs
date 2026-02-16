---
name: showing-github
description: Display GitHub project data (dashboard, items, issues, PRs, handovers, specs). Use when "show dashboard", "show items", "show issues", "show PRs", "show handovers", "show specs".
allowed-tools: Bash, Read, Glob
---

# Showing GitHub

Display GitHub project data. Consolidates dashboard, items, issues, PRs, handovers, and specs into one skill.

> **Reference**: See `reference/github-operations.md` for CLI commands, Status Workflow, and error handling.

## /show-dashboard

Full project dashboard aggregating GitHub data.

```
/show-dashboard              # Full dashboard
/show-dashboard --quick      # Quick summary only
```

### Workflow

1. Get repository info: `gh repo view --json nameWithOwner -q '.nameWithOwner'`
2. Run in parallel:
   - `shirokuma-docs issues list` (project items by status + derive open issue count from `total_issues`)
   - `shirokuma-docs issues pr-list` (open PRs list + derive PR count from line count)
   - `gh api repos/{owner}/{repo}/commits?per_page=5` (recent commits)
   - `shirokuma-docs discussions list --category Handovers --limit 3` (recent handovers)

### Display Format

```markdown
# Project Dashboard

**Repository:** {owner}/{repo}
**Generated:** {timestamp}

## Project Items
| Status | Count | Bar |
|--------|-------|-----|
| In Progress | 1 | ██ |
| Backlog | 2 | ████ |

**Total:** {total} | **Completion:** {done/total * 100}%

## Activity
| Metric | Count |
|--------|-------|
| Open Issues | {count} |
| Open PRs | {count} |
| Commits (7d) | {count} |

## Recent Handovers
| Date | Title |
|------|-------|
| {date} | {title} |
```

### Quick Mode (--quick)

```markdown
## Quick Status
**Items:** 6 Done / 1 In Progress / 2 Backlog
**Issues:** 3 open | **PRs:** 1 open
**Last commit:** {message} ({time ago})
```

---

## /show-items [filter]

GitHub Project items with Status filter.

```
/show-items              # Active items (excludes Done/Released)
/show-items all          # All items including Done
/show-items ready        # Items with "Ready" status
/show-items in-progress  # Items with "In Progress" status
```

### Workflow

```bash
# Default (open issues)
shirokuma-docs issues list

# With filter
shirokuma-docs issues list --all
shirokuma-docs issues list --status Ready
shirokuma-docs issues list --status "In Progress" --status Ready
```

### Display Format (Grouped View)

```markdown
## Project Items

**In Progress (1):**
- #9 Task title (XL, Medium)

**Backlog (2):**
- #10 Feature A (M, High)

**Icebox (1):**
- #8 Future enhancement (L, Low)

---
Total: 4 active items
```

### Filtered View

```markdown
## Ready Items (2)
| # | Title | Priority | Size |
|---|-------|----------|------|
| #10 | Feature A | High | M |
```

---

## /show-issues [--label X] [--assignee X]

GitHub Issues list with filtering.

```
/show-issues                 # All open issues
/show-issues --all           # Include closed
/show-issues --label bug     # Filter by label
/show-issues --assignee @me  # My issues
```

### Workflow

```bash
gh issue list --state open \
  --json number,title,state,labels,assignees,createdAt,updatedAt \
  --limit 20
```

### Display Format

```markdown
## Issues

**Filter:** {description} | **Total:** {count}

| # | Title | Labels | Assignee | Updated |
|---|-------|--------|----------|---------|
| #123 | Fix login bug | `bug` | @user | 2d ago |
```

---

## /show-prs [filter|number]

PR list and details.

```
/show-prs                  # Open PRs list
/show-prs --state closed   # Closed PRs
/show-prs --state merged   # Merged PRs
/show-prs --state all      # All PRs
/show-prs 42               # Specific PR details
```

### Workflow

**List view:**

```bash
# Default (open PRs)
shirokuma-docs issues pr-list

# With filters
shirokuma-docs issues pr-list --state merged --limit 10
shirokuma-docs issues pr-list --state all
```

**Detail view:**

```bash
shirokuma-docs issues pr-show {number}
```

### Display Format (List)

```markdown
## Pull Requests

**Filter:** {description} | **Total:** {count}

| # | Title | Branch | Review |
|---|-------|--------|--------|
| #42 | feat: Add new feature | feat/42-new-feature | APPROVED |
```

### Display Format (Detail)

```markdown
## PR #{number}: {title}

**Status:** {state} | **Review:** {review_decision}
**Branch:** {head} → {base}

### Summary
{body}

### Change Stats
| File | Additions | Deletions |
|------|-----------|-----------|
| src/file.ts | +50 | -10 |

### Linked Issues
- #42 (Closes)
```

---

## /show-handovers [count]

Past session handover information.

```
/show-handovers       # Last 5 handovers
/show-handovers 10    # Last 10
/show-handovers all   # All handovers
```

### Data Sources (try in order)

1. GitHub Discussions (Handovers category)
2. Local files (`.claude/sessions/*.md`)

### Workflow

```bash
# From Discussions
shirokuma-docs discussions list --category Handovers --limit {count}

# Get specific handover
shirokuma-docs discussions get {number}

# From local files (fallback)
ls -t .claude/sessions/*-handover.md 2>/dev/null | head -{count}
```

### Display Format (List View)

```markdown
## Recent Handovers

**2025-01-25** - Blog CMS article management
   Summary: Implemented post CRUD with draft/publish workflow
   Next: Add category filtering
   Issues: #10, #12

**2025-01-24** - Session management skill
   Summary: Created session skills
   Next: Test with Discussions
```

### Parsing Handover Content

| Section | Pattern |
|---------|---------|
| Summary | Text after `## Summary` |
| Issues | Lines matching `#\d+` after `## Related` |
| Next Steps | Checkbox items after `## Next Steps` |

---

## /show-specs [--recent] ["keyword"]

Spec Discussions from Ideas category.

```
/show-specs              # All specs
/show-specs --recent     # Last 5
/show-specs "keyword"    # Search
```

### Workflow

```bash
gh api graphql -f query='{
  repository(owner: "{owner}", name: "{repo}") {
    discussions(first: 20, categoryId: "{ideas_id}", orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes { number title createdAt author { login } comments { totalCount } url }
    }
  }
}'
```

### Display Format

```markdown
## Specifications

| # | Title | Author | Comments | Created |
|---|-------|--------|----------|---------|
| #10 | [Spec] Auth Flow | @user | 5 | 1w ago |
```

### Status Indicators

```
Draft | Review | Approved | Rejected | Implementing
```

---

## Error Handling

| Error | Action |
|-------|--------|
| No project found | Show only Issues/PRs/Commits |
| No items match filter | "No items with status '{filter}'. Try `/show-items`." |
| No Discussions/category | Check local files or skip gracefully |
| No handovers found | "No handover history. Start with `/ending-session`." |
| No specs found | "No specs found. Create one with `/create-spec`." |
| gh not authenticated | Prompt: `gh auth login` |

## Reference Documents

### Skill Documents

| Document | Content | When to Read |
|----------|---------|--------------|
| [reference/github-operations.md](reference/github-operations.md) | GitHub CLI commands and status workflow | All subcommands |

## Notes

- All data fetched on-demand (not cached)
- Items sorted by Priority within each status
- Combine Discussion and local handovers if both exist
- Specs stored in "Ideas" category by convention
- When the request is ambiguous, use AskUserQuestion to confirm which subcommand (dashboard/items/issues/prs/handovers/specs)
- This is a display-only task; TodoWrite is not needed
