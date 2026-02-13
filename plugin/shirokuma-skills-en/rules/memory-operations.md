# Memory Operations

## Principle

**Memory is for pointers and working context only.**

## What to Store in Memory

| Type | Example |
|------|---------|
| GitHub reference pointers | `See Discussion #343` `Issue #342` |
| Working context | Test commands, skill counts, quick lookups |

## What NOT to Store → Use GitHub

| Type | Where |
|------|-------|
| Research findings | Discussion (Research) |
| Ideas / proposals | Discussion |
| Architecture decisions | Discussion (ADR) |
| Implementation tasks | Issue |
| Patterns / learnings | Discussion (Knowledge) → Rule extraction |

See `discussions-usage` rule for details.

## Constraints

1. **No duplication with CLAUDE.md or rules** — single source of truth
2. **Topic files should be minimal** — GitHub reference pointers only

## Directive Language in Config Files

Config files are all loaded in parallel into the same context. Relative directives make it unclear which file's instruction is being referenced.

| Bad | Good |
|-----|------|
| "here", "this", "this file" | Use explicit file/section names |
| "the above rule" | `branch-workflow rule` |
