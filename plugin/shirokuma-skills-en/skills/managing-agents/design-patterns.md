# Agent Design Patterns

Patterns based on [Anthropic's "Building Effective Agents"](https://www.anthropic.com/engineering/building-effective-agents) guide.

## Table of Contents

**Workflow Patterns** (predictable, deterministic):
- [Prompt Chaining](#workflow-1-prompt-chaining)
- [Routing](#workflow-2-routing)
- [Parallelization](#workflow-3-parallelization)
- [Orchestrator-Workers](#workflow-4-orchestrator-workers)
- [Evaluator-Optimizer](#workflow-5-evaluator-optimizer)

**Agent Roles** (specialized capabilities):
- [Analyzer](#role-1-analyzer)
- [Generator](#role-2-generator)
- [Transformer](#role-3-transformer)
- [Investigator](#role-4-investigator)
- [Orchestrator](#role-5-orchestrator)

**Composite Patterns**:
- [Creator-Checker Pattern](#creator-checker-pattern)

---

# Part 1: Workflow Patterns

> "Start with workflows—they provide more control. Use agents only when complexity is warranted." — Anthropic

## Workflow 1: Prompt Chaining

**Purpose**: Break complex tasks into sequential steps, each processing the previous output.

**Flow**: Input → LLM₁ → Gate/Check → LLM₂ → Gate/Check → LLM₃ → Output

**When to Use**:
- Task has fixed, predictable subtasks
- Latency tradeoff for accuracy is acceptable
- Intermediate validation improves reliability

**Example**: Code Review Pipeline
```markdown
1. **Syntax Check** (LLM₁): Parse and validate
   → Gate: If syntax errors, return early
2. **Security Scan** (LLM₂): Check vulnerabilities
   → Gate: If critical issues, flag for review
3. **Quality Analysis** (LLM₃): Style and best practices
   → Output: Combined report
```

---

## Workflow 2: Routing

**Purpose**: Classify inputs and direct to specialized handlers.

**Flow**: Input → Router → (Handler A: TypeScript | Handler B: Python | Handler C: General)

**When to Use**:
- Distinct input categories exist
- Specialized handling improves accuracy
- Different prompts needed for different types

**Example**: Multi-Language Reviewer
```markdown
1. **Classify**: Detect file type/language
2. **Route**:
   - TypeScript → ts-reviewer (strict mode, types)
   - Python → py-reviewer (PEP8, type hints)
   - Other → general-reviewer
```

---

## Workflow 3: Parallelization

**Purpose**: Run independent tasks simultaneously, aggregate results.

**Flow**: Input → (Task A | Task B | Task C) → Aggregator → Output

**Variations**:
| Type | Description | Example |
|------|-------------|---------|
| **Sectioning** | Split into independent subtasks | Review: security + style + perf |
| **Voting** | Same task multiple times | 3 LLMs vote on best solution |

**When to Use**:
- Subtasks are independent
- Speed matters
- Multiple perspectives improve confidence

**Example**: Comprehensive Code Review
```typescript
// Parallel execution
Promise.all([
  Task({ subagent_type: "security-auditor", prompt: "..." }),
  Task({ subagent_type: "style-checker", prompt: "..." }),
  Task({ subagent_type: "perf-analyzer", prompt: "..." }),
])
// Aggregate results
```

---

## Workflow 4: Orchestrator-Workers

**Purpose**: Central LLM dynamically breaks tasks, delegates to workers, synthesizes.

**Flow**: Orchestrator → (Worker | Worker | Worker) → Synthesizer

**When to Use**:
- Subtasks unpredictable until runtime
- Need flexibility in task decomposition
- Complex problems requiring delegation

**Difference from Parallelization**: Subtasks determined dynamically, not predefined.

**Example**: Feature Implementation
```markdown
Orchestrator analyzes request:
→ "Need new API endpoint + tests + docs"
→ Spawns: api-builder, test-generator, doc-writer
→ Synthesizes results into completion report
```

---

## Workflow 5: Evaluator-Optimizer

**Purpose**: Iterative loop where one LLM generates, another evaluates and refines.

**Flow**: Generator → Output → Evaluator → Feedback → Generator (loop until pass)

**When to Use**:
- Clear evaluation criteria exist
- Iterative refinement demonstrably improves output
- Quality over speed

**Example**: Code Quality Loop
```markdown
1. **Generator**: Write implementation
2. **Evaluator**: Run tests, check criteria
   - If PASS: Done
   - If FAIL: Provide specific feedback
3. **Generator**: Refine based on feedback
4. Repeat (max 3 iterations)
```

**Related**: Creator-Checker pattern (one-shot version)

---

# Part 2: Agent Roles

These are specialized agent types that can be used within workflow patterns.

## Role 1: Analyzer

**Purpose**: Read and analyze code/docs without modification

**Tools**: `Read, Grep, Glob, Bash`
**Model**: `sonnet` or `opus`

### Template

```markdown
---
name: analyzer-agent
description: Analyzes [target] for [criteria]. Use when user asks to "review", "check", or "analyze".
tools: Read, Grep, Glob, Bash
model: sonnet
---

# [Domain] Analyzer

Expert in analyzing [domain] for [criteria].

## Core Responsibilities
- Scan for [patterns]
- Check against [standards]
- Generate findings report

## Workflow

1. **Scan**: Use Glob to find relevant files
2. **Read**: Load file contents
3. **Analyze**: Check against criteria
4. **Report**: Generate findings with severity levels

## Analysis Criteria

- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

## Report Format

\```
# Analysis: [Component]

## Summary
[High-level findings]

## Issues Found
- [Severity] [Issue] at [location]

## Recommendations
- [Suggestion]
\```
```

### Examples

- Code Reviewer
- Security Auditor
- Style Checker
- Architecture Analyzer

---

## Role 2: Generator

**Purpose**: Create new files from specifications

**Tools**: `Read, Write, Bash`
**Model**: `sonnet`

### Template

```markdown
---
name: generator-agent
description: Generates [output type] from [input]. Use when user asks to "create", "generate", or "write".
tools: Read, Write, Bash
model: sonnet
---

# [Output Type] Generator

Expert in creating [output type] following [standards].

## Core Responsibilities
- Gather context from existing files
- Design structure and content
- Generate files following conventions
- Verify generated content

## Workflow

1. **Gather Context**: Read existing files, understand patterns
2. **Design**: Plan structure and content
3. **Generate**: Write new files
4. **Verify**: Check generated content against requirements

## Output Standards

- [Standard 1]
- [Standard 2]

## Template

\```[language]
[Output template structure]
\```
```

### Examples

- Test Generator
- Documentation Builder
- Config Creator
- API Endpoint Generator

---

## Role 3: Transformer

**Purpose**: Modify existing files systematically

**Tools**: `Read, Edit, Bash`
**Model**: `sonnet`

### Template

```markdown
---
name: transformer-agent
description: Transforms [target] by [transformation]. Use when user asks to "refactor", "update", or "migrate".
tools: Read, Edit, Bash
model: sonnet
---

# [Transformation] Transformer

Expert in transforming [input] to [output].

## Core Responsibilities
- Read current content
- Identify required changes
- Apply transformations safely
- Validate results

## Workflow

1. **Read**: Load current content
2. **Analyze**: Identify changes needed
3. **Transform**: Apply modifications
4. **Validate**: Verify correctness

## Transformation Rules

- [Rule 1]
- [Rule 2]

## Safety Checks

- [ ] Tests pass before and after
- [ ] Behavior preserved
- [ ] No data loss
```

### Examples

- Refactoring Specialist
- Code Formatter
- Migration Agent
- Syntax Updater

---

## Role 4: Investigator

**Purpose**: Debug and diagnose issues

**Tools**: `Read, Bash, Grep, Glob`
**Model**: `sonnet` or `opus`

### Template

```markdown
---
name: investigator-agent
description: Investigates [problem type] to find root cause. Use when user reports "error", "bug", or "issue".
tools: Read, Bash, Grep, Glob
model: opus
---

# [Problem Domain] Investigator

Expert in diagnosing and resolving [problem type].

## Core Responsibilities
- Reproduce the issue
- Isolate root cause
- Analyze relevant code
- Propose solutions

## Workflow

1. **Reproduce**: Run failing test or command
2. **Isolate**: Narrow down to specific code
3. **Trace**: Follow execution path
4. **Analyze**: Examine relevant code
5. **Diagnose**: Identify root cause
6. **Suggest**: Propose fix with explanation

## Investigation Techniques

- Stack trace analysis
- Variable state tracking
- Control flow analysis
- Dependency checking

## Report Format

\```
# Investigation: [Issue]

## Error Summary
[Error message and context]

## Root Cause
[Why it happens]

## Affected Code
[File:line with snippet]

## Proposed Fix
[Code change with explanation]

## Verification
[How to test the fix]
\```
```

### Examples

- Debugger
- Performance Analyzer
- Error Investigator
- Memory Leak Detector

---

## Role 5: Orchestrator

**Purpose**: Coordinate complex multi-step workflows

**Tools**: `Task, Read, Write, Bash`
**Model**: `sonnet` or `opus`

### Template

```markdown
---
name: orchestrator-agent
description: Coordinates [workflow] across multiple steps. Use when user needs complex [task type].
tools: Task, Read, Write, Bash
model: sonnet
---

# [Workflow] Orchestrator

Coordinates complex [workflow] involving multiple agents.

## Core Responsibilities
- Plan workflow steps
- Delegate to specialized agents
- Manage execution order
- Integrate results

## Workflow

1. **Plan**: Break into subtasks
2. **Delegate**: Launch subagents via Task tool
3. **Coordinate**: Manage execution sequence
4. **Integrate**: Combine results
5. **Verify**: Check completeness

## Subagent Delegation

\```typescript
// Parallel execution
Task({ subagent_type: "analyzer", prompt: "..." })
Task({ subagent_type: "generator", prompt: "..." })

// Sequential execution
const analysis = await Task({ subagent_type: "analyzer", prompt: "..." })
await Task({ subagent_type: "generator", prompt: `Based on: ${analysis}` })
\```

## Coordination Rules

- Run independent tasks in parallel
- Sequential for dependencies
- Aggregate results before reporting
```

### Examples

- CI/CD Runner
- Release Manager
- Deployment Coordinator
- Full-Stack Feature Builder

---

## Creator-Checker Pattern

Design agents in pairs for comprehensive coverage.

### Concept

| Type | Role | Rule Style | Purpose |
|------|------|------------|---------|
| **Creator** | Implementation | "Do" rules only | Stable, predictable AI behavior |
| **Checker** | Review/Audit | "Do" + "Don't" rules | Comprehensive detection |

### Why This Works

**Creator agents** (Coders, Generators):
- Following "Do" rules produces consistent output
- Positive requirements are easier to implement
- Less ambiguity in what to create

**Checker agents** (Reviewers, Auditors):
- Need to detect what's missing ("Don't" violations)
- Anti-patterns require explicit checking
- Comprehensive coverage requires both rule types

### Example Pair

**Creator: feature-builder**
```markdown
## Completion Requirements (Do rules)
- [ ] Test files exist for all implementation
- [ ] Tests pass before completion
- [ ] i18n keys added for new strings
- [ ] TypeScript types defined
```

**Checker: code-reviewer**
```markdown
## Verification Checklist (Do rules)
- [ ] TypeScript strict mode enabled
- [ ] Error handling implemented
- [ ] Tests have assertions

## Anti-patterns to Detect (Don't rules)
- [ ] No `any` types used
- [ ] No empty catch blocks
- [ ] No hardcoded strings
- [ ] No console.log in production code
```

### Design Guidelines

1. **Create pairs intentionally**: Design Creator and Checker together
2. **Clear handoff**: Creator completes → Checker reviews
3. **Complementary rules**: Checker catches what Creator might miss
4. **Different tool access**: Creator needs Write, Checker needs Read-only

### Common Pairs

| Creator | Checker |
|---------|---------|
| feature-builder | code-reviewer |
| test-generator | test-reviewer |
| doc-builder | doc-reviewer |
| api-developer | security-auditor |

---

# Part 3: Pattern Selection Guide

## Choosing Workflow vs Agent

| Question | If YES | If NO |
|----------|--------|-------|
| Can you predict all steps? | Workflow | Agent |
| Need deterministic results? | Workflow | Agent |
| Latency/cost sensitive? | Workflow | Agent |
| Open-ended problem? | Agent | Workflow |

## Workflow Pattern Selection

| Scenario | Pattern |
|----------|---------|
| Fixed sequential steps | Prompt Chaining |
| Different handlers for different inputs | Routing |
| Independent subtasks, need speed | Parallelization |
| Dynamic task breakdown at runtime | Orchestrator-Workers |
| Iterative refinement with feedback | Evaluator-Optimizer |

## Agent Role Selection

| Scenario | Role |
|----------|------|
| Need to check code quality | Analyzer |
| Need to create new files | Generator |
| Need to modify existing code | Transformer |
| Need to find bug root cause | Investigator |
| Need to coordinate subagents | Orchestrator |
| Need implementation + review | Creator-Checker pair |

## Common Combinations

| Use Case | Workflow + Roles |
|----------|------------------|
| Code review pipeline | Prompt Chaining + Analyzer |
| Multi-language support | Routing + multiple Analyzers |
| Comprehensive audit | Parallelization + Analyzer × 3 |
| Feature implementation | Orchestrator-Workers + Generator, Analyzer |
| Quality assurance | Evaluator-Optimizer + Generator, Analyzer |
