# Agent Reference

Complete technical reference for Claude Code agent specification.

## Table of Contents

- [Frontmatter Schema](#frontmatter-schema)
- [Description Formats](#description-formats)
- [Optional Fields](#optional-fields)
- [System Prompt Structure](#system-prompt-structure)
- [Creating Agents Workflow](#creating-agents-workflow)
- [Quality Checklist](#quality-checklist)
- [Validation Rules](#validation-rules)
- [Error Messages](#error-messages)
- [Directory Format](#directory-format)
- [Documentation Structure](#documentation-structure)

## Related Documents

| Document | Content |
|----------|---------|
| [design-patterns.md](design-patterns.md) | 5 agent patterns (Analyzer, Generator, etc.) |
| [best-practices.md](best-practices.md) | Anti-patterns, testing, performance |
| [documentation-structure.md](documentation-structure.md) | Knowledge base organization, pattern file format |
| [examples.md](examples.md) | Real-world agent examples |

## Frontmatter Schema

### name

**Type**: `string`
**Required**: Yes
**Pattern**: `/^[a-z][a-z0-9-]*$/`

**Valid**:
- `code-reviewer`
- `test-generator`
- `doc-builder-v2`

**Invalid**:
- `CodeReviewer` (uppercase)
- `code_reviewer` (underscores)
- `123-agent` (starts with number)

### description

**Type**: `string`
**Required**: Yes
**Purpose**: Critical for agent discovery and invocation

## Description Formats

### Simple Format

**Length**: 50-300 characters
**Structure**: `[What it does]. Use when [triggers].`

```yaml
description: Reviews code for quality and security. Use when user asks to "review PR", "check code", or "review my changes".
```

### Rich Format with Examples (Recommended)

**Length**: 300-2000 characters
**Structure**: Purpose statement + `<example>` blocks

```yaml
description: Use this agent when the user needs to [task]. This agent [characteristics].

Examples:

<example>
Context: [Situation that triggers this agent]
user: "[Sample user message]"
assistant: "[Expected response before invoking]"
<Task tool call to [agent-name] agent>
</example>

<example>
Context: [Another situation]
user: "[Another sample message]"
assistant: "[Response pattern]"
<Task tool call to [agent-name] agent>
</example>
```

**Example Block Fields**:

| Field | Description | Example |
|-------|-------------|---------|
| `Context:` | Situation description | "User wants to add a new feature" |
| `user:` | Sample user message (quoted) | `"Add pagination to posts"` |
| `assistant:` | Expected response | `"I'll implement this with TDD."` |
| `<Task...>` | Tool invocation placeholder | `<Task tool call to coder agent>` |

**Complete Example** (from nextjs-vibe-coding):

```yaml
description: Use this agent when the user wants to implement new features, create components, or build pages using natural language. This agent transforms vibe descriptions into working code with TDD.

Examples:

<example>
Context: User describes a feature in natural language.
user: "ユーザーがプロフィール画像をアップロードできる機能が欲しい"
assistant: "I'll use the nextjs-vibe-coding agent to implement this with TDD."
<Task tool call to nextjs-vibe-coding agent>
</example>

<example>
Context: User wants a new page or component.
user: "Add a dashboard page that shows post statistics"
assistant: "Let me use the agent to create this dashboard with proper test coverage."
<Task tool call to nextjs-vibe-coding agent>
</example>
```

**When to Use Each Format**:

| Format | Use Case | Example Agent |
|--------|----------|---------------|
| Simple | Single-purpose, obvious triggers | `linter`, `formatter` |
| Rich | Multi-purpose, nuanced triggers | `vibe-coder`, `reviewer` |

**Anti-patterns**:

```yaml
# ❌ Too brief
description: Code reviewer

# ❌ No triggers
description: An agent that reviews code for quality issues

# ❌ Examples without context
description: Reviews code.
<example>
user: "review"
</example>

# ✅ Good simple format
description: Reviews code for quality and security. Use when user asks to "review PR" or "check code".

# ✅ Good rich format
description: Use this agent for TDD implementation.

<example>
Context: User wants new feature.
user: "Add dark mode toggle"
assistant: "I'll implement this with TDD."
<Task tool call to tdd-developer agent>
</example>
```

## Optional Fields

### tools

**Type**: `string` (comma-separated)
**Default**: All tools if omitted

**Available Tools**:
- `Read` - Read files
- `Write` - Create files
- `Edit` - Modify files
- `Bash` - Execute commands
- `Grep` - Search content
- `Glob` - Find files
- `WebFetch` - Fetch URLs
- `WebSearch` - Search web
- `Task` - Launch subagents

**Common Configurations**:

```yaml
# Code reviewer (read-only)
tools: Read, Grep, Glob, Bash

# Test generator (read + write)
tools: Read, Write, Bash

# Documentation builder
tools: Read, Write, Glob, Grep

# All tools (default - omit field)
```

### model

**Type**: `string`
**Default**: `sonnet`

| Value | Use Case |
|-------|----------|
| `sonnet` | Most agents, balanced |
| `opus` | Complex reasoning, critical tasks |
| `haiku` | Simple tasks, fast iteration |
| `inherit` | Match user's model choice |

### permissionMode

**Type**: `string`
**Default**: `default`

| Value | Behavior |
|-------|----------|
| `default` | Standard permission prompts |
| `acceptEdits` | Auto-accept file edits |
| `bypassPermissions` | Skip all prompts (use carefully) |
| `plan` | Planning mode only |
| `ignore` | Ignore permission requests |

### skills

**Type**: `string` (comma-separated)
**Default**: None

```yaml
# Single skill
skills: processing-pdfs

# Multiple skills
skills: processing-pdfs, analyzing-spreadsheets
```

## System Prompt Structure

### Recommended Sections

```markdown
# [Agent Name]

[Brief description]

## Core Responsibilities
- [Task 1]
- [Task 2]

## Workflow
1. **[Step 1]**: [Instruction with tool usage]
2. **[Step 2]**: [Instruction with decision points]

## Quality Criteria
- [Success criterion 1]
- [Success criterion 2]

## Output Format
[Expected output structure]

## Examples
### Example 1: [Scenario]
[Input → Process → Output]
```

### Writing Guidelines

**Do**:
- Use imperative voice ("Check for...", "Verify that...")
- Be specific and actionable
- Include code examples
- Define technical terms

**Don't**:
- Be vague ("try to", "maybe")
- Assume context
- Skip error handling
- Use jargon without definition

## Creating Agents Workflow

### Step 1: Understand Requirements

- What task does the agent perform?
- When should it be invoked?
- What tools does it need?

### Step 2: Choose Format

| Condition | Format |
|-----------|--------|
| Simple, < 300 lines | Single file (`.md`) |
| Complex, > 300 lines | Directory structure |

### Step 3: Write Frontmatter

```yaml
---
name: my-agent
description: Purpose. Use when [triggers].
tools: Read, Grep, Glob
model: sonnet
---
```

### Step 4: Write System Prompt

Include:
- Core responsibilities (3-5 items)
- Step-by-step workflow (3-7 steps)
- Quality criteria
- Output format
- Examples (2-3 scenarios)

### Step 5: Create File

```bash
# Simple agent
cat > .claude/agents/my-agent.md << 'EOF'
[frontmatter + system prompt]
EOF

# Complex agent
mkdir -p .claude/agents/my-agent/{templates,scripts}
cat > .claude/agents/my-agent/AGENT.md << 'EOF'
[frontmatter + core prompt]
EOF
```

### Step 6: Test Invocation

Try phrases from description:
- "Use the my-agent agent"
- Trigger phrases you defined

## Quality Checklist

### Structure
- [ ] Valid YAML frontmatter
- [ ] Required fields present (name, description)
- [ ] Proper Markdown formatting
- [ ] File under 500 lines (or use directory)

### Content
- [ ] Specific responsibilities defined
- [ ] Step-by-step workflow included
- [ ] Quality criteria specified
- [ ] Examples provided
- [ ] Error handling addressed

### Technical
- [ ] Name follows convention (lowercase-with-hyphens)
- [ ] Description includes invocation triggers
- [ ] Tools restricted appropriately
- [ ] Model choice justified

### Security
- [ ] Minimal tool permissions
- [ ] No unnecessary Bash access
- [ ] Write access justified
- [ ] Sensitive operations guarded

## Validation Rules

### Name

```regex
^[a-z][a-z0-9-]*$
```

- Starts with lowercase letter
- Contains only lowercase letters, digits, hyphens
- Length: 3-50 characters

### Tools

- Valid tool names only (case-sensitive)
- No duplicates
- No typos (e.g., "Grep" not "grep")

### Model

- One of: sonnet, opus, haiku, inherit
- Lowercase only

## Error Messages

### Missing Required Field

```
Error: Missing required field: description
File: .claude/agents/my-agent.md

Every agent must have a description that explains:
1. What the agent does
2. When to use it

Example:
description: Reviews code for quality. Use when user asks "review PR".
```

### Invalid Name

```
Error: Invalid agent name: "CodeReviewer"

Agent names must:
- Use lowercase letters only
- Separate words with hyphens

Please rename to: code-reviewer
```

### Invalid Tool

```
Error: Invalid tool: "bash"

Tool names are case-sensitive. Did you mean: "Bash"

Valid tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch, Task
```

## Directory Format

For complex agents requiring extensive documentation.

### Structure

| File | Required | Purpose |
|------|----------|---------|
| `AGENT.md` | ✓ | Core prompt (<500 lines) |
| `reference.md` | | Detailed specs |
| `examples.md` | | Use cases |
| `best-practices.md` | | Advanced patterns |
| `templates/` | | Reusable templates (e.g., report.md) |
| `scripts/` | | Helper scripts (e.g., analyze.py) |

### AGENT.md Requirements

- Under 500 lines
- Contains frontmatter
- High-level workflow
- Links to supporting files (one level deep)

**Example**:

```markdown
---
name: complex-reviewer
description: Comprehensive code review
tools: Read, Grep, Glob, Bash
---

# Comprehensive Reviewer

## Core Responsibilities
- Security detection
- Performance analysis

## Workflow
1. **Scan**: Find files
2. **Analyze**: Check criteria (see [reference.md](reference.md))
3. **Report**: Generate findings

For examples, see [examples.md](examples.md).
```

### Supporting Files

| File | Purpose | Contents |
|------|---------|----------|
| `reference.md` | Detailed specs | Complete checklists, API specs |
| `examples.md` | Use cases | Input/output scenarios |
| `best-practices.md` | Advanced patterns | Expert techniques, anti-patterns |
| `templates/` | Reusable templates | Report formats |
| `scripts/` | Helper scripts | Analysis tools |

### Validation Checklist

- [ ] AGENT.md under 500 lines
- [ ] Frontmatter valid (YAML with spaces, not tabs)
- [ ] References one level deep only
- [ ] All links work
- [ ] Table of contents in long files
- [ ] Forward slashes only (no Windows paths)
- [ ] Scripts have execute permissions

### Quick Setup

```bash
# Create directory structure
mkdir -p .claude/agents/my-agent/{templates,scripts}

# Create AGENT.md
cat > .claude/agents/my-agent/AGENT.md << 'EOF'
---
name: my-agent
description: Purpose and triggers
tools: Read, Write, Bash
---

# My Agent

[Core prompt under 500 lines]

See [reference.md](reference.md) for details.
EOF

# Create supporting files
touch .claude/agents/my-agent/{reference,examples,best-practices}.md

# Set script permissions
chmod +x .claude/agents/my-agent/scripts/*.py
```

## Documentation Structure

For complex agents with multiple reference files, use the **Documentation Structure Pattern**.

### When to Use

- Agent needs > 3 reference files
- Multiple pattern files for different topics
- Templates for code generation
- Checklists for quality gates

### Core Principles

1. **Single Source of Truth**: Information in ONE location only
2. **Clear Responsibilities**: Each file has one purpose
3. **Reference Links**: Other files only link, never duplicate

→ Full pattern: [documentation-structure.md](documentation-structure.md)
