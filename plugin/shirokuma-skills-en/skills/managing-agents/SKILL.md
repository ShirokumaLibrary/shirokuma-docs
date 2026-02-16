---
name: managing-agents
description: Create, update, and improve Claude Code agent files following Anthropic's official best practices. Use when user mentions "agent", "AGENT.md", "create agent", "update agent", "improve agent", "generate agent", "agent template", "workflow pattern", or wants help with agents.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Managing Claude Code Agents

Create, update, and improve Claude Code agent files following Anthropic's official best practices.

> **Core Principle**: Start simple. "Success isn't about building the most sophisticated system—it's about building the right system for your needs." — [Anthropic](https://www.anthropic.com/engineering/building-effective-agents)

## When to Use

Automatically invoke when the user:
- Asks to "create an agent" or "make a new agent"
- Wants to "update an agent" or "improve an agent"
- Requests "agent template" or "agent example"
- Wants to "review an agent" or "check agent quality"

## Migration: Agents → Skills with `context: fork`

Claude Code skills now support `context: fork`, which runs the skill as an isolated sub-agent. This eliminates most use cases for standalone agents. Consider using skills with `context: fork` instead of agents for:
- Research tasks (see `best-practices-researching` skill)
- Review tasks (see `reviewing-on-issue` skill)
- Config validation (see `claude-config-reviewing` skill)

**When agents are still appropriate:**
- Truly open-ended, multi-step tasks requiring full autonomy
- Tasks that need the Task tool to spawn further sub-agents

## Agentic Systems: Workflows vs Agents

Understanding this distinction is **critical** for designing effective systems.

| Type | Control | Use When |
|------|---------|----------|
| **Workflows** | Predefined code paths orchestrate LLM calls | Subtasks are predictable, need consistency |
| **Agents** | LLM dynamically decides process & tool usage | Open-ended problems, unpredictable steps |

### Decision Guide

**Can you predict all steps?**

| Answer | Use | Characteristics |
|--------|-----|-----------------|
| YES | WORKFLOW | Deterministic, reliable (Prompt Chaining, Routing, Parallelization) |
| NO | AGENT | Flexible, autonomous (Higher latency/cost, handles unknowns) |

**Start with workflows** — they provide more control. Add agent autonomy only when results justify the added complexity.

See [design-patterns.md](design-patterns.md) for 5 workflow patterns + agent roles.

## Quick Reference

### Agent File Locations

**Simple agent**: `.claude/agents/agent-name.md` (single file)

**Complex agent**: `.claude/agents/agent-name/` (directory)

| File | Required | Purpose |
|------|----------|---------|
| `AGENT.md` | ✓ | Core prompt (<500 lines) |
| `reference.md` | | Detailed specs |
| `examples.md` | | Use cases |
| `templates/` | | Reusable templates |

### Minimal Agent Template

```markdown
---
name: agent-identifier
description: What it does. Use when [triggers].
tools: Read, Grep, Glob
model: sonnet
---

# Agent Name

Brief description.

## Core Responsibilities
- Task 1
- Task 2

## Workflow
1. **Step 1**: Action
2. **Step 2**: Action

## Output Format
[Expected output structure]
```

## Required Fields

### name
- Lowercase with hyphens: `code-reviewer`, `test-generator`
- Pattern: `/^[a-z][a-z0-9-]*$/`

### description (Critical for Discovery)

**Simple Format**:
```yaml
description: Reviews code for quality. Use when user asks "review PR" or "check code".
```

**Rich Format with Examples** (Recommended):
```yaml
description: Use this agent when [task]. Examples:

<example>
Context: [Situation]
user: "[Message]"
assistant: "[Response before invoking]"
<Task tool call to agent-name agent>
</example>
```

See [reference.md](reference.md#description-formats) for complete examples.

## Optional Fields

| Field | Values | Default |
|-------|--------|---------|
| `tools` | Read, Write, Edit, Bash, Grep, Glob, WebFetch, Task | All tools |
| `model` | sonnet, opus, haiku, inherit | sonnet |
| `permissionMode` | default, acceptEdits, bypassPermissions | default |
| `skills` | Comma-separated skill names | None |

See [reference.md](reference.md#optional-fields) for details.

## Agent Design Principles

### 1. Simplicity First
Start with the simplest solution. Add complexity only when results justify it.

### 2. Single Responsibility
One clear, focused purpose per agent. Heavy agents (25k+ tokens) create bottlenecks; lightweight agents (<3k tokens) enable fluid orchestration.

### 3. Creator-Checker Pattern (Evaluator-Optimizer)

| Type | Role | Rule Style |
|------|------|------------|
| **Creator** | Implementation | "Do" rules only |
| **Checker** | Review/Audit | "Do" + "Don't" rules |

**Example**: `nextjs-vibe-coding (Creator) ←→ reviewing-on-issue (Checker)`

### 4. Minimal Tool Access (ACI)

**Agent-Computer Interface** — Design tools as carefully as prompts:

| Agent Type | Recommended Tools |
|------------|-------------------|
| Reviewer (read-only) | Read, Grep, Glob, Bash |
| Generator | Read, Write, Bash |
| Transformer | Read, Edit, Bash |

See [best-practices.md](best-practices.md#aci-agent-computer-interface) for tool design guidelines.

### 5. Clear Invocation Triggers
Include phrases like:
- "Use PROACTIVELY when..."
- "Automatically invoke when..."

See [design-patterns.md](design-patterns.md) for workflow patterns + agent roles.

## Common Agent Types

### Creator Agents
| Agent | Purpose | Tools |
|-------|---------|-------|
| Coder/Builder | Feature implementation | Read, Write, Edit, Bash |
| Test Generator | Test suite creation | Read, Write, Bash |
| Doc Builder | Documentation | Read, Write, Glob |

### Checker Agents
| Agent | Purpose | Tools |
|-------|---------|-------|
| Code Reviewer | Quality & security | Read, Grep, Glob, Bash |
| Security Auditor | Vulnerability detection | Read, Grep, Glob, Bash |
| Debugger | Root cause analysis | Read, Bash, Grep, Glob |

See [examples.md](examples.md) for complete templates.

## Workflow: Creating an Agent

1. **Understand Requirements**: Task, triggers, tools needed
2. **Choose Format**: Single file (<300 lines) or directory
3. **Write Frontmatter**: name, description, tools, model
4. **Write System Prompt**: Responsibilities, workflow, output format
5. **Create File**: `.claude/agents/[name].md`
6. **Test**: Try invocation phrases
7. **Review**: Run `claude-config-reviewer` agent to validate

**Quick Start**:
```bash
# Simple agent
cat > .claude/agents/my-agent.md << 'EOF'
---
name: my-agent
description: Does X. Use when user asks for Y.
tools: Read, Grep, Glob
---

# My Agent

[System prompt...]
EOF
```

See [reference.md](reference.md#creating-agents-workflow) for detailed workflow.

## Workflow: Updating an Agent

1. **Read Current Agent**: Load existing file
2. **Identify Issues**: Vague instructions, missing workflow
3. **Apply Changes**: Use Edit tool
4. **Verify**: Check against quality checklist
5. **Review**: Run `claude-config-reviewer` agent to validate

See [reference.md](reference.md#quality-checklist) for evaluation criteria.

## Progressive Disclosure (Complex Agents)

For agents exceeding 300 lines, use directory structure:

| File | Purpose |
|------|---------|
| `AGENT.md` | Core prompt (<500 lines) |
| `reference.md` | Detailed specs |
| `examples.md` | Use cases |
| `best-practices.md` | Advanced patterns |
| `templates/` | Reusable templates |

**Key Rules**:
- AGENT.md under 500 lines
- References one level deep only
- Include table of contents in long files

See [reference.md](reference.md#directory-format) for complete specification.

## Built-in Agents

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
| General-purpose | sonnet | All | Complex multi-step tasks |
| Plan | haiku | Read-only | Codebase research |
| Explore | haiku | Read-only | Lightweight discovery |

## Resumable Agents

```typescript
// Resume previous session
Task({
  resume: "previous-agent-id",
  prompt: "Continue from where we left off"
})
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Too broad scope | Focus on single responsibility |
| Vague instructions | Add step-by-step workflow |
| Excessive tools | Limit to necessary tools only |
| Poor description | Include invocation triggers |

## Related Files

- [reference.md](reference.md) - Frontmatter schema, validation rules, directory format
- [examples.md](examples.md) - Complete agent templates (9 types)
- [design-patterns.md](design-patterns.md) - 5 agent design patterns
- [best-practices.md](best-practices.md) - Advanced patterns, anti-patterns

## Storage Locations

| Priority | Location | Use Case |
|----------|----------|----------|
| Highest | `.claude/agents/` | Project-level, git tracked |
| Medium | `--agents` CLI flag | Dynamic, session-only |
| Lowest | `~/.claude/agents/` | Personal, not shared |

## Completion Report

```markdown
## Agent {Created | Updated}

**Name:** {agent-name}
**Location:** `.claude/agents/{name}.md`
**Model:** {model}
**Tools:** {tools}
```

When run standalone, suggest next steps (testing methods, invocation phrase examples).

## Notes

- AGENT.md must be under 500 lines; references one level deep only
- When requirements are unclear, use AskUserQuestion to confirm purpose, triggers, and tools
- For compound tasks (create + update multiple agents), use TodoWrite to track progress
