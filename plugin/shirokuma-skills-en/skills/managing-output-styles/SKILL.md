---
name: managing-output-styles
description: Manage Claude Code output styles including switching between default/explanatory/learning modes and creating custom styles. Use when user mentions "output style", "explanatory mode", "learning mode", "change style", or "create custom style".
allowed-tools: Read, Write, Edit, Glob, Grep
---

# Managing Output Styles

Configure Claude Code's behavior by switching between built-in output styles or creating custom styles tailored to your workflow.

## Workflow

### Step 1: Check Current Style

Read the local settings file:

```bash
cat .claude/settings.local.json
```

Look for `outputStyle` field. If not present, "default" is active.

### Step 2: Switch to Built-in Style

Use the slash command:

```bash
/output-style [style-name]
```

Examples:
- `/output-style default` - Standard engineering mode
- `/output-style explanatory` - Educational insights
- `/output-style learning` - Hands-on practice mode

Or open interactive menu:

```bash
/output-style
```

### Step 3: Create Custom Style

#### Interactive creation:

```bash
/output-style:new [description of desired behavior]
```

Example:
```bash
/output-style:new Focus on security best practices and include threat modeling
```

#### Manual creation:

1. Choose storage location:
   - User-level: `~/.claude/output-styles/style-name.md`
   - Project-level: `.claude/output-styles/style-name.md`

2. Create markdown file with frontmatter:

```markdown
---
name: security-focused
description: Emphasize security best practices
---

# Security-Focused Development

When writing code:
- Always consider OWASP Top 10 vulnerabilities
- Include security comments for sensitive operations
- Suggest security testing approaches
- Flag potential security risks

[Additional instructions...]
```

3. Activate:

```bash
/output-style security-focused
```

### Step 4: Edit Custom Style

1. Locate the style file:

```bash
# User-level
ls ~/.claude/output-styles/

# Project-level
ls .claude/output-styles/
```

2. Read current content:

```bash
cat ~/.claude/output-styles/style-name.md
```

3. Edit the file using Edit tool

4. Restart Claude Code or re-apply style:

```bash
/output-style style-name
```

## Common Patterns

### Pattern 1: Quick Style Switching

For frequent switching, create project shortcuts in `.claude/commands/`:

```bash
# .claude/commands/explain.md
Switch to explanatory output style with /output-style explanatory
```

Then use: `/explain`

### Pattern 2: Team-Shared Styles

Place custom styles in `.claude/output-styles/` and commit to git:

```bash
git add .claude/output-styles/team-style.md
git commit -m "Add team output style"
```

Team members can activate with:

```bash
/output-style team-style
```

### Pattern 3: Task-Specific Styles

Create styles for specific workflows:
- `refactoring-focused.md` - Emphasize code quality and testing
- `documentation-first.md` - Prioritize inline docs and README updates
- `performance-optimized.md` - Focus on benchmarks and optimization

See [examples.md](examples.md) for complete examples.

## Key Differences from Related Features

| Feature | Purpose | Scope |
|---------|---------|-------|
| Output Styles | Modify system prompt | Changes Claude's base behavior |
| CLAUDE.md | Add context | Appends as user message |
| --append-system-prompt | Extend prompt | Adds to (not replaces) system prompt |
| Agents | Specialized tasks | Dedicated model with specific tools |

Output styles **replace** the system prompt while preserving core capabilities.

## Error Handling

### Issue: Custom style not found

```
Error: Output style 'my-style' not found
```

**Solution**: Check file exists and name matches:

```bash
# Verify file exists
ls ~/.claude/output-styles/my-style.md
ls .claude/output-styles/my-style.md

# Check frontmatter name matches
cat ~/.claude/output-styles/my-style.md
```

### Issue: Style changes not applied

**Solution**: Restart Claude Code after editing style files, or re-run `/output-style style-name`

### Issue: Invalid YAML frontmatter

```
Error: Invalid frontmatter in output style
```

**Solution**: Validate YAML syntax (use spaces, not tabs):

```yaml
---
name: my-style        # No quotes needed for simple names
description: Brief description
---
```

## Completion Report

### Style Switch

```markdown
## Style Switch Complete

**Style:** {style-name}
**Scope:** {user-level | project-level}
```

### Style Creation

```markdown
## Style Created

**Name:** {style-name}
**Location:** {path}
**Description:** {description}
```

When run standalone, suggest next steps (activation command, testing method).

## Notes

- Settings stored in `.claude/settings.local.json` (project-level)
- Custom styles in `~/.claude/output-styles/` (user) or `.claude/output-styles/` (project)
- User-level styles available across all projects
- Project-level styles override user-level with same name
- Use forward slashes in paths (cross-platform compatibility)
- Frontmatter must use spaces, not tabs
- Style changes take effect immediately when using `/output-style` command
- Core capabilities (Read, Write, Bash, etc.) preserved across all styles

## Related Resources

- [reference.md](reference.md) - Complete frontmatter specification, settings file format
- [examples.md](examples.md) - Custom style examples for common use cases

## Additional Notes

- Confirm custom style direction with AskUserQuestion before creating
- Use TodoWrite to track progress when creating multiple styles
- Do not use names that conflict with built-in styles (default, explanatory, learning)
