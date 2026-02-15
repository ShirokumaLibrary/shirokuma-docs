---
name: reviewing-on-issue
description: Comprehensive review workflow with specialized roles. Use when "review", "security audit", "security check", "test review", "test quality", "Next.js review", "docs review", "plan review", "計画レビュー", or when checking code quality, security, testing patterns, documentation quality, or plan quality.
context: fork
agent: general-purpose
model: opus
allowed-tools: Read, Grep, Glob, Bash, WebSearch, WebFetch
---

# Issue Reviewing Skill

Comprehensive review workflow with specialized roles for different review types.

## When to Use

Automatically invoke when the user:
- Requests "review", "レビューして", "コードレビュー"
- Says "security review", "セキュリティ", "audit"
- Mentions "test review", "テストレビュー", "test quality"
- Asks for "Next.js review", "プロジェクトレビュー"
- Asks for "plan review", "計画レビュー", "計画チェック"

## Design Philosophy

**Check and report both "Do" and "Don't" rules**

- **Do**: Verify via Review Checklist in each role
- **Don't**: Detect via Anti-patterns to Detect in each role

## Architecture

- `SKILL.md` - This file (core workflow)
- `patterns/` - Generic patterns (drizzle-orm, better-auth, server-actions, etc.)
- `criteria/` - Quality criteria (code-quality, security, testing)
- `roles/` - Review role definitions (code, security, testing, nextjs, docs, plan)
- `templates/` - Report templates
- `.claude/rules/` - Project-specific conventions (auto-loaded)

## Available Roles

| Role | Focus | Trigger |
|------|-------|---------|
| **code** | Quality, patterns, style | "review", "コードレビュー" |
| **code+annotation** | JSDoc annotations | "annotation review", "アノテーションレビュー" |
| **security** | OWASP, CVEs, auth | "security review", "セキュリティ" |
| **testing** | TDD, coverage, mocks | "test review", "テストレビュー" |
| **nextjs** | Framework, patterns | "Next.js review", "プロジェクト" |
| **docs** | Markdown structure, links, terminology | "docs review", "ドキュメントレビュー" |
| **plan** | Requirements coverage, task granularity, risks | "plan review", "計画レビュー" |

## Workflow

```
Role Selection → Load Knowledge → Run Lints → Analyze Code/Plan → Generate Report → Save Report
```

**6 Steps**: Select Role → Load → **Lint** → Analyze → Report → Save

### 1. Role Selection

Based on user request, select appropriate role:

| Keyword | Role | Files to Load |
|---------|------|---------------|
| "review", "レビュー" | code | criteria/code-quality, criteria/coding-conventions, patterns/server-actions, patterns/drizzle-orm, patterns/jsdoc |
| "annotation", "アノテーション" | code+annotation | roles/code.md |
| "security", "セキュリティ" | security | criteria/security, patterns/better-auth |
| "test", "テスト" | testing | criteria/testing, patterns/e2e-testing |
| "Next.js", "nextjs" | nextjs | ALL knowledge files |
| "docs", "ドキュメント" | docs | roles/docs.md |
| "plan", "計画レビュー" | plan | roles/plan.md |

#### Auto Role Selection for Self-Review

When invoked from the self-review chain (PR context available), analyze changed files via `git diff --name-only` and auto-select the role:

| Change Type | Condition | Role |
|-------------|-----------|------|
| Code | Contains `.ts/.tsx/.js/.jsx` | `code` |
| Docs only | `.md` files only (excluding config paths) | `docs` |
| Config only | Only files under `.claude/skills/`, `.claude/rules/`, `.claude/agents/`, `.claude/output-styles/`, `.claude/commands/`, `plugin/` | Routed to `claude-config-reviewing` by `creating-pr-on-issue` (this skill is not invoked) |
| Mixed | Code + docs/config | `code` (config portion reviewed by `claude-config-reviewing` in parallel) |

**Config paths**: `.claude/skills/`, `.claude/rules/`, `.claude/agents/`, `.claude/output-styles/`, `.claude/commands/`, `plugin/`

**Note**: The plan role is excluded from self-review auto-selection. Plans are not code files and cannot be detected via `git diff --name-only`. The plan role is only selected via keyword specification or explicit Spec Review Issue designation.

### 2. Load Knowledge

Read required knowledge files based on role:

