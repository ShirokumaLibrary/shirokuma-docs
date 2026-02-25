---
name: working-on-issue
description: Work dispatcher that takes an issue number or task description, selects the appropriate skill, and orchestrates the workflow. Use when "work on", "work on #42".
allowed-tools: Bash, Read, Grep, Glob, AskUserQuestion, TodoWrite
---

# Working on Issue (Orchestrator)

Orchestrate the full workflow from planning to implementation, commit, PR, and self-review based on issue type or task description.

**Note**: For session setup, use `starting-session`. This skill is for starting work on a specific task.

## TodoWrite Registration (Required)

Register **all chain steps** in TodoWrite **before starting work**.

**Implementation / Design / Bug Fix:**

| # | content | activeForm | Skill |
|---|---------|------------|-------|
| 1 | Implement changes | Implementing changes | `coding-nextjs` / `designing-shadcn-ui` / direct edit |
| 2 | Commit and push changes | Committing and pushing | `committing-on-issue` |
| 3 | Create pull request | Creating pull request | `creating-pr-on-issue` |
| 4 | Run self-review and post results to PR | Running self-review | `creating-pr-on-issue` Step 6 |
| 5 | Update Status to Review | Updating Status to Review | `creating-pr-on-issue` Step 7 |

**Refactoring / Chore:**

| # | content | activeForm | Skill |
|---|---------|------------|-------|
| 1 | Make changes | Making changes | Direct edit |
| 2 | Commit and push changes | Committing and pushing | `committing-on-issue` |
| 3 | Create pull request | Creating pull request | `creating-pr-on-issue` |
| 4 | Run self-review and post results to PR | Running self-review | `creating-pr-on-issue` Step 6 |
| 5 | Update Status to Review | Updating Status to Review | `creating-pr-on-issue` Step 7 |

**Research:**

| # | content | activeForm | Skill |
|---|---------|------------|-------|
| 1 | Conduct research | Conducting research | `researching-best-practices` |
| 2 | Save findings to Discussion | Creating Discussion | `shirokuma-docs discussions create` |

Update each step to `in_progress` when starting and `completed` when done.

## Workflow

### Step 1: Analyze Work

**Issue number provided**: `shirokuma-docs issues show {number}` to fetch title/body/labels/status/priority/size.

#### Plan Check (when issue number provided)

Check if issue body contains `## Plan` section (detected by `^## Plan` line prefix).

| Plan state | Action |
|-----------|--------|
| No plan | → Delegate to `planning-on-issue` |
| Plan exists | → Pass `## Plan` section as context to implementation skill |

#### Transition from Planning Status

| Plan state | Action |
|-----------|--------|
| Planning + no plan | → Delegate to `planning-on-issue` |
| Planning + plan exists | → Transition to Spec Review, ask user approval |

#### Sub-Issue Detection

When `shirokuma-docs issues show {number}` output contains a `parentIssue` field, the issue is a sub-issue of an epic:

```
parentIssue:
  number: 958
  title: "Migrate to Octokit"
```

When sub-issue is detected:
- Record the parent issue number for base branch detection in Step 3
- `creating-pr-on-issue` will self-detect the sub-issue via the `parentIssue` field, so explicit context passing is not required (if passed, it is used as supplementary; otherwise, self-detection is the fallback)

**Text description only**: Classify using dispatch condition table (Step 4) keywords.

### Step 1a: Issue Resolution (text description only)

When called with text only, delegate to `creating-item` skill to ensure an issue exists.

```
Text description → creating-item → Issue number → Join Step 1
```

### Step 2: Update Status

If issue is not already In Progress: `shirokuma-docs issues update {number} --field-status "In Progress"`

**Spec Review implicit approval**: Invoking `/working-on-issue` is implicit plan approval. Transition to In Progress without confirmation.

### Step 3: Ensure Feature Branch

If on `develop` (or the integration branch for sub-issues), create branch per `branch-workflow` rule:

