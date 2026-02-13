# Plugin Cache Management

## Architecture

Claude Code loads skills from the **global cache**, not the project-local `.claude/plugins/` directory.

```
plugin/ (bundled source)
    ↓ shirokuma-docs update (= update-skills --sync)
.claude/plugins/shirokuma-skills-en/   (project-local copy)
    ↓ claude plugin install/update
~/.claude/plugins/cache/...         (global cache — Claude Code reads from here)
```

## Recommended: `shirokuma-docs update`

`shirokuma-docs update` is a shortcut for `update-skills --sync`. It updates skills, rules, and syncs the global cache in one command.

```bash
# Recommended (shortcut)
shirokuma-docs update

# Equivalent (full command)
shirokuma-docs update-skills --sync
```

## After `update` Adds New Skills

When `shirokuma-docs update` reports new skills added, the global cache must also be updated:

```bash
# If plugin version changed
claude plugin update shirokuma-skills-en@shirokuma-library --scope project

# If plugin version is the same (update reports "already at latest")
claude plugin uninstall shirokuma-skills-en@shirokuma-library --scope project
claude plugin install shirokuma-skills-en@shirokuma-library --scope project
```

A new session is required after cache update for skills to appear.

## When to Guide the User

| Symptom | Cause | Action |
|---------|-------|--------|
| New skill not in skill list | Cache not updated | `claude plugin uninstall` + `install` |
| `plugin update` says "already at latest" | Same version number | Use uninstall + install instead |
| Skill works in one project but not another | Plugin scope mismatch | Check `--scope` (user vs project) |

## Rules

1. **Never write directly to the global cache** — use `claude plugin` commands
2. **Use `shirokuma-docs update`** — shortcut for `update-skills --sync`. Always remind about cache sync when new skills are added
3. **Version-same updates require uninstall + install** — `plugin update` skips when version unchanged
