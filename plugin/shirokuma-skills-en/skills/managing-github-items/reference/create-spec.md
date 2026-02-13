# /create-spec Workflow

Create a spec/design Discussion in Ideas category.

```
/create-spec "Feature Name"
/create-spec                    # Interactive mode
```

## Step 1: Get Category ID

```bash
OWNER=$(gh repo view --json owner -q '.owner.login')
REPO=$(gh repo view --json name -q '.name')
CATEGORY_ID=$(gh api graphql -f query='{
  repository(owner: "'$OWNER'", name: "'$REPO'") {
    discussionCategories(first: 10) { nodes { id name } }
  }
}' | jq -r '.data.repository.discussionCategories.nodes[] | select(.name == "Ideas") | .id')
```

## Step 2: Gather Details

Ask user for: Title, Summary, Problem Statement, Proposed Solution, Alternatives (optional)

## Step 3: Generate Body

```markdown
## Summary
{summary}

## Problem Statement
{problem}

## Proposed Solution
{proposal}

## Alternatives Considered
{alternatives or "None"}

## Open Questions
- [ ] {question}

---
Status: Draft
```

## Step 4: Create Discussion

```bash
gh api graphql \
  -f query='mutation($repoId: ID!, $catId: ID!, $title: String!, $body: String!) {
    createDiscussion(input: {repositoryId: $repoId, categoryId: $catId, title: $title, body: $body}) {
      discussion { url number }
    }
  }' \
  -f repoId="$REPO_ID" -f catId="$CATEGORY_ID" \
  -f title="[Spec] $TITLE" -f body="$BODY"
```

## Local Fallback

If Discussions unavailable:

```bash
mkdir -p .claude/specs
echo "$BODY" > .claude/specs/$(date +%Y-%m-%d)-{slug}.md
```
