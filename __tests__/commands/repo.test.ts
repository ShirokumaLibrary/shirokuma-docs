/**
 * repo Command Tests
 *
 * Tests for GitHub Repository management command.
 * ESM 環境のため jest.unstable_mockModule + dynamic import を使用。
 *
 * @testdoc GitHub Repository管理コマンドのテスト
 */

import { jest } from "@jest/globals";
import type { Logger } from "../../src/utils/logger.js";
import { createMockLogger } from "../helpers/command-test-utils.js";

// =============================================================================
// Mocks (ESM: unstable_mockModule + dynamic import)
// =============================================================================

const mockRunGraphQL = jest.fn<(...args: any[]) => any>();
const mockGetRepoInfo = jest.fn<(...args: any[]) => any>();
const mockGetRepoId = jest.fn<(...args: any[]) => any>();
const mockCreateLogger = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule("../../src/utils/github.js", () => ({
  runGraphQL: mockRunGraphQL,
  getRepoInfo: mockGetRepoInfo,
}));

jest.unstable_mockModule("../../src/utils/graphql-queries.js", () => ({
  GRAPHQL_MUTATION_CREATE_LABEL: "mutation CreateLabel {}",
  getRepoId: mockGetRepoId,
}));

jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  createLogger: mockCreateLogger,
}));

const { repoCommand } = await import("../../src/commands/repo.js");

// =============================================================================
// Helpers
// =============================================================================

function mockGraphQLSuccess<T>(data: T) {
  return { success: true, data: { data } };
}

function mockGraphQLFailure() {
  return { success: false, data: null };
}

// =============================================================================
// Tests
// =============================================================================