```bash
# Normal issue
git checkout develop && git pull origin develop
git checkout -b {type}/{number}-{slug}

# Sub-issue (branch from integration branch)
git checkout epic/{parent-number}-{slug} && git pull origin epic/{parent-number}-{slug}
git checkout -b {type}/{number}-{slug}
```

**Sub-issue integration branch detection** (in order):

1. Extract branch name from parent issue body: look for `### Integration Branch` (EN) / `### Integration ブランチ` (JA) heading, extract branch name from the backtick block immediately following (any prefix accepted: `epic/`, `chore/`, `feat/`, etc.)
2. Fallback: `git branch -r --list "origin/*/{parent-number}-*"` (1 match → auto-select, multiple → AskUserQuestion, 0 → fall back to `develop`)
3. Not found: Use `develop` as base and warn user

### Step 3b: Propose ADR (Feature M+ only)

For Feature type, Size M+, suggest ADR creation (AskUserQuestion).

### Step 4: Select and Execute Skill

#### Dispatch Condition Table

| Work Type | Condition | Delegate To | TDD |
|-----------|-----------|-------------|-----|
| Next.js Implementation | Labels: `area:frontend`, `area:cli` + Next.js | `coding-nextjs` | Yes |
| UI Design | Keywords: `design`, `UI`, `memorable` | `designing-shadcn-ui` | No |
| Bug Fix | Keywords: `fix`, `bug` | `coding-nextjs` or direct edit | Yes |
| Refactoring | Keywords: `refactor`, `clean` | Direct edit | Yes |
| Research | Keywords: `research`, `investigate` | `researching-best-practices` (fork) | No |
| Review | Keywords: `review`, `audit` | `reviewing-on-issue` (fork) | No |
| Config/Chore | Keywords: `config`, `setup`, `chore` | Direct edit | No |
| Project Setup | Keywords: `setup project`, `initialize` | `setting-up-project` | No |

#### TDD Workflow (when TDD applies)

For TDD-applicable work types, wrap the implementation skill with TDD common steps:

```
Test Design → Test Creation → Test Gate → [Implementation Skill] → Test Run → Verification
```

See [docs/tdd-workflow.md](docs/tdd-workflow.md) for details.

#### Work Type References

| Work Type | Reference |
|-----------|-----------|
| Implementation | [docs/coding-reference.md](docs/coding-reference.md) |
| Design | [docs/designing-reference.md](docs/designing-reference.md) |
| Review | [docs/reviewing-reference.md](docs/reviewing-reference.md) |
| Research | [docs/researching-reference.md](docs/researching-reference.md) |

### Step 5: Sequential Workflow Execution

After work completes, execute the chain **automatically**. No user confirmation between steps.

| Work Type | Chain |
|-----------|-------|
| Implementation / Design / Bug Fix | Work → Commit → PR → Review |
| Refactoring / Chore | Work → Commit → PR → Review |
| Research | Research → Discussion |

> **Definition of "Review"**: The "Review" at the end of the chain includes both self-review execution (`creating-pr-on-issue` Step 6) **and** Status → Review update (Step 7).

- **Merge is NOT part of the chain**
- No confirmation between steps, one-line progress reports
- **Self-review loop**: After PR creation, run `reviewing-on-issue` via `creating-pr-on-issue` Step 6
  - FAIL + Auto-fixable → auto-fix → commit → push → re-review
  - Maximum 3 iterations
  - Stop if issue count increases between iterations
- After self-review, review-based Issue body updates follow comment-first principle (handled by `creating-pr-on-issue` Step 6c)
- On failure: stop chain, report status, return control to user

### Step 6: Evolution Signal Reminder

After successful chain completion (skip on chain failure), check for accumulated Evolution signals.

```bash
shirokuma-docs discussions list --category Evolution --limit 1
```

- 0 discussions → display nothing
- 1+ discussions → display one line:

> 🧬 Evolution signals are accumulated. Run `/evolving-rules` to analyze.

