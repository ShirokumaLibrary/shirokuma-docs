# Agent Best Practices

Core patterns based on [Anthropic's "Building Effective Agents"](https://www.anthropic.com/engineering/building-effective-agents) and [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices).

## Table of Contents

- [Core Principles](#core-principles)
- [ACI: Agent-Computer Interface](#aci-agent-computer-interface)
- [System Prompt Design](#system-prompt-design)
- [Tool Selection Strategy](#tool-selection-strategy)
- [Description Optimization](#description-optimization)
- [Quick Reference](#quick-reference)

For advanced topics, see [best-practices-advanced.md](best-practices-advanced.md):
- Common Anti-Patterns
- Testing Agents
- Performance Optimization
- Security Considerations

---

## Core Principles

Three fundamental principles from Anthropic:

### 1. Simplicity
> "Success isn't about building the most sophisticated system—it's about building the right system for your needs."

- Start with the simplest solution
- Add complexity only when results justify it
- Many applications need just "optimizing single LLM calls with retrieval and in-context examples"

### 2. Transparency
- Explicitly show planning steps
- Make agent reasoning visible
- Enable human review and intervention

### 3. Agent-Computer Interface (ACI)
- Design tools as carefully as prompts
- Test tools extensively
- Iterate based on model mistakes

---

## ACI: Agent-Computer Interface

> "Think about your agent-computer interface (ACI) the same way you think about a human-computer interface (HCI)."

### Tool Design Guidelines

| Guideline | Example |
|-----------|---------|
| **Clear names** | `read_file` not `rf` |
| **Descriptive docs** | Include when to use, edge cases |
| **Usage examples** | Show input/output pairs |
| **Error messages** | Actionable, not cryptic |
| **Poka-yoke** | Prevent errors before they happen |

### Tool Documentation Template

```markdown
## tool_name

**Purpose**: [One sentence]

**When to use**: [Specific scenarios]

**Parameters**:
- `param1` (required): [Description]
- `param2` (optional): [Description, default: X]

**Returns**: [Format and structure]

**Examples**:
\```
Input: { "param1": "value" }
Output: { "result": "..." }
\```

**Edge cases**:
- If X happens, returns Y
- Does NOT handle Z (use other_tool instead)
```

### Common Tool Design Mistakes

| Mistake | Fix |
|---------|-----|
| Vague descriptions | Specific use cases |
| Missing examples | Input/output pairs |
| No error handling docs | Document failure modes |
| Overlapping tools | Clear boundaries |
| Complex parameters | Simple, intuitive inputs |

### Token Efficiency

**Prioritize token efficiency over readability.**

| Avoid | Prefer |
|-------|--------|
| ASCII art / box diagrams | Markdown tables, bullet lists |
| Decorative separators | Headers only |
| `Last Updated:` stamps | Git history |
| Verbose explanations | Concise instructions |

- Keep format close to natural text
- Eliminate formatting overhead (line counting, escaping)
- Provide sufficient context for reasoning

---

## System Prompt Design

### Structure for Clarity

```markdown
# Agent Name

[One-sentence role description]

## Core Responsibilities
- [Specific task 1] (not vague)
- [Specific task 2]

## Workflow
1. **Step Name**: [Action] using [Tool]
   - Decision point: If X, then Y
   - Output: [Expected result]

## Quality Criteria
- [Measurable criterion 1]
- [Measurable criterion 2]

## Output Format
[Exact structure with example]
```

### Writing Effective Instructions

**Do**:
```markdown
## Workflow
1. **Scan Files**: Use Glob("**/*.ts") to find TypeScript files
2. **Check Imports**: For each file, verify imports are used
3. **Report Unused**: List file:line for each unused import
```

**Don't**:
```markdown
## Workflow
1. Look at the files
2. Check for problems
3. Report findings
```

### Prompt Length Guidelines

| Agent Complexity | Recommended Length |
|------------------|-------------------|
| Simple, focused | 100-300 lines |
| Standard | 300-500 lines |
| Complex (use directory) | 500+ split across files |

---

## Tool Selection Strategy

### Principle: Minimum Necessary Access

| Agent Type | Recommended Tools | Avoid |
|------------|-------------------|-------|
| Read-only reviewer | Read, Grep, Glob | Write, Edit |
| File generator | Read, Write | Edit (use Write for new files) |
| Code transformer | Read, Edit | Write (prefer Edit for changes) |
| Debugger | Read, Bash, Grep | Write, Edit |

### Tool Combinations

**Analysis agents**:
```yaml
tools: Read, Grep, Glob, Bash
```
- Bash for running tests/linters only
- No file modification capability

**Generation agents**:
```yaml
tools: Read, Write, Bash
```
- Read to understand context
- Write for new files
- Bash to run generators/tests

**Transformation agents**:
```yaml
tools: Read, Edit, Bash
```
- Edit for targeted changes
- Bash to verify after changes

### Web Access

Only add when specifically needed:
```yaml
# Documentation fetcher
tools: Read, Write, WebFetch

# Research agent
tools: Read, WebSearch, WebFetch
```

---

## Description Optimization

### Trigger Phrase Placement

**Good**: Triggers at the end
```yaml
description: Reviews code for security vulnerabilities following OWASP Top 10. Use when user asks to "security review", "audit security", or "check vulnerabilities".
```

**Better**: Rich format with examples
```yaml
description: Security auditor for OWASP Top 10 vulnerabilities.

<example>
Context: User wants security review
user: "Check auth module for vulnerabilities"
assistant: "I'll use the security-auditor to analyze the authentication code."
<Task tool call to security-auditor agent>
</example>
```

### Disambiguation

When multiple agents could match:

```yaml
# Agent 1: code-reviewer
description: Reviews code for quality, style, and maintainability. Use for general code reviews, NOT security-specific.

# Agent 2: security-auditor
description: Reviews code for security vulnerabilities (OWASP). Use specifically for security audits, NOT general code quality.
```

### Proactive Invocation

To encourage automatic use:
```yaml
description: Use PROACTIVELY after any feature implementation to ensure code quality. MUST BE USED when PR is ready for review.
```

---

## Quick Reference

### Agent Quality Checklist

- [ ] Single, clear responsibility
- [ ] Specific workflow steps
- [ ] Minimum necessary tools
- [ ] Clear invocation triggers
- [ ] Defined output format
- [ ] Error handling included
- [ ] Tested with sample inputs
- [ ] Under 500 lines (or directory format)

### File Size Guidelines

| File | Target Lines |
|------|-------------|
| SKILL.md / AGENT.md | < 500 |
| reference.md | < 800 |
| examples.md | < 600 |
| best-practices.md | < 400 |
