# Project Items Rule

## Required Fields

Every project item MUST have:

| Field | Required | Options |
|-------|----------|---------|
| Status | Yes | See workflow below |
| Priority | Yes | Critical / High / Medium / Low |
| Type | Yes | Feature / Bug / Chore / Docs / Research |
| Size | Recommended | XS / S / M / L / XL |

## Status Workflow

```mermaid
graph LR
  Icebox --> Backlog --> Planning --> SpecReview[Spec Review]
  SpecReview --> InProgress[In Progress] --> Review --> Testing --> Done --> Released
  InProgress <--> Pending
  Review <--> Pending
  Backlog <--> Pending
  Done -.-> NotPlanned[Not Planned]
```

| Status | Description |
|--------|-------------|
| Icebox | Low priority, shelved. May be promoted to Backlog later |
| Backlog | Planned work. Requirements may still need refinement |
| Planning | Plan is being created by `planning-on-issue` (pre-work status) |
| Spec Review | Gate for requirements review before work begins |
| In Progress | Currently working on |
| Pending | Blocked (document reason) |
| Review | Code review |
| Testing | QA testing |
| Done | Completed |
| Not Planned | Explicitly not planned (set by `issues cancel`) |
| Released | Deployed to production |

### Idea → Issue Flow

Ideas and proposals start as **Discussions** (Research or Knowledge category), not Issues.

| Stage | Location | When to Move |
|-------|----------|--------------|
| Idea / exploration | Discussion | When the idea is first raised |
| Decided to do | Issue (Backlog) | When the team agrees to implement |
| Requirements firm | Issue (Spec Review) | When requirements need formal review |

- Backlog tolerates varying levels of requirement detail
- Do NOT create Issues for ideas that have not been decided on
- Spec Review is the approval gate before implementation starts

## Size Estimation

| Size | Time | Example |
|------|------|---------|
| XS | ~1h | Typo fix, config change |
| S | ~4h | Small feature, bug fix |
| M | ~1d | Medium feature |
| L | ~3d | Large feature |
| XL | 3d+ | Epic (should be split) |

## Body Template

```markdown
## 概要
{What this item does}

## 背景
{Why this is needed - optional}

## タスク
- [ ] Task 1
- [ ] Task 2

## Deliverable
{What "done" looks like}

## 優先度
{Priority justification - optional}
```

## Status Update Triggers

AI MUST update issue status at these points:

| Trigger | Action | Owner | Command |
|---------|--------|-------|---------|
| Planning started | → Planning | `planning-on-issue` | `issues update {n} --field-status "Planning"` |
| Plan created | → Spec Review | `planning-on-issue` | `issues update {n} --field-status "Spec Review"` |
| User approves plan, starts work | → In Progress + branch | `working-on-issue` | `issues update {n} --field-status "In Progress"` |
| PR created | → Review | `creating-pr-on-issue` | `issues update {n} --field-status "Review"` |
| PR merged | → Done | `committing-on-issue` (via `issues merge`) | Automatic |
| Blocked by dependency | → Pending | Manual | `issues update {n} --field-status "Pending"` + comment |
| Complete (no PR needed) | → Done | `ending-session` | `session end --done {n}` |
| Cancelled | → Not Planned | `issues cancel` | `issues cancel {n}` |
| Session end | → Review or Done | `ending-session` (safety net) | `session end --review/--done {n}` |

### Planning Usage

The `planning-on-issue` skill transitions from Backlog → Planning when starting plan creation.

- **Purpose**: Visibility that planning is in progress; records planning start timestamp
- **Entry**: `planning-on-issue` sets this status after fetching the issue
- **Exit**: Plan complete → Spec Review (set by `planning-on-issue`)
- **Pre-work status**: Not included in `WORK_STARTED_STATUSES` (same treatment as Spec Review)

### Spec Review Usage

The `planning-on-issue` skill writes a plan to the issue body and transitions Planning → Spec Review.

- **Purpose**: User approval gate before implementation
- **Entry**: `planning-on-issue` appends `## Plan` section and sets this status
- **Exit**: User approves → `working-on-issue` starts implementation → In Progress
- **Applies to**: All issues (plan depth scales with content: lightweight/standard/detailed)

### Rules

1. **One In Progress at a time** - Move previous item out before starting new one
2. **Branch per issue** - Create a feature branch when starting work (see `branch-workflow` rule)
3. **Event-driven**: Status changes happen immediately when events occur (`creating-pr-on-issue` sets Review, `issues merge` sets Done)
4. **Session end safety net** - `ending-session` catches any missed status updates
5. **Pending requires reason** - Add a comment explaining the blocker
6. **Idempotency** - If status is already correct, skip the update (no error)

## Built-in Automations

GitHub Projects V2 provides built-in automation workflows that complement the CLI-based status updates.

### Recommended Automations

| Workflow | Trigger | Action | Status |
|----------|---------|--------|--------|
| Item closed | Issue is closed | Set Status → Done | **Enable** |
| Pull request merged | PR merged | Set Status → Done | **Enable** |

