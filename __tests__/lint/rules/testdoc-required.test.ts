/**
 * testdoc-required Rule Tests
 *
 * Tests for the rule that checks if tests have @testdoc comments.
 */

import { testdocRequiredRule } from "../../../src/lint/rules/testdoc-required.js";
import type { TestCaseForLint } from "../../../src/lint/types.js";

describe("testdoc-required rule", () => {
  /**
   * @testdoc [testdoc-required] ルールメタデータが正しく定義されている
   */
  it("should have correct metadata", () => {
    expect(testdocRequiredRule.id).toBe("testdoc-required");
    expect(testdocRequiredRule.severity).toBe("warning");
    expect(testdocRequiredRule.description).toBeDefined();
  });

  describe("check", () => {
    /**
     * @testdoc @testdocがないテストに対してissueを返す
     */
    it("should return issue for test without @testdoc", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: undefined,
      };

      const issues = testdocRequiredRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(1);
      expect(issues[0].rule).toBe("testdoc-required");
      expect(issues[0].severity).toBe("warning");
      expect(issues[0].message).toContain("@testdoc");
    });

    /**
     * @testdoc @testdocがあるテストにはissueを返さない
     */
    it("should not return issue for test with @testdoc", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "コンポーネントが正しくレンダリングされる",
      };

      const issues = testdocRequiredRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc 空文字の@testdocはissueを返す
     */
    it("should return issue for empty @testdoc", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "",
      };

      const issues = testdocRequiredRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(1);
    });

    /**
     * @testdoc 空白のみの@testdocはissueを返す
     */
    it("should return issue for whitespace-only @testdoc", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "   ",
      };

      const issues = testdocRequiredRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(1);
    });
  });
});
