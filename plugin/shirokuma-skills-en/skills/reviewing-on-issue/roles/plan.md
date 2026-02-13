# Plan Review Role

## Responsibilities

Quality review of the plan section (`## Plan` / `## 計画`) in Issue body:
- Requirements coverage (all requirements from overview/tasks covered in plan)
- Changed files validity (no missing or extraneous files)
- Task granularity (1 task ≈ 1 commit principle)
- Risk analysis (breaking changes, performance impact oversight)
- Issue description sufficiency (plan understandable from Issue body alone)

## Distinction from `planning-on-issue`

| Aspect | `planning-on-issue` built-in review | `reviewing-on-issue` plan role |
|--------|-------------------------------------|-------------------------------|
| Timing | Immediate check right after planning | User-initiated at any time |
| Data retrieval | Issue body embedded in Task agent | Fetched via `shirokuma-docs issues show` by Issue number |
| Purpose | Initial quality gate for plan | Independent second opinion |
| Invocation | Auto-executed at `planning-on-issue` step 4 | `/reviewing-on-issue plan #N` or Spec Review Issue |

## Required Knowledge

Load these files for context:
- Project's `CLAUDE.md` - Project overview and conventions
- `.claude/rules/` - Project-specific rules (auto-loaded)

## Plan Role Specific Workflow

```
1. Role selection: "plan review" or Spec Review Issue
2. Fetch Issue body: shirokuma-docs issues show {number}
3. Lint execution: Skip (target is not code files)
4. Plan analysis: Review the "## Plan" section against review criteria
5. Report generation: Template format
6. Report saving: Issue comment
```

## Review Checklist

### Requirements Coverage
- [ ] All requirements from the Issue "Overview" section are covered in the plan
- [ ] All tasks from the Issue "Tasks" section map to plan task breakdown
- [ ] Each item in "Deliverables" section has a corresponding task
- [ ] Implicit requirements (tests, version bump, etc.) are not overlooked

### Changed Files Validity
- [ ] Changed files list is documented
- [ ] No missing files (all changes inferred from requirements are included)
- [ ] No extraneous files (no out-of-scope changes)
- [ ] New files and existing file updates are clearly distinguished

### Task Granularity
- [ ] Each task is specific and actionable (not just "implement" but what and how)
- [ ] 1 task ≈ 1 commit granularity
- [ ] Task dependencies are clear (logical ordering)
- [ ] Number of tasks is appropriate for Issue size (not too many, not too few)

### Risk Analysis
- [ ] Breaking changes have their impact scope documented
- [ ] Performance impact is considered
- [ ] Impact on existing features is evaluated
- [ ] Rollback procedure or mitigation exists (when needed)

### Issue Description Sufficiency
- [ ] Plan is fully understandable from Issue body alone
- [ ] Approach rationale (why this method was chosen) is documented
- [ ] Alternative approaches considered are documented (when applicable)
- [ ] Prerequisites and constraints are explicitly stated

## Anti-patterns to Detect

### Missing Plan Section
- [ ] `## Plan` / `## 計画` section does not exist
- [ ] Plan section is empty or insufficient (heading only, no content)

### Tasks Too Abstract
- [ ] Only "implement" or "fix" with no specific change details
- [ ] Files or functions to change are not identified
- [ ] Mapping to deliverables is unclear

### Missing Changed Files List
- [ ] Standard/detailed level plan lacks changed files list
- [ ] File paths are inaccurate (referencing non-existent paths)

### Missing Risk Documentation
- [ ] Detailed level plan lacks risk analysis
- [ ] Breaking changes exist but impact scope is not documented

### Deliverables Mismatch
- [ ] "Deliverables" section items have no corresponding tasks
- [ ] Tasks fulfill completion criteria but diverge from deliverables
- [ ] Deliverables are vague ("it works" only)

## Report Format

Use template from `templates/report.md`:

1. **Summary**: Overall plan quality summary
2. **Critical Issues**: Missing requirements, significant inconsistencies
3. **Improvements**: Task granularity improvements, risk additions, etc.
4. **Best Practices**: Appropriate planning patterns found
5. **Recommendations**: Prioritized action items

## Trigger Keywords

- "plan review"
- "計画レビュー"
- "review plan"
- "計画チェック"
