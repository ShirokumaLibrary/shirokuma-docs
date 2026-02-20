---
name: publishing
description: Manages public releases via shirokuma-docs repo-pairs CLI. Handles status checks, dry-run previews, release execution, and .shirokumaignore configuration.
allowed-tools: Bash, Read, Grep, Glob, AskUserQuestion, TodoWrite
---

# Publishing

Manages the release workflow from private development repositories to public repositories using `shirokuma-docs repo-pairs` CLI.

## When to Use

Automatically invoke when the user:
- Wants to "publish" or "release" to the public repo
- Says "公開リポに反映", "パブリックに出して", "リリースして"
- Asks about release status or diff with public repo
- Mentions "repo-pairs", ".shirokumaignore", or public repository sync

## Prerequisites

- `shirokuma-docs` CLI installed and available in PATH
- `gh` CLI authenticated (`gh auth status`)
- `shirokuma-docs.config.yaml` exists in project root
- Repo pair configured (`shirokuma-docs repo-pairs list`)

## CLI Reference

### Core Commands

```bash
# List all configured repo pairs
shirokuma-docs repo-pairs list

# Check release status (latest tags on both repos)
shirokuma-docs repo-pairs status <alias>

# Preview release (no changes made)
shirokuma-docs repo-pairs release <alias> --tag <version> --dry-run

# Execute release
shirokuma-docs repo-pairs release <alias> --tag <version>

# Verbose output for debugging
shirokuma-docs repo-pairs release <alias> --tag <version> -v
```

### Initialize a New Repo Pair

```bash
shirokuma-docs repo-pairs init <alias> \
  --private <owner/repo> \
  --public <owner/repo> \
  --exclude ".claude/" --exclude "docs/internal/"
```

Configuration is stored in `shirokuma-docs.config.yaml`.

## Workflow

### Step 1: Pre-Release Checks

Run these checks before any release:

```bash
# 1. Verify clean working directory
git status

# 2. Check current release status
shirokuma-docs repo-pairs status <alias>

# 3. Review what will be excluded
cat .shirokumaignore

# 4. Preview the release
shirokuma-docs repo-pairs release <alias> --tag <version> --dry-run
```

Report findings to the user:
- Current public version (latest tag)
- Proposed new version
- Files that will be excluded
- Any uncommitted changes (must be committed first)

### Step 2: Version Determination

Use `AskUserQuestion` to confirm the version number with the user.

Follow semantic versioning:

| Change Type | Version Bump | Example |
|-------------|-------------|---------|
| Breaking changes | Major | v1.0.0 → v2.0.0 |
| New skills/rules, features | Minor | v0.1.0 → v0.2.0 |
| Bug fixes, typo fixes | Patch | v0.1.0 → v0.1.1 |

Suggest a version based on changes since last release:

```bash
# Find commits since last tag (on private repo)
git log $(git describe --tags --abbrev=0 2>/dev/null || echo "HEAD~10")..HEAD --oneline

# If no tags exist on private, check public repo's latest tag
shirokuma-docs repo-pairs status <alias>
```

### Step 3: Execute Release

```bash
shirokuma-docs repo-pairs release <alias> --tag <version>
```

The CLI handles:
1. Clone private repo to temp directory
2. Remove files matching `.shirokumaignore` and `--exclude` patterns
3. Remove `.shirokumaignore` itself and `.claude/` (default exclusions)
4. Push to public repo with tag

### Step 4: Post-Release Verification

```bash
# Verify the release tag
shirokuma-docs repo-pairs status <alias>

# Check public repo contents via GitHub API
gh repo view <public-owner/repo> --json description
gh api repos/<public-owner/repo>/git/trees/main?recursive=1 -q '.tree[].path' | head -30
```

Report to the user:
- Release tag created
- Public repo URL
- File count in public repo

## File Exclusion

### .shirokumaignore

Gitignore-syntax file listing patterns to exclude from public releases.

```
# Development config
CLAUDE.md
shirokuma-docs.config.yaml

# Repo-specific CI/templates
.github/
```

