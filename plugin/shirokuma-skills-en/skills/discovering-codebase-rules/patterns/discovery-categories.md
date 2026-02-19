# Discovery Categories

Categories of patterns to discover across TypeScript applications.

## 1. Structural Patterns

### File Naming

| Pattern | Grep Command | Rule Potential |
|---------|--------------|----------------|
| kebab-case files | `find . -name "*.ts" \| grep -E "[a-z]+-[a-z]+"` | naming-convention |
| PascalCase components | `find . -name "*.tsx" \| grep -E "^[A-Z]"` | component-naming |
| index.ts re-exports | `find . -name "index.ts"` | barrel-exports |

### Export Patterns

```bash
# Default vs named exports
grep -r "^export default" --include="*.ts" | wc -l
grep -r "^export function" --include="*.ts" | wc -l
grep -r "^export const" --include="*.ts" | wc -l
```

### Import Ordering

```bash
# Check import groups (react, next, lib, local)
grep -A10 "^import" --include="*.tsx" | head -50
```

## 2. Code Quality Patterns

### Error Handling

```bash
# try-catch usage
grep -rn "try {" --include="*.ts"

# Error logging
grep -rn "console.error" --include="*.ts"
grep -rn "logger.error" --include="*.ts"

# Error types
grep -rn "throw new Error" --include="*.ts"
grep -rn "throw new [A-Z].*Error" --include="*.ts"
```

### Async Patterns

```bash
# Async function declarations
grep -rn "async function" --include="*.ts"

# Promise handling
grep -rn "\.then(" --include="*.ts"
grep -rn "await " --include="*.ts"

# Promise.all usage
grep -rn "Promise.all" --include="*.ts"
```

### Type Safety

```bash
# any usage
grep -rn ": any" --include="*.ts"
grep -rn "as any" --include="*.ts"

# unknown usage
grep -rn ": unknown" --include="*.ts"

# Type assertions
grep -rn "as [A-Z]" --include="*.ts"
```

## 3. Framework Patterns

### Server Actions

```bash
# "use server" declarations
grep -rn '"use server"' --include="*.ts"

# Auth patterns
grep -rn "verifyAuth\|verifyAuthMutation" --include="*.ts"

# CSRF patterns
grep -rn "validateCSRF\|csrfProtect" --include="*.ts"

# Zod validation
grep -rn "\.parse(\|\.safeParse(" --include="*.ts"
```

### React Components

```bash
# Function components
grep -rn "^export function [A-Z]" --include="*.tsx"

# Props interfaces
grep -rn "interface.*Props" --include="*.tsx"

# Use of hooks
grep -rn "use[A-Z][a-zA-Z]*(" --include="*.tsx"
```

### i18n Patterns

```bash
# useTranslations usage
grep -rn "useTranslations" --include="*.tsx"

# t() calls
grep -rn "t\(['\"]" --include="*.tsx"

# Translation key format
grep -rn 't("' --include="*.tsx" | sed 's/.*t("//' | sed 's/".*//' | sort | uniq
```

## 4. Documentation Patterns

### JSDoc Coverage

```bash
# JSDoc blocks
grep -rn "/\*\*" --include="*.ts"

# @description tags
grep -rn "@description" --include="*.ts"

# @param tags
grep -rn "@param" --include="*.ts"

# @returns tags
grep -rn "@returns\|@return" --include="*.ts"
```

### Custom Annotations

```bash
# shirokuma-docs annotations
grep -rn "@screen\|@component\|@serverAction" --include="*.ts"
grep -rn "@usedComponents\|@usedActions" --include="*.ts"
grep -rn "@dbTables\|@feature" --include="*.ts"
```

### TODO/FIXME Tracking

```bash
# TODO comments
grep -rn "// TODO\|// FIXME" --include="*.ts"

# With assignee
grep -rn "// TODO(@" --include="*.ts"
```

## 5. Testing Patterns

### Test Structure

```bash
# describe blocks
grep -rn "describe(" --include="*.test.ts"

# it/test blocks
grep -rn "it(\|test(" --include="*.test.ts"

# @testdoc annotations
grep -rn "@testdoc" --include="*.test.ts"
```

### Mock Patterns

```bash
# jest.mock usage
grep -rn "jest.mock" --include="*.test.ts"

# vi.mock (Vitest)
grep -rn "vi.mock" --include="*.test.ts"
```

## Analysis Matrix

| Category | Admin | Public | Web | MCP | shirokuma |
|----------|-------|--------|-----|-----|-----------|
| Error handling | ? | ? | ? | ? | ? |
| Type safety | ? | ? | ? | ? | ? |
| JSDoc coverage | ? | ? | ? | ? | ? |
| Server Actions | ? | ? | ? | N/A | N/A |

Fill in counts during analysis to identify patterns and inconsistencies.