```
1. Auto-loaded: .claude/rules/*.md (based on file paths)
2. Role-specific: roles/{role}.md
3. Criteria: criteria/{relevant}.md
4. Patterns: patterns/{relevant}.md
```

**Note**: Project-specific rules are auto-loaded from `.claude/rules/` - no manual loading needed.

### 3. Run shirokuma-docs Lints (REQUIRED)

**Execute automated checks before manual review. Lint commands vary by role:**

| Role | Lint Commands |
|------|--------------|
| code, code+annotation, nextjs | lint-tests, lint-coverage, lint-code, lint-structure, lint-annotations (all 5) |
| security | lint-code, lint-structure (security-related only) |
| testing | lint-tests, lint-coverage (test-related only) |
| docs | lint-docs (document structure only) |
| plan | Skip (target is Issue body, not code/document files) |

**code / code+annotation / nextjs roles:**

```bash
# Test documentation (@testdoc, @skip-reason)
shirokuma-docs lint-tests -p . -f terminal

# Implementation-test coverage
shirokuma-docs lint-coverage -p . -f summary

# Code structure (Server Actions, annotations)
shirokuma-docs lint-code -p . -f terminal

# Project structure (directories, naming)
shirokuma-docs lint-structure -p . -f terminal

# Annotation consistency (@usedComponents, @screen)
shirokuma-docs lint-annotations -p . -f terminal
```

**docs role:**

```bash
# Document structure validation
shirokuma-docs lint-docs -p . -f terminal
```

**Key rules to check:**

| Rule | Description |
|------|-------------|
| `skipped-test-report` | Reports `.skip` tests (ensure `@skip-reason` present) |
| `testdoc-required` | All tests need `@testdoc` |
| `lint-coverage` | Source files need corresponding tests |
| `annotation-required` | Server Actions need `@serverAction` |

See project-specific workflow documentation for detailed fix instructions.

### 4. Analyze Code / Plan

**Code roles (code, security, testing, nextjs, docs):**

1. Read target files
2. Apply criteria from loaded knowledge
3. Check against known issues
4. Cross-reference with shirokuma-docs lint results
5. Identify violations and improvements

**Plan role:**

1. Fetch Issue body via `shirokuma-docs issues show {number}`
2. Extract `## Plan` / `## 計画` section
3. Evaluate each item in review checklist (`roles/plan.md`)
4. Check against anti-patterns
5. Verify consistency with requirements and deliverables

### 5. Generate Report

Use `templates/report.md` format:

1. Summary (include shirokuma-docs lint summary)
2. Critical Issues
3. Improvements
4. Best Practices
5. Recommendations

### 6. Save Report

Route the output based on the review context.

#### PR Review (when PR number is in context)

Post review summary as a PR comment:

```bash
# Write tool でファイル作成後
shirokuma-docs issues comment {PR#} --body /tmp/review-summary.md
```

Only save a detailed report to Discussions when there are many critical issues (severity: error, 5 or more), and link the Discussion URL in the PR comment.

#### File/Directory Review (no PR number)

Create Discussion in Reports category (existing behavior):

```bash
shirokuma-docs discussions create \
  --category Reports \
  --title "[Review] {role}: {target}" \
  --body report.md
```

Report the Discussion URL to the user.

#### Routing Summary

| Context | Primary Output | Detailed Report |
|---------|---------------|-----------------|
| PR number specified | PR comment (summary) | Discussion only if 5+ errors |
| File/directory | Discussion (Reports) | — |
| Issue number specified (plan role) | Issue comment | — |

> See `rules/output-destinations.md` for the full output destination policy.

## Role Details

### Code Review (`roles/code.md`)

Focus areas:
- TypeScript best practices
- Error handling
- Async patterns
- Coding conventions (naming, imports, structure)
- Code smells detection
- Documentation quality (JSDoc)

### Security Review (`roles/security.md`)

Focus areas:
- OWASP Top 10 2025
- Authentication/Authorization
- Input validation
- Injection prevention
- CVE awareness

### Test Review (`roles/testing.md`)

Focus areas:
- TDD compliance
- Test coverage
- Mock patterns
- E2E quality
- Anti-patterns

### Next.js Review (`roles/nextjs.md`)

Focus areas:
- App Router patterns
- Server/Client components
- Tailwind CSS v4
- shadcn/ui integration
- next-intl configuration

### Documentation Review (`roles/docs.md`)

