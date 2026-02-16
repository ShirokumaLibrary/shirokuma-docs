# shirokuma-docs

Next.js + TypeScript project documentation generator CLI with bundled Claude Code skills.

[日本語](README.md)

## Installation

### Recommended: Installer Script (No sudo required)

```bash
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash
```

This installs shirokuma-docs to `~/.local/` with a symlink in `~/.local/bin/`. Claude Code users already have `~/.local/bin` in PATH. The installer prompts for language selection interactively (or use `--lang en` to pre-select).

### Alternative: npm / pnpm global install

```bash
# npm
npm install -g @shirokuma-library/shirokuma-docs

# pnpm
pnpm add -g @shirokuma-library/shirokuma-docs
```

### Verify Installation

```bash
shirokuma-docs --version
# => 0.1.0-alpha.11
```

## Getting Started

### 1. Initialize

```bash
cd /path/to/your/project
shirokuma-docs init --with-skills --with-rules --lang en
```

This creates `shirokuma-docs.config.yaml`, installs plugins, and deploys rules to `.claude/rules/shirokuma/`.

### 2. Customize the Config

Open `shirokuma-docs.config.yaml` and edit paths to match your project structure:

```yaml
project:
  name: "MyProject"           # Your project name
  description: "..."

typedoc:
  entryPoints:
    - "./src/lib/actions"      # Change to your source paths
    - "./src/db/schema"
  tsconfig: "./tsconfig.json"

schema:
  sources:
    - path: "./src/db/schema"  # Drizzle ORM schema path
```

**Don't use Drizzle ORM?** Delete the `schema` section entirely.
Other optional sections (`deps`, `testCases`, `lintDocs`, etc.) can be removed if not needed — only configured sections run with `generate`.

### 3. GitHub Project Setup

```bash
# Create project + set up fields in one command
shirokuma-docs projects create-project --title "Project Name" --lang en
```

Discussions and required labels (feature, bug, chore, docs, research) are automatically created. The following require manual configuration due to GitHub API limitations:

| Item | Where to Configure |
|------|--------------------|
| Issue Types | `https://github.com/organizations/{org}/settings/issue-types` |
| Discussion categories | Repository Settings → Discussions |
| Project workflows | Project Settings → Workflows |

**Issue Types** (Organization Settings → Issue types):

Add the following custom types in addition to the default Feature / Bug / Task:

| Type | Description |
|------|-------------|
| Chore | Configuration, tooling, and refactoring |
| Docs | Documentation improvements |
| Research | Investigation and validation |

**Discussion categories** (Repository Settings → Discussions → New category):

| Category | Emoji | Search Word | Format | Purpose |
|----------|-------|-------------|--------|---------|
| Handovers | 🤝 | handshake | Open-ended discussion | Session handover records |
| ADR | 📐 | triangular ruler | Open-ended discussion | Architecture Decision Records |
| Knowledge | 💡 | bulb | Open-ended discussion | Confirmed patterns and solutions |
| Research | 🔬 | microscope | Open-ended discussion | Items requiring investigation |
| Reports | 📊 | chart | Open-ended discussion | Review and analysis reports (optional) |

**Project workflows** (Project Settings → Workflows):

| Workflow | Target Status |
|----------|--------------|
| Item closed | Done |
| Pull request merged | Done |

<details>
<summary>Delegate to AI (copy-paste instructions)</summary>

First, initialize manually to enable skills and rules:

```bash
cd /path/to/your/project
shirokuma-docs init --with-skills --with-rules --lang en
```

Start a new Claude Code session and paste the following:

```
/github-project-setup Please set up this project
```

The skill will interactively guide you through project creation, field setup, and manual configuration steps.

</details>

### 4. Generate Documentation

```bash
# Run all configured commands
shirokuma-docs generate

# Or run individually
shirokuma-docs test-cases -p .
shirokuma-docs deps -p .
shirokuma-docs portal -p .
```

