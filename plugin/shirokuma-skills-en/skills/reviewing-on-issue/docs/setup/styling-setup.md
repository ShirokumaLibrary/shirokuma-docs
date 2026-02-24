# Styling Setup

Guide for setting up Tailwind CSS v4 with shadcn/ui.

## Prerequisites

- Next.js 16 app created (see [project-init.md](project-init.md))

## 1. Install Tailwind CSS v4

```bash
cd apps/admin
pnpm add tailwindcss @tailwindcss/postcss
```

### postcss.config.mjs

```javascript
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
export default config;
```

## 2. Configure globals.css (CSS-First)

Tailwind v4 uses CSS-first configuration (no tailwind.config.ts).

### app/globals.css

```css
@import "tailwindcss";

@custom-variant dark (&:is(.dark *));

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 45%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
  }
}

@theme inline {
  /* Sidebar dimensions - @theme inline avoids @property registration issues in production */
  --sidebar-width: 16rem;
  --sidebar-width-icon: 3rem;
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-card: hsl(var(--card));
  --color-card-foreground: hsl(var(--card-foreground));
  --color-popover: hsl(var(--popover));
  --color-popover-foreground: hsl(var(--popover-foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-destructive-foreground: hsl(var(--destructive-foreground));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

@layer base {
  * {
    border-color: hsl(var(--border));
  }
  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}
```

## 3. Initialize shadcn/ui

**IMPORTANT**: Use `@canary` for Tailwind v4 compatibility.

```bash
cd apps/admin
npx shadcn@canary init
```

Answer the prompts:
- Style: new-york
- Base color: neutral
- CSS variables: yes

### components.json (Generated)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

## 4. Add Components

```bash
# Add individual components
npx shadcn@canary add button card input label -y

# After adding, run the CSS variable fix script
./scripts/fix-tailwind-v4-css-vars.sh --yes apps/admin/components/ui
```

## 5. CSS Variable Fix Script

shadcn CLI generates v3 syntax (`[--var]`) which doesn't work in v4. This script converts to `[var(--var)]`.

### scripts/fix-tailwind-v4-css-vars.sh

```bash
#!/bin/bash

# Usage: ./scripts/fix-tailwind-v4-css-vars.sh [--yes] <directory>

AUTO_YES=false
if [ "$1" = "--yes" ]; then
  AUTO_YES=true
  shift
fi

TARGET_DIR="${1:-apps/admin/components/ui}"

if [ ! -d "$TARGET_DIR" ]; then
  echo "Directory not found: $TARGET_DIR"
  exit 1
fi

echo "Fixing CSS variables in: $TARGET_DIR"

# Find files with v3 syntax
FILES=$(grep -rl '\[--' "$TARGET_DIR" --include="*.tsx" --include="*.ts" 2>/dev/null)

if [ -z "$FILES" ]; then
  echo "No files need fixing."
  exit 0
fi

echo "Files to fix:"
echo "$FILES"

if [ "$AUTO_YES" = false ]; then
  read -p "Proceed? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Replace [--var] with [var(--var)]
for file in $FILES; do
  sed -i 's/\[--\([a-zA-Z0-9_-]*\)\]/[var(--\1)]/g' "$file"
  echo "Fixed: $file"
done

echo "Done!"
```

Make executable:

```bash
chmod +x scripts/fix-tailwind-v4-css-vars.sh
```

## 6. Utility Function

### lib/utils.ts

```typescript
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Install dependencies:

```bash
pnpm add clsx tailwind-merge class-variance-authority
```

## 7. Dark Mode Setup

### components/theme-provider.tsx

```typescript
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

### app/layout.tsx

```typescript
import { ThemeProvider } from "@/components/theme-provider"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

## CSS Variable Syntax (CRITICAL)

| v3 Syntax (Wrong) | v4 Syntax (Correct) |
|-------------------|---------------------|
| `w-[--sidebar-width]` | `w-[var(--sidebar-width)]` |
| `bg-[--custom-color]` | `bg-[var(--custom-color)]` |
| `h-10!` (important) | `h-10!` (same, suffix) |

## Browser Requirements

Tailwind v4 uses modern CSS features:
- Safari 16.4+ (`@property`, `color-mix()`)
- Chrome 111+
- Edge 111+
- Firefox 128+

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Styles not applied | v3 syntax | Run fix script |
| Sidebar overlap | CSS variables wrong | Run fix script |
| Dark mode flicker | Missing suppressHydrationWarning | Add to html tag |
| **本番のみCSS変数が効かない** | @property 登録 | `@theme inline` で定義 |

### @theme inline について

Tailwind v4 は本番ビルドで `@property` を使ってCSS変数を登録します。これにより、インラインスタイルからの継承が無効化される場合があります。

コンポーネント（例: shadcn/ui sidebar）がインラインスタイルでCSS変数を設定する場合、その変数を `@theme inline` で定義することで問題を回避できます。

```css
@theme inline {
  --sidebar-width: 16rem;  /* @property 登録を回避 */
}
```

## Next Steps

- [Infra Setup](infra-setup.md) - Docker and Nginx configuration
