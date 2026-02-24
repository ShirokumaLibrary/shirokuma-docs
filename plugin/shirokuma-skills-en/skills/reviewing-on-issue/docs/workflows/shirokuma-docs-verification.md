# shirokuma-docs Verification Workflow

## Overview

shirokuma-docs を使用したコード品質検証のワークフロー。
レビュー時に機械的にチェック可能な項目を自動検証する。

---

## Verification Flow

```
1. Run Checks → 2. Analyze Issues → 3. Fix Issues → 4. Re-verify → 5. Report
```

---

## Step 1: Run All Checks

```bash
# Navigate to project root
cd /path/to/project

# 1. Test documentation check
shirokuma-docs lint-tests -p . -c shirokuma-docs.config.yaml -f terminal

# 2. Implementation-test coverage
shirokuma-docs lint-coverage -p . -c shirokuma-docs.config.yaml

# 3. Documentation structure (if OVERVIEW.md/ADR exists)
shirokuma-docs lint-docs -p . -c shirokuma-docs.config.yaml

# 4. Code structure check (Server Actions) - NEW
shirokuma-docs lint-code -p . -c shirokuma-docs.config.yaml -f terminal
```

**Expected Output**:
- `lint-tests`: Missing/duplicate @testdoc warnings
- `lint-coverage`: Uncovered source files list
- `lint-docs`: Missing sections/files warnings
- `lint-code`: Server Action structure issues, missing annotations

---

## Step 2: Analyze Issues

### lint-tests Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `Missing @testdoc` | Test has no JSDoc | Add @testdoc comment |
| `Duplicate @testdoc` | Same description used | Make descriptions unique |
| `Missing Japanese` | @testdoc not in Japanese | Write in Japanese |

### lint-coverage Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `No test file` | Source has no test | Create test file OR add `@skip-test` |
| `Orphan test` | Test has no source | Remove or link to source |

### lint-docs Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| `Missing file` | Required doc not found | Create the document |
| `Missing section` | Section not in doc | Add the section |
| `Invalid frontmatter` | YAML error | Fix frontmatter syntax |

### lint-code Issues (NEW)

| Issue | Cause | Fix |
|-------|-------|-----|
| `server-action-structure` | Auth/CSRF/Zod order wrong | Reorder: auth → CSRF → Zod |
| `annotation-required` | Missing @screen/@serverAction | Add required annotation |
| `Missing @serverAction` | "use server" file has no JSDoc | Add @serverAction comment |
| `Missing @screen` | page.tsx has no JSDoc | Add @screen comment |

---

## Step 3: Fix Issues

### Adding @testdoc Comments

```typescript
// Before
it("should create user", async () => { ... });

// After
/**
 * @testdoc 有効なデータで新規ユーザーを作成できる
 * @purpose ユーザー作成の正常系確認
 * @expected ユーザーが作成され、IDが返される
 */
it("should create user", async () => { ... });
```

### Adding @skip-test for Non-testable Files

```typescript
/**
 * UI Component Types
 * @skip-test shadcn/ui 型定義のみ
 */
export interface ButtonProps { ... }
```

### Adding Server Action Annotations

```typescript
// Before
export async function getProjects() { ... }

// After
/**
 * プロジェクト一覧取得
 * @serverAction
 * @feature ProjectManagement
 * @dbTables projects, project_members
 */
export async function getProjects() { ... }
```

---

## Step 4: Re-verify

```bash
# Run checks again after fixes
shirokuma-docs lint-tests -p . -c shirokuma-docs.config.yaml -f summary
shirokuma-docs lint-coverage -p . -c shirokuma-docs.config.yaml -f summary

# Strict mode for CI (exits with error code if issues remain)
shirokuma-docs lint-tests -p . --strict
shirokuma-docs lint-coverage -p . --strict -s
```

**Pass Criteria**:
- `lint-tests`: No errors (warnings acceptable)
- `lint-coverage`: All source files have tests OR @skip-test
- `lint-docs`: All required sections present

---

## Step 5: Report

Include in review report:

```markdown
## shirokuma-docs Verification

### lint-tests
- Total tests: 150
- With @testdoc: 148 (98.7%)
- Issues: 2 warnings (duplicate descriptions)

### lint-coverage
- Source files: 45
- Covered: 42 (93.3%)
- Skipped: 3 (with @skip-test)

### lint-docs
- OVERVIEW.md: ✅ All sections present
- ADR count: 5/3 required ✅
```

---

## Quick Reference

### Essential Commands

```bash
# Quick check (summary only)
shirokuma-docs lint-tests -p . -f summary
shirokuma-docs lint-coverage -p . -f summary

# Detailed report
shirokuma-docs lint-tests -p . -f terminal
shirokuma-docs lint-coverage -p .

# CI mode (fail on error)
shirokuma-docs lint-tests -p . --strict
shirokuma-docs lint-coverage -p . -s

# Generate documentation
shirokuma-docs generate -p .
```

### Configuration

```yaml
# shirokuma-docs.config.yaml
lintTests:
  rules:
    testdoc-required: { severity: "warning" }
    testdoc-japanese: { severity: "warning" }
    duplicate-testdoc: { severity: "error" }

lintCoverage:
  enabled: true
  conventions:
    - source: "apps/web/lib/actions/*.ts"
      test: "apps/web/__tests__/lib/actions/*.test.ts"
  exclude:
    - "apps/web/components/ui/**"
    - "**/types.ts"
```

---

## Integration with Review Roles

This workflow integrates with:
- **Testing Role**: `shirokuma-docs lint-tests` + `lint-coverage`
- **Code Role**: `shirokuma-docs lint-code` (Server Action structure)
- **Next.js Role**: All linters + `feature-map` generation

See [../AGENT.md](../AGENT.md) for role-specific instructions.
