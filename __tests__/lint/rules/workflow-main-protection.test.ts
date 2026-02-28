/**
 * workflow-main-protection Rule Tests
 *
 * validateMainProtection（純粋関数）と checkMainProtection（git-local + simple-git ラッパー）のテスト
 * ESM 環境のため jest.unstable_mockModule + dynamic import を使用。
 *
 * @testdoc 保護ブランチ直接コミット検出のテスト
 */

import { jest } from "@jest/globals";

// =============================================================================
// Mocks (ESM: unstable_mockModule + dynamic import)
// =============================================================================

const mockGetCurrentBranch = jest.fn<() => string | null>();

jest.unstable_mockModule("../../../src/utils/git-local.js", () => ({
  getCurrentBranch: mockGetCurrentBranch,
  getGitRemoteUrl: jest.fn(),
  isInsideGitRepo: jest.fn(),
  getGitRemotes: jest.fn(),
}));

const mockStatus = jest.fn<() => Promise<any>>();
const mockRaw = jest.fn<(...args: any[]) => Promise<string>>();

jest.unstable_mockModule("simple-git", () => ({
  simpleGit: () => ({
    status: mockStatus,
    raw: mockRaw,
  }),
}));

const { validateMainProtection, checkMainProtection } = await import(
  "../../../src/lint/rules/workflow-main-protection.js"
);

type GitProtectionState = {
  currentBranch: string;
  hasUncommittedChanges: boolean;
  directCommitCount: number;
};

// =============================================================================
// Tests
// =============================================================================

describe("workflow-main-protection", () => {
  describe("validateMainProtection", () => {
    /**
     * @testdoc 非保護ブランチでは問題なし
     */
    it("should return no issues for non-protected branch", () => {
      const state: GitProtectionState = {
        currentBranch: "feat/42-feature",
        hasUncommittedChanges: false,
        directCommitCount: 0,
      };
      expect(validateMainProtection(state)).toEqual([]);
    });

    /**
     * @testdoc [main-protection/validate] 保護ブランチ上の未コミット変更を検出する
     */
    it("should detect uncommitted changes on protected branch", () => {
      const state: GitProtectionState = {
        currentBranch: "main",
        hasUncommittedChanges: true,
        directCommitCount: 0,
      };
      const issues = validateMainProtection(state);
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("Uncommitted");
    });

    /**
     * @testdoc 保護ブランチ上の直接コミットを検出する
     */
    it("should detect direct commits on protected branch", () => {
      const state: GitProtectionState = {
        currentBranch: "develop",
        hasUncommittedChanges: false,
        directCommitCount: 3,
      };
      const issues = validateMainProtection(state);
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("3 direct");
    });

    /**
     * @testdoc カスタム保護ブランチリストで検出できる
     */
    it("should use custom protected branches list", () => {
      const state: GitProtectionState = {
        currentBranch: "staging",
        hasUncommittedChanges: true,
        directCommitCount: 0,
      };
      const issues = validateMainProtection(state, "error", ["staging"]);
      expect(issues).toHaveLength(1);
    });
  });

  describe("checkMainProtection", () => {
    beforeEach(() => {
      mockGetCurrentBranch.mockReset();
      mockStatus.mockReset();
      mockRaw.mockReset();
    });

    /**
     * @testdoc ブランチ名取得失敗時に info issue を返す
     */
    it("should return info issue when getCurrentBranch returns null", async () => {
      mockGetCurrentBranch.mockReturnValue(null);

      const issues = await checkMainProtection();
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("info");
      expect(issues[0].message).toContain("Could not determine");
    });

    /**
     * @testdoc [main-protection/check] 保護ブランチ上の未コミット変更を検出する
     */
    it("should detect uncommitted changes on protected branch", async () => {
      mockGetCurrentBranch.mockReturnValue("develop");
      mockStatus.mockResolvedValue({ files: [{ path: "src/index.ts", working_dir: "M", index: " " }] });
      mockRaw.mockResolvedValueOnce(""); // log --oneline (direct commits)

      const issues = await checkMainProtection();
      expect(issues.some((i: any) => i.message.includes("Uncommitted"))).toBe(true);
    });

    /**
     * @testdoc 直接コミットを検出する
     */
    it("should detect direct commits on protected branch", async () => {
      mockGetCurrentBranch.mockReturnValue("main");
      mockStatus.mockResolvedValue({ files: [] });
      mockRaw.mockResolvedValueOnce("abc1234 feat: direct commit\ndef5678 fix: another\n");

      const issues = await checkMainProtection();
      expect(issues.some((i: any) => i.message.includes("2 direct"))).toBe(true);
    });

    /**
     * @testdoc 非保護ブランチでは status/log を呼ばない
     */
    it("should skip status and direct commit check for non-protected branch", async () => {
      mockGetCurrentBranch.mockReturnValue("feat/42-feature");

      const issues = await checkMainProtection();
      expect(mockStatus).not.toHaveBeenCalled();
      expect(mockRaw).not.toHaveBeenCalled();
      expect(issues).toHaveLength(0);
    });
  });
});
