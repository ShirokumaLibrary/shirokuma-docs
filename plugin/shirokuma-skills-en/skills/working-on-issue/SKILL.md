---
name: working-on-issue
description: Work dispatcher that takes an issue number or task description, selects the appropriate skill, and orchestrates the workflow. Use when "work on", "work on #42".
allowed-tools: Bash, Read, Grep, Glob, AskUserQuestion, TodoWrite
---

# Working on Issue

Dispatch work to the appropriate skill based on issue type or task description.

**Note**: This skill is for starting **work on a specific task**. For session setup (context display, handover review), use `starting-session` instead.

## Core Concept

This skill is the **entry point for all work**. It analyzes what needs to be done, delegates to the right skill, then executes the workflow sequentially.

```
/working-on-issue #42 → Analyze → Select Skill → Execute → Commit → PR → Review
```

The workflow is **always executed sequentially**. No user confirmation between steps.

### TodoWrite Registration (Required)

Register **all chain steps** in TodoWrite **before starting work**.

**Implementation / Design / Bug Fix:**

| # | content | activeForm | Skill |
|---|---------|------------|-------|
| 1 | Implement changes | Implementing changes | `nextjs-vibe-coding` / `frontend-designing` |
| 2 | Commit and push changes | Committing and pushing | `committing-on-issue` |
| 3 | Create pull request | Creating pull request | `creating-pr-on-issue` |
| 4 | Run self-review and post results to PR | Running self-review and posting results | `creating-pr-on-issue` Step 6 (no separate invocation needed) |

**Refactoring / Chore:**

| # | content | activeForm | Skill |
|---|---------|------------|-------|
| 1 | Make changes | Making changes | Direct edit |
| 2 | Commit and push changes | Committing and pushing | `committing-on-issue` |
| 3 | Create pull request | Creating pull request | `creating-pr-on-issue` |
| 4 | Run self-review and post results to PR | Running self-review and posting results | `creating-pr-on-issue` Step 6 (no separate invocation needed) |

**Research:**

| # | content | activeForm | Skill |
|---|---------|------------|-------|
| 1 | Conduct research | Conducting research | `best-practices-researching` |
| 2 | Save findings to Discussion | Creating Discussion | `shirokuma-docs discussions create` |

Update each step to `in_progress` when starting and `completed` when done.
When `creating-pr-on-issue` completes (including self-review), mark Steps 3 and 4 as `completed` simultaneously.

## Workflow

### Step 1: Analyze Work

**If issue number provided:**

```bash
shirokuma-docs issues show {number}
```

Extract from the response:
- `title` - What to do
- `body` - Detailed requirements
- `labels` - Work type (feature / bug / chore / docs / research)
- `status` - Current status
- `priority` - Priority level
- `size` - Size estimate

#### Plan Requirement Check (when issue number provided)

Check whether the issue body contains a `## Plan` section (detected by `^## Plan` line prefix match).

| Plan state | Action |
|-----------|--------|
| No plan | → Delegate to `planning-on-issue` to create a plan (all issues) |
| Plan exists | → Pass the `## Plan` section as context to the implementation skill |

- Plan depth is automatically determined by `planning-on-issue` based on issue content (lightweight/standard/detailed)

#### Transition from Planning Status

When the issue status is Planning:

| Plan state | Action |
|-----------|--------|
| Planning + no plan | → Delegate to `planning-on-issue` (continue planning) |
| Planning + plan exists | → Transition to Spec Review and ask user for approval (no implicit approval) |

For the Planning + plan exists case (e.g., session interruption), display the plan summary and request confirmation.

**If text description provided:**

Classify the work type from keywords:

| Keywords | Work Type |
|----------|-----------|
| "implement", "create", "add", "build", "実装", "作成", "追加", "構築" | Implementation |
| "design", "UI", "デザイン", "印象的", "ランディング" | Design |
| "fix", "bug", "修正", "バグ" | Bug Fix |
| "refactor", "clean", "リファクタ", "整理" | Refactoring |
| "research", "investigate", "調査", "検討" | Research |
| "review", "audit", "レビュー", "チェック" | Review |
| "config", "setup", "設定", "セットアップ" | Chore |

### Step 1a: Issue Resolution (text description only)

When called with text description only, ensure an issue exists before starting work.

1. AskUserQuestion: "Do you have a corresponding issue number? If not, we'll create a new one."
   - Options: "Enter issue number", "No issue - create new"
