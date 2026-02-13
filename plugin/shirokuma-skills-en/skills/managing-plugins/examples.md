# Plugin Examples

Real-world examples of Claude Code plugins with complete file structures and content.

## Table of Contents

- [Simple Greeting Plugin (Quickstart)](#simple-greeting-plugin)
- [Skill-Only Plugin](#skill-only-plugin)
- [Agent-Only Plugin](#agent-only-plugin)
- [Command-Only Plugin](#command-only-plugin)

For advanced examples, see [examples-advanced.md](examples-advanced.md):
- Comprehensive Plugin (skills + agents + commands + hooks)
- Marketplace Setup
- Team Workflow
- npm Publishing

---

## Simple Greeting Plugin

Minimal plugin for learning the basics. Contains one command that greets the user.

### Directory Structure

| Path | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Plugin manifest |
| `commands/greet.md` | Greeting command |
| `README.md` | Documentation |

### plugin.json

```json
{
  "name": "my-first-plugin",
  "description": "A simple greeting plugin to learn the basics",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
```

### commands/greet.md

```markdown
# Greet User

Greet the user warmly and ask how you can help today.

Please greet the user in a friendly way and ask what they would like to work on.
```

### README.md

```markdown
# My First Plugin

A simple greeting plugin for Claude Code.

## Installation

\```bash
/plugin marketplace add file:///path/to/marketplace.json
/plugin install my-first-plugin@test-marketplace
\```

## Usage

\```bash
/greet
\```

Claude will greet you warmly and ask how to help.
```

### Testing

1. Create marketplace.json:
```json
{
  "name": "test-marketplace",
  "owner": {
    "name": "Test User"
  },
  "plugins": [
    {
      "name": "my-first-plugin",
      "source": "./my-first-plugin",
      "description": "My first test plugin"
    }
  ]
}
```

2. Add marketplace:
```bash
/plugin marketplace add file:///absolute/path/to/marketplace.json
```

3. Install and test:
```bash
/plugin install my-first-plugin@test-marketplace
/greet
```

---

## Skill-Only Plugin

Plugin containing multiple skills for code analysis and documentation.

### Directory Structure

| Path | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Plugin manifest |
| `skills/analyzing-complexity/` | SKILL.md + examples.md |
| `skills/generating-docs/` | SKILL.md + reference.md |
| `README.md` | Documentation |

### plugin.json

```json
{
  "name": "code-helper",
  "description": "Code analysis and documentation generation skills",
  "version": "1.0.0",
  "author": {
    "name": "Dev Tools Team"
  },
  "keywords": ["code", "analysis", "documentation"],
  "license": "MIT"
}
```

### skills/analyzing-complexity/SKILL.md

```markdown
---
name: analyzing-complexity
description: Analyze code complexity metrics including cyclomatic complexity, nesting depth, and function length. Use when user asks to "analyze complexity", "check code complexity", or "measure cyclomatic complexity".
---

# Analyzing Code Complexity

Analyze code complexity metrics to identify areas needing refactoring.

## When to Use

Automatically invoke when the user:
- Asks to "analyze complexity" or "check complexity"
- Mentions "cyclomatic complexity" or "cognitive complexity"
- Says "is this code too complex?"
- Wants to "find complex functions"

## Workflow

### Step 1: Identify Target Code

Ask the user:
- Specific file to analyze?
- Entire directory?
- Just current selection?

### Step 2: Calculate Metrics

For each function, calculate:
- Cyclomatic complexity (decision points + 1)
- Nesting depth (maximum indentation level)
- Function length (lines of code)
- Parameter count

### Step 3: Report Results

Present in table format:
- Function name
- Complexity score
- Recommendation (refactor / acceptable / simple)

### Step 4: Suggest Improvements

For high-complexity functions:
- Suggest extract method refactoring
- Identify nested conditionals to simplify
- Propose early returns

## Common Patterns

See [examples.md](examples.md) for analysis output examples.
```

### skills/generating-docs/SKILL.md

```markdown
---
name: generating-docs
description: Generate API documentation, README files, and inline code comments with proper formatting. Use when user mentions "generate docs", "create documentation", "write README", or "document this code".
---

# Generating Documentation

Generate comprehensive documentation for code projects.

## When to Use

Automatically invoke when the user:
- Asks to "generate docs" or "create documentation"
- Says "write a README" or "document this"
- Mentions "API documentation" or "code comments"
- Wants to "add JSDoc" or "write docstrings"

## Workflow

### Step 1: Determine Documentation Type

- API documentation (functions, classes, methods)
- README (project overview, installation, usage)
- Inline comments (code explanations)
- Architecture docs (system design)

### Step 2: Analyze Code Structure

- Read target files
- Identify public APIs
- Extract function signatures
- Find usage examples

### Step 3: Generate Documentation

Follow language conventions:
- JSDoc for JavaScript/TypeScript
- Docstrings for Python
- XML comments for C#
- Javadoc for Java

### Step 4: Format Output

Include:
- Description
- Parameters with types
- Return value
- Examples
- Exceptions/errors

## Notes

See [reference.md](reference.md) for format specifications per language.
```

### README.md

```markdown
# Code Helper Plugin

Skills for code analysis and documentation generation.

## Skills Included

- analyzing-complexity: Analyze code complexity metrics
- generating-docs: Generate API documentation and comments

## Installation

\```bash
/plugin install code-helper@company-marketplace
\```

## Usage

Skills are automatically invoked by natural language:

\```
"Analyze the complexity of src/utils/parser.ts"
"Generate API documentation for this class"
"Check if these functions are too complex"
\```

## Requirements

- Claude Code 1.0+
- Project with source code files

## License

MIT
```

---

## Agent-Only Plugin

Plugin with specialized agents for build and deployment workflows.

### Directory Structure

| Path | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Plugin manifest |
| `agents/build-manager/` | AGENT.md + reference.md |
| `agents/deployment-coordinator/` | AGENT.md + examples.md |
| `README.md` | Documentation |

### plugin.json

```json
{
  "name": "devops-agents",
  "description": "Specialized agents for build management and deployment coordination",
  "version": "2.1.0",
  "author": {
    "name": "DevOps Team"
  },
  "homepage": "https://github.com/company/devops-agents",
  "license": "Apache-2.0"
}
```

### agents/build-manager/AGENT.md

```markdown
---
name: build-manager
description: Manages complex build processes including dependency installation, compilation, testing, and artifact generation with error recovery. Use for build tasks, CI/CD workflows, or multi-step compilation.
---

# Build Manager Agent

Autonomously manages complex build processes with error handling and recovery.

## When to Use

Invoke when:
- User requests "build the project"
- Complex multi-step build required
- Need to handle build errors automatically
- CI/CD pipeline execution needed

## Capabilities

- Run build commands (npm, make, gradle, cargo, etc.)
- Install dependencies automatically
- Execute tests and report failures
- Generate build artifacts
- Handle common build errors
- Retry with fixes on failure

## Workflow

### Phase 1: Analyze Build System

- Detect build tool (package.json, Makefile, pom.xml, etc.)
- Read build configuration
- Identify build targets

### Phase 2: Prepare Environment

- Check dependencies installed
- Install missing dependencies
- Verify build tool versions

### Phase 3: Execute Build

- Run build command
- Monitor output for errors
- Capture warnings

### Phase 4: Handle Errors

If build fails:
- Parse error messages
- Identify root cause
- Apply fix (missing dep, syntax error, etc.)
- Retry build

### Phase 5: Report Results

- Build success/failure status
- Generated artifacts
- Test results
- Warnings summary

## Tool Access

Full access to all tools for build operations.

## Notes

See [reference.md](reference.md) for supported build tools and error recovery patterns.
```

### README.md

```markdown
# DevOps Agents Plugin

Specialized agents for build and deployment automation.

## Agents Included

- **build-manager**: Complex build process management
- **deployment-coordinator**: Multi-environment deployment workflows

## Installation

\```bash
/plugin install devops-agents@company-marketplace
\```

## Usage

Agents are invoked automatically or explicitly:

\```
"Build the project and fix any errors"
"Deploy to staging environment"
"Use the build-manager agent to compile and test"
\```

## Requirements

- Claude Code 1.5+
- Build tools installed (npm, make, etc.)

## License

Apache-2.0
```

---

## Command-Only Plugin

Plugin with utility commands for common tasks.

### Directory Structure

| Path | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Plugin manifest |
| `commands/` | format-all.md, clean-deps.md, check-security.md |
| `README.md` | Documentation |

### plugin.json

```json
{
  "name": "quick-commands",
  "description": "Utility commands for formatting, cleaning, and security checks",
  "version": "1.3.0",
  "author": {
    "name": "Engineering Team"
  }
}
```

### commands/format-all.md

```markdown
# Format All Code

Format all code files in the project according to configured style rules.

Please format all code files in the project:

1. Detect formatter (Prettier, Black, gofmt, rustfmt, etc.)
2. Run formatter on all applicable files
3. Report which files were changed
4. Show any formatting errors

If no formatter configured, ask user which formatter to use.
```

### commands/clean-deps.md

```markdown
# Clean Dependencies

Remove unused dependencies and update outdated packages.

Please clean up project dependencies:

1. Analyze imports/requires to find unused dependencies
2. Check for outdated packages (npm outdated, pip list --outdated, etc.)
3. Present findings to user
4. Ask which to remove/update
5. Update package files and lockfiles
6. Run tests to verify nothing broke
```

### commands/check-security.md

```markdown
# Security Check

Scan project for security vulnerabilities and best practice violations.

Please perform security analysis:

1. Run security scanner (npm audit, pip-audit, cargo audit, etc.)
2. Check for hardcoded secrets (API keys, passwords)
3. Verify HTTPS usage (no HTTP URLs)
4. Check dependency vulnerabilities
5. Report findings with severity levels
6. Suggest remediation for critical issues
```

### README.md

```markdown
# Quick Commands Plugin

Utility commands for common development tasks.

## Commands Included

- `/format-all`: Format all code files
- `/clean-deps`: Clean up dependencies
- `/check-security`: Security vulnerability scan

## Installation

\```bash
/plugin install quick-commands@company-marketplace
\```

## Usage

\```bash
/format-all
/clean-deps
/check-security
\```

## Requirements

- Claude Code 1.0+
- Formatter tools installed (Prettier, Black, etc.)

## License

MIT
```

---

## Related Resources

- [Advanced Examples](examples-advanced.md) - Comprehensive plugins, marketplace setup, team workflow, npm publishing
- [Reference Guide](reference.md) - Complete plugin specification
- [Best Practices](best-practices.md) - Plugin development guidelines
