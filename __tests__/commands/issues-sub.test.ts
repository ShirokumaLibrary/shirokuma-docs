/**
 * issues Sub-Issue Commands Tests
 *
 * Sub-Issue サブコマンド（sub-list, sub-add, sub-remove）のテスト。
 * ESM 環境のため jest.unstable_mockModule + dynamic import を使用。
 *
 * @testdoc Sub-Issue 関連サブコマンドのテスト（sub-list, sub-add, sub-remove）
 */

import { jest } from "@jest/globals";
import { createMockLogger, captureConsoleJson } from "../helpers/command-test-utils.js";
import type { Logger } from "../../src/utils/logger.js";

// =============================================================================
// Mocks (ESM: unstable_mockModule + dynamic import)
// =============================================================================

const mockRunGraphQL = jest.fn<(...args: any[]) => any>();
const mockIsIssueNumber = jest.fn<(v: string) => boolean>();
const mockParseIssueNumber = jest.fn<(v: string) => number>();
const mockResolveTargetRepo = jest.fn<(...args: any[]) => any>();
const mockGetOctokit = jest.fn<() => any>();

jest.unstable_mockModule("../../src/utils/github.js", () => ({
  runGraphQL: mockRunGraphQL,
  isIssueNumber: mockIsIssueNumber,
  parseIssueNumber: mockParseIssueNumber,
  getRepoInfo: jest.fn(),
  getOwner: jest.fn(),
  getRepoName: jest.fn(),
  validateTitle: jest.fn(),
  validateBody: jest.fn(),
  parseGitRemoteUrl: jest.fn(),
  readBodyFile: jest.fn(),
  checkGitHubAuth: jest.fn(),
  diagnoseRepoFailure: jest.fn(),
  MAX_TITLE_LENGTH: 256,
  MAX_BODY_LENGTH: 65536,
  ITEMS_PER_PAGE: 100,
  FIELDS_PER_PAGE: 20,
}));

jest.unstable_mockModule("../../src/utils/repo-pairs.js", () => ({
  resolveTargetRepo: mockResolveTargetRepo,
}));

jest.unstable_mockModule("../../src/utils/octokit-client.js", () => ({
  getOctokit: mockGetOctokit,
  resolveAuthToken: jest.fn(() => "test-token"),
  resetOctokit: jest.fn(),
  setOctokit: jest.fn(),
}));

// Dynamic import after mocks
const { cmdSubList, cmdSubAdd, cmdSubRemove, getIssueInternalId } =
  await import("../../src/commands/issues-sub.js");

// =============================================================================
// Helpers
// =============================================================================

