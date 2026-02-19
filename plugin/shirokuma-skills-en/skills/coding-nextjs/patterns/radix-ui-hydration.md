# Radix UI Hydration Pattern (CRITICAL)

Quick reference for Radix UI hydration patterns.

---

## Problem

Radix UI components generate dynamic IDs that differ between SSR and client:

```
Error: Hydration failed because the server rendered HTML didn't match the client.
- Server: id="radix-:R1:"
- Client: id="radix-:R2:"
```

## Solution

Use `mounted` state pattern:

```typescript
"use client"

import { useState, useEffect } from "react"

export function MyComponent() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // SSR: Render placeholder WITHOUT Radix UI
  if (!mounted) {
    return <Button disabled><Icon /></Button>
  }

  // Client: Render full component WITH Radix UI
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button><Icon /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>Option 1</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

## Affected Components

- `DropdownMenu` / `Select` / `Collapsible`
- `Dialog` / `AlertDialog`
- `ModeToggle` (theme switcher)
- `LanguageSwitcher`
- Any Radix UI primitive that generates IDs

## Placeholder Requirements

1. **Match Visual Appearance**: Same as trigger button
2. **Disable Interaction**: Use `disabled` prop
3. **Preserve Accessibility**: Keep `sr-only` text

## Known Issue: React 19.2 / Next.js 15.5+ useId Change

React 19.2 changed the default prefix for `useId`, causing hydration mismatches in Radix UI components (Dialog, Popover, DropdownMenu, etc.) on Next.js 15.5.0 and later.

```
Error: Hydration failed
- Server: aria-controls="radix-:R15mkl:"
- Client: aria-controls="radix-:R9dl5:"
```

**Workarounds**:
- Downgrading to Next.js 15.4.7 has been reported to resolve the issue
- The `mounted` state pattern remains an effective workaround
- Radix UI fix status: [Issue #3700](https://github.com/radix-ui/primitives/issues/3700)
