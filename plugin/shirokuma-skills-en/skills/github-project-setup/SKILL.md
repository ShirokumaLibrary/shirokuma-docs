---
name: github-project-setup
description: Automates GitHub Project initial setup with Status, Priority, Type, and Size fields. Use when "project setup", "initial setup", "set up project", "GitHub Project setup", or starting a new project with kanban workflow.
allowed-tools: Bash, Read, Glob
---

# GitHub Project Setup

Performs GitHub Project initial setup. Runs `create-project` command for automated tasks and guides manual configuration for API-unsupported settings.

## When to Use

- Creating a new GitHub Project
- Setting up a kanban workflow
- When user says "project setup", "initial setup", "set up project", "GitHub Project setup", or "create project"

## Responsibility Split

| Layer | Responsibility | Details |
|-------|---------------|---------|
| `create-project` command | Batch-execute all API-automatable operations | Project creation, repository link, Discussions enablement, field setup, label creation |
| This skill | Command execution + manual setup guidance + verification | Running `create-project`, Discussion category creation guidance, workflow enablement guidance, verification |

## Workflow

### Step 1: Check Permissions

```bash
gh auth status
```

If permission is missing, ask user to run:

```bash
gh auth refresh -s project,read:project
```

### Step 2: Create Project (Automated)

Run `create-project` to batch-execute all automated setup:

```bash
shirokuma-docs projects create-project --title "{project-name}" --lang={en|ja}
```

**Automatically performed:**

| Operation | Details |
|-----------|---------|
| Project creation | Creates a GitHub Projects V2 |
| Repository link | Makes project accessible from Projects tab |
| Discussions enablement | Enables Discussions on the repository |
| Field setup | Configures all options for Status, Priority, Type, Size |
| Label creation | Creates 5 required labels (feature, bug, chore, docs, research) |

**Fields created:**

| Field | Options |
|-------|---------|
| Status | Icebox → Backlog → Spec Review → Ready → In Progress ⇄ Pending → Review → Testing → Done / Not Planned → Released |
| Priority | Critical / High / Medium / Low |
| Type | Feature / Bug / Chore / Docs / Research |
| Size | XS / S / M / L / XL |

> **Note:** `--lang` only translates field descriptions. Option names (Backlog, Critical, etc.) remain in English for CLI command compatibility.

**Label verification (optional):**

After command completion, optionally clean up labels:

1. **Verify required labels**: Run `shirokuma-docs repo labels list` to confirm all 5 exist
2. **Clean up redundant labels** (optional): Delete labels that duplicate the Type field (enhancement, documentation) or are inapplicable (good first issue, help wanted, question)
3. **Create area labels** (optional): Add `area:` prefixed labels matching the project's module structure

**Keep operational labels**: `duplicate`, `invalid`, `wontfix` (lifecycle/triage purpose).

See [reference/labels.md](reference/labels.md) for full taxonomy.

### Step 3: Create Discussion Categories (Manual)

Discussion category creation is not supported by the GitHub API. Guide the user to create them manually in the GitHub UI.

**Guide the user:**

1. Navigate to `https://github.com/{owner}/{repo}/settings` (Discussions section)
2. Create the following 4 categories:

| Category | Emoji | Format | Purpose |
|----------|-------|--------|---------|
| Handovers | 🔄 | Open-ended discussion | Session handover records |
| ADR | 📋 | Open-ended discussion | Architecture Decision Records |
| Knowledge | 📚 | Open-ended discussion | Confirmed patterns and solutions |
| Research | 🔍 | Open-ended discussion | Items requiring investigation |

**Important**: Format must be **Open-ended discussion**, not Announcement or Poll.

### Step 4: Enable Built-in Automations

Enable recommended automations for the project. These cannot be set via API — guide the user to the GitHub UI.

**Recommended workflows:**

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

### Step 5: Verify Setup

Verify all steps are complete:

```bash
shirokuma-docs session check --setup
```

**Verification items:**

| Item | Details |
|------|---------|
| Discussion categories | Existence of Handovers, ADR, Knowledge, Research |
| Project | Project existence |
| Required fields | Existence of Status, Priority, Type, Size |
| Workflow automations | Item closed → Done, PR merged → Done enabled |

If any items are missing, recommended settings (Description, Emoji, Format) are displayed.

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
- Use `TodoWrite` for progress tracking (5 steps)
- Use `AskUserQuestion` to confirm overwrite when an existing project is found
- Permission refresh requires interactive mode (user must run manually)
- Language auto-detected from conversation (Japanese or English)
- For AI development, Size (effort) is more useful than time estimates
- XL-sized tasks should be split into smaller tasks

## Related Resources

- `shirokuma-docs projects create-project` - Batch project creation command
- `shirokuma-docs projects setup` - Field setup command (used internally by `create-project`)
- `shirokuma-docs session check --setup` - Setup verification command
- [reference/status-options.md](reference/status-options.md) - Status workflow and definitions
- [reference/custom-fields.md](reference/custom-fields.md) - Custom field definitions
- [reference/labels.md](reference/labels.md) - Label taxonomy and setup guide
