# /create-item Workflow

Create a GitHub Project item (Issue or DraftIssue). When called without arguments, auto-infers from conversation context.

```
/create-item                    # Context auto-inference mode
/create-item "Title"            # With title
```

## Step 1: Gather Details

With arguments: Use the provided title.
Without arguments: Infer from conversation context:

| Target | Source | Method |
|--------|--------|--------|
| Title | Recent user message | Summarize the problem/feature mentioned before "make this an issue" |
| Label | Conversation context | Bug report → `bug`, feature request → `feature`, tech debt → `chore` |
| Priority | Conversation context | Urgency expressions ("urgent" → High, normal → Medium) |
| Body | Full conversation context | Structure into summary, background, tasks |
| Size | Task estimate | Estimate from task count and impact scope (default S) |

Confirm inferred values with AskUserQuestion before creating.

Label options (for work type classification):

| Label | Purpose |
|-------|---------|
| `feature` | New functionality |
| `bug` | Bug fix |
| `chore` | Maintenance, refactoring |
| `docs` | Documentation |
| `research` | Investigation |

## Step 2: Generate Body

```markdown
## Summary
{what and why}

## Background
{why this issue exists, current problems, relevant technical constraints and dependencies}

## Tasks
- [ ] {task 1}

## Deliverable
{what "done" looks like}
```

> **Background section**: Plan review (`planning-on-issue` Step 4) evaluates plans from the issue body alone. Missing background, constraints, or dependencies will cause the reviewer to return NEEDS_REVISION. For lightweight issues (typo fixes, etc.), a single line suffices.

## Step 3: Set Fields

| Field | Options | Default |
|-------|---------|---------|
| Priority | Critical / High / Medium / Low | Medium |
| Size | XS / S / M / L / XL | S |
| Status | Backlog / Ready | Backlog |

## Step 4: Create

```bash
# Issue (recommended - supports #number)
shirokuma-docs issues create \
  --title "Title" --body /tmp/body.md \
  --labels feature \
  --field-status "Backlog" --priority "Medium" --size "M"

# DraftIssue (lightweight)
shirokuma-docs projects create \
  --title "Title" --body /tmp/body.md \
  --field-status "Backlog" --priority "Medium"
```

## Step 5: Display Result

```markdown
## Item Created
**Issue:** #123 | **Label:** feature | **Priority:** Medium | **Status:** Backlog
```
