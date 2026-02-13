---
name: codebase-rule-discovery
description: Analyzes TypeScript applications to discover patterns and propose coding conventions for shirokuma-docs lint rules. Use when "rule discovery", "convention proposal", "pattern analysis", or when investigating codebases to extract patterns or propose new conventions.
allowed-tools: Read, Grep, Glob, Bash, AskUserQuestion, TodoWrite
---

# Codebase Rule Discovery

Analyzes TypeScript applications in the monorepo for two purposes:
1. **Pattern Discovery**: Extract existing patterns across apps
2. **Convention Proposal**: Propose new conventions that enable mechanical checks

## When to Use

- User requests "ルール発見", "rule discovery"
- User says "パターン分析", "pattern analysis"
- User mentions "規約提案", "convention proposal"
- User asks "もっとチェックできるようにしたい"
- User wants to "統一感を上げたい", "機械的チェックを増やしたい"

## Two Modes

### Mode 1: Pattern Discovery

**Goal**: Find what patterns already exist across apps

```
Analyze existing code → Discover common patterns → Propose rules
```

### Mode 2: Convention Proposal

**Goal**: Propose conventions that ENABLE more mechanical checks

```
Checkability analysis → Propose conventions → Implement rules after adoption
```

**Key Question**: "How should code be written to enable mechanical checks?"

## Target Applications

| App | Path | Description |
|-----|------|-------------|
| Blog CMS (admin) | `nextjs-tdd-blog-cms/apps/admin/` | CMS admin panel |
| Blog CMS (public) | `nextjs-tdd-blog-cms/apps/public/` | Public blog |
| shirokuma-docs | `shirokuma-docs/src/` | Documentation generation CLI |

## Workflow: Pattern Discovery

Use `TodoWrite` for progress tracking (6+ steps). Use `AskUserQuestion` to confirm priority when proposing conventions.

### Step 1-7: See workflow file

See [workflows/analyze-codebase.md](workflows/analyze-codebase.md)

## Workflow: Convention Proposal

### Step 1: Identify Check Opportunities

Analyze what COULD be checked if conventions existed:

| Category | Current State | If Standardized |
|----------|--------------|-----------------|
| File placement | Mixed | Domain-based placement check possible |
| Naming | Partially consistent | Auto-rename suggestions possible |
| i18n keys | Freeform | Key format validation possible |

### Step 2: Analyze Current Structure

```bash
# File structure analysis
find apps/ -name "*.ts" -o -name "*.tsx" | head -100

# Directory patterns
ls -la apps/admin/lib/
ls -la apps/public/lib/

# Naming conventions
find apps/ -name "*.tsx" | xargs basename -a | sort | uniq -c | sort -rn
```

### Step 3: Propose Conventions

For each opportunity, document:

1. **Current State**: How it's done now (with variations)
2. **Proposed Convention**: Specific rule
3. **Migration Cost**: How much code needs changing
4. **Check Enabled**: What lint rule becomes possible
5. **Benefits**: Why it's worth standardizing

### Step 4: Generate Convention Proposal

Use [templates/convention-proposal.md](templates/convention-proposal.md)

### Step 5: Save as Knowledge Discussion

Before proposing a rule, save findings as a Knowledge Discussion to preserve context and rationale.

```bash
# For confirmed patterns → Knowledge category
shirokuma-docs discussions create --category Knowledge --title "{Pattern Name}" --body "..."

# For investigations still in progress → Research category
shirokuma-docs discussions create --category Research --title "[Research] convention-{category}" --body "..."
```

**Choose the category based on confidence level:**

| Confidence | Category | Next Step |
|------------|----------|-----------|
| Confirmed (pattern observed 2+ times) | Knowledge | Proceed to Rule extraction (Step 6) |
| Tentative (needs more validation) | Research | Wait for more evidence before Rule |

The Discussion serves as the **source of truth** for the rationale behind the rule. Always create it before proposing a rule.

### Step 6: Extract Rule (if Knowledge)

When a pattern is recorded as Knowledge (confirmed), propose a Rule for AI consumption:

1. Use `managing-rules` skill to create the rule file
2. Keep the rule concise and actionable (AI audience)
3. Add source reference: `<!-- Source: Discussion #{N} -->`
4. The Knowledge Discussion retains the full context; the Rule is a distilled extract

## Convention Categories

### 1. File Placement Conventions

| Area | Convention | Enables |
|------|------------|---------|
| Server Actions | `lib/actions/{domain}.ts` | Domain completeness check |
| Components | `components/{Domain}/` | Component dependency check |
| Hooks | `hooks/use{Name}.ts` | Hook naming check |
| Types | `types/{domain}.ts` | Type definition duplication check |

### 2. Naming Conventions

| Target | Convention | Example |
|--------|------------|---------|
| Server Action files | `{domain}-actions.ts` | `post-actions.ts` |
| Component files | `{Name}.tsx` (PascalCase) | `PostCard.tsx` |
| Hook files | `use{Name}.ts` | `useAuth.ts` |
| Test files | `{name}.test.ts` | `post-actions.test.ts` |

### 3. Code Structure Conventions

| Area | Convention | Enables |
|------|------------|---------|
| Server Action order | Auth → CSRF → Validation → Processing | Order check |
| Export style | Prefer named exports | Improved unused export detection |
| i18n keys | `{domain}.{action}.{element}` | Key format check |

### 4. Annotation Conventions

| Tag | Required For | Enables |
|-----|-------------|---------|
| `@serverAction` | Server Actions | Auto documentation generation |
| `@screen` | Page components | Screen catalog generation |
| `@usedComponents` | Screens | Dependency graph generation |

## Existing Rules (Reference)

| Rule | Status |
|------|--------|
| server-action-structure | Implemented |
| annotation-required | Implemented |
| testdoc-* | Implemented |

Check `shirokuma-docs/src/lint/rules/` for current implementations.

## Anti-Patterns

- Do not propose rules that duplicate existing rules
- Do not mark a pattern as confirmed with fewer than 2 observations

## Quick Reference

```bash
# Pattern discovery (Mode 1)
"discover patterns in blog-cms"

# Convention proposal (Mode 2)
"propose conventions for better checking"

# Specific areas
"propose file placement conventions"
"propose naming conventions"
"propose i18n key conventions"
```

## Related Resources

- [patterns/discovery-categories.md](patterns/discovery-categories.md) - What to look for
- [templates/rule-proposal.md](templates/rule-proposal.md) - Rule proposal format
- [templates/convention-proposal.md](templates/convention-proposal.md) - Convention proposal format
- [workflows/analyze-codebase.md](workflows/analyze-codebase.md) - Detailed workflow

## Output

Convention proposals should answer:

1. **What**: Specific convention content
2. **Why**: Why this convention is needed
3. **Check**: What checks become possible
4. **Migration**: Migration cost for existing code
5. **Priority**: P0/P1/P2
