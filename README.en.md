# shirokuma-docs

Next.js + TypeScript project documentation generator CLI with bundled Claude Code skills.

[日本語](README.md)

## Installation

### Recommended: Installer Script (No sudo required)

```bash
curl -fsSL https://raw.githubusercontent.com/ShirokumaLibrary/shirokuma-docs/main/install.sh | bash
```

Installs to `~/.local/`. Claude Code users already have `~/.local/bin` in PATH. The installer prompts for language selection interactively (or use `--lang en` to pre-select).

### Alternative: npm / pnpm global install

```bash
npm install -g @shirokuma-library/shirokuma-docs
# or
pnpm add -g @shirokuma-library/shirokuma-docs
```

## Getting Started

> **Prerequisites**: git repository + GitHub remote + `gh auth login` completed. See [Getting Started Guide](docs/guide/getting-started.md) for details.

```bash
# 1. Initialize (with skills and rules)
cd /path/to/your/project
shirokuma-docs init --with-skills --with-rules --lang en

# 2. Customize the config
#    Open shirokuma-docs.config.yaml and edit paths

# 3. GitHub Project setup
shirokuma-docs projects create-project --title "Project Name" --lang en

# 4. Generate documentation
shirokuma-docs generate

# 5. Use with Claude Code
#    Start a new session → /working-on-issue #42
```

See [Getting Started Guide](docs/guide/getting-started.md) for detailed instructions.

## Features

| Category | Commands | Examples |
|----------|----------|----------|
| Documentation | 16 | `typedoc`, `schema`, `deps`, `portal`, `test-cases`, `coverage` |
| Validation | 7 | `lint-tests`, `lint-coverage`, `lint-docs`, `lint-code` |
| GitHub | 5 | `issues`, `projects`, `discussions`, `session start/end` |
| Management | 8 | `init`, `generate`, `update`, `adr`, `repo-pairs`, `md` |
| Claude Code Skills | 22 | `working-on-issue`, `committing-on-issue`, `creating-pr-on-issue` |
| Claude Code Rules | 21 | Git, GitHub, Next.js, shirokuma-docs conventions |

See [Command Reference](docs/guide/commands/) for all commands and [Plugin Management](docs/guide/plugins.md) for skills/rules.

## Requirements

- **Node.js**: 20.0.0+
- **Claude Code**: For skills/rules integration
- **gh CLI**: For GitHub commands (`gh auth login` required)

## Documentation

| Guide | Content |
|-------|---------|
| [Getting Started](docs/guide/getting-started.md) | Install, initialize, GitHub setup |
| [Configuration Reference](docs/guide/config.md) | Full `shirokuma-docs.config.yaml` schema |
| [Command Reference](docs/guide/commands/) | All command details |
| [Plugin Management](docs/guide/plugins.md) | Skills, rules, and hooks management |
| [Troubleshooting](docs/guide/troubleshooting.md) | Common issues and solutions |

## License

MIT

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for third-party license information.