describe("repoCommand", () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let exitSpy: jest.SpiedFunction<typeof process.exit>;
  let mockLogger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = createMockLogger();
    mockCreateLogger.mockReturnValue(mockLogger);
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    exitSpy = jest.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  // ===========================================================================
  // info subcommand
  // ===========================================================================

  describe("info action", () => {
    /**
     * @testdoc info アクションがリポジトリ情報を JSON 出力する
     */
    it("should output repository info as JSON", async () => {
      mockGetRepoInfo.mockReturnValue({ owner: "test-owner", name: "test-repo" });
      mockRunGraphQL.mockResolvedValue(mockGraphQLSuccess({
        repository: {
          owner: { login: "test-owner" },
          name: "test-repo",
          nameWithOwner: "test-owner/test-repo",
          description: "A test repository",
          url: "https://github.com/test-owner/test-repo",
          defaultBranchRef: { name: "main" },
          visibility: "PRIVATE",
          isPrivate: true,
          isFork: false,
          stargazerCount: 42,
          forkCount: 5,
          issues: { totalCount: 3 },
          hasIssuesEnabled: true,
          hasProjectsEnabled: true,
          hasDiscussionsEnabled: true,
          hasWikiEnabled: false,
          createdAt: "2025-01-01T00:00:00Z",
          updatedAt: "2025-06-01T00:00:00Z",
          pushedAt: "2025-06-15T00:00:00Z",
        },
      }));

      await repoCommand("info", {});

      expect(exitSpy).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledTimes(1);

      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.owner).toBe("test-owner");
      expect(output.name).toBe("test-repo");
      expect(output.full_name).toBe("test-owner/test-repo");
      expect(output.visibility).toBe("PRIVATE");
      expect(output.stargazers_count).toBe(42);
      expect(output.features.has_discussions).toBe(true);
      expect(output.features.has_wiki).toBe(false);
    });

    /**
     * @testdoc getRepoInfo が null を返すと exit(1)
     */
    it("should exit(1) when getRepoInfo returns null", async () => {
      mockGetRepoInfo.mockReturnValue(null);

      await repoCommand("info", {});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Could not determine repository")
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    /**
     * @testdoc GraphQL が失敗すると exit(1)
     */
    it("should exit(1) when GraphQL fails", async () => {
      mockGetRepoInfo.mockReturnValue({ owner: "o", name: "r" });
      mockRunGraphQL.mockResolvedValue(mockGraphQLFailure());

      await repoCommand("info", {});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to get repository information")
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ===========================================================================
  // labels subcommand - list
  // ===========================================================================

  describe("labels list action", () => {
    /**
     * @testdoc labels アクションがラベル一覧を JSON 出力する
     */
    it("should list labels as JSON", async () => {
      mockGetRepoInfo.mockReturnValue({ owner: "o", name: "r" });
      mockRunGraphQL.mockResolvedValue(mockGraphQLSuccess({
        repository: {
          labels: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              { id: "LA_1", name: "bug", color: "d73a4a", description: "Something broken" },
              { id: "LA_2", name: "enhancement", color: "a2eeef", description: "New feature" },
            ],
          },
        },
      }));

      await repoCommand("labels", {});

      expect(exitSpy).not.toHaveBeenCalled();
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.repository).toBe("o/r");
      expect(output.labels).toHaveLength(2);
      expect(output.labels[0].name).toBe("bug");
      expect(output.labels[0].color).toBe("#d73a4a");
      expect(output.total_count).toBe(2);
    });

    /**
     * @testdoc ページネーションで全ラベルを取得する
     */
    it("should paginate through all labels", async () => {
      mockGetRepoInfo.mockReturnValue({ owner: "o", name: "r" });
      mockRunGraphQL
        .mockResolvedValueOnce(mockGraphQLSuccess({
          repository: {
            labels: {
              pageInfo: { hasNextPage: true, endCursor: "cursor1" },
              nodes: [{ id: "LA_1", name: "bug", color: "d73a4a", description: "" }],
            },
          },
        }))
        .mockResolvedValueOnce(mockGraphQLSuccess({
          repository: {
            labels: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [{ id: "LA_2", name: "feat", color: "00ff00", description: "" }],
            },
          },
        }));

      await repoCommand("labels", {});

      expect(mockRunGraphQL).toHaveBeenCalledTimes(2);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.labels).toHaveLength(2);
      expect(output.total_count).toBe(2);
    });
  });

  // ===========================================================================
  // labels subcommand - create
  // ===========================================================================

  describe("labels create action", () => {
    /**
     * @testdoc --create でラベルを作成する
     */
    it("should create a label with --create option", async () => {
      mockGetRepoInfo.mockReturnValue({ owner: "o", name: "r" });
      mockGetRepoId.mockResolvedValue("R_abc123");
      mockRunGraphQL.mockResolvedValue(mockGraphQLSuccess({
        createLabel: {
          label: { id: "LA_new", name: "priority:high", color: "d73a4a", description: "High priority" },
        },
      }));

      await repoCommand("labels", { create: "priority:high", color: "d73a4a", description: "High priority" });

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockLogger.success).toHaveBeenCalledWith(expect.stringContaining("priority:high"));
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.name).toBe("priority:high");
    });

    /**
     * @testdoc # 付きカラーコードが正規化される
     */
    it("should normalize color with hash prefix", async () => {
      mockGetRepoInfo.mockReturnValue({ owner: "o", name: "r" });
      mockGetRepoId.mockResolvedValue("R_abc123");
      mockRunGraphQL.mockResolvedValue(mockGraphQLSuccess({
        createLabel: {
          label: { id: "LA_new", name: "test", color: "ff0000", description: "" },
        },
      }));

      await repoCommand("labels", { create: "test", color: "#ff0000" });

      expect(mockRunGraphQL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ color: "ff0000" })
      );
    });

    /**
     * @testdoc 無効なカラーコードで exit(1)
     */
    it("should exit(1) for invalid color format", async () => {
      mockGetRepoInfo.mockReturnValue({ owner: "o", name: "r" });
      mockGetRepoId.mockResolvedValue("R_abc123");

      await repoCommand("labels", { create: "test", color: "gggggg" });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Invalid color")
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    /**
     * @testdoc リポジトリ ID 取得失敗で exit(1)
     */
    it("should exit(1) when getRepoId returns null", async () => {
      mockGetRepoInfo.mockReturnValue({ owner: "o", name: "r" });
      mockGetRepoId.mockResolvedValue(null);

      await repoCommand("labels", { create: "test" });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Could not get repository ID")
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    /**
     * @testdoc カラー未指定時にデフォルト "ededed" が使用される
     */
    it("should use default color 'ededed' when not specified", async () => {
      mockGetRepoInfo.mockReturnValue({ owner: "o", name: "r" });
      mockGetRepoId.mockResolvedValue("R_abc123");
      mockRunGraphQL.mockResolvedValue(mockGraphQLSuccess({
        createLabel: {
          label: { id: "LA_new", name: "test", color: "ededed", description: "" },
        },
      }));

      await repoCommand("labels", { create: "test" });

      expect(mockRunGraphQL).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ color: "ededed" })
      );
    });
  });

  // ===========================================================================
  // Unknown action
  // ===========================================================================

  describe("unknown action", () => {
    /**
     * @testdoc 不明なアクションで exit(1)
     */
    it("should exit(1) for unknown action", async () => {
      await repoCommand("invalid", {});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Unknown action: invalid")
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
