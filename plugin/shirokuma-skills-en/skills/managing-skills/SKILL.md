---
name: managing-skills
description: Create, update, and improve Claude Code skill files following official best practices. Use when user mentions "skill", "SKILL.md", "create skill", "update skill", "improve skill", "generate skill", "skill template", or wants help with skills.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Managing Claude Code Skills

Create, update, and improve Claude Code skills following best practices.

## When to Use

Automatically invoke when the user:
- Asks to "create a skill" or "make a skill"
- Wants to "update a skill" or "improve a skill"
- Requests "skill template" or "SKILL.md help"
- Needs to "review a skill" or "check skill quality"

## What Are Skills?

**Skills** are modular capabilities that extend Claude's functionality. Key characteristics:
- **Model-invoked**: Claude autonomously decides when to use them
- **Progressive disclosure**: Core instructions + on-demand resources
- Required `SKILL.md` file with YAML frontmatter
- Optional supporting files (reference.md, examples.md, etc.)

## Quick Reference

### File Structure

| File | Required | Purpose |
|------|----------|---------|
| `SKILL.md` | ✓ | Core instructions (<500 lines) |
| `scripts/` | | Executable automation (Python/Bash) |
| `references/` | | Documentation loaded on-demand |
| `assets/` | | Output files (templates, images) |
| `templates/` | | Reusable boilerplate |

### Minimal Template

```markdown
---
name: skill-name
description: [What it does]. Use when [triggers].
---

# Skill Title

Brief overview.

## When to Use
- [Trigger scenario 1]
- [Trigger scenario 2]

## Workflow

### Step 1: [Action]
Instructions with checklists if needed.

### Step 2: [Action]
Include validation: run → check → fix → repeat.

## Notes
- Constraints and prerequisites
```

## Storage Locations

| Location | Use Case |
|----------|----------|
| `~/.claude/skills/` | Personal, not shared |
| `.claude/skills/` | Project-level, git tracked |
| `plugin/skills/` | Plugin distribution |

## Workflow: Creating Skills

### Step 1: Gather Requirements

1. **Purpose**: What should this skill do?
2. **Triggers**: What phrases activate it?
3. **Scope**: ONE focused capability?
4. **Complexity**: Needs supporting files?

### Step 2: Naming

**Convention**: Gerund form (verb + -ing)

| Valid | Invalid |
|-------|---------|
| `processing-pdfs` | `PDF-Processor` |
| `analyzing-data` | `helper` |

Rules: lowercase, hyphens, max 64 chars

### Step 3: Description (CRITICAL)

**Template**: `[What it does]. Use when [conditions/triggers].`

**Requirements**:
- Max 1024 characters
- Third person voice
- Include WHAT (capability) and WHEN (triggers)
- Specific terminology

**Good**:
```yaml
description: Extract text and tables from PDF files. Use when working with PDF files or when user mentions PDFs.
```

**Bad**:
```yaml
description: Helps with documents  # Too vague
```

