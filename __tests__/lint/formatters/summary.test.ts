/**
 * Summary Formatter Tests
 *
 * Tests for the summary output formatter.
 */

import { formatSummary } from "../../../src/lint/formatters/summary.js";
import type { LintReport } from "../../../src/lint/types.js";

describe("Summary Formatter", () => {
  /**
   * @testdoc 基本的な統計情報を表示する
   */
  it("should display basic statistics", () => {
    const report: LintReport = {
      results: [],
      summary: {
        totalFiles: 5,
        totalTests: 20,
        testsWithTestdoc: 15,
        coverage: 75,
        errorCount: 1,
        warningCount: 3,
        infoCount: 2,
      },
      passed: false,
    };

    const output = formatSummary(report);

    expect(output).toContain("5"); // files
    expect(output).toContain("20"); // tests
    expect(output).toContain("75%"); // coverage
    expect(output).toContain("1"); // errors
    expect(output).toContain("3"); // warnings
  });

  /**
   * @testdoc 成功時にpassを表示する
   */
  it("should show pass status when passed", () => {
    const report: LintReport = {
      results: [],
      summary: {
        totalFiles: 1,
        totalTests: 5,
        testsWithTestdoc: 5,
        coverage: 100,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
      },
      passed: true,
    };

    const output = formatSummary(report);

    expect(output.toLowerCase()).toContain("pass");
  });

  /**
   * @testdoc 失敗時にfailを表示する
   */
  it("should show fail status when failed", () => {
    const report: LintReport = {
      results: [],
      summary: {
        totalFiles: 1,
        totalTests: 5,
        testsWithTestdoc: 5,
        coverage: 100,
        errorCount: 1,
        warningCount: 0,
        infoCount: 0,
      },
      passed: false,
    };

    const output = formatSummary(report);

    expect(output.toLowerCase()).toContain("fail");
  });

  /**
   * @testdoc 0%カバレッジを正しく表示する
   */
  it("should display 0% coverage correctly", () => {
    const report: LintReport = {
      results: [],
      summary: {
        totalFiles: 1,
        totalTests: 10,
        testsWithTestdoc: 0,
        coverage: 0,
        errorCount: 0,
        warningCount: 10,
        infoCount: 0,
      },
      passed: true,
    };

    const output = formatSummary(report);

    expect(output).toContain("0%");
  });

  /**
   * @testdoc 100%カバレッジを正しく表示する
   */
  it("should display 100% coverage correctly", () => {
    const report: LintReport = {
      results: [],
      summary: {
        totalFiles: 5,
        totalTests: 50,
        testsWithTestdoc: 50,
        coverage: 100,
        errorCount: 0,
        warningCount: 0,
        infoCount: 0,
      },
      passed: true,
    };

    const output = formatSummary(report);

    expect(output).toContain("100%");
  });

  /**
   * @testdoc 小数点以下のカバレッジを整数に丸める
   */
  it("should round coverage to integer", () => {
    const report: LintReport = {
      results: [],
      summary: {
        totalFiles: 1,
        totalTests: 3,
        testsWithTestdoc: 2,
        coverage: 66.67,
        errorCount: 0,
        warningCount: 1,
        infoCount: 0,
      },
      passed: true,
    };

    const output = formatSummary(report);

    // Should show rounded percentage
    expect(output).toMatch(/6[67]%/);
  });

  /**
   * @testdoc 簡潔な1行サマリーを含む
   */
  it("should include concise one-line summary", () => {
    const report: LintReport = {
      results: [],
      summary: {
        totalFiles: 3,
        totalTests: 15,
        testsWithTestdoc: 12,
        coverage: 80,
        errorCount: 0,
        warningCount: 2,
        infoCount: 1,
      },
      passed: true,
    };

    const output = formatSummary(report);
    const lines = output.trim().split("\n");

    // Should be relatively short
    expect(lines.length).toBeLessThanOrEqual(10);
  });
});
