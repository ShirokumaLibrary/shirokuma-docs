/**
 * workflow-issue-fields Rule Tests
 *
 * validateIssueFields（純粋関数）と checkIssueFields（async ラッパー）のテスト
 * ESM 環境のため jest.unstable_mockModule + dynamic import を使用。
 *
 * @testdoc Issue フィールド検証テスト
 */

import { jest } from "@jest/globals";

// =============================================================================
// Mocks (ESM: unstable_mockModule + dynamic import)
// =============================================================================

const mockExecFileAsync = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule("../../../src/utils/spawn-async.js", () => ({
  execFileAsync: mockExecFileAsync,
}));

const { validateIssueFields, checkIssueFields } = await import(
  "../../../src/lint/rules/workflow-issue-fields.js"
);
import type { TableJsonResponse } from "../../../src/lint/rules/workflow-issue-fields.js";

// =============================================================================
// Helpers
// =============================================================================

function asyncOk(stdout: string) {
  return Promise.resolve({ stdout, stderr: "", exitCode: 0 });
}

function asyncFail(stderr = "error") {
  return Promise.resolve({ stdout: "", stderr, exitCode: 1 });
}

function makeTableData(
  rows: Array<[number, string, string | null, string | null, string | null]>
): TableJsonResponse {
  return {
    columns: ["number", "title", "status", "priority", "size"],
    rows,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("workflow-issue-fields", () => {
  describe("validateIssueFields", () => {
    /**
     * @testdoc 全フィールドが揃った Issue は有効
     */
    it("should return no issues when all fields are present", () => {
      const data = makeTableData([
        [1, "First Issue", "Backlog", "High", "M"],
        [2, "Second Issue", "In Progress", "Medium", "S"],
      ]);
      expect(validateIssueFields(data)).toEqual([]);
    });

    /**
     * @testdoc priority が欠損している Issue で issue を返す
     */
    it("should return issue for missing priority", () => {
      const data = makeTableData([
        [1, "Missing Priority", "Backlog", null, "M"],
      ]);
      const issues = validateIssueFields(data);
      expect(issues).toHaveLength(1);
      expect(issues[0].rule).toBe("issue-fields");
      expect(issues[0].message).toContain("#1");
      expect(issues[0].message).toContain("priority");
    });

    /**
     * @testdoc size が欠損している Issue で issue を返す
     */
    it("should return issue for missing size", () => {
      const data = makeTableData([
        [1, "Missing Size", "Backlog", "High", null],
      ]);
      const issues = validateIssueFields(data);
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("size");
    });

    /**
     * @testdoc priority と size の両方が欠損で2つの issue を返す
     */
    it("should return two issues when both priority and size are missing", () => {
      const data = makeTableData([
        [1, "Missing Both", "Backlog", null, null],
      ]);
      const issues = validateIssueFields(data);
      expect(issues).toHaveLength(2);
    });

    /**
     * @testdoc Done の Issue はスキップされる
     */
    it("should skip Done issues", () => {
      const data = makeTableData([
        [1, "Done Issue", "Done", null, null],
      ]);
      expect(validateIssueFields(data)).toEqual([]);
    });

    /**
     * @testdoc Released の Issue はスキップされる
     */
    it("should skip Released issues", () => {
      const data = makeTableData([
        [1, "Released Issue", "Released", null, null],
      ]);
      expect(validateIssueFields(data)).toEqual([]);
    });

    /**
     * @testdoc 必須カラムが不足している場合に warning を返す
     */
    it("should return warning for missing required column", () => {
      const data: TableJsonResponse = {
        columns: ["number", "title"],
        rows: [],
      };
      const issues = validateIssueFields(data);
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("warning");
      expect(issues[0].message).toContain("missing");
    });

    /**
     * @testdoc validateIssueFields: カスタム severity が反映される
     */
    it("should use provided severity", () => {
      const data = makeTableData([
        [1, "Missing Priority", "Backlog", null, "M"],
      ]);
      const issues = validateIssueFields(data, "error");
      expect(issues[0].type).toBe("error");
    });

    /**
     * @testdoc 空の rows で issue を返さない
     */
    it("should return no issues for empty rows", () => {
      const data = makeTableData([]);
      expect(validateIssueFields(data)).toEqual([]);
    });
  });

  describe("checkIssueFields", () => {
    beforeEach(() => {
      mockExecFileAsync.mockReset();
    });

    /**
     * @testdoc 正常な JSON 出力を検証する
     */
    it("should validate parsed JSON from CLI output", async () => {
      const data = makeTableData([
        [1, "Issue", "Backlog", "High", "M"],
      ]);
      mockExecFileAsync.mockReturnValue(asyncOk(JSON.stringify(data)));

      const issues = await checkIssueFields();
      expect(issues).toEqual([]);
      expect(mockExecFileAsync).toHaveBeenCalledWith(
        "shirokuma-docs",
        ["issues", "list", "--format", "table-json"],
        expect.objectContaining({ timeout: 30_000 })
      );
    });

    /**
     * @testdoc CLI コマンド失敗時に warning を返す
     */
    it("should return warning when CLI command fails", async () => {
      mockExecFileAsync.mockReturnValue(asyncFail("connection error"));

      const issues = await checkIssueFields();
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("warning");
      expect(issues[0].message).toContain("Failed to fetch");
    });

    /**
     * @testdoc JSON パースエラー時に warning を返す
     */
    it("should return warning for JSON parse error", async () => {
      mockExecFileAsync.mockReturnValue(asyncOk("not-valid-json{"));

      const issues = await checkIssueFields();
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("warning");
      expect(issues[0].message).toContain("Failed to parse");
    });

    /**
     * @testdoc stdout が空の場合に warning を返す
     */
    it("should return warning when stdout is empty", async () => {
      mockExecFileAsync.mockReturnValue(asyncOk(""));

      const issues = await checkIssueFields();
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("warning");
    });

    /**
     * @testdoc stderr の内容がコンテキストに含まれる
     */
    it("should include stderr in context on failure", async () => {
      mockExecFileAsync.mockReturnValue(asyncFail("auth failed"));

      const issues = await checkIssueFields();
      expect(issues[0].context).toBe("auth failed");
    });
  });
});
