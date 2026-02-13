# managing-skills

A comprehensive Claude Code skill for creating and managing properly structured Agent Skills following official Anthropic best practices and documentation.

## Overview

**managing-skills** is a meta-skill that helps you create, update, and improve Claude Code skills with correct structure, naming conventions, and progressive disclosure architecture. It encapsulates all official Anthropic documentation about Agent Skills into a single, reusable tool.

**Status**: Production-ready, fully documented
**Type**: Generic (not project-specific)
**Platform**: Claude Code CLI

## Features

- ✅ **Complete Official Documentation**: Incorporates all Anthropic skill documentation
- ✅ **Progressive Disclosure Architecture**: Implements 3-tier loading (Metadata/Instructions/Resources)
- ✅ **9-Step Workflow**: Comprehensive skill creation process
- ✅ **Best Practices**: 500-line rule, gerund naming, multi-model testing
- ✅ **Examples Library**: Complete skill examples, patterns, templates
- ✅ **Platform Coverage**: Claude Code, API, Agent SDK, Plugins
- ✅ **Security Guidance**: Trust model, sandboxing, secrets management

## File Structure

| File | Lines | Description |
|------|-------|-------------|
| SKILL.md | ~622 | Core workflow, principles, quick reference |
| reference.md | ~1,182 | Complete API, frontmatter, naming, platforms |
| best-practices.md | ~1,104 | Patterns, anti-patterns, testing, optimization |
| examples.md | ~1,024 | Complete skills, patterns, templates |
| architecture.md | ~938 | Progressive disclosure, context, performance |
| updating-skills.md | ~588 | Review, improve, refactor existing skills |
| README.md | - | This file |

**Total**: ~5,458 lines, ~130KB of comprehensive documentation

## Usage

### Automatic Activation

The skill activates automatically when you:
- Ask to "create a skill"
- Say "generate a skill file"
- Request "new skill" or "write SKILL.md"
- Mention "help with skills" or "skill structure"
- Want to know "how to create skills"
- Ask to "update a skill", "improve a skill", or "fix a skill"
- Say "refactor a skill" or "make skill better"
- Ask to "review a skill" or "check skill quality"

### Manual Invocation

#### Creating new skills

```bash
# In Claude Code
"I need to create a new skill for [purpose]"
```

The skill will guide you through the 9-step process:
1. Gather requirements
2. Determine skill name (gerund form: verb-ing)
3. Craft description (critical for discovery)
4. Design SKILL.md body (<500 lines)
5. Determine supporting files
6. Set tool restrictions (if needed)
7. Create files
8. Validate against checklist
9. Test across Claude models

#### Updating existing skills
```bash
# In Claude Code
"I need to update the [skill-name] skill"
"Can you improve the [skill-name] skill?"
"Fix the [skill-name] skill to use CLI instead of scripts"
```

The skill will guide you through the 6-step update process:
1. Review current skill
2. Identify issues
3. Plan updates
4. Make changes
5. Test updated skill
6. Document changes

## Key Concepts

### Progressive Disclosure Architecture

Skills use a three-tier loading model:

**Level 1: Metadata** (~100 tokens)
- Always loaded: `name` and `description` from YAML frontmatter
- Enables skill discovery without context consumption

**Level 2: Instructions** (under 5k tokens)
- SKILL.md body loads when skill is triggered
- Contains workflows, best practices, core guidance

**Level 3: Resources** (on-demand)
- Supporting files load only when Claude needs them
- Enables unbounded documentation without token penalty

### Critical Rules

1. **Keep SKILL.md under 500 lines** - Use supporting files for extensive content
2. **Use gerund form for names** - `processing-pdfs`, not `pdf-processor`
3. **Write specific descriptions** - Include concrete trigger phrases in quotes
4. **Keep references one level deep** - Don't link from supporting files to other supporting files
5. **Test across models** - Haiku, Sonnet, Opus have different capabilities
6. **Evaluation-first** - Create test scenarios before extensive documentation

