<!-- managed-by: shirokuma-docs@0.1.0 -->

# Branch Workflow

## Branch Model

| Branch | Role | Branches from | Merges to | Persistent | Protected |
|--------|------|---------------|-----------|-----------|-----------|
| `main` | Production releases. Tagged for each version | - | - | Yes | Yes |
| `develop` | Integration. Default branch for PRs | `main` (initial) | `main` (release PR) | Yes | Yes |
| `feat/*`, `fix/*`, `chore/*`, `docs/*` | Daily work | `develop` | `develop` (PR) | No | No |
| `hotfix/*` | Urgent production fix | `main` | `main` (PR), then cherry-pick to `develop` | No | No |
| `release/X.x` | Old major maintenance (only when needed) | tag | stays on branch (tag) | Conditional | Yes |

**Key principles:**
- `develop` is the **default branch** on GitHub (PR target)
- `main` reflects **production state** only
- Feature branches always branch from `develop`
- Direct commits to `develop` or `main` are not allowed

## Base Branch Detection

For daily work, the base branch is `develop`. Detect dynamically:

```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
```

If the above fails (e.g., shallow clone), fall back to:

```bash
gh repo view --json defaultBranchRef -q .defaultBranchRef.name
```

The result should be `develop`. If it returns `main`, the default branch has not been changed yet (see Default Branch Setup below).

## Branch Naming

### Feature Branches

```
{type}/{issue-number}-{slug}
```

| Type | When |
|------|------|
| `feat` | Feature, Enhancement |
| `fix` | Bug fix |
| `chore` | Chore, Refactor, Config, Research |
| `docs` | Documentation |

**Slug rules:**
- Derive from issue title
- Lowercase, kebab-case
- Max 40 characters
- English only

**Examples:**
```
feat/39-branch-workflow-rules
fix/34-cross-repo-project-resolution
chore/27-plugin-directory-structure
docs/32-session-naming-convention
```

### Hotfix Branches

```
hotfix/{issue-number}-{slug}
```

Branch from `main`, not `develop`. Used for urgent production fixes only.

### Release Maintenance Branches

```
release/{major}.x
```

Created from a tag when old major version needs a patch. Not used for regular releases.

## Daily Workflow

1. Branch from `develop`
2. Commit changes during session
3. Push branch and create PR to `develop`
4. User reviews and merges PR

### 1. Branch Creation (Session Start)

When user selects an item to work on:

```bash
git checkout develop
git pull origin develop
git checkout -b {type}/{issue-number}-{slug}
```

- Determine `{type}` from issue's Type field (Feature->feat, Bug->fix, Chore->chore, Docs->docs)
- Generate `{slug}` from issue title

### 2. Development (During Session)

- Commit frequently with descriptive messages
- Reference issue number in commits: `feat: add branch workflow rules (#39)`
- Follow existing commit message conventions

### 3. PR Creation (Session End)

When work is complete or session ends:

```bash
git push -u origin {branch-name}
gh pr create --base develop --title "{title}" --body "{body}"
```

- PR title: concise summary (under 70 characters)
- PR body: Summary bullets, test plan, linked issues
- Link issue: include `Closes #{number}` or `Refs #{number}` in body
- Status moves to **Review**

### 4. Review and Merge

- User reviews the PR on GitHub
- **AI MUST NOT merge PRs without explicit user instruction** - Enforced by PreToolUse hook (see Destructive Command Protection below)
- Merge via squash merge (recommended) only after user approval
- Branch is deleted after merge
- Status moves to **Done** after merge

## Hotfix Workflow

For urgent production fixes that cannot wait for the normal develop cycle.

### When to Use

- Critical bug in production (`main`)
- Security vulnerability requiring immediate patch
- NOT for regular bug fixes (use normal workflow via `develop`)

### Steps

```bash
# 1. Branch from main
git checkout main
git pull origin main
git checkout -b hotfix/{issue-number}-{slug}

# 2. Fix the issue, commit

# 3. Create PR to main
git push -u origin hotfix/{issue-number}-{slug}
gh pr create --base main --title "hotfix: {description}" --body "{body}"

# 4. After merge to main, sync to develop
git checkout develop
git pull origin develop
git cherry-pick {hotfix-commit-hash}
# Or: git merge main (if multiple commits)
git push origin develop
```