/** isIssueNumber のデフォルト実装（テスト用） */
function setupDefaultValidation() {
  mockIsIssueNumber.mockImplementation((v: string) => /^#?\d+$/.test(v));
  mockParseIssueNumber.mockImplementation((v: string) =>
    parseInt(v.replace("#", ""), 10)
  );
}

function makeGraphQLSubIssuesResponse(
  parentNumber: number,
  parentTitle: string,
  subIssueNodes: any[],
  summary: { total: number; completed: number; percentCompleted: number }
) {
  return {
    success: true,
    data: {
      data: {
        repository: {
          issue: {
            number: parentNumber,
            title: parentTitle,
            subIssues: { totalCount: subIssueNodes.length, nodes: subIssueNodes },
            subIssuesSummary: summary,
          },
        },
      },
    },
  };
}

// =============================================================================
// cmdSubList
// =============================================================================

describe("cmdSubList", () => {
  let logger: Logger;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    setupDefaultValidation();
    mockResolveTargetRepo.mockReturnValue({ owner: "test-owner", name: "test-repo" });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  /**
   * @testdoc 無効な Issue 番号でエラーを返す
   * @purpose 入力バリデーション
   */
  it("should return 1 for invalid issue number", async () => {
    mockIsIssueNumber.mockReturnValue(false);

    const result = await cmdSubList("abc", {}, logger);

    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Invalid issue number"));
  });

  /**
   * @testdoc リポジトリ解決失敗でエラーを返す
   * @purpose resolveTargetRepo 失敗時のハンドリング
   */
  it("should return 1 when repo resolution fails", async () => {
    mockResolveTargetRepo.mockReturnValue(null);

    const result = await cmdSubList("958", {}, logger);

    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Could not determine repository"));
  });

  /**
   * @testdoc GraphQL 失敗時にエラーを返す
   * @purpose API 呼び出し失敗のハンドリング
   */
  it("should return 1 when GraphQL fails", async () => {
    mockRunGraphQL.mockResolvedValue({ success: false });

    const result = await cmdSubList("958", {}, logger);

    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("not found"));
  });

  /**
   * @testdoc 子 Issue 一覧を正しく JSON 出力する
   * @purpose 正常系: 出力に parent, sub_issues, summary が含まれる
   */
  it("should output JSON with parent, sub_issues, and summary", async () => {
    mockRunGraphQL.mockResolvedValue(
      makeGraphQLSubIssuesResponse(958, "octokit 移行", [
        {
          number: 952,
          title: "Issues コマンドの octokit 移行",
          url: "https://github.com/example/repo/issues/952",
          state: "OPEN",
          labels: { nodes: [{ name: "area:github" }] },
          projectItems: {
            nodes: [
              {
                id: "item-1",
                project: { title: "test-repo" },
                status: { name: "In Progress" },
                priority: { name: "Medium" },
                size: { name: "M" },
              },
            ],
          },
        },
      ], { total: 5, completed: 2, percentCompleted: 40 })
    );

    const result = await cmdSubList("958", {}, logger);
    const output = captureConsoleJson(consoleSpy);

    expect(result).toBe(0);
    expect(output).toEqual({
      parent: { number: 958, title: "octokit 移行" },
      sub_issues: [
        {
          number: 952,
          title: "Issues コマンドの octokit 移行",
          url: "https://github.com/example/repo/issues/952",
          state: "OPEN",
          labels: ["area:github"],
          status: "In Progress",
          priority: "Medium",
          size: "M",
        },
      ],
      summary: { total: 5, completed: 2, percent_completed: 40 },
    });
  });

  /**
   * @testdoc 子 Issue が 0 件の場合に空の配列を返す
   * @purpose エッジケース: サブ Issue なし
   */
  it("should output empty sub_issues when none exist", async () => {
    mockRunGraphQL.mockResolvedValue(
      makeGraphQLSubIssuesResponse(42, "Test issue", [], {
        total: 0,
        completed: 0,
        percentCompleted: 0,
      })
    );

    const result = await cmdSubList("42", {}, logger);
    const output = captureConsoleJson<any>(consoleSpy);

    expect(result).toBe(0);
    expect(output.sub_issues).toEqual([]);
    expect(output.summary.total).toBe(0);
  });

  /**
   * @testdoc Project フィールドが null の場合に null を返す
   * @purpose projectItems が空の子 Issue
   */
  it("should handle sub issues without project fields", async () => {
    mockRunGraphQL.mockResolvedValue(
      makeGraphQLSubIssuesResponse(958, "Parent", [
        {
          number: 100,
          title: "Orphan issue",
          url: "https://github.com/example/repo/issues/100",
          state: "OPEN",
          labels: { nodes: [] },
          projectItems: { nodes: [] },
        },
      ], { total: 1, completed: 0, percentCompleted: 0 })
    );

    const result = await cmdSubList("958", {}, logger);
    const output = captureConsoleJson<any>(consoleSpy);

    expect(result).toBe(0);
    expect(output.sub_issues[0].status).toBeNull();
    expect(output.sub_issues[0].priority).toBeNull();
    expect(output.sub_issues[0].size).toBeNull();
  });
});

// =============================================================================
// cmdSubAdd
// =============================================================================

describe("cmdSubAdd", () => {
  let logger: Logger;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;
  const mockOctokitRequest = jest.fn<(...args: any[]) => any>();
  const mockOctokitIssuesGet = jest.fn<(...args: any[]) => any>();

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    setupDefaultValidation();
    mockResolveTargetRepo.mockReturnValue({ owner: "test-owner", name: "test-repo" });
    mockGetOctokit.mockReturnValue({
      request: mockOctokitRequest,
      rest: { issues: { get: mockOctokitIssuesGet } },
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  /**
   * @testdoc 無効な親 Issue 番号でエラーを返す
   */
  it("should return 1 for invalid parent issue number", async () => {
    mockIsIssueNumber.mockReturnValue(false);

    const result = await cmdSubAdd("abc", "952", {}, logger);

    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Invalid parent issue number"));
  });

  /**
   * @testdoc 子 Issue 番号なしでエラーを返す
   */
  it("should return 1 when child issue number is missing", async () => {
    mockIsIssueNumber.mockImplementation((v: string) => v === "958");

    const result = await cmdSubAdd("958", undefined, {}, logger);

    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Child issue number is required"));
  });

  /**
   * @testdoc 正常に子 Issue を紐付けして JSON を出力する
   */
  it("should add sub-issue and output JSON on success", async () => {
    mockOctokitIssuesGet.mockResolvedValue({ data: { id: 12345 } });
    mockOctokitRequest.mockResolvedValue({});

    const result = await cmdSubAdd("958", "952", {}, logger);
    const output = captureConsoleJson<any>(consoleSpy);

    expect(result).toBe(0);
    expect(output).toEqual({ parent: 958, child: 952, added: true });
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining("Added #952"));
    expect(mockOctokitRequest).toHaveBeenCalledWith(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues",
      expect.objectContaining({
        owner: "test-owner",
        repo: "test-repo",
        issue_number: 958,
        sub_issue_id: 12345,
      })
    );
  });

  /**
   * @testdoc 内部 ID 取得失敗でエラーを返す
   */
  it("should return 1 when internal ID resolution fails", async () => {
    mockOctokitIssuesGet.mockRejectedValue(new Error("Not found"));

    const result = await cmdSubAdd("958", "952", {}, logger);

    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Could not resolve internal ID"));
  });

  /**
   * @testdoc 422 エラー時に親 Issue 上書きの案内を表示
   */
  it("should suggest --replace-parent on 422 error", async () => {
    mockOctokitIssuesGet.mockResolvedValue({ data: { id: 12345 } });
    mockOctokitRequest.mockRejectedValue(new Error("422 already has a parent"));

    const result = await cmdSubAdd("958", "952", {}, logger);

    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("--replace-parent"));
  });

  /**
   * @testdoc --replace-parent オプションが REST API に渡される
   */
  it("should pass replace_parent_issue when replaceParent is true", async () => {
    mockOctokitIssuesGet.mockResolvedValue({ data: { id: 12345 } });
    mockOctokitRequest.mockResolvedValue({});

    await cmdSubAdd("958", "952", { replaceParent: true }, logger);

    expect(mockOctokitRequest).toHaveBeenCalledWith(
      "POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues",
      expect.objectContaining({ replace_parent_issue: true })
    );
  });
});

