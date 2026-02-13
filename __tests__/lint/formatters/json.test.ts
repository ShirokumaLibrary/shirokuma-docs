/**
 * JSON Formatter Tests
 *
 * Tests for the JSON output formatter.
 */

import { formatJson } from "../../../src/lint/formatters/json.js";
import type { LintReport } from "../../../src/lint/types.js";

describe("JSON Formatter", () => {
  /**
   * @testdoc 有効なJSON文字列を返す
   */
  it("should return valid JSON string", () => {
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

    const output = formatJson(report);

    expect(() => JSON.parse(output)).not.toThrow();
  });

  /**
   * @testdoc レポートの全フィールドをJSON出力に含める
   */
  it("should include all report fields", () => {
    const report: LintReport = {
      results: [
        {
          file: "test.ts",
          framework: "jest",
          totalTests: 2,
          testsWithTestdoc: 1,
          issues: [
            {
              rule: "testdoc-required",
              severity: "warning",
              message: "Test is missing @testdoc",
              file: "test.ts",
              line: 10,
              testName: "should render",
            },
          ],
        },
      ],
      summary: {
        totalFiles: 1,
        totalTests: 2,
        testsWithTestdoc: 1,
        coverage: 50,
        errorCount: 0,
        warningCount: 1,
        infoCount: 0,
      },
      passed: true,
    };

    const output = formatJson(report);
    const parsed = JSON.parse(output);

    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].file).toBe("test.ts");
    expect(parsed.results[0].issues).toHaveLength(1);
    expect(parsed.summary.coverage).toBe(50);
    expect(parsed.passed).toBe(true);
  });

  /**
   * @testdoc 整形されたJSONを返す（インデント付き）
   */
  it("should return formatted JSON with indentation", () => {
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

    const output = formatJson(report);

    // Should contain newlines (formatted)
    expect(output).toContain("\n");
    // Should contain indentation
    expect(output).toMatch(/^\s{2}/m);
  });

  /**
   * @testdoc 複雑なレポートを正しくシリアライズする
   */
  it("should correctly serialize complex report", () => {
    const report: LintReport = {
      results: [
        {
          file: "test1.ts",
          framework: "jest",
          totalTests: 3,
          testsWithTestdoc: 2,
          issues: [
            {
              rule: "testdoc-required",
              severity: "warning",
              message: "Missing @testdoc",
              file: "test1.ts",
              line: 10,
              testName: "test1",
            },
          ],
        },
        {
          file: "test2.ts",
          framework: "playwright",
          totalTests: 2,
          testsWithTestdoc: 2,
          issues: [
            {
              rule: "duplicate-testdoc",
              severity: "error",
              message: "Duplicate found",
              file: "test2.ts",
              line: 5,
              testName: "test2",
            },
            {
              rule: "testdoc-japanese",
              severity: "warning",
              message: "No Japanese",
              file: "test2.ts",
              line: 15,
              testName: "test3",
            },
          ],
        },
      ],
      summary: {
        totalFiles: 2,
        totalTests: 5,
        testsWithTestdoc: 4,
        coverage: 80,
        errorCount: 1,
        warningCount: 2,
        infoCount: 0,
      },
      passed: false,
    };

    const output = formatJson(report);
    const parsed = JSON.parse(output);

    expect(parsed.results).toHaveLength(2);
    expect(parsed.results[1].issues).toHaveLength(2);
    expect(parsed.summary.errorCount).toBe(1);
    expect(parsed.summary.warningCount).toBe(2);
    expect(parsed.passed).toBe(false);
  });
});
