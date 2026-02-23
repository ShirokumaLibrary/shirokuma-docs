/**
 * workflow-branch-naming Rule Tests
 *
 * validateBranchName（純粋関数）と checkBranchNaming（git-local.ts ラッパー）のテスト
 * ESM 環境のため jest.unstable_mockModule + dynamic import を使用。
 *
 * @testdoc ブランチ命名規則の検証テスト
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

const { validateBranchName, checkBranchNaming } = await import(
  "../../../src/lint/rules/workflow-branch-naming.js"
);

// =============================================================================
// Tests
// =============================================================================

describe("workflow-branch-naming", () => {
  describe("validateBranchName", () => {
    /**
     * @testdoc persistent ブランチ（main, develop, master）は常に有効
     */
    it("should accept persistent branches", () => {
      expect(validateBranchName("main")).toEqual([]);
      expect(validateBranchName("develop")).toEqual([]);
      expect(validateBranchName("master")).toEqual([]);
    });

    /**
     * @testdoc release ブランチ（release/X.x）は有効
     */
    it("should accept release branches", () => {
      expect(validateBranchName("release/1.x")).toEqual([]);
      expect(validateBranchName("release/2.x")).toEqual([]);
    });

    /**
     * @testdoc 正しいフィーチャーブランチは有効
     */
    it("should accept valid feature branches", () => {
      expect(validateBranchName("feat/42-add-login")).toEqual([]);
      expect(validateBranchName("fix/100-fix-typo")).toEqual([]);
      expect(validateBranchName("chore/7-update-deps")).toEqual([]);
      expect(validateBranchName("docs/12-add-readme")).toEqual([]);
      expect(validateBranchName("hotfix/99-critical-fix")).toEqual([]);
    });

    /**
     * @testdoc 規則に合わないブランチ名で issue を返す
     */
    it("should return issue for non-matching branch name", () => {
      const issues = validateBranchName("my-branch");
      expect(issues).toHaveLength(1);
      expect(issues[0].rule).toBe("branch-naming");
      expect(issues[0].type).toBe("warning");
      expect(issues[0].message).toContain("my-branch");
    });

    /**
     * @testdoc 未許可プレフィックスで issue を返す
     */
    it("should return issue for disallowed prefix", () => {
      const issues = validateBranchName("wip/42-some-work");
      expect(issues).toHaveLength(1);
      expect(issues[0].rule).toBe("branch-naming");
      expect(issues[0].message).toContain("wip");
    });

    /**
     * @testdoc カスタム許可プレフィックスで検証できる
     */
    it("should accept custom allowed prefixes", () => {
      const issues = validateBranchName("wip/42-some-work", "warning", [
        "wip",
        "feat",
      ]);
      expect(issues).toEqual([]);
    });

    /**
     * @testdoc 40文字超のスラグで info issue を返す
     */
    it("should return info issue for slug exceeding 40 characters", () => {
      const longSlug = "a".repeat(41);
      const issues = validateBranchName(`feat/1-${longSlug}`);
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("info");
      expect(issues[0].message).toContain("40 characters");
    });

    /**
     * @testdoc ちょうど40文字のスラグは問題なし
     */
    it("should accept slug with exactly 40 characters", () => {
      const slug = "a".repeat(40);
      const issues = validateBranchName(`feat/1-${slug}`);
      expect(issues).toEqual([]);
    });

    /**
     * @testdoc severity パラメータが反映される
     */
    it("should use provided severity", () => {
      const issues = validateBranchName("invalid-name", "error");
      expect(issues[0].type).toBe("error");
    });
  });

  describe("checkBranchNaming", () => {
    beforeEach(() => {
      mockGetCurrentBranch.mockReset();
    });

    /**
     * @testdoc git-local.ts からブランチ名を取得して検証する
     */
    it("should validate branch name from git-local", () => {
      mockGetCurrentBranch.mockReturnValue("feat/42-my-feature");

      const issues = checkBranchNaming();
      expect(issues).toEqual([]);
      expect(mockGetCurrentBranch).toHaveBeenCalled();
    });

    /**
     * @testdoc checkBranchNaming: ブランチ名取得失敗時に info issue を返す
     */
    it("should return info issue when getCurrentBranch returns null", () => {
      mockGetCurrentBranch.mockReturnValue(null);

      const issues = checkBranchNaming();
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("info");
      expect(issues[0].message).toContain("Could not determine");
    });

    /**
     * @testdoc カスタム severity と prefixes を渡せる
     */
    it("should pass severity and prefixes through", () => {
      mockGetCurrentBranch.mockReturnValue("wip/42-work");

      const issues = checkBranchNaming("error", ["feat", "fix"]);
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("error");
    });
  });
});
