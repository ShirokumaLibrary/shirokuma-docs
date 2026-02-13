# Advanced Agent Patterns

Advanced patterns for testing, optimization, and security. For core principles and design, see [best-practices.md](best-practices.md).

## Table of Contents

- [Common Anti-Patterns](#common-anti-patterns)
- [Testing Agents](#testing-agents)
- [Performance Optimization](#performance-optimization)
- [Security Considerations](#security-considerations)

---

## Common Anti-Patterns

### 1. The Kitchen Sink Agent

**Problem**: Agent does too many things

```yaml
# ❌ Bad
name: super-agent
description: Reviews code, writes tests, generates docs, debugs issues, and deploys.
tools: All
```

**Fix**: Split into focused agents

```yaml
# ✅ Good
name: code-reviewer
description: Reviews code quality. Use for code reviews only.
tools: Read, Grep, Glob

name: test-generator
description: Generates test suites. Use for test creation only.
tools: Read, Write, Bash
```

### 2. The Vague Workflow

**Problem**: Instructions too generic

```markdown
## Workflow
1. Analyze the code
2. Find issues
3. Report findings
```

**Fix**: Specific, actionable steps

```markdown
## Workflow
1. **Locate Files**: Use Glob("src/**/*.ts") to find source files
2. **Check Each File**:
   - Load with Read tool
   - Search for `console.log` patterns
   - Flag files with production console statements
3. **Generate Report**: List each finding as `file:line: description`
```

### 3. The Over-Privileged Agent

**Problem**: More tools than needed

```yaml
# ❌ A reviewer that can modify code
name: code-reviewer
tools: Read, Write, Edit, Bash, WebFetch
```

**Fix**: Minimum necessary tools

```yaml
# ✅ Read-only reviewer
name: code-reviewer
tools: Read, Grep, Glob, Bash
```

### 4. The Invisible Agent

**Problem**: Poor description, never invoked

```yaml
# ❌ No triggers
description: Handles TypeScript stuff
```

**Fix**: Clear triggers and purpose

```yaml
# ✅ Clear invocation
description: Migrates JavaScript files to TypeScript. Use when user asks to "convert to TypeScript" or "add types to JS files".
```

### 5. The Missing Output Format

**Problem**: Inconsistent, unpredictable output

```markdown
## Workflow
...
4. Report the findings
```

**Fix**: Explicit output structure

```markdown
## Output Format

\```
# Review Report: [Component]

## Summary
- Files analyzed: X
- Issues found: Y

## Critical Issues
1. [file:line] - [issue description]

## Recommendations
- [actionable suggestion]
\```
```

### 6. Framework Over-Reliance

**Problem**: Using frameworks without understanding underlying code

> "If you do use a framework, ensure you understand the underlying code. Incorrect assumptions about what's under the hood are a common source of customer error." — Anthropic

```markdown
# ❌ Black-box framework usage
agent = SomeFramework.create_agent(config)
# No understanding of what happens inside
```

**Fix**: Start with LLM APIs directly

```markdown
# ✅ Direct implementation
# Many patterns require just a few lines of code
response = await llm.call(prompt)
# Clear, debuggable, understandable
```

---

## Testing Agents

### Manual Testing Checklist

1. **Trigger Testing**
   - [ ] Direct invocation: "Use the [agent] agent"
   - [ ] Keyword triggers from description
   - [ ] Edge case phrases

2. **Workflow Testing**
   - [ ] Each step executes correctly
   - [ ] Tools used appropriately
   - [ ] Error handling works

3. **Output Testing**
   - [ ] Format matches specification
   - [ ] Content is accurate
   - [ ] Actionable recommendations

### Test Scenarios

Create test cases for each agent:

```markdown
## Test Cases for code-reviewer

### Case 1: Clean Code
Input: Well-written TypeScript file
Expected: No issues, positive feedback

### Case 2: Security Vulnerability
Input: File with SQL injection
Expected: Critical issue flagged with CWE reference

### Case 3: Style Issues
Input: Inconsistent formatting
Expected: Medium priority suggestions
```

### Iteration Process

1. Create agent
2. Test with sample inputs
3. Identify gaps in workflow/output
4. Update system prompt
5. Repeat until consistent

---

## Performance Optimization

### Research-Plan-Execute Workflow

From [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices):

> "Asking Claude to research and plan first significantly improves performance for problems requiring deeper thinking upfront."

```markdown
## Workflow
1. **Research**: Explore codebase, understand context
2. **Plan**: Design approach before coding
3. **Execute**: Implement with plan as guide
```

### Lightweight vs Heavy Agents

| Agent Type | Token Usage | Impact |
|------------|-------------|--------|
| **Lightweight** (<3k tokens) | Low | Fluid orchestration, fast chainability |
| **Heavy** (25k+ tokens) | High | Bottlenecks in multi-agent workflows |

**Recommendation**: Start with lightweight agents (minimal tools). Add complexity only when needed.

### Subagent Strategy

> "Strong use of subagents is recommended, especially for complex problems." — Anthropic

- Use subagents to verify details early in conversation
- Preserves context availability
- Minimal efficiency downside

### Reduce Token Usage

**Use directory format** for complex agents:
- Core prompt in AGENT.md (< 500 lines)
- Details loaded only when needed

**Link instead of inline**:
```markdown
# ❌ Inline everything
## Security Checks
[2000 lines of OWASP details]

# ✅ Link to reference
## Security Checks
Apply OWASP Top 10 checks. See [reference.md](reference.md#owasp) for complete list.
```

### Model Selection

| Task | Model | Reason |
|------|-------|--------|
| Simple file operations | haiku | Fast, cheap |
| Standard analysis | sonnet | Balanced |
| Complex reasoning | opus | Higher quality |

### Parallel Execution

For orchestrator agents:
```markdown
## Workflow
1. **Parallel Analysis**: Launch these agents simultaneously:
   - security-auditor
   - performance-analyzer
   - code-reviewer
2. **Aggregate**: Combine results after all complete
```

### Multi-Context Window Workflows

For projects that can't be completed in a single context window:

1. **Initializer Agent**: Sets up environment on first run
2. **Coding Agent**: Makes incremental progress
3. **Artifacts**: Leave clear artifacts for next session (TODOs, state files)

---

## Security Considerations

### Tool Access Principles

1. **Read-only by default**: Start with Read, Grep, Glob
2. **Add Write only when needed**: Generation tasks
3. **Bash access carefully**: Only for running tests/linters
4. **Never bypassPermissions**: Unless absolutely necessary

### Permission Modes

| Mode | Use Case | Risk Level |
|------|----------|------------|
| `default` | Most agents | Low |
| `acceptEdits` | Trusted transformers | Medium |
| `bypassPermissions` | Automated pipelines only | High |

### Sensitive Operations

Guard in system prompt:
```markdown
## Safety Rules

1. **Never modify**:
   - .env files
   - Credential files
   - Production configs

2. **Always confirm** before:
   - Deleting files
   - Running destructive commands
   - Modifying authentication code

3. **Log all changes**:
   - Report every file modified
   - Include before/after for edits
```

### Input Validation

For agents accepting user input:
```markdown
## Input Validation

Before processing user-provided paths:
1. Verify path is within project directory
2. Reject paths containing `..`
3. Reject absolute paths outside workspace
```
