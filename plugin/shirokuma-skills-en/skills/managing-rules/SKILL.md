---
name: managing-rules
description: Create, update, and organize Claude Code rules (.claude/rules/) following official best practices. Use when "create rule", "add rule", or configuring path-specific conventions.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Managing Claude Code Rules

Create and maintain rules that provide automatic, path-specific context to Claude.

## When to Use

Automatically invoke when the user:
- Wants to "create a rule" or "add a rule"
- Says "ルール作成" or "ルール追加"
- Needs path-specific conventions (e.g., "rules for lib/ files")
- Wants to migrate from CLAUDE.md or skills to rules
- Mentions `.claude/rules/`

## Recommended Architecture

**Skills = Generic/Reusable, Rules = Project-Specific**

```
.claude/
├── skills/                        # GENERIC (shareable across projects)
│   ├── coding-nextjs/
│   │   ├── patterns/              # Reusable patterns
│   │   └── templates/             # Code templates
│   ├── reviewing-on-issue/
│   │   ├── criteria/              # Quality criteria
│   │   └── roles/                 # Review role definitions
│   └── managing-rules/            # This skill
│
└── rules/                         # PROJECT-SPECIFIC (auto-loaded)
    ├── tech-stack.md              # Versions for THIS project
    ├── lib-structure.md           # Structure rules for THIS project
    ├── server-actions.md          # Conventions for THIS project
    └── testing.md                 # Test patterns for THIS project
```

### Managed Rules (shirokuma/)

Files in `.claude/rules/shirokuma/` are auto-deployed by `shirokuma-docs init` (or `update-skills --with-rules`).
Do NOT edit them manually - they are overwritten on update.

To customize behavior, create your own rules in `.claude/rules/` (outside `shirokuma/`).
Project-specific rules always take precedence since they are loaded alongside managed rules.

### Why This Structure?

| Content Type | Location | Reason |
|--------------|----------|--------|
| **Workflow procedures** | Skills | Step-by-step, on-demand |
| **Generic patterns** | Skills `patterns/`, `criteria/` | Reusable, publishable |
| **Project conventions** | Rules | Auto-loaded, path-specific |
| **Tech versions** | Rules | Project-specific, always needed |
| **Known issues** | Rules | Project-specific CVEs |

### Migration from Skills project/ to Rules

**Before** (Skills `project/` directory):
```
.claude/skills/coding-nextjs/
├── patterns/         # ✓ Keep (generic patterns)
├── templates/        # ✓ Keep (code templates)
└── project/          # → Move to rules
    ├── reference/tech-stack.md
    ├── patterns/lib-structure.md
    └── issues/known-issues.md
```

**After** (Rules):
```
.claude/
├── skills/coding-nextjs/
│   ├── patterns/     # Generic patterns
│   └── templates/    # Code templates
│
└── rules/            # Project-specific
    ├── tech-stack.md
    ├── lib-structure.md
    └── known-issues.md
```

## Rules vs Skills vs CLAUDE.md

| Feature | Rules | Skills | CLAUDE.md |
|---------|-------|--------|-----------|
| **Loading** | Automatic (path-based) | On-demand | Every session |
| **Scope** | File patterns | Workflow/task | Global |
| **Best for** | Project conventions | Generic procedures | Critical always-on |
| **Path filtering** | ✓ `paths:` frontmatter | ✗ | ✗ |
| **Shareable** | Via symlinks | Via publish | Via copy |

**Use Rules when**: Project-specific conventions that should auto-apply.
**Use Skills when**: Generic workflows reusable across projects.
**Use CLAUDE.md when**: Critical rules that must always apply.

## Rule Structure

### Basic Rule (No Path Filter)

```markdown
# Code Style

- Use ES modules (import/export), not CommonJS
- Prefer const over let
- Use TypeScript strict mode
```

Loaded every session, applies to all files.

### Path-Specific Rule

```markdown
---
paths:
  - "lib/actions/**/*.ts"
  - "app/**/actions.ts"
---

# Server Actions Conventions

- Always verify authentication first
- Use CSRF protection
- Validate with Zod schemas
- Use revalidatePath after mutations
```

Only loaded when working with matching files.

## Directory Structure

```
.claude/rules/
├── code-style.md          # Always loaded
├── testing.md             # Always loaded
├── server-actions.md      # paths: lib/actions/**
├── components.md          # paths: components/**
└── frontend/              # Subdirectories supported
    ├── react.md
    └── tailwind.md
```

### User-Level Rules

```
~/.claude/rules/
├── preferences.md         # Personal coding preferences
└── workflows.md           # Personal workflows
```

User rules apply to all projects, loaded before project rules.

## Workflow

### Step 1: Determine Rule Type

| Question | If Yes → |
|----------|----------|
| Applies to specific file types? | Use `paths:` frontmatter |
| Applies to all files? | No frontmatter needed |
| Personal preference? | Put in `~/.claude/rules/` |
| Team convention? | Put in `.claude/rules/` |

### Step 2: Choose Location

```
.claude/rules/
├── {topic}.md              # Single-topic rules
├── {category}/             # Related rules grouped
│   └── {subtopic}.md
└── shirokuma/              # RESERVED - plugin-managed (do NOT place custom rules here)
```

