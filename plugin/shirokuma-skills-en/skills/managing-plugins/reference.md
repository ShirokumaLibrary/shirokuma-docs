# Plugin Reference

Complete technical specifications for Claude Code plugin development.

## Table of Contents

- [plugin.json Schema](#pluginjson-schema)
- [marketplace.json Schema](#marketplacejson-schema)
- [Plugin Structure](#plugin-structure)
- [Distribution Methods](#distribution-methods)
- [Plugin Management Commands](#plugin-management-commands)
- [Component Integration](#component-integration)
- [Advanced Features](#advanced-features)

## plugin.json Schema

Location: `.claude-plugin/plugin.json`

### Required Fields

#### name (string)

Plugin identifier. Must be unique within marketplace.

**Rules**:
- Lowercase letters, numbers, hyphens only
- No spaces or special characters
- Max 64 characters
- No reserved words ("anthropic", "claude")

**Example**: `"my-awesome-plugin"`

#### description (string)

Brief explanation of plugin purpose and capabilities.

**Rules**:
- Max 200 characters recommended
- Clear and specific
- Third-person voice
- Describe what plugin provides

**Example**: `"Analyzes spreadsheets and generates reports with data visualization"`

#### version (string)

Semantic versioning following MAJOR.MINOR.PATCH format.

**Rules**:
- Must follow semver specification
- Format: "MAJOR.MINOR.PATCH"
- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)

**Example**: `"1.0.0"`, `"2.3.1"`, `"0.1.0"`

#### author (object)

Creator attribution.

**Required subfields**:
- `name` (string): Author name or organization

**Example**:
```json
{
  "author": {
    "name": "John Doe"
  }
}
```

### Optional Fields

#### homepage (string)

URL to plugin documentation or website.

**Example**: `"https://github.com/user/plugin-name"`

#### repository (object)

Source code repository information.

**Fields**:
- `type` (string): Repository type (e.g., "git")
- `url` (string): Repository URL

**Example**:
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/user/plugin-name.git"
  }
}
```

#### keywords (array)

Search keywords for plugin discovery.

**Example**: `["spreadsheet", "analysis", "reporting"]`

#### license (string)

Software license identifier (SPDX format).

**Example**: `"MIT"`, `"Apache-2.0"`, `"GPL-3.0"`

### Complete Example

```json
{
  "name": "spreadsheet-analyzer",
  "description": "Analyzes spreadsheets and generates reports with data visualization",
  "version": "1.2.3",
  "author": {
    "name": "Data Tools Team"
  },
  "homepage": "https://github.com/data-tools/spreadsheet-analyzer",
  "repository": {
    "type": "git",
    "url": "https://github.com/data-tools/spreadsheet-analyzer.git"
  },
  "keywords": ["spreadsheet", "analysis", "reporting", "xlsx"],
  "license": "MIT"
}
```

## marketplace.json Schema

Location: Root of marketplace directory

### Required Fields

#### name (string)

Marketplace identifier. Must be unique.

**Rules**:
- Lowercase letters, numbers, hyphens only
- Descriptive of marketplace purpose
- Max 64 characters

**Example**: `"company-internal-plugins"`

#### owner (object)

Marketplace maintainer information.

**Required subfields**:
- `name` (string): Owner name or organization

**Example**:
```json
{
  "owner": {
    "name": "Engineering Team"
  }
}
```

#### plugins (array)

List of available plugins in marketplace.

**Required for each plugin entry**:
- `name` (string): Plugin identifier
- `source` (string): Path to plugin directory
- `description` (string): Plugin summary

**Example**:
```json
{
  "plugins": [
    {
      "name": "plugin-one",
      "source": "./plugins/plugin-one",
      "description": "First plugin description"
    },
    {
      "name": "plugin-two",
      "source": "./plugins/plugin-two",
      "description": "Second plugin description"
    }
  ]
}
```

### Optional Fields

#### version (string)

Marketplace version (not individual plugin versions).

**Example**: `"1.0.0"`

#### homepage (string)

URL to marketplace documentation.

**Example**: `"https://company.com/claude-plugins"`

### Complete Example

```json
{
  "name": "company-plugins",
  "version": "1.0.0",
  "owner": {
    "name": "Company Engineering"
  },
  "homepage": "https://github.com/company/claude-plugins",
  "plugins": [
    {
      "name": "code-reviewer",
      "source": "./plugins/code-reviewer",
      "description": "Automated code review with company standards"
    },
    {
      "name": "deployment-helper",
      "source": "./plugins/deployment-helper",
      "description": "Deployment workflow automation"
    },
    {
      "name": "api-generator",
      "source": "./plugins/api-generator",
      "description": "Generate API endpoints from OpenAPI specs"
    }
  ]
}
```

## Plugin Structure

### Directory Layout

| Path | Status | Purpose |
|------|--------|---------|
| `.claude-plugin/plugin.json` | Required | Plugin manifest |
| `skills/{skill-name}/SKILL.md` | Optional | Skill definitions (+ reference.md, examples.md) |
| `agents/{agent-name}/AGENT.md` | Optional | Agent definitions (+ reference.md) |
| `commands/{command}.md` | Optional | Slash commands |
| `hooks/{event}.js` | Optional | Event handlers (pre-commit.js, post-build.js) |
| `README.md` | Optional | Plugin documentation |

### File Requirements

#### Required

- `.claude-plugin/plugin.json` - Plugin manifest with metadata

#### Optional (include if using feature)

- `skills/` - Directory for skill definitions
- `agents/` - Directory for agent definitions
- `commands/` - Directory for command definitions
- `hooks/` - Directory for hook scripts
- `README.md` - Plugin usage documentation

### Naming Conventions

#### Plugins

- Format: `plugin-name`
- Use hyphens between words
- Descriptive and specific
- Max 64 characters

#### Skills

- Format: `doing-something` (gerund form)
- Examples: `analyzing-logs`, `generating-reports`

#### Agents

- Format: `noun-agent`
- Examples: `code-reviewer-agent`, `deployment-agent`

#### Commands

- Format: `command-name`
- Examples: `review-pr`, `deploy-staging`

## Distribution Methods

### Method 1: Marketplace (Recommended)

Best for team collaboration and centralized management.

#### Setup Process

1. Create marketplace repository:
```bash
mkdir my-marketplace
cd my-marketplace
git init
```

2. Add plugin directories:
```bash
mkdir plugins
cp -r /path/to/plugin-one plugins/
cp -r /path/to/plugin-two plugins/
```

3. Create marketplace.json at root

4. Commit and host on GitHub/GitLab:
```bash
git add .
git commit -m "Initial marketplace"
git push origin main
```

5. Share marketplace URL with team:
```
https://raw.githubusercontent.com/user/repo/main/marketplace.json
```

#### Installation

Users add marketplace once:
```bash
/plugin marketplace add https://raw.githubusercontent.com/user/repo/main/marketplace.json
```

Then install plugins:
```bash
/plugin install plugin-name@marketplace-name
```

#### Updates

1. Update plugin files
2. Update version in plugin.json
3. Commit and push
4. Users run:
```bash
/plugin update plugin-name
```

### Method 2: Git Repository

Best for project-specific plugins shared via version control.

#### Setup Process

1. Add to project repository:
```bash
mkdir -p .claude/plugins
cp -r plugin-name .claude/plugins/
```

2. Configure automatic installation in `.claude/settings.json`:
```json
{
  "plugins": {
    "autoInstall": true,
    "sources": [
      {
        "type": "local",
        "path": ".claude/plugins/plugin-name"
      }
    ]
  }
}
```

3. Commit to repository:
```bash
git add .claude/
git commit -m "Add custom plugin"
git push
```

#### Installation

Team members:
1. Pull repository: `git pull`
2. Trust folder in Claude Code
3. Plugins auto-install on next restart

### Method 3: npm Package

Best for public distribution to wider community.

#### Setup Process

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
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/user/plugin-name.git"
  }
}
```

2. Publish:
```bash
npm publish --access public
```

#### Installation

Users install globally:
```bash
npm install -g @username/plugin-name
```

Claude Code auto-discovers plugins in global node_modules.

### Method 4: Local File

Best for personal use or testing.

#### Installation

Copy to personal skills directory:
```bash
cp -r plugin-name/skills/* ~/.claude/skills/
cp -r plugin-name/agents/* ~/.claude/agents/
cp -r plugin-name/commands/* ~/.claude/commands/
```

Restart Claude Code.

## Plugin Management Commands

### Marketplace Commands

#### Add marketplace

```bash
/plugin marketplace add <url>
```

Examples:
```bash
# Remote marketplace
/plugin marketplace add https://raw.githubusercontent.com/user/repo/main/marketplace.json

# Local marketplace (testing)
/plugin marketplace add file:///absolute/path/to/marketplace.json
```

#### List marketplaces

```bash
/plugin marketplace list
```

Shows all registered marketplaces.

#### Remove marketplace

```bash
/plugin marketplace remove <marketplace-name>
```

### Plugin Commands

#### List plugins

```bash
/plugin list
```

Shows installed plugins and their status (enabled/disabled).

#### Install plugin

```bash
/plugin install <plugin-name>@<marketplace-name>
```

Example:
```bash
/plugin install code-reviewer@company-plugins
```

#### Update plugin

```bash
/plugin update <plugin-name>
```

Updates to latest version from marketplace.

#### Enable plugin

```bash
/plugin enable <plugin-name>
```

Activates disabled plugin without reinstalling.

#### Disable plugin

```bash
/plugin disable <plugin-name>
```

Temporarily deactivates plugin (keeps files).

#### Uninstall plugin

```bash
/plugin uninstall <plugin-name>
```

Removes plugin completely.

### Verification

After installation, verify new functionality:
```bash
/help
```

New commands should appear in help list.

## Component Integration

### Skills in Plugins

Skills placed in `skills/` directory are automatically loaded.

#### Structure

Location: `plugin-name/skills/{skill-name}/`

| File | Status | Purpose |
|------|--------|---------|
| SKILL.md | Required | Instructions + frontmatter |
| reference.md | Optional | Detailed specs |
| examples.md | Optional | Use cases |
| scripts/*.py | Optional | Helper scripts |

#### Discovery

Claude automatically recognizes skills based on:
- Skill description in SKILL.md frontmatter
- User's natural language queries
- Context of conversation

### Agents in Plugins

Agents placed in `agents/` directory are automatically loaded.

#### Structure

Location: `plugin-name/agents/{agent-name}/` → AGENT.md (required), reference.md (optional)

#### Invocation

Agents can be invoked by:
- Claude autonomously (based on agent description)
- User explicitly: "use the X agent"
- Other agents or skills

### Commands in Plugins

Commands placed in `commands/` directory become slash commands.

#### Structure

Location: `plugin-name/commands/{command}.md` (e.g., review-pr.md, deploy.md)

#### Command File Format

```markdown
# Command description

This command [what it does].

[Full prompt that Claude executes when command is invoked]
```

#### Usage

User types:
```bash
/review-pr
```

Claude receives expanded prompt from `review-pr.md`.

### Hooks in Plugins

Hooks placed in `hooks/` directory execute on events.

#### Structure

Location: `plugin-name/hooks/{event}.js` (e.g., pre-commit.js, post-build.js)

#### Hook Types

- `pre-commit` - Before git commit
- `post-commit` - After git commit
- `pre-push` - Before git push
- `post-build` - After build completes
- `on-file-change` - When file modified

#### Hook Format (JavaScript)

```javascript
module.exports = {
  name: 'hook-name',
  event: 'pre-commit',
  async execute(context) {
    // Hook logic here
    // Return true to allow operation
    // Return false to block operation
    return true;
  }
};
```

## Advanced Features

### Multi-Plugin Dependencies

Plugins can depend on other plugins by documenting requirements:

```json
{
  "name": "advanced-plugin",
  "description": "Advanced features building on base-plugin",
  "dependencies": {
    "base-plugin": ">=1.0.0"
  }
}
```

Note: Manual dependency checking required; no automatic resolution.

### Plugin Configuration

Plugins can define configuration in `.claude/settings.json`:

```json
{
  "plugins": {
    "plugin-name": {
      "setting1": "value1",
      "setting2": "value2"
    }
  }
}
```

Access in skills/agents via configuration context.

### MCP Server Integration

Plugins can include MCP server configurations:

Location: `plugin-name/mcp/` → server-config.json, server.js

Reference MCP configuration in plugin documentation.

### Version Compatibility

Specify Claude Code version requirements:

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "engines": {
    "claude-code": ">=1.5.0"
  }
}
```

### Plugin Testing

Best practices for testing plugins:

1. Create local test marketplace
2. Install plugin from test marketplace
3. Verify all components load correctly
4. Test each skill/agent/command individually
5. Test cross-component interactions
6. Check for conflicts with other plugins
7. Test updates (version bump → reinstall)

### Publishing Checklist

Before distributing plugin:

- [ ] plugin.json has all required fields
- [ ] Version follows semantic versioning
- [ ] All skills have valid frontmatter
- [ ] All agents have valid frontmatter
- [ ] Commands have clear descriptions
- [ ] README.md documents usage
- [ ] Tested locally with fresh installation
- [ ] No hardcoded paths or credentials
- [ ] Cross-platform compatibility (forward slashes)
- [ ] No conflicts with popular plugins
- [ ] License specified if public distribution
- [ ] Repository URL provided (if applicable)

## Common Patterns

### Skill-Only Plugin

Simplest plugin structure for sharing capabilities:

```
utility-plugin/
├── .claude-plugin/
│   └── plugin.json
└── skills/
    ├── skill-one/
    │   └── SKILL.md
    └── skill-two/
        └── SKILL.md
```

### Agent-Only Plugin

For complex workflow automation:

```
automation-plugin/
├── .claude-plugin/
│   └── plugin.json
└── agents/
    ├── builder-agent/
    │   └── AGENT.md
    └── tester-agent/
        └── AGENT.MD
```

### Command-Only Plugin

For user-triggered operations:

```
command-plugin/
├── .claude-plugin/
│   └── plugin.json
└── commands/
    ├── quick-fix.md
    └── generate-docs.md
```

### Comprehensive Plugin

Combining all features:

```
full-plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── analyzer/
│       └── SKILL.md
├── agents/
│   └── optimizer/
│       └── AGENT.md
├── commands/
│   └── optimize.md
└── hooks/
    └── pre-commit.js
```