// =============================================================================
// cmdSubRemove
// =============================================================================

describe("cmdSubRemove", () => {
  let logger: Logger;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;
  const mockOctokitRequest = jest.fn<(...args: any[]) => any>();
  const mockOctokitIssuesGet = jest.fn<(...args: any[]) => any>();

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    setupDefaultValidation();
    mockResolveTargetRepo.mockReturnValue({ owner: "test-owner", name: "test-repo" });
    mockGetOctokit.mockReturnValue({
      request: mockOctokitRequest,
      rest: { issues: { get: mockOctokitIssuesGet } },
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  /**
   * @testdoc 正常に子 Issue を解除して JSON を出力する
   */
  it("should remove sub-issue and output JSON on success", async () => {
    mockOctokitIssuesGet.mockResolvedValue({ data: { id: 12345 } });
    mockOctokitRequest.mockResolvedValue({});

    const result = await cmdSubRemove("958", "952", {}, logger);
    const output = captureConsoleJson<any>(consoleSpy);

    expect(result).toBe(0);
    expect(output).toEqual({ parent: 958, child: 952, removed: true });
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining("Removed #952"));
    expect(mockOctokitRequest).toHaveBeenCalledWith(
      "DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue",
      expect.objectContaining({
        owner: "test-owner",
        repo: "test-repo",
        issue_number: 958,
        sub_issue_id: 12345,
      })
    );
  });

  /**
   * @testdoc REST API エラー時にエラーメッセージを返す
   */
  it("should return 1 on API error", async () => {
    mockOctokitIssuesGet.mockResolvedValue({ data: { id: 12345 } });
    mockOctokitRequest.mockRejectedValue(new Error("Server error"));

    const result = await cmdSubRemove("958", "952", {}, logger);

    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Failed to remove"));
  });

  /**
   * @testdoc 無効な親 Issue 番号でエラーを返す
   */
  it("should return 1 for invalid parent issue number", async () => {
    mockIsIssueNumber.mockReturnValue(false);

    const result = await cmdSubRemove("abc", "952", {}, logger);

    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Invalid parent issue number"));
  });
});

// =============================================================================
// getIssueInternalId
// =============================================================================

describe("getIssueInternalId", () => {
  const mockOctokitIssuesGet = jest.fn<(...args: any[]) => any>();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetOctokit.mockReturnValue({
      rest: { issues: { get: mockOctokitIssuesGet } },
    });
  });

  /**
   * @testdoc 正常時に Issue の内部 ID を返す
   */
  it("should return internal ID on success", async () => {
    mockOctokitIssuesGet.mockResolvedValue({ data: { id: 12345 } });

    const result = await getIssueInternalId("owner", "repo", 42);

    expect(result).toBe(12345);
    expect(mockOctokitIssuesGet).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      issue_number: 42,
    });
  });

  /**
   * @testdoc API エラー時に null を返す
   */
  it("should return null on error", async () => {
    mockOctokitIssuesGet.mockRejectedValue(new Error("Not found"));

    const result = await getIssueInternalId("owner", "repo", 999);

    expect(result).toBeNull();
  });
});
