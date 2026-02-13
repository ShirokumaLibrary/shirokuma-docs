# Updating and Improving Existing Skills

This guide covers how to review, update, and improve existing Claude Code skills.

## When to Update a Skill

Update a skill when:
- User feedback: Users report confusion or errors
- Claude struggles: Skill doesn't achieve intended results
- Documentation changes: Official Anthropic docs are updated
- Best practices evolve: New patterns emerge
- Tool changes: Underlying tools or APIs change
- Scope expansion: Skill needs to cover more use cases
- Scope reduction: Skill tries to do too much

## Update Workflow

### Step 0: Check Skill Origin

Before updating, verify whether the skill comes from an external source:

```bash
# Check if skill exists in shirokuma-skills or a plugin
ls .claude-plugin/ 2>/dev/null
Grep: "source" in .claude-plugin/plugin.json
```

**If the skill originates from shirokuma-skills or another plugin:**

1. **Ask the user for confirmation** before making any changes
2. Explain that local modifications may be overwritten on next upstream update
3. Suggest alternatives:
   - File an issue on the upstream repository instead
   - Override in `project/` directory (project-specific customization layer)
   - Fork the skill if persistent changes are needed

> **Important**: Skills from shirokuma-skills are periodically updated to follow
> evolving best practices. Local edits to these skills will be lost when the
> upstream is updated via `shirokuma-docs init --with-skills` or plugin update.
> Always confirm with the user before modifying externally-sourced skills.

**If the skill is project-local:** Proceed to Step 1.

### Step 1: Review Current Skill

Read the existing skill critically:

```bash
# Read the skill
cat .claude/skills/skill-name/SKILL.md

# Check supporting files
ls .claude/skills/skill-name/
```

#### Review checklist

- [ ] Is the description accurate and specific?
- [ ] Does the workflow match actual usage?
- [ ] Are examples still valid?
- [ ] Is SKILL.md under 500 lines?
- [ ] Are supporting files properly referenced?
- [ ] Do tool restrictions match needs?
- [ ] Are trigger phrases clear?

### Step 2: Identify Issues

Common issues to look for:

#### Description Problems

- Too vague: "Helps with documents" → "Validates markdown frontmatter against YAML schemas"
- Missing triggers: Add specific user phrases in quotes
- Wrong person: Using "I" instead of third person

#### Content Problems

- Too long: SKILL.md over 500 lines
- Custom scripts: Skill requires users to write code
- Outdated examples: Commands or APIs changed
- Missing context: Assumes knowledge not in the skill
- Wrong abstraction: Too specific or too generic
- Broken references: Links to non-existent supporting files

#### Structure Problems

- Flat organization: No clear sections
- Poor progressive disclosure: Important info buried
- Incomplete workflows: Missing steps
- No examples: Hard to understand

#### Technical Problems

- Wrong tool restrictions: Blocking needed tools
- API mismatches: Using deprecated methods
- Platform conflicts: Works in Code but not API

### Step 3: Plan the Update

Decide what to change:

#### Minor updates (no workflow change)

- Fix typos
- Update examples
- Clarify wording
- Add missing details

#### Major updates (workflow changes)

- Restructure content
- Change approach (e.g., CLI instead of scripts)
- Add/remove sections
- Split into multiple files
- Combine with other skills

#### Breaking changes

