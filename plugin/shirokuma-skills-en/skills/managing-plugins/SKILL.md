---
name: managing-plugins
description: Create, configure, and distribute Claude Code plugins with skills, agents, commands, and hooks. Use when user mentions "plugin", "plugin.json", "marketplace.json", "create plugin", "publish plugin", or wants to package functionality for distribution.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Managing Claude Code Plugins

Create, configure, and distribute Claude Code plugins to extend functionality and share capabilities across projects and teams.

## When to Use

Automatically invoke when the user:
- Asks to "create a plugin" or "make a plugin"
- Mentions "plugin.json" or "marketplace.json"
- Says "publish plugin" or "distribute plugin"
- Wants to "package skills/agents" for sharing
- Needs to "setup marketplace" or "install plugins"
- Asks "how to share my custom commands/skills"
- Wants to know "plugin structure" or "how plugins work"

## What Are Plugins?

Plugins extend Claude Code with custom functionality shareable across projects and teams. They can contain:
- **Skills**: Model-invoked capabilities (automatic)
- **Agents**: Specialized sub-agents for complex workflows
- **Commands**: Slash commands (user-triggered with `/`)
- **Hooks**: Event handlers for automation
- **MCP Servers**: External tool integrations

## Workflow

### Step 1: Determine Plugin Scope

Ask the user:
1. What functionality to include?
   - Skills only
   - Agents only
   - Commands only
   - Mixed (skills + agents + commands)
   - Hooks or MCP servers
2. Distribution method?
   - Marketplace (recommended for teams)
   - Git repository (for version-controlled projects)
   - npm package (for public distribution)
   - Manual copy (for personal use)
3. Target audience?
   - Personal use
   - Team collaboration
   - Public community

### Step 2: Create Plugin Structure

#### Basic plugin structure

| Path | Required | Purpose |
|------|----------|---------|
| `.claude-plugin/plugin.json` | ✓ | Metadata manifest |
| `skills/skill-name/SKILL.md` | | If including skills |
| `agents/agent-name/AGENT.md` | | If including agents |
| `commands/command-name.md` | | If including commands |
| `hooks/hook-name.js` | | If including hooks |

#### Create plugin directory

```bash
mkdir -p plugin-name/.claude-plugin
mkdir -p plugin-name/skills
mkdir -p plugin-name/agents
mkdir -p plugin-name/commands
mkdir -p plugin-name/hooks
```

### Step 3: Create plugin.json Manifest

The manifest is required for all plugins. Create `.claude-plugin/plugin.json`:

```json
{
  "name": "plugin-name",
  "description": "Brief description of what this plugin does",
  "version": "1.0.0",
  "author": {
    "name": "Author Name"
  }
}
```

#### Required fields

- `name`: Plugin identifier (lowercase, hyphens, max 64 chars)
- `description`: Brief explanation (max 200 chars recommended)
- `version`: Semantic versioning (MAJOR.MINOR.PATCH)
- `author.name`: Creator attribution

#### Validation checklist

- [ ] Valid JSON syntax (use proper quotes, commas)
- [ ] Name follows naming convention (lowercase, hyphens)
- [ ] Version follows semver format (e.g., "1.0.0")
- [ ] Description is clear and concise

### Step 4: Add Plugin Components

#### Adding skills

1. Create skill directory: `skills/skill-name/`
2. Add `SKILL.md` with frontmatter
3. Add supporting files as needed

