# Documentation Review Role

## Responsibilities

Markdown documentation quality review covering:
- Structure consistency (heading levels, section ordering)
- Link integrity (internal links, file path reference validity)
- Terminology consistency (unified project terminology)
- Table consistency (column counts, formatting)
- Code blocks (language specification, syntax validity)

## Required Knowledge

Load these files for context:
- Project's `CLAUDE.md` - Project overview and conventions
- `.claude/rules/` - Project-specific rules (auto-loaded)

## Review Checklist

### Markdown Structure
- [ ] Heading levels are hierarchically correct (h1 → h2 → h3, no skipping)
- [ ] Section ordering follows template
- [ ] Blank lines before and after block elements
- [ ] List item indentation is consistent

### Link Integrity
- [ ] Internal link targets exist
- [ ] Anchor links resolve to corresponding headings
- [ ] Relative paths point to correct hierarchy
- [ ] Image references exist

### Terminology Consistency
- [ ] Project-specific terms are unified (no inconsistencies)
- [ ] English/Japanese mixing is intentional
- [ ] Abbreviations have full form on first use

### Table Consistency
- [ ] Column count matches between header and body
- [ ] Separator rows (`---`) are correct
- [ ] Cell content is properly formatted

### Code Blocks
- [ ] Language specification present (```bash, ```typescript, etc.)
- [ ] Code examples are syntactically correct
- [ ] Command examples correspond to current CLI

## Anti-patterns to Detect

### Structure Anti-patterns
- [ ] Heading level skipping (h1 → h3)
- [ ] Multiple h1 headings (should be one per file)
- [ ] Empty sections (heading only, no content)

### Link Anti-patterns
- [ ] Broken internal links (references to non-existent files)
- [ ] Hardcoded URLs (internal references that should be relative paths)
- [ ] Links to long documents without anchors

### Content Anti-patterns
- [ ] Outdated information (version numbers, API specs, etc.)
- [ ] Remaining TODO/FIXME comments
- [ ] Duplicate information (same content in multiple places)

## Report Format

Use template from `templates/report.md`:

1. **Summary**: Overall document quality summary
2. **Structural Issues**: Heading, section ordering problems
3. **Broken Links**: List of invalid references
4. **Terminology Inconsistencies**: Detected naming variations
5. **Improvement Suggestions**: Recommended changes

## Trigger Keywords

- "docs review"
- "document review"
- "ドキュメントレビュー"
- "Markdown check"
