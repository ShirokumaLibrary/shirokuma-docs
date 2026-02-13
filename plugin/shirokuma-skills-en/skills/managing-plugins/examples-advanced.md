# Advanced Plugin Examples

Advanced plugin examples including comprehensive plugins, marketplace setup, team workflows, and npm publishing.

For basic plugin examples (skill-only, agent-only, command-only), see [examples.md](examples.md).

## Comprehensive Plugin

Plugin with skills, agents, commands, and hooks working together.

### Directory Structure

| Path | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Plugin manifest |
| `skills/designing-apis/SKILL.md` | API design skill |
| `skills/validating-schemas/SKILL.md` | Schema validation skill |
| `agents/api-generator/AGENT.md` | Code generation agent |
| `commands/new-endpoint.md` | Endpoint creation command |
| `commands/test-api.md` | API testing command |
| `hooks/validate-openapi.js` | Pre-commit hook |
| `templates/` | OpenAPI templates |
| `README.md` | Documentation |

### plugin.json

```json
{
  "name": "api-toolkit",
  "description": "Complete toolkit for API design, generation, validation, and testing",
  "version": "3.0.0",
  "author": {
    "name": "API Platform Team"
  },
  "homepage": "https://github.com/company/api-toolkit",
  "repository": {
    "type": "git",
    "url": "https://github.com/company/api-toolkit.git"
  },
  "keywords": ["api", "openapi", "rest", "validation"],
  "license": "MIT"
}
```

### skills/designing-apis/SKILL.md

```markdown
---
name: designing-apis
description: Design RESTful APIs following best practices with OpenAPI specifications. Use when user mentions "design API", "create REST endpoint", or "OpenAPI spec".
---

# Designing APIs

Design RESTful APIs with OpenAPI specifications following best practices.

## When to Use

Automatically invoke when the user:
- Asks to "design an API" or "create REST API"
- Mentions "OpenAPI" or "Swagger"
- Says "plan API endpoints"

## Workflow

### Step 1: Understand Requirements

Ask the user:
- What resource/entity?
- Required operations (CRUD)?
- Authentication needed?
- Rate limiting?

### Step 2: Design Endpoints

Follow REST conventions:
- GET /resources - List
- GET /resources/:id - Get one
- POST /resources - Create
- PUT /resources/:id - Update
- DELETE /resources/:id - Delete

### Step 3: Define Schemas

Create OpenAPI schema:
- Request body schemas
- Response schemas
- Query parameters
- Path parameters

### Step 4: Generate OpenAPI Spec

Use template from [templates/openapi-template.yaml](templates/openapi-template.yaml)

## Notes

Follow company API design guidelines.
```

### agents/api-generator/AGENT.md

```markdown
---
name: api-generator
description: Generates complete API implementations from OpenAPI specifications including routes, controllers, validation, tests, and documentation. Use for API scaffolding and code generation from specs.
---

# API Generator Agent

Generate complete API implementation from OpenAPI specification.

## When to Use

Invoke when:
- User has OpenAPI spec and needs implementation
- Says "generate API code" or "scaffold API"
- Requests "implement this spec"

## Workflow

### Phase 1: Parse OpenAPI Spec

- Read OpenAPI YAML/JSON
- Validate spec correctness
- Extract endpoints, schemas, auth

### Phase 2: Generate Code

Create:
- Route handlers
- Controller classes
- Request validation
- Response serialization
- Error handling

### Phase 3: Add Tests

Generate:
- Unit tests for controllers
- Integration tests for endpoints
- Example requests/responses

### Phase 4: Create Documentation

Generate:
- API usage guide
- Authentication docs
- Example curl commands

## Tool Access

Full access for code generation and file creation.
```

### commands/new-endpoint.md

```markdown
# New API Endpoint

Interactively create a new API endpoint with proper structure.

Please create a new API endpoint:

1. Ask for endpoint details:
   - Path (e.g., /api/users)
   - Method (GET, POST, PUT, DELETE)
   - Request body schema
   - Response schema
   - Authentication required?

2. Generate files:
   - Route handler
   - Controller method
   - Validation schema
   - Unit test
   - Integration test

3. Update OpenAPI spec

4. Show usage example
```

### hooks/validate-openapi.js

```javascript
// Pre-commit hook to validate OpenAPI specs

module.exports = {
  name: 'validate-openapi',
  event: 'pre-commit',

  async execute(context) {
    const { files } = context;

    // Find OpenAPI spec files
    const specFiles = files.filter(f =>
      f.endsWith('openapi.yaml') || f.endsWith('openapi.json')
    );

    if (specFiles.length === 0) {
      return true; // No specs to validate
    }

    console.log('Validating OpenAPI specifications...');

    // Run validation (pseudo-code)
    for (const file of specFiles) {
      const valid = await validateOpenAPI(file);
      if (!valid) {
        console.error(`Invalid OpenAPI spec: ${file}`);
        return false; // Block commit
      }
    }

    console.log('All OpenAPI specs valid');
    return true; // Allow commit
  }
};
```

### README.md

