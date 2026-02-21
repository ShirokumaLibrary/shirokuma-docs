# Chain Decision Rules

## Issue Type Inference

Issue Type follows the type determination table in `managing-github-items`'s `reference/create-item.md`.

| Keyword | Type |
|---------|------|
| feature, new feature, implement, add | Feature |
| bug, defect, fix | Bug |
| refactoring, config change, tooling, chore | Chore |
| documentation, README, docs | Docs |
| research, investigation | Research |

## Priority / Size Inference

Follow `managing-github-items`'s `reference/create-item.md`.

## Chain Decision

Whether to chain to `working-on-issue` after creation:

| Condition | Chain | Reason |
|-----------|-------|--------|
| User explicitly says "work on it now", "plan this" | Yes | Explicit intent |
| Issue created from in-conversation problem | Confirm | Context is warm, can start planning immediately |
| Batch creation (multiple issues in sequence) | No | Individual work is inefficient |
| Priority: Low | No (recommended) | Not urgent |
| Priority: Critical/High | Yes (recommended) | High urgency |

## Backlog-Only Path

Keep in Backlog without chaining when:

- User explicitly says "later" or "not now"
- During batch issue creation
- Another issue is currently In Progress (WIP limit)

## Relationship with `working-on-issue` Step 1a

When `working-on-issue` is invoked with text description only (no issue number), Step 1a calls `creating-item`. `creating-item` creates the Issue and returns the number, and `working-on-issue` continues. In this case, chain decision is not needed (as `working-on-issue` automatically continues).
