# Agent Documentation Structure

Organize complex agent knowledge bases with clear file responsibilities and Single Source of Truth principle.

---

## When to Use

Use this pattern when an agent needs:
- Multiple reference documents (> 3 files)
- Pattern files for different topics
- Templates for code generation
- Checklists for quality gates

For simple agents (single AGENT.md < 500 lines), this pattern is unnecessary.

---

## Directory Structure

Path: `.claude/agents/{agent-name}/`

## File Responsibilities

| File | Responsibility | Content | Size Limit |
|------|---------------|---------|------------|
| **AGENT.md** | Workflow | Step-by-step process only | < 500 lines |
| **reference.md** | Quick Reference | Document structure, tech stack, pattern list, known issues | < 800 lines |
| **checklists.md** | Quality Gates | Pre-completion checklists | < 300 lines |
| **patterns/*.md** | Detailed Patterns | Single topic, Source of Truth | 80-150 lines |
| **templates/README.md** | Template Specs | Template list and usage | < 300 lines |

---

## Single Source of Truth Principle

### Rule

> Information is written in exactly ONE location. Other files only contain references.

### Example

**Good**: reference.md contains table with links only

```markdown
## Quick Reference

| Pattern | File | Summary |
|---------|------|---------|
| Auth | [better-auth.md](patterns/better-auth.md) | Two-function pattern |
| CSRF | [csrf-protection.md](patterns/csrf-protection.md) | Token validation |
```

**Bad**: reference.md duplicates code from patterns/

```markdown
## Quick Reference

### Auth Pattern
\`\`\`typescript
// Full code block duplicated from patterns/auth.md
export async function verifyAdmin() { ... }
\`\`\`
```

### When Duplication is Acceptable

- **Critical patterns** that must be immediately visible (max 1-2)
- **Syntax examples** that are < 5 lines
- **Always** add "→ Details: [file.md](path)" reference

---

## Pattern File Format

All pattern files follow this structure:

```markdown
# {Pattern Name}

{One-sentence description of what this pattern solves}

---

## Solution

{Primary code example}

\`\`\`typescript
// Code here
\`\`\`

---

## Usage

{When to use this pattern}

- Condition 1
- Condition 2

---

## Key Points

- {Important point 1}
- {Important point 2}
- {Important point 3}
```

### Required Sections

| Section | Required | Content |
|---------|----------|---------|
| `# Title` | Yes | Pattern name |
| Overview | Yes | 1-2 sentences under title |
| `## Solution` | Yes | Primary code example |
| `## Key Points` | Yes | 3-5 bullet points |

### Optional Sections

| Section | Use Case |
|---------|----------|
| `## Problem` | Error/issue description needed |
| `## Usage` | When to use explanation |
| `## Examples` | Additional code examples |
| `## Configuration` | Config file examples |
| `## Testing` | How to test |

---

## Document Structure Section

Add to reference.md to clarify file responsibilities:

```markdown
## Document Structure

| File | Responsibility | Content |
|------|---------------|---------|
| **AGENT.md** | Workflow | N-step process only |
| **reference.md** | Quick Reference | Tech stack, pattern list |
| **checklists.md** | Quality Gates | Completion checklists |
| **patterns/*.md** | Detailed Patterns | Source of Truth |
| **templates/** | Code Templates | Template specs |

**Principle**: Information in one place only. Others reference.
```

---

## File Length Guidelines

| Length | Action |
|--------|--------|
| < 50 lines | Consider merging with related file |
| 80-150 lines | Ideal |
| 150-200 lines | Acceptable |
| > 200 lines | Consider splitting |
| > 500 lines | Must split or use directory format |

---

## Style Rules

### Section Separators

Use `---` before major sections:

```markdown
## Solution

Code...

---

## Key Points

- Point 1
```

### Code Blocks

Always specify language:

```markdown
\`\`\`typescript
// Not just \`\`\`
\`\`\`
```

### Bullet Points

- Start with verb ("Use", "Check", "Avoid")
- Complete sentences preferred
- Parallel structure

### Headings

```markdown
# Pattern Name        ← Title Case
## Section Name       ← Title Case
### Sub-section name  ← Sentence case
```

---

## Key Points

- Use directory format for agents with > 3 reference files
- Each file has ONE responsibility - no overlap
- Pattern files are Source of Truth - reference.md only links
- Keep pattern files 80-150 lines for readability
- Add Document Structure section to reference.md for clarity
