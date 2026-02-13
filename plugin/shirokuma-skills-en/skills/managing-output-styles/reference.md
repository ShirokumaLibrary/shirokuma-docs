# Output Styles Reference

Complete technical specifications for Claude Code output styles.

## Table of Contents

- [Frontmatter Specification](#frontmatter-specification)
- [Settings File Format](#settings-file-format)
- [File Locations](#file-locations)
- [Built-in Styles](#built-in-styles)
- [Custom Style Requirements](#custom-style-requirements)
- [Priority and Override Rules](#priority-and-override-rules)

## Frontmatter Specification

Custom output style files must include YAML frontmatter with these fields:

### Required Fields

```yaml
---
name: style-name          # Required: Unique identifier (kebab-case)
description: Brief text   # Required: What this style does (1-2 sentences)
---
```

### Field Details

#### name

- Type: `string`
- Pattern: `^[a-z0-9-]+$` (lowercase, numbers, hyphens only)
- Max length: 64 characters
- Must be unique within scope (user-level or project-level)
- Used in `/output-style [name]` command
- Cannot use reserved names: `default`, `explanatory`, `learning`

Examples:
- `security-focused` ✅
- `refactoring-mode` ✅
- `SecurityFocused` ❌ (uppercase)
- `security_focused` ❌ (underscore)

#### description

- Type: `string`
- Max length: 1024 characters
- Should describe the style's behavior clearly
- Displayed in interactive menu and help text

## Settings File Format

Output style configuration is stored in `.claude/settings.local.json`:

```json
{
  "outputStyle": "style-name"
}
```

### File Details

- Location: `.claude/settings.local.json` (project root)
- Format: JSON
- Created automatically when using `/output-style` command
- Should be added to `.gitignore` (local settings, not shared)

### Example

```json
{
  "outputStyle": "explanatory",
  "otherSettings": {
    "...": "..."
  }
}
```

If `outputStyle` field is missing or file doesn't exist, "default" style is active.

## File Locations

### User-Level Styles

Location: `~/.claude/output-styles/*.md` (e.g., my-style.md, security-focused.md)

- Available across all projects
- Portable across machines when syncing home directory
- Lower priority than project-level styles

### Project-Level Styles

Location: `.claude/output-styles/*.md` (e.g., team-style.md, api-development.md)

- Available only within this project
- Shared with team via git repository
- Higher priority than user-level styles (overrides if same name)

## Built-in Styles

Claude Code includes three built-in output styles:

### default

Standard software engineering mode optimized for efficient task completion.

**Characteristics:**
- Concise communication
- Production-focused
- Minimal explanatory text
- Emphasizes code quality and best practices

**Use when:**
- Building features for production
- Working under time constraints
- You understand the codebase well

### explanatory

Adds educational "Insights" sections between coding activities.

**Characteristics:**
- Explains architectural decisions
- Highlights patterns in codebase
- Educational commentary
- Helps build understanding

**Use when:**
- Learning a new codebase
- Understanding design patterns
- Onboarding to project
- Studying best practices

### learning

Collaborative, hands-on approach with `TODO(human)` markers.

**Characteristics:**
- Claude implements partial solutions
- Adds `TODO(human)` for you to complete
- Explains what to implement and why
- Interactive skill-building

**Use when:**
- Learning a new language or framework
- Practicing specific techniques
- Building hands-on skills
- Pair programming for education

## Custom Style Requirements

### Minimum Valid Style

```markdown
---
name: minimal-style
description: A minimal custom output style
---

# Minimal Style

Add your custom instructions here.
```

### Recommended Structure

```markdown
---
name: style-name
description: Clear description of behavior changes
---

# Style Title

Brief overview of this style's purpose.

## Core Principles

- Principle 1
- Principle 2
- Principle 3

## Modified Behaviors

### When Writing Code

[Instructions for code generation...]

### When Explaining

[Instructions for explanations...]

### When Testing

[Instructions for testing approach...]

## Additional Guidelines

[Any other customizations...]
```

### Content Guidelines

- Use markdown formatting for readability
- Be specific about behavior changes
- Include examples when helpful
- Keep focused (under 1000 lines recommended)
- Avoid contradicting core Claude Code capabilities

### What Custom Styles Can Modify

✅ **Can customize:**
- Tone and communication style
- Level of explanation detail
- Code commenting approach
- Testing philosophy
- Documentation emphasis
- Error handling style
- Focus areas (security, performance, etc.)

❌ **Cannot override:**
- Tool availability (Read, Write, Bash, etc.)
- Core safety guidelines
- File operation behaviors
- Git workflows
- Command execution

## Priority and Override Rules

### Style Selection Priority

1. **Explicit command**: `/output-style [name]` - highest priority
2. **Settings file**: `.claude/settings.local.json` - medium priority
3. **Default**: Built-in "default" style - fallback

### File Location Priority

When multiple styles have the same name:

1. **Project-level**: `.claude/output-styles/style.md` - highest priority
2. **User-level**: `~/.claude/output-styles/style.md` - lower priority
3. **Built-in**: `default`, `explanatory`, `learning` - cannot override

Example:
```
# Both exist:
~/.claude/output-styles/team-style.md
.claude/output-styles/team-style.md

# /output-style team-style will use:
.claude/output-styles/team-style.md  ← Project-level wins
```

### Activation Behavior

- Using `/output-style [name]` immediately activates the style
- Changes persist in `.claude/settings.local.json`
- Editing a custom style file requires re-activation or restart
- Deleting active style file falls back to "default"

## Command Reference

### /output-style

Open interactive menu to select from available styles.

### /output-style [name]

Directly switch to specified style.

Examples:
```bash
/output-style default
/output-style explanatory
/output-style my-custom-style
```

### /output-style:new [description]

Create a new custom style interactively.

Example:
```bash
/output-style:new Focus on API development with OpenAPI specs
```

This command:
1. Generates style file at `~/.claude/output-styles/`
2. Uses AI to create appropriate content based on description
3. Automatically activates the new style

## Common YAML Errors

### Error: Invalid frontmatter

**Cause**: Syntax errors in YAML

❌ **Incorrect**:
```yaml
---
name: my style          # Spaces not allowed in name
description: "Missing closing quote
---
```

✅ **Correct**:
```yaml
---
name: my-style          # Hyphens instead of spaces
description: Proper description here
---
```

### Error: Tabs instead of spaces

**Cause**: YAML requires spaces for indentation

❌ **Incorrect**:
```yaml
---
name:	my-style        # Tab character
---
```

✅ **Correct**:
```yaml
---
name: my-style          # Spaces only
---
```

### Error: Missing required field

**Cause**: `name` or `description` field missing

❌ **Incorrect**:
```yaml
---
name: my-style
# description missing
---
```

✅ **Correct**:
```yaml
---
name: my-style
description: Complete frontmatter
---
```

## Advanced Techniques

### Conditional Instructions

Use markdown to organize complex instructions:

```markdown
---
name: context-aware
description: Adapts based on file type
---

# Context-Aware Style

## When Working with TypeScript

- Emphasize type safety
- Suggest interface definitions
- Use strict mode

## When Working with Python

- Follow PEP 8
- Use type hints
- Prefer dataclasses

## When Working with Bash

- Add error handling (set -euo pipefail)
- Include usage comments
- Validate inputs
```

### Combining with CLAUDE.md

Output styles and CLAUDE.md work together:

```
1. System prompt (modified by output style)
2. User message from CLAUDE.md
3. User's actual question
```

Use output styles for **how** Claude behaves, use CLAUDE.md for **what** Claude knows.

### Version Control Best Practices

For project-level styles:

```gitignore
# .gitignore
.claude/settings.local.json    # Don't commit (personal preference)
```

```bash
# Commit project styles
git add .claude/output-styles/
git commit -m "Add team output styles"
```

For user-level styles, consider a dotfiles repository:

```bash
# ~/dotfiles/claude/output-styles/
ln -s ~/dotfiles/claude/output-styles ~/.claude/output-styles
```
