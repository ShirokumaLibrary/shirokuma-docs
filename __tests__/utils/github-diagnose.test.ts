/**
 * diagnoseRepoFailure() テスト
 *
 * リポジトリ情報取得の失敗原因を診断するヘルパー関数のテスト。
 * ESM 環境のため jest.unstable_mockModule + dynamic import を使用。
 *
 * @testdoc diagnoseRepoFailure 関数の診断ブランチテスト
 */

import { jest } from "@jest/globals";

// =============================================================================
// Mocks (ESM: unstable_mockModule + dynamic import)
// =============================================================================

const mockIsInsideGitRepo = jest.fn<() => boolean>();
const mockGetGitRemotes = jest.fn<() => Array<{ name: string; url: string }>>();

jest.unstable_mockModule("../../src/utils/git-local.js", () => ({
  getCurrentBranch: jest.fn(),
  getGitRemoteUrl: jest.fn(),
  isInsideGitRepo: mockIsInsideGitRepo,
  getGitRemotes: mockGetGitRemotes,
}));

jest.unstable_mockModule("node:fs", () => ({
  readFileSync: jest.fn(),
}));

// octokit-client のモック
const mockGetOctokit = jest.fn<() => any>();
jest.unstable_mockModule("../../src/utils/octokit-client.js", () => ({
  getOctokit: mockGetOctokit,
  resolveAuthToken: jest.fn(() => "test-token"),
  resetOctokit: jest.fn(),
  setOctokit: jest.fn(),
}));

// Dynamic import（モック設定後に実行）
const { diagnoseRepoFailure } = await import("../../src/utils/github.js");

// =============================================================================
// Tests
// =============================================================================

describe("diagnoseRepoFailure", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * @testdoc git リポジトリ外の場合、リポジトリ外であることを報告する
   */
  it("should detect not inside a git repository", async () => {
    mockIsInsideGitRepo.mockReturnValue(false);

    const result = await diagnoseRepoFailure();

    expect(result.cause).toContain("Not inside a git repository");
    expect(result.suggestion).toContain("git init");
  });

  /**
   * @testdoc git remote が空の場合、リモート追加を提案する
   */
  it("should detect no git remote configured (empty remotes)", async () => {
    mockIsInsideGitRepo.mockReturnValue(true);
    mockGetGitRemotes.mockReturnValue([]);

    const result = await diagnoseRepoFailure();

    expect(result.cause).toContain("No git remote configured");
    expect(result.suggestion).toContain("git remote add origin");
  });

  /**
   * @testdoc GitHub 以外のリモートのみの場合、GitHub リモート追加を提案する
   */
  it("should detect non-GitHub remote", async () => {
    mockIsInsideGitRepo.mockReturnValue(true);
    mockGetGitRemotes.mockReturnValue([
      { name: "origin", url: "git@gitlab.com:user/repo.git" },
    ]);

    const result = await diagnoseRepoFailure();

    expect(result.cause).toContain("No GitHub remote found");
    expect(result.suggestion).toContain("git remote add origin");
  });

  /**
   * @testdoc GitHub API 認証失敗の場合、認証を提案する
   */
  it("should detect unauthenticated GitHub API", async () => {
    mockIsInsideGitRepo.mockReturnValue(true);
    mockGetGitRemotes.mockReturnValue([
      { name: "origin", url: "git@github.com:user/repo.git" },
    ]);
    mockGetOctokit.mockReturnValue({
      rest: {
        users: {
          getAuthenticated: jest.fn().mockRejectedValue(new Error("401 Unauthorized")),
        },
      },
    });

    const result = await diagnoseRepoFailure();

    expect(result.cause).toContain("not authenticated");
    expect(result.suggestion).toContain("GITHUB_TOKEN");
  });

  /**
   * @testdoc 全チェック通過時はフォールバックメッセージを返す（--owner オプション案内）
   */
  it("should return fallback when all checks pass", async () => {
    mockIsInsideGitRepo.mockReturnValue(true);
    mockGetGitRemotes.mockReturnValue([
      { name: "origin", url: "git@github.com:user/repo.git" },
    ]);
    mockGetOctokit.mockReturnValue({
      rest: {
        users: {
          getAuthenticated: jest.fn().mockResolvedValue({ data: { login: "user" } }),
        },
      },
    });

    const result = await diagnoseRepoFailure();

    expect(result.cause).toContain("Could not resolve repository");
    expect(result.suggestion).toContain("--owner");
  });
});