2. Issue number provided → Join Step 1's "issue number provided" path
3. No issue → Create issue via `managing-github-items` skill (use Step 1's keyword classification for work type inference) → Join Step 1 with the created issue number

```
Text description only → Step 1a
├── AskUserQuestion: "Corresponding issue?"
├── Issue number provided → Join Step 1 (issue number path)
└── No issue
    ├── Create issue via managing-github-items
    └── Join Step 1 with created issue
```

### Step 2: Update Status (if issue number)

If the issue is not already In Progress:

```bash
shirokuma-docs issues update {number} --field-status "In Progress"
```

**Spec Review implicit approval**: If the issue's Status is Spec Review, the user invoking `/working-on-issue` is an implicit approval of the plan. Transition to In Progress without additional confirmation.

**Transition from Planning**: Follow the "Transition from Planning Status" logic above. If no plan, delegate to `planning-on-issue` (the skill handles status updates). If plan exists, transition to Spec Review and wait for approval.

### Step 3: Ensure Feature Branch

Check current git state:

```bash
git branch --show-current
```

If on `develop` (or `main`) and issue number provided, create a feature branch:

```bash
git checkout develop && git pull origin develop
git checkout -b {type}/{number}-{slug}
```

Branch type mapping:

| Label / Work Type | Branch prefix |
|------------------------|---------------|
| Feature, Implementation, Design | `feat` |
| Bug, Bug Fix | `fix` |
| Chore, Refactoring, Config | `chore` |
| Docs | `docs` |
| Research | `chore` |

If already on an appropriate feature branch, stay on it.

### Step 3b: Propose ADR for Feature M+ (Optional)

For **Feature** type issues with **Size M or larger**, suggest creating an ADR (AskUserQuestion).

### Step 4: Select and Execute Skill

Based on work type, invoke the appropriate skill:

| Work Type | Skill | Invocation |
|-----------|-------|------------|
| Implementation | `nextjs-vibe-coding` | Skill tool |
| Design | `frontend-designing` | Skill tool |
| Bug Fix | `nextjs-vibe-coding` | Skill tool |
| Refactoring | Direct (no skill) | Edit files directly |
| Research | `best-practices-researching` | Skill tool (runs as sub-agent via `context: fork`) |
| Review | `reviewing-on-issue` | Skill tool (runs as sub-agent via `context: fork`) |
| Chore | Direct (no skill) | Edit files directly |

**Pass context to the skill:**
- Issue title and body (requirements)
- Related files mentioned in the issue
- Current branch name

### Step 5: Sequential Workflow Execution

After the primary skill completes, execute the workflow chain **automatically and sequentially**. No user confirmation between steps.

**Prerequisite**: All chain steps must already be registered in TodoWrite (see "TodoWrite Registration" above).
Update each step to `in_progress` when starting and `completed` when done.

**Chain sequence by work type:**

| Work Type | Chain |
|-----------|-------|
| Implementation / Design / Bug Fix | Work → Commit → PR → Review |
| Refactoring / Chore | Work → Commit → PR → Review |
| Research | Research → Discussion |

- **Merge is NOT part of the chain**. Merge only executes on explicit user instruction (e.g., "merge this"). Never auto-merge after chain completion
- Do NOT ask the user between steps — execute each step and move to the next
- DO report what is happening at each step (one-line status)
- DO update TodoWrite status for each step (`in_progress` → `completed`)
- **Self-review loop**: After PR creation, run `reviewing-on-issue` via `creating-pr-on-issue`'s self-review chain (Step 6)
  - FAIL + Auto-fixable → auto-fix → commit → push (PR updates automatically) → re-review
  - Maximum 3 iterations (initial review + up to 2 fix-and-review cycles)
  - Stop loop if issue count increases between iterations
- The Review step uses `reviewing-on-issue` by default. If the project has additional review checklists or project-specific skills (e.g., in `.claude/skills/`), invoke them alongside `reviewing-on-issue`
- **Step 4 completion criteria**: Mark as `completed` only after `reviewing-on-issue` has saved its report AND the PR comment has been confirmed posted. Do not mark complete on Self-Review Result return alone
- **Feedback accumulation**: Record self-review finding patterns to Discussion (Reports). Propose rule creation for frequent patterns (3+ occurrences)
- If a step fails, stop the chain, report the error with completed/remaining steps summary, and return control to the user

## Arguments

| Format | Example | Behavior |
|--------|---------|----------|
| Issue number | `/working-on-issue 42` or `/working-on-issue #42` | Fetch issue, analyze type |
| Description | `/working-on-issue implement user dashboard` | Classify from text |
| No argument | `/working-on-issue` | Ask user what to work on |

## Display Format

Show a brief summary before starting work:

```markdown
## Working on: #{number} {title}

**Label:** {label} → **Skill:** {skill-name}
**Branch:** {branch-name}
**Priority:** {priority}
```

## Edge Cases

| Situation | Action |
|-----------|--------|
| Issue not found | Show error, use AskUserQuestion for correct number |
| Issue already Done/Released | Warn user, use AskUserQuestion to confirm reopen |
| Issue already In Progress | Continue without status change |
| Work type unclear | Use AskUserQuestion with work type options |
| Skill execution fails | Report error, suggest manual approach |
| Already on wrong feature branch | Use AskUserQuestion: switch branch or continue here? |
| On `main` instead of `develop` | Switch to `develop` before branching |
| No argument provided | Show active issues, use AskUserQuestion to pick |
| Chain fails mid-execution | Report completed steps and remaining steps, return control to user |

## Rule References

This skill depends on the following rules (auto-loaded from `.claude/rules/`):

| Rule | Usage |
|------|-------|
| `branch-workflow` | Branch naming, creation from `develop`, PR target |
| `project-items` | Status workflow, field requirements, body maintenance |
| `git-commit-style` | Commit message format (delegated to `committing-on-issue` skill) |

## Tool Usage

| Tool | When |
|------|------|
| AskUserQuestion | Requirement clarification, approach selection, edge case decisions (unclear work type, issue not found, branch mismatch, etc.) |
| TodoWrite | Chain step registration (required for all work), multi-issue session progress tracking |
| Bash | Git operations, `shirokuma-docs issues` commands |

**AskUserQuestion**: Use when user input is genuinely needed (requirement clarification, approach selection, edge case decisions). Do NOT use for workflow step transitions (Commit → PR → Review).

**TodoWrite**: Used for all work. Register all chain steps before starting and update each step's progress as `in_progress` → `completed`.

## Notes

- This skill is the **primary entry point** for work
- Always update issue status before starting
- Always ensure correct feature branch
- Workflow always executes sequentially (Commit → PR → Review). **Merge is NOT included**
- After chain completion, wait for explicit user instruction to merge (no auto-merge)
- Chain execution stops on error and returns control to user
- For direct work (Refactoring/Chore), no skill delegation needed
