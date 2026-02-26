/**
 * testdoc-min-length Rule Tests
 *
 * Tests for the rule that checks minimum length of @testdoc.
 */

import { testdocMinLengthRule } from "../../../src/lint/rules/testdoc-min-length.js";
import type { TestCaseForLint } from "../../../src/lint/types.js";

describe("testdoc-min-length rule", () => {
  /**
   * @testdoc [testdoc-min-length] ルールメタデータが正しく定義されている
   */
  it("should have correct metadata", () => {
    expect(testdocMinLengthRule.id).toBe("testdoc-min-length");
    expect(testdocMinLengthRule.severity).toBe("info");
    expect(testdocMinLengthRule.description).toBeDefined();
  });

  describe("check", () => {
    /**
     * @testdoc 10文字以上の@testdocはissueを返さない
     */
    it("should not return issue for @testdoc with 10+ characters", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "コンポーネントが正しくレンダリングされる", // 17 chars
      };

      const issues = testdocMinLengthRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc ちょうど10文字の@testdocはissueを返さない
     */
    it("should not return issue for @testdoc with exactly 10 characters", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "1234567890", // exactly 10 chars
      };

      const issues = testdocMinLengthRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc 10文字未満の@testdocはissueを返す
     */
    it("should return issue for @testdoc with less than 10 characters", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "短い説明", // 4 chars
      };

      const issues = testdocMinLengthRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(1);
      expect(issues[0].rule).toBe("testdoc-min-length");
      expect(issues[0].severity).toBe("info");
      expect(issues[0].message).toContain("10");
    });

    /**
     * @testdoc [testdoc-min-length] @testdocがない場合はissueを返さない
     */
    it("should not return issue when @testdoc is missing", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: undefined,
      };

      const issues = testdocMinLengthRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc 空文字の@testdocはissueを返さない（testdoc-requiredの責務）
     */
    it("should not return issue for empty @testdoc", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "",
      };

      const issues = testdocMinLengthRule.check(testCase, [testCase]);

      // Empty is handled by testdoc-required, not min-length
      expect(issues).toHaveLength(0);
    });
  });
});
