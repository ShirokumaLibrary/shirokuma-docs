# Labels Reference

## Design Principle

Labels and Type fields serve different purposes:

| Mechanism | Role | Axis | Example |
|-----------|------|------|---------|
| Type (Project field / Issue Types) | **What** kind of work | Category | Bug, Feature, Chore |
| Labels | **Where** the work applies | Cross-cutting attribute | area:cli, area:plugin |

Labels should NOT duplicate Type. If a label maps 1:1 to a Type value, delete the label and use Type instead.

## Recommended Label Taxonomy

### Area Labels (required)

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

These serve a lifecycle/triage purpose that Type does not cover.

## Default Labels to Remove

These GitHub default labels overlap with Type or are not applicable:

| Label | Reason to Remove |
|-------|-----------------|
| `bug` | Redundant with Type: Bug |
| `enhancement` | Redundant with Type: Feature |
| `documentation` | Redundant with Type: Docs |
| `good first issue` | Not applicable (private repo / AI-assisted) |
| `help wanted` | Not applicable (private repo / AI-assisted) |
| `question` | Use Discussions instead |

## Label Assignment Rules

1. **Area labels are optional** - Not every issue needs an area label. Use when the area is not obvious from the title.
2. **Multiple area labels are allowed** - Cross-cutting issues may span multiple areas (e.g., `area:cli` + `area:github`).
3. **Operational labels are applied during triage** - `duplicate`, `invalid`, `wontfix` are set when closing or redirecting issues.
4. **AI should suggest area labels** - When creating issues, suggest an area label if the scope is clear.

## Setup

**Note**: The commands below use `gh label` directly. If `shirokuma-docs` CLI is installed, use `shirokuma-docs repo labels --create` instead for consistency with other GitHub operations.

### Delete Redundant Labels

```bash
# Remove labels that overlap with Type
for label in bug enhancement documentation "good first issue" "help wanted" question; do
  gh label delete "$label" --yes
done
```

### Create Area Labels

```bash
gh label create "area:cli" --color "0e8a16" --description "Core CLI and commands"
gh label create "area:plugin" --color "5319e7" --description "Plugin system (skills, rules, agents)"
gh label create "area:github" --color "1d76db" --description "GitHub integration commands"
gh label create "area:lint" --color "fbca04" --description "Lint and validation commands"
```

## Notes

- Labels are repository-level settings (unlike Issue Types which are organization-level)
- Labels appear in issue lists, making them useful for quick visual filtering
- The `gh label` commands work without special OAuth scopes (standard `repo` scope is sufficient)
- When migrating from Type-duplicate labels, remove the labels from existing issues first, then delete the label definitions
