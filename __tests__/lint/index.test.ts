/**
 * Lint Index Tests
 *
 * Tests for the main lint orchestration logic.
 */

import { runLint } from "../../src/lint/index.js";
import type { TestCaseForLint, LintOptions } from "../../src/lint/types.js";

describe("runLint", () => {
  const defaultOptions: LintOptions = {
    strict: false,
    coverageThreshold: 0,
    enabledRules: ["testdoc-required", "testdoc-japanese", "testdoc-min-length", "duplicate-testdoc", "describe-coverage"],
  };

  /**
   * @testdoc 空のテストケース配列で正しいレポートを返す
   */
  it("should return correct report for empty test cases", () => {
    const report = runLint([], defaultOptions);

    expect(report.results).toHaveLength(0);
    expect(report.summary.totalFiles).toBe(0);
    expect(report.summary.totalTests).toBe(0);
    expect(report.summary.coverage).toBe(0);
    expect(report.passed).toBe(true);
  });

  /**
   * @testdoc @testdocがあるテストでissueなしのレポートを返す
   */
  it("should return no issues for tests with @testdoc", () => {
    const testCases: TestCaseForLint[] = [
      {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "コンポーネントが正しくレンダリングされる",
      },
    ];

    const report = runLint(testCases, defaultOptions);

    expect(report.results).toHaveLength(1);
    expect(report.results[0].issues).toHaveLength(0);
    expect(report.summary.coverage).toBe(100);
    expect(report.passed).toBe(true);
  });

  /**
   * @testdoc @testdocがないテストでwarningを返す
   */
  it("should return warning for tests without @testdoc", () => {
    const testCases: TestCaseForLint[] = [
      {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: undefined,
      },
    ];

    const report = runLint(testCases, defaultOptions);

    expect(report.results[0].issues.length).toBeGreaterThan(0);
    expect(report.summary.warningCount).toBeGreaterThan(0);
    expect(report.summary.coverage).toBe(0);
    // Without strict mode, warnings don't fail
    expect(report.passed).toBe(true);
  });

  /**
   * @testdoc strictモードではwarningで失敗する
   */
  it("should fail on warnings in strict mode", () => {
    const testCases: TestCaseForLint[] = [
      {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: undefined,
      },
    ];

    const strictOptions = { ...defaultOptions, strict: true };
    const report = runLint(testCases, strictOptions);

    expect(report.passed).toBe(false);
  });

  /**
   * @testdoc 重複@testdocはerrorを返す
   */
  it("should return error for duplicate @testdoc", () => {
    const testCases: TestCaseForLint[] = [
      {
        file: "test.ts",
        describe: "MyComponent",
        it: "test1",
        line: 10,
        framework: "jest",
        description: "同じ説明",
      },
      {
        file: "test.ts",
        describe: "MyComponent",
        it: "test2",
        line: 20,
        framework: "jest",
        description: "同じ説明",
      },
    ];

    const report = runLint(testCases, defaultOptions);

    expect(report.summary.errorCount).toBe(1);
    expect(report.passed).toBe(false);
  });

  /**
   * @testdoc カバレッジ閾値を下回ると失敗する
   */
  it("should fail when coverage is below threshold", () => {
    const testCases: TestCaseForLint[] = [
      {
        file: "test.ts",
        describe: "MyComponent",
        it: "test1",
        line: 10,
        framework: "jest",
        description: "説明あり",
      },
      {
        file: "test.ts",
        describe: "MyComponent",
        it: "test2",
        line: 20,
        framework: "jest",
        description: undefined,
      },
    ];

    const thresholdOptions = { ...defaultOptions, coverageThreshold: 80 };
    const report = runLint(testCases, thresholdOptions);

    expect(report.summary.coverage).toBe(50);
    expect(report.passed).toBe(false);
  });

  /**
   * @testdoc カバレッジ閾値を満たすと成功する
   */
  it("should pass when coverage meets threshold", () => {
    const testCases: TestCaseForLint[] = [
      {
        file: "test.ts",
        describe: "MyComponent",
        it: "test1",
        line: 10,
        framework: "jest",
        description: "説明あり",
      },
      {
        file: "test.ts",
        describe: "MyComponent",
        it: "test2",
        line: 20,
        framework: "jest",
        description: "説明あり2",
      },
    ];

    const thresholdOptions = { ...defaultOptions, coverageThreshold: 80 };
    const report = runLint(testCases, thresholdOptions);

    expect(report.summary.coverage).toBe(100);
    expect(report.passed).toBe(true);
  });

  /**
   * @testdoc 複数ファイルのテストを正しく集計する
   */
  it("should aggregate tests from multiple files", () => {
    const testCases: TestCaseForLint[] = [
      {
        file: "test1.ts",
        describe: "Component1",
        it: "test1",
        line: 10,
        framework: "jest",
        description: "説明1",
      },
      {
        file: "test2.ts",
        describe: "Component2",
        it: "test2",
        line: 10,
        framework: "playwright",
        description: "説明2",
      },
    ];

    const report = runLint(testCases, defaultOptions);

    expect(report.results).toHaveLength(2);
    expect(report.summary.totalFiles).toBe(2);
    expect(report.summary.totalTests).toBe(2);
  });

  /**
   * @testdoc 無効化されたルールは適用されない
   */
  it("should not apply disabled rules", () => {
    const testCases: TestCaseForLint[] = [
      {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: undefined,
      },
    ];

    const noRulesOptions: LintOptions = {
      ...defaultOptions,
      enabledRules: [], // No rules enabled
    };

    const report = runLint(testCases, noRulesOptions);

    // No issues because no rules are enabled
    expect(report.results[0].issues).toHaveLength(0);
  });

  /**
   * @testdoc 英語のみの@testdocでtestdoc-japaneseルールがwarningを出す
   */
  it("should warn for English-only @testdoc", () => {
    const testCases: TestCaseForLint[] = [
      {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "Component renders correctly",
      },
    ];

    const report = runLint(testCases, defaultOptions);

    const japaneseIssues = report.results[0].issues.filter(
      (i) => i.rule === "testdoc-japanese"
    );
    expect(japaneseIssues).toHaveLength(1);
  });

  /**
   * @testdoc 短い@testdocでtestdoc-min-lengthルールがinfoを出す
   */
  it("should info for short @testdoc", () => {
    const testCases: TestCaseForLint[] = [
      {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "短い", // 2 chars
      },
    ];

    const report = runLint(testCases, defaultOptions);

    const minLengthIssues = report.results[0].issues.filter(
      (i) => i.rule === "testdoc-min-length"
    );
    expect(minLengthIssues).toHaveLength(1);
    expect(minLengthIssues[0].severity).toBe("info");
  });
});
