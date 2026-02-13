---
name: frontend-designing
description: Creates distinctive, production-grade frontend interfaces. Use when "memorable design", "distinctive UI", "unique design", "landing page", avoiding generic look, or when creating unique visual aesthetics.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, WebFetch, WebSearch
---

# Frontend Designing Skill

Create distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics.

## When to Use

Automatically invoke when the user:
- Requests "memorable UI", "印象的なUI", "個性的なデザイン"
- Says "landing page", "ランディングページ"
- Mentions avoiding "generic look", "AIっぽくない"
- Wants custom styling, unique aesthetics

## Core Philosophy

> "Bold maximalism and refined minimalism both work - the key is intentionality, not intensity."

Every interface should be **memorable** and **purposeful**.

## Architecture

- `SKILL.md` - This file (core workflow)
- `reference/` - Tech patterns, font setup, animations
- `patterns/` - Layout patterns, color schemes
- `templates/` - Design report template

## Workflow

### 0. Tech Stack Check

**First**, read the project's `CLAUDE.md` to understand:
- Frontend framework (Next.js version, React version)
- Styling (Tailwind v3/v4, CSS Modules)
- Component library (shadcn/ui stable/canary)
- i18n setup (next-intl, messages structure)
- Any project-specific constraints

### 1. Design Discovery

Before writing code, understand and document:

```markdown
## Design Brief

**Purpose**: What problem does this interface solve? Who uses it?
**Context**: Technical constraints, existing design system, brand guidelines
**Differentiation**: What makes this UNFORGETTABLE?

## Aesthetic Direction

**Tone**: [Choose ONE and commit]
- Brutally minimal
- Maximalist chaos
- Retro-futuristic
- Organic/natural
- Luxury/refined
- Playful/toy-like
- Editorial/magazine
- Brutalist/raw
- Art deco/geometric
- Soft/pastel
- Industrial/utilitarian
- [Custom: describe]

**Typography**: [Font pairing with rationale]
**Color Palette**: [5-7 colors with hex codes]
**Motion Strategy**: [Key animation moments]
**Layout Approach**: [Grid, asymmetric, etc.]
```

After creating the brief, use `AskUserQuestion` to confirm the design direction before proceeding to implementation.

### 2. Implementation

Create working code that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with clear aesthetic point-of-view
- Meticulously refined in every detail

### 3. Build Verification (REQUIRED)

```bash
# Verify implementation compiles
pnpm --filter {app-name} build
```

### 4. Review Checklist

- [ ] Typography is distinctive (NOT Inter, Roboto, Arial)
- [ ] Color palette is cohesive and intentional
- [ ] Motion/animation adds delight
- [ ] Layout has visual interest
- [ ] No generic patterns copied
- [ ] Build passes without errors

### 5. Generate Report

**Create Discussion in Reports category:**

```bash
shirokuma-docs discussions create \
  --category Reports \
  --title "[Design] {component-name}" \
  --body "$(cat report.md)"
```

Report the Discussion URL to the user.

> See `rules/output-destinations.md` for output destination policy.

## Design Guidelines

### Typography

**DO**:
- Choose distinctive display fonts (Google Fonts, Fontsource)
- Pair display font with refined body font
- Use intentional sizing scale

**DON'T**:
- Use Inter, Roboto, Arial, system fonts
- Use same font for everything
- Ignore font loading strategy

**Examples**:
```css
/* Good: Distinctive pairing */
--font-display: 'Space Grotesk', sans-serif;
--font-body: 'DM Sans', sans-serif;

/* Bad: Generic */
--font-display: 'Inter', sans-serif;
```

### Color & Theme

**DO**:
- Commit to cohesive aesthetic
- Use CSS variables for consistency
- Dominant colors with sharp accents

**DON'T**:
- Purple gradients on white (overused)
- Timid, evenly-distributed palettes
- Random color choices

**Examples**:
```css
/* Bold: High contrast */
--color-bg: #0a0a0a;
--color-text: #fafafa;
--color-accent: #ff3e00;

/* Refined: Subtle warmth */
--color-bg: #faf8f5;
--color-text: #2d2a26;
--color-accent: #b8860b;
```

### Motion & Animation

**DO**:
- Focus on high-impact moments
- Orchestrated page load with staggered reveals
- Scroll-triggered and hover states that surprise
- CSS-first, libraries for complex sequences

**DON'T**:
- Scatter random micro-interactions
- Add motion without purpose
- Slow down user experience

### Spatial Composition

**DO**:
- Unexpected layouts
- Asymmetry, overlap, diagonal flow
- Grid-breaking elements
- Generous negative space OR controlled density

**DON'T**:
- Predictable 12-column grids only
- Everything centered
- Identical spacing everywhere

### Backgrounds & Atmosphere

**DO**:
- Create depth and atmosphere
- Gradient meshes, noise textures
- Geometric patterns, layered transparencies
- Dramatic shadows, decorative borders

**DON'T**:
- Solid white/gray backgrounds only
- Flat, lifeless surfaces
- Ignore visual context

## Tech Stack Constraints

| Item | Check | Impact |
|------|-------|--------|
| Tailwind version | v3 vs v4 | CSS syntax differs |
| shadcn/ui | stable vs canary | Component APIs |
| CSS variables | `@theme inline` | Required for v4 |
| i18n | next-intl | Text in messages files |
| Dark mode | ThemeProvider | Color scheme support |

## Anti-Patterns to Avoid

| Pattern | Why It's Bad | Alternative |
|---------|--------------|-------------|
| Purple gradient on white | Overused AI aesthetic | Bold color choices |
| Inter/Roboto everywhere | Generic, forgettable | Distinctive font pairing |
| Centered card grid | Predictable | Asymmetric layouts |
| Subtle gray borders | Bland | Dramatic shadows or no borders |
| Generic icons | Unmemorable | Custom or distinctive icon set |

## Output Format

```markdown
## Design Implementation

### Tech Stack Used
- Framework: [Next.js X, React X]
- Styling: [Tailwind vX + shadcn/ui]
- Fonts: [next/font setup]

### Design Direction
[Brief description of chosen aesthetic]

### Files Created/Modified
- `path/to/file.tsx` - [description]
- `app.css` - [theme customizations]
- `messages/{locale}/` - [i18n keys if applicable]

### Key Design Decisions
1. **Typography**: [fonts and why]
2. **Colors**: [palette, CSS variables used]
3. **Motion**: [animations, Tailwind or Framer Motion]
4. **Layout**: [approach and why]

### Build Verification
[Command to verify build passes]
```

## Next Steps

When invoked directly (not via `working-on-issue`), suggest the next workflow step after design:

```
Design complete. Next step:
→ `/committing-on-issue` to stage and commit your changes
```

## Notes

- **Memorable first**: Every design should be distinctive
- **Build must pass**: Always verify before completing
- **Report required**: Create Discussion in Reports category (see `rules/output-destinations.md`)
- **Check CLAUDE.md**: Understand project constraints first
- Use `TodoWrite` for progress tracking when implementing multiple components
- Do not start implementation without confirming the user's aesthetic direction

> "Claude is capable of extraordinary creative work. Don't hold back."
