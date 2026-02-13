# shirokuma-docs

Next.js + TypeScript project documentation generator CLI with bundled Claude Code skills.

## Installation

### Recommended: Installer Script (No sudo required)

```bash
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash
```

To pre-select a language:

```bash
# Japanese
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash -s -- --lang ja

# English
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash -s -- --lang en
```

This installs shirokuma-docs to `~/.local/` with a symlink in `~/.local/bin/`. Claude Code users already have `~/.local/bin` in PATH.

### Alternative: npm / pnpm global install

```bash
# npm
npm install -g shirokuma-docs

# pnpm
pnpm add -g shirokuma-docs
```

### Verify Installation

```bash
shirokuma-docs --version
# => 0.1.0-alpha.1
```

## Getting Started

```bash
# Initialize in your project directory
cd /path/to/your/project
shirokuma-docs init --with-skills --with-rules --lang en
```

This single command:
1. Creates `shirokuma-docs.config.yaml`
2. Installs the **shirokuma-skills** plugin to `.claude/plugins/`
3. Installs **shirokuma-hooks** safety hooks plugin
4. Deploys rules to `.claude/rules/shirokuma/`
5. Registers the plugin in Claude Code's global cache (auto-detected)

Start a new Claude Code session and the skills will be available.

## Upgrade

```bash
# Step 1: Update CLI
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash
# or: npm update -g shirokuma-docs

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
npm uninstall -g shirokuma-docs
```

To remove per-project files:

```bash
rm -rf .claude/plugins/shirokuma-skills-*/
rm -rf .claude/plugins/shirokuma-hooks/
rm -rf .claude/rules/shirokuma/
rm -f shirokuma-docs.config.yaml
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

`shirokuma-docs.config.yaml`:

```yaml
project:
  name: "MyProject"
  description: "Project description"

output:
  dir: "./docs"
  portal: "./docs/portal"
  generated: "./docs/generated"

typedoc:
  entryPoints:
    - "./apps/web/lib/actions"
    - "./packages/database/src/schema"
  tsconfig: "./tsconfig.json"

schema:
  sources:
    - path: "./packages/database/src/schema"

deps:
  include:
    - "apps/web/lib/actions"
    - "apps/web/components"
  exclude:
    - "node_modules"
    - ".next"

testCases:
  jest:
    config: "./jest.config.ts"
    testMatch: ["**/__tests__/**/*.test.{ts,tsx}"]
  playwright:
    config: "./playwright.config.ts"
    testDir: "./tests/e2e"

github:
  discussionsCategory: "Handovers"
  listLimit: 20
```

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