## Documentation Sections

### SKILL.md
Main entry point with:
- Progressive disclosure explanation
- 9-step workflow for creating skills
- 6-step workflow for updating skills
- 5 key principles
- Distribution methods
- Common anti-patterns
- Troubleshooting guide

### updating-skills.md
Complete update guide:
- Review checklist
- Common update patterns (8 patterns)
- Real-world examples (shirokuma-md skills update)
- When to deprecate skills
- Continuous improvement strategy
- Anti-patterns to avoid
- Tips for successful updates

### reference.md
Complete technical specifications:
- YAML frontmatter (all fields)
- File structure requirements
- Naming conventions (gerund form)
- Storage locations (Personal/Project/Plugin)
- Tool restrictions (`allowed-tools`)
- Platform specifics (Code/API/SDK)
- API integration
- Plugin development
- Version control

### best-practices.md
Comprehensive guidance:
- Core principles (Conciseness, Degrees of Freedom, Multi-Model Testing)
- Content organization
- Progressive disclosure patterns (3 types)
- Writing effective instructions (checklists, validation loops)
- Code and scripts best practices
- Testing strategy (Evaluation-First Development)
- Common patterns
- Anti-patterns to avoid
- Pre-launch checklist

### examples.md
Concrete examples:
- Complete skill examples (PDF processing, data validation, report generation)
- Description examples (scored: poor to excellent)
- Common workflow patterns (4 types)
- Supporting file examples
- Script examples (validation, transformation)
- Real-world use cases (4 scenarios)
- Template library (3 templates)

### architecture.md
Technical deep-dive:
- Progressive disclosure architecture (detailed)
- Context window dynamics
- Filesystem-based execution model
- Code execution architecture
- Platform architecture (Code/API/SDK/Plugins)
- Security model
- Performance considerations
- Token management

## Installation

This skill is located in the shirokuma-md project at:
```
.claude/skills/managing-skills/
```

### For Use in Other Projects

**Option 1: Copy to personal skills** (available in all projects)
```bash
cp -r .claude/skills/managing-skills ~/.claude/skills/
```

**Option 2: Copy to project skills** (available in specific project)
```bash
cp -r /path/to/shirokuma-md/.claude/skills/managing-skills \
     /path/to/your-project/.claude/skills/
```

**Option 3: Create symlink** (always up-to-date)
```bash
ln -s /path/to/shirokuma-md/.claude/skills/managing-skills \
      ~/.claude/skills/managing-skills
```

After installation, restart Claude Code to load the skill.

## Examples

### Example 1: Create a PDF Processing Skill

```
User: "I need to create a skill for processing PDF files"

Claude (using managing-skills):
Let me help you create a PDF processing skill following best practices.

### Step 1: Requirements
Purpose: Extract text, fill forms, merge PDFs
Triggers: "read PDF", "extract PDF text", "fill PDF form", "merge PDFs"
Scope: PDF operations only ✅ (focused)
Tool access: Full access (read, write, execute)
Complexity: Yes - needs reference.md for API details

### Step 2: Skill Name
Recommended: `processing-pdfs`
- Gerund form ✅
- Lowercase with hyphens ✅
- Descriptive ✅

### Step 3: Description
"Extract text and tables from PDF files, fill PDF forms, merge PDFs, and convert PDFs to text or images. Use when working with PDF files or when user asks to \"read PDF\", \"extract PDF text\", \"fill PDF form\", or \"merge PDFs\"."
- Third person ✅
- Specific triggers ✅
- File type mentioned ✅
- Under 1024 chars ✅

[Continues through all 9 steps...]
```

### Example 2: Create a Read-Only Analysis Skill

```
User: "Create a skill that analyzes code quality without making changes"

Claude (using managing-skills):
I'll create a read-only code analysis skill.

### Key Decisions:
- Name: `analyzing-code-quality`
- Tool restrictions: `Read, Grep, Glob` (read-only)
- Supporting files: reference.md (metrics explanation)

[Generates complete skill structure...]
```

