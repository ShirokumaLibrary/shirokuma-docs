---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "__tests__/**/*"
  - "tests/**/*"
---

# Testing Conventions

## Test Structure

```typescript
describe("FeatureName", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should create with valid data", async () => {
    // Arrange
    // Act
    // Assert
  })
})
```

## Mock Patterns

### Server Action Mocks

```typescript
jest.mock("@/lib/actions/crud/projects", () => ({
  getProjects: jest.fn(),
  createProject: jest.fn(),
}))

const mockGetProjects = getProjects as jest.MockedFunction<typeof getProjects>
mockGetProjects.mockResolvedValue([{ id: "1", name: "Test" }])
```

### Auth Mocks

```typescript
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(() => Promise.resolve({
    user: { id: "user-1", email: "test@example.com" }
  }))
}))
```

## Skip Tests

Add `@skip-reason` when using `.skip`:

```typescript
/**
 * @skip-reason External API dependency, mock not implemented
 */
it.skip("should do X", () => { })
```

## Verification

```bash
pnpm test
```
