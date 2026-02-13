---
paths:
  - "lib/**/*.ts"
  - "lib/**/*.tsx"
  - "**/lib/**/*.ts"
  - "**/lib/**/*.tsx"
---

# lib/ Directory Structure Rules

## Required Structure

```
lib/
├── actions/           # Server Actions
│   ├── crud/          # Single-table CRUD
│   └── domain/        # Multi-table business logic
├── auth/              # Authentication
├── context/           # React Context
├── hooks/             # Custom hooks
├── utils/             # Utility functions
└── validations/       # Zod schemas
```

## Critical Rules

1. **No files directly in lib/**
   ```
   lib/auth/index.ts  ← OK
   lib/auth.ts        ← NG
   ```

2. **Use index.ts for re-export**
   ```typescript
   export { auth } from "./config"
   export { verifyAdmin } from "./utils"
   ```

3. **Avoid `export *`**
   - Causes name collision build errors
   - Use explicit re-exports

## Server Actions Structure

| Directory | Type | Characteristics |
|-----------|------|-----------------|
| `lib/actions/crud/` | CRUD | Single table, standard operations |
| `lib/actions/domain/` | Domain | Multiple tables, business workflows |
