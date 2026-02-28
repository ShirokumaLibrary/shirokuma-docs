/**
 * discussions Command Tests
 *
 * Pure function tests for validateTitle/validateBody (static import)
 * and integration tests for discussionsCommand (ESM mock + dynamic import).
 *
 * @testdoc GitHub Discussions管理コマンドのテスト
 */

import { jest } from "@jest/globals";
import type { Logger } from "../../src/utils/logger.js";
import { createMockLogger } from "../helpers/command-test-utils.js";

// Static import for pure function tests (uses real implementations)
import {
  validateTitle,
  validateBody,
  MAX_TITLE_LENGTH,
  MAX_BODY_LENGTH,
} from "../../src/utils/github.js";

// =============================================================================
// Mocks (ESM: unstable_mockModule + dynamic import)
// =============================================================================

const mockRunGraphQL = jest.fn<(...args: any[]) => any>();
const mockResolveTargetRepo = jest.fn<(...args: any[]) => any>();
const mockValidateCrossRepoAlias = jest.fn<(...args: any[]) => any>();
const mockLoadGhConfig = jest.fn<(...args: any[]) => any>();
const mockGetDefaultCategory = jest.fn<(...args: any[]) => any>();
const mockGetDefaultLimit = jest.fn<(...args: any[]) => any>();
const mockFormatOutput = jest.fn<(...args: any[]) => any>();
const mockGetRepoId = jest.fn<(...args: any[]) => any>();
const mockStripDoubleQuotes = jest.fn<(...args: any[]) => any>();
const mockCreateLogger = jest.fn<(...args: any[]) => any>();
const mockValidateTitle = jest.fn<(...args: any[]) => any>();
const mockValidateBody = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule("../../src/utils/github.js", () => ({
  runGraphQL: mockRunGraphQL,
  getRepoInfo: jest.fn(),
  validateTitle: mockValidateTitle,
  validateBody: mockValidateBody,
}));

jest.unstable_mockModule("../../src/utils/repo-pairs.js", () => ({
  resolveTargetRepo: mockResolveTargetRepo,
  validateCrossRepoAlias: mockValidateCrossRepoAlias,
}));

jest.unstable_mockModule("../../src/utils/gh-config.js", () => ({
  loadGhConfig: mockLoadGhConfig,
  getDefaultCategory: mockGetDefaultCategory,
  getDefaultLimit: mockGetDefaultLimit,
}));

jest.unstable_mockModule("../../src/utils/formatters.js", () => ({
  formatOutput: mockFormatOutput,
  GH_DISCUSSIONS_LIST_COLUMNS: [],
}));

jest.unstable_mockModule("../../src/utils/graphql-queries.js", () => ({
  getRepoId: mockGetRepoId,
  GRAPHQL_MUTATION_CREATE_DISCUSSION: "mutation CreateDiscussion {}",
}));

jest.unstable_mockModule("../../src/utils/sanitize.js", () => ({
  stripDoubleQuotes: mockStripDoubleQuotes,
}));

jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  createLogger: mockCreateLogger,
}));

const { discussionsCommand } = await import("../../src/commands/discussions.js");

// =============================================================================
// Helpers
// =============================================================================

function mockGQLSuccess<T>(data: T) {
  return { success: true, data: { data } };
}

// =============================================================================
// Pure Function Tests
// =============================================================================