### Default Exclusions (always applied by CLI)

| Pattern | Reason |
|---------|--------|
| `.shirokumaignore` | Meta file, not for public |
| `.claude/` | Project-specific AI config |
| `.mcp.json` | Local MCP server config |

### Exclude via Config (repo-pairs init)

Patterns set during `repo-pairs init` are stored in config and always applied:

```bash
shirokuma-docs repo-pairs list  # Shows configured exclude patterns
```

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `repo pair not found` | Alias not configured | Run `repo-pairs init` |
| `tag already exists` | Version already released | Increment version |
| `working directory not clean` | Uncommitted changes | Commit or stash first |
| `authentication failed` | gh not logged in | Run `gh auth login` |
| `public repo not found` | Repo doesn't exist | Create repo on GitHub first |
| `.shirokumaignore not supported` | CLI version too old | Use manual workflow (see below) |

## Manual Workflow (Fallback)

If `repo-pairs release` fails or `.shirokumaignore` is not yet supported:

```bash
ALIAS="<alias>"
PUBLIC_REPO="<owner/repo>"
VERSION="<version>"

TMPDIR=$(mktemp -d)
rsync -a \
  --exclude='.git' \
  --exclude='.claude/' \
  --exclude='.github/' \
  --exclude='.shirokumaignore' \
  --exclude='CLAUDE.md' \
  --exclude='shirokuma-docs.config.yaml' \
  --exclude='.mcp.json' \
  "$(pwd)/" "$TMPDIR/"

cd "$TMPDIR"
git init && git add -A
git commit -m "$VERSION: Release"
git tag "$VERSION"
git remote add origin "git@github.com:$PUBLIC_REPO.git"
git push -u origin main --tags --force
cd - && rm -rf "$TMPDIR"
```

**Important**: Always confirm with the user before using `--force` push.

## Additional Release Targets

### shirokuma-plugins (marketplace)

Publish plugins to the marketplace repository. For production releases, use `release-production.mjs`. For staging, use `publish-staging.mjs`.

```bash
# Production release (main branch)
node .claude/skills/release/release-production.mjs plugins

# Staging (staging branch)
node .claude/skills/staging-publish/publish-staging.mjs plugins

# Dry run
node .claude/skills/release/release-production.mjs plugins --dry-run
```

### npm publish

Publish package to npm registry via `release-production.mjs`.

```bash
# Dry run
node .claude/skills/release/release-production.mjs npm --dry-run

# Alpha release (default)
node .claude/skills/release/release-production.mjs npm

# With custom tag
node .claude/skills/release/release-production.mjs npm --npm-tag latest
```

#### npm Tag Policy

| Phase | npm publish | latest tag |
|-------|-------------|------------|
| Pre-stable (current) | `--npm-tag alpha` (default) → auto `dist-tag add ... latest` | Points to latest alpha |
| Post-stable | alpha uses `--npm-tag alpha` only, stable uses `--npm-tag latest` | Points to stable |

### Full Release Checklist

Use the `release-shirokuma-docs` local skill to orchestrate all 3 targets:

| # | Target | Command | Done |
|---|--------|---------|------|
| 1 | GitHub Public repo | `shirokuma-docs repo-pairs release <alias> --tag <version>` | |
| 2 | shirokuma-plugins | `node .claude/skills/release/release-production.mjs plugins` | |
| 3 | npm registry | `node .claude/skills/release/release-production.mjs npm` | |

## Notes

- Use `TodoWrite` for progress tracking (per release target + verification)
- Do not execute a release without a dry run (`--dry-run`) first
- Do not release when the working directory is not clean
- Verify all 3 release targets are covered

## Quick Commands

```bash
# Check status
"release status" / "リリース状況確認"

# Dry run
"preview release" / "リリースプレビュー"

# Execute
"release v0.2.0" / "v0.2.0 をリリース"

# Full workflow
"publish to public repo" / "パブリックに反映"
```