See [examples.md](examples.md#skill-plugin) for complete example.

#### Adding agents

1. Create agent directory: `agents/agent-name/`
2. Add `AGENT.md` with frontmatter
3. Add supporting files as needed

See [examples.md](examples.md#agent-plugin) for complete example.

#### Adding commands

1. Create markdown file: `commands/command-name.md`
2. Add command description and prompt
3. Command activates with `/command-name`

See [examples.md](examples.md#command-plugin) for complete example.

### Step 5: Test Plugin Locally

#### Method 1: Development marketplace

1. Create marketplace directory structure:
```bash
mkdir -p test-marketplace
mv plugin-name test-marketplace/
```

2. Create `marketplace.json`:
```json
{
  "name": "test-marketplace",
  "owner": {
    "name": "Your Name"
  },
  "plugins": [
    {
      "name": "plugin-name",
      "source": "./plugin-name",
      "description": "Brief description"
    }
  ]
}
```

3. Add marketplace:
```bash
# In Claude Code
/plugin marketplace add file:///absolute/path/to/test-marketplace/marketplace.json
```

4. Install plugin:
```bash
/plugin install plugin-name@test-marketplace
```

#### Method 2: Direct installation

For personal testing, copy to `.claude/`:
```bash
cp -r plugin-name/skills/* ~/.claude/skills/
cp -r plugin-name/agents/* ~/.claude/agents/
cp -r plugin-name/commands/* ~/.claude/commands/
```

#### Verification

1. Restart Claude Code
2. Check plugin status: `/plugin list`
3. Test skills (trigger with natural language)
4. Test agents (invoke with Task tool or natural language)
5. Test commands (use `/command-name`)

### Step 6: Distribute Plugin

#### Option A: Marketplace (Recommended for teams)

1. Create marketplace repository:
```bash
mkdir my-marketplace
cd my-marketplace
git init
```

2. Add plugins:
```bash
mkdir plugins
cp -r /path/to/plugin-name plugins/
```

3. Create marketplace.json:
```json
{
  "name": "my-marketplace",
  "owner": {
    "name": "Team Name"
  },
  "plugins": [
    {
      "name": "plugin-name",
      "source": "./plugins/plugin-name",
      "description": "Plugin description"
    }
  ]
}
```

4. Commit and host:
```bash
git add .
git commit -m "Add plugin-name"
git push origin main
```

5. Team members add marketplace:
```bash
/plugin marketplace add https://raw.githubusercontent.com/user/repo/main/marketplace.json
/plugin install plugin-name@my-marketplace
```

#### Option B: Git repository (For project-specific plugins)

1. Add to project repository:
```bash
mkdir -p .claude/plugins
cp -r plugin-name .claude/plugins/
git add .claude/plugins
git commit -m "Add custom plugin"
git push
```

2. Configure `.claude/settings.json`:
```json
{
  "plugins": {
    "autoInstall": true
  }
}
```

3. Team members automatically get plugins on `git pull` (after trusting folder)

#### Option C: npm package (For public distribution)

1. Create package.json:
```json
{
  "name": "@username/plugin-name",
  "version": "1.0.0",
  "description": "Plugin description",
  "main": ".claude-plugin/plugin.json",
  "files": [
    ".claude-plugin/",
    "skills/",
    "agents/",
    "commands/",
    "hooks/"
  ],
  "keywords": ["claude-code", "plugin"],
  "author": "Your Name",
  "license": "MIT"
}
```

2. Publish:
```bash
npm publish --access public
```

3. Users install:
```bash
npm install -g @username/plugin-name
```

## Common Patterns

### Quick plugin from existing skills

If you already have skills in `.claude/skills/`:
```bash
mkdir -p my-plugin/.claude-plugin
mkdir -p my-plugin/skills

# Copy existing skills
cp -r ~/.claude/skills/my-skill my-plugin/skills/

# Create manifest
cat > my-plugin/.claude-plugin/plugin.json << 'EOF'
{
  "name": "my-plugin",
  "description": "Collection of useful skills",
  "version": "1.0.0",
  "author": { "name": "Your Name" }
}
EOF
```

### Mixed plugin (skills + agents + commands)

See [examples.md](examples.md#comprehensive-plugin) for complete example combining all component types.

### Update plugin version

1. Edit `.claude-plugin/plugin.json`:
```json
{
  "version": "1.1.0"
}
```

2. Update marketplace.json if using marketplace distribution

3. Users update:
```bash
/plugin update plugin-name
```

## Error Handling

### Plugin not found

**Symptom**: `/plugin install` fails with "not found"

**Solutions**:
- Verify marketplace.json path is correct
- Check plugin name matches exactly (case-sensitive)
- Ensure marketplace is added: `/plugin marketplace list`
- Try re-adding marketplace

### Skills/agents not appearing

**Symptom**: Plugin installed but functionality not available

**Solutions**:
- Restart Claude Code (required after installation)
- Check plugin is enabled: `/plugin list`
- Enable if disabled: `/plugin enable plugin-name`
- Verify file structure matches expected layout
- Check SKILL.md/AGENT.md have valid frontmatter

### Invalid plugin.json

**Symptom**: Installation fails with "invalid manifest"

**Solutions**:
- Validate JSON syntax (check commas, quotes, brackets)
- Ensure all required fields present (name, description, version, author)
- Check version follows semver (e.g., "1.0.0" not "1.0")
- Verify file is in `.claude-plugin/plugin.json`

### Marketplace URL not accessible

**Symptom**: "Failed to fetch marketplace"

**Solutions**:
- Use raw file URL for GitHub (raw.githubusercontent.com)
- Ensure file is publicly accessible
- Check URL has no typos
- For local testing, use `file:///` absolute path

### Plugin conflicts

**Symptom**: Multiple plugins provide same skill/command

**Solutions**:
- Use unique names across plugins
- Disable conflicting plugin: `/plugin disable other-plugin`
- Rename skill/command in one plugin
- Check plugin descriptions for overlaps

## Notes

- Plugin names must be lowercase with hyphens only
- Always use forward slashes in paths (cross-platform)
- Restart Claude Code after installing/updating plugins
- Test locally before distributing to team
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Skills in plugins are model-invoked (automatic)
- Commands in plugins are user-invoked (manual with `/`)
- Marketplace.json must be publicly accessible for remote marketplaces
- Local marketplaces use `file:///` absolute paths

## Related Resources

- [reference.md](reference.md) - Complete plugin.json and marketplace.json specifications
- [examples.md](examples.md) - Real-world plugin examples with all component types
- Claude Code Plugin Documentation: https://code.claude.com/docs/en/plugins
