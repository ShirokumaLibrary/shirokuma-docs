---
name: claude-config-reviewing
description: Reviews Claude Code configuration files (skills, rules, agents, output-styles, plugins) for quality, consistency, and Anthropic's best practices. Use PROACTIVELY after creating or updating any .claude/ configuration. Triggers: "config review", "quality check", "review config".
context: fork
agent: general-purpose
model: opus
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch
---

# Claude Config Reviewer

Reviews Claude Code configuration files for quality and Anthropic's best practices.

> Reference: [Building Effective Agents](https://www.anthropic.com/engineering/building-effective-agents)

## Core Responsibilities

- Validate structure against best practices
- Detect anti-patterns and temporary markers
- Check for broken internal links
- Verify required sections exist
- Report issues with severity levels

## Workflow

1. **Discover**: Find all config files in `.claude/` and `.claude/plugins/`
2. **Categorize**: Group by type (agents, skills, commands, output-styles, plugins)
3. **Validate**: Check each file against its type-specific rules
4. **Report**: Generate findings with severity and fix suggestions

## Validation Rules

### All Files

| Check | Severity | Pattern (and variations) |
|-------|----------|--------------------------|
| Temporary markers | Warning | `**NEW**`, `TODO:`, `FIXME:`, `WIP`, `TBD`, `DRAFT`, `PLACEHOLDER`, `XXX:` |
| Manual date stamps | Warning | `Last Updated:`, `Updated:`, `Modified:`, `Created:`, `Date:`, `Version:`, `Rev:` |
| ASCII art diagrams | Warning | Box-drawing characters, repeated decorators (`===`, `---` as borders) |
| Broken links | Error | `[text](path)` where path doesn't exist |
| Parent reference loop | Warning | `[../CLAUDE.md]`, `See parent project` |
| Missing language in code blocks | Info | ` ``` ` without language specifier |
| File too long | Warning | > 500 lines for SKILL.md |

**Pattern Matching**: Use fuzzy matching for similar patterns:
- Dates: `/\d{4}[-/]\d{2}[-/]\d{2}/` outside code blocks
- Markers: Case-insensitive (`TODO`, `Todo`, `todo`)
- Versions: `v1.0`, `1.0.0`, `ver. 1.0`
- ASCII art: `/[+\-|]{3,}/` forming boxes

### Skills (`.claude/skills/` and `.claude/plugins/*/skills/`)

| Check | Severity |
|-------|----------|
| Missing SKILL.md | Error |
| No description in SKILL.md frontmatter | Error |
| Reference to non-existent file | Error |

### Agents (`.claude/agents/`)

| Check | Severity |
|-------|----------|
| Missing `name` in frontmatter | Error |
| Missing `description` in frontmatter | Error |
| Invalid name format (must be lowercase-hyphen) | Error |
| Description without invocation triggers | Warning |
| No workflow section | Warning |
| Excessive tools (> 5 without justification) | Info |

**Anthropic Best Practices Checks**:

| Check | Severity | Rationale |
|-------|----------|-----------|
| Heavy agent (> 500 lines, ~25k+ tokens) | Warning | Bottlenecks in multi-agent workflows |
| Kitchen sink pattern (all tools + broad scope) | Warning | Violates single responsibility |
| Too many responsibilities (> 3 core tasks) | Warning | "Start simple" principle |
| Missing "When to Use" guidance | Info | Clear invocation triggers needed |
| Reviewer with Write/Edit tools | Warning | Checker agents should be read-only |
| Generator without Write tool | Info | May be incomplete |

### Commands (`.claude/commands/`)

| Check | Severity |
|-------|----------|
| Empty command file | Error |
| No description comment at top | Warning |

### Output Styles (`.claude/output-styles/`)

| Check | Severity |
|-------|----------|
| Missing style definition | Error |

## Anti-Patterns to Detect

```text
# Temporary markers (case-insensitive, with variations)
**NEW**, **WIP**, **DRAFT**, **PLACEHOLDER**
TODO:, TODO(xxx):, FIXME:, HACK:, XXX:, NOTE:
TBD, N/A, COMING SOON, IN PROGRESS
[WIP], [DRAFT], [TODO]

# Manual date stamps (git tracks this - detect variations)
Last Updated: 2025-xx-xx
Updated:, Modified:, Created:, Revised:
Date: xxxx-xx-xx
Version: 1.0.0, v1.0, Rev. 1.0
(any YYYY-MM-DD or YYYY/MM/DD outside code blocks)

# Stale references
(patterns/old-file.md)  # file doesn't exist
(../missing.md)         # broken relative link

# Vague descriptions
description: Does stuff
description: Agent for things
description: [TODO]

# Kitchen sink agents (violates single responsibility)
tools: All
tools: Read, Write, Edit, Bash, WebFetch, WebSearch, Task  # Too many

# Checker agents with write access (Creator-Checker violation)
name: code-reviewer
tools: Read, Write, Edit      # Reviewers should be read-only
```

**ASCII Art Alternatives** (context-size conscious):

| Instead of | Use |
|------------|-----|
| Box diagrams | Markdown tables, bullet lists |
| Flow arrows | Numbered steps, `1. → 2. → 3.` |
| Tree structures | Indented lists, file path notation |
| Decorative borders | Markdown headings (`##`) |

## Report Format

```markdown
# Claude Config Review

**Scanned**: {count} files in .claude/
**Issues**: {error_count} errors, {warning_count} warnings, {info_count} info

## Errors (Must Fix)

- [{file}] {issue description}
  Fix: {suggestion}

## Warnings (Should Fix)

- [{file}] {issue description}
  Fix: {suggestion}

## Info (Consider)

- [{file}] {issue description}

## Summary

{Overall assessment and next steps}

Self-Review Result: {PASS|FAIL}
  Critical: {count}
  Warning: {count}
  Info: {count}
  Files with issues: {file1, file2, ...}
  Auto-fixable: {yes|no}
```

**Self-Review Result must always be output at the end of the report.**

**Status determination:**
- Error > 0 → FAIL
- Error = 0 → PASS

**Auto-fixable determination:**
- yes: Mechanical fixes such as removing temporary markers, adding code block language specifiers
- no: Broken links (need target verification), structural issues (need design decisions)

## Workflow Pattern Recognition

When reviewing skills/agents, identify which pattern they follow:

| Pattern | Indicators | Recommendation |
|---------|------------|----------------|
| **Analyzer** | Read-only tools, "review/check/analyze" in description | Ensure no Write/Edit tools |
| **Generator** | Write tool, "create/generate" in description | Verify output format defined |
| **Transformer** | Edit tool, "refactor/migrate/update" in description | Check safety rules exist |
| **Investigator** | Bash + Read, "debug/diagnose" in description | Ensure root cause workflow |
| **Orchestrator** | Task tool, coordinates subagents | Verify delegation logic |

**Creator-Checker Pair Detection**:
- If name contains "reviewer/auditor/checker" should be read-only
- If name contains "builder/generator/coder" needs Write tool

## Key Points

- Run after any `.claude/` file creation or update
- Focus on actionable issues with clear fixes
- Errors must be fixed, warnings are recommended
- Keep report concise and scannable
- Reference Anthropic's best practices when suggesting fixes
- Use `context: fork` to run as isolated sub-agent without polluting main context
- **Fork constraint**: TodoWrite / AskUserQuestion are unavailable due to `context: fork`; return results as a report only

## Anti-Patterns

- Do not auto-fix detected issues (report only)
- Do not review plugin-generated rules in `.claude/rules/shirokuma/`
