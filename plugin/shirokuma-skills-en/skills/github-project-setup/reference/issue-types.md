# Issue Types Reference

## Overview

GitHub Issue Types are **organization-level** settings that categorize issues across all repositories. They replace the need for custom "Type" fields in Projects.

**Setup URL**: `https://github.com/organizations/{org}/settings/issue-types`

**Requirement**: Organization owner role (for UI setup). `admin:org` OAuth scope required only for API operations.

## Recommended Types

### Default Types (pre-configured)

| Type | Description | Color |
|------|-------------|-------|
| Task | A specific piece of work | Default |
| Bug | An unexpected problem or behavior | Default |
| Feature | A request, idea, or new functionality | Default |

### Custom Types (add manually)

| Type | Description | Color |
|------|-------------|-------|
| Chore | Maintenance, config, tooling, or refactoring | Gray |
| Docs | Documentation improvements or additions | Blue |
| Research | Investigation, spike, or exploration | Purple |

## Migration: Project Type Field → Issue Types

If the project currently uses a custom "Type" single-select field, migrate to built-in Issue Types:

### Step 1: Create Issue Types

1. Go to `https://github.com/organizations/{org}/settings/issue-types`
2. Add Chore, Docs, and Research types (Bug, Feature, Task already exist)

### Step 2: Assign Types to Existing Issues

For each open issue, set the Issue Type to match the current Project Type field value:

```bash
# List issues with their current Project Type field
shirokuma-docs issues list
```

Set Issue Type via the GitHub UI (issue sidebar → Type dropdown) or via API:

```bash
gh api graphql \
  -H 'GraphQL-Features: issue_types' \
  -f query='
    mutation($issueId: ID!, $typeId: ID!) {
      updateIssue(input: {id: $issueId, issueTypeId: $typeId}) {
        issue { number title }
      }
    }
  ' -f issueId="$ISSUE_NODE_ID" -f typeId="$TYPE_ID"
```

### Step 3: Remove Project Type Field

After all issues have been migrated:

1. Go to Project Settings → Custom Fields
2. Delete the "Type" single-select field
3. Update `shirokuma-docs issues` commands if they reference the Project Type field

### Step 4: Update Workflows

Update files that reference the Project "Type" field:

- `.claude/rules/shirokuma/github/project-items.md` — Type field definition
- `plugin/shirokuma-skills-en/skills/github-project-setup/reference/custom-fields.md` — Type field reference
- `plugin/shirokuma-skills-en/skills/github-project-setup/scripts/setup-project.py` — Type field creation
- `plugin/shirokuma-skills-en/skills/github-project-setup/SKILL.md` — Step 6 Type field listing

## Notes

- Issue Types are only available for **organization** repositories, not personal repositories
- Issue Types are shared across all repositories in the organization
- Only organization owners can create or modify Issue Types
- Issue Types appear in the issue sidebar, not in the Project board fields
- The Project "Type" custom field and Issue Types are separate systems — during migration, both may coexist temporarily
- GitHub allows up to 25 custom issue types per organization
