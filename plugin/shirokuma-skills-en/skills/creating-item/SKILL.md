---
name: creating-item
description: Creates Issues/Discussions with auto-inferred metadata from conversation context and provides auto-chaining to working-on-issue. Use when "create issue", "make this an issue", "follow-up issue", "create spec".
allowed-tools: Bash, AskUserQuestion, Read, Write, TodoWrite
---

# Creating Items

Auto-infer Issue metadata from conversation context, delegate to `managing-github-items` for creation, and provide auto-chaining to `working-on-issue`.

## Responsibility Split

| Layer | Responsibility |
|-------|---------------|
| `creating-item` | User interface. Context analysis, metadata inference, chain control |
| `managing-github-items` | Internal engine. CLI command execution, field setting, validation |

## Workflow

### Step 1: Context Analysis

Infer from conversation context:

| Field | Inference Source |
|-------|-----------------|
| Title | Concise summary from user's statement |
| Issue Type | Content keywords (see [reference/chain-rules.md](reference/chain-rules.md)) |
| Priority | Impact scope and urgency |
| Size | Work effort |
| Area labels | Affected code areas |

### Step 2: Delegate to `managing-github-items`

After context analysis, invoke via Skill tool immediately (no pre-creation confirmation):

```
Skill: managing-github-items
Args: create-item --title "{Title}" --issue-type "{Type}" --labels "{area:label}" --priority "{Priority}" --size "{Size}"
```

### Step 3: Chain Decision

After creation, confirm next action via AskUserQuestion:

| Option | Action |
|--------|--------|
| Start planning | Delegate to `working-on-issue` with `#{number}` (starts with planning) |
| Keep in Backlog | End (status remains Backlog) |

See [reference/chain-rules.md](reference/chain-rules.md) for chain decision details.

## Reference Documents

| Document | Content | When to Read |
|----------|---------|--------------|
| [reference/chain-rules.md](reference/chain-rules.md) | Chain decision rules and inference logic | Item creation |

## Next Steps

When invoked directly (not via `working-on-issue` chain):

```
Item created: #{number}
→ `/working-on-issue #{number}` to start planning
→ Or keep in Backlog
```

## GitHub Writing Rules

Issue title and body must comply with the `output-language` rule and `github-writing-style` rule. This rule also applies to the delegated `managing-github-items` skill.

## Notes

- After creation, inform the user and offer the opportunity to request modifications
- Delegate CLI execution to `managing-github-items` (don't call CLI directly)
- Detailed inference tables are in `managing-github-items`'s `reference/create-item.md`
