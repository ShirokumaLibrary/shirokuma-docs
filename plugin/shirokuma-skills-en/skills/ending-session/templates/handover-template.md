# Handover Template

Use this format when creating handover Discussion posts.

## Template

```markdown
## Summary
{1-2 sentences of what was accomplished during this session}

## Related Issues
- #{issue_number} - {brief status: started/in-progress/completed/blocked}

## Key Decisions
- {decision 1 with brief rationale}
- {decision 2 with brief rationale}

## Blockers
- {blocker description and what's needed to unblock}
- Or: None

## Next Steps
- [ ] {specific actionable task 1}
- [ ] {specific actionable task 2}
- [ ] {specific actionable task 3}

## Modified Files
- `path/to/file1.ts` - {what changed}
- `path/to/file2.tsx` - {what changed}

## Notes
{any additional context, links, or information for the next session}
```

## Example

```markdown
## Summary
Implemented user authentication form with validation and error handling.

## Related Issues
- #123 - in-progress (form complete, need API integration)
- #456 - started (reviewed requirements)

## Key Decisions
- Used React Hook Form for form state management (better TypeScript support)
- JWT tokens stored in httpOnly cookies (security)

## Blockers
- Waiting for backend API spec from @backend-team

## Next Steps
- [ ] Integrate with authentication API once spec is ready
- [ ] Add unit tests for form validation
- [ ] Implement "forgot password" flow

## Modified Files
- `components/auth/login-form.tsx` - New login form component
- `lib/validations/auth.ts` - Zod schemas for auth
- `messages/ja/auth.json` - Japanese translations

## Notes
Backend team mentioned API should be ready by EOD tomorrow.
Reference design: https://example.com/design
```

## Guidelines

1. **Summary**: Keep it brief, focus on outcomes not activities
2. **Related Issues**: Always link to GitHub issues when applicable
3. **Key Decisions**: Document "why" not just "what"
4. **Blockers**: Be specific about what's needed to unblock
5. **Next Steps**: Make them actionable and specific
6. **Modified Files**: Help the next session understand scope
7. **Notes**: Include anything that doesn't fit elsewhere
