---
name: creating-item
description: Creates Issues/Discussions with auto-inferred metadata from conversation context and provides auto-chaining to working-on-issue. Use when "create issue", "make this an issue", "follow-up issue", "create spec".
allowed-tools: Bash, AskUserQuestion, Read, Write, TodoWrite
---

# Creating Items

Auto-infer Issue metadata from conversation context, delegate to `managing-github-items` for creation, and provide auto-chaining to `working-on-issue`.

## When to Use

- When delegated from `working-on-issue` Step 1a (text description only)
- When user says "create issue", "make this an issue", "follow-up issue"
- When user says "create spec", "write spec"

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

### Step 2: User Confirmation

Present inferred results via AskUserQuestion:

```
Creating Issue with the following:

**Title:** {inferred title}
**Type:** {inferred Type}
**Priority:** {inferred Priority}
**Size:** {inferred Size}
**Labels:** {inferred labels}
```

Options:
- Create with these settings
- Modify before creating
- Cancel

### Step 3: Delegate to `managing-github-items`

After confirmation, invoke via Skill tool:

```
Skill: managing-github-items
Args: create-item {inferred metadata}
```

### Step 4: Chain Decision

After creation, confirm next action via AskUserQuestion:

| Option | Action |
|--------|--------|
| Start working now | Delegate to `working-on-issue` with `#{number}` |
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
→ `/working-on-issue #{number}` to start working
→ Or keep in Backlog
```

## Notes

- Always confirm inferred results with user before creation
- Delegate CLI execution to `managing-github-items` (don't call CLI directly)
- Detailed inference tables are in `managing-github-items`'s `reference/create-item.md`
