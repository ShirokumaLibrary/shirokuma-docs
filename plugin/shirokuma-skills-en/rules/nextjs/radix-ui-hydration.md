---
paths:
  - "components/**/*.tsx"
  - "**/components/**/*.tsx"
---

# Radix UI Hydration Pattern

## Problem

Radix UI generates unique IDs that differ between SSR and CSR, causing hydration mismatch.

Affected: DropdownMenu, Select, Dialog, Popover, Collapsible, Accordion, Tooltip.

## Solution: mounted state pattern

```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => { setMounted(true) }, [])

if (!mounted) return <PlaceholderWithoutRadixUI />
return <ComponentWithRadixUI />
```

## Rules

- Use `mounted` pattern for all Radix UI components in Client Components
- SSR placeholder must match the visual layout of the full component
- Prefer `useMounted()` hook if available (`hooks/use-mounted.ts`)
- Never use `suppressHydrationWarning` as a workaround
