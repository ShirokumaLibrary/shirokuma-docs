# GitHub Discussions Usage

## Purpose

Discussions store human-readable knowledge; Rules store AI-readable extracts.

| Layer | Audience | Language | Content |
|-------|----------|----------|---------|
| Discussions | Human | English | Context, rationale, details |
| Rules/Skills | AI | English | Concise patterns, commands |

## Categories

| Category | Emoji | Format | When to Use |
|----------|-------|--------|-------------|
| Handovers | 🔄 | Open-ended discussion | Session end - create via `/ending-session` |
| ADR | 📋 | Open-ended discussion | Architecture decisions confirmed |
| Knowledge | 📚 | Open-ended discussion | Patterns/solutions confirmed |
| Research | 🔍 | Open-ended discussion | Investigation needed |

## Workflow

```
Research → ADR (if decision) → Knowledge → Rule extract
```

### Discussion → Issue Flow

Ideas and proposals live in Discussions until a decision is made to implement them.

```
Discussion (idea) → Decision to implement → Issue (Backlog) → Ready → In Progress
```

| Action | When |
|--------|------|
| Create Discussion | New idea, proposal, or investigation topic |
| Convert to Issue | Team decides to implement the idea |
| Keep as Discussion | Idea is rejected, deferred, or purely informational |

Do NOT create Issues for undecided ideas. Use Discussions for exploration and decision-making first.

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

## Auto Memory Boundary

Do not store detailed information in Claude Code's auto memory. Memory holds pointers only; store details in Discussions. See `memory-operations` rule.

## AI Behavior

1. **Search**: Check existing Discussions before creating new ones
2. **Read**: Check Discussions for context when researching
3. **Write**: Create Discussions for significant findings
4. **Extract**: Propose Rule when pattern is confirmed (see Knowledge → Rule workflow)
5. **Reference**: Link Discussion # in Rule comments

## Body Maintenance

Discussion body MUST always be the latest consolidated version (see "Item Body Maintenance" in `project-items` rule).

- When adding findings, corrections, or new insights via comments, **update the body immediately** to reflect the latest state
- Comments serve as historical record of the discussion
- The body should be "read this alone to understand the current conclusion"

```bash
# Write tool でファイル作成後
shirokuma-docs discussions update {number} --body /tmp/body.md
```

## Title Formats

| Category | Format |
|----------|--------|
| Handovers | `YYYY-MM-DD [{username}] - {summary}` (username auto-inserted by CLI) |
| ADR | `ADR-{NNN}: {title}` |
| Knowledge | `{Topic Name}` |
| Research | `[Research] {topic}` |
