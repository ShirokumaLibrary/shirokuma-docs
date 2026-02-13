---
name: committing-on-issue
description: Stage, commit, push changes with optional PR creation chain. Also handles PR merge with automatic Issue status update. Use when "commit changes", "push changes", "commit and create PR", "merge PR", "merge this PR".
allowed-tools: Bash, Read, Grep, Glob, AskUserQuestion
---

# Committing

Stage, commit, and optionally push changes to the remote.

## Workflow

### Step 1: Review Changes

```bash
git status --short
git diff --stat
git branch --show-current
```

Display a summary of changes to the user.

### Step 2: Stage Files

Stage specific files relevant to the current work. Prefer explicit file paths over `git add -A`.

```bash
git add {file1} {file2} ...
```

**Do NOT stage:**
- `.env`, credentials, or secrets
- Large binary files
- Unrelated changes from other work

If unsure which files to stage, use AskUserQuestion to present the file list as options.

### Step 2.5: Plugin Version Bump Check

Check if staged files include `plugin/` changes (excluding `.gitkeep`):

```bash
git diff --cached --name-only | grep '^plugin/' | grep -v '\.gitkeep$'
```

If plugin files are staged:
1. Check if `package.json` version has been appropriately bumped
2. If not bumped: follow `plugin-version-bump` rule to bump + run `node scripts/sync-versions.mjs`
3. If already bumped: verify all `plugin.json` files match `package.json` version

### Step 3: Write Commit Message

Follow Conventional Commits format:

```
{type}: {description} (#{issue-number})

{optional body}
```

| Type | When |
|------|------|
| `feat` | New feature or enhancement |
| `fix` | Bug fix |
| `refactor` | Code restructuring |
| `docs` | Documentation |
| `test` | Tests |
| `chore` | Config, tooling |

**Rules** (see `git-commit-style` rule for details):
- First line under 72 characters
- Reference issue number if applicable
- Body for complex changes only
- Do NOT include `Co-Authored-By` signature

### Step 4: Commit

```bash
git commit -m "$(cat <<'EOF'
{type}: {description} (#{issue-number})

{optional body}
EOF
)"
```

### Step 5: Push (if on feature branch)

If on a feature branch (not `develop` or `main`), push automatically:

```bash
git push -u origin {branch-name}
```

If on `develop` or `main`, do NOT push automatically. Inform the user that direct pushes to protected branches should be avoided per branch-workflow rules.

### Step 6: Confirm

```markdown
## Committed

**Branch:** {branch-name}
**Commit:** {hash} {message}
**Files:** {count} files changed
**Pushed:** {yes/no}
```

### Step 7: PR Chain (after push)

After a successful push on a feature branch, determine whether to chain into PR creation.

**PR keyword detection**: Check the user's **initial message** (the `/committing-on-issue` invocation and surrounding text) for PR-related keywords:

| Language | Keywords |
|----------|----------|
| Japanese | "PR作って", "PR作成", "プルリクエスト", "PRも作って", "PRも" |
| English | "pull request", "create PR", "open PR" |

**Pre-check before offering PR**:

```bash
gh pr list --head {branch-name} --json number,url --jq '.[0]'
```

If a PR already exists for this branch, show the existing URL and skip:

```markdown
PR already exists: {url}
```

**If PR keywords detected AND no existing PR:**

Auto-invoke the `creating-pr-on-issue` skill via the Skill tool. Pass the current branch and related issue number as context.

**If no PR keywords AND no existing PR:**

Suggest the next step without auto-executing:

```markdown
Branch pushed. Create a PR?
→ `/creating-pr-on-issue` to open a pull request to develop
```

**If NOT on a feature branch (pushed was skipped):**

Skip this step entirely.

### Step 8: Merge Chain

Handles PR merge with automatic Issue status update. Activated by merge keywords or when invoked from `working-on-issue` orchestration.

**Merge keyword detection**: Check the user's message for:

| Language | Keywords |
|----------|----------|
| Japanese | "マージして", "マージ", "merge" |
| English | "merge PR", "merge this", "merge it" |

**If merge keywords detected (independent of commit flow):**

1. **Merge the PR and update related Issues**:

```bash
shirokuma-docs issues merge --head {current-branch}
```

This single command handles: resolve PR from branch name, squash merge, extract linked Issues from PR body (`Closes/Fixes/Resolves #N`), update their Project Status to "Done", and delete the branch.

**Status update idempotency**: `issues merge` CLI automatically updates related Issue Project Status to Done. If `ending-session --done` runs for the same issue later, it operates idempotently (no-op if already Done).

If no PR found for the branch, the CLI reports an error. Inform the user and stop.

Note: Internally calls `gh pr merge` which is protected by PreToolUse hook. The user will be prompted for confirmation.

2. **Switch to develop**:

```bash
git checkout develop && git pull origin develop
```

3. **Confirm**:

```markdown
## Merged

**PR:** (as reported by CLI output) → {base-branch}
**Issues updated:** (as reported by CLI output)
**Branch:** deleted, switched to develop
```

**If merge is part of commit flow** (e.g., user says "コミットしてマージして"):

Execute Steps 1-6 → Step 7 (PR Chain) → Step 8 (Merge Chain) sequentially.

## Arguments

If invoked with a message argument (e.g., `/committing-on-issue fix typo in config`):
- Use the provided text as the commit message basis
- Still review changes before committing
- PR-related keywords in the argument trigger the PR chain (e.g., `/committing-on-issue fix typo PRも作って`)
- Merge keywords trigger the merge chain (e.g., `/committing-on-issue コミットしてマージして`)

## Edge Cases

| Situation | Action |
|-----------|--------|
| No changes to commit | Inform user, do nothing |
| On develop or main | Commit but warn about pushing; suggest creating a feature branch |
| Merge conflicts | Inform user, do not auto-resolve |
| Pre-commit hook fails | Fix issue, create NEW commit (never amend) |
| Mixed changes (multiple issues) | Use AskUserQuestion to select files per issue |
| PR already exists for branch | Show existing PR URL, skip chain |
| `gh` CLI not available | Skip PR chain, inform user |
| No PR for current branch (merge) | Inform user, skip merge |
| PR has unresolved reviews | Warn user, ask for confirmation |
| No issue references in PR body | Skip status update, inform user |

## Notes

- Always review changes before committing
- Never use `git add -A` or `git add .` without review
- Never amend previous commits unless explicitly asked
- Never force push
- Push is automatic on feature branches, skipped on `develop` and `main`
- PR chain activates only on direct invocation with PR keywords; does not interfere with `working-on-issue` orchestration
- Merge chain can be invoked standalone (just "マージして") or chained with commit/PR
- After merge, `shirokuma-docs issues merge` automatically updates related Issue status to Done
