# Setup Checklist

## Required Items

| # | Item | Verification | Automation |
|---|------|-------------|------------|
| 1 | Git repository initialized | `git remote -v` | Automated |
| 2 | GitHub remote repository | `gh repo view` | Automated |
| 3 | `shirokuma-docs.config.yaml` | File existence check | Automated |
| 4 | Plugin installation | `claude plugin list` | Automated |
| 5 | `.claude/rules/shirokuma/` deploy | Directory existence check | Automated |
| 6 | GitHub Projects V2 | `shirokuma-docs projects list` | Automated |
| 7 | Status/Priority/Size fields | `session check --setup` | Automated |
| 8 | Discussion categories | `session check --setup` | Manual |
| 9 | Issue Types | Check in GitHub UI | Manual |
| 10 | Built-in automations | `projects workflows` | Manual |

## Verification Command

```bash
# Batch verification
shirokuma-docs session check --setup
```

## Common Issues

| Problem | Solution |
|---------|----------|
| `missing scopes [project]` | `gh auth refresh -s project,read:project` |
| Config file not found | `shirokuma-docs init --project .` |
| Plugin outdated | `shirokuma-docs update` |
| Missing Discussion categories | Create manually in GitHub UI |
