---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "__tests__/**/*"
  - "tests/**/*"
---

# テスト規約

## テスト構造

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

## モックパターン

### Server Action モック

```typescript
jest.mock("@/lib/actions/crud/projects", () => ({
  getProjects: jest.fn(),
  createProject: jest.fn(),
}))

const mockGetProjects = getProjects as jest.MockedFunction<typeof getProjects>
mockGetProjects.mockResolvedValue([{ id: "1", name: "Test" }])
```

### Auth モック

```typescript
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(() => Promise.resolve({
    user: { id: "user-1", email: "test@example.com" }
  }))
}))
```

## テストのスキップ

`.skip` 使用時は `@skip-reason` を追加：

```typescript
/**
 * @skip-reason External API dependency, mock not implemented
 */
it.skip("should do X", () => { })
```

## 検証

```bash
pnpm test
```
