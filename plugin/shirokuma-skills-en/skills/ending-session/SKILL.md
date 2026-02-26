---
name: ending-session
description: End a work session saving handover info and updating project items. Use when "end session", "finish work", "save handover".
allowed-tools: Bash, Read, Write, Grep, Glob, AskUserQuestion
---

# Ending Session

End the current session and auto-save handover information.

## Handover is Mandatory

Every session MUST end with a handover Discussion. This is **not optional** — even brief sessions produce useful context for future sessions.

- If no significant work was done, write a brief summary of what was discussed or investigated
- If the user tries to skip the handover, explain its importance and proceed with creation
- Empty Summary or Next Steps sections are not acceptable — always provide at least one line for each

## Standalone Work Note

This skill is designed for session-based workflows. When skills are invoked standalone (without `starting-session`), `ending-session` is **not required**.

However, consider running `ending-session` when standalone work involves:

| Standalone Scope | Recommendation |
|-----------------|----------------|
| Quick single-skill invocation (typo fix, item creation) | No handover needed |
| Multiple commits or significant code changes | Run `ending-session` to preserve context |
| Research findings or architecture investigation | Create a Discussion instead |

## Workflow

### Step 1: Gather Session Summary

Analyze conversation to extract:
1. **Summary**: What was accomplished (1-2 sentences)
2. **Related Items**: Project items worked on
3. **Key Decisions**: Important decisions with rationale
4. **Blockers**: Any blockers encountered
5. **Next Steps**: Actionable tasks for next session
6. **Modified Files**: From `git status --short`
7. **Commits**: From `git log --oneline` (this session)

### Step 2: Get Pre-End-Session Data

```bash
shirokuma-docs session preflight
```

Single command to fetch all session-ending data:
- `git.branch` / `git.baseBranch` / `git.isFeatureBranch` — Branch state
- `git.uncommittedChanges` / `git.hasUncommittedChanges` — Uncommitted changes
- `git.unpushedCommits` — Unpushed commit count (`null` when upstream not set)
- `git.recentCommits` — Recent commits (max 10, `{hash, message}` array)
- `issues` — Active issues (excludes Done/Released). Array of:
  - `number`: Issue number
  - `title`: Issue title
  - `status`: Project status (`string | null`)
  - `hasMergedPr`: Whether a merged PR exists for this issue (`boolean`). Only checked for In Progress / Review status; always `false` for other statuses
  - `labels`: Area labels (`string[]`)
  - `priority`: Project priority (`string | null`)
- `prs` — Open PRs. Array of:
  - `number`: PR number
  - `title`: PR title
  - `reviewDecision`: Review status (`"APPROVED"` | `"CHANGES_REQUESTED"` | `"REVIEW_REQUIRED"` | `null`)
- `sessionBackups` — PreCompact backup count (`number`). Non-zero indicates an interrupted previous session (diagnostic field)
- `warnings` — Warning messages array

### Step 3: Push Branch and Create PR (if on feature branch)

If preflight output `git.isFeatureBranch` is `true`:

#### 3a. Check for Uncommitted Changes

```bash
git status --short
```

If uncommitted changes exist, use AskUserQuestion to confirm whether to commit them before proceeding.
Follow the `committing-on-issue` skill workflow: stage specific files, write a conventional commit message (no Co-Authored-By), and commit.

#### 3b. Push Branch

```bash
git push -u origin {branch-name}
```

#### 3c. Create PR

Follow the `creating-pr-on-issue` skill workflow. Create a PR targeting `develop` (see `branch-workflow` rule):

```bash
shirokuma-docs issues pr-create --base develop --title "{title}" --body-file /tmp/shirokuma-docs/pr-body.md
```

Where `/tmp/shirokuma-docs/pr-body.md` contains:
```markdown
## Summary
{1-3 bullet points of what was done}

## Related Issues
{Closes #N or Refs #N for each issue}

## Test plan
- [ ] {testing checklist items}
```

**PR title:** Concise summary under 70 characters.
**PR body:** Include `Closes #{number}` for items that are done, `Refs #{number}` for items still in progress.
**PR base:** Always `develop` for daily work. Only hotfixes target `main`.

#### 3d. Note the PR URL

Save the PR URL for inclusion in the handover body.

If on the base branch (no feature branch), skip this step entirely.

### Step 3.5: Create Handover Body

Use the Write tool to create `/tmp/shirokuma-docs/handover.md` with the handover content (use the template from the "Handover Body Format" section).

Step 4 will reference this file via `--body-file /tmp/shirokuma-docs/handover.md`.

### Step 4: Save Handover + Update Statuses (Single Command)

Using the file created in Step 3.5, run:

