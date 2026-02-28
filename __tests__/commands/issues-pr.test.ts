/**
 * issues PR Commands Tests
 *
 * PR 関連サブコマンドのテスト。
 * 純粋関数テスト + jest.unstable_mockModule による統合テスト。
 *
 * @testdoc PR 関連サブコマンドのテスト（pr-comments, merge, pr-reply, resolve, pr-list, pr-show, pr-create）
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
const mockValidateBody = jest.fn<(v: string | undefined) => string | null>();
const mockResolveTargetRepo = jest.fn<(...args: any[]) => any>();
const mockGetOctokit = jest.fn<() => any>();
const mockFormatOutput = jest.fn<(...args: any[]) => string>();
const mockResolveAndUpdateStatus = jest.fn<(...args: any[]) => any>();
const mockGetCurrentBranch = jest.fn<() => string | null>();
const mockExecFileAsync = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule("../../src/utils/github.js", () => ({
  runGraphQL: mockRunGraphQL,
  isIssueNumber: mockIsIssueNumber,
  parseIssueNumber: mockParseIssueNumber,
  validateBody: mockValidateBody,
  getRepoInfo: jest.fn(),
  getOwner: jest.fn(),
  getRepoName: jest.fn(),
  validateTitle: jest.fn(),
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

jest.unstable_mockModule("../../src/utils/formatters.js", () => ({
  formatOutput: mockFormatOutput,
  OutputFormat: {},
  GH_PR_LIST_COLUMNS: ["number", "title", "state", "head_branch", "base_branch", "author", "review_decision", "url"],
}));

jest.unstable_mockModule("../../src/utils/issue-detail.js", () => ({
  resolveAndUpdateStatus: mockResolveAndUpdateStatus,
}));

jest.unstable_mockModule("../../src/utils/git-local.js", () => ({
  getCurrentBranch: mockGetCurrentBranch,
}));

jest.unstable_mockModule("../../src/utils/spawn-async.js", () => ({
  execFileAsync: mockExecFileAsync,
  spawnAsync: jest.fn(),
}));

// Dynamic import after mocks
const {
  validateMergeMethod,
  parseMergeMethod,
  parseLinkedIssues,
  detectLinkPattern,
  parsePrStateFilter,
  cmdPrComments,
  cmdMerge,
  cmdPrReply,
  cmdResolve,
  resolvePrFromHead,
  fetchOpenPRs,
  cmdPrList,
  cmdPrShow,
  cmdPrCreate,
} = await import("../../src/commands/issues-pr.js");

// =============================================================================
// Helpers
// =============================================================================

function setupDefaultValidation() {
  mockIsIssueNumber.mockImplementation((v: string) => /^#?\d+$/.test(v));
  mockParseIssueNumber.mockImplementation((v: string) =>
    parseInt(v.replace("#", ""), 10)
  );
  mockValidateBody.mockReturnValue(null);
  mockResolveTargetRepo.mockReturnValue({ owner: "test-owner", name: "test-repo" });
}

// =============================================================================
// Pure function tests (preserved from original)
// =============================================================================

describe("parseMergeMethod", () => {
  it("should default to squash", () => {
    expect(parseMergeMethod({})).toBe("squash");
  });

  it("should select squash when --squash is specified", () => {
    expect(parseMergeMethod({ squash: true })).toBe("squash");
  });

  it("should select merge when --merge is specified", () => {
    expect(parseMergeMethod({ merge: true })).toBe("merge");
  });

  it("should select rebase when --rebase is specified", () => {
    expect(parseMergeMethod({ rebase: true })).toBe("rebase");
  });
});

describe("validateMergeMethod", () => {
  it("should reject multiple merge methods", () => {
    expect(validateMergeMethod({ squash: true, merge: true })).not.toBeNull();
  });

  it("should reject all three merge methods", () => {
    expect(validateMergeMethod({ squash: true, merge: true, rebase: true })).not.toBeNull();
  });

  it("should accept single merge method", () => {
    expect(validateMergeMethod({ squash: true })).toBeNull();
    expect(validateMergeMethod({ merge: true })).toBeNull();
    expect(validateMergeMethod({ rebase: true })).toBeNull();
    expect(validateMergeMethod({})).toBeNull();
  });
});

describe("parseLinkedIssues", () => {
  it("should parse Closes #N", () => {
    expect(parseLinkedIssues("Fix the bug\n\nCloses #39")).toContain(39);
  });

  it("should parse Fixes #N", () => {
    const linked = parseLinkedIssues("Fixes #44\nFixes #45");
    expect(linked).toContain(44);
    expect(linked).toContain(45);
  });

  it("should parse Resolves #N", () => {
    expect(parseLinkedIssues("Resolves #47")).toContain(47);
  });

  it("should parse multiple linked issues with mixed keywords", () => {
    const linked = parseLinkedIssues("Closes #39\nFixes #44\nResolves #47");
    expect(linked).toHaveLength(3);
    expect(linked).toEqual(expect.arrayContaining([39, 44, 47]));
  });

  it("should return empty array when no linked issues", () => {
    expect(parseLinkedIssues("Simple PR description.")).toEqual([]);
  });

  it("should be case-insensitive", () => {
    expect(parseLinkedIssues("closes #1\nCLOSES #2\nCloses #3")).toHaveLength(3);
  });

  it("should deduplicate issue numbers", () => {
    const linked = parseLinkedIssues("Closes #39\nFixes #39");
    expect(linked).toHaveLength(1);
  });

  it("should handle undefined body", () => {
    expect(parseLinkedIssues(undefined)).toEqual([]);
    expect(parseLinkedIssues("")).toEqual([]);
  });
});

describe("detectLinkPattern", () => {
  it("should return 1:1 when no linked issues", () => {
    expect(detectLinkPattern([], new Map())).toBe("1:1");
  });

  it("should return 1:1 for single PR and single issue", () => {
    expect(detectLinkPattern([42], new Map([[42, [100]]]))).toBe("1:1");
  });

  it("should return 1:N for single PR with multiple issues", () => {
    expect(detectLinkPattern([42, 43], new Map([[42, [100]], [43, [100]]]))).toBe("1:N");
  });

  it("should return N:1 for multiple PRs with single issue", () => {
    expect(detectLinkPattern([42], new Map([[42, [100, 101]]]))).toBe("N:1");
  });

  it("should return N:N for multiple PRs with multiple issues", () => {
    expect(detectLinkPattern([42, 43], new Map([[42, [100, 101]], [43, [100]]]))).toBe("N:N");
  });

  it("should return 1:N when all issues reference only the same PR", () => {
    expect(detectLinkPattern([42, 43, 44], new Map([[42, [100]], [43, [100]], [44, [100]]]))).toBe("1:N");
  });

  it("should return N:N for cross-linked PRs and issues", () => {
    expect(detectLinkPattern([42, 43], new Map([[42, [100]], [43, [101]]]))).toBe("N:N");
  });
});

describe("parsePrStateFilter", () => {
  it("should convert 'open' to ['OPEN']", () => {
    expect(parsePrStateFilter("open")).toEqual(["OPEN"]);
  });

  it("should convert 'closed' to ['CLOSED']", () => {
    expect(parsePrStateFilter("closed")).toEqual(["CLOSED"]);
  });

  it("should convert 'merged' to ['MERGED']", () => {
    expect(parsePrStateFilter("merged")).toEqual(["MERGED"]);
  });

  it("should convert 'all' to all states", () => {
    const result = parsePrStateFilter("all");
    expect(result).toEqual(expect.arrayContaining(["OPEN", "CLOSED", "MERGED"]));
    expect(result).toHaveLength(3);
  });

  it("should be case-insensitive", () => {
    expect(parsePrStateFilter("OPEN")).toEqual(["OPEN"]);
    expect(parsePrStateFilter("Closed")).toEqual(["CLOSED"]);
  });

  it("should return null for invalid state", () => {
    expect(parsePrStateFilter("invalid")).toBeNull();
    expect(parsePrStateFilter("")).toBeNull();
  });
});

// =============================================================================
// cmdPrComments - Integration tests
// =============================================================================

describe("cmdPrComments", () => {
  let logger: Logger;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    setupDefaultValidation();
    mockFormatOutput.mockImplementation((data: any) => JSON.stringify(data, null, 2));
  });

  afterEach(() => { consoleSpy.mockRestore(); });

  it("should return 1 for invalid PR number", async () => {
    mockIsIssueNumber.mockReturnValue(false);
    const result = await cmdPrComments("abc", {}, logger);
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Invalid PR number"));
  });

  it("should return 1 when GraphQL fails", async () => {
    mockRunGraphQL.mockResolvedValue({ success: false, error: "timeout" });
    const result = await cmdPrComments("42", {}, logger);
    expect(result).toBe(1);
  });

  it("should return 0 and output PR review data on success", async () => {
    mockRunGraphQL.mockResolvedValue({
      success: true,
      data: {
        data: {
          repository: {
            pullRequest: {
              title: "feat: test",
              state: "OPEN",
              body: "Test PR",
              reviewDecision: "APPROVED",
              reviews: { nodes: [{ author: { login: "reviewer" }, state: "APPROVED", body: "LGTM" }] },
              reviewThreads: {
                nodes: [
                  {
                    id: "PRRT_1",
                    isResolved: false,
                    isOutdated: false,
                    comments: {
                      nodes: [
                        {
                          id: "PRRC_1",
                          databaseId: 12345,
                          body: "Fix this",
                          path: "src/index.ts",
                          line: 42,
                          author: { login: "reviewer" },
                          createdAt: "2026-02-01T00:00:00Z",
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      },
    });

    const result = await cmdPrComments("42", {}, logger);
    expect(result).toBe(0);
    expect(mockFormatOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        pr_number: 42,
        title: "feat: test",
        total_threads: 1,
        unresolved_threads: 1,
      }),
      "json",
      expect.any(Object)
    );
  });
});

// =============================================================================
// cmdMerge - Integration tests
// =============================================================================

describe("cmdMerge", () => {
  let logger: Logger;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;
  const mockPullsGet = jest.fn<(...args: any[]) => any>();
  const mockPullsMerge = jest.fn<(...args: any[]) => any>();
  const mockDeleteRef = jest.fn<(...args: any[]) => any>();
  const mockSearchIssues = jest.fn<(...args: any[]) => any>();

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    setupDefaultValidation();
    mockGetOctokit.mockReturnValue({
      rest: {
        pulls: { get: mockPullsGet, merge: mockPullsMerge, list: jest.fn() },
        git: { deleteRef: mockDeleteRef },
        search: { issuesAndPullRequests: mockSearchIssues },
      },
    });
    mockResolveAndUpdateStatus.mockResolvedValue({ success: true });
    mockExecFileAsync.mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 });
  });

  afterEach(() => { consoleSpy.mockRestore(); });

  it("should return 1 when no PR number or --head provided", async () => {
    mockIsIssueNumber.mockReturnValue(false);
    const result = await cmdMerge(undefined, {}, logger);
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("PR number or --head"));
  });

  it("should merge PR and checkout base branch by default", async () => {
    mockPullsGet.mockResolvedValue({
      data: { body: "Closes #39", head: { ref: "feat/39-test" }, base: { ref: "develop" } },
    });
    mockSearchIssues.mockResolvedValue({
      data: { items: [{ number: 42, body: "Closes #39" }] },
    });
    mockPullsMerge.mockResolvedValue({});
    mockDeleteRef.mockResolvedValue({});

    const result = await cmdMerge("42", {}, logger);
    const output = captureConsoleJson<any>(consoleSpy);

    expect(result).toBe(0);
    expect(output.pr_number).toBe(42);
    expect(output.merged).toBe(true);
    expect(output.merge_method).toBe("squash");
    expect(output.branch_deleted).toBe(true);
    expect(output.checked_out).toBe(true);
    expect(output.pulled).toBe(true);
    expect(output.local_branch_deleted).toBe(false);
    expect(mockExecFileAsync).toHaveBeenCalledWith("git", ["checkout", "develop"]);
    expect(mockExecFileAsync).toHaveBeenCalledWith("git", ["pull", "origin", "develop"]);
  });

  it("should skip local operations when --no-checkout is specified", async () => {
    mockPullsGet.mockResolvedValue({
      data: { body: "", head: { ref: "test" }, base: { ref: "develop" } },
    });
    mockPullsMerge.mockResolvedValue({});

    const result = await cmdMerge("42", { checkout: false }, logger);
    const output = captureConsoleJson<any>(consoleSpy);

    expect(result).toBe(0);
    expect(output.checked_out).toBe(false);
    expect(output.pulled).toBe(false);
    expect(mockExecFileAsync).not.toHaveBeenCalled();
  });

  it("should warn but return 0 when checkout fails", async () => {
    mockPullsGet.mockResolvedValue({
      data: { body: "", head: { ref: "test" }, base: { ref: "develop" } },
    });
    mockPullsMerge.mockResolvedValue({});
    mockExecFileAsync.mockRejectedValue(new Error("checkout failed"));

    const result = await cmdMerge("42", {}, logger);
    const output = captureConsoleJson<any>(consoleSpy);

    expect(result).toBe(0);
    expect(output.checked_out).toBe(false);
    expect(output.pulled).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to checkout"));
  });

  it("should delete local branch when --delete-local is specified", async () => {
    mockPullsGet.mockResolvedValue({
      data: { body: "", head: { ref: "feat/42-test" }, base: { ref: "develop" } },
    });
    mockPullsMerge.mockResolvedValue({});

    const result = await cmdMerge("42", { deleteLocal: true }, logger);
    const output = captureConsoleJson<any>(consoleSpy);

    expect(result).toBe(0);
    expect(output.local_branch_deleted).toBe(true);
    expect(mockExecFileAsync).toHaveBeenCalledWith("git", ["branch", "-d", "feat/42-test"]);
  });

  it("should warn when local branch deletion fails", async () => {
    mockPullsGet.mockResolvedValue({
      data: { body: "", head: { ref: "feat/42-test" }, base: { ref: "develop" } },
    });
    mockPullsMerge.mockResolvedValue({});
    // checkout and pull succeed, branch delete fails
    mockExecFileAsync
      .mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 }) // checkout
      .mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 }) // pull
      .mockRejectedValueOnce(new Error("branch not fully merged")); // branch -d

    const result = await cmdMerge("42", { deleteLocal: true }, logger);
    const output = captureConsoleJson<any>(consoleSpy);

    expect(result).toBe(0);
    expect(output.local_branch_deleted).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("git branch -D"));
  });

  it("should return 1 when merge fails", async () => {
    mockPullsGet.mockResolvedValue({ data: { body: "", head: { ref: "test" }, base: { ref: "develop" } } });
    mockPullsMerge.mockRejectedValue(new Error("Merge conflict"));

    const result = await cmdMerge("42", {}, logger);
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Failed to merge"));
  });

  it("should update linked issues to Done after merge", async () => {
    mockPullsGet.mockResolvedValue({
      data: { body: "Closes #39\nFixes #44", head: { ref: "feat/test" }, base: { ref: "develop" } },
    });
    mockSearchIssues.mockResolvedValue({
      data: { items: [{ number: 42, body: "Closes #39\nFixes #44" }] },
    });
    mockPullsMerge.mockResolvedValue({});
    mockDeleteRef.mockResolvedValue({});

    await cmdMerge("42", {}, logger);

    expect(mockResolveAndUpdateStatus).toHaveBeenCalledWith(
      "test-owner", "test-repo", 39, "Done", logger
    );
    expect(mockResolveAndUpdateStatus).toHaveBeenCalledWith(
      "test-owner", "test-repo", 44, "Done", logger
    );
  });

  it("should use specified merge method", async () => {
    mockPullsGet.mockResolvedValue({ data: { body: "", head: { ref: "test" }, base: { ref: "develop" } } });
    mockPullsMerge.mockResolvedValue({});

    await cmdMerge("42", { rebase: true }, logger);

    expect(mockPullsMerge).toHaveBeenCalledWith(
      expect.objectContaining({ merge_method: "rebase" })
    );
  });

  it("should skip pull when checkout fails", async () => {
    mockPullsGet.mockResolvedValue({
      data: { body: "", head: { ref: "test" }, base: { ref: "develop" } },
    });
    mockPullsMerge.mockResolvedValue({});
    mockExecFileAsync.mockRejectedValue(new Error("checkout failed"));

    await cmdMerge("42", {}, logger);

    // checkout が失敗したので pull は呼ばれない
    expect(mockExecFileAsync).toHaveBeenCalledTimes(1);
    expect(mockExecFileAsync).toHaveBeenCalledWith("git", ["checkout", "develop"]);
  });
});

// =============================================================================
// cmdPrReply - Integration tests
// =============================================================================

describe("cmdPrReply", () => {
  let logger: Logger;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;
  const mockOctokitRequest = jest.fn<(...args: any[]) => any>();

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    setupDefaultValidation();
    mockGetOctokit.mockReturnValue({ request: mockOctokitRequest });
  });

  afterEach(() => { consoleSpy.mockRestore(); });

  it("should return 1 when --reply-to is missing", async () => {
    const result = await cmdPrReply("42", { bodyFile: "test" }, logger);
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("--reply-to"));
  });

  it("should return 1 when --body-file is missing", async () => {
    const result = await cmdPrReply("42", { replyTo: "12345" }, logger);
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("--body-file"));
  });

  it("should return 1 for non-numeric --reply-to", async () => {
    const result = await cmdPrReply("42", { replyTo: "PRRC_abc", bodyFile: "test" }, logger);
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("numeric"));
  });

  it("should reply and output JSON on success", async () => {
    mockOctokitRequest.mockResolvedValue({
      data: { id: 87654, html_url: "https://github.com/owner/repo/pull/42#discussion_r87654" },
    });

    const result = await cmdPrReply("42", { replyTo: "12345", bodyFile: "Fixed" }, logger);
    const output = captureConsoleJson<any>(consoleSpy);

    expect(result).toBe(0);
    expect(output.pr_number).toBe(42);
    expect(output.reply_to).toBe(12345);
    expect(output.comment_id).toBe(87654);
  });
});

// =============================================================================
// cmdResolve - Integration tests
// =============================================================================

describe("cmdResolve", () => {
  let logger: Logger;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    setupDefaultValidation();
  });

  afterEach(() => { consoleSpy.mockRestore(); });

  it("should return 1 when --thread-id is missing", async () => {
    const result = await cmdResolve("42", {}, logger);
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("--thread-id"));
  });

  it("should return 1 for invalid thread ID format", async () => {
    const result = await cmdResolve("42", { threadId: "ab" }, logger);
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Invalid --thread-id"));
  });

  it("should resolve thread and output JSON on success", async () => {
    mockRunGraphQL.mockResolvedValue({
      success: true,
      data: {
        data: {
          resolveReviewThread: {
            thread: { id: "PRRT_kwDON12345", isResolved: true },
          },
        },
      },
    });

    const result = await cmdResolve("42", { threadId: "PRRT_kwDON12345" }, logger);
    const output = captureConsoleJson<any>(consoleSpy);

    expect(result).toBe(0);
    expect(output.pr_number).toBe(42);
    expect(output.thread_id).toBe("PRRT_kwDON12345");
    expect(output.resolved).toBe(true);
  });
});

// =============================================================================
// resolvePrFromHead - Integration tests
// =============================================================================

describe("resolvePrFromHead", () => {
  let logger: Logger;
  const mockPullsList = jest.fn<(...args: any[]) => any>();

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    mockGetOctokit.mockReturnValue({ rest: { pulls: { list: mockPullsList } } });
  });

  it("should return PR number when found", async () => {
    mockPullsList.mockResolvedValue({ data: [{ number: 42 }] });

    const result = await resolvePrFromHead("feat/test", "owner", "repo", logger);
    expect(result).toBe(42);
  });

  it("should return null when no open PR found", async () => {
    mockPullsList.mockResolvedValue({ data: [] });

    const result = await resolvePrFromHead("feat/test", "owner", "repo", logger);
    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("No open PR found"));
  });
});

// =============================================================================
// cmdPrList - Integration tests
// =============================================================================

describe("cmdPrList", () => {
  let logger: Logger;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    setupDefaultValidation();
    mockFormatOutput.mockImplementation((data: any) => JSON.stringify(data, null, 2));
  });

  afterEach(() => { consoleSpy.mockRestore(); });

  it("should return 1 for invalid state filter", async () => {
    const result = await cmdPrList({ state: "invalid" }, logger);
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Invalid state"));
  });

  it("should return PR list on success", async () => {
    mockRunGraphQL.mockResolvedValue({
      success: true,
      data: {
        data: {
          repository: {
            pullRequests: {
              nodes: [
                {
                  number: 42,
                  title: "feat: test",
                  state: "OPEN",
                  headRefName: "feat/test",
                  baseRefName: "develop",
                  author: { login: "user" },
                  reviewDecision: "APPROVED",
                  url: "https://github.com/owner/repo/pull/42",
                },
              ],
            },
          },
        },
      },
    });

    const result = await cmdPrList({}, logger);
    expect(result).toBe(0);
    expect(mockFormatOutput).toHaveBeenCalledWith(
      expect.objectContaining({
        repository: "test-owner/test-repo",
        total_count: 1,
      }),
      "json",
      expect.any(Object)
    );
  });
});

// =============================================================================
// cmdPrShow - Integration tests
// =============================================================================

describe("cmdPrShow", () => {
  let logger: Logger;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    setupDefaultValidation();
  });

  afterEach(() => { consoleSpy.mockRestore(); });

  it("should return 1 when PR not found", async () => {
    mockRunGraphQL.mockResolvedValue({ success: false });
    const result = await cmdPrShow("999", {}, logger);
    expect(result).toBe(1);
  });

  it("should output full PR details on success", async () => {
    mockRunGraphQL.mockResolvedValue({
      success: true,
      data: {
        data: {
          repository: {
            pullRequest: {
              number: 42,
              title: "feat: add feature",
              state: "OPEN",
              url: "https://github.com/owner/repo/pull/42",
              body: "Closes #39\n\nDetails here",
              headRefName: "feat/39-test",
              baseRefName: "develop",
              author: { login: "user" },
              reviewDecision: "APPROVED",
              labels: { nodes: [{ name: "enhancement" }] },
              createdAt: "2026-02-15T00:00:00Z",
              updatedAt: "2026-02-15T01:00:00Z",
              additions: 150,
              deletions: 20,
              changedFiles: 5,
              reviewThreads: { totalCount: 2 },
              reviews: { totalCount: 1 },
            },
          },
        },
      },
    });

    const result = await cmdPrShow("42", {}, logger);
    const output = captureConsoleJson<any>(consoleSpy);

    expect(result).toBe(0);
    expect(output.number).toBe(42);
    expect(output.title).toBe("feat: add feature");
    expect(output.linked_issues).toContain(39);
    expect(output.additions).toBe(150);
    expect(output.labels).toEqual(["enhancement"]);
    expect(output.review_thread_count).toBe(2);
  });
});

// =============================================================================
// cmdPrCreate - Integration tests
// =============================================================================

describe("cmdPrCreate", () => {
  let logger: Logger;
  let consoleSpy: jest.SpiedFunction<typeof console.log>;
  const mockPullsCreate = jest.fn<(...args: any[]) => any>();

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    setupDefaultValidation();
    mockGetOctokit.mockReturnValue({ rest: { pulls: { create: mockPullsCreate } } });
    mockGetCurrentBranch.mockReturnValue("feat/test");
  });

  afterEach(() => { consoleSpy.mockRestore(); });

  it("should return 1 when --base is missing", async () => {
    const result = await cmdPrCreate({ title: "test" }, logger);
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("--base"));
  });

  it("should return 1 when --title is missing", async () => {
    const result = await cmdPrCreate({ base: "develop" }, logger);
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("--title"));
  });

  it("should create PR and output JSON on success", async () => {
    mockPullsCreate.mockResolvedValue({
      data: {
        number: 42,
        title: "feat: test (#39)",
        html_url: "https://github.com/owner/repo/pull/42",
        head: { ref: "feat/test" },
        base: { ref: "develop" },
      },
    });

    const result = await cmdPrCreate(
      { base: "develop", title: "feat: test (#39)" },
      logger
    );
    const output = captureConsoleJson<any>(consoleSpy);

    expect(result).toBe(0);
    expect(output.number).toBe(42);
    expect(output.head_branch).toBe("feat/test");
    expect(output.base_branch).toBe("develop");
    expect(logger.success).toHaveBeenCalledWith(expect.stringContaining("Created PR #42"));
  });

  it("should use current git branch when --head is not specified", async () => {
    mockGetCurrentBranch.mockReturnValue("feat/auto-detected");
    mockPullsCreate.mockResolvedValue({
      data: { number: 1, title: "t", html_url: "u", head: { ref: "feat/auto-detected" }, base: { ref: "develop" } },
    });

    await cmdPrCreate({ base: "develop", title: "test" }, logger);

    expect(mockPullsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ head: "feat/auto-detected" })
    );
  });

  it("should return 1 when API fails", async () => {
    mockPullsCreate.mockRejectedValue(new Error("Validation failed"));
    const result = await cmdPrCreate(
      { base: "develop", title: "test" },
      logger
    );
    expect(result).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("Failed to create PR"));
  });
});

// =============================================================================
// fetchOpenPRs - Integration tests
// =============================================================================

describe("fetchOpenPRs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return empty array when GraphQL fails", async () => {
    mockRunGraphQL.mockResolvedValue({ success: false });
    const result = await fetchOpenPRs("owner", "repo");
    expect(result).toEqual([]);
  });

  it("should return PR summaries on success", async () => {
    mockRunGraphQL.mockResolvedValue({
      success: true,
      data: {
        data: {
          repository: {
            pullRequests: {
              nodes: [
                {
                  number: 42,
                  title: "feat: test",
                  url: "https://github.com/owner/repo/pull/42",
                  reviewDecision: "APPROVED",
                  reviewThreads: { totalCount: 2 },
                  reviews: { totalCount: 1 },
                },
              ],
            },
          },
        },
      },
    });

    const result = await fetchOpenPRs("owner", "repo");
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        number: 42,
        title: "feat: test",
        reviewDecision: "APPROVED",
      })
    );
  });
});
