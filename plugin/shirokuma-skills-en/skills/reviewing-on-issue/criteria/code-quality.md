# Code Quality Review Criteria

## TypeScript

### Required Practices

- [ ] Use `unknown` instead of `any`
- [ ] Provide explicit return types for public APIs
- [ ] Use type guards for runtime type checking
- [ ] Enable strict mode in tsconfig.json
- [ ] No type assertions (`as`) without justification

### Example

```typescript
// Bad
function parse(data: any): any {
  return data.items
}

// Good
function parse(data: unknown): Item[] {
  if (!isValidData(data)) {
    throw new Error("Invalid data format")
  }
  return data.items
}

function isValidData(data: unknown): data is { items: Item[] } {
  return typeof data === "object" && data !== null && "items" in data
}
```

## Error Handling

### Required Practices

- [ ] No empty catch blocks
- [ ] Include context in error messages
- [ ] Use custom error classes for different error types
- [ ] Log errors with appropriate severity levels
- [ ] Never expose internal error details to users

### Example

```typescript
// Bad
try {
  await saveData()
} catch {
  // empty
}

// Good
try {
  await saveData()
} catch (error) {
  console.error("Failed to save data:", { error, userId, action: "save" })
  return { success: false, error: "Operation failed" }
}
```

## Async Patterns

### Required Practices

- [ ] Use `Promise.all()` for parallel operations
- [ ] Use `Promise.allSettled()` when partial failures are acceptable
- [ ] Don't mix async/await with `.then()` chains
- [ ] Handle Promise rejections properly

### Example

```typescript
// Bad: Sequential when parallel is possible
const user = await getUser(id)
const posts = await getPosts(id)
const comments = await getComments(id)

// Good: Parallel fetching
const [user, posts, comments] = await Promise.all([
  getUser(id),
  getPosts(id),
  getComments(id),
])
```

## Code Style

### Required Practices

- [ ] Functions should be small and focused (single responsibility)
- [ ] Maximum 3 levels of nesting
- [ ] Descriptive variable names (avoid abbreviations)
- [ ] Consistent naming: camelCase for variables, PascalCase for components

### Naming Guidelines

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userName`, `postCount` |
| Functions | camelCase | `getUserById`, `createPost` |
| Components | PascalCase | `UserProfile`, `PostList` |
| Constants | UPPER_SNAKE | `MAX_RETRIES`, `API_URL` |
| Types/Interfaces | PascalCase | `UserData`, `PostInput` |

## Code Smells

### Must Fix

1. **God Objects**: Classes/modules doing too much
2. **Magic Numbers**: Hardcoded values without explanation
3. **Dead Code**: Unused functions, imports, variables
4. **Duplicate Code**: Same logic in multiple places
5. **Long Parameter Lists**: More than 3-4 parameters
6. **Feature Envy**: Methods using another class's data excessively

### Example Fixes

```typescript
// Bad: Magic number
if (password.length < 8) { ... }

// Good: Named constant
const MIN_PASSWORD_LENGTH = 8
if (password.length < MIN_PASSWORD_LENGTH) { ... }

// Bad: Long parameter list
function createUser(name, email, password, role, department, manager, startDate) { ... }

// Good: Object parameter
function createUser(params: CreateUserParams) { ... }
```

## Function Design

### Guidelines

- **Single Responsibility**: One function, one purpose
- **Pure Functions**: Prefer functions without side effects
- **Early Returns**: Return early for invalid cases
- **Max Parameters**: 3 for functions, use object for more

### Example

```typescript
// Bad: Multiple responsibilities
function processUser(user: User) {
  // Validate
  if (!user.email) throw new Error("No email")
  // Transform
  user.name = user.name.trim()
  // Save
  await db.insert(users).values(user)
  // Notify
  await sendEmail(user.email, "Welcome!")
}

// Good: Single responsibility
function validateUser(user: User): void { ... }
function normalizeUser(user: User): User { ... }
function saveUser(user: User): Promise<User> { ... }
function notifyUser(user: User): Promise<void> { ... }

async function createUser(input: CreateUserInput): Promise<User> {
  validateUser(input)
  const normalized = normalizeUser(input)
  const user = await saveUser(normalized)
  await notifyUser(user)
  return user
}
```

## Import Organization

### Order

1. External packages (react, next, etc.)
2. Internal packages (@repo/database)
3. Local absolute imports (@/lib, @/components)
4. Relative imports (./utils, ../types)

### Example

```typescript
// External
import { useState } from "react"
import { z } from "zod"

// Internal packages
import { db, posts } from "@repo/database"

// Local absolute
import { auth } from "@/lib/auth"
import { Button } from "@/components/ui/button"

// Relative
import { formatDate } from "./utils"
import type { PostFormProps } from "./types"
```

## Comments

### When to Use

- Complex business logic
- Non-obvious workarounds
- TODO with issue reference
- Public API documentation

### When NOT to Use

- Obvious code
- Commented-out code
- Redundant descriptions

```typescript
// Bad: Obvious comment
// Loop through users
for (const user of users) { ... }

// Good: Explain WHY
// Skip inactive users to avoid sending emails to abandoned accounts
const activeUsers = users.filter(u => u.lastLoginAt > thirtyDaysAgo)
```

## Documentation Quality

### Required Practices

- [ ] Public functions have JSDoc comments
- [ ] All parameters documented with `@param`
- [ ] Return values documented with `@returns`
- [ ] Complex functions have `@example` with code block
- [ ] Related functions linked with `@see`
- [ ] Error conditions documented with `@throws`
- [ ] Functions grouped with `@category` for TypeDoc
- [ ] Internal functions marked with `@internal`
- [ ] Types and interfaces have property-level documentation

### JSDoc Completeness

| Function Type | Required Tags |
|---------------|---------------|
| Public Server Action | `@param`, `@returns`, `@example`, `@category` |
| Public Getter | `@returns`, `@example`, `@category` |
| Internal Helper | `@internal` |
| Type/Interface | `@example`, `@category`, property comments |

### Example: Well-Documented Function

```typescript
/**
 * ページネーション付きで投稿を取得
 *
 * 管理画面の投稿一覧ページで使用。指定したページの投稿と
 * ページネーション情報を返します。
 *
 * @param page - ページ番号（1から開始、デフォルト: 1）
 * @param pageSize - 1ページあたりの表示件数（デフォルト: 10）
 * @returns ページネーション結果
 *
 * @example
 * ```typescript
 * const result = await getPaginatedPosts(1, 10)
 * console.log(`${result.total}件中 ${result.items.length}件を表示`)
 * ```
 *
 * @see {@link getPosts} - 全件取得する場合
 *
 * @category 投稿取得
 */
export async function getPaginatedPosts(
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResult<Post>> {
  // implementation
}
```

### Example: Poorly-Documented Function

```typescript
// BAD: Missing all required tags
/**
 * Get posts
 */
export async function getPosts() {
  // implementation
}
```

### Review Criteria

1. **Completeness**: All public APIs have JSDoc
2. **Accuracy**: Documentation matches actual behavior
3. **Examples**: Realistic, working code examples
4. **Cross-references**: Related functions linked with @see
5. **Categories**: Consistent TypeDoc categorization

### See Also

- `patterns/jsdoc.md` - Full JSDoc patterns and tag reference
