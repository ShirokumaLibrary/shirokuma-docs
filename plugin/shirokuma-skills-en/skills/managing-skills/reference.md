# Skill Generator: Complete Technical Reference

## Table of Contents

1. [YAML Frontmatter Specification](#yaml-frontmatter-specification)
2. [File Structure Requirements](#file-structure-requirements)
3. [Description Writing Guidelines](#description-writing-guidelines)
4. [Naming Conventions](#naming-conventions)
5. [Storage Locations](#storage-locations)
6. [Tool Restrictions](#tool-restrictions)
7. [Supporting Files](#supporting-files)

For platform-specific and integration topics, see [reference-platform.md](reference-platform.md):
- Platform-Specific Considerations (Claude Code, API, Agent SDK)
- API Integration
- Agent SDK Configuration
- Plugin Integration
- Version Control

---

## YAML Frontmatter Specification

### Required Fields

#### name

- Type: string
- Max length: 64 characters
- Pattern: `^[a-z0-9-]+$` (lowercase letters, numbers, hyphens only)
- Naming convention: Gerund form (verb + -ing)

##### Valid examples

- `processing-pdfs`
- `analyzing-spreadsheets`
- `extracting-data`
- `generating-reports`

##### Invalid examples

- `PDF-Processor` (contains uppercase)
- `excel_analyzer` (contains underscores)
- `helper` (too vague, not gerund)
- `util` (too vague, not gerund)
- `anthropic-tool` (reserved word)
- `claude-helper` (reserved word)

##### Reserved words to avoid

- `anthropic`
- `claude`
- Any variations of Anthropic or Claude product names

#### description

- Type: string
- Max length: 1024 characters

##### Required components

1. What the skill does (capability statement)
2. When to use it (trigger conditions)

##### Voice

Third person (not first person)

##### Template

```
[Capability statement in third person]. Use when [trigger condition 1], [trigger condition 2], or [trigger condition 3].
```

##### Characteristics of effective descriptions

- Contains specific action verbs
- Mentions file types or formats (.xlsx, .pdf, .json)
- Includes domain-specific terminology
- Lists explicit trigger phrases in quotes
- Avoids vague language ("helps with", "deals with")
- Written in present tense
- No personal pronouns ("I", "you", "we")

##### Example analysis

❌ **Poor** (score: 2/10):
```yaml
description: Helps with data
```
Problems: Vague, no triggers, no specifics, no file types

✅ **Good** (score: 7/10):
```yaml
description: Analyze Excel spreadsheets and generate reports. Use when working with Excel files.
```
Better: Specific action, mentions Excel, one trigger

✅ **Excellent** (score: 10/10):
```yaml
description: Extract text and tables from PDF files, fill forms, merge PDF documents, and convert to other formats. Use when working with PDF files, when user asks to "read PDF", "extract PDF text", "fill PDF form", or "merge PDFs".
```
Perfect: Multiple capabilities, specific file type, multiple triggers in quotes, third person

### Optional Fields

#### allowed-tools

- Type: array of strings
- Platform: Claude Code only (ignored in API/SDK)
- Purpose: Restrict which tools Claude can use when skill is active

##### Syntax

```yaml
allowed-tools: Tool1, Tool2, Tool3
```

##### Available tools

- `Read` - Read files
- `Write` - Write files
- `Edit` - Edit files
- `Grep` - Search file contents
- `Glob` - Find files by pattern
- `Bash` - Execute bash commands
- `Bash(command:pattern)` - Restricted bash (specific commands only)

##### Common patterns

###### Read-only analysis

```yaml
allowed-tools: Read, Grep, Glob
```

###### Safe git operations

```yaml
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(git status:*)
```

##### Document generation (no modifications)

```yaml
allowed-tools: Read, Grep, Write
```

##### Full access (default)

```yaml
# Omit allowed-tools field entirely
```

##### Important

When using Agent SDK, control tools via main `allowedTools` configuration parameter, NOT via SKILL.md frontmatter.

---

## File Structure Requirements

### Directory Structure

##### Requirement

Skills MUST be directories, not single files

✅ **Correct**: `.claude/skills/my-skill/SKILL.md` (directory with SKILL.md)

❌ **Incorrect**: `.claude/skills/my-skill.md` (single file)

### File Naming

##### SKILL.md

MUST be named exactly `SKILL.md` (case-sensitive, all caps except extension)

##### Supporting files

Use descriptive names

✅ **Good**:
- `reference.md`
- `examples.md`
- `best-practices.md`
- `api-documentation.md`
- `troubleshooting.md`

❌ **Bad**:
- `doc.md` (vague)
- `file2.md` (non-descriptive)
- `stuff.md` (unclear)
- `REFERENCE.MD` (wrong case)

### Path Requirements

##### Forward slashes only

Cross-platform compatibility

✅ **Correct**:
```markdown
See [reference.md](reference.md)
Run: `python scripts/helper.py`
```

❌ **Incorrect**:
```markdown
See [reference.md](reference.md)
Run: `python scripts\helper.py`  # Windows-style backslashes
```

### Script Permissions

##### Requirement

Executable scripts must have execute permissions

```bash
# Set execute permission
chmod +x scripts/helper.py

# Verify
ls -l scripts/helper.py
# Should show: -rwxr-xr-x
```

#### Check in code

```python
import os
import stat

script_path = "scripts/helper.py"
st = os.stat(script_path)
is_executable = bool(st.st_mode & stat.S_IXUSR)
```

---

## Description Writing Guidelines

### Voice and Tense

##### Voice

Third person
- ✅ "Analyzes spreadsheets"
- ❌ "I analyze spreadsheets"
- ❌ "You can analyze spreadsheets"

##### Tense

Present tense
- ✅ "Extracts data from PDFs"
- ❌ "Will extract data from PDFs"
- ❌ "Can extract data from PDFs"

### Capability Statement

##### Structure

[Action verb] + [object] + [optional: additional details]

#### Strong action verbs

- Extract, analyze, generate, process, transform
- Create, build, compile, convert, merge
- Validate, verify, check, test, audit
- Parse, format, organize, structure
- Optimize, enhance, improve, refine

#### Weak verbs to avoid

- Help, assist, aid (too vague)
- Handle, deal with, work with (non-specific)
- Manage, support (ambiguous)

### Trigger Conditions

##### Format

"Use when [condition]"

#### Types of triggers

##### 1. User request patterns

```
Use when user asks to "verb + object"
```
Example:
```
Use when user asks to "analyze Excel", "process spreadsheet", or "generate pivot table"
```

##### 2. File type triggers

```
Use when working with [file type]
```
Example:
```
Use when working with PDF files, spreadsheets, or CSV data
```

##### 3. Domain triggers

```
Use when user mentions [domain concept]
```
Example:
```
Use when user mentions financial reporting, sales analysis, or quarterly data
```

##### 4. Combined triggers

```
Use when [condition 1], [condition 2], or [condition 3]
```
Example:
```
Use when working with Excel files, when user asks to "analyze spreadsheet", or when generating financial reports
```

### Length Optimization

##### Target

200-800 characters (well below 1024 limit)

#### Techniques

- Use active voice (shorter than passive)
- Remove filler words ("actually", "basically", "essentially")
- Use commas instead of "and" where possible
- Combine related capabilities

#### Example compression

##### Verbose (150 characters → too short, but demonstrates concept)

```
This skill is designed to help you extract text content and data tables from PDF documents.
```

##### Concise (80 characters)

```
Extract text and tables from PDF documents.
```

---

## Naming Conventions

### Gerund Form (-ing)

##### Why gerund

Indicates ongoing capability, aligns with tool/action orientation

##### Formation

[verb] → [verb + -ing]

Examples:
- analyze → `analyzing-data`
- process → `processing-documents`
- generate → `generating-reports`
- extract → `extracting-text`
- transform → `transforming-files`
- validate → `validating-schema`

### Multi-Word Names

##### Separator

Hyphen (-)

Examples:
- `processing-pdf-files`
- `analyzing-financial-data`
- `generating-api-documentation`
- `extracting-structured-data`

### Specificity Levels

#### Good specificity

- `analyzing-excel-spreadsheets` (specific file type)
- `processing-medical-records` (specific domain)
- `generating-financial-reports` (specific output)

#### Too vague

- `analyzing-data` (what kind of data?)
- `processing-files` (what kind of files?)
- `generating-reports` (what kind of reports?)

#### Too specific (consider if generalization works)

- `analyzing-q1-2024-sales-spreadsheets` (time-specific)
- `processing-johns-documents` (user-specific)

### Reserved Patterns

#### Avoid patterns containing

- `claude-*` (reserved for Anthropic)
- `anthropic-*` (reserved for Anthropic)
- `*-helper` (too vague)
- `*-util` (too vague)
- `*-tool` (redundant - skills are tools)

---

## Storage Locations

### Personal Skills

##### Path

`~/.claude/skills/skill-name/`

#### When to use

- Individual productivity workflows
- Personal automation
- Private tools not for sharing
- Experimental skills

#### Characteristics

- Not committed to git
- Not shared with team
- User-specific configuration
- Higher privilege operations acceptable

#### Example

- `~/.claude/skills/personal-notes-organizer/`
- `~/.claude/skills/private-data-analyzer/`
- `~/.claude/skills/custom-workflow-automation/`

### Project Skills

##### Path

`.claude/skills/skill-name/`

#### When to use

- Team collaboration
- Project-specific workflows
- Shared automation
- Standardized processes

#### Characteristics

- Committed to git repository
- Shared with all team members
- Project-specific configuration
- Should be well-documented

#### Example

- `project-root/.claude/skills/project-specific-linter/`
- `project-root/.claude/skills/custom-build-process/`
- `project-root/.claude/skills/team-workflow-automation/`

### Plugin Skills

##### Path

`plugin-directory/skills/skill-name/`

#### When to use

- Distributing to broader audience
- npm package distribution
- Reusable across projects
- Community sharing

#### Characteristics

- Bundled with Claude Code plugin
- Installed via npm/package manager
- Auto-available after plugin install
- Should be well-tested and documented

##### Example

- `my-plugin/package.json`
- `my-plugin/.claude-plugin/plugin.json`
- `my-plugin/skills/plugin-feature-a/SKILL.md`
- `my-plugin/skills/plugin-feature-b/SKILL.md`
- `my-plugin/README.md`

### Priority and Resolution

When skills with same name exist in multiple locations:

#### Resolution order

1. Project skills (`.claude/skills/`)
2. Personal skills (`~/.claude/skills/`)
3. Plugin skills (from installed plugins)

##### Best practice

Use unique names to avoid conflicts

---

## Tool Restrictions

### Syntax Formats

#### Simple list

```yaml
allowed-tools: Read, Grep, Glob
```

#### With restrictions

```yaml
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git status:*)
```

#### Multiline (YAML array)

```yaml
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git diff:*)
  - Bash(git log:*)
```

### Tool Categories

#### Read-Only

```yaml
allowed-tools: Read, Grep, Glob
```
Use for: Analysis, inspection, auditing

#### Read + Limited Write

```yaml
allowed-tools: Read, Grep, Glob, Write
```
Use for: Report generation, documentation creation

#### Read + Safe Edit

```yaml
allowed-tools: Read, Grep, Edit
```
Use for: Code formatting, minor fixes

#### Safe Git Operations

```yaml
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(git status:*)
```
Use for: Code review, git analysis

#### Full Access (default)

```yaml
# Omit field
```
Use for: General-purpose skills

### Bash Command Patterns

##### Pattern syntax

`Bash(command:pattern)`

#### Examples

##### All git commands
```yaml
Bash(git:*)
```

##### Specific git commands

```yaml
Bash(git diff:*), Bash(git log:*), Bash(git status:*)
```

##### Read-only system commands

```yaml
Bash(ls:*), Bash(cat:*), Bash(head:*), Bash(tail:*)
```

##### Package management (read-only)

```yaml
Bash(npm list:*), Bash(pip list:*)
```

---

## Supporting Files

### File Types and Purposes

| File | Purpose | When to Create | Max Recommended Size |
|------|---------|----------------|---------------------|
| `reference.md` | Complete technical specifications, API docs | Detailed field explanations, complete API reference needed | No limit (with TOC) |
| `examples.md` | Concrete use cases with input/output | Multiple scenarios, real-world patterns | 2000 lines |
| `best-practices.md` | Advanced patterns, optimization, security | Complex skill with many considerations | 1000 lines |
| `architecture.md` | System design, technical internals | Understanding internal workings important | 1500 lines |
| `troubleshooting.md` | Common errors and solutions | Known issues, debugging steps | 1000 lines |
| `api.md` | API endpoint documentation | Integration with external APIs | No limit (with TOC) |
| `glossary.md` | Domain-specific terminology | Specialized field with unique terms | 500 lines |

### Content Organization

#### Table of Contents (for files >100 lines)

```markdown
# File Title

## Table of Contents

1. [Section 1](#section-1)
2. [Section 2](#section-2)
3. [Section 3](#section-3)

---

## Section 1
...
```

##### Why

Claude sees TOC even with partial reads, understands full scope

### Linking Strategy

#### One level deep (enforced)

✅ **Correct**: SKILL.md → reference.md, examples.md, best-practices.md (flat)

❌ **Incorrect**: SKILL.md → reference.md → api-details.md, field-specs.md (nested)

##### Why

Nested links cause partial previews instead of full reads

### Cross-References

#### From SKILL.md to supporting file

```markdown
For complete API documentation, see [reference.md](reference.md).
```

#### Within supporting files (avoid)

```markdown
<!-- DON'T DO THIS -->
For more details, see [other-file.md](other-file.md).
```

#### Instead, duplicate or summarize

```markdown
<!-- DO THIS -->
### API Endpoint Details

[Complete explanation here, duplicated if necessary]
```

---

## Quick Reference

### Checklist for New Skills

- [ ] Directory structure: `skill-name/SKILL.md`
- [ ] Name: gerund form, lowercase, hyphens, max 64 chars
- [ ] Description: third person, specific triggers, max 1024 chars
- [ ] SKILL.md: under 500 lines
- [ ] Frontmatter: valid YAML (spaces not tabs)
- [ ] References: one level deep only
- [ ] Paths: forward slashes only
- [ ] Scripts: execute permissions set
- [ ] No time-sensitive info
- [ ] Consistent terminology
- [ ] Explicit error handling
- [ ] No Windows paths
- [ ] Table of contents in long files
- [ ] Tested across Claude models
- [ ] 3+ evaluation scenarios created
- [ ] Team feedback incorporated

### Common Patterns

#### Read-only analysis skill

```yaml
---
name: analyzing-code-quality
description: Analyze code quality metrics, detect patterns, suggest improvements. Use when user asks to "analyze code", "check quality", or "review codebase".
allowed-tools: Read, Grep, Glob
---
```

#### Document generation skill
```yaml
---
name: generating-api-docs
description: Generate API documentation from source code comments and type definitions. Use when user asks to "generate docs", "create API documentation", or "document API".
allowed-tools: Read, Grep, Glob, Write
---
```

#### Data transformation skill

```yaml
---
name: transforming-data-formats
description: Convert data between JSON, CSV, XML, and YAML formats with validation. Use when user asks to "convert data", "transform format", or mentions file format conversion.
---
```

### Field Reference Card

| Field | Required | Max Length | Pattern | Example |
|-------|----------|------------|---------|---------|
| `name` | Yes | 64 chars | `^[a-z0-9-]+$` | `processing-pdfs` |
| `description` | Yes | 1024 chars | (see guidelines) | `Extract text from PDFs. Use when...` |
| `allowed-tools` | No | - | Array of tool names | `Read, Grep, Glob` |
