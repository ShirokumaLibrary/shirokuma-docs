---
name: github-project-setup
description: "[Deprecated: use setting-up-project] Automates GitHub Project initial setup with Status, Priority, and Size fields."
allowed-tools: Bash, Read, Glob
---

# GitHub Project Setup

> **Deprecated**: This skill has been integrated into `setting-up-project`. Use `setting-up-project` for new setups.

Performs GitHub Project initial setup. Runs `create-project` command for automated tasks and guides manual configuration for API-unsupported settings.

## When to Use

- Creating a new GitHub Project
- Setting up a kanban workflow
- When user says "project setup", "initial setup", "set up project", "GitHub Project setup", or "create project"

## Responsibility Split

| Layer | Responsibility | Details |
|-------|---------------|---------|
| `create-project` command | Batch-execute all API-automatable operations | Project creation, repository link, Discussions enablement, field setup |
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
| Field setup | Configures all options for Status, Priority, Size |

**Fields created:**

| Field | Options |
|-------|---------|
| Status | Icebox → Backlog → Planning → Spec Review → Ready → In Progress ⇄ Pending → Review → Testing → Done / Not Planned → Released |
| Priority | Critical / High / Medium / Low |
| Size | XS / S / M / L / XL |

> **Note:** `--lang` only translates field descriptions. Option names (Backlog, Critical, etc.) remain in English for CLI command compatibility.

### Step 3: Configure Issue Types (Manual)

Add custom Issue Types to the Organization. In addition to the defaults (Feature / Bug / Task):

| Type | Purpose | Color | Icon |
|------|---------|-------|------|
| Chore | Config, tooling, refactoring | Gray | ⚙️ (gear) |
| Docs | Documentation | Blue | 📄 (page facing up) |
| Research | Investigation and research | Purple | 🔍 (magnifying glass) |

**Guide the user:**

1. Navigate to `https://github.com/organizations/{org}/settings/issue-types`
2. Click "Create new type" for each of the 3 types above

Once added, they become available in the Projects V2 Type field automatically.

### Step 4: Create Discussion Categories (Manual)

Discussion category creation is not supported by the GitHub API. Guide the user to create them manually in the GitHub UI.

**Guide the user:**

1. Navigate to `https://github.com/{owner}/{repo}/discussions/categories`
2. Create the following 4 categories:

| Category | Emoji | Search Text | Color | Format | Purpose |
|----------|-------|-------------|-------|--------|---------|
| Handovers | 🤝 | handshake | Purple | Open-ended discussion | Session handover records |
| ADR | 📐 | triangular ruler | Blue | Open-ended discussion | Architecture Decision Records |
| Knowledge | 💡 | light bulb | Yellow | Open-ended discussion | Confirmed patterns and solutions |
| Research | 🔬 | microscope | Green | Open-ended discussion | Items requiring investigation |

**Important**: Format must be **Open-ended discussion**, not Announcement or Poll.

### Step 5: Enable Built-in Automations

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

**Guide based on `projects workflows` results:**

| Result Pattern | Action |
|----------------|--------|
| Both recommended ON | Confirmed — no additional action needed |
| Some ON, some OFF | Guide to enable the OFF workflows |
| All OFF | Enable both using steps below |

**Steps:**

1. Navigate to: `https://github.com/orgs/{owner}/projects/{number}/workflows`
2. Enable "Item closed" → set target to **Done**
3. Enable "Pull request merged" → set target to **Done**

**Other built-in workflows:**

| Workflow | Recommended | Reason |
|----------|-------------|--------|
| Item added to project | OFF | Status is managed by CLI, no auto-set needed |
| Item reopened | OFF | Reopen status should be manually decided per case |
| Auto-close issue | OFF | May conflict with CLI's Not Planned status setting |
| Auto-archive items | OFF | Makes it harder to reference Done item history |
| Auto-add to project | Optional | Enable if you want all repo issues auto-added |

**Note**: The `session end --review` CLI command and these automations are designed to work together (idempotent). No conflict arises from having both enabled.

### Step 6: Rename Views (Manual)

The GitHub Projects V2 GraphQL API does not support View mutations. Guide the user to rename views manually in the GitHub UI.

**Recommended View names:**

| Layout | Recommended Name | Purpose |
|--------|-----------------|---------|
| TABLE | Board | All items list (default) |
| BOARD | Kanban | Grouped by Status |
| ROADMAP | Roadmap | Timeline view |

**Guide the user:**

1. Open the Project page
2. Double-click the "View 1" tab (or use dropdown → Rename)
3. Rename to the recommended name above

### Step 7: Verify Setup

Verify all steps are complete:

```bash
shirokuma-docs session check --setup
```

**Verification items:**

| Item | Details |
|------|---------|
| Discussion categories | Existence of Handovers, ADR, Knowledge, Research |
| Project | Project existence |
| Required fields | Existence of Status, Priority, Size |
| Workflow automations | Item closed → Done, PR merged → Done enabled |

If any items are missing, recommended settings (Description, Emoji, Format) are displayed.

### Step 8: Next Steps — Development Environment Setup

After GitHub Project setup is complete, proceed to set up your development environment. Choose a project structure and create a Next.js application.

**Structure choice:**

| Structure | When to Use | Directory |
|-----------|-------------|-----------|
| Simple | Single app, small-to-medium scale | Directly in repository root |
| Monorepo | Multiple apps, shared packages | `apps/web`, `packages/shared`, etc. |

**Known issues:**

| Problem | Solution |
|---------|----------|
| `create-next-app` conflicts with `.claude/` and `README.md` | Create in a subdirectory (e.g., `tmp-app`), then move files to root |
| pnpm not installed | Run `corepack enable` (no sudo required, built into Node.js) |
| Missing `.env` configuration | Create `.env.local` using the template below |

**`.env.local` template (key variables):**

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
BETTER_AUTH_SECRET="<random string, 32+ characters>"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> This step is guidance only — no automation is performed. Adjust according to your project's technology stack.

## Status Workflow

**Normal Flow**:

Icebox → Backlog → Planning → Spec Review → Ready → In Progress → Review → Testing → Done / Not Planned → Released

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
- Use `TodoWrite` for progress tracking (8 steps)
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
