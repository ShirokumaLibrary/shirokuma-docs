# Design Work Type Reference

Guide for delegating from `working-on-issue` to `designing-shadcn-ui` skill.

## Delegation Conditions

| Condition | Delegate To |
|-----------|-------------|
| Keywords: `design`, `UI`, `memorable`, `impressive` | `designing-shadcn-ui` |
| Keywords: `landing page` | `designing-shadcn-ui` |
| Avoiding generic appearance | `designing-shadcn-ui` |

## TDD Not Applied

Design work type does not use TDD. Instead:

1. `designing-shadcn-ui` runs design discovery → implementation → build verification
2. Build passes verification

## What designing-shadcn-ui Provides

- Design discovery workflow (aesthetic direction decision)
- Distinctive typography, color, and motion guidelines
- Anti-pattern avoidance (no generic AI aesthetics)
- shadcn/ui component customization patterns

## Chain

```
designing-shadcn-ui → Commit → PR → Review
```

After design completion, joins the standard commit → PR → review chain.
