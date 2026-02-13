---
name: starting-session
description: Start a work session showing project status and previous handovers. Use when "start session", "begin work".
allowed-tools: Bash, Read, Grep, AskUserQuestion
---

# Starting Session

Start a new work session and display project context.

## Workflow

### Step 1: Fetch Session Context (Single Command)

```bash
shirokuma-docs session start
```

This returns JSON with:
- `repository` - Current repository
- `git` - Git state (`currentBranch`, `uncommittedChanges`, `hasUncommittedChanges`)
- `lastHandover` - Latest handover (null if none)
- `backups` - PreCompact session backups (if any exist from interrupted sessions)
- `issues` - Active issues with project fields (Done/Released excluded)
- `total_issues` - Count of active issues

### Step 1b: Backup Detection

If the `backups` field is present, a previous session may have been interrupted before proper handover.
Show the backup contents (branch, uncommitted changes, recent commits) to help the user recover context.

### Step 2: Display Session Context

Parse the JSON output and display:

```markdown
## Session Started

**Repository:** {repository}
**Time:** {current time}
**Branch:** {git.currentBranch} {git.hasUncommittedChanges ? "(uncommitted changes)" : "(clean)"}

### Previous Handover
{lastHandover.title or "None found"}
- Summary: {parse body for Summary section}
- Next Steps: {parse body for Next Steps section}

### Active Issues

**In Progress:**
- #{number} {title} (Priority: {priority}, Size: {size})

**Ready ({count}):**
- #{number} {title}

**Backlog ({count}):**
- #{number} {title}
```

Group issues by status: In Progress → Ready → Backlog → Icebox → (no status)

If there are uncommitted changes (`git.hasUncommittedChanges`), inform the user before proceeding.

### Step 3: Ask for Direction

Use AskUserQuestion to present the top items as selectable options. Include the highest-priority In Progress and Ready items as options, plus an "Other" option for free-form input.

If the session has many active items, prioritize showing In Progress items first, then Ready, then top Backlog items (max 4 options total).

## If Item Selected

Route to the appropriate skill based on the issue's status.

### Status-Based Routing

| Issue Status | Delegate To | Reason |
|-------------|-------------|--------|
| Backlog | `planning-on-issue` | Needs planning |
| Planning | `planning-on-issue` | Planning in progress |
| Spec Review | `working-on-issue` | Implicit approval, start implementation |
| In Progress | `working-on-issue` | Resume work |
| Review / Pending | `working-on-issue` | Continue work |
| (Other / No status) | `working-on-issue` | Default |

### Skill Invocation

```
Skill: {skill name based on routing table}
Args: #{number}
```

`working-on-issue` handles status update, branch creation, plan check, skill selection, execution, and post-work flow.
`planning-on-issue` handles plan creation and status transitions.
Do NOT duplicate status updates or branch creation in `starting-session`.

## Error Handling

| Error | Action |
|-------|--------|
| `shirokuma-docs: command not found` | Install: `pnpm install` in shirokuma-docs |
| `gh: command not found` | Install: `brew install gh` or `sudo apt install gh` |
| `not logged in` | Run: `gh auth login` |
| lastHandover is null | Show "No previous handover found" |
| issues is empty | Show "No active issues" |
| git pull fails | Warn and continue with local base branch |

## Notes

- Always show current time in session header
- Parse handover body for Summary and Next Steps sections
- Show items in priority order within each status
- Done/Released items are automatically excluded by `session start`
- After item selection, delegate to `working-on-issue` or `planning-on-issue` based on status-based routing (do not duplicate status update or branch creation)
- Do not use raw `gh` commands directly (use `shirokuma-docs session start` instead)
