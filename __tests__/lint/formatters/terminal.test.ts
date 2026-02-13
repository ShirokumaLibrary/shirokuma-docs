/**
 * Terminal Formatter Tests
 *
 * Tests for the terminal output formatter.
 */

import { formatTerminal } from "../../../src/lint/formatters/terminal.js";
import type { LintReport } from "../../../src/lint/types.js";

describe("Terminal Formatter", () => {
  /**
   * @testdoc 空のレポートを正しくフォーマットする
   */
  it("should format empty report", () => {
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

    const output = formatTerminal(report);

    expect(output).toContain("0");
    expect(output).toContain("pass");
  });

  /**
   * @testdoc issueがあるレポートを正しくフォーマットする
   */
  it("should format report with issues", () => {
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

    const output = formatTerminal(report);

    expect(output).toContain("test.ts");
    expect(output).toContain("testdoc-required");
    expect(output).toContain("warning");
    expect(output).toContain("10");
  });

  /**
   * @testdoc カバレッジ率を表示する
   */
  it("should display coverage percentage", () => {
    const report: LintReport = {
      results: [],
      summary: {
        totalFiles: 1,
        totalTests: 10,
        testsWithTestdoc: 8,
        coverage: 80,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
      },
      passed: true,
    };

    const output = formatTerminal(report);

    expect(output).toContain("80%");
  });

  /**
   * @testdoc エラーがある場合は失敗表示する
   */
  it("should show failure for errors", () => {
    const report: LintReport = {
      results: [
        {
          file: "test.ts",
          framework: "jest",
          totalTests: 1,
          testsWithTestdoc: 1,
          issues: [
            {
              rule: "duplicate-testdoc",
              severity: "error",
              message: "Duplicate @testdoc found",
              file: "test.ts",
              line: 10,
              testName: "should render",
            },
          ],
        },
      ],
      summary: {
        totalFiles: 1,
        totalTests: 1,
        testsWithTestdoc: 1,
        coverage: 100,
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
      },
      passed: false,
    };

    const output = formatTerminal(report);

    expect(output).toContain("error");
    expect(output).toContain("fail");
  });

  /**
   * @testdoc 複数ファイルの結果を表示する
   */
  it("should display multiple file results", () => {
    const report: LintReport = {
      results: [
        {
          file: "test1.ts",
          framework: "jest",
          totalTests: 1,
          testsWithTestdoc: 1,
          issues: [],
        },
        {
          file: "test2.ts",
          framework: "playwright",
          totalTests: 2,
          testsWithTestdoc: 2,
          issues: [],
        },
      ],
      summary: {
        totalFiles: 2,
        totalTests: 3,
        testsWithTestdoc: 3,
        coverage: 100,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
      },
      passed: true,
    };

    const output = formatTerminal(report);

    expect(output).toContain("test1.ts");
    expect(output).toContain("test2.ts");
    expect(output).toContain("2"); // 2 files
    expect(output).toContain("3"); // 3 tests
  });
});