### 5. Start Using with Claude Code

Start a new Claude Code session. Skills will be available as slash commands (e.g., `/working-on-issue #42`).

See [Getting Started Guide](docs/guide/getting-started.md) for detailed setup instructions.

## Upgrade

```bash
# Step 1: Update CLI
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash
# or: npm update -g @shirokuma-library/shirokuma-docs

# Step 2: Update plugins, rules, and cache
cd /path/to/your/project
shirokuma-docs update

# Step 3: Start a new Claude Code session
```

### Troubleshooting

If skills don't update after `shirokuma-docs update`:

```bash
# Force cache refresh
claude plugin uninstall shirokuma-skills-en@shirokuma-library --scope project
claude plugin install shirokuma-skills-en@shirokuma-library --scope project
```

## Uninstall

```bash
# If installed via install.sh
rm -f ~/.local/bin/shirokuma-docs
rm -rf ~/.local/share/shirokuma-docs

# If installed via npm
npm uninstall -g @shirokuma-library/shirokuma-docs
```

To remove per-project files:

```bash
# Remove deployed rules and config
rm -rf .claude/rules/shirokuma/
rm -f shirokuma-docs.config.yaml

# Remove plugins from global cache
claude plugin uninstall shirokuma-skills-en@shirokuma-library --scope project
claude plugin uninstall shirokuma-hooks@shirokuma-library --scope project
```

## Features

### Documentation Generation (16 commands)

| Command | Description |
|---------|-------------|
| `typedoc` | TypeDoc API documentation |
| `schema` | Drizzle ORM to DBML/SVG ER diagrams |
| `deps` | Dependency graph (dependency-cruiser) |
| `test-cases` | Jest/Playwright test case extraction |
| `coverage` | Jest coverage dashboard |
| `portal` | Dark-themed HTML documentation portal |
| `search-index` | Full-text search JSON index |
| `overview` | Project overview page |
| `feature-map` | Feature hierarchy map (4-layer) |
| `link-docs` | API-test bidirectional links |
| `screenshots` | Playwright screenshot generation |
| `details` | Entity detail pages (Screen, Component, Action, Table) |
| `impact` | Change impact analysis |
| `api-tools` | MCP tool documentation |
| `i18n` | i18n translation file documentation |
| `packages` | Monorepo shared package documentation |

### Validation (7 commands)

| Command | Description |
|---------|-------------|
| `lint-tests` | @testdoc comment quality check |
| `lint-coverage` | Implementation-test correspondence check |
| `lint-docs` | Document structure validation |
| `lint-code` | Code annotation / structure validation |
| `lint-annotations` | Annotation consistency validation |
| `lint-structure` | Project structure validation |
| `lint-workflow` | AI workflow convention validation |

### GitHub Integration (5 commands)

| Command | Description |
|---------|-------------|
| `issues` | GitHub Issues management (Projects field integration) |
| `projects` | GitHub Projects V2 management |
| `discussions` | GitHub Discussions management |
| `repo` | Repository info / label management |
| `discussion-templates` | Discussion form template generation (i18n) |

### Session Management

| Command | Description |
|---------|-------------|
| `session start` | Start session (handover + issues + PRs) |
| `session end` | End session (save handover + status update) |
| `session check` | Issue-Project status consistency check (`--fix` for auto-repair) |

### Management & Utilities

| Command | Description |
|---------|-------------|
| `init` | Initialize config (with `--with-skills --with-rules` support) |
| `generate` | Run all generation commands |
| `update` | Update skills, rules, and cache (shorthand for `update-skills --sync`) |
| `update-skills` | Update skills/rules with detailed options |
| `adr` | ADR management (GitHub Discussions integration) |
| `repo-pairs` | Public/Private repository pair management |
| `github-data` | GitHub data JSON generation |
| `md` | LLM-optimized Markdown management (build, validate, analyze, lint, list, extract) |

## Claude Code Integration

