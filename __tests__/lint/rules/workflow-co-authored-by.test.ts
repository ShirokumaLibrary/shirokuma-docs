/**
 * workflow-co-authored-by Rule Tests
 *
 * validateCoAuthoredBy（純粋関数）と checkCoAuthoredBy（simple-git ラッパー）のテスト
 *
 * @testdoc Co-Authored-By 署名検出のテスト
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

const { validateCoAuthoredBy, checkCoAuthoredBy } = await import(
  "../../../src/lint/rules/workflow-co-authored-by.js"
);

type CoAuthoredByCommit = {
  hash: string;
  subject: string;
  body: string;
};

// =============================================================================
// Tests
// =============================================================================

describe("workflow-co-authored-by", () => {
  describe("validateCoAuthoredBy", () => {
    /**
     * @testdoc Co-Authored-By を含まないコミットでは問題を報告しない
     */
    it("should return no issues for commits without Co-Authored-By", () => {
      const commits: CoAuthoredByCommit[] = [
        { hash: "abc1234", subject: "feat: normal commit", body: "Just a body" },
      ];
      expect(validateCoAuthoredBy(commits)).toEqual([]);
    });

    /**
     * @testdoc Co-Authored-By を body に含むコミットを検出する
     */
    it("should detect Co-Authored-By in commit body", () => {
      const commits: CoAuthoredByCommit[] = [
        { hash: "abc1234", subject: "feat: add feature", body: "Co-Authored-By: User <u@e.com>" },
      ];
      const issues = validateCoAuthoredBy(commits);
      expect(issues).toHaveLength(1);
      expect(issues[0].rule).toBe("co-authored-by");
      expect(issues[0].type).toBe("warning");
    });

    /**
     * @testdoc Co-Authored-By を subject に含むコミットも検出する
     */
    it("should detect Co-Authored-By in subject", () => {
      const commits: CoAuthoredByCommit[] = [
        { hash: "abc1234", subject: "feat: add Co-Authored-By: User", body: "" },
      ];
      const issues = validateCoAuthoredBy(commits);
      expect(issues).toHaveLength(1);
      expect(issues[0].rule).toBe("co-authored-by");
    });

    /**
     * @testdoc severity 引数が反映される
     */
    it("should use specified severity", () => {
      const commits: CoAuthoredByCommit[] = [
        { hash: "abc1234", subject: "feat: add feature", body: "Co-Authored-By: User <u@e.com>" },
      ];
      const issues = validateCoAuthoredBy(commits, "error");
      expect(issues[0].type).toBe("error");
    });

    /**
     * @testdoc 空のコミット配列では問題を報告しない
     */
    it("should return no issues for empty commits array", () => {
      expect(validateCoAuthoredBy([])).toEqual([]);
    });
  });

  describe("checkCoAuthoredBy", () => {
    beforeEach(() => {
      mockRaw.mockReset();
    });

    /**
     * @testdoc Co-Authored-By を含むコミットを検出する
     */
    it("should detect Co-Authored-By in recent commits", async () => {
      const logOutput = "abc1234567890\0feat: add feature\0Co-Authored-By: User <u@e.com>\0";
      mockRaw.mockResolvedValue(logOutput);

      const issues = await checkCoAuthoredBy();
      expect(issues.some((i: any) => i.rule === "co-authored-by")).toBe(true);
    });

    /**
     * @testdoc git log 失敗時に空の結果を返す
     */
    it("should return empty issues when git log fails", async () => {
      mockRaw.mockRejectedValue(new Error("git error"));

      const issues = await checkCoAuthoredBy();
      expect(issues).toHaveLength(0);
    });
  });
});
