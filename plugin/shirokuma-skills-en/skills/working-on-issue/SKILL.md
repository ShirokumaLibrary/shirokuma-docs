---
name: working-on-issue
description: Work dispatcher that takes an issue number or task description, selects the appropriate skill, and orchestrates the workflow. Use when "work on", "work on #42".
allowed-tools: Bash, Read, Grep, Glob, AskUserQuestion, TodoWrite
---

# Working on Issue (Orchestrator)

Orchestrate the full workflow from planning to implementation, commit, PR, and self-review based on issue type or task description.

**Note**: For session setup, use `starting-session`. This skill is for starting work on a specific task.

## Core Concept

This skill is the **orchestrator for all work**. It analyzes, delegates, and manages the chain execution.

```
/working-on-issue #42 → Analyze → Select Skill → [TDD] → Execute → Commit → PR → Review
```

### Dual Mode

| Mode | Trigger | Behavior |
|------|---------|----------|
| Auto-chain | `/working-on-issue #42` (normal) | Work → Commit → PR → Review executed automatically |
| Individual | Direct skill invocation | Single step only |

**Merge is NOT part of the auto-chain** (destructive operation). Only via explicit "merge" keyword through `committing-on-issue`.

### TodoWrite Registration (Required)

Register **all chain steps** in TodoWrite **before starting work**.

**Implementation / Design / Bug Fix:**

| # | content | activeForm | Skill |
|---|---------|------------|-------|
| 1 | Implement changes | Implementing changes | `coding-nextjs` / `designing-shadcn-ui` / direct edit |
| 2 | Commit and push changes | Committing and pushing | `committing-on-issue` |
| 3 | Create pull request | Creating pull request | `creating-pr-on-issue` |
| 4 | Run self-review and post results to PR | Running self-review | `creating-pr-on-issue` Step 6 |

**Refactoring / Chore:**

| # | content | activeForm | Skill |
|---|---------|------------|-------|
| 1 | Make changes | Making changes | Direct edit |
| 2 | Commit and push changes | Committing and pushing | `committing-on-issue` |
| 3 | Create pull request | Creating pull request | `creating-pr-on-issue` |
| 4 | Run self-review and post results to PR | Running self-review | `creating-pr-on-issue` Step 6 |

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

If on `develop`, create branch per `branch-workflow` rule:

```bash
git checkout develop && git pull origin develop
git checkout -b {type}/{number}-{slug}
```

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

- **Merge is NOT part of the chain**
- No confirmation between steps, one-line progress reports
- **Self-review loop**: After PR creation, run `reviewing-on-issue` via `creating-pr-on-issue` Step 6
  - FAIL + Auto-fixable → auto-fix → commit → push → re-review
  - Maximum 3 iterations
  - Stop if issue count increases between iterations
- On failure: stop chain, report status, return control to user

## Arguments

| Format | Example | Behavior |
|--------|---------|----------|
| Issue number | `#42` | Fetch issue, analyze type |
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

## Rule References

| Rule | Usage |
|------|-------|
| `branch-workflow` | Branch naming, creation from `develop` |
| `project-items` | Status workflow, field requirements |
| `git-commit-style` | Commit message format |

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
