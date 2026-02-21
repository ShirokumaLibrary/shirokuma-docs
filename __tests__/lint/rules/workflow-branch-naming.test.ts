/**
 * workflow-branch-naming Rule Tests
 *
 * validateBranchName（純粋関数）と checkBranchNaming（spawnSync ラッパー）のテスト
 * ESM 環境のため jest.unstable_mockModule + dynamic import を使用。
 *
 * @testdoc ブランチ命名規則の検証テスト
 */

import { jest } from "@jest/globals";

// =============================================================================
// Mocks (ESM: unstable_mockModule + dynamic import)
// =============================================================================

const mockSpawnSync = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule("node:child_process", () => ({
  spawnSync: mockSpawnSync,
}));

const { validateBranchName, checkBranchNaming } = await import(
  "../../../src/lint/rules/workflow-branch-naming.js"
);

// =============================================================================
// Helpers
// =============================================================================

function spawnOk(stdout: string) {
  return { status: 0, stdout, stderr: "", pid: 0, output: [], signal: null };
}

function spawnFail(stderr = "error") {
  return { status: 1, stdout: "", stderr, pid: 0, output: [], signal: null };
}

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
      mockSpawnSync.mockReset();
    });

    /**
     * @testdoc git コマンド成功時にブランチ名を検証する
     */
    it("should validate branch name from git output", () => {
      mockSpawnSync.mockReturnValue(spawnOk("feat/42-my-feature\n"));

      const issues = checkBranchNaming();
      expect(issues).toEqual([]);
      expect(mockSpawnSync).toHaveBeenCalledWith(
        "git",
        ["branch", "--show-current"],
        expect.objectContaining({ encoding: "utf-8" })
      );
    });

    /**
     * @testdoc checkBranchNaming: git コマンド失敗時に info issue を返す
     */
    it("should return info issue when git command fails", () => {
      mockSpawnSync.mockReturnValue(spawnFail("not a git repo"));

      const issues = checkBranchNaming();
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("info");
      expect(issues[0].message).toContain("Could not determine");
    });

    /**
     * @testdoc checkBranchNaming: stdout が空の場合に info issue を返す
     */
    it("should return info issue when stdout is empty", () => {
      mockSpawnSync.mockReturnValue(spawnOk(""));

      const issues = checkBranchNaming();
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("info");
    });

    /**
     * @testdoc カスタム severity と prefixes を渡せる
     */
    it("should pass severity and prefixes through", () => {
      mockSpawnSync.mockReturnValue(spawnOk("wip/42-work\n"));

      const issues = checkBranchNaming("error", ["feat", "fix"]);
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("error");
    });
  });
});
