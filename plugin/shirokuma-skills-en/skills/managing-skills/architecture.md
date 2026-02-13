# Agent Skills: Technical Architecture

## Table of Contents

1. [Progressive Disclosure Architecture](#progressive-disclosure-architecture)
2. [Context Window Dynamics](#context-window-dynamics)
3. [Filesystem-Based Execution Model](#filesystem-based-execution-model)
4. [Code Execution Architecture](#code-execution-architecture)
5. [Platform Architecture](#platform-architecture)
6. [Security Model](#security-model)
7. [Performance Considerations](#performance-considerations)
8. [Token Management](#token-management)

---

## Progressive Disclosure Architecture

### Three-Tier Loading Model

Skills implement a hierarchical loading system that manages context efficiently through progressive disclosure of information.

#### Level 1: Metadata (~100 tokens)

- What loads: YAML frontmatter only (`name` and `description`)
- When: Always at system startup
- Purpose: Skill discovery and selection
- Token cost: ~100 tokens per skill

##### Example
```yaml
---
name: processing-pdfs
description: Extract text and tables from PDF files, fill forms, merge PDFs. Use when working with PDFs or when user asks to "read PDF", "extract PDF text", "fill PDF form", or "merge PDFs".
---
```

##### Impact on selection

Claude reads ALL skill metadata to determine which skills might be relevant. Specific, trigger-rich descriptions improve selection accuracy.

#### Level 2: Instructions (under 5k tokens)

- What loads: SKILL.md body content
- When: After skill is selected and triggered
- Purpose: Provide workflows, best practices, core guidance
- Token cost: Typically 2k-5k tokens

##### Example structure
```markdown
# Skill Title

## When to Use
[Trigger scenarios]

## Workflow
[Step-by-step instructions]

## Error Handling
[Common issues]

## Related Resources
[Links to Level 3 files]
```

##### Target

Keep under 500 lines to maintain <5k token budget

#### Level 3: Resources (on-demand)

- What loads: Supporting files (reference.md, examples.md, scripts/, templates/)
- When: Only when Claude explicitly accesses them
- Purpose: Detailed documentation, extensive examples, executable code
- Token cost: Variable, but NOT loaded unless needed

##### Key advantage

"The amount of context that can be bundled into a skill is effectively unbounded" because unused resources consume zero tokens.

### Elastic Context Consumption

The system demonstrates dynamic context usage:

```
[Startup]
System Prompt (baseline)
+ All Skill Metadata (Level 1: ~100 tokens × N skills)
+ User Message

[Skill Triggered]
Previous Context
+ SKILL.md Body (Level 2: ~5k tokens)

[Resource Needed]
Previous Context
+ reference.md (Level 3: variable)

[Resource No Longer Needed]
Context contracts - file unloaded
```

##### Example session

```
1. User: "Process this PDF"
   Context: System + Metadata + User message = ~5k tokens

2. Claude triggers processing-pdfs skill
   Context expands: +SKILL.md = ~10k tokens

3. Claude needs API details
   Context expands: +reference.md = ~15k tokens

4. Task completes
   Context contracts: Back to system baseline
```

### Progressive Disclosure Best Practices

#### Optimize Level 1 (Metadata)

- Specific triggers in description
- Mention file types and domains
- Use concrete action verbs

#### Optimize Level 2 (SKILL.md)

- Keep under 500 lines
- Provide workflow overview
- Link to Level 3 for details
- Assume Claude has foundational knowledge

#### Optimize Level 3 (Resources)

- Split by topic/domain
- Add table of contents to long files
- Use descriptive file names
- Keep one level deep (no nested references)

---

## Context Window Dynamics

### Context Budget Management

#### Typical context allocations

```
System Prompt:        ~3,000 tokens
All Skill Metadata:   ~1,000 tokens (10 skills × 100)
User Message:         ~1,000 tokens
SKILL.md (if loaded): ~5,000 tokens
Resources (optional): ~10,000 tokens
Response Generation:  ~5,000 tokens
--------------------------------------------------
Total Used:           ~25,000 tokens

Available Window:     200,000 tokens (Claude Sonnet 3.5)
Remaining:            175,000 tokens for conversation history
```

### Why Progressive Disclosure Matters

#### Without progressive disclosure (monolithic approach)

```
Single SKILL.md: 50,000 tokens
↓
Always loaded when skill triggers
↓
Context rapidly exhausted
↓
Limited conversation depth
```

#### With progressive disclosure

```
SKILL.md: 5,000 tokens (overview)
reference.md: 20,000 tokens (only if needed)
examples.md: 15,000 tokens (only if needed)
↓
Efficient token usage
↓
Longer conversations possible
```

### Token Efficiency Strategies

#### 1. Metadata compression (Level 1)

```yaml
# Verbose: 150 tokens
description: This skill is designed to help with processing PDF documents including extracting text...

# Compressed: 80 tokens
description: Extract text from PDFs, fill forms, merge documents. Use when...
```

#### 2. Workflow compression (Level 2)

```markdown
# Verbose: 500 tokens
When you need to process a PDF, first you should open it and verify...

# Compressed: 200 tokens
1. Verify PDF accessible
2. Extract required data
3. Validate output
```

#### 3. On-demand details (Level 3)

```markdown
# In SKILL.md (Level 2):
For complete API reference, see [reference.md](reference.md)

# In reference.md (Level 3):
[Extensive API documentation - only loaded when needed]
```

---

## Filesystem-Based Execution Model

### Virtual Machine Environment

Skills operate in a sandboxed VM environment with:

#### Filesystem access

- Read files selectively
- Write output files
- Execute scripts
- Navigate directories

#### Bash access

- Run shell commands
- Pipe operations
- Process text streams
- Execute utilities

#### Python/Node/other runtimes

- Execute scripts deterministically
- Import libraries
- Process data
- Generate outputs

### Execution Without Context Loading

##### Key advantage

Scripts can execute without loading their code into context.

##### Traditional approach (context-heavy)

```
1. Claude generates Python script (consumes tokens)
2. Executes script
3. Reads output
```

##### Skill-based approach (context-efficient)

```
1. Claude invokes pre-existing script
2. Executes script (code not in context)
3. Reads output
```

#### Example

##### Context-heavy

```markdown
## Workflow
Generate and run this Python script:
```python
# [50 lines of validation code]
```
```

##### Context-efficient

```markdown
## Workflow
Run validation:
```bash
python scripts/validate.py input.json
```

Script location: scripts/validate.py (not loaded into context)
```

### Code as Dual-Purpose Resource

Scripts serve two roles:

#### 1. Executable tools

```bash
python scripts/analyze.py data.json
```
Result: Deterministic execution, reliable output

#### 2. Reference documentation

```bash
cat scripts/analyze.py
```
Result: Claude can read implementation if needed

##### Benefit

Code is documentation that's also executable.

### Selective File Reading

Claude can strategically access files:

#### List files first

```bash
ls scripts/
# Output: validate.py, transform.py, report.py
```

#### Read specific file when needed

```bash
cat scripts/validate.py
```

##### Token impact

Only loaded files consume tokens.

---

## Code Execution Architecture

### Deterministic vs Generated Code

#### Pre-made scripts (deterministic)

- Consistent behavior
- Pre-tested
- Immediate execution
- No generation errors
- Token efficient

#### Generated code (non-deterministic)

- Flexible but variable
- Requires testing
- Generation delay
- Potential errors
- Token expensive

#### When to use each

Use **pre-made scripts** for:
- Critical operations
- Repeated workflows
- Complex algorithms
- Error-prone tasks

Use **generated code** for:
- One-off operations
- User-specific logic
- Simple transformations
- Exploratory tasks

### Error Handling in Scripts

#### Explicit error handling (solve, don't punt)

```python
#!/usr/bin/env python3
"""Robust script with explicit error handling."""

import sys
from pathlib import Path

def process(input_path):
    """Process file with comprehensive error handling."""
    
    # Check file exists
    if not input_path.exists():
        print(f"ERROR: File not found: {input_path}", file=sys.stderr)
        print(f"Solution: Verify path and permissions", file=sys.stderr)
        sys.exit(1)
    
    # Check file readable
    try:
        content = input_path.read_text()
    except PermissionError:
        print(f"ERROR: Permission denied: {input_path}", file=sys.stderr)
        print(f"Solution: Run: chmod +r {input_path}", file=sys.stderr)
        sys.exit(1)
    
    # Check content valid
    if not content.strip():
        print(f"ERROR: File is empty: {input_path}", file=sys.stderr)
        print(f"Solution: Provide non-empty input file", file=sys.stderr)
        sys.exit(1)
    
    # Process with timeout
    try:
        result = complex_operation(content, timeout=30)  # Justified: typical completion time
    except TimeoutError:
        print(f"ERROR: Operation timed out after 30 seconds", file=sys.stderr)
        print(f"Solution: Reduce input size or increase timeout", file=sys.stderr)
        sys.exit(1)
    
    return result

def main():
    if len(sys.argv) != 2:
        print("Usage: script.py <input-file>", file=sys.stderr)
        sys.exit(1)
    
    input_path = Path(sys.argv[1])
    result = process(input_path)
    print(result)

if __name__ == "__main__":
    main()
```

#### Exit codes

- `0`: Success
- `1`: File error
- `2`: Validation error
- `3`: Processing error
- `4`: Timeout error

### Script Permissions

#### Unix-style permissions required

```bash
# Set execute permission
chmod +x scripts/*.py

# Verify
ls -l scripts/
# Should show: -rwxr-xr-x
```

#### Without execute permission

```bash
$ ./scripts/helper.py
bash: ./scripts/helper.py: Permission denied
```

#### With execute permission

```bash
$ ./scripts/helper.py
# Executes successfully
```

---

## Platform Architecture

### Claude Code (CLI)

#### Architecture

```
User Input
    ↓
Claude Code CLI
    ↓
Claude API (with code execution enabled)
    ↓
VM Environment (full filesystem access)
    ↓
Skills (Level 1 → 2 → 3 as needed)
```

#### Features

- Full bash access
- Network access (unrestricted)
- Tool restrictions (`allowed-tools`)
- Local filesystem access
- Git operations

#### Skill loading

- `.claude/skills/` (project)
- `~/.claude/skills/` (personal)
- Plugin skills (from installed packages)

### Claude API

#### Architecture

```
API Request (with skills specified)
    ↓
Code Execution Environment
    ↓
Pre-built Skills (pptx, xlsx, docx, pdf)
    OR
    Custom Skills (uploaded)
    ↓
Generated Files
    ↓
Download via Files API
```

#### Features

- Pre-built Anthropic skills
- Custom skill upload
- File generation
- Network access (restricted)

#### Limitations

- No `allowed-tools` (not applicable)
- Skills specified per-request
- No personal/project skill directories

### Agent SDK

#### Architecture

```
Agent Initialization (with config)
    ↓
settingSources: ["user", "project"]
    ↓
Skill Discovery
    ↓
Query Execution
    ↓
Skills Invoked as Needed
```

#### Features

- Filesystem-based skills only
- Config-driven tool access
- Setting sources control skill locations

#### Critical configuration

```typescript
const agent = new Agent({
  settingSources: ["user", "project"],  // REQUIRED for skills
  allowedTools: ["Skill", "Read", "Write", "Bash"]  // Controls access
});
```

#### Common issue

```typescript
// Missing settingSources - skills won't load!
const agent = new Agent({
  allowedTools: ["Skill"]  // Not enough!
});
```

---

## Security Model

### Attack Surface

Skills present security risks through:

#### 1. Instructions

- Malicious workflows
- Data exfiltration commands
- Destructive operations

#### 2. Bundled Code

- Malware in scripts
- Supply chain attacks
- Dependency vulnerabilities

#### 3. External Connections

- Network calls to malicious servers
- Data leakage
- Command-and-control

### Trust Model

#### Recommendations

##### 1. Source trust

- Only install plugins from trusted sources
- Review skill code before use
- Check publisher reputation

##### 2. Code auditing

- Read scripts before execution
- Review bash commands
- Check for network calls

##### 3. Dependency scanning

- Audit package.json/requirements.txt
- Check for known vulnerabilities
- Use minimal dependencies

### Sandboxing with allowed-tools

#### Restrict capabilities for sensitive operations

##### Read-only analysis (safe)

```yaml
allowed-tools: Read, Grep, Glob
```

#### Safe git operations

```yaml
allowed-tools: Read, Grep, Glob, Bash(git diff:*), Bash(git log:*), Bash(git status:*)
```

#### No filesystem modification

```yaml
allowed-tools: Read, Grep
# Excludes: Write, Edit, Bash
```

### Secrets Management

#### Don't embed secrets in skills

❌ **Bad**:
```python
API_KEY = "sk-1234567890abcdef"  # Hardcoded secret
```

✅ **Good**:
```python
import os
API_KEY = os.environ.get("API_KEY")  # From environment
if not API_KEY:
    print("ERROR: API_KEY environment variable not set")
    sys.exit(1)
```

#### Don't commit secrets

```gitignore
# .gitignore
.claude/skills/*/.env
.claude/skills/*/secrets.yaml
.claude/skills/*/credentials.json
```

---

## Performance Considerations

### SKILL.md Size Impact

#### Token cost vs file size

| Lines | ~Tokens | Load Time | Impact |
|-------|---------|-----------|--------|
| 100 | ~1k | Fast | ✅ Optimal |
| 300 | ~3k | Fast | ✅ Good |
| 500 | ~5k | Medium | ⚠️ Acceptable |
| 1000 | ~10k | Slow | ❌ Too large |

##### Recommendation

Keep under 500 lines

### Supporting File Organization

#### Split vs monolithic

##### Monolithic (poor performance)

```
complete-reference.md (10,000 lines = ~100k tokens)
↓
Fully loaded when accessed
↓
Context heavily consumed
```

##### Split (good performance)

```
reference.md (TOC + overview)
api-reference.md (loaded if API needed)
examples.md (loaded if examples needed)
troubleshooting.md (loaded if errors)
↓
Selective loading
↓
Efficient context usage
```

### Table of Contents Performance

#### For files >100 lines, add TOC

```markdown
# Large Reference File

## Table of Contents
1. [Section A](#section-a)
2. [Section B](#section-b)
3. [Section C](#section-c)
...

[3000 more lines]
```

##### Why

Claude sees TOC even with partial reads, understands full scope.

### File Name Impact

#### Descriptive names improve navigation

✅ **Fast navigation**:
```
api-endpoints.md      # Claude knows what's inside
error-codes.md        # Obvious content
validation-rules.md   # Clear purpose
```

❌ **Slow navigation**:
```
doc1.md              # Must read to know content
reference.md         # Too generic
misc.md              # Ambiguous
```

---

## Token Management

### Estimation Formula

#### Rough estimation

- 1 token ≈ 4 characters (English)
- 1 token ≈ 0.75 words (English)
- 100 lines ≈ 1,000 tokens (typical code/markdown)

#### More accurate

```python
import tiktoken

encoder = tiktoken.encoding_for_model("gpt-4")
tokens = encoder.encode(text)
token_count = len(tokens)
```

### Budget Allocation

#### Example session budget (200k context window)

```
Reserved for System:
- System prompt: 3,000
- Skill metadata (10 skills): 1,000
- Buffer: 5,000
Subtotal: 9,000

Available for Session: 191,000

Per-message allocation:
- User message: ~1,000
- SKILL.md (if triggered): ~5,000
- Resources (if needed): ~10,000
- Claude response: ~2,000
- Per exchange: ~18,000

Conversation depth: 191,000 / 18,000 ≈ 10 exchanges
```

### Optimization Strategies

#### 1. Compress metadata (Level 1)

- Remove filler words
- Use active voice
- Specific terminology

#### 2. Compress instructions (Level 2)

- Assume foundational knowledge
- Use code blocks instead of prose
- Link to Level 3 for details

#### 3. Selective resource loading (Level 3)

- Clear file names for targeted access
- Table of contents for context
- One level deep to avoid partial reads

#### 4. Script execution over generation

- Pre-made scripts save generation tokens
- Execution results typically smaller than code

---

## Design Patterns

### Pattern: Lazy Loading Documentation

#### Structure

```
SKILL.md (always loaded)
  ↓ [only if user asks about API]
api-reference.md
  ↓ [only if examples needed]
examples.md
```

#### Implementation

```markdown
# SKILL.md

## API Usage

For complete API documentation, see [api-reference.md](api-reference.md).

Quick reference:
- Endpoint: /api/v1/process
- Method: POST
- Auth: Bearer token
```

##### Benefit

Common cases avoid loading extensive docs.

### Pattern: Domain-Specific Routing

#### Structure

```
SKILL.md (domain router)
  ↓ [finance domain]
finance.md
  ↓ [sales domain]
sales.md
  ↓ [product domain]
product.md
```

#### Implementation

```markdown
# SKILL.md

## Select Domain

**Finance**: [finance.md](finance.md)
**Sales**: [sales.md](sales.md)
**Product**: [product.md](product.md)
```

##### Benefit

Irrelevant domain docs never loaded.

### Pattern: Progressive Complexity

#### Structure

```
SKILL.md (basic workflow)
  ↓ [basic suffices for most]
[done]
  ↓ [complex case encountered]
advanced-patterns.md
```

#### Implementation

```markdown
# SKILL.md

## Basic Workflow
1. Step A
2. Step B
3. Step C

## Advanced Use Cases

For complex scenarios, see [advanced-patterns.md](advanced-patterns.md).
```

##### Benefit

Simple cases complete efficiently.

---

## Measurement and Monitoring

### Observability

#### What to monitor

##### 1. File access patterns

- Which files does Claude read?
- In what order?
- How frequently?

##### 2. Token consumption

- Average per skill trigger
- Peak consumption
- Conversation depth impact

##### 3. Success rates

- Task completion
- Error frequency
- Retry patterns

### Logging Example

```python
# In skill script
import logging

logging.basicConfig(
    filename='.claude/skills/skill-name/usage.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def main():
    logging.info("Skill invoked with args: %s", sys.argv)
    # ... execution ...
    logging.info("Completed successfully")
```

### Analysis

```bash
# Most accessed files
grep "Accessed file:" .claude/skills/*/usage.log | \
  cut -d: -f3 | sort | uniq -c | sort -rn

# Token usage over time
grep "Token count:" .claude/skills/*/usage.log | \
  awk '{print $4}' | \
  awk '{sum+=$1; count++} END {print "Average:", sum/count}'
```

---

## Summary

### Key Architectural Principles

1. Progressive Disclosure: Load only what's needed when it's needed
2. Filesystem-Based: Leverage deterministic script execution
3. Token Efficiency: Optimize for context window management
4. Security-Conscious: Trust sources, audit code, restrict access
5. Platform-Aware: Understand differences across Claude Code, API, SDK

### Performance Hierarchy

```
Most Efficient:
1. Pre-made scripts (execute without loading)
2. SKILL.md only (no resources)
3. SKILL.md + selective resource
4. SKILL.md + multiple resources

Least Efficient:
5. Monolithic skill (everything in SKILL.md)
```

### Architecture Goals

- Scalability: Support many skills without context exhaustion
- Efficiency: Minimal token overhead per skill
- Flexibility: Adapt to different platforms and use cases
- Security: Safe execution in various contexts
- Maintainability: Clear structure, easy updates
