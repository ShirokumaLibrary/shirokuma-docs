# Test Review Role

## Responsibilities

Test code quality review covering:
- TDD compliance verification
- Test coverage analysis
- Test patterns and anti-patterns
- Mock usage review
- E2E test quality

## Required Knowledge

Load these files for context:

**Skill files (explicit load):**
- `../criteria/testing.md` - Testing criteria
- `../patterns/server-actions.md` - Mock patterns
- `../patterns/e2e-testing.md` - E2E patterns

**Rules (auto-loaded from `.claude/rules/`):**
- `tech-stack.md` - Version information
- `known-issues.md` - Testing issues

## Review Checklist

### Test Documentation (shirokuma-docs lint-tests)

Run test documentation lint before reviewing:

```bash
# Run test documentation lint
shirokuma-docs lint-tests -p . -c shirokuma-docs.config.yaml -f summary

# For detailed report
shirokuma-docs lint-tests -p . -c shirokuma-docs.config.yaml -f terminal
```

Check for:
- [ ] @testdoc comments present (Japanese test descriptions)
- [ ] @purpose tags explaining test intent
- [ ] @expected tags with expected outcomes
- [ ] No duplicate @testdoc descriptions
- [ ] Coverage threshold met (configurable)

JSDoc format for test documentation:
```typescript
/**
 * @testdoc 日本語でのテスト説明
 * @purpose テストの目的
 * @precondition 前提条件
 * @expected 期待する結果
 */
it("english test name", () => { ... });
```

### Implementation-Test Coverage (shirokuma-docs lint-coverage)

Run coverage check:
```bash
# Check source-test file mapping
shirokuma-docs lint-coverage -p . -c shirokuma-docs.config.yaml

# Summary only
shirokuma-docs lint-coverage -p . -c shirokuma-docs.config.yaml -f summary

# Strict mode (fail on missing tests)
shirokuma-docs lint-coverage -p . -c shirokuma-docs.config.yaml -s
```

Check for:
- [ ] All source files have corresponding test files
- [ ] @skip-test annotations have valid reasons
- [ ] No orphan test files (tests without implementations)

@skip-test annotation for files that don't need tests:
```typescript
/**
 * @skip-test 自動生成コードのためテスト不要
 */
export const generatedSchema = { ... }
```

Valid skip reasons:
- 自動生成 (auto-generated code)
- shadcn/ui (library components)
- E2Eでカバー (covered by E2E tests)
- 外部ライブラリ (external library wrapper)
- 単純なre-export (simple re-export)

### TDD Compliance
- [ ] Tests committed before implementation
- [ ] Red-Green-Refactor cycle followed
- [ ] Tests describe behavior, not implementation
- [ ] Git history shows test-first approach

### Test Coverage
- [ ] Server Actions: 80%+
- [ ] Components: 70%+
- [ ] Utilities: 90%+
- [ ] Critical paths covered

### Unit Test Quality
- [ ] Success cases tested
- [ ] Error cases tested
- [ ] Edge cases covered
- [ ] Proper beforeEach/afterEach
- [ ] Mock cleanup between tests

### E2E Test Quality
- [ ] Semantic locators used
- [ ] i18n variants handled
- [ ] Loading states tested
- [ ] Error states tested
- [ ] No arbitrary timeouts

### Mock Patterns
- [ ] Queue-based mocks for DB
- [ ] Auth properly mocked
- [ ] External deps only mocked
- [ ] No over-mocking

## Test Anti-patterns to Detect

Check for the following test violations during review:

### TDD Violation Anti-patterns
- [ ] Tests written after implementation (not test-first)
- [ ] Tests commented out or skipped
- [ ] Tests depending on implementation details (should test behavior)
- [ ] Broken tests left unfixed

### Flaky Test Anti-patterns
- [ ] Using arbitrary timeouts (`waitForTimeout`)
- [ ] Time-dependent tests (`new Date()` comparisons)
- [ ] Order-dependent tests
- [ ] External service dependencies not mocked

### Mock Anti-patterns
- [ ] Over-mocking (not testing real code)
- [ ] Mocks not reset between tests
- [ ] Missing `jest.clearAllMocks()` in `beforeEach`
- [ ] Mocks diverging from actual API

### E2E Anti-patterns
- [ ] Forcing clicks with `force: true`
- [ ] Direct URL navigation skipping user journey
- [ ] Using `test.skip` when seed data should exist
- [ ] Overusing CSS selectors instead of semantic locators
- [ ] Using `textbox` role for `type="password"` inputs

### Coverage Anti-patterns
- [ ] Tests written only for coverage metrics
- [ ] Missing error case tests
- [ ] Missing boundary value tests
- [ ] Insufficient auth/authorization tests

## Verify TDD with Git

```bash
# Check if tests were committed before implementation
git log --oneline --name-only -- "*.test.ts" "*.spec.ts"
```

## Report Format

Use template from `templates/report.md`:

1. **TDD Assessment**: Compliance level
2. **Coverage Report**: Current vs required
3. **Test Quality Issues**: Anti-patterns found
4. **Missing Tests**: Gaps identified
5. **Recommendations**: Improvements

## Trigger Keywords

- "test review"
- "テストレビュー"
- "review tests"
- "test quality"
