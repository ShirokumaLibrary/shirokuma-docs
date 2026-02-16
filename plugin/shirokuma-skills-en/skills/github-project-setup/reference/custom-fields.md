# Custom Fields Reference

## Overview

| Field | Purpose | AI Development Use |
|-------|---------|-------------------|
| Priority | Urgency/importance | Task prioritization |
| Size | Effort estimation | Replaces time estimates |

## Priority

| Value | Color | Purpose |
|-------|-------|---------|
| Critical | Red | Urgent, needs immediate attention |
| High | Orange | Important but not urgent |
| Medium | Yellow | Normal priority |
| Low | Gray | When time permits |

## Size (AI Development)

Traditional time estimates don't work well for AI-assisted development. Use Size to indicate effort/complexity.

| Value | Color | Guideline |
|-------|-------|-----------|
| XS | Gray | Minutes to complete |
| S | Green | Single session |
| M | Yellow | Multiple sessions |
| L | Orange | Full day or more |
| XL | Red | Needs to be split |

**Rule**: XL tasks must be split into smaller tasks.

## Type (Issue Types)

Built-in Projects V2 field. Reflects Organization Issue Types — not a custom SingleSelect.

| Value | Default | Description |
|-------|---------|-------------|
| Feature | Yes | New features and enhancements |
| Bug | Yes | Bug fixes |
| Task | Yes | General tasks |
| Chore | Custom | Config, tooling, refactoring |
| Docs | Custom | Documentation |
| Research | Custom | Investigation and research |

Managed via Organization Settings → Planning → Issue types (manual setup).
