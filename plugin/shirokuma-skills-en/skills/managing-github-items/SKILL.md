---
name: managing-github-items
description: Create and manage GitHub project items (Issues / Discussions). Use when "create item", "create issue", "make this an issue", "create spec", "follow-up issue".
allowed-tools: Bash, AskUserQuestion, Read, Write
---

# Managing GitHub Items

Create Issues / Discussions and manage spec Discussions.

## Command Routing

| Command | Purpose | Reference |
|---------|---------|-----------|
| `/create-item` | Issue / DraftIssue creation | [reference/create-item.md](reference/create-item.md) |
| `/create-spec` | Spec Discussion creation | [reference/create-spec.md](reference/create-spec.md) |

## Pattern Matching

| User Intent | Route To |
|-------------|---------|
| "create issue", "make this an issue", "follow-up issue" | `/create-item` |
| Called without arguments | `/create-item` (context auto-inference) |
| "write spec", "create spec", "propose in Discussion" | `/create-spec` |

## Reference Documents

| Document | Content | When to Read |
|----------|---------|--------------|
| [reference/github-operations.md](reference/github-operations.md) | GitHub CLI commands and status workflow | All commands |
| [reference/create-item.md](reference/create-item.md) | Issue creation workflow and context inference | `/create-item` execution |
| [reference/create-spec.md](reference/create-spec.md) | Spec Discussion creation workflow | `/create-spec` execution |

## Error Handling

| Error | Action |
|-------|--------|
| No project found | "Run `/project-setup` to create one." |
| gh not authenticated | "Run `gh auth login` first." |
| Field not found | Use defaults, warn user |
| Issue not found | "Issue #{n} not found. Check the number." |
| No Ideas category | Create in General, suggest adding Ideas |
| Discussions disabled | Save spec to `.claude/specs/` |
| Empty required field | Prompt user for input |

## Notes

- Always set required fields (Status, Priority) on new items
- XL items should prompt user to consider splitting
- Prefix spec titles with "[Spec]" for filtering
