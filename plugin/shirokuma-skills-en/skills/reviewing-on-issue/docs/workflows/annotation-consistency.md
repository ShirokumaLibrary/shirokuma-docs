# Annotation Consistency Verification Workflow

## Overview

JSDocアノテーションと実際のコードの整合性を検証するワークフロー。
手動確認が必要だった `@usedComponents`, `@usedActions`, `@dbTables` 等の検証を自動化。

---

## Verification Types

| Annotation | Source of Truth | Verification Method |
|------------|-----------------|---------------------|
| `@usedComponents` | import文 | Grep + AST解析 |
| `@usedActions` | import文 + 関数呼び出し | Grep + AST解析 |
| `@usedInScreen` | 親ファイルのimport | 逆方向検索 |
| `@usedInComponent` | 呼び出し元ファイル | 逆方向検索 |
| `@dbTables` | Drizzle ORM参照 | Grep (from句, join句) |
| `@route` | ファイルパス | ディレクトリ構造 |

---

## Workflow Steps

### Step 1: Extract Annotations

対象ファイルからJSDocを抽出し、アノテーション値をパース。

```typescript
// Example: nav-tags.tsx
/**
 * @usedComponents SidebarGroup, SidebarMenu, Badge
 */
// Parsed: ["SidebarGroup", "SidebarMenu", "Badge"]
```

### Step 2: Extract Actual Usage

実際のimport文・関数呼び出しを解析。

```typescript
// Actual imports in nav-tags.tsx
import { Badge } from "@/components/ui/badge"
import {
  SidebarGroup,
  SidebarGroupLabel,  // <- Missing in annotation!
  SidebarMenu,
  SidebarMenuButton,  // <- Missing in annotation!
  SidebarMenuItem,    // <- Missing in annotation!
} from "@/components/ui/sidebar"
// Parsed: ["Badge", "SidebarGroup", "SidebarGroupLabel", "SidebarMenu", "SidebarMenuButton", "SidebarMenuItem"]
```

### Step 3: Compare and Report

不一致を検出してレポート生成。

| Type | Description | Example |
|------|-------------|---------|
| `missing` | アノテーションにない | `SidebarGroupLabel` (imported but not in @usedComponents) |
| `extra` | 実際には使用されていない | `Foo` (in @usedComponents but not imported) |
| `typo` | スペルミスの可能性 | `SideBarGroup` vs `SidebarGroup` |

---

## Verification Commands

### Manual (using Grep)

```bash
# 1. Get annotation value
grep -A1 "@usedComponents" apps/public/components/nav-tags.tsx

# 2. Get actual imports (component pattern)
grep -E "^import.*from" apps/public/components/nav-tags.tsx | \
  grep -oE '\b[A-Z][a-zA-Z]+\b' | sort -u

# 3. Compare manually
```

### Automated (future shirokuma-docs command)

```bash
# Proposed command
shirokuma-docs lint-annotations -p . -c shirokuma-docs.config.yaml

# Output format
Annotation consistency check:
  nav-tags.tsx:
    @usedComponents:
      - MISSING: SidebarGroupLabel, SidebarMenuButton, SidebarMenuItem
      + annotation: SidebarGroup, SidebarMenu, Badge
      ✓ imports: Badge, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem
```

---

## Review Checklist

### @usedComponents

- [ ] All imported UI components are listed
- [ ] No extra components that aren't imported
- [ ] Order matches import order (optional)
- [ ] Includes shadcn/ui components
- [ ] Includes custom components

### @usedActions

- [ ] All imported Server Actions are listed
- [ ] Functions are actually called in component
- [ ] Includes dynamic imports (if any)

### @usedInScreen / @usedInComponent

- [ ] Component is actually imported in listed screens/components
- [ ] No stale references to removed screens
- [ ] Bidirectional consistency (A uses B ↔ B usedIn A)

### @dbTables

- [ ] All tables in FROM clause listed
- [ ] All tables in JOIN clause listed
- [ ] Subquery tables included
- [ ] relation() targets included

---

## Fix Patterns

### Pattern 1: Update Annotation to Match Imports

```typescript
// Before
/**
 * @usedComponents SidebarGroup, SidebarMenu
 */

// After (add all imported components)
/**
 * @usedComponents SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, Badge
 */
```

### Pattern 2: Remove Unused Import

```typescript
// Before
import { Unused } from "@/components/ui/unused"
/**
 * @usedComponents Used, Unused
 */

// After (remove from both)
// No import
/**
 * @usedComponents Used
 */
```

### Pattern 3: Add Missing Import

```typescript
// Before
/**
 * @usedComponents A, B, C  // C is listed but not imported
 */

// After (either add import or remove from annotation)
import { C } from "@/components/c"
/**
 * @usedComponents A, B, C
 */
```

---

## Integration with Reviewer Agent

### Trigger Keywords

- "annotation review", "アノテーションレビュー"
- "check usedComponents", "usedComponents確認"
- "verify annotations", "アノテーション検証"

### Role Assignment

Add to **code** role as sub-check:

```markdown
### Annotation Consistency (Sub-check)
- Load: workflows/annotation-consistency.md
- Check: @usedComponents, @usedActions, @dbTables
- Report: Mismatches and fixes
```

---

## Scope Definitions

### Components to Check

| Path Pattern | Annotation | Source of Truth |
|--------------|------------|-----------------|
| `components/*.tsx` | `@usedComponents` | Import statements |
| `app/**/page.tsx` | `@usedActions` | Import + function calls |
| `lib/actions/*.ts` | `@dbTables` | Drizzle query references |

### Exclusions

- `components/ui/**` (shadcn/ui - no custom annotations)
- `__tests__/**` (test files)
- `*.d.ts` (type definitions)

---

## Future: CLI Integration

### Proposed shirokuma-docs lint-annotations

```yaml
# shirokuma-docs.config.yaml
lintAnnotations:
  enabled: true
  rules:
    usedComponents-match:
      severity: warning
      checkOrder: false
    usedActions-match:
      severity: warning
    dbTables-match:
      severity: error
  exclude:
    - "components/ui/**"
```

### Output Formats

```bash
# Terminal (human-readable)
shirokuma-docs lint-annotations -f terminal

# JSON (machine-readable)
shirokuma-docs lint-annotations -f json -o /tmp/shirokuma-docs/annotations.json

# Fix mode (auto-update annotations)
shirokuma-docs lint-annotations --fix
```

---

## Related Files

- [shirokuma-docs-annotations.md](../patterns/shirokuma-docs-annotations.md) - Annotation reference
- [shirokuma-docs-verification.md](./shirokuma-docs-verification.md) - General verification workflow
- [code.md](../roles/code.md) - Code review role
