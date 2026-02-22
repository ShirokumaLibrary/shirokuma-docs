---
name: setting-up-project
description: Interactive end-to-end project initial setup. Use when "initial setup", "set up project", "setup project", "new project".
allowed-tools: Bash, AskUserQuestion, Read, Write, Glob, TodoWrite
---

# Project Setup

Interactive end-to-end initial setup. Integrates `github-project-setup` and `project-config-generator` functionality.

## Workflow

Track progress with TodoWrite (5 steps).

### Step 1: Repository Check

Detect local/remote repository:

```bash
git remote -v
gh repo view --json name,owner 2>/dev/null
```

| State | Action |
|-------|--------|
| Remote exists | Continue |
| No remote | Suggest `gh repo create` |
| Git not initialized | Suggest `git init` → `gh repo create` |

### Step 2: Config File Generation

Create `shirokuma-docs.config.yaml` interactively via AskUserQuestion:

1. Project type (single app / monorepo)
2. App path (`apps/web`, `.`, etc.)
3. Language setting (Japanese / English)

```bash
shirokuma-docs init --project {path}
```

### Step 3: Plugin Installation

Install skills/rules + language setting:

```bash
shirokuma-docs init --with-skills --project {path}
```

### Step 4: GitHub Projects Setup

Execute `github-project-setup` functionality directly:

```bash
shirokuma-docs projects create-project --title "{project-name}" --lang={en|ja}
```

Guide manual setup items:
- Issue Types configuration
- Discussion category creation
- Built-in automation enablement
- View renaming

See [docs/manual-steps.md](docs/manual-steps.md) for details.

### Step 5: Project Config Generation

Tech stack detection + skill-specific config directory creation:

```bash
# Execute project-config-generator workflow
Skill: project-config-generator
```

### Verification

Verify all steps complete:

```bash
shirokuma-docs session check --setup
```

## Re-run Support

Detect existing settings at each step:

| Detection | AskUserQuestion Options |
|-----------|------------------------|
| Config exists | Overwrite / Skip / Update |
| Project exists | Skip / Add fields |
| Plugin exists | Update / Skip |

## Reference Documents

| Document | Content | When to Read |
|----------|---------|--------------|
| [reference/setup-checklist.md](reference/setup-checklist.md) | Setup checklist | During setup |
| [docs/manual-steps.md](docs/manual-steps.md) | Manual setup steps | Step 4 |

## Next Steps

```
Setup complete. Next steps:
→ `/working-on-issue` to start your first Issue
→ `/planning-on-issue` to create a plan
```

## Notes

- **`github-project-setup` is deprecated** — use this skill
- Confirm with user before executing each step
- `project-config-generator` maintained as internal utility