```markdown
# API Toolkit Plugin

Complete toolkit for API development with design, generation, validation, and testing.

## Components

### Skills
- **designing-apis**: Design RESTful APIs with OpenAPI
- **validating-schemas**: Validate API schemas and requests

### Agents
- **api-generator**: Generate complete API implementation from spec

### Commands
- `/new-endpoint`: Create new API endpoint interactively
- `/test-api`: Run API test suite

### Hooks
- `validate-openapi`: Pre-commit validation of OpenAPI specs

## Installation

\```bash
/plugin install api-toolkit@company-marketplace
\```

## Quick Start

1. Design API:
\```
"Design a REST API for user management"
\```

2. Generate implementation:
\```
"Generate code from this OpenAPI spec"
\```

3. Create endpoint:
\```bash
/new-endpoint
\```

## Requirements

- Claude Code 2.0+
- Node.js 18+ (for validation hooks)

## License

MIT
```

---

## Marketplace Setup

Complete example of marketplace with multiple plugins.

### Directory Structure

| Path | Purpose |
|------|---------|
| `marketplace.json` | Marketplace manifest |
| `plugins/code-helper/` | Code analysis plugin |
| `plugins/devops-agents/` | DevOps agents plugin |
| `plugins/api-toolkit/` | API toolkit plugin |
| `README.md` | Documentation |

### marketplace.json

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
      "name": "code-helper",
      "source": "./plugins/code-helper",
      "description": "Code analysis and documentation generation skills"
    },
    {
      "name": "devops-agents",
      "source": "./plugins/devops-agents",
      "description": "Build management and deployment agents"
    },
    {
      "name": "api-toolkit",
      "source": "./plugins/api-toolkit",
      "description": "Complete API development toolkit"
    },
    {
      "name": "quick-commands",
      "source": "./plugins/quick-commands",
      "description": "Utility commands for common tasks"
    }
  ]
}
```

### README.md

```markdown
# Company Claude Code Plugins

Internal marketplace for company-standard Claude Code plugins.

## Available Plugins

- **code-helper**: Code analysis and documentation
- **devops-agents**: Build and deployment automation
- **api-toolkit**: API design and generation
- **quick-commands**: Common utility commands

## Setup

1. Add marketplace:
\```bash
/plugin marketplace add https://raw.githubusercontent.com/company/claude-plugins/main/marketplace.json
\```

2. Install plugins:
\```bash
/plugin install code-helper@company-plugins
/plugin install devops-agents@company-plugins
/plugin install api-toolkit@company-plugins
/plugin install quick-commands@company-plugins
\```

## Development

To add a new plugin:

1. Create plugin directory under `plugins/`
2. Add plugin.json with metadata
3. Update marketplace.json
4. Test locally
5. Submit PR

## Support

Contact #claude-code on Slack
```

### Git Setup

```bash
# Initialize
git init
git add .
git commit -m "Initial company plugins marketplace"

# Create repository on GitHub, then:
git remote add origin https://github.com/company/claude-plugins.git
git push -u origin main
```

### Distribution URL

Share with team:
```
https://raw.githubusercontent.com/company/claude-plugins/main/marketplace.json
```

---

## Team Workflow

How teams use plugins via repository configuration.

### Project Structure

| Path | Purpose |
|------|---------|
| `.claude/settings.json` | Claude settings with marketplace config |
| `.claude/plugins/project-specific/` | Local plugin with .claude-plugin/plugin.json |
| `.claude/plugins/project-specific/skills/project-linter/` | Project-specific linter skill |
| `src/` | Source code |

### .claude/settings.json

```json
{
  "plugins": {
    "autoInstall": true,
    "marketplaces": [
      "https://raw.githubusercontent.com/company/claude-plugins/main/marketplace.json"
    ],
    "autoInstallPlugins": [
      "code-helper",
      "devops-agents"
    ]
  }
}
```

### Workflow

1. Team member clones repository
2. Opens in Claude Code
3. Trusts folder (first time)
4. Plugins automatically install:
   - Marketplace added
   - Specified plugins installed
   - Local plugins loaded
5. Team member starts working with plugins available

### Adding Project Plugin

```bash
# Create plugin in project
mkdir -p .claude/plugins/project-linter
# ... create plugin files ...

# Commit to repo
git add .claude/plugins/project-linter
git commit -m "Add project-specific linter plugin"
git push

# Other team members get it on next pull
```

---

## npm Publishing

Publishing plugin as npm package for public distribution.

### Setup package.json

```json
{
  "name": "@username/claude-plugin-api-toolkit",
  "version": "1.0.0",
  "description": "Complete API development toolkit for Claude Code",
  "main": ".claude-plugin/plugin.json",
  "files": [
    ".claude-plugin/",
    "skills/",
    "agents/",
    "commands/",
    "hooks/",
    "README.md",
    "LICENSE"
  ],
  "keywords": [
    "claude-code",
    "plugin",
    "api",
    "openapi",
    "rest"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/claude-plugin-api-toolkit.git"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### Add .npmignore

```
# Development files
.git
.github
node_modules
*.log

# Test files
test/
tests/
__tests__

# Documentation source
docs/

# IDE
.vscode
.idea
*.swp
```

### Publish

```bash
# Test package locally
npm pack

# Login to npm
npm login

# Publish
npm publish --access public

# Update version for next release
npm version patch  # or minor, major
npm publish --access public
```

### Installation

Users install globally:
```bash
npm install -g @username/claude-plugin-api-toolkit
```

Claude Code auto-discovers in global node_modules.

### Maintenance

Update plugin:
```bash
# Make changes
git add .
git commit -m "feat: add new feature"

# Bump version
npm version minor

# Publish
npm publish

# Push tags
git push --tags
```

Users update:
```bash
npm update -g @username/claude-plugin-api-toolkit
```