- Rename skill (changes how it's invoked)
- Change tool restrictions
- Remove functionality

### Step 4: Make Changes

Follow the same principles as creating new skills:

#### Update SKILL.md

```markdown
---
name: skill-name  # Keep same unless renaming
description: Updated description with specific trigger phrases
---

# Updated Title

## When to Use
[Updated trigger conditions]

## What Changed (optional section for major updates)
- Removed custom script requirement
- Now uses CLI commands
- Simplified workflow

[Rest of updated content...]
```

**Update or add supporting files** if needed:
- Move long content to supporting files
- Update references in SKILL.md
- Keep one level deep (no nested references)

**Update tool restrictions** if needed:
```yaml
---
name: skill-name
description: Updated description
allowed-tools:
  - Read
  - Grep
  - Bash  # Added if now needed
---
```

### Step 5: Test the Updated Skill

Test like a new skill:

1. **Test activation**: Does the skill trigger correctly?
2. **Test workflow**: Follow the updated instructions
3. **Test examples**: Try all code examples
4. **Test edge cases**: Try unusual inputs
5. **Test across models**: Haiku, Sonnet, Opus

### Step 6: Document Changes

For significant updates, note what changed:

#### In commit message

```bash
git commit -m "refactor(skills): update skill-name to use CLI instead of scripts

- Removed custom Node.js script examples
- Added CLI command examples with shirokuma-md
- Simplified workflow from 9 steps to 5 steps
- Added Commands section
- Moved advanced examples to examples.md"
```

#### Optionally in SKILL.md (for major changes)

```markdown
## What Changed in v2.0

**Previous version**: Required writing custom validation scripts

**New version**: Uses built-in CLI commands

**Migration**: Replace custom scripts with `shirokuma-md validate` command
```

## Common Update Patterns

### Pattern 1: Replace Custom Scripts with CLI

#### Before

```markdown
### Step 4: Create Validation Script

Write this Node.js script:

\```javascript
const fs = require('fs');
// ... 50 lines of code
\```

Run it:
\```bash
node validate.js
\```
```

#### After

```markdown
### Step 4: Configure Validation

Add to config file:

\```yaml
validation:
  schemas:
    - path: .shirokuma/schemas/schema.yaml
      pattern: "docs/**/*.md"
\```

Run validation:
\```bash
shirokuma-md validate
\```
```

#### Impact

Major improvement in usability

### Pattern 2: Split Large Skill

#### Before

Single 800-line SKILL.md

#### After

| File | Content | Size |
|------|---------|------|
| SKILL.md | Core workflow | ~450 lines |
| reference.md | Technical details | ~300 lines |
| examples.md | Complete examples | ~250 lines |
| README.md | Overview | - |

#### In SKILL.md

```markdown
For complete examples, see [examples.md](examples.md).
For technical reference, see [reference.md](reference.md).
```

#### Impact

Better progressive disclosure

### Pattern 3: Improve Description

#### Before

```yaml
description: Helps with validation tasks
```

#### After

```yaml
description: Validate markdown frontmatter against YAML schemas, checking required fields, field types, and enum values. Use when user asks to "validate docs", "check frontmatter", "verify schema", or "find validation errors".
```

#### Impact

Better skill discovery

### Pattern 4: Add Concrete Examples

#### Before (abstract)

```markdown
## Usage

Use the tool to process files according to your needs.
```

#### After (concrete)

```markdown
## Usage

### Example 1: Validate Single File
\```bash
shirokuma-md validate docs/item.md
\```

### Example 2: Validate All Files
\```bash
shirokuma-md validate
\```

### Example 3: Validate with Specific Schema
\```bash
shirokuma-md validate --schema .shirokuma/schemas/item-schema.yaml
\```
```

#### Impact

Clearer understanding

### Pattern 5: Tighten Scope

#### Before

Skill tries to do validation + linting + building + analysis

#### After

Split into 4 focused skills:
- `validating-docs` - Validation only
- `linting-docs` - Linting only
- `building-docs` - Building only
- `analyzing-docs` - Analysis only

#### Impact

Each skill more focused and effective

### Pattern 6: Add Tool Restrictions

#### Before

Skill has full tool access but only reads files

#### After

```yaml
---
name: analyzing-code-quality
description: ...
allowed-tools:
  - Read
  - Grep
  - Glob
---
```

#### Impact

Clearer intent, safer execution

### Pattern 7: Update for API Changes

#### Before

Uses old API
```markdown
\```python
import anthropic
client = anthropic.Client(api_key="...")
response = client.completion(...)  # Deprecated
\```
```

#### After

Uses new API
```markdown
\```python
import anthropic
client = anthropic.Anthropic(api_key="...")
response = client.messages.create(...)  # Current
\```
```

#### Impact

Works with current tools

### Pattern 8: Improve Progressive Disclosure

#### Before

Everything in SKILL.md (800 lines)

#### After

- SKILL.md: Core workflow (400 lines)
- When Claude needs details → mentions "see reference.md for complete API"
- Claude reads reference.md on demand

#### Impact

Lower initial token cost, better context management

## Review Checklist

Use this checklist when updating a skill:

### Description Quality
- [ ] Third-person, present tense
- [ ] Specific trigger phrases in quotes
- [ ] Under 1024 characters
- [ ] Mentions file types or domains
- [ ] Clear about what skill does

### Content Quality
- [ ] SKILL.md under 500 lines
- [ ] Clear section structure
- [ ] Concrete examples
- [ ] Code examples are tested
- [ ] No outdated information
- [ ] No custom scripts (unless necessary)
- [ ] CLI-first approach where applicable

### Progressive Disclosure
- [ ] Core info in SKILL.md
- [ ] Detailed info in supporting files
- [ ] References are one level deep
- [ ] Supporting files well-organized

### Technical Accuracy
- [ ] APIs are current
- [ ] Commands work as shown
- [ ] File paths are correct
- [ ] Configuration examples valid
- [ ] Tool restrictions appropriate

### User Experience
- [ ] Easy to follow
- [ ] Clear next steps
- [ ] Error cases covered
- [ ] Common pitfalls mentioned
- [ ] Related skills linked

### Testing
- [ ] Tested with Haiku
- [ ] Tested with Sonnet
- [ ] Tested with Opus
- [ ] Examples work
- [ ] Edge cases handled

## Real-World Example: shirokuma-md Skills Update

#### Context

Three skills (catalog, template, schema) required users to write custom Node.js scripts, but shirokuma-md is a CLI-first tool.

#### Problem Identified

```javascript
// Skills showed this:
const fs = require('fs');
const yaml = require('yaml');
// ... 50 lines of validation code
```

But shirokuma-md should work like:
```bash
shirokuma-md validate
```

#### Update Process

1. **Reviewed all three skills**: catalog, template, schema
2. **Identified pattern**: All showed custom scripts
3. **Planned update**: Replace scripts with CLI + config
4. **Made changes**:
   - Removed all custom Node.js code
   - Added `shirokuma-md.config.yaml` examples
   - Added CLI command examples
   - Added Commands section
   - Updated Notes section
5. **Tested**: Verified examples make sense
6. **Documented**: Updated all three skills consistently

#### Result

- shirokuma-md-catalog: 577 → 772 lines (added CLI examples)
- shirokuma-md-template: 737 lines (restructured)
- shirokuma-md-schema: 293 lines (simplified)

All now show proper CLI-first approach.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Making Skill Do Everything

Don't expand skill to cover all related tasks:

❌ Bad: `processing-documents` handles validation, linting, building, analysis, generation, templates, schemas

✅ Good: Separate focused skills for each concern

### Anti-Pattern 2: Adding Without Removing

Don't just add new content without removing old:

❌ Bad: Keep old examples "for reference", skill grows to 1000 lines

✅ Good: Replace old with new, move extensive examples to supporting files

### Anti-Pattern 3: Breaking Backward Compatibility Without Notice

Don't rename skill or change behavior without warning:

❌ Bad: Change `processing-pdfs` to `pdf-handler` without notice

✅ Good: Update content but keep name, or document migration clearly

### Anti-Pattern 4: Over-Engineering

Don't make skill overly complex:

❌ Bad: Add complex configuration, multiple modes, conditional logic

✅ Good: Keep workflow simple and linear

### Anti-Pattern 5: Assuming Too Much

Don't assume users know related tools:

❌ Bad: "Configure the validator as usual"

✅ Good: Show exact configuration needed

## When to Deprecate a Skill

Sometimes the right update is to remove the skill:

#### Deprecate when

- Underlying tool no longer exists
- Functionality built into Claude natively
- Better skill replaces it
- Scope was wrong from start
- Maintenance burden too high

#### How to deprecate

1. Update description:
```yaml
---
name: old-skill-name
description: "[DEPRECATED] Use new-skill-name instead. This skill is no longer maintained."
---
```

2. Add deprecation notice in SKILL.md:
```markdown
# ⚠️ DEPRECATED

This skill is deprecated. Use `new-skill-name` instead.

**Reason**: [Why deprecated]

**Migration**: [How to switch]

## Old Documentation

[Keep for reference]
```

3. Document in commit:
```bash
git commit -m "deprecate: mark old-skill-name as deprecated

Replaced by new-skill-name which provides better [...]"
```

## Continuous Improvement

Skills should evolve:

#### Monthly

Review skill usage
- Which skills are used most?
- Which skills Claude struggles with?
- User feedback?

#### Quarterly

Check for updates
- Official docs changed?
- New best practices?
- Tool updates?

#### Yearly

Major review
- Still needed?
- Scope still right?
- Structure still optimal?

## Tips for Successful Updates

### 1. Test Before and After

Test the old version, then test the new version:
- Does new version work better?
- Did we break anything?
- Is it actually simpler?

### 2. Get Feedback Early

Test updated skill with real scenarios:
- Ask Claude to use the updated skill
- Does it work as expected?
- Is the workflow clearer?

### 3. Update Related Skills

If updating one skill affects others:
- Update references in related skills
- Ensure consistent terminology
- Check for broken links

### 4. Document Why

Explain the rationale:
- Why this change?
- What problem does it solve?
- What's the benefit?

### 5. Version Thoughtfully

Consider versioning:
- Major changes: Document in skill or README
- Track version in git commits
- Consider keeping old version temporarily

## Resources

- [Official Best Practices](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)
- [managing-skills/best-practices.md](best-practices.md) - Creation best practices
- [managing-skills/examples.md](examples.md) - Example skills
- [managing-skills/reference.md](reference.md) - Technical reference

## Summary

**Updating skills is normal and necessary**:
1. Review critically
2. Identify issues
3. Plan changes
4. Update consistently
5. Test thoroughly
6. Document changes

**Common updates**:
- Replace scripts with CLI
- Split large skills
- Improve descriptions
- Add concrete examples
- Tighten scope
- Update for API changes

**Key principle**: Skills should get better over time, not just bigger.