**Important**: If `.claude/rules/shirokuma/` exists, it is managed by the shirokuma-skills plugin (deployed via `shirokuma-docs init`). Files there are overwritten on update. Always place custom rules in `.claude/rules/` directly or in your own subdirectories (not `shirokuma/`).

**Naming**: Use descriptive, kebab-case names.

### Step 3: Write Rule Content

1. **Read template**:
   ```bash
   cat .claude/skills/managing-rules/templates/rule.md.template
   ```

2. **Add frontmatter** (if path-specific):
   ```yaml
   ---
   paths:
     - "src/**/*.ts"
     - "lib/**/*.ts"
   ---
   ```

3. **Write concise rules**:
   - One topic per file
   - Bullet points preferred
   - Specific, actionable items
   - No verbose explanations

### Step 4: Validate Glob Patterns

| Pattern | Matches |
|---------|---------|
| `**/*.ts` | All TypeScript files |
| `src/**/*` | All files under src/ |
| `*.md` | Markdown in project root only |
| `src/components/*.tsx` | Components in specific dir |
| `src/**/*.{ts,tsx}` | TS and TSX files under src/ |
| `{src,lib}/**/*.ts` | TS files in src/ or lib/ |

### Step 5: Create File

```bash
mkdir -p .claude/rules
cat > .claude/rules/{name}.md << 'EOF'
---
paths:
  - "pattern/**/*.ext"
---

# Rule Title

- Rule 1
- Rule 2
EOF
```

### Step 6: Verify

```bash
# List all rules
ls -la .claude/rules/

# Check rule content
cat .claude/rules/{name}.md

# View loaded rules in session
/memory
```

## Glob Pattern Reference

### Basic Patterns

| Pattern | Description |
|---------|-------------|
| `*` | Any characters except `/` |
| `**` | Any characters including `/` |
| `?` | Single character |
| `[abc]` | Character class |
| `{a,b}` | Brace expansion |

### Common Patterns

| Use Case | Pattern |
|----------|---------|
| All TypeScript | `**/*.ts` |
| TypeScript + TSX | `**/*.{ts,tsx}` |
| Specific directory | `src/components/**/*` |
| Multiple directories | `{src,lib}/**/*.ts` |
| Test files | `**/*.test.{ts,tsx}` |
| Actions only | `lib/actions/**/*.ts` |

## Best Practices

### Do

- **One topic per file**: `testing.md`, `api-conventions.md`
- **Use descriptive filenames**: Name indicates content
- **Be specific**: "Use 2-space indentation" not "Format properly"
- **Use paths sparingly**: Only when rules truly apply to specific files
- **Keep rules short**: 10-30 lines per file

### Language

- **Write rules in English**: All `.claude/rules/` files use English for cross-project reuse
- **Never mix languages in tables**: If bilingual content is needed, use separate sections per language
- **Response language matching**: The AI matches the user's language automatically — rules don't need bilingual translations

### Don't

- **Don't duplicate CLAUDE.md**: Rules in both places cause confusion
- **Don't overuse paths**: Unconditional rules are simpler
- **Don't write tutorials**: Rules are reminders, not documentation
- **Don't include temporary notes**: Rules should be stable

## Migration Guide

### From CLAUDE.md to Rules

1. **Identify file-specific sections** in CLAUDE.md
2. **Extract to separate rule files** with appropriate paths
3. **Keep global rules** in CLAUDE.md
4. **Test** that rules load correctly

### From Skill project/ to Rules

Current pattern:
```
.claude/skills/coding-nextjs/project/patterns/lib-structure.md
```

Better as rule:
```
.claude/rules/lib-structure.md
```

With frontmatter:
```yaml
---
paths:
  - "lib/**/*.ts"
---
```

## Symlinks for Sharing

Rules support symlinks for sharing across projects:

```bash
# Link shared rules directory
ln -s ~/shared-rules .claude/rules/shared

# Link individual rule
ln -s ~/company-standards/security.md .claude/rules/security.md
```

## Quick Reference

```bash
# Create new rule
"create rule for {topic}"
"add rule for {file-pattern}"

# Path-specific rule
"create rule for Server Actions in lib/actions/"

# Migrate from CLAUDE.md
"extract testing rules from CLAUDE.md to rules/"

# List current rules
/memory
```

## Templates

| Template | Purpose |
|----------|---------|
| [rule.md.template](templates/rule.md.template) | Basic rule structure |
| [path-rule.md.template](templates/path-rule.md.template) | Path-specific rule |
| [tech-stack.md.template](templates/tech-stack.md.template) | Project tech stack reference |

## Completion Report

```markdown
## Rule {Created | Updated}

**File:** `.claude/rules/{name}.md`
**Type:** {path-specific | always loaded}
**Paths:** {paths frontmatter value | "None (applies to all files)"}
```

When run standalone, suggest next steps (verification commands, testing methods).

## Notes

- Rules are loaded **automatically** - no invocation needed
- Path-specific rules only load when working with matching files
- User rules (`~/.claude/rules/`) load before project rules
- Subdirectories are recursively discovered
- Symlinks are resolved and loaded normally
- Use `/memory` to see what's currently loaded
- When rule type or scope is ambiguous, use AskUserQuestion to confirm before creating
- For batch creation of multiple rules, use TodoWrite to track progress
