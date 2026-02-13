# Plugin Cache Management

## Architecture

Claude Code loads skills from the **global cache**, not the project directory. Plugins are distributed via the `shirokuma-plugins` marketplace repository.

```
ShirokumaLibrary/shirokuma-plugins (marketplace repo)
    ↓ claude plugin install/update
~/.claude/plugins/cache/shirokuma-library/...  (global cache — Claude Code reads from here)
    ↓ shirokuma-docs init / update
.claude/rules/shirokuma/  (deployed rules — project-local, gitignored)
```

**Key change (#486):** The project-local `.claude/plugins/` directory is no longer used. Plugins are fetched directly from the marketplace to the global cache.

## Recommended: `shirokuma-docs update`

`shirokuma-docs update` is a shortcut for `update-skills --sync`. It updates the global cache and redeploys rules in one command.

```bash
# Recommended (shortcut)
shirokuma-docs update

# Equivalent (full command)
shirokuma-docs update-skills --sync
```

## Initial Setup

`shirokuma-docs init --with-skills` automatically:
1. Registers the marketplace (`claude plugin marketplace add`)
2. Installs plugins to global cache (`claude plugin install`)
3. Deploys rules to `.claude/rules/shirokuma/`

## Manual Cache Operations

```bash
# Update plugin to latest version
claude plugin update shirokuma-skills-en@shirokuma-library --scope project

# Force reinstall (same version but updated content)
claude plugin uninstall shirokuma-skills-en@shirokuma-library --scope project
claude plugin install shirokuma-skills-en@shirokuma-library --scope project
```

A new session is required after cache update for skills to appear.

## When to Guide the User

| Symptom | Cause | Action |
|---------|-------|--------|
| New skill not in skill list | Cache not updated | `shirokuma-docs update` or `claude plugin uninstall` + `install` |
| `plugin update` says "already at latest" | Same version number | Use uninstall + install instead |
| Skill works in one project but not another | Plugin scope mismatch | Check `--scope` (user vs project) |
| `.claude/plugins/` directory still exists | Legacy installation | `shirokuma-docs update` will auto-cleanup |

## Rules

1. **Never write directly to the global cache** — use `claude plugin` commands
2. **Use `shirokuma-docs update`** — updates cache + redeploys rules in one command
3. **Version-same updates require uninstall + install** — `plugin update` skips when version unchanged
4. **`.claude/plugins/` is legacy** — if present, `shirokuma-docs update` will clean it up automatically
