/**
 * workflow-commit-format Rule Tests
 *
 * validateCommitFormat（純粋関数）と checkCommitFormat（simple-git ラッパー）のテスト
 * ESM 環境のため jest.unstable_mockModule + dynamic import を使用。
 *
 * @testdoc コミットフォーマット検証テスト
 */

import { jest } from "@jest/globals";

// =============================================================================
// Mocks (ESM: unstable_mockModule + dynamic import)
// =============================================================================

const mockRaw = jest.fn<(...args: any[]) => Promise<string>>();

jest.unstable_mockModule("simple-git", () => ({
  simpleGit: () => ({
    raw: mockRaw,
  }),
}));

const { validateCommitFormat, checkCommitFormat } = await import(
  "../../../src/lint/rules/workflow-commit-format.js"
);
import type { CommitEntry } from "../../../src/lint/rules/workflow-commit-format.js";

// =============================================================================
// Tests
// =============================================================================

describe("workflow-commit-format", () => {
  describe("validateCommitFormat", () => {
    /**
     * @testdoc 正しい Conventional Commits フォーマットは問題なし
     */
    it("should accept valid conventional commit", () => {
      const commits: CommitEntry[] = [
        { hash: "abc1234", subject: "feat: add login" },
      ];
      expect(validateCommitFormat(commits)).toEqual([]);
    });

    /**
     * @testdoc Issue 参照付きのコミットも有効
     */
    it("should accept commit with issue reference", () => {
      const commits: CommitEntry[] = [
        { hash: "abc1234", subject: "fix: resolve typo (#42)" },
      ];
      expect(validateCommitFormat(commits)).toEqual([]);
    });

    /**
     * @testdoc 不正フォーマットで issue を返す
     */
    it("should return issue for invalid format", () => {
      const commits: CommitEntry[] = [
        { hash: "abc1234", subject: "Add feature without type" },
      ];
      const issues = validateCommitFormat(commits);
      expect(issues).toHaveLength(1);
      expect(issues[0].rule).toBe("commit-format");
    });

    /**
     * @testdoc merge コミットはスキップする
     */
    it("should skip merge commits", () => {
      const commits: CommitEntry[] = [
        { hash: "abc1234", subject: "Merge branch 'develop' into main" },
      ];
      expect(validateCommitFormat(commits)).toEqual([]);
    });

    /**
     * @testdoc subject 行が72文字超の場合に info issue を返す
     */
    it("should return info issue for subject line exceeding 72 characters", () => {
      const longSubject = "feat: " + "a".repeat(80);
      const commits: CommitEntry[] = [{ hash: "abc1234", subject: longSubject }];
      const issues = validateCommitFormat(commits);
      expect(issues.some((i) => i.message.includes("72"))).toBe(true);
    });

    /**
     * @testdoc 72文字ちょうどの subject は問題なし
     */
    it("should accept subject with exactly 72 characters", () => {
      const subject = "feat: " + "a".repeat(66);
      expect(subject.length).toBe(72);
      const commits: CommitEntry[] = [{ hash: "abc1234", subject }];
      const issues = validateCommitFormat(commits);
      expect(issues.filter((i) => i.message.includes("72"))).toHaveLength(0);
    });

    /**
     * @testdoc 未許可タイプで issue を返す
     */
    it("should return issue for disallowed type", () => {
      const commits: CommitEntry[] = [
        { hash: "abc1234", subject: "wip: work in progress" },
      ];
      const issues = validateCommitFormat(commits);
      expect(issues).toHaveLength(1);
    });

    /**
     * @testdoc severity パラメータが反映される
     */
    it("should use provided severity", () => {
      const commits: CommitEntry[] = [
        { hash: "abc1234", subject: "bad commit" },
      ];
      const issues = validateCommitFormat(commits, "error");
      expect(issues[0].type).toBe("error");
    });

    /**
     * @testdoc 長さと形式の両方が不正な場合、両方 issue を返す
     */
    it("should return multiple issues for length and format errors", () => {
      const longBad = "bad: " + "a".repeat(80);
      const commits: CommitEntry[] = [{ hash: "abc1234", subject: longBad }];
      const issues = validateCommitFormat(commits);
      expect(issues).toHaveLength(2);
      expect(issues[0].type).toBe("info"); // 長さ
      expect(issues[1].type).toBe("warning"); // フォーマット
    });
  });

  describe("checkCommitFormat", () => {
    beforeEach(() => {
      mockRaw.mockReset();
    });

    /**
     * @testdoc git log 出力を正しくパースしてコミットを検証する
     */
    it("should parse git log output and validate commits", async () => {
      const stdout = [
        "abc1234567890\0feat: add feature",
        "def5678901234\0fix: fix bug (#42)",
      ].join("\n");

      mockRaw.mockResolvedValue(stdout);

      const issues = await checkCommitFormat();
      expect(issues).toEqual([]);
      expect(mockRaw).toHaveBeenCalledWith(
        ["log", "--format=%H%x00%s", "-20"]
      );
    });

    /**
     * @testdoc checkCommitFormat: git コマンド失敗時に info issue を返す
     */
    it("should return info issue when git command fails", async () => {
      mockRaw.mockRejectedValue(new Error("not a git repo"));

      const issues = await checkCommitFormat();
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("info");
      expect(issues[0].message).toContain("Could not read commit history");
    });

    /**
     * @testdoc checkCommitFormat: 空の結果の場合に info issue を返す
     */
    it("should return info issue when result is empty", async () => {
      mockRaw.mockResolvedValue("");

      const issues = await checkCommitFormat();
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("info");
    });

    /**
     * @testdoc null byte セパレータがない行をスキップする
     */
    it("should skip lines without null byte separator", async () => {
      const stdout = "no-separator-line\nabc1234567890\0feat: valid";
      mockRaw.mockResolvedValue(stdout);

      const issues = await checkCommitFormat();
      expect(issues).toEqual([]);
    });

    /**
     * @testdoc ハッシュを7文字に切り詰める
     */
    it("should truncate hash to 7 characters", async () => {
      const stdout = "abc1234567890abcdef\0bad commit message";
      mockRaw.mockResolvedValue(stdout);

      const issues = await checkCommitFormat();
      expect(issues).toHaveLength(1);
      expect(issues[0].context).toBe("abc1234");
    });

    /**
     * @testdoc 複数コミットを正しくパースする
     */
    it("should parse multiple commits correctly", async () => {
      const stdout = [
        "aaaaaaa1234567\0bad format 1",
        "bbbbbbb1234567\0bad format 2",
        "ccccccc1234567\0feat: valid commit",
      ].join("\n");

      mockRaw.mockResolvedValue(stdout);

      const issues = await checkCommitFormat();
      expect(issues).toHaveLength(2);
    });

    /**
     * @testdoc カスタム count を渡せる
     */
    it("should use custom count parameter", async () => {
      mockRaw.mockResolvedValue("abc1234567890\0feat: test");

      await checkCommitFormat("warning", undefined, 5);
      expect(mockRaw).toHaveBeenCalledWith(
        ["log", "--format=%H%x00%s", "-5"]
      );
    });

    /**
     * @testdoc 空ハッシュの行をスキップする
     */
    it("should skip lines with empty hash after trim", async () => {
      const stdout = "  \0some subject";
      mockRaw.mockResolvedValue(stdout);

      const issues = await checkCommitFormat();
      expect(issues).toEqual([]);
    });
  });
});
