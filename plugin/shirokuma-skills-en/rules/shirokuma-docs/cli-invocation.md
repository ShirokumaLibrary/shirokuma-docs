# shirokuma-docs CLI Invocation

## Direct Call (No npx)

`shirokuma-docs` is installed globally. Always call it directly:

```bash
# Correct
shirokuma-docs session start
shirokuma-docs issues list
shirokuma-docs lint-tests -p .

# Wrong - unnecessary overhead
npx shirokuma-docs session start
```

## Exception: Operations Allowed via gh Directly

PR creation is not implemented in the `shirokuma-docs` CLI. Since it completes in a single operation, direct use of `gh pr create` is allowed.

```bash
gh pr create --base develop --title "feat: title (#42)" --body "$(cat /tmp/body.md)"
```