## References

This skill consolidates information from the following official Anthropic sources:

### Primary Documentation
- Agent Skills (Claude Code): https://code.claude.com/docs/en/skills
  - File structure, frontmatter, basic usage

- Agent Skills Overview: https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview
  - Core concepts, progressive disclosure architecture, benefits

- Agent Skills Best Practices: https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices
  - Conciseness principle, degrees of freedom, multi-model testing
  - Content organization, progressive disclosure patterns
  - Code best practices, testing strategy, pre-launch checklist

- Agent Skills Quickstart: https://docs.claude.com/en/docs/agents-and-tools/agent-skills/quickstart
  - Quick start guide, pre-built skills (pptx, xlsx, docx, pdf)
  - API usage examples

### Technical Resources
- Engineering Blog - Agent Skills: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
  - Technical architecture, design philosophy
  - Context window management, token efficiency
  - Security considerations

- Agent SDK - Skills: https://docs.claude.com/en/api/agent-sdk/skills
  - SDK configuration, setting_sources
  - Tool control via allowedTools
  - Troubleshooting

- Claude Code Plugins: https://code.claude.com/docs/en/plugins
  - Plugin structure with skills
  - Distribution via npm
  - Skills directory in plugins

### Additional Context
- Claude Code Documentation: https://code.claude.com/docs/
  - General Claude Code usage

- Claude API Documentation: https://docs.claude.com/
  - API reference, authentication

## Contributing

To improve this skill:

1. **Test with real scenarios**: Create various skill types and document issues
2. **Update for new features**: Monitor Anthropic docs for updates
3. **Add more examples**: Contribute examples from real projects
4. **Improve templates**: Enhance template library with proven patterns
5. **Report issues**: Document any inconsistencies or missing information

## Version History

### v1.1.0 (2025-01-07)
- Added skill update and improvement workflow
- New supporting file: updating-skills.md (588 lines)
- Updated SKILL.md with 6-step update process
- Added trigger phrases for skill updates
- Includes 8 common update patterns
- Real-world example: shirokuma-md skills refactoring
- Total: 5,458 lines of documentation

### v1.0.0 (2024-11-07)
- Initial comprehensive release
- Complete integration of all official documentation
- 5 supporting files (reference, best-practices, examples, architecture, README)
- 4,798 lines of documentation
- Covers Claude Code, API, Agent SDK, and Plugins
- Progressive disclosure architecture fully documented
- Security model and performance considerations included

## License

This skill is part of the shirokuma-md project.

The content is derived from official Anthropic documentation which is:
- © Anthropic PBC
- Available under Anthropic's documentation license

This skill implementation follows the documented patterns and is intended for educational and practical use in creating Agent Skills.

## Notes

- Platform: Designed for Claude Code CLI
- Compatibility: Works with Claude Haiku, Sonnet, and Opus
- Maintenance: Updated to match official documentation as of January 2025
- Language: Primarily English (per official docs)
- Type: Generic tool (not project-specific)

## Support

For issues or questions:
- Skill-specific: Review the comprehensive documentation in supporting files
- Claude Code: https://github.com/anthropics/claude-code/issues
- Anthropic API: https://support.anthropic.com/

## Quick Start

1. Restart Claude Code to load this skill
2. Say "I want to create a skill for [purpose]"
3. Follow the guided 9-step workflow
4. Review generated files against checklist
5. Test with real scenarios
6. Iterate based on Claude's usage patterns

## Related Skills

For the shirokuma-md project development:
- `shirokuma-md-build` - Build documentation
- `shirokuma-md-validate` - Validate structure
- `shirokuma-md-analyze` - Analyze dependencies
- `shirokuma-md-lint` - Lint markdown
- `shirokuma-md-schema` - Schema management
- `shirokuma-md-architect` - Architecture consultation

---

**Managed with managing-skills** - A comprehensive tool for creating and managing Claude Code Agent Skills following official best practices.
