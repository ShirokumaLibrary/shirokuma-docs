# PR Review Response

## When Review Comments Are Received

1. Fetch all review threads: `shirokuma-docs issues pr-comments <PR#>`
2. For each **unresolved** thread, determine the response type:

### Code Fix Required

1. Fix the code
2. Commit and push
3. Reply referencing the commit:
   ```bash
   shirokuma-docs issues pr-reply <PR#> --reply-to <database_id> --body - <<'EOF'
   Reply content
   EOF
   ```
4. Resolve: `shirokuma-docs issues resolve <PR#> --thread-id <PRRT_id>`

### Question or Discussion

1. Reply with explanation
2. Resolve the thread

### Disagreement

1. Reply explaining the concern and trade-offs
2. Do **not** resolve — let the reviewer decide

## Rules

1. **Reply and Resolve are paired** - Every reply should be followed by a resolve, unless waiting for reviewer input
2. **Process all threads before reporting back** - Do not ask the user between threads
3. **Use correct IDs** - `--reply-to` takes numeric `database_id`, `--thread-id` takes GraphQL `PRRT_` ID (both from `pr-comments` output)

## Edge Cases

| Situation | Action |
|-----------|--------|
| Thread already resolved | Skip |
| Outdated comment (code changed) | Reply if feedback is still valid, reference the relevant commit |
| Reviewer requests re-review | Reply but leave thread open |
