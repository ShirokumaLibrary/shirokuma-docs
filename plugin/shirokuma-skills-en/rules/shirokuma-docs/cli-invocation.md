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
