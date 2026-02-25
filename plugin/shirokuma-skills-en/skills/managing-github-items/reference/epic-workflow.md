# Epic Workflow

Unified reference for working with epics (parent issue + sub-issue structure) on large-scale work.

## Identifying Epics

Epics are identified by **structure**, not Issue Type. An issue with `subIssuesSummary.total > 0` is an epic.

```bash
shirokuma-docs issues show {number}
# → subIssuesSummary: { total: 3, completed: 1 }
```

Feature epics and Chore epics follow the same workflow.

## Integration Branch Model

```
develop
  └── epic/{issue-number}-{slug}        ← integration branch
        ├── feat/{sub-number}-{slug}     ← sub-issue branch
        ├── fix/{sub-number}-{slug}
        └── ...
```

| Branch | Branches from | Merges to | Purpose |
|--------|---------------|-----------|---------|
| `epic/{number}-{slug}` | `develop` | `develop` (final PR) | Integration target for sub-issues |
| `{type}/{sub-number}-{slug}` | integration branch | integration branch (PR) | Individual sub-issue work |

### Branch Naming

- **Integration**: `epic/{parent-issue-number}-{slug}`
- **Sub-issues**: Standard naming convention (`feat/`, `fix/`, `chore/`, `docs/`)

### Lifecycle

1. Determine integration branch name during epic issue planning
2. Create integration branch from `develop`
3. Each sub-issue branches from the integration branch
4. Sub-issue PRs target the integration branch
5. After all sub-issues complete, create a final PR from integration branch to `develop`
6. Final PR merge transitions epic → Done

## Base Branch Auto-Detection

When a child issue has a parent (detected via the `parentIssue` field in `shirokuma-docs issues show` output), detect the integration branch in this order:

1. **Extract from parent issue body**: Look for a `### Integration Branch` (EN) / `### Integration ブランチ` (JA) heading and extract the branch name from the backtick block immediately following. Any prefix is accepted: `epic/`, `chore/`, `feat/`, etc.
2. **Fallback (remote branch search)**: `git branch -r --list "origin/*/{parent-number}-*"`
   - 1 match → auto-select
   - Multiple matches → AskUserQuestion for user selection
   - 0 matches → fall back to `develop`
3. **Final fallback**: Use `develop` as base and warn the user

```bash
# Get branch name from parent issue body
shirokuma-docs issues show {parent-number}
# → Extract `chore/958-octokit-migration` from "### Integration Branch" section

# Fallback
git branch -r --list "origin/*/{parent-number}-*"
```

### Base Branch Recovery

If the base branch was set incorrectly after PR creation, fix via REST API:

```bash
gh api repos/{owner}/{repo}/pulls/{pr-number} --method PATCH -f base="correct-branch"
```

**Note**: `gh pr edit --base` fails with a Projects classic deprecation error; do not use it.

## Status Management

### Epic Issue Status Transitions

| Event | Epic Action |
|-------|-------------|
| Planning complete | Epic → Spec Review (standard flow) |
| First sub-issue becomes In Progress | Epic → In Progress |
| Sub-issue PR merged | Epic remains In Progress (check `subIssuesSummary` but do not transition) |
| Final PR: integration → develop merged | Epic → Done |
| Some sub-issues blocked | Epic → Pending (manual, add reason in comment) |

### Sub-Issue Status Transitions

Sub-issues follow the standard `project-items` rule. The only difference is that their PR base branch is the integration branch.

### `session end` Operational Guidance

The `ending-session` safety net is not epic-aware. Using `--done` on an epic issue while sub-issues are incomplete risks prematurely transitioning the epic to Done.

| Situation | Recommended Action |
|-----------|--------------------|
| Session end while working on a sub-issue | `session end --review {sub-issue-number}` to update only the sub-issue |
| All sub-issues complete, final PR merged | `session end --done {epic-number}` to set epic to Done |
| Sub-issues still remaining | Do NOT use `--done` on the epic issue. Manually maintain In Progress |

## `Closes #N` Behavior and Base Branch

GitHub's native behavior: `Closes #N` auto-close and sidebar links only work for PRs targeting the default branch (`develop`). For PRs targeting an integration branch:

| Feature | Behavior |
|---------|----------|
| GitHub sidebar issue link | **Not displayed** (limitation) |
| `Closes #N` auto-close | **Does not work** |
| shirokuma-docs CLI `issues merge` | **Works correctly** (`parseLinkedIssues()` parses PR body independently) |

Use `Closes #N` in sub-issue PRs regardless. Accept the GitHub sidebar limitation; the CLI serves as a substitute.

## PR-Issue Link Graph

In epic structures, PRs and issues can form many-to-many relationships. `issues merge` parses related issues from PR body and adjusts behavior based on link complexity.

| Pattern | Description | CLI Behavior |
|---------|-------------|-------------|
| 1:1 | 1 PR → 1 Issue | Auto-process (`Closes #N` → Status Done) |
| 1:N | 1 PR → multiple Issues | Auto-process (each Issue → Done) |
| N:1 | Multiple PRs → 1 Issue | Auto-process (last PR merge → Done) |
| N:N | Multiple PRs ↔ multiple Issues | Error and stop, structured output for AI fallback |

### N:N Detection Flow

1. Parse `Closes/Fixes/Resolves #N` from the target PR body
2. For each related issue, search for other linked PRs
3. If the link graph is simple (1:1, 1:N, N:1), auto-process
4. If N:N is detected, stop with error and output structured list of related PRs/Issues

## Epic Plan Template

Extended template used by `planning-on-issue` when `subIssuesSummary.total > 0` is detected:

```markdown
## Plan

### Approach
{Overall strategy}

### Integration Branch
`epic/{number}-{slug}`

### Sub-Issue Structure

| # | Issue | Description | Dependencies | Size |
|---|-------|-------------|--------------|------|
| 1 | #{sub1} | {summary} | — | S |
| 2 | #{sub2} | {summary} | #{sub1} | M |

### Execution Order
{Recommended order based on dependencies}

### Task Breakdown
- [ ] Create integration branch
- [ ] #{sub1}: {task summary}
- [ ] #{sub2}: {task summary}
- [ ] Final PR: integration → develop

### Risks / Concerns
- {Dependency risks between sub-issues}
```

## Out of Scope (Follow-up)

The following are out of scope for now and will be addressed in separate issues:

- Epic progress display in `starting-session` / `showing-github` (sub-issue summary visualization)
- Epic awareness in `ending-session` (automated epic status protection when sub-issues are incomplete)
