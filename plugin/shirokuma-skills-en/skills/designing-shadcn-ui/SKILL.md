---
name: designing-shadcn-ui
description: Creates distinctive, production-grade frontend interfaces. Use when "memorable design", "distinctive UI", "unique design", "landing page", avoiding generic look, or when creating unique visual aesthetics.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch
---

# shadcn/ui Design

Create memorable, production-grade interfaces that avoid generic "AI slop" aesthetics.

## Workflow

### 0. Tech Stack Check

**First**, read project `CLAUDE.md` to confirm:
- Frontend framework (Next.js version, React version)
- Styling (Tailwind v3/v4, CSS Modules)
- Component library (shadcn/ui stable/canary)
- i18n setup (next-intl, messages structure)

### 1. Design Discovery

Before writing code, understand and document:

```markdown
## Design Brief

**Purpose**: What problem does this interface solve?
**Context**: Technical constraints, existing design system
**Differentiation**: What makes this UNFORGETTABLE?

## Aesthetic Direction

**Tone**: [Choose ONE]
- Brutally minimal / Maximalist chaos / Retro-futuristic
- Organic/natural / Luxury/refined / Playful/toy-like
- Editorial/magazine / Brutalist/raw / Art deco/geometric

**Typography**: [Font pairing and rationale]
**Color Palette**: [5-7 HEX codes]
**Motion Strategy**: [Key animation moments]
```

After brief creation, confirm design direction with `AskUserQuestion`.

### 2. Implementation

- Production quality and functional
- Visually impactful and memorable
- Cohesive aesthetic vision

### 3. Build Verification (Required)

```bash
pnpm --filter {app-name} build
```

### 4. Review Checklist

- [ ] Typography is distinctive (not Inter, Roboto, Arial)
- [ ] Color palette is cohesive and intentional
- [ ] Motion/animation adds delight
- [ ] Layout has visual interest
- [ ] Build passes without errors

### 5. Report Generation

```bash
shirokuma-docs discussions create \
  --category Reports \
  --title "[Design] {component-name}" \
  --body-file report.md
```

## Design Guidelines

### Typography

**DO**: Distinctive display fonts, intentional sizing scale
**DON'T**: Inter, Roboto, Arial, system fonts

### Color & Theme

**DO**: Cohesive aesthetic, CSS variables, dominant color + sharp accent
**DON'T**: Purple gradient on white, muted even palette

### Motion & Animation

**DO**: High-impact moments, staggered reveals, surprising hover states
**DON'T**: Purposeless motion

### Spatial Composition

**DO**: Asymmetry, overlap, grid-breaking elements
**DON'T**: Predictable 12-column grid only

## Anti-Patterns

| Pattern | Alternative |
|---------|------------|
| Purple gradient on white | Bold color choices |
| Inter/Roboto everywhere | Distinctive font pairing |
| Centered card grid | Asymmetric layout |
| Generic icons | Custom icon set |

## Next Steps

When invoked directly (not via `working-on-issue` chain):

```
Design complete. Next step:
→ `/committing-on-issue` to stage and commit your changes
```

## Notes

- **Memorability is the top priority**
- **Build must pass**
- **Report Discussion is required**
- Do not start implementation without confirming aesthetic direction with user
