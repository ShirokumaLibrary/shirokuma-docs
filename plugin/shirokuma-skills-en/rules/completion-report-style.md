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

For detailed bullets vs prose guidelines in GitHub content (Issues, PRs, Discussions), see the `github-writing-style` rule.

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

## Skill Category Guide

| Category | Template Required | Examples |
|----------|------------------|---------|
| Workflow | Required (strict) | committing-on-issue, creating-pr-on-issue, ending-session |
| Config Management | Required (strict) | managing-rules, managing-skills, managing-agents |
| Analysis | Required (with tables) | evolving-rules, planning-on-issue |
| Display / Orchestrator | Not required | showing-github, working-on-issue |
| Delegator | Deferred to caller | reviewing-on-issue, creating-item |

Skills that do not require templates may omit the completion report section entirely.

## Information Hierarchy

Arrange completion report information in this priority order:

```
Level 1: Heading (outcome + context ID)        -- 1 second scan
Level 2: KV pairs (critical facts)             -- 5 second scan
Level 3: Table or list (details)               -- 15 second scan
Level 4: Prose explanation (rationale)          -- 30+ second read
```

**1-second test**: The first 3 lines must convey the outcome and where to find the artifact.

## Field Classification

Classify each field in a template:

| Classification | Meaning | Template Notation |
|---------------|---------|-------------------|
| Fixed | Always present, same format | `**Label:** {value}` |
| Conditional | Present only when applicable | `[**Label:** {value}]` |
| Freeform | Variable-length content | `{description}` |

Avoid omitting Fixed fields or always showing Conditional fields.

## Prohibited Patterns

- Raw URLs for GitHub references (`https://github.com/.../issues/42` → `#42`)
- Markdown links for GitHub references (`[#123](URL)` → `#123`)
- Verb forms in headings (`## Generate Report` → `## Report Generated`)
- Inconsistent section names (do not mix "confirmation", "summary display", "report generation")
- Process narration ("First I read the file..." → state results only)
- Self-referential verbosity ("Successfully completed!" → state facts only)