describe("discussions command validation", () => {
  describe("Title validation", () => {
    /**
     * @testdoc 有効なDiscussionタイトルを受け入れる
     */
    it("should accept valid discussion titles", () => {
      expect(validateTitle("Session Handover 2025-01-26")).toBeNull();
      expect(validateTitle("Question about feature implementation")).toBeNull();
      expect(validateTitle("a")).toBeNull();
    });

    /**
     * @testdoc [discussions] 空のタイトルを拒否する
     */
    it("should reject empty title", () => {
      expect(validateTitle("")).toBe("Title cannot be empty");
    });

    /**
     * @testdoc [discussions] 空白のみのタイトルを拒否する
     */
    it("should reject whitespace-only title", () => {
      expect(validateTitle("   ")).toBe("Title cannot be empty");
      expect(validateTitle("\t\n")).toBe("Title cannot be empty");
    });

    /**
     * @testdoc [discussions] 最大長のタイトルを受け入れる
     */
    it("should accept title at max length", () => {
      const title = "a".repeat(MAX_TITLE_LENGTH);
      expect(validateTitle(title)).toBeNull();
    });

    /**
     * @testdoc [discussions] 最大長を超えるタイトルを拒否する
     */
    it("should reject title exceeding max length", () => {
      const title = "a".repeat(MAX_TITLE_LENGTH + 1);
      const result = validateTitle(title);
      expect(result).toContain("Title too long");
      expect(result).toContain(`${MAX_TITLE_LENGTH}`);
    });

    /**
     * @testdoc セッションハンドオーバー形式のタイトルを受け入れる
     */
    it("should accept handover-style titles", () => {
      expect(validateTitle("[Handover] 2025-01-26 Session Summary")).toBeNull();
      expect(validateTitle("Handover: Feature implementation progress")).toBeNull();
      expect(validateTitle("Session #42 Handover Notes")).toBeNull();
    });
  });

  describe("Body validation", () => {
    /**
     * @testdoc [discussions] undefinedのボディを受け入れる
     */
    it("should accept undefined body", () => {
      expect(validateBody(undefined)).toBeNull();
    });

    /**
     * @testdoc [discussions] 空のボディを受け入れる
     */
    it("should accept empty body", () => {
      expect(validateBody("")).toBeNull();
    });

    /**
     * @testdoc 有効なDiscussionボディを受け入れる
     */
    it("should accept valid discussion body", () => {
      expect(validateBody("This is a discussion topic")).toBeNull();
      expect(validateBody("Multi\nline\nbody")).toBeNull();
    });

    /**
     * @testdoc [discussions] Markdown形式のボディを受け入れる
     */
    it("should accept markdown body", () => {
      const markdown = `## Session Summary

### Completed
- Task 1
- Task 2

### Notes
\`\`\`typescript
const session = await startSession();
\`\`\`
`;
      expect(validateBody(markdown)).toBeNull();
    });

    /**
     * @testdoc [discussions] 最大長のボディを受け入れる
     */
    it("should accept body at max length", () => {
      const body = "a".repeat(MAX_BODY_LENGTH);
      expect(validateBody(body)).toBeNull();
    });

    /**
     * @testdoc [discussions] 最大長を超えるボディを拒否する
     */
    it("should reject body exceeding max length", () => {
      const body = "a".repeat(MAX_BODY_LENGTH + 1);
      const result = validateBody(body);
      expect(result).toContain("Body too long");
      expect(result).toContain(`${MAX_BODY_LENGTH}`);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("discussionsCommand", () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let exitSpy: jest.SpiedFunction<typeof process.exit>;
  let mockLogger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = createMockLogger();
    mockCreateLogger.mockReturnValue(mockLogger);
    mockValidateTitle.mockReturnValue(null);
    mockValidateBody.mockReturnValue(null);
    mockValidateCrossRepoAlias.mockReturnValue(null);
    mockResolveTargetRepo.mockReturnValue({ owner: "o", name: "r" });
    mockLoadGhConfig.mockReturnValue({});
    mockGetDefaultCategory.mockReturnValue(null);
    mockGetDefaultLimit.mockReturnValue(20);
    mockFormatOutput.mockImplementation((data: unknown) => JSON.stringify(data, null, 2));
    mockStripDoubleQuotes.mockImplementation((s: string) => s);
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    exitSpy = jest.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  // ===========================================================================
  // categories action
  // ===========================================================================

  describe("categories action", () => {
    /**
     * @testdoc categories アクションがカテゴリ一覧を JSON 出力する
     */
    it("should output categories as JSON", async () => {
      mockRunGraphQL.mockResolvedValue(mockGQLSuccess({
        repository: {
          discussionCategories: {
            nodes: [
              { id: "DIC_1", name: "Handovers", description: "Session notes", emoji: ":handshake:", isAnswerable: false },
              { id: "DIC_2", name: "Q&A", description: "Questions", emoji: ":question:", isAnswerable: true },
            ],
          },
        },
      }));

      await discussionsCommand("categories", undefined, {});

      expect(exitSpy).not.toHaveBeenCalled();
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.repository).toBe("o/r");
      expect(output.categories).toHaveLength(2);
      expect(output.categories[0].name).toBe("Handovers");
      expect(output.categories[1].is_answerable).toBe(true);
      expect(output.total_count).toBe(2);
    });

    /**
     * @testdoc カテゴリが0件の場合に warn を出力する
     */
    it("should warn when no categories found", async () => {
      mockRunGraphQL.mockResolvedValue(mockGQLSuccess({
        repository: {
          discussionCategories: { nodes: [] },
        },
      }));

      await discussionsCommand("categories", undefined, {});

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("No discussion categories found")
      );
      expect(exitSpy).not.toHaveBeenCalled();
    });

    /**
     * @testdoc resolveTargetRepo が null で exit(1)
     */
    it("should exit(1) when repo is unavailable", async () => {
      mockResolveTargetRepo.mockReturnValue(null);

      await discussionsCommand("categories", undefined, {});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Could not determine repository")
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ===========================================================================
  // list action
  // ===========================================================================

  describe("list action", () => {
    /**
     * @testdoc list アクションが Discussion 一覧を出力する
     */
    it("should list discussions", async () => {
      mockRunGraphQL.mockResolvedValue(mockGQLSuccess({
        repository: {
          discussions: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                id: "D_1", number: 42, title: "Test Discussion",
                url: "https://github.com/o/r/discussions/42",
                createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-02T00:00:00Z",
                author: { login: "user1" }, category: { name: "Handovers" },
              },
            ],
          },
        },
      }));

      await discussionsCommand("list", undefined, {});

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          repository: "o/r",
          total_count: 1,
        }),
        "json",
        expect.any(Object)
      );
    });

    /**
     * @testdoc カテゴリが見つからない場合に exit(1)
     */
    it("should exit(1) when category not found", async () => {
      mockRunGraphQL
        .mockResolvedValueOnce(mockGQLSuccess({
          repository: { discussionCategories: { nodes: [] } },
        }))
        .mockResolvedValueOnce(mockGQLSuccess({
          repository: { discussionCategories: { nodes: [] } },
        }));

      await discussionsCommand("list", undefined, { category: "NonExistent" });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("'NonExistent' not found")
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ===========================================================================
  // get/show action
  // ===========================================================================

  describe("get/show action", () => {
    /**
     * @testdoc get アクションが Discussion 詳細を出力する
     */
    it("should get discussion by number", async () => {
      mockRunGraphQL.mockResolvedValue(mockGQLSuccess({
        repository: {
          discussion: {
            id: "D_1", number: 42, title: "Test Discussion",
            body: "Body content", url: "https://github.com/o/r/discussions/42",
            createdAt: "2025-01-01T00:00:00Z", updatedAt: "2025-01-02T00:00:00Z",
            author: { login: "user1" }, category: { name: "Handovers" },
          },
        },
      }));

      await discussionsCommand("get", "42", {});

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.objectContaining({ number: 42, title: "Test Discussion" }),
        "frontmatter"
      );
    });

    /**
     * @testdoc target 未指定で exit(1)
     */
    it("should exit(1) when target is missing", async () => {
      await discussionsCommand("get", undefined, {});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Discussion ID or number required")
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    /**
     * @testdoc Discussion が見つからない場合に exit(1)
     */
    it("should exit(1) when discussion not found", async () => {
      mockRunGraphQL.mockResolvedValue(mockGQLSuccess({
        repository: { discussion: null },
      }));

      await discussionsCommand("get", "999", {});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("'999' not found")
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    /**
     * @testdoc show アクションの usage メッセージに 'show' を表示 (#761)
     */
    it("should show usage message with 'show' action name", async () => {
      await discussionsCommand("show", undefined, {});

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining("discussions show")
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ===========================================================================
  // create action
  // ===========================================================================

  describe("create action", () => {
    /**
     * @testdoc create アクションで Discussion を作成する
     */
    it("should create a discussion", async () => {
      mockGetRepoId.mockResolvedValue("R_abc123");
      mockRunGraphQL
        .mockResolvedValueOnce(mockGQLSuccess({
          repository: {
            discussionCategories: {
              nodes: [{ id: "DIC_1", name: "Handovers", description: "", emoji: "", isAnswerable: false }],
            },
          },
        }))
        .mockResolvedValueOnce(mockGQLSuccess({
          createDiscussion: {
            discussion: { id: "D_new", number: 100, url: "https://github.com/o/r/discussions/100", title: "New Discussion" },
          },
        }));

      await discussionsCommand("create", undefined, {
        title: "New Discussion",
        bodyFile: "Discussion body",
        category: "Handovers",
      });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining("#100"));
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.number).toBe(100);
      expect(output.category).toBe("Handovers");
    });

    /**
     * @testdoc --title 未指定で exit(1)
     */
    it("should exit(1) when title is missing", async () => {
      await discussionsCommand("create", undefined, { bodyFile: "body", category: "Handovers" });

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("--title is required"));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    /**
     * @testdoc --body-file 未指定で exit(1)
     */
    it("should exit(1) when body is missing", async () => {
      await discussionsCommand("create", undefined, { title: "Title", category: "Handovers" });

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("--body-file is required"));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    /**
     * @testdoc --category 未指定（設定デフォルトなし）で exit(1)
     */
    it("should exit(1) when category is missing and no config default", async () => {
      await discussionsCommand("create", undefined, { title: "Title", bodyFile: "body" });

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("--category is required"));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    /**
     * @testdoc リポジトリ ID 取得失敗で exit(1)
     */
    it("should exit(1) when repo ID not available", async () => {
      mockGetRepoId.mockResolvedValue(null);

      await discussionsCommand("create", undefined, {
        title: "Title", bodyFile: "body", category: "Handovers",
      });

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Could not get repository ID"));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ===========================================================================
  // unknown action
  // ===========================================================================

  describe("unknown action", () => {
    /**
     * @testdoc 不明なアクションで exit(1)
     */
    it("should exit(1) for unknown action", async () => {
      await discussionsCommand("invalid", undefined, {});

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("Unknown action: invalid"));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
