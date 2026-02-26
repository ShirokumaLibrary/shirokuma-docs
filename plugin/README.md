# shirokuma-plugins

Reusable AI skills, rules, and safety hooks for [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

## Plugins

| Plugin | Description |
|--------|-------------|
| **shirokuma-skills-en** | AI skills and rules for Claude Code (English) |
| **shirokuma-skills-ja** | AI skills and rules for Claude Code (Japanese) |
| **shirokuma-hooks** | Safety hooks for destructive git/GitHub operations |

## Installation

### Via shirokuma-docs CLI (recommended)

```bash
npx @shirokuma-library/shirokuma-docs init --with-skills
```

### Via Claude Code plugin commands

```bash
# Register the marketplace
claude plugin marketplace add ShirokumaLibrary/shirokuma-plugins

# Install a plugin
claude plugin install shirokuma-skills-en@shirokuma-library --scope project

# Update to the latest version
claude plugin update shirokuma-skills-en@shirokuma-library --scope project
```

## Documentation

For full documentation, configuration guides, and CLI reference, see **[shirokuma-docs](https://github.com/ShirokumaLibrary/shirokuma-docs)**.

## License

MIT
