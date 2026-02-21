# GitHub Writing Style

Writing style for GitHub content (Issues, PRs, Discussions body and comments).

## Bullets vs Prose

| Condition | Format |
|-----------|--------|
| 3+ parallel items | Bullet list |
| Ordered steps | Numbered list |
| Cause-effect / logical argument | Prose |
| Single description | Prose |

## Formatting Rules

- **Parallel structure**: Start each item with the same part of speech / structure
- **Nesting limit**: Maximum 2 levels (3+ levels: split or convert to table)
- **List length**: 2-7 items per list (8+ items: consider grouping)
- **Lead-in sentence**: Add one sentence of context before a list

## Anti-Patterns

| Pattern | Problem | Fix |
|---------|---------|-----|
| Wall of Bullets | Everything bulleted, key points buried | Mix prose and bullets appropriately |
| Broken parallelism | Items use different grammatical structures | Rewrite with consistent structure |
| List without lead-in | Missing context, meaning unclear | Add one introductory sentence |
| Single-item list | Bullet adds no value | Convert to prose |

## Scope

Applies to GitHub Issues / PRs / Discussions body and comments. For skill completion report style, see `completion-report-style` rule. For Claude config file structure, see `managing-agents/documentation-structure.md`.
