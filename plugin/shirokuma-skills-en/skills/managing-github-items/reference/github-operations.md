# GitHub Operations Reference

Shared reference for all session/GitHub skills. Single source of truth for CLI commands, workflows, and conventions.

## Architecture: Issues + Projects Hybrid

| Component | Purpose |
|-----------|---------|
| **Issues** | Task management, `#123` references, history |
| **Projects** | Status/Priority/Size field management |
| **Labels** | Supplementary area classification (`area:cli`, `area:plugin`, etc.) |
| **Discussions** | Handovers, Specs, Decisions, Q&A |

**Status is managed via Projects fields** (not Labels).

Project naming convention: Project name = repository name (e.g., `blogcms` repo → `blogcms` project).

## Prerequisites

- `gh` CLI installed and authenticated
- GitHub Project configured (run `/setting-up-project` if not)
- Discussions enabled with categories: Handovers, Ideas, Q&A (optional)

## DraftIssue vs Issue

| Feature | DraftIssue | Issue |
|---------|-----------|-------|
| `#number` | No | Yes (`#123`) |
| External reference | No | Yes |
| Comments | No | Yes |
| Create command | `projects create` | `issues create` |
| Use case | Lightweight memo | Full task |

**Recommendation**: Use `issues create` by default for `#number` support.

## shirokuma-docs CLI Reference

Prefer shirokuma-docs CLI over direct `gh` commands. Config in `shirokuma-docs.config.yaml`.

### Issues (Primary Interface)

```bash
shirokuma-docs issues list                          # Open issues
shirokuma-docs issues list --all                    # Include closed
shirokuma-docs issues list --status "In Progress"   # Filter by status
shirokuma-docs issues show {number}                  # Details
shirokuma-docs issues create \
  --title "Title" --body /tmp/shirokuma-docs/body.md \
  --labels "area:cli" --issue-type "Feature" \
  --field-status "Backlog" --priority "Medium" --size "M"
shirokuma-docs issues update {number} --field-status "In Progress"
shirokuma-docs issues update {number} --add-label "area:cli"       # Add label
shirokuma-docs issues update {number} --remove-label "area:docs"   # Remove label
shirokuma-docs issues comment {number} --body - <<'EOF'
Comment content
EOF
shirokuma-docs issues comments {number}                 # List comments
shirokuma-docs issues comment-edit {comment-id} --body /tmp/shirokuma-docs/comment.md  # Works for Issue/PR comments
shirokuma-docs issues close {number}
shirokuma-docs issues reopen {number}
```

### Issues — Pull Requests

```bash
shirokuma-docs issues pr-list                               # PR list (default: open)
shirokuma-docs issues pr-list --state merged --limit 5     # Filtering
shirokuma-docs issues pr-show {number}                      # PR details (body, diff stats, linked issues)
shirokuma-docs issues pr-comments {number}                  # Review comments and threads
shirokuma-docs issues merge {number} --squash               # Merge + status update
shirokuma-docs issues pr-reply {number} --reply-to {id} --body - <<'EOF'
Reply content
EOF
shirokuma-docs issues resolve {number} --thread-id {id}    # Resolve thread
```

### Projects (Low-level Access)

```bash
shirokuma-docs projects list                        # Project items
shirokuma-docs projects fields                      # Show field options
shirokuma-docs projects add-issue {number}          # Add issue to project
shirokuma-docs projects create \
  --title "Title" --body /tmp/shirokuma-docs/body.md \
  --field-status "Backlog" --priority "Medium"               # DraftIssue
shirokuma-docs projects get PVTI_xxx                # By item ID
shirokuma-docs projects update {number} --field-status "Done"
```

### Discussions

```bash
shirokuma-docs discussions list --category Handovers --limit 5
shirokuma-docs discussions show {number}
shirokuma-docs discussions create \
  --category Handovers \
  --title "$(date +%Y-%m-%d) - Summary" \
  --body /tmp/shirokuma-docs/body.md
```

### Repository

```bash
shirokuma-docs repo info
shirokuma-docs repo labels
```

### Cross-repo Operations

```bash
shirokuma-docs issues list --repo docs
shirokuma-docs issues create --repo docs --title "Title" --body /tmp/shirokuma-docs/body.md
```

### gh Fallback (CLI unsupported only)

```bash
# Label management
gh label list
gh label create "name" --color "0E8A16" --description "Desc"

# Repository info
gh repo view --json nameWithOwner -q '.nameWithOwner'

# Authentication
gh auth login
gh auth status

# PR creation (not in shirokuma-docs CLI — single operation, gh direct use allowed)
gh pr create --base develop --title "feat: title (#42)" --body "$(cat /tmp/shirokuma-docs/body.md)"
```

## `--body` Usage Guide

| Tier | Pattern | Usage |
|------|---------|-------|
| Tier 1 (stdin) | `--body - <<'EOF'...EOF` | Comments, replies, short reasons |
| Tier 2 (file) | Write → `--body /tmp/shirokuma-docs/xxx.md` | Issue/Discussion body, handovers |

Use `<<'EOF'` as heredoc delimiter (single quotes prevent variable expansion).

## Status Workflow

```mermaid
graph LR
  Icebox --> Backlog --> SpecReview[Spec Review] --> Ready --> InProgress[In Progress]
  InProgress --> Review --> Testing --> Done --> Released
  InProgress <--> Pending["Pending (blocked)"]
```

| Status | Description |
|--------|-------------|
| Icebox | Low priority, not yet planned |
| Backlog | Planned for future work |
| Spec Review | Requirements being reviewed |
| Ready | Ready to start |
| In Progress | Currently working on |
| Pending | Blocked (document reason) |
| Review | Code review |
| Testing | QA testing |
| Done | Completed |
| Released | Deployed to production |

## Labels Convention

Work type classification is primarily handled by **Issue Types** (Organization-level Type field). Labels indicate the **affected area** as a supplementary mechanism:

| Mechanism | Role | Example |
|-----------|------|---------|
| Issue Types | **What** kind of work | Feature, Bug, Chore, Docs, Research |
| Area labels | **Where** the work applies | `area:cli`, `area:plugin` |
| Operational labels | Triage / lifecycle | `duplicate`, `invalid`, `wontfix` |

Labels are added manually based on project structure. Status is managed via Projects fields.

## Common Error Handling

| Error | Action |
|-------|--------|
| `shirokuma-docs: command not found` | Install: `npm i -g @shirokuma-library/shirokuma-docs` |
| `gh: command not found` | Install: `brew install gh` or `sudo apt install gh` |
| `not logged in` / `not authenticated` | Run: `gh auth login` |
| No project found | Run `/setting-up-project` to create one |
| Discussions disabled/category not found | Use local file fallback |
| `HTTP 404` | Check repository name and permissions |
| API rate limit | Show cached/partial data |
