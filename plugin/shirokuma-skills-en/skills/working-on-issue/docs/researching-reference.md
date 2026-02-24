# Research Work Type Reference

Guide for delegating from `working-on-issue` to `researching-best-practices` skill.

## Delegation Conditions

| Condition | Delegate To |
|-----------|-------------|
| Keywords: `research`, `investigate`, `best practices` | `researching-best-practices` |
| Issue type: Research | `researching-best-practices` |

## Execution Context

`researching-best-practices` runs with `context: fork` (sub-agent). Does not pollute main context.

## TDD Not Applied

Research work type does not use TDD.

## What researching-best-practices Provides

- Web search-powered technical research
- Best practice comparison and analysis
- Structured research report

## Chain

Research uses Discussion creation instead of the commit → PR chain.

```
researching-best-practices → Discussion (Research) creation → Complete
```

## Discussion Storage

Research results are saved to Research category Discussion:

```bash
shirokuma-docs discussions create \
  --category Research \
  --title "[Research] {topic}" \
  --body-file research-result.md
```
