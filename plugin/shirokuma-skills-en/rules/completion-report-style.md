# Completion Report Style Guide

Ensure "same system" consistency across skill completion reports. Consistency, not uniformity.

## Heading

Use `## {Action Noun} Complete` as the standard heading.

| Good | Bad |
|------|-----|
| `## Commit Complete` | `## Results` |
| `## Plan Complete: #42 Title` | `## Summary Display` |
| `## Rule Created` | `## Output` |

Append `: #{number} {title}` when contextual identification is useful.

## Key-Value Display

Use `**{Label}:** {value}` format.

```
**Branch:** feat/42-xxx
**Status:** Spec Review
**Location:** .claude/rules/my-rule.md
```

## Structure Selection

| Data Shape | Structure |
|-----------|-----------|
| 2 or fewer key-value pairs | `**Key:** value` bullet list |
| 3+ column tabular data | Table |
| Ordered list | Numbered list |

## GitHub References

| Target | Format |
|--------|--------|
| Issue / PR / Discussion | `#123` |
| External links | Full URL |
| File paths | Backtick `path/to/file` |

## Next Steps

| Invocation | Next Steps |
|-----------|------------|
| Chain (via working-on-issue) | Omit (chain auto-executes) |
| Standalone | Always suggest |

## Prohibited Patterns

- Raw URLs for GitHub references (`https://github.com/.../issues/42` → `#42`)
- Markdown links for GitHub references (`[#123](URL)` → `#123`)
- Verb forms in headings (`## Generate Report` → `## Report Generated`)
- Inconsistent section names (do not mix "confirmation", "summary display", "report generation")
