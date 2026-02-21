/**
 * workflow-commit-format Rule Tests
 *
 * validateCommitFormat（純粋関数）と checkCommitFormat（spawnSync ラッパー）のテスト
 * ESM 環境のため jest.unstable_mockModule + dynamic import を使用。
 *
 * @testdoc コミットフォーマット検証テスト
 */

import { jest } from "@jest/globals";

// =============================================================================
// Mocks (ESM: unstable_mockModule + dynamic import)
// =============================================================================

const mockSpawnSync = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule("node:child_process", () => ({
  spawnSync: mockSpawnSync,
}));

const { validateCommitFormat, checkCommitFormat } = await import(
  "../../../src/lint/rules/workflow-commit-format.js"
);
import type { CommitEntry } from "../../../src/lint/rules/workflow-commit-format.js";

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

describe("workflow-commit-format", () => {
  describe("validateCommitFormat", () => {
    /**
     * @testdoc Conventional Commits に準拠したコミットは有効
     */
    it("should accept valid conventional commits", () => {
      const commits: CommitEntry[] = [
        { hash: "abc1234", subject: "feat: add login feature" },
        { hash: "def5678", subject: "fix: resolve null pointer (#42)" },
        { hash: "ghi9012", subject: "docs: update README" },
      ];
      expect(validateCommitFormat(commits)).toEqual([]);
    });

    /**
     * @testdoc スコープ付き Conventional Commits は有効
     */
    it("should accept commits with scope", () => {
      const commits: CommitEntry[] = [
        { hash: "abc1234", subject: "feat(auth): add OAuth support" },
        { hash: "def5678", subject: "fix(ui): button alignment" },
      ];
      expect(validateCommitFormat(commits)).toEqual([]);
    });

    /**
     * @testdoc マージコミットはスキップされる
     */
    it("should skip merge commits", () => {
      const commits: CommitEntry[] = [
        { hash: "abc1234", subject: "Merge branch 'feature' into develop" },
        { hash: "def5678", subject: "Merge pull request #42 from user/branch" },
      ];
      expect(validateCommitFormat(commits)).toEqual([]);
    });

    /**
     * @testdoc 72文字を超える件名で info issue を返す
     */
    it("should return info issue for subject exceeding 72 characters", () => {
      const longSubject = "feat: " + "a".repeat(70);
      const commits: CommitEntry[] = [
        { hash: "abc1234", subject: longSubject },
      ];
      const issues = validateCommitFormat(commits);
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("info");
      expect(issues[0].rule).toBe("commit-format");
      expect(issues[0].message).toContain("72 characters");
    });

    /**
     * @testdoc 非 Conventional Commits 形式で warning を返す
     */
    it("should return warning for non-conventional format", () => {
      const commits: CommitEntry[] = [
        { hash: "abc1234", subject: "added a new feature" },
      ];
      const issues = validateCommitFormat(commits);
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("warning");
      expect(issues[0].rule).toBe("commit-format");
    });

    /**
     * @testdoc 未知のコミットタイプで warning を返す
     */
    it("should return warning for unknown commit type", () => {
      const commits: CommitEntry[] = [
        { hash: "abc1234", subject: "wip: work in progress" },
      ];
      const issues = validateCommitFormat(commits);
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("wip");
      expect(issues[0].message).toContain("unknown type");
    });

    /**
     * @testdoc validateCommitFormat: カスタム severity が反映される
     */
    it("should use provided severity", () => {
      const commits: CommitEntry[] = [
        { hash: "abc1234", subject: "bad commit message" },
      ];
      const issues = validateCommitFormat(commits, "error");
      expect(issues[0].type).toBe("error");
    });

    /**
     * @testdoc カスタム許可タイプを使用できる
     */
    it("should accept custom allowed types", () => {
      const commits: CommitEntry[] = [
        { hash: "abc1234", subject: "wip: work in progress" },
      ];
      const issues = validateCommitFormat(commits, "warning", [
        "feat",
        "wip",
      ]);
      expect(issues).toEqual([]);
    });

    /**
     * @testdoc 空の配列で issue を返さない
     */
    it("should return no issues for empty array", () => {
      expect(validateCommitFormat([])).toEqual([]);
    });

    /**
     * @testdoc 長い件名 + 非 Conventional 形式で2つの issue を返す
     */
    it("should return multiple issues for long non-conventional subject", () => {
      const commits: CommitEntry[] = [
        { hash: "abc1234", subject: "a".repeat(80) },
      ];
      const issues = validateCommitFormat(commits);
      expect(issues).toHaveLength(2);
      expect(issues[0].type).toBe("info"); // 長さ
      expect(issues[1].type).toBe("warning"); // フォーマット
    });
  });

  describe("checkCommitFormat", () => {
    beforeEach(() => {
      mockSpawnSync.mockReset();
    });

    /**
     * @testdoc git log 出力を正しくパースしてコミットを検証する
     */
    it("should parse git log output and validate commits", () => {
      const stdout = [
        "abc1234567890\0feat: add feature",
        "def5678901234\0fix: fix bug (#42)",
      ].join("\n");

      mockSpawnSync.mockReturnValue(spawnOk(stdout));

      const issues = checkCommitFormat();
      expect(issues).toEqual([]);
      expect(mockSpawnSync).toHaveBeenCalledWith(
        "git",
        ["log", "--format=%H%x00%s", "-20"],
        expect.objectContaining({ encoding: "utf-8" })
      );
    });

    /**
     * @testdoc checkCommitFormat: git コマンド失敗時に info issue を返す
     */
    it("should return info issue when git command fails", () => {
      mockSpawnSync.mockReturnValue(spawnFail());

      const issues = checkCommitFormat();
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("info");
      expect(issues[0].message).toContain("Could not read commit history");
    });

    /**
     * @testdoc checkCommitFormat: stdout が空の場合に info issue を返す
     */
    it("should return info issue when stdout is empty", () => {
      mockSpawnSync.mockReturnValue(spawnOk(""));

      const issues = checkCommitFormat();
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("info");
    });

    /**
     * @testdoc null byte セパレータがない行をスキップする
     */
    it("should skip lines without null byte separator", () => {
      const stdout = "no-separator-line\nabc1234567890\0feat: valid";
      mockSpawnSync.mockReturnValue(spawnOk(stdout));

      const issues = checkCommitFormat();
      expect(issues).toEqual([]);
    });

    /**
     * @testdoc ハッシュを7文字に切り詰める
     */
    it("should truncate hash to 7 characters", () => {
      const stdout = "abc1234567890abcdef\0bad commit message";
      mockSpawnSync.mockReturnValue(spawnOk(stdout));

      const issues = checkCommitFormat();
      expect(issues).toHaveLength(1);
      expect(issues[0].context).toBe("abc1234");
    });

    /**
     * @testdoc 複数コミットを正しくパースする
     */
    it("should parse multiple commits correctly", () => {
      const stdout = [
        "aaaaaaa1234567\0bad format 1",
        "bbbbbbb1234567\0bad format 2",
        "ccccccc1234567\0feat: valid commit",
      ].join("\n");

      mockSpawnSync.mockReturnValue(spawnOk(stdout));

      const issues = checkCommitFormat();
      expect(issues).toHaveLength(2);
    });

    /**
     * @testdoc カスタム count を渡せる
     */
    it("should use custom count parameter", () => {
      mockSpawnSync.mockReturnValue(spawnOk("abc1234567890\0feat: test"));

      checkCommitFormat("warning", undefined, 5);
      expect(mockSpawnSync).toHaveBeenCalledWith(
        "git",
        ["log", "--format=%H%x00%s", "-5"],
        expect.anything()
      );
    });

    /**
     * @testdoc 空ハッシュの行をスキップする
     */
    it("should skip lines with empty hash after trim", () => {
      const stdout = "  \0some subject";
      mockSpawnSync.mockReturnValue(spawnOk(stdout));

      const issues = checkCommitFormat();
      expect(issues).toEqual([]);
    });
  });
});