Focus areas:
- Markdown structure (heading levels, section ordering)
- Link integrity (internal links, file path references)
- Terminology consistency (project term unification)
- Table consistency (column counts, formatting)
- Code blocks (language specification, syntax validity)

### Plan Review (`roles/plan.md`)

Focus areas:
- Requirements coverage (all requirements from overview/tasks reflected in plan)
- Changed files validity (no missing or extraneous files)
- Task granularity (1 task ≈ 1 commit principle)
- Risk analysis (breaking changes, performance impact oversight)
- Issue description sufficiency (understandable and evaluable from Issue body alone)

## Knowledge Update

When user requests `--update`:

1. Web search for latest:
   - Next.js releases and CVEs
   - React updates
   - Tailwind CSS changes
   - Better Auth updates
   - OWASP updates

2. Update relevant files:
   - `.claude/rules/shirokuma/nextjs/tech-stack.md` - Versions
   - `.claude/rules/shirokuma/nextjs/known-issues.md` - CVEs

> **Note**: This mode only updates rule files. To update source knowledge files (`patterns/`, `criteria/`, `reference/`), use the knowledge-manager agent's update mode (`ソース更新して`).

## Progressive Disclosure

For token efficiency:

1. **Auto-loaded**: `.claude/rules/*.md` based on file paths being reviewed
2. **On Demand**: Load knowledge files based on role/findings
3. **Minimal Output**: Summary first, details on request

## Quick Reference

```bash
# Code quality review
"review lib/actions/"

# Annotation consistency review
"annotation review components/"
"アノテーションレビュー components/"
"check usedComponents in nav-tags.tsx"

# Security review
"security review lib/actions/"

# Test review
"test review"

# Next.js project review
"Next.js review"

# Plan review
"plan review #42"
"計画レビュー #42"

# Update knowledge base
"reviewer --update"
```

## Next Steps

When invoked directly (not via `working-on-issue`), suggest the next workflow step after the review:

```
Review complete. If changes were made based on findings:
→ `/committing-on-issue` to stage and commit your changes
```

## Orchestration (when invoked as sub-agent)

When this skill runs with `context: fork`, it operates as an isolated sub-agent:

### Progress Reporting

```text
Step 1/6: Selecting role...
  Role: security
  Files to load: tech-stack, security, better-auth, known-issues

Step 2/6: Loading knowledge...

Step 3/6: Running shirokuma-docs lints...

Step 4/6: Analyzing code...
  lib/auth.ts - 3 findings
  lib/actions/users.ts - 1 finding

Step 5/6: Generating report...
  2 Critical, 1 Warning, 1 Info

Step 6/6: Saving report...
  GitHub Discussions (Reports)
```

**Progress reporting example for plan role:**

```text
Step 1/6: Selecting role...
  Role: plan
  Files to load: CLAUDE.md, .claude/rules/

Step 2/6: Loading knowledge...

Step 3/6: Running lints... Skipped (plan role)

Step 4/6: Analyzing plan...
  Issue #42 - Plan section analysis
  Requirements coverage: 5/5, Task granularity: appropriate

Step 5/6: Generating report...
  0 Critical, 2 Improvements

Step 6/6: Saving report...
  Issue #42 comment
```

### Error Recovery

If analysis is incomplete:
1. Identify missing coverage
2. Load additional patterns
3. Re-analyze missed areas
4. Update report

## Notes

- **Reports saved**: Route based on context (PR → PR comment, files → Discussion Reports, see `rules/output-destinations.md`)
- **Role-based**: Load only relevant knowledge files
- **Progressive**: Summary first, details on request
- **Updateable**: Use `--update` to refresh knowledge
- **Rules auto-loaded**: Project conventions from `.claude/rules/`
- **Sub-agent mode**: Runs with `context: fork` for isolated execution
- **Fork constraint**: TodoWrite / AskUserQuestion are unavailable due to `context: fork`; return results as a report only
- **Self-review**: When invoked from delegated chain, return structured output (Self-Review Result)

## Self-Review Mode

When invoked from `working-on-issue` delegated chain or `creating-pr-on-issue` self-review chain, return structured output that the caller can parse for automated decisions.

### Structured Output Format

In addition to the normal report saving (Step 6), return a summary in this format:

```text
## Self-Review Result
**Status:** {PASS | FAIL}
**Critical:** {n} issues
**Warning:** {n} issues
**Files with issues:**
- {file1}: {summary}
- {file2}: {summary}
**Auto-fixable:** {yes | no}
```

