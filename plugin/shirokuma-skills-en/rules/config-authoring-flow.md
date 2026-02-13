# Config Authoring Flow

When creating or updating Claude Code configuration files (rules, skills, agents, output-styles, plugins), follow this flow to ensure quality and consistency.

## Required Tools

| Tool | Type | When |
|------|------|------|
| `managing-rules` | Skill | Creating or updating rules |
| `managing-skills` | Skill | Creating or updating skills |
| `managing-agents` | Skill | Creating or updating agents |
| `managing-output-styles` | Skill | Creating or updating output styles |
| `managing-plugins` | Skill | Creating or updating plugins |
| `claude-config-reviewing` | Skill | After any config creation/update (quality check) |

## Flow

1. **Before writing**: Invoke the relevant managing-* skill for best practices and templates
2. **Write**: Create or update the config file following the skill's guidance
3. **After writing**: Run the `claude-config-reviewing` skill to verify quality

### Example: Creating a new rule

```
1. Invoke managing-rules skill -> get template and best practices
2. Write plugin/shirokuma-skills-en/rules/my-rule.md
3. Invoke claude-config-reviewing skill -> verify quality and consistency
```

## When This Applies

- Creating new files in `.claude/rules/`, `.claude/skills/`, `.claude/agents/`, `.claude/output-styles/`, `.claude/commands/`
- Creating new files in `plugin/` directories (skills, agents, rules, plugins)
- Updating existing config files with structural changes (not typo fixes)

## Exceptions

- Minor typo fixes or single-line edits do not require the full flow
- The reviewer skill step can be skipped if explicitly told by the user
