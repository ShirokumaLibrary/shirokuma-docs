# Discussion Workflows — Detailed Procedures

Supplements the overview in the `discussions-usage` rule.

## Knowledge → Rule Extraction Workflow

When a pattern or solution is confirmed through practice, extract it into a Rule for AI consumption.

```
1. Discovery: Pattern found during work (code review, debugging, implementation)
2. Knowledge Discussion: Record in Knowledge category with context and rationale
3. Validation: Pattern used successfully 2+ times across sessions
4. Rule Proposal: Extract concise, actionable rule from Knowledge Discussion
5. Rule Creation: Use managing-rules skill to create the rule file
6. Cross-Reference: Add Discussion # link as comment in the rule
```

| Step | Action | Output |
|------|--------|--------|
| Discovery | Identify recurring pattern | Mental note or comment |
| Record | Create Knowledge Discussion | Discussion #{N} |
| Validate | Confirm pattern holds across contexts | Updated Discussion |
| Extract | Distill into AI-readable rule | Rule `.md` file |
| Link | Reference source Discussion in rule | `<!-- Source: Discussion #{N} -->` |

**When to skip the Discussion step**: Only for trivial patterns that are self-evident (e.g., typo corrections, obvious naming conventions). If the "why" matters, write a Discussion first.

## Searching Existing Discussions

Before creating a new Discussion, search for existing ones to avoid duplicates and build on prior context.

```bash
# Search by keyword
shirokuma-docs discussions search "{keyword}"

# Filter by category
shirokuma-docs discussions list --category Knowledge
shirokuma-docs discussions list --category Research
shirokuma-docs discussions list --category ADR

# Recent handovers (for session context)
shirokuma-docs discussions list --category Handovers --limit 5
```

**When to search**:
- Starting a new session (check recent Handovers)
- Before creating a Knowledge Discussion (check for existing coverage)
- Before starting research (check Research category for prior work)
- When investigating a pattern (search Knowledge for related findings)

## Cross-Reference

- Discussions share number space with Issues (#1, #2, ...)
- Reference in commits: "See Discussion #30"
- Add to Projects for tracking