See [reference.md](reference.md#description-field) for rich format with examples.

### Step 4: Write SKILL.md Body

**Target**: Under 500 lines. Challenge every sentence.

**Structure**:
1. Overview (1-2 paragraphs)
2. When to Use (trigger scenarios)
3. Workflow (numbered steps)
4. Notes (constraints)
5. Related Resources (links)

**Key rule**: Keep references one level deep.

### Step 5: Supporting Files

| File | When to Create |
|------|----------------|
| reference.md | API specs, full checklists |
| examples.md | Multiple use cases with I/O |
| best-practices.md | Advanced patterns |
| scripts/ | Utility scripts (chmod +x) |
| templates/ | Reusable boilerplate |

See [architecture.md](architecture.md) for progressive disclosure details.

### Step 6: Tool Configuration

#### allowed-tools (Recommended)

Always specify `allowed-tools` to constrain the skill's available tools. This prevents unintended actions and makes the skill's capabilities explicit.

```yaml
---
name: code-analyzer
description: ...
allowed-tools: Read, Grep, Glob
---
```

| Profile | Tools | Use Case |
|---------|-------|----------|
| Read-only | Read, Grep, Glob | Analysis, exploration |
| GitHub ops | Bash, Read, Grep, Glob | CLI-based workflows |
| Interactive | Read, Grep, Glob, AskUserQuestion | User-facing decisions |
| Full edit | Read, Write, Edit, Bash, Grep, Glob | Implementation skills |

#### Interactive Tools

| Tool | When to Include |
|------|-----------------|
| AskUserQuestion | Skill has decision points, confirmations, or edge cases requiring user input. Use structured options instead of plain text prompts |
| TodoWrite | Skill has 4+ sequential steps where progress tracking helps the user. Not needed for simple linear workflows |

#### Advanced Frontmatter

| Field | Purpose | Example |
|-------|---------|---------|
| `context: fork` | Run as sub-agent (isolated context) | Review skills, research skills |
| `agent` | Sub-agent type (with `context: fork`) | `general-purpose`, `Explore` |
| `model` | Model override | `opus`, `sonnet`, `haiku` |

**`context: fork` Migration Pattern** (Agent → Skill):

Previously, specialized tasks required standalone agents (AGENT.md in `.claude/agents/`). With `context: fork`, these can be skills:

```yaml
# Before: Agent (AGENT.md)
---
name: best-practices-researcher
tools: Read, Grep, Glob, WebSearch, WebFetch, Bash
model: opus
---

# After: Skill with context: fork (SKILL.md)
---
name: researching-best-practices
context: fork
agent: general-purpose
model: opus
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch, Bash
---
```

**Benefits of skills over agents:**
- Unified management (all capabilities are skills)
- Plugin distribution via `claude plugin install`
- Consistent naming convention (gerund form)
- `allowed-tools` for explicit tool constraints
- Invoked via Skill tool (simpler than Task tool with subagent_type)

#### Dynamic Context Injection

Use `` !`command` `` in the skill body to inject command output at invocation time:

```markdown
## Current Issue Data
!`shirokuma-docs issues show $ARGUMENTS`
```

Best for skills that always need the same context data. Avoid when arguments may contain extra text (e.g., delegation keywords).

#### Bash Async Execution

For long-running operations (tests, builds), instruct the skill to use `run_in_background`:

```markdown
Run tests in background to avoid blocking:
Bash tool with `run_in_background: true` for `pnpm test`
```

### Step 7: Create Files

**Option A: Use init script (recommended)**

```bash
./scripts/init_skill.py my-skill --path .claude/skills
```

Creates complete skill structure with templates.

**Option B: Manual creation**

```bash
mkdir -p .claude/skills/skill-name
cat > .claude/skills/skill-name/SKILL.md << 'EOF'
---
name: skill-name
description: [description]
---

# Title
...
EOF
```

### Step 8: Validate

**Run validation script:**

```bash
./scripts/quick_validate.py .claude/skills/skill-name
```

**Manual checklist:**

- [ ] Name: gerund form, lowercase, max 64 chars
- [ ] Description: specific triggers, third person, max 1024 chars
- [ ] SKILL.md: under 500 lines
- [ ] Frontmatter: valid YAML (spaces, not tabs)
- [ ] References: one level deep
- [ ] Paths: forward slashes only

See [reference.md](reference.md#validation-checklist) for complete checklist.

### Step 9: Review

Run `reviewing-claude-config` skill to validate:
- Structure and required sections
- Anti-patterns (temporary markers, broken links)
- File size limits

### Step 10: Test

1. Test activation with trigger phrases
2. Follow workflow step-by-step
3. Test across models (Haiku, Sonnet, Opus)
4. Iterate based on observations

See [best-practices.md](best-practices.md#testing) for testing strategies.

## Workflow: Updating Skills

### Step 1: Review Current State

```bash
cat .claude/skills/skill-name/SKILL.md
ls .claude/skills/skill-name/
```

### Step 2: Identify Issues

Common problems:
- Vague description, missing triggers
- Outdated examples
- SKILL.md over 500 lines
- Poor structure

### Step 3: Apply Changes

Same principles as creating:
- Keep under 500 lines
- Update triggers in description
- Move extensive content to supporting files

### Step 4: Review

Run `reviewing-claude-config` skill to validate changes.

### Step 5: Test

- Test activation with various phrases
- Test across models
- Get team feedback

See [updating-skills.md](updating-skills.md) for detailed workflow.

## Key Principles

### 1. Conciseness
Under 500 lines. Assume Claude has foundational knowledge.

### 2. Degrees of Freedom
Match specificity to task fragility:
- **High**: Text instructions (flexible)
- **Medium**: Pseudocode (guided)
- **Low**: Exact scripts (deterministic)

### 3. One Level Deep
SKILL.md → supporting file (no further chaining)

### 4. Consistent Terminology
One term per concept throughout.

## Common Anti-Patterns

| Anti-Pattern | Fix |
|--------------|-----|
| Too many options | Provide defaults |
| Vague naming | Specific gerund form |
| Windows paths | Forward slashes only |
| Deep references | One level from SKILL.md |
| Skills too broad | Split into focused skills |

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Never activates | Add user phrasing to description |
| Ignores content | Add TOC, improve structure |
| Conflicts with other skills | Use distinct terminology |

## Completion Report

```markdown
## Skill {Created | Updated}

**Name:** {skill-name}
**Description:** {description}
**Location:** {path}
**Size:** ~{X} lines
```

When run standalone, suggest next steps (review, testing methods).

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/init_skill.py` | Create new skill from template |
| `scripts/quick_validate.py` | Validate skill structure |
| `scripts/package_skill.py` | Package skill for distribution |

```bash
# Initialize new skill
./scripts/init_skill.py my-skill --path .claude/skills

# Validate existing skill
./scripts/quick_validate.py .claude/skills/my-skill

# Package for distribution
./scripts/package_skill.py .claude/skills/my-skill ./dist
```

## Related Resources

- [reference.md](reference.md) - Complete specs, frontmatter fields
- [best-practices.md](best-practices.md) - Advanced patterns, testing
- [examples.md](examples.md) - Concrete use cases
- [architecture.md](architecture.md) - Progressive disclosure
- [updating-skills.md](updating-skills.md) - Update workflows
- [reference-workflows.md](reference-workflows.md) - Workflow patterns
- [reference-output-patterns.md](reference-output-patterns.md) - Output templates

## Notes

- Skills are **model-invoked** (automatic)
- Description is CRITICAL for discovery
- Keep SKILL.md under 500 lines
- Always use forward slashes
- Restart Claude Code after changes
- Test across multiple models
