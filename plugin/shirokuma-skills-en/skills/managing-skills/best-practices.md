# Agent Skills: Best Practices Guide

## Table of Contents

1. [Core Principles](#core-principles)
2. [Content Organization](#content-organization)
3. [Progressive Disclosure Patterns](#progressive-disclosure-patterns)

For additional topics, see:
- [Writing Effective Instructions](best-practices-writing.md) - Checklists, templates, code patterns
- [Testing and Evaluation](best-practices-testing.md) - Testing strategy, common patterns, checklists

---

## Core Principles

### 1. Conciseness

**Target**: Keep SKILL.md under 500 lines

**Philosophy**: "Only add context Claude doesn't already have"

**Assume Claude knows**:
- Basic programming concepts
- Common file formats
- Standard workflows
- General best practices

**Challenge every sentence**:
- Does this add new information?
- Is this the most concise way to express it?
- Should this be in a supporting file instead?

**Example transformation**:

Verbose (unnecessary context):
```markdown
When you need to analyze a spreadsheet file, the first thing you should do is to open the file and read its contents. After reading the contents, you should parse the data into a structured format that can be easily manipulated. Once the data is in a structured format, you can begin your analysis.
```

Concise (assumes knowledge):
```markdown
1. Read and parse spreadsheet
2. Analyze structured data
3. Generate insights
```

### 2. Degrees of Freedom

Match instruction specificity to task fragility.

#### High Freedom (Text Instructions)

**When to use**:
- Multiple valid approaches
- Creative problem-solving needed
- Context varies significantly
- Flexibility is beneficial

**Example**:
```markdown
Analyze the codebase for potential improvements. Consider:
- Code organization
- Performance bottlenecks
- Security vulnerabilities
- Documentation gaps
```

#### Medium Freedom (Pseudocode)

**When to use**:
- Preferred pattern exists but variation OK
- Structure matters but details flexible
- Guidance helpful but not critical

**Example**:
```markdown
1. Scan files matching pattern
2. For each file:
   a. Extract relevant data
   b. Apply transformations
   c. Validate output
3. Aggregate results
4. Generate report
```

#### Low Freedom (Exact Code)

**When to use**:
- Fragile external dependencies
- Specific output format required
- Precise behavior critical
- API contracts must be exact

**Example**:
```python
# EXACT: Do not modify format
response = {
    "status": "success",
    "data": result,
    "timestamp": datetime.utcnow().isoformat()
}
```

### 3. Multi-Model Testing

Test across Claude models:

| Model | Best For | Limitations |
|-------|----------|-------------|
| Haiku | Simple tasks, quick responses | Struggles with complex multi-step |
| Sonnet | Balanced performance | May need guidance on edge cases |
| Opus | Complex reasoning, nuanced tasks | Higher cost/latency |

**Recommendation**: Design for Sonnet, simplify for Haiku, enhance for Opus.

---

## Content Organization

### File Structure

| File | Purpose | Line Limit |
|------|---------|------------|
| SKILL.md | Overview + workflow | <500 |
| reference.md | Complete specs | <800 |
| examples.md | Concrete use cases | <600 |
| best-practices.md | Advanced patterns | <400 |
| scripts/ | Pre-made utilities | - |
| templates/ | Reusable structures | - |

### Short Files (<100 lines)

Keep all content in SKILL.md when simple enough.

**Recommended sections**:
- When to Use (trigger scenarios)
- Workflow (step-by-step)
- Common Patterns (brief examples)
- Error Handling
- Notes
- Related Resources (links to supporting files)

### Long Files (100+ lines)

Add table of contents at the top:

```markdown
## Table of Contents

1. [Section 1](#section-1)
2. [Section 2](#section-2)
3. [Section 3](#section-3)
```

### File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Main skill | SKILL.md | SKILL.md |
| Reference | descriptive-name.md | api-reference.md |
| Examples | topic-examples.md | form-examples.md |
| Supporting | lowercase-hyphenated.md | advanced-config.md |

**Naming principles**:
- Use gerund form (-ing) for skill names
- Lowercase with hyphens only
- Descriptive and specific

### Token Efficiency Over Readability

When information is equivalent, choose token-efficient format:

**Prefer**:
- Tables over lists for structured data
- Inline text over deeply nested sections
- References over repetition

### Time-Sensitive Information

Avoid dates. Use semantic versioning.

**Current API**:
```markdown
## Current API
Use v2 endpoint for all operations.
```

**Deprecated (collapsible)**:
```markdown
<details>
<summary>Legacy API (Deprecated)</summary>
Use v1 endpoint for backward compatibility.
</details>
```

### Consistent Terminology

One term per concept, used consistently throughout:

| Concept | Use | Don't Use |
|---------|-----|-----------|
| File content | "content" | "data", "text", "body" |
| Config file | "config" | "configuration", "settings" |
| Output file | "output" | "result", "generated" |

---

## Progressive Disclosure Patterns

### Pattern 1: High-Level Guide with References

**SKILL.md** (overview):
```markdown
# Form Processing Skill

## Workflow

1. Analyze form structure (see [FORMS.md](FORMS.md))
2. Extract field definitions
3. Validate input (see [REFERENCE.md](REFERENCE.md))
4. Submit data

## Form Types

- Login forms: [FORMS.md](FORMS.md#login-forms)
- Registration forms: [FORMS.md](FORMS.md#registration-forms)
- Payment forms: [FORMS.md](FORMS.md#payment-forms)
```

**FORMS.md** (loaded when needed):
```markdown
# Form Processing Reference

## Table of Contents
1. [Login Forms](#login-forms)
2. [Registration Forms](#registration-forms)
3. [Payment Forms](#payment-forms)

## Login Forms
[Detailed content...]
```

### Pattern 2: Domain-Specific Organization

**SKILL.md** (domain router):
```markdown
# Sales Data Analyzer

## Workflows by Domain

#### Finance
See [finance.md](finance.md)
- Revenue analysis
- Cost tracking
- Budget forecasting

#### Sales
See [sales.md](sales.md)
- Pipeline analysis
- Conversion tracking
- Territory performance

#### Product
See [product.md](product.md)
- Feature usage
- Customer feedback
- Roadmap planning
```

### Pattern 3: Conditional Details

**SKILL.md** (basic + links):
```markdown
## Basic Validation

1. Check required fields
2. Validate data types
3. Verify constraints

## Advanced Validation

For complex scenarios, see [advanced-validation.md](advanced-validation.md):
- Cross-field validation
- Conditional requirements
- Custom rules
```

### Keep References One Level Deep

**Good** (flat):
- SKILL.md → reference.md, examples.md, best-practices.md

**Bad** (nested chain):
- SKILL.md → reference.md → api-details.md → field-specs.md

**Why nested is bad**: Claude previews nested files partially instead of reading completely.

---

## Quick Reference

### Principles Summary

1. **Conciseness**: <500 lines, assume Claude knows basics
2. **Degrees of Freedom**: Match specificity to fragility
3. **Multi-Model**: Test Haiku, Sonnet, Opus
4. **One Level Deep**: No nested references
5. **Consistent Terms**: One word per concept

### Essential Patterns

- **Checklists**: For complex multi-step tasks
- **Validation Loops**: run → check → fix → repeat
- **Templates**: Exact for strict, flexible for adaptive
- **Examples**: Input/output pairs
- **Conditional Workflows**: Guide decision points

### Critical Errors to Avoid

- Vague descriptions without triggers
- Windows backslash paths
- Nested references (>1 level deep)
- Time-sensitive information
- Inconsistent terminology
- Missing error handling in scripts
- Magic numbers without justification

## Related Resources

- [Writing Effective Instructions](best-practices-writing.md)
- [Testing and Evaluation](best-practices-testing.md)
- [Reference Guide](reference.md)
- [Examples](examples.md)
