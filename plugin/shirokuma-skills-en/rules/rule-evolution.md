# Rule & Skill Evolution

## Overview

Apply the closed-loop concept from RLAnything to systematically evolve project-specific rules and skills.

```
Policy execution (daily work) → Reward observation (signal collection) → Policy update (improvement proposals) → Environment adaptation (plugin promotion)
```

## Feedback Signals

| Signal Type | Collection Timing | Example |
|------------|-------------------|---------|
| Rule friction | Anytime | Ignored rule X and manually corrected |
| Redo instruction | Anytime | Had to correct skill Z output |
| Review pattern | PR review | Same feedback pattern 3+ times |
| Lint trend | Lint execution | Rule A violations increasing |
| Task success rate | Session end | Issue completion rate |
| PR merge rate | PR merge | First-review pass rate |

## Signal Persistence

Accumulate signals as comments in the Evolution Discussion category.

| Item | Value |
|------|-------|
| Category | Evolution |
| Emoji | 🧬 |
| Title format | `[Evolution] {topic}` |

**Comment format:**

```markdown
**Type:** {Rule friction | Missing pattern | Skill improvement | Lint trend | Success rate}
**Target:** {rule name or skill name or general}
**Context:** {situation description}
**Proposal:** {improvement suggestion}
```

## Evolution Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Reactive | Same signal accumulated 3+ times | Analyze and propose via `evolving-rules` skill |
| Preventive | Pattern recognized during signal recording | Include proposal in comment |
| Periodic | User explicitly invokes `evolving-rules` | Analyze all accumulated signals |
| Session start | `starting-session` detects accumulated signals | Recommend `evolving-rules` invocation (no auto-execution) |
| Skill completion | `working-on-issue`, `planning-on-issue`, `creating-item` complete | Display signal accumulation reminder (non-blocking, 1 line) |

## Responsibility Boundaries

| Skill | Responsibility | Input |
|-------|---------------|-------|
| `discovering-codebase-rules` | Code patterns → new rule proposals | Codebase analysis |
| `evolving-rules` | Existing rule/skill improvement proposals | Evolution signals |
| `managing-rules` | Rule file creation/update (executor) | Proposal content |

**Ambiguous area:** When `discovering-codebase-rules` detects existing rule deficiencies, record as a comment in the Evolution Discussion. `discovering-codebase-rules` itself does not modify rules (new proposals only).

## Session-Agnostic Signal Recording

Signals can be recorded even without a session (ad-hoc skill invocations, direct edits, etc.).

### Use Cases

| Use Case | Signal Type | Recording Method |
|----------|------------|-----------------|
| Ad-hoc `/working-on-issue` | Rule friction, redo instruction | Recording template + reminder. Include Issue number in **Context** |
| Ad-hoc `/planning-on-issue` | Rule friction, skill improvement | Recording template + reminder. Include rule/skill name in **Target** |
| Ad-hoc `/creating-item` | Skill improvement | Recording template + reminder. Include improvement idea in **Proposal** |
| Direct file editing & commit | Rule friction | See recording template. Include rule name in **Target** |
| Review-only short sessions | Review pattern | Reports accumulation (existing). Include pattern improvement in **Proposal** |
| Lint result review | Lint violation trend | See recording template. Include violation count trends in **Context** |

### Recording Template

Command snippet to record signals in Evolution Discussion:

```bash
# 1. Find Evolution Discussion
shirokuma-docs discussions list --category Evolution --limit 5

# 2. Post signal as comment
shirokuma-docs discussions comment {discussion-number} --body-file - <<'EOF'
**Type:** {Rule friction | Missing pattern | Skill improvement | Lint trend | Success rate}
**Target:** {rule name or skill name or general}
**Context:** {situation description}
**Proposal:** {improvement suggestion}
EOF
```

When a reminder is displayed at skill completion, copy and use the template above.

## Rules

1. **Record signals in Discussions** — Accumulate in Evolution Discussion, not memory
2. **Respect thresholds** — Trigger analysis at 3+ accumulated signals, no auto-proposals below
3. **Propose cautiously** — Excessive proposals become noise. Reflect DemyAgent's "fewer tool calls are more effective"
4. **No overlap with existing skills** — `discovering-codebase-rules` discovers new patterns, `evolving-rules` improves existing
5. **User approval required** — Apply rule/skill changes only after user confirmation
