/**
 * workflow-main-protection Rule Tests
 *
 * validateMainProtection（純粋関数）と checkMainProtection（spawnSync ラッパー）のテスト
 * ESM 環境のため jest.unstable_mockModule + dynamic import を使用。
 *
 * @testdoc ブランチ保護検証テスト
 */

import { jest } from "@jest/globals";

// =============================================================================
// Mocks (ESM: unstable_mockModule + dynamic import)
// =============================================================================

const mockSpawnSync = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule("node:child_process", () => ({
  spawnSync: mockSpawnSync,
}));

const { validateMainProtection, checkMainProtection } = await import(
  "../../../src/lint/rules/workflow-main-protection.js"
);
import type { GitProtectionState } from "../../../src/lint/rules/workflow-main-protection.js";

// =============================================================================
// Helpers
// =============================================================================

function spawnOk(stdout: string) {
  return { status: 0, stdout, stderr: "", pid: 0, output: [], signal: null };
}

function spawnFail(stderr = "error") {
  return { status: 1, stdout: "", stderr, pid: 0, output: [], signal: null };
}

function makeState(overrides: Partial<GitProtectionState> = {}): GitProtectionState {
  return {
    currentBranch: "main",
    hasUncommittedChanges: false,
    directCommitCount: 0,
    recentCommits: [],
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("workflow-main-protection", () => {
  describe("validateMainProtection", () => {
    /**
     * @testdoc 保護ブランチ上の未コミット変更で error を返す
     */
    it("should return error for uncommitted changes on protected branch", () => {
      const state = makeState({
        currentBranch: "main",
        hasUncommittedChanges: true,
      });
      const issues = validateMainProtection(state);
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("error");
      expect(issues[0].rule).toBe("main-protection");
      expect(issues[0].message).toContain("Uncommitted changes");
    });

    /**
     * @testdoc 保護ブランチ上の直接コミットで error を返す
     */
    it("should return error for direct commits on protected branch", () => {
      const state = makeState({
        currentBranch: "develop",
        directCommitCount: 3,
      });
      const issues = validateMainProtection(state);
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("error");
      expect(issues[0].message).toContain("3 direct");
    });

    /**
     * @testdoc 未コミット変更 + 直接コミットで2つの issue を返す
     */
    it("should return two issues for both uncommitted changes and direct commits", () => {
      const state = makeState({
        currentBranch: "main",
        hasUncommittedChanges: true,
        directCommitCount: 2,
      });
      const issues = validateMainProtection(state);
      expect(issues).toHaveLength(2);
    });

    /**
     * @testdoc 非保護ブランチではブランチ関連チェックをスキップする
     */
    it("should skip branch checks for non-protected branches", () => {
      const state = makeState({
        currentBranch: "feat/42-feature",
        hasUncommittedChanges: true,
        directCommitCount: 5,
      });
      const issues = validateMainProtection(state);
      expect(issues).toEqual([]);
    });

    /**
     * @testdoc コミット body 内の Co-Authored-By を検出する
     */
    it("should detect Co-Authored-By in commit body", () => {
      const state = makeState({
        currentBranch: "feat/42-feature",
        recentCommits: [
          {
            hash: "abc1234",
            subject: "feat: add feature",
            body: "Co-Authored-By: User <user@example.com>",
          },
        ],
      });
      const issues = validateMainProtection(state);
      expect(issues).toHaveLength(1);
      expect(issues[0].rule).toBe("co-authored-by");
      expect(issues[0].type).toBe("warning");
    });

    /**
     * @testdoc コミット subject 内の Co-Authored-By を検出する
     */
    it("should detect Co-Authored-By in commit subject", () => {
      const state = makeState({
        currentBranch: "feat/42-feature",
        recentCommits: [
          {
            hash: "abc1234",
            subject: "feat: add feature Co-Authored-By: User",
            body: "",
          },
        ],
      });
      const issues = validateMainProtection(state);
      expect(issues).toHaveLength(1);
      expect(issues[0].rule).toBe("co-authored-by");
    });

    /**
     * @testdoc Co-Authored-By の大文字小文字を区別しない
     */
    it("should detect Co-Authored-By case-insensitively", () => {
      const state = makeState({
        recentCommits: [
          {
            hash: "abc1234",
            subject: "feat: add",
            body: "co-authored-by: User <u@e.com>",
          },
        ],
      });
      const issues = validateMainProtection(state);
      expect(issues).toHaveLength(1);
    });

    /**
     * @testdoc Co-Authored-By のないコミットは問題なし
     */
    it("should not flag commits without Co-Authored-By", () => {
      const state = makeState({
        recentCommits: [
          { hash: "abc1234", subject: "feat: add feature", body: "Normal body" },
        ],
      });
      expect(validateMainProtection(state)).toEqual([]);
    });

    /**
     * @testdoc カスタム severity が反映される
     */
    it("should use provided severity for branch checks", () => {
      const state = makeState({
        currentBranch: "main",
        hasUncommittedChanges: true,
      });
      const issues = validateMainProtection(state, "warning");
      expect(issues[0].type).toBe("warning");
    });

    /**
     * @testdoc カスタム保護ブランチリストで検証できる
     */
    it("should use custom protected branches list", () => {
      const state = makeState({
        currentBranch: "staging",
        hasUncommittedChanges: true,
      });
      // デフォルトでは staging は保護ブランチではない
      expect(validateMainProtection(state)).toEqual([]);
      // カスタムリストに含めると検出される
      const issues = validateMainProtection(state, "error", ["staging"]);
      expect(issues).toHaveLength(1);
    });
  });

  describe("checkMainProtection", () => {
    beforeEach(() => {
      mockSpawnSync.mockReset();
    });

    /**
     * @testdoc git branch コマンド失敗時に info issue を返す
     */
    it("should return info issue when git branch command fails", () => {
      mockSpawnSync.mockReturnValue(spawnFail());

      const issues = checkMainProtection();
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("info");
      expect(issues[0].message).toContain("Could not determine");
    });

    /**
     * @testdoc 保護ブランチの場合に4回の spawnSync を呼ぶ
     */
    it("should call spawnSync 4 times for protected branch", () => {
      // 1. branch --show-current
      mockSpawnSync.mockReturnValueOnce(spawnOk("main\n"));
      // 2. status --porcelain
      mockSpawnSync.mockReturnValueOnce(spawnOk(""));
      // 3. log --oneline --no-merges
      mockSpawnSync.mockReturnValueOnce(spawnOk(""));
      // 4. log --format (Co-Authored-By check)
      mockSpawnSync.mockReturnValueOnce(spawnOk(""));

      checkMainProtection();
      expect(mockSpawnSync).toHaveBeenCalledTimes(4);
    });

    /**
     * @testdoc 非保護ブランチの場合に2回の spawnSync を呼ぶ
     */
    it("should call spawnSync 2 times for non-protected branch", () => {
      // 1. branch --show-current
      mockSpawnSync.mockReturnValueOnce(spawnOk("feat/42-feature\n"));
      // 2. log --format (Co-Authored-By check)
      mockSpawnSync.mockReturnValueOnce(spawnOk(""));

      checkMainProtection();
      expect(mockSpawnSync).toHaveBeenCalledTimes(2);
    });

    /**
     * @testdoc 保護ブランチ上の未コミット変更を検出する
     */
    it("should detect uncommitted changes on protected branch", () => {
      mockSpawnSync.mockReturnValueOnce(spawnOk("develop\n"));
      mockSpawnSync.mockReturnValueOnce(spawnOk("M src/index.ts\n"));
      mockSpawnSync.mockReturnValueOnce(spawnOk(""));
      mockSpawnSync.mockReturnValueOnce(spawnOk(""));

      const issues = checkMainProtection();
      expect(issues.some((i: any) => i.message.includes("Uncommitted"))).toBe(true);
    });

    /**
     * @testdoc 直接コミットを検出する
     */
    it("should detect direct commits on protected branch", () => {
      mockSpawnSync.mockReturnValueOnce(spawnOk("main\n"));
      mockSpawnSync.mockReturnValueOnce(spawnOk(""));
      mockSpawnSync.mockReturnValueOnce(spawnOk("abc1234 feat: direct commit\ndef5678 fix: another\n"));
      mockSpawnSync.mockReturnValueOnce(spawnOk(""));

      const issues = checkMainProtection();
      expect(issues.some((i: any) => i.message.includes("2 direct"))).toBe(true);
    });

    /**
     * @testdoc Co-Authored-By を含むコミットを検出する
     */
    it("should detect Co-Authored-By in recent commits", () => {
      mockSpawnSync.mockReturnValueOnce(spawnOk("feat/42-feature\n"));
      // log --format output: hash\0subject\0body\0
      const logOutput = "abc1234567890\0feat: add feature\0Co-Authored-By: User <u@e.com>\0";
      mockSpawnSync.mockReturnValueOnce(spawnOk(logOutput));

      const issues = checkMainProtection();
      expect(issues.some((i: any) => i.rule === "co-authored-by")).toBe(true);
    });
  });
});