```bash
shirokuma-docs session end \
  --title "$(date +%Y-%m-%d) - {brief summary}" \
  --body-file /tmp/shirokuma-docs/handover.md \
  --done {completed_issue_numbers} \
  --review {review_issue_numbers}
```

This single command:
- Creates the handover Discussion (Handovers category)
- Updates specified issues to "Done" or "Review" status

**Options:**
- `--title` (required) - Handover title, typically date + summary
- `--body-file` (required) - File path to handover body markdown (Write tool で作成)
- `--done <numbers...>` - Issue numbers to mark as Done
- `--review <numbers...>` - Issue numbers to mark as Review

**Auto-formatted title (multi-developer support)**: Titles in `YYYY-MM-DD - {summary}` format have the GitHub username automatically inserted.

Example: `2026-02-19 - Plugin feature` → `2026-02-19 [alice] - Plugin feature`

- If the title already contains `[username]`, no insertion occurs (idempotent)
- If username lookup fails, the original title is used as-is

**Choosing --done vs --review:**
- `--done`: Work is fully complete, no PR needed (or already merged)
- `--review`: PR created, awaiting user review (auto-promotes to Done if PR already merged)

**Determination algorithm** (for each issue):

| Priority | Condition | Action |
|----------|-----------|--------|
| 0 | Status is Planning or Spec Review | Do not update status (pre-work status, planning in progress) |
| 1 | Issue has a merged PR | `--done` |
| 2 | Issue has an open PR | `--review` |
| 3 | Work complete, no PR needed | `--done` |
| 4 | Work still in progress | Do not update status |

Use the `issues[].hasMergedPr` flag and `prs` array from `session preflight` output to determine the action. Issues with `hasMergedPr: true` use `--done`; issues with an open PR use `--review`. No additional `shirokuma-docs issues show` call is needed.

**Idempotency**: If `creating-pr-on-issue` already set Review after self-review, `--review` is a no-op. If `committing-on-issue` merge chain already set Done, `--done` is a no-op. `ending-session` acts as a safety net, catching any status updates that other skills missed.

**Output:**
```json
{
  "handover": {
    "number": 31,
    "title": "2026-02-02 - Feature implementation",
    "url": "https://github.com/..."
  },
  "updatedIssues": [
    { "number": 27, "status": "Done" },
    { "number": 26, "status": "Review" }
  ]
}
```

**Local fallback** (if `session end` fails):

Use the Write tool to save the handover body to `.claude/sessions/{YYYY-MM-DD-HHMMSS}-handover.md` (use the template from the "Handover Body Format" section). Run `mkdir -p .claude/sessions` first if the directory does not exist.

On success, `session end` automatically cleans up any PreCompact backups in `.claude/sessions/`.

### Step 5: Display Summary

```markdown
## Session Ended

**Saved to:** {handover.url or local path}
**Branch:** {branch name}
**PR:** {PR URL or "N/A"}

### Accomplishments
{summary}

### Completed Items
- #{number} → Done

### Items for Review
- #{number} → Review (PR #{pr_number})

### Next Steps
- [ ] {task 1}
- [ ] {task 2}
```

## Handover Body Format

```markdown
## Summary
{What was accomplished}

## Related Items
- #{number} - {title} - {status}

## Key Decisions
- {Decision and rationale}

## Blockers
- {Blockers, or none}

## Next Steps
- [ ] {Next task}

## Commits (This Session)
| Hash | Description |
|------|-------------|
| {hash} | {message} |

## Pull Requests
- {PR URL, or "No PR created (working on base branch)"}

## Modified Files
- `path/file.ts` - {Change description}

## Notes
{Additional information}
```

> **Note**: Write section headers and content in English.

## GitHub Writing Rules

Handover Discussion body, PR title, and PR body must comply with the `output-language` rule and `github-writing-style` rule.

**NG example (English setting but wrong language):**

```
## サマリー
機能を実装しました...  ← Wrong language for English setting
```

**OK example:**

```
## Summary
Implemented the feature...
```

## Error Handling

| Error | Action |
|-------|--------|
| `session end` fails | Save to local file |
| No "Handovers" category | Save to local file |
| gh not authenticated | Save to local file |
| No changes in session | Still save a brief handover |
| Issue not in project | Warn and continue |
| `git push` fails | Warn user, save handover without PR |
| `issues pr-create` fails | Warn user, include branch name in handover |
| On base branch (no feature branch) | Skip push/PR steps, save handover only |

## Notes

- Auto-save without confirmation for faster workflow
- Always generate a summary even if brief
- Local fallback ensures handover is never lost
- `session end` handles both handover creation and status updates in one call
- Use `--review` when PR is created, `--done` when work needs no review
- Include PR URL in handover body for traceability
- Never leave Summary or Next Steps empty (at least one line each)
- Use `--review` for items with a PR already created (not `--done`)
- Use TodoWrite to track progress when updating multiple items