shirokuma-docs bundles the **shirokuma-skills** plugin (EN/JA), which provides skills, agents, and rules for Claude Code.

### Key Skills (22 total)

Invoke any skill as a slash command: `/<skill-name>` (e.g., `/committing-on-issue`, `/working-on-issue #42`).

| Category | Skill | Purpose |
|----------|-------|---------|
| **Orchestration** | `working-on-issue` | Work dispatcher (entry point) |
| | `planning-on-issue` | Issue planning phase |
| **Session** | `starting-session` | Start work session |
| | `ending-session` | End session with handover |
| **Development** | `nextjs-vibe-coding` | TDD implementation for Next.js |
| | `frontend-designing` | Distinctive UI design |
| | `codebase-rule-discovery` | Pattern discovery + convention proposal |
| | `reviewing-on-issue` | Code / security review |
| | `best-practices-researching` | Research best practices |
| | `claude-config-reviewing` | Config file quality check |
| **Git / GitHub** | `committing-on-issue` | Stage, commit, push |
| | `creating-pr-on-issue` | Create pull request |
| | `managing-github-items` | Issue / Discussion creation |
| | `showing-github` | Display project data / dashboard |
| | `github-project-setup` | Project initial setup |
| **Config** | `managing-skills` | Create / update skills |
| | `managing-agents` | Create / update agents |
| | `managing-rules` | Create / update rules |
| | `managing-plugins` | Create / update plugins |
| | `managing-output-styles` | Manage output styles |
| **Other** | `project-config-generator` | Generate project config files |
| | `publishing` | Public release via repo-pairs |

### Rules (21 total)

Deployed to `.claude/rules/shirokuma/`, covering:
- Git commit style and branch workflow
- GitHub project item management and Discussion usage
- Next.js best practices (tech stack, known issues, testing, Tailwind v4)
- shirokuma-docs CLI usage and plugin cache management
- Memory operations and config authoring

## Configuration

`shirokuma-docs init` generates `shirokuma-docs.config.yaml` with all available sections. Each section includes inline comments explaining what it does and how to customize it.

| Section | Purpose | Required |
|---------|---------|----------|
| `project` | Project name and description | Yes |
| `output` | Output directories | Yes |
| `typedoc` | TypeDoc API documentation | No |
| `schema` | Drizzle ORM ER diagrams | No |
| `deps` | Dependency graph | No |
| `testCases` | Test case extraction (Jest/Playwright) | No |
| `portal` | Documentation portal | No |
| `lintDocs` / `lintCode` / `lintStructure` | Validation rules | No |
| `github` | GitHub Projects / Discussions integration | No |
| `adr` | Architecture Decision Records | No |

Remove any section you don't need — only configured sections are active. See [Configuration Reference](docs/guide/config.md) for the full schema.

## Output Structure

```
docs/
├── portal/
│   ├── index.html       # Portal top page
│   ├── viewer.html      # Markdown/DBML/SVG viewer
│   └── test-cases.html  # Test case list
└── generated/
    ├── api/             # TypeDoc Markdown
    ├── api-html/        # TypeDoc HTML
    ├── schema/
    │   ├── schema.dbml
    │   └── schema-docs.md
    ├── dependencies.svg
    ├── dependencies.html
    └── test-cases.md
```

## Requirements

- **Node.js**: 20.0.0+
- **Claude Code**: For skills/rules integration
- **gh CLI**: For GitHub commands (`gh auth login` required)

### Optional Dependencies

| Tool | Purpose | Install |
|------|---------|---------|
| graphviz | Dependency graph SVG | `apt install graphviz` |
| typedoc | API documentation | `npm i -D typedoc typedoc-plugin-markdown` |
| dependency-cruiser | Dependency analysis | `npm i -D dependency-cruiser` |
| drizzle-dbml-generator | DBML generation | `npm i -D drizzle-dbml-generator` |

## License

MIT

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party license information.
