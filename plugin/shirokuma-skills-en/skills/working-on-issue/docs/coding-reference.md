# Implementation Work Type Reference

Guide for delegating from `working-on-issue` to `coding-nextjs` skill.

## Delegation Conditions

| Condition | Delegate To |
|-----------|-------------|
| Labels: `area:frontend`, `area:cli` + Next.js related | `coding-nextjs` |
| Keywords: `implement`, `create`, `add`, `build` | `coding-nextjs` |
| Keywords: `fix`, `bug` | `coding-nextjs` or direct edit |

## TDD Integration

TDD common workflow is **required** for implementation work:

```
[TDD: Test Design → Creation → Gate] → coding-nextjs → [TDD: Test Run → Verification]
```

`working-on-issue` orchestrates TDD steps, `coding-nextjs` focuses on implementation only.

## What coding-nextjs Provides

- Next.js-specific templates (Server Actions, components, pages)
- Framework-specific patterns (Better Auth, Drizzle ORM, CSP, CSRF, etc.)
- Large-scale feature implementation guidelines

## Direct Edit Cases

The following use direct edit instead of `coding-nextjs`:

- Config file changes
- Simple bug fixes (1-2 files)
- Refactoring
- Chore tasks

Tests are still required for direct edit when TDD applies.
