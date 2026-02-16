# Labels Reference

## Design Principle

Work type classification is primarily handled by **Issue Types** (Organization-level Type field). Labels indicate the **affected area** as a supplementary mechanism:

| Mechanism | Role | Example |
|-----------|------|---------|
| Issue Types | **What** kind of work | Feature, Bug, Chore, Docs, Research |
| Area labels | **Where** the work applies | `area:cli`, `area:plugin` |
| Operational labels | Triage / lifecycle | `duplicate`, `invalid`, `wontfix` |

Labels are not auto-created by `create-project`. Add them manually based on the project's structure.

## Recommended Label Taxonomy

### Area Labels (optional)

Define areas based on the project's module structure. Prefix with `area:`.

| Label | Color | Description |
|-------|-------|-------------|
| `area:cli` | `#0e8a16` | Core CLI and commands |
| `area:plugin` | `#5319e7` | Plugin system (skills, rules, agents) |
| `area:github` | `#1d76db` | GitHub integration commands |
| `area:lint` | `#fbca04` | Lint and validation commands |

**Customize for your project**: Replace these with areas that match your codebase structure (e.g., `area:api`, `area:web`, `area:database`).

### Operational Labels (keep from defaults)

| Label | Color | Description |
|-------|-------|-------------|
| `duplicate` | `#cfd3d7` | This issue or pull request already exists |
| `invalid` | `#e4e669` | This doesn't seem right |
| `wontfix` | `#ffffff` | This will not be worked on |

## Default Labels to Remove

These GitHub default labels overlap with Issue Types or are not applicable:

| Label | Reason to Remove |
|-------|-----------------|
| `bug` | Use Issue Types (Bug) instead |
| `enhancement` | Use Issue Types (Feature) instead |
| `documentation` | Use Issue Types (Docs) instead |
| `good first issue` | Not applicable (private repo / AI-assisted) |
| `help wanted` | Not applicable (private repo / AI-assisted) |
| `question` | Use Discussions instead |

## Label Assignment Rules

1. **Area labels are optional** - Not every issue needs an area label. Use when the area is not obvious from the title.
2. **Multiple area labels are allowed** - Cross-cutting issues may span multiple areas (e.g., `area:cli` + `area:github`).
3. **Operational labels are applied during triage** - `duplicate`, `invalid`, `wontfix` are set when closing or redirecting issues.
4. **AI should suggest area labels** - When creating issues, suggest an area label if the scope is clear.

## Notes

- Labels are repository-level settings
- Labels appear in issue lists, making them useful for quick visual filtering
- The `gh label` commands work without special OAuth scopes (standard `repo` scope is sufficient)
- Work type classification is primarily handled by Issue Types
