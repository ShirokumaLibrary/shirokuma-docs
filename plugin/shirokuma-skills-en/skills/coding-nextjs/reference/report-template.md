# Implementation Report Template

Save reports to `GitHub Discussions (Reports){YYYY-MM-DD}-{HHmmss}-{feature-name}-implementation.md`

```markdown
# Implementation Report: {{Feature Name}}

- Date: {YYYY-MM-DD}
- App: {admin|public|web}
- Type: {feature|component|page|fix}

## Summary

Brief description of what was implemented.

## Files Created

| File | Purpose |
|------|---------|
| `path/to/file.ts` | Description |

## Files Modified

| File | Changes |
|------|---------|
| `path/to/file.ts` | What was changed |

## Test Coverage

- Unit Tests: {N} tests
- Test File: `__tests__/path/to/test.ts`
- Coverage: {PASS|PARTIAL}

## i18n Keys Added

- `namespace.key1` - Description
- `namespace.key2` - Description

## Dependencies Added

- `package-name` - Why needed

## Verification

- [ ] All tests pass
- [ ] No lint errors
- [ ] Type check passes
- [ ] Manual verification done

## Notes

Any additional notes or follow-up tasks.
```
