# Manual Setup Steps

Guide for settings that cannot be automated via GitHub API.

## Issue Types Configuration

Add custom Issue Types to the Organization.

**Steps:**
1. Navigate to `https://github.com/organizations/{org}/settings/issue-types`
2. Click "Create new type" to add:

| Type | Purpose | Color | Icon |
|------|---------|-------|------|
| Chore | Config, tooling, refactoring | Gray | gear |
| Docs | Documentation | Green | page facing up |
| Research | Investigation and research | Purple | magnifying glass |
| Evolution | Rule/skill evolution signals and improvement tracking | Pink | seedling |

## Discussion Category Creation

**Steps:**
1. Navigate to `https://github.com/{owner}/{repo}/discussions/categories`
2. Create the following 4 categories:

| Category | Emoji Search | Color | Format |
|----------|-------------|-------|--------|
| Handovers | handshake | Purple | Open-ended discussion |
| ADR | triangular ruler | Blue | Open-ended discussion |
| Knowledge | light bulb | Yellow | Open-ended discussion |
| Research | microscope | Green | Open-ended discussion |

**Important**: Format must be **Open-ended discussion**.

## Enable Built-in Automations

**Steps:**
1. Navigate to `https://github.com/orgs/{owner}/projects/{number}/workflows`
2. Enable:

| Workflow | Target |
|----------|--------|
| Item closed | Done |
| Pull request merged | Done |

3. Keep disabled:

| Workflow | Reason |
|----------|--------|
| Item added to project | Status managed by CLI |
| Item reopened | Manual decision per case |
| Auto-archive items | Makes Done item history hard to access |

## Rename Views

**Steps:**
1. Open the Project page
2. Double-click View tab → Rename:

| Layout | Recommended Name |
|--------|-----------------|
| TABLE | Board |
| BOARD | Kanban |
| ROADMAP | Roadmap |