Do not register in TodoWrite (non-blocking display, not a work step).

## Batch Mode

When multiple issue numbers are provided (e.g., `#101 #102 #103`), activate batch mode.

### Batch Detection

Detect multiple `#N` patterns in the arguments. If 2+ issues detected → batch mode.

### Batch Eligibility Check

Before starting, verify all issues meet `batch-workflow` rule criteria:
- All issues are Size XS or S
- Issues share a common `area:*` label or affect related files
- Total issues ≤ 5

If any issue fails eligibility, inform user and suggest individual processing.

### Batch TodoWrite Template

```
[1] Implement #N1 / Implementing #N1
[2] Implement #N2 / Implementing #N2
...
[K] Commit and push all changes / Committing and pushing
[K+1] Create pull request / Creating pull request
[K+2] Run self-review / Running self-review
```

### Batch Workflow

1. **Bulk status update**: All issues → In Progress simultaneously
   ```bash
   shirokuma-docs issues update {n} --field-status "In Progress"
   # (repeat for each issue)
   ```

2. **Branch creation** (first time only):
   ```bash
   git checkout develop && git pull origin develop
   git checkout -b {type}/{issue-numbers}-batch-{slug}
   ```
   Type determination: single type → use it; mixed → `chore`.

3. **Issue loop**: For each issue:
   - Fetch issue details: `shirokuma-docs issues show {number}`
   - Execute implementation (select skill per dispatch table)
   - Quality checkpoint: verify changed files + run related tests
   - Track `filesByIssue` mapping for scoped commits
   - **Do NOT chain** Commit → PR during the loop

4. **Post-loop chain**: After all issues are implemented:
   - Chain to `committing-on-issue` with batch context
   - `committing-on-issue` handles per-issue scoped commits
   - Then chain to `creating-pr-on-issue` for a single batch PR

### Batch Context

Maintain across the issue loop:

```
{
  currentIssue: number,
  remainingIssues: number[],
  completedIssues: number[],
  filesByIssue: Map<number, string[]>
}
```

Track files changed per issue using `git diff --name-only` before/after each implementation.

## Arguments

| Format | Example | Behavior |
|--------|---------|----------|
| Issue number | `#42` | Fetch issue, analyze type |
| Multiple issues | `#101 #102 #103` | Batch mode |
| Description | `implement dashboard` | Text classification → `creating-item` |
| No argument | — | AskUserQuestion |

## Edge Cases

| Situation | Action |
|-----------|--------|
| Issue not found | AskUserQuestion for number |
| Issue Done/Released | Warn, confirm reopen |
| Already In Progress | Continue without status change |
| Wrong branch | AskUserQuestion: switch or continue |
| Chain failure | Report completed/remaining steps, return control |
| Sub-issue with no integration branch | Use `develop` as base, warn user |
| Epic issue selected directly | Propose working on a sub-issue instead |

## Rule References

| Rule | Usage |
|------|-------|
| `branch-workflow` | Branch naming, creation from `develop` |
| `batch-workflow` | Batch eligibility, quality standards, branch naming |
| `epic-workflow` | Epic structure, integration branch, sub-issue workflow |
| `project-items` | Status workflow, field requirements |
| `git-commit-style` | Commit message format |
| `output-language` | GitHub output language convention |
| `github-writing-style` | Bullet-point vs prose guidelines |

## Tool Usage

| Tool | When |
|------|------|
| AskUserQuestion | Requirement clarification, approach selection, edge cases |
| TodoWrite | Chain step registration (required for all work) |
| Bash | Git operations, `shirokuma-docs issues` commands |

## Notes

- This skill is the **orchestrator** for all work
- Update issue status before starting
- Ensure correct feature branch
- TDD-applicable work types require tests before implementation ([docs/tdd-workflow.md](docs/tdd-workflow.md))
- Workflow executes sequentially (Commit → PR → Review). **Merge is NOT included**
- Chain execution stops on error and returns control to user
