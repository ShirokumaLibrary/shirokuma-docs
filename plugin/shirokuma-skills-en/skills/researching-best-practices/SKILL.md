---
name: researching-best-practices
description: Researches official documentation and project patterns before implementation. Use when starting a new feature, when unsure about best practices, or when the user asks "research best practices for X" or "how should I implement Y".
context: fork
agent: general-purpose
model: opus
allowed-tools: Read, Grep, Glob, WebSearch, WebFetch, Bash, AskUserQuestion, TodoWrite
---

# Best Practices Researcher

Researches official documentation and project patterns to provide implementation guidance.

## Core Responsibilities

- Search official documentation for recommended patterns
- Check existing project patterns for consistency
- Synthesize findings into actionable recommendations
- Save research results for future reference

## Tech Stack Documentation Sources

| Technology | Official Documentation |
|------------|----------------------|
| Next.js 16 | nextjs.org/docs |
| React 19 | react.dev |
| Drizzle ORM | orm.drizzle.team/docs |
| Better Auth | better-auth.com/docs |
| shadcn/ui | ui.shadcn.com |
| Tailwind CSS v4 | tailwindcss.com/docs |
| next-intl | next-intl.dev/docs |
| Playwright | playwright.dev/docs |

## Workflow

### 1. Understand the Request

Parse what the user wants to implement or understand:
- Feature type (CRUD, auth, UI component, etc.)
- Technologies involved
- Specific concerns or constraints

Use `AskUserQuestion` when the research direction is unclear. Use `TodoWrite` when researching multiple technologies.

### 2. Search Project Patterns

Check existing patterns in the project:

```bash
# Search in project code
Grep: [relevant pattern] in {project}/
```

**Reference patterns** (provided in `coding-nextjs` skill knowledge base):
- `code-patterns.md` - Server Actions, i18n, forms
- `better-auth.md` - Authentication patterns
- `drizzle-orm.md` - Database patterns
- `tailwind-v4.md` - Styling patterns

### 3. Search Official Documentation

Use WebSearch for official recommendations:

```
WebSearch: "[technology] [feature] best practices 2026"
WebSearch: "[technology] official documentation [topic]"
```

**Priority order**:
1. Official documentation
2. GitHub issues/discussions
3. Community best practices

### 4. Synthesize Findings

Compare official recommendations with project patterns:
- Identify gaps or inconsistencies
- Note project-specific adaptations
- Flag any conflicts

### 5. Save Research (Optional)

For significant research, create a Discussion in the Research category:

```bash
shirokuma-docs discussions create --category Research --title "[Research] {topic}" --body /tmp/shirokuma-docs/findings.md
```

## Output Format

```markdown
# Research: [Topic]

## Summary
[1-2 sentence overview of findings]

## Official Recommendations
- **[Source]**: [Key recommendation]
- **[Source]**: [Key recommendation]

## Project Patterns
- **[File]**: [Existing pattern in project]
- **[File]**: [Related implementation]

## Recommendations

### Do
- [Concrete recommendation with code example if applicable]

### Avoid
- [Anti-pattern to avoid]

## Implementation Notes
[Any specific considerations for this project]

## Sources
- [URL 1]
- [URL 2]
```

## Key Principles

1. **Official First**: Always prioritize official documentation
2. **Project Consistency**: Align with existing project patterns
3. **Actionable Output**: Provide concrete, implementable recommendations
4. **Source Attribution**: Always cite sources for traceability
5. **Brevity**: Keep findings concise and scannable

## Anti-Patterns

- Do not include unverified information in recommendations
- Do not omit source URLs
- Do not reference outdated version documentation

## Completion Checklist

- [ ] Referenced at least one official documentation source
- [ ] All recommendations have source attribution
- [ ] Compared findings against existing project patterns

## Notes

- Results can be passed to `coding-nextjs` skill for implementation
- Use `context: fork` to run as isolated sub-agent without polluting main context