- **PASS**: critical issues = 0 (warnings only or no issues)
- **FAIL**: critical issues > 0 (auto-fix needed)
- **Auto-fixable**: Whether issues can be resolved by code changes (no if design changes required)

### Feedback Accumulation

Accumulate review finding patterns from self-review to improve skills and rules.

**When to record**: After each self-review loop iteration.

**Destination**: Discussion (Reports) with `[Self-Review Feedback]` prefix.

```bash
shirokuma-docs discussions create \
  --category Reports \
  --title "[Self-Review Feedback] {branch}: iteration {n}" \
  --body /tmp/feedback.md
```

**Rule proposals**: When frequent patterns (3+ occurrences) are detected, append to report:

```markdown
## Rule Candidates
- **Pattern**: {description}
- **Occurrences**: {n}
- **Proposal**: Consider adding to {rule-file}
```

## Anti-Patterns

- Do not modify code (report review findings only)
- Do not load ALL knowledge files at once (load only role-specific files)

## Reference Documents

### Skill Documents

| Document | Content | When to Read |
|----------|---------|--------------|
| [criteria/code-quality.md](criteria/code-quality.md) | Code quality standards | code role |
| [criteria/coding-conventions.md](criteria/coding-conventions.md) | Coding conventions | code role |
| [criteria/security.md](criteria/security.md) | Security standards | security role |
| [criteria/testing.md](criteria/testing.md) | Test quality standards | testing role |
| [patterns/server-actions.md](patterns/server-actions.md) | Server Action patterns | code role |
| [patterns/server-actions-structure.md](patterns/server-actions-structure.md) | Server Action structure | code role |
| [patterns/drizzle-orm.md](patterns/drizzle-orm.md) | Drizzle ORM patterns | code/nextjs role |
| [patterns/better-auth.md](patterns/better-auth.md) | Better Auth patterns | security role |
| [patterns/e2e-testing.md](patterns/e2e-testing.md) | E2E test patterns | testing role |
| [patterns/tailwind-v4.md](patterns/tailwind-v4.md) | Tailwind v4 CSS variable issues | nextjs role |
| [patterns/radix-ui-hydration.md](patterns/radix-ui-hydration.md) | Hydration error fixes | nextjs role |
| [patterns/jsdoc.md](patterns/jsdoc.md) | JSDoc patterns | code role |
| [patterns/nextjs-patterns.md](patterns/nextjs-patterns.md) | Next.js patterns | nextjs role |
| [patterns/i18n.md](patterns/i18n.md) | i18n patterns | nextjs role |
| [patterns/code-quality.md](patterns/code-quality.md) | Code quality patterns | code role |
| [patterns/account-lockout.md](patterns/account-lockout.md) | Account lockout | security role |
| [patterns/audit-logging.md](patterns/audit-logging.md) | Audit logging | security role |
| [patterns/docs-management.md](patterns/docs-management.md) | Documentation management | docs role |
| [roles/code.md](roles/code.md) | Code review definition | code role |
| [roles/security.md](roles/security.md) | Security review definition | security role |
| [roles/testing.md](roles/testing.md) | Test review definition | testing role |
| [roles/nextjs.md](roles/nextjs.md) | Next.js review definition | nextjs role |
| [roles/docs.md](roles/docs.md) | Docs review definition | docs role |
| [roles/plan.md](roles/plan.md) | Plan review definition | plan role |
| [templates/report.md](templates/report.md) | Report template | Report generation |
| [docs/setup/auth-setup.md](docs/setup/auth-setup.md) | Auth setup guide | security role |
| [docs/setup/database-setup.md](docs/setup/database-setup.md) | Database setup guide | code/nextjs role |
| [docs/setup/infra-setup.md](docs/setup/infra-setup.md) | Infrastructure setup guide | nextjs role |
| [docs/setup/project-init.md](docs/setup/project-init.md) | Project initialization guide | nextjs role |
| [docs/setup/styling-setup.md](docs/setup/styling-setup.md) | Styling setup guide | nextjs role |
| [docs/workflows/annotation-consistency.md](docs/workflows/annotation-consistency.md) | Annotation consistency verification | code role |
| [docs/workflows/shirokuma-docs-verification.md](docs/workflows/shirokuma-docs-verification.md) | shirokuma-docs verification workflow | code/nextjs role |
