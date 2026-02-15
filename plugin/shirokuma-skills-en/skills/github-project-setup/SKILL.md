---
name: github-project-setup
description: Automates GitHub Project initial setup with Status, Priority, Type, and Size fields. Use when "project setup", "GitHub Project setup", or starting a new project with kanban workflow.
allowed-tools: Bash, Read, Glob
---

# GitHub Project Setup

Automates GitHub Project initial setup including Status workflow, Priority, Type, and Size custom fields.

## When to Use

- Creating a new GitHub Project
- Setting up a kanban workflow
- When user says "project setup", "プロジェクト作成", or "GitHub Project"

## Workflow

### Step 1: Check Permissions

```bash
gh auth status
```

If permission is missing, ask user to run:

```bash
gh auth refresh -s project,read:project
```

### Step 2: Get Repository Info

```bash
OWNER=$(gh repo view --json owner -q '.owner.login' 2>/dev/null)
REPO=$(gh repo view --json name -q '.name' 2>/dev/null)
```

### Step 3: Create Project

```bash
PROJECT_NAME="${1:-$REPO}"
gh project create --owner $OWNER --title "$PROJECT_NAME" --format json
```

### Step 4: Link to Repository

```bash
gh project link $PROJECT_NUMBER --owner $OWNER --repo $OWNER/$REPO
```

This makes the project accessible from the repository's Projects tab.

### Step 5: Get Field IDs

```bash
PROJECT_NUMBER=$(gh project list --owner $OWNER --format json | jq -r '.projects[0].number')
FIELD_ID=$(gh project field-list $PROJECT_NUMBER --owner $OWNER --format json | jq -r '.fields[] | select(.name=="Status") | .id')
PROJECT_ID=$(gh project view $PROJECT_NUMBER --owner $OWNER --format json | jq -r '.id')
```

### Step 6: Configure All Fields

Use the CLI command to auto-configure fields:

```bash
shirokuma-docs projects setup --lang={en|ja}
```

`--project-id` and `--field-id` are auto-detected. To specify manually:

```bash
shirokuma-docs projects setup \
  --lang={en|ja} \
  --field-id=$FIELD_ID \
  --project-id=$PROJECT_ID
```

**Fields created**:

| Field | Options |
|-------|---------|
| Status | Icebox → Backlog → Spec Review → Ready → In Progress ⇄ Pending → Review → Testing → Done / Not Planned → Released |
| Priority | Critical / High / Medium / Low |
| Type | Feature / Bug / Chore / Docs / Research |
| Size | XS / S / M / L / XL |

Language dictionaries are built into the CLI command.

### Step 7: Issue Types Setup

GitHub Issue Types are organization-level settings (not project-level). They are configured via the GitHub UI by organization owners.

**Note**: Issue Types are only available for organization repositories, not personal repositories.

**Check if Issue Types are already configured:**

Ask the user: "Has your organization set up Issue Types? (Settings → Issue Types)"

**If not configured, guide the user:**

1. Navigate to `https://github.com/organizations/{org}/settings/issue-types`
2. Default types (already exist): Task, Bug, Feature
3. Add custom types:

| Type | Description | Color |
|------|-------------|-------|
| Chore | Maintenance, config, tooling, or refactoring | Gray |
| Docs | Documentation improvements or additions | Blue |
| Research | Investigation, spike, or exploration | Purple |

**Important**: Issue Types are an organization-wide setting. All repositories in the organization share the same types. This step only needs to be done once per organization.

See [reference/issue-types.md](reference/issue-types.md) for details and migration guide.

### Step 8: Label Setup (Optional)

Clean up default labels and create area-based labels matching the project structure.

1. **Delete redundant labels** that duplicate the Type field (bug, enhancement, documentation)
2. **Delete inapplicable labels** (good first issue, help wanted, question)
3. **Create area labels** matching the project's module structure:

```bash
gh label create "area:{module}" --color "{color}" --description "{description}"
```

**Keep operational labels**: `duplicate`, `invalid`, `wontfix` (lifecycle/triage purpose).

See [reference/labels.md](reference/labels.md) for full taxonomy and recommended colors.

### Step 9: Enable Built-in Automations

Enable recommended automations for the project. These cannot be set via API — guide the user to the GitHub UI.

**Recommended workflows to enable:**

| Workflow | Target Status | Purpose |
|----------|--------------|---------|
| Item closed | Done | Auto-Done when issue is closed |
| Pull request merged | Done | Auto-Done when PR merges |

**Check current status:**

```bash
shirokuma-docs projects workflows
```

**Guide the user:**

1. Navigate to: `https://github.com/orgs/{owner}/projects/{number}/settings/workflows`
2. Enable "Item closed" → set target to **Done**
3. Enable "Pull request merged" → set target to **Done**

**Note**: The `session end --review` CLI command and these automations are designed to work together (idempotent). No conflict arises from having both enabled.

### Step 10: Report Results

After completion, display:

- Project name and URL
- Configured Status list
- Added custom fields
- Label summary (deleted/created counts)

## Status Workflow

**Normal Flow**:

Icebox → Backlog → Spec Review → Ready → In Progress → Review → Testing → Done / Not Planned → Released

**Exception Flows**:

| Pattern | Flow | Description |
|---------|------|-------------|
| Requirements unclear | Spec Review → Backlog | Needs reconsideration |
| Blocked | Any → Pending → Original status | Temporary hold (reason required) |
| Review feedback | Review → In Progress | Fix requested changes |
| Test failed | Testing → In Progress | Bug fix needed |
| Simple task | Backlog → Ready | Skip Spec Review if requirements are clear |

**Operational Rules**:

1. One task In Progress per person (WIP limit)
2. Always document reason when moving to Pending
3. Review tasks stuck in same status for over a week
4. Keep Ready queue stocked with actionable tasks

## Error Handling

| Error | Solution |
|-------|----------|
| `missing scopes [project]` | Run `gh auth refresh -s project,read:project` |
| `Project already exists` | Show existing project URL |
| `Owner not found` | Use `--owner` option explicitly |

## Notes

- **Project name convention**: Project name = repository name (e.g., repo `shirokuma-docs` → project `shirokuma-docs`). This matches the CLI's `getProjectId()` lookup which searches by repository name.
- Use `TodoWrite` for progress tracking (7+ steps)
- Use `AskUserQuestion` to confirm overwrite when an existing project is found
- Permission refresh requires interactive mode (user must run manually)
- Language auto-detected from conversation (Japanese or English)
- For AI development, Size (effort) is more useful than time estimates
- XL-sized tasks should be split into smaller tasks

## Related Resources

- `shirokuma-docs projects setup` - CLI setup command
- [reference/status-options.md](reference/status-options.md) - Status workflow and definitions
- [reference/custom-fields.md](reference/custom-fields.md) - Custom field definitions
- [reference/issue-types.md](reference/issue-types.md) - Issue Types setup and migration guide
- [reference/labels.md](reference/labels.md) - Label taxonomy and setup guide