**Important:** Always sync the fix to `develop` after merging to `main` to prevent regression.

## Release Workflow

Releases are created by merging `develop` into `main`.

### Steps

```bash
# 1. Create PR from develop to main
gh pr create --base main --head develop --title "release: v{version}" --body "{changelog}"

# 2. After PR merge, tag the release
git checkout main
git pull origin main
git tag v{version}
git push origin v{version}
```

### Tagging Convention

```
v{major}.{minor}.{patch}
```

All versions are recorded as tags. Release branches are NOT created for regular releases.

## Maintenance Branches

### When to Create `release/X.x`

Only when ALL of these conditions are met:
- A new major version has been released
- The old major version still needs patches
- Users cannot upgrade to the new major version

### How to Use

```bash
# Create from the last tag of that major version
git checkout v1.2.3
git checkout -b release/1.x
git push -u origin release/1.x

# Apply fixes on this branch
git checkout release/1.x
git checkout -b fix/{issue-number}-{slug}
# ... fix and PR to release/1.x

# Tag the patch release
git tag v1.2.4
git push origin v1.2.4
```

Do NOT merge `release/X.x` back to `develop` or `main`.

## Default Branch Setup

To switch the default branch from `main` to `develop`:

### 1. Create the develop branch (if it doesn't exist)

```bash
git checkout main
git checkout -b develop
git push -u origin develop
```

### 2. Change default branch on GitHub

```bash
gh repo edit --default-branch develop
```

Or: GitHub Settings > General > Default branch > Change to `develop`

### 3. Update local HEAD reference

```bash
git remote set-head origin develop
```

### 4. Protect both branches

Ensure branch protection rules are set for both `main` and `develop`:
- Require PR reviews before merging
- Require status checks to pass
- No direct pushes

## Rules

1. **Always branch from develop** - Ensure `develop` is up to date before branching
2. **One branch per issue** - Do not mix unrelated changes
3. **Push before session end** - Unpushed work risks being lost
4. **PR required for merge** - No direct pushes to `develop` or `main`
5. **Never merge without user approval** - Enforced by PreToolUse hook
6. **Delete branch after merge** - Keep repository clean
7. **PR to develop for daily work** - Only hotfixes target `main` directly
8. **Tag every release** - All versions recorded as tags on `main`

## Destructive Command Protection

The shirokuma-skills-en plugin includes a PreToolUse hook that **blocks** destructive commands before execution. This is not advisory — the commands are denied at the tool level.

### Default Blocked Commands

Defined in `hooks/blocked-commands.json`:

| Rule ID | Blocked Command | Reason |
|---------|-----------------|--------|
| `pr-merge` | `gh pr merge` / `issues merge` | PR merge requires explicit user approval |
| `force-push` | `git push --force` / `git push -f` | Force push overwrites remote history |
| `hard-reset` | `git reset --hard` | Discards all uncommitted changes |
| `discard-worktree` | `git checkout .` / `git restore .` | Discards working tree changes |
| `clean-untracked` | `git clean -f` | Deletes untracked files |
| `force-delete-branch` | `git branch -D` | Force deletes a branch |

When blocked, the AI receives a denial reason and must ask the user for approval before retrying.

### Project Override

Projects can disable specific rules by creating `.claude/shirokuma-hooks.json`:

```json
{
  "disabled": ["pr-merge"]
}
```

This disables the listed rule IDs, allowing those commands to run. Other rules remain active.

### False-Positive Prevention

The hook strips quoted strings from commands before pattern matching. Text inside `--body "..."` or similar arguments does not trigger blocks.

### Files

- `hooks/hooks.json` — Hook registration
- `hooks/blocked-commands.json` — Rule definitions (default config)
- `hooks/scripts/block-destructive-commands.sh` — Hook script

## Edge Cases

| Situation | Action |
|-----------|--------|
| Already on a feature branch | Continue working, skip branch creation |
| Multiple issues in one session | Create separate branches, or group related items |
| Uncommitted changes on develop | Stash or commit before branching |
| Branch already exists for issue | Switch to existing branch |
| Conflict with develop | Rebase before PR: `git rebase develop` |
| Default branch is still `main` | Follow Default Branch Setup section |
| Need to fix production urgently | Use Hotfix Workflow |
