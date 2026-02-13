---
paths:
  - ".claude/skills/**/*.md"
  - ".claude/agents/**/*.md"
  - ".claude/output-styles/**/*.md"
  - ".claude/commands/**/*.md"
---

# Claude Config Authoring Rules

## Naming Convention

**Format**: `gerund-form` (verb + -ing), lowercase, hyphens, max 64 chars

```yaml
# Good
name: processing-pdfs
name: managing-agents

# Bad
name: PDF-Processor    # Not gerund, uppercase
name: helper           # Too vague
```

## Description (CRITICAL)

**Template**: `[What it does]. Use when [triggers].`

**Requirements**:
- Max 1024 characters
- Third person voice
- Include WHAT (capability) and WHEN (triggers)
- NO angle brackets (`<example>` forbidden)

```yaml
# Good
description: Extract text from PDF files. Use when working with PDFs or user mentions "PDF", "PDF処理".

# Bad
description: Helps with documents  # Too vague, no triggers
```

## File Size Limits

- `SKILL.md` / `AGENT.md`: Under 500 lines
- Challenge every sentence for necessity
- Move detailed content to reference files

## Language Guidelines

| File Type | Language |
|-----------|----------|
| SKILL.md / AGENT.md | English |
| rules/*.md | English |
| output-styles/*.md | English |
| CLAUDE.md | English |
| description (SKILL.md frontmatter) | English keywords only (see below) |

- **Avoid**: Heavy table formatting (token-inefficient)
- **EN plugin description**: English keywords only (no Japanese triggers)
- **JA plugin description**: Japanese + English technical terms that Japanese users actually type (e.g., "コミット" + "commit")
- **No fake slash commands**: Only reference `/skill-name` if the command actually exists. Use plain quoted keywords instead (e.g., "commit" not "/commit")

## File Structure

```
skill-name/
├── SKILL.md        # Required, <500 lines
├── reference.md    # Optional, detailed specs
├── examples.md     # Optional, I/O examples
└── scripts/        # Optional, automation
```

## Context Efficiency Principles

More constraints = lower LLM compliance. Adjust density by role.

### Role-Based Density

| Role | Constraint Density | Reason |
|------|-------------------|--------|
| **Reviewer** (`context: fork`) | High is OK | Observation tasks have high compliance |
| **Coder** | Minimal | Code generation + constraint compliance compound |

### Writing Principles

- **Name it, don't explain it**: Reference known concepts by name (e.g., "Follow Conventional Commits" is enough)
- **Detail only project-specific**: Only elaborate on project-specific rules
- **Consolidate, don't scatter**: Define rules in one place, reference elsewhere
- **Compress, don't expand**: Convert verbose tables to bullet points or inline

### Safe to Omit (LLM Already Knows)

- Known concept explanations (Git Flow, TDD, Conventional Commits, etc.)
- General best practices
- Language/framework basic syntax

## SKILL.md Required Content

These must **never be removed** during compression.

### 1. Workflow (Required)

Step-by-step workflow must not be omitted. LLM can guess flows, but project-specific ordering, branching, and gates must be explicit.

### 2. Tool Usage Timing (Required)

Specify when to use which tools within the skill:
- **TodoWrite**: 3+ step tasks, multi-issue work
- **AskUserQuestion**: Decision points, multiple approaches
- **Task**: Parallel investigation, fork execution
- **EnterPlanMode**: Not needed in skill workflows (plans are written to Issue body, approval is managed via Spec Review. `plansDirectory` is configured as a safety net)

Without tool instructions, LLM may skip using them.

### 3. NG Cases / Checklists (Required)

Skill-specific "must not do" items:
- Not general NG — **project-specific NG** cases
- Example: committing-on-issue → no `--no-verify`, no `Co-Authored-By`
- Example: creating-pr-on-issue → no direct push to base branch

Include completion criteria and quality gates as checklists.

### 4. Output Template Embedding (Recommended)

When a skill is invoked via Task or fork, the output format should be owned by the skill itself. Avoid designs where the caller embeds output templates in the prompt.

```
# NG: Caller defines output format
Task(prompt: "Review this. Output in this format: ## Result\n| Item | Verdict |...")

# OK: Skill owns the output format
Skill("reviewing-on-issue")  # Output format defined inside the skill
```

**Principles**:
- Skills should hold their output templates in SKILL.md or reference files
- Callers pass only input data (issue number, target files, etc.)
- Output format changes require editing only one place (the skill)

**Good examples**: reviewing-on-issue (Self-Review Result template embedded), claude-config-reviewing (quality checklist embedded)

## Anti-Patterns

- Deep reference chains (keep ONE level from SKILL.md)
- Windows backslashes (use forward slashes only)
- Too many options without defaults
- Vague naming without specific triggers
- Long explanations of LLM-known concepts
- Motivational/philosophy sections ("why" over "what")
- **Omitting workflows** (flows must not be left to LLM inference)
- **Omitting tool usage instructions** (TodoWrite, AskUserQuestion, etc.)
- **Omitting NG cases** (without prohibitions, LLM defaults to its own behavior)

## Validation Checklist

Before committing:
- [ ] Name: gerund form, lowercase
- [ ] Description: triggers, third person, no `<>`
- [ ] SKILL.md: under 500 lines
- [ ] Frontmatter: valid YAML (spaces, not tabs)
- [ ] Paths: forward slashes only
- [ ] **Workflow**: Step-by-step flow documented
- [ ] **Tool usage**: TodoWrite / AskUserQuestion / Task usage points specified
- [ ] **NG cases**: Skill-specific prohibitions and checklists present
- [ ] Coder skills: Known concept explanations removed, reference only
- [ ] Reviewer skills: Checklist coverage is sufficient
