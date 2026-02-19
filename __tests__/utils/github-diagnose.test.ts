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

const mockSpawnSync = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule("node:child_process", () => ({
  spawnSync: mockSpawnSync,
}));

jest.unstable_mockModule("node:fs", () => ({
  readFileSync: jest.fn(),
}));

// Dynamic import（モック設定後に実行）
const { diagnoseRepoFailure } = await import("../../src/utils/github.js");

// =============================================================================
// Helpers
// =============================================================================

/** spawnSync の成功レスポンスを生成 */
function spawnOk(stdout: string) {
  return { status: 0, stdout, stderr: "", pid: 0, output: [], signal: null };
}

/** spawnSync の失敗レスポンスを生成 */
function spawnFail(stderr = "error") {
  return { status: 1, stdout: "", stderr, pid: 0, output: [], signal: null };
}

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
  it("should detect not inside a git repository", () => {
    // git rev-parse --is-inside-work-tree → 失敗
    mockSpawnSync.mockReturnValueOnce(spawnFail("fatal: not a git repository"));

    const result = diagnoseRepoFailure();

    expect(result.cause).toContain("Not inside a git repository");
    expect(result.suggestion).toContain("git init");
  });

  /**
   * @testdoc git remote が空の場合、リモート追加を提案する
   */
  it("should detect no git remote configured (empty stdout)", () => {
    // git rev-parse → 成功
    mockSpawnSync.mockReturnValueOnce(spawnOk("true"));
    // git remote -v → 空
    mockSpawnSync.mockReturnValueOnce(spawnOk(""));

    const result = diagnoseRepoFailure();

    expect(result.cause).toContain("No git remote configured");
    expect(result.suggestion).toContain("git remote add origin");
  });

  /**
   * @testdoc git remote コマンドが失敗した場合もリモート未設定と報告する
   */
  it("should detect git remote failure (non-zero exit)", () => {
    // git rev-parse → 成功
    mockSpawnSync.mockReturnValueOnce(spawnOk("true"));
    // git remote -v → 失敗
    mockSpawnSync.mockReturnValueOnce({ status: 128, stdout: "", stderr: "fatal: not a git repository", pid: 0, output: [], signal: null });

    const result = diagnoseRepoFailure();

    expect(result.cause).toContain("No git remote configured");
  });

  /**
   * @testdoc GitHub 以外のリモートのみの場合、GitHub リモート追加を提案する
   */
  it("should detect non-GitHub remote", () => {
    // git rev-parse → 成功
    mockSpawnSync.mockReturnValueOnce(spawnOk("true"));
    // git remote -v → GitLab リモートのみ
    mockSpawnSync.mockReturnValueOnce(spawnOk("origin\tgit@gitlab.com:user/repo.git (fetch)\n"));

    const result = diagnoseRepoFailure();

    expect(result.cause).toContain("No GitHub remote found");
    expect(result.suggestion).toContain("git remote add origin");
  });

  /**
   * @testdoc gh CLI が未認証の場合、gh auth login を提案する
   */
  it("should detect unauthenticated gh CLI", () => {
    // git rev-parse → 成功
    mockSpawnSync.mockReturnValueOnce(spawnOk("true"));
    // git remote -v → GitHub リモートあり
    mockSpawnSync.mockReturnValueOnce(spawnOk("origin\tgit@github.com:user/repo.git (fetch)\n"));
    // checkGhCli() 内: gh api user → 失敗
    mockSpawnSync.mockReturnValueOnce(spawnFail("error"));
    // checkGhCli() 内: gh auth status → 失敗
    mockSpawnSync.mockReturnValueOnce(spawnFail("not logged in"));

    const result = diagnoseRepoFailure();

    expect(result.cause).toContain("not authenticated");
    expect(result.suggestion).toContain("gh auth login");
  });

  /**
   * @testdoc 全チェック通過時はフォールバックメッセージを返す（gh repo set-default 案内）
   */
  it("should return fallback when all checks pass", () => {
    // git rev-parse → 成功
    mockSpawnSync.mockReturnValueOnce(spawnOk("true"));
    // git remote -v → GitHub リモートあり
    mockSpawnSync.mockReturnValueOnce(spawnOk("origin\tgit@github.com:user/repo.git (fetch)\n"));
    // checkGhCli() 内: gh api user → 成功
    mockSpawnSync.mockReturnValueOnce(spawnOk(JSON.stringify({ login: "user" })));

    const result = diagnoseRepoFailure();

    expect(result.cause).toContain("Could not resolve repository");
    expect(result.suggestion).toContain("gh repo set-default");
    expect(result.suggestion).toContain("--owner");
  });
});
