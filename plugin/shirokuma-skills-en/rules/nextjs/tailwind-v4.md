---
paths:
  - "**/*.css"
  - "components/ui/**/*.tsx"
  - "**/components/ui/**/*.tsx"
---

# Tailwind CSS v4 + shadcn/ui

## CSS Variable Syntax

```tsx
// NG: Tailwind v3 syntax (broken in v4)
className="bg-[--sidebar-background]"

// OK: Tailwind v4 syntax
className="bg-[var(--sidebar-background)]"
```

After adding shadcn/ui components:
```bash
npx shadcn@canary add <component> -y
# Fix CSS variable syntax: [--var] → [var(--var)]
```

## Production-Only Issues

CSS variables may work in dev but break in production build.

Fix: Use `@theme inline` instead of `@property` or `:root`:
```css
@theme inline {
  --sidebar-width: 16rem;
  --sidebar-background: 0 0% 100%;
}
```

## Verification

```bash
grep -r "\[--" components/ui/  # Find v3 syntax
pnpm build  # Test production build
```
