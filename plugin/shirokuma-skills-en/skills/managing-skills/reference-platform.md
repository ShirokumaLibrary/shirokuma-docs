# Platform and Integration Reference

Platform-specific considerations and integration guides for skills.

For core specifications (frontmatter, file structure, naming), see [reference.md](reference.md).

## Table of Contents

1. [Platform-Specific Considerations](#platform-specific-considerations)
2. [API Integration](#api-integration)
3. [Agent SDK Configuration](#agent-sdk-configuration)
4. [Plugin Integration](#plugin-integration)
5. [Version Control](#version-control)
6. [Additional Topics](#additional-topics)

---

## Platform-Specific Considerations

### Claude Code (CLI)

**Features**:
- Full filesystem access
- Bash command execution
- Tool restrictions via `allowed-tools`
- Network access (full)
- Git operations

**Configuration**:
```yaml
---
name: my-skill
description: ...
allowed-tools: Read, Write, Bash
---
```

**Skill loading**: Automatic from `.claude/skills/` and `~/.claude/skills/`

### Claude API

**Features**:
- Pre-built skills (pptx, xlsx, docx, pdf)
- Custom skill upload
- Code execution environment
- Network access (restricted)

**Usage**:
```python
response = client.beta.messages.create(
    model="claude-sonnet-4-5-20250929",
    betas=["code-execution-2025-08-25", "skills-2025-10-02"],
    container={"skills": [{"type": "anthropic", "skill_id": "pptx"}]},
    messages=[{"role": "user", "content": "Create presentation..."}]
)
```

**Note**: `allowed-tools` field ignored (not applicable)

### Claude.ai

**Features**:
- Pre-built skills available
- Custom skill upload (per-user)
- Network access varies by environment
- No sharing across users

**Limitations**:
- Skills don't sync with API
- Individual user scope only
- No workspace-wide skills

### Agent SDK

**Features**:
- Filesystem-based skills only
- Custom tool control via main config
- `settingSources` configuration required

**Configuration**:
```typescript
// TypeScript
const agent = new Agent({
  settingSources: ["user", "project"],
  allowedTools: ["Skill", "Read", "Write", "Bash"]
});
```

```python
# Python
agent = Agent(
    setting_sources=["user", "project"],
    allowed_tools=["Skill", "Read", "Write", "Bash"]
)
```

**Critical**: `allowed-tools` in SKILL.md frontmatter is IGNORED. Control tools via main `allowedTools` parameter.

**Skill discovery paths**:
- `settingSources: ["user"]` → `~/.claude/skills/`
- `settingSources: ["project"]` → `.claude/skills/`
- `settingSources: ["user", "project"]` → both (project takes priority)

---

## API Integration

### Anthropic Skills API

**List available skills**:
```python
import anthropic

client = anthropic.Client(api_key="your-api-key")

skills = client.beta.skills.list(
    source="anthropic",
    betas=["skills-2025-10-02"]
)

for skill in skills:
    print(f"ID: {skill.id}, Name: {skill.name}")
```

**Use skill in message**:
```python
response = client.beta.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=4096,
    betas=["code-execution-2025-08-25", "skills-2025-10-02"],
    container={
        "skills": [
            {"type": "anthropic", "skill_id": "pptx"}
        ]
    },
    messages=[
        {"role": "user", "content": "Create a 5-slide presentation on quantum computing"}
    ],
    tools=[
        {"type": "code_execution_20250825", "name": "code_execution"}
    ]
)
```

**Download generated file**:
```python
for block in response.content:
    if block.type == "server_tool_use":
        result = block.result
        for file in result.files:
            with open(file.filename, "wb") as f:
                f.write(base64.b64decode(file.content))
```

### Available Pre-built Skills

| Skill ID | Description |
|----------|-------------|
| `pptx` | Create PowerPoint presentations |
| `xlsx` | Create/edit Excel spreadsheets |
| `docx` | Create Word documents |
| `pdf` | Read and extract from PDFs |

---

## Agent SDK Configuration

### Required Setup

**TypeScript**:
```typescript
import { Agent } from "@anthropic-ai/sdk";

const agent = new Agent({
  // REQUIRED: Enable skill loading
  settingSources: ["user", "project"],

  // REQUIRED: Include Skill tool
  allowedTools: ["Skill", "Read", "Write", "Bash", "Grep", "Glob"],

  // Optional: API key
  apiKey: process.env.ANTHROPIC_API_KEY,

  // Optional: Model
  model: "claude-sonnet-4-5-20250929"
});
```

**Python**:
```python
from anthropic import Agent

agent = Agent(
    # REQUIRED: Enable skill loading
    setting_sources=["user", "project"],

    # REQUIRED: Include Skill tool
    allowed_tools=["Skill", "Read", "Write", "Bash", "Grep", "Glob"],

    # Optional: API key
    api_key=os.environ.get("ANTHROPIC_API_KEY"),

    # Optional: Model
    model="claude-sonnet-4-5-20250929"
)
```

### Common Issues

**Skills not loading**:

Problem: Skills not found even though directory exists

Solution: Verify `settingSources` configuration:
```typescript
// Missing setting_sources - skills won't load!
const agent = new Agent({
  allowedTools: ["Skill"]  // Not enough!
});

// Correct - skills will load
const agent = new Agent({
  settingSources: ["project"],  // This is required!
  allowedTools: ["Skill"]
});
```

**Wrong tool restrictions**:

Problem: Tool restrictions in SKILL.md not working

Explanation: `allowed-tools` in SKILL.md frontmatter is Claude Code specific, ignored by SDK

Solution: Control tools via main config:
```typescript
const agent = new Agent({
  settingSources: ["project"],
  // Control tools HERE, not in SKILL.md
  allowedTools: ["Skill", "Read", "Grep", "Glob"]  // Read-only
});
```

---

## Plugin Integration

### Plugin Structure

| Path | Content |
|------|---------|
| `package.json` | Plugin metadata |
| `.claude-plugin/plugin.json` | Plugin configuration |
| `commands/my-command.md` | Custom commands |
| `agents/my-agent.md` | Custom agents |
| `skills/skill-one/SKILL.md` | Skill 1 main |
| `skills/skill-one/reference.md` | Skill 1 reference |
| `skills/skill-one/scripts/helper.py` | Skill 1 scripts |
| `skills/skill-two/SKILL.md` | Skill 2 main |
| `hooks/my-hook.js` | Hooks |
| `README.md` | Documentation |

### package.json

```json
{
  "name": "@username/my-claude-plugin",
  "version": "1.0.0",
  "description": "Claude Code plugin with skills",
  "main": "index.js",
  "keywords": ["claude", "claude-code", "plugin", "skills"],
  "author": "Your Name",
  "license": "MIT",
  "files": [
    ".claude-plugin/",
    "commands/",
    "agents/",
    "skills/",
    "hooks/"
  ]
}
```

### .claude-plugin/plugin.json

```json
{
  "name": "my-claude-plugin",
  "version": "1.0.0",
  "description": "Plugin with custom skills",
  "skills": [
    "skills/skill-one",
    "skills/skill-two"
  ]
}
```

### Publishing

**Build and test locally**:
```bash
# Link for local testing
npm link

# In another directory
npm link @username/my-claude-plugin

# Test skills available
ls ~/.npm-global/lib/node_modules/@username/my-claude-plugin/skills/
```

**Publish to npm**:
```bash
# Login to npm
npm login

# Publish
npm publish --access public

# Users install with
npm install -g @username/my-claude-plugin
```

### Distribution Best Practices

1. Version skills separately: Include version info in each SKILL.md
2. Document dependencies: List any required system tools
3. Test across platforms: Verify Windows, macOS, Linux
4. Provide examples: Include example usage in README
5. Changelog: Track skill changes across plugin versions

---

## Version Control

### What to Commit

**Commit to git**:
- `.claude/skills/*/SKILL.md`
- `.claude/skills/*/reference.md`
- `.claude/skills/*/examples.md`
- `.claude/skills/*/best-practices.md`
- `.claude/skills/*/scripts/`
- `.claude/skills/*/templates/`

**Don't commit**:
- `~/.claude/skills/` (personal skills)
- Generated output files
- Temporary test files
- API keys or secrets

### .gitignore

```gitignore
# Personal skills (not project skills)
.claude/skills/personal-*/

# Generated outputs
.claude/skills/*/output/
.claude/skills/*/*.tmp

# Secrets
.claude/skills/*/.env
.claude/skills/*/secrets.yaml
```

### Versioning Skills

In SKILL.md body:
```markdown
## Version

Current version: 1.2.0

## Changelog

### 1.2.0
- Added support for Excel formulas
- Improved error handling
- Fixed bug with date parsing

### 1.1.0
- Added CSV export
- Performance improvements

### 1.0.0
- Initial release
```

**Semantic versioning**:
- Major (1.0.0 → 2.0.0): Breaking changes
- Minor (1.0.0 → 1.1.0): New features, backwards compatible
- Patch (1.0.0 → 1.0.1): Bug fixes only

### Commit Messages

**Good**:
```
Add analyzing-spreadsheets skill
Update pdf-extractor skill: add merge functionality
Fix: correct path handling in document-generator skill
Docs: improve examples in data-processor skill
```

**Poor**:
```
Update skill
Fix bug
Changes
WIP
```

---

## Additional Topics

### Security Considerations

**Trust sources**:
- Only install plugins from trusted sources
- Review skill code before using
- Audit bundled scripts
- Check for external network connections

**Sensitive operations**:
- Avoid storing API keys in skills
- Use environment variables for secrets
- Don't commit credentials
- Restrict file access where possible

**Sandboxing**:
- Use `allowed-tools` to limit capabilities
- Test in isolated environment first
- Monitor file system access
- Review bash command executions

### Performance Optimization

**SKILL.md size**:
- Target: Under 500 lines
- Absolute max: 1000 lines
- Use supporting files for extensive content

**Token efficiency**:
- Level 1 (metadata): ~100 tokens always loaded
- Level 2 (SKILL.md): ~5k tokens when triggered
- Level 3 (supporting): loaded on-demand only

**File organization**:
- Split large files by topic
- Use clear file names for quick identification
- Add table of contents for long files

### Multi-Model Support

**Test across models**:
- Claude Haiku (fast, less capable)
- Claude Sonnet (balanced)
- Claude Opus (most capable)

**Model-specific considerations**:
- Haiku: Simpler instructions, explicit steps
- Sonnet: Balanced complexity
- Opus: Can handle more nuance

**Adaptive instructions**:
```markdown
## Workflow

### Basic Approach (all models)
[Simple, explicit steps]

### Advanced Optimization (Opus)
[More nuanced, complex approach]
```

### Internationalization

**Primary language**: English (for broadest compatibility)

**Supporting multiple languages**: SKILL.md (English), SKILL.ja.md (Japanese), SKILL.zh.md (Chinese), reference.md

**Note**: Claude Code may not support i18n features yet. Check latest documentation.
