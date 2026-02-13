/**
 * describe-coverage Rule Tests
 *
 * Tests for the rule that reports coverage per describe block.
 */

import { describeCoverageRule } from "../../../src/lint/rules/describe-coverage.js";
import type { TestCaseForLint } from "../../../src/lint/types.js";

describe("describe-coverage rule", () => {
  /**
   * @testdoc ルールメタデータが正しく定義されている
   */
  it("should have correct metadata", () => {
    expect(describeCoverageRule.id).toBe("describe-coverage");
    expect(describeCoverageRule.severity).toBe("info");
    expect(describeCoverageRule.description).toBeDefined();
  });

  describe("check", () => {
    /**
     * @testdoc 全テストに@testdocがあるdescribeはissueを返さない
     */
    it("should not return issue when all tests in describe have @testdoc", () => {
      const testCase1: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "レンダリングテスト",
      };

      const testCase2: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should handle click",
        line: 20,
        framework: "jest",
        description: "クリックテスト",
      };

      const allCases = [testCase1, testCase2];

      // Only check once per describe block
      const issues = describeCoverageRule.check(testCase1, allCases);

      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc 一部のテストに@testdocがないdescribeはinfo issueを返す
     */
    it("should return info issue when some tests miss @testdoc", () => {
      const testCase1: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "レンダリングテスト",
      };

      const testCase2: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should handle click",
        line: 20,
        framework: "jest",
        description: undefined, // No @testdoc
      };

      const allCases = [testCase1, testCase2];

      const issues = describeCoverageRule.check(testCase1, allCases);

      expect(issues).toHaveLength(1);
      expect(issues[0].rule).toBe("describe-coverage");
      expect(issues[0].severity).toBe("info");
      expect(issues[0].message).toContain("50%");
      expect(issues[0].message).toContain("MyComponent");
    });

    /**
     * @testdoc @testdocがないテストケース自体ではissueを返さない（重複防止）
     */
    it("should only report from first test in describe", () => {
      const testCase1: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "レンダリングテスト",
      };

      const testCase2: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should handle click",
        line: 20,
        framework: "jest",
        description: undefined, // No @testdoc
      };

      const allCases = [testCase1, testCase2];

      // Check from second test case should not produce duplicate
      const issues = describeCoverageRule.check(testCase2, allCases);

      // Should return empty because testCase2 is not the first in describe
      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc 複数のdescribeブロックを正しく分けて処理する
     */
    it("should handle multiple describe blocks separately", () => {
      const testCase1: TestCaseForLint = {
        file: "test.ts",
        describe: "Component1",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "テスト1",
      };

      const testCase2: TestCaseForLint = {
        file: "test.ts",
        describe: "Component2",
        it: "should render",
        line: 20,
        framework: "jest",
        description: undefined,
      };

      const allCases = [testCase1, testCase2];

      const issues1 = describeCoverageRule.check(testCase1, allCases);
      const issues2 = describeCoverageRule.check(testCase2, allCases);

      // Component1 has 100% coverage - no issue
      expect(issues1).toHaveLength(0);
      // Component2 has 0% coverage - should have issue
      expect(issues2).toHaveLength(1);
      expect(issues2[0].message).toContain("Component2");
      expect(issues2[0].message).toContain("0%");
    });

    /**
     * @testdoc ネストしたdescribeも正しく処理する
     */
    it("should handle nested describe blocks", () => {
      const testCase1: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent > render",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "レンダリングテスト",
      };

      const testCase2: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent > click",
        it: "should handle click",
        line: 20,
        framework: "jest",
        description: undefined,
      };

      const allCases = [testCase1, testCase2];

      const issues1 = describeCoverageRule.check(testCase1, allCases);
      const issues2 = describeCoverageRule.check(testCase2, allCases);

      expect(issues1).toHaveLength(0);
      expect(issues2).toHaveLength(1);
      expect(issues2[0].message).toContain("MyComponent > click");
    });
  });
});
