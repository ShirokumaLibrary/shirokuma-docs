---
name: evolving-rules
description: Analyzes evolution signals for rules and skills, proposing improvements. Use when "rule evolution", "rules evolution", "evolve rules", "evolution flow", "signal analysis".
allowed-tools: Bash, Read, Grep, Glob, AskUserQuestion, TodoWrite
---

# Rule & Skill Evolution

Analyze feedback signals accumulated in Evolution Discussions and propose improvements to project-specific rules and skills.

## Workflow

### Step 1: Collect Signals

Fetch signals from Evolution Discussions.

```bash
# List Evolution category Discussions
shirokuma-docs discussions list --category Evolution --limit 10
```

If a Discussion is found, fetch details including comments:

```bash
shirokuma-docs discussions show {number}
shirokuma-docs discussions comment {number}
```

**If no signals**: Report "No Evolution signals accumulated yet. Record signals during daily work." and exit.

### Step 2: Pattern Analysis

Delegate to Task(Explore) to reduce context consumption. Classify comments into categories:

| Category | Description | Example |
|----------|-------------|---------|
| Rule friction | Rule doesn't match reality, was ignored | "git-commit-style scope is ambiguous" |
| Missing pattern | Uncovered case | "Test naming convention undefined" |
| Skill improvement | Skill behavior issue | "reviewing-on-issue lint execution order inefficient" |
| Lint trend | Lint violation trends | "Rule A violations increasing" |
| Success rate | Task completion metrics | "First-review pass rate declining" |

**Recurring pattern detection**: 3+ signals targeting the same subject → candidate for improvement proposal.

### Step 3: Impact Assessment

Read the current content of target rules/skills:

```bash
# For rules
Grep pattern="{rule-name}" glob="**/*.md" path="plugin/"

# For skills
Read plugin/shirokuma-skills-en/skills/{skill-name}/SKILL.md
```

Assess change impact:
- Dependencies with other rules/skills
- Impact on existing behavior
- Need for both EN/JA changes

### Step 4: Propose Updates

Present concrete changes in before/after format:

```markdown
## Proposal: Improve {target name}

**Signal count:** {N}
**Category:** {Rule friction | Missing pattern | Skill improvement}

### Before
{Current content (relevant section)}

### After
{Proposed content}

### Rationale
{Evidence from signals}
```

### Step 5: User Approval

Get approval via AskUserQuestion:

```
Apply this improvement proposal?
- Apply
- Modify and apply (enter feedback)
- Skip
```

### Step 6: Apply

Delegate approved proposals to `managing-rules` or `managing-skills` skill.

```
Skill: managing-rules (or managing-skills)
Args: Update {target file}
```

Update both EN/JA files simultaneously.

### Step 7: Update Records

Update the Evolution Discussion body as an aggregated summary:

```bash
# Post comment first (comment-first principle)
shirokuma-docs discussions comment {number} --body-file - <<'EOF'
## Analysis Complete: {date}

### Applied
- {target}: {change summary}

### Skipped
- {target}: {reason}
EOF

# Update body as aggregated summary
shirokuma-docs discussions update {number} --body-file /tmp/shirokuma-docs/evolution-summary.md
```

## Completion Report

```markdown
## Evolution Analysis Complete

**Signals analyzed:** {N}
**Proposals:** {M}
**Applied:** {K}

| Target | Category | Action |
|--------|----------|--------|
| {name} | {category} | {Applied / Skipped} |
```

## Edge Cases

| Situation | Action |
|-----------|--------|
| No Evolution Discussion exists | Propose creating an Evolution Discussion for the project |
| Fewer than 3 signals | Report "Too few signals for analysis" |
| Target rule/skill doesn't exist | Propose creation (delegate to `managing-rules`) |
| Only EN or JA version exists | Propose creating/updating both |

## Notes

- Responsibility separation from `discovering-codebase-rules`: `evolving-rules` improves **existing** rules/skills, `discovering-codebase-rules` discovers **new** patterns
- Avoid excessive proposals — respect the threshold (3+ signals), propose cautiously
- Never modify rules/skills without user approval
- Delegate analysis phase to Task(Explore) to save main context