### How to Enable

Built-in automations are configured via the GitHub UI (not API):

1. Navigate to your GitHub Project's **Settings > Workflows**
2. Enable "Item closed" → set target status to **Done**
3. Enable "Pull request merged" → set target status to **Done**

### CLI Compatibility

| CLI Feature | Behavior with Automations |
|-------------|--------------------------|
| `session end --review` | Sets Review. When PR merges, automation moves to Done |
| `session end --review` (PR already merged) | Auto-promotes to Done via `findMergedPrForIssue()` — idempotent with automation |
| `session end --done` | Sets Done directly — idempotent with automation |
| `session check` | Reports disabled recommended automations as warnings |
| `session check --fix` | Fixes inconsistencies — compatible with automation |
| `issues cancel` | Sets Not Planned after close. May race with "Item closed → Done" automation — CLI update usually wins. Use `session check --fix` to detect/correct. |

### Checking Automation Status

```bash
shirokuma-docs projects workflows
```

Reports all workflows with their enabled/disabled status and recommendations.

## Labels

Labels complement Type by indicating **where** work applies, not **what** kind of work it is.

| Mechanism | Role | Example |
|-----------|------|---------|
| Type | Work category | Bug, Feature, Chore |
| Labels | Cross-cutting attribute | area:cli, area:plugin |

### Label Rules

1. **Labels do NOT duplicate Type** - Never create labels that mirror Type values (e.g., no `bug` label when Type: Bug exists)
2. **Area labels are optional** - Use when the affected area is not obvious from the title
3. **Multiple area labels allowed** - Cross-cutting issues may have multiple areas
4. **Operational labels for triage** - `duplicate`, `invalid`, `wontfix` are set when closing or redirecting

### Label Categories

| Prefix | Purpose | Examples |
|--------|---------|---------|
| `area:` | Codebase area affected | `area:cli`, `area:plugin`, `area:github` |
| (none) | Operational / triage | `duplicate`, `invalid`, `wontfix` |

See `github-project-setup/reference/labels.md` for full taxonomy and setup commands.

## Item Body Maintenance (Issues / Discussions / PRs)

**The body is the source of truth.** Comments serve as historical record of the discussion. The body MUST always be the latest consolidated version. Readers should be able to understand the current state by reading the body alone.

### When to Update

| Trigger | Action |
|---------|--------|
| New findings or corrections added via comments | Consolidate into body |
| Investigation results posted as comments | Merge into body's relevant section |
| Requirements changed via comments | Update body's Tasks/Deliverable sections |
| Decision made in comment thread | Record in body |
| 3+ comments accumulated since last body update | Consolidate into body |

### How to Update

```bash
# Issues (Write tool でファイル作成後)
shirokuma-docs issues update {number} --body /tmp/body.md

# Discussions (Write tool でファイル作成後)
shirokuma-docs discussions update {number} --body /tmp/body.md
```

### Workflow Order (Comment First)

When updating a body, ALWAYS follow this order:

1. **Post a comment** — Record the changes, findings, or corrections as a comment first
2. **Consolidate into body** — Integrate the comment content into the relevant body section

This order ensures the comment history preserves "what was changed and why", enabling detection and correction of AI judgment errors or hallucinations.

**Prohibited**: Updating the body directly and then adding a comment after the fact (reverse order). Updating the body without any comment.

### Substantive Compliance

Merely following the comment→body order is not enough. Comments must have **independent value as primary records** of the work.

**Heuristic**: If deleting a comment would not lose any information absent from the body, that comment is not substantive.

| Bad (Formal compliance) | Good (Substantive compliance) |
|------------------------|-------------------------------|
| "Plan created. See body for details." | "Selected approach A. Also considered B (reason), rejected due to X." |
| "Updated issue body." | "Investigation found module X is also affected. Added to tasks." |
| "Reflected review results." | "Review detected N issues: {summary of specific findings}" |

**Content that should be primary records in comments**:
- Decision rationale and alternatives considered
- Facts discovered during investigation
- Summary of review findings
- Reasons for requirement changes

**When consolidating into body**: Structure and merge comment content into relevant sections. Comments remain as historical record.

### Guidelines

1. **Preserve structure** - Keep the original body template sections
2. **Update task checkboxes** - Check completed items, add new tasks discovered
3. **Summarize, don't duplicate** - Consolidate comment threads into concise body updates
4. **Comment first** - Always post a comment before updating the body (see Workflow Order section above)

## Creating Items

When creating new items:

1. Set all required fields immediately
2. Use the body template
3. XL items should be split into smaller items
4. Link related items in body if applicable

### Initial Status Guidelines

`issues create` automatically sets Status to **Backlog** by default. Override with `--field-status` when needed:

| Scenario | Status |
|----------|--------|
| Default (planned work) | Backlog |
| Starting immediately | In Progress |
| Low priority / future idea | Icebox |
| Needs requirements review | Spec Review |
