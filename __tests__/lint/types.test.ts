/**
 * Lint Types Tests
 *
 * Tests for the lint type definitions and utility functions.
 */

import type { Severity, LintIssue, LintResult, LintReport, LintRule } from "../../src/lint/types.js";
import { containsJapanese, severityOrder } from "../../src/lint/types.js";

describe("Lint Types", () => {
  describe("containsJapanese", () => {
    /**
     * @testdoc ひらがなを含むテキストでtrueを返す
     */
    it("should return true for text containing hiragana", () => {
      expect(containsJapanese("これはテストです")).toBe(true);
      expect(containsJapanese("hello あ world")).toBe(true);
    });

    /**
     * @testdoc カタカナを含むテキストでtrueを返す
     */
    it("should return true for text containing katakana", () => {
      expect(containsJapanese("テスト")).toBe(true);
      expect(containsJapanese("hello アイウ world")).toBe(true);
    });

    /**
     * @testdoc 漢字を含むテキストでtrueを返す
     */
    it("should return true for text containing kanji", () => {
      expect(containsJapanese("日本語")).toBe(true);
      expect(containsJapanese("hello 漢字 world")).toBe(true);
    });

    /**
     * @testdoc 日本語を含まないテキストでfalseを返す
     */
    it("should return false for text without Japanese characters", () => {
      expect(containsJapanese("hello world")).toBe(false);
      expect(containsJapanese("test 123")).toBe(false);
      expect(containsJapanese("")).toBe(false);
    });
  });

  describe("severityOrder", () => {
    /**
     * @testdoc severityの順序が正しく定義されている
     */
    it("should have correct severity order", () => {
      expect(severityOrder.error).toBeLessThan(severityOrder.warning);
      expect(severityOrder.warning).toBeLessThan(severityOrder.info);
    });
  });

  describe("LintIssue type", () => {
    /**
     * @testdoc LintIssueが正しい構造を持つ
     */
    it("should have correct structure", () => {
      const issue: LintIssue = {
        rule: "testdoc-required",
        severity: "warning",
        message: "Test is missing @testdoc",
        file: "test.ts",
        line: 10,
        testName: "should do something",
      };

      expect(issue.rule).toBe("testdoc-required");
      expect(issue.severity).toBe("warning");
      expect(issue.message).toBe("Test is missing @testdoc");
      expect(issue.file).toBe("test.ts");
      expect(issue.line).toBe(10);
      expect(issue.testName).toBe("should do something");
    });
  });

  describe("LintResult type", () => {
    /**
     * @testdoc LintResultが正しい構造を持つ
     */
    it("should have correct structure", () => {
      const result: LintResult = {
        file: "test.ts",
        framework: "jest",
        totalTests: 5,
        testsWithTestdoc: 3,
        issues: [],
      };

      expect(result.file).toBe("test.ts");
      expect(result.framework).toBe("jest");
      expect(result.totalTests).toBe(5);
      expect(result.testsWithTestdoc).toBe(3);
      expect(result.issues).toEqual([]);
    });
  });

  describe("LintReport type", () => {
    /**
     * @testdoc LintReportが正しい構造を持つ
     */
    it("should have correct structure", () => {
      const report: LintReport = {
        results: [],
        summary: {
          totalFiles: 0,
          totalTests: 0,
          testsWithTestdoc: 0,
          coverage: 0,
          errorCount: 0,
          warningCount: 0,
          infoCount: 0,
        },
        passed: true,
      };

      expect(report.results).toEqual([]);
      expect(report.summary.totalFiles).toBe(0);
      expect(report.summary.coverage).toBe(0);
      expect(report.passed).toBe(true);
    });
  });
});
