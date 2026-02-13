/**
 * duplicate-testdoc Rule Tests
 *
 * Tests for the rule that checks for duplicate @testdoc descriptions.
 */

import { duplicateTestdocRule } from "../../../src/lint/rules/duplicate-testdoc.js";
import type { TestCaseForLint } from "../../../src/lint/types.js";

describe("duplicate-testdoc rule", () => {
  /**
   * @testdoc ルールメタデータが正しく定義されている
   */
  it("should have correct metadata", () => {
    expect(duplicateTestdocRule.id).toBe("duplicate-testdoc");
    expect(duplicateTestdocRule.severity).toBe("error");
    expect(duplicateTestdocRule.description).toBeDefined();
  });

  describe("check", () => {
    /**
     * @testdoc ユニークな@testdocはissueを返さない
     */
    it("should not return issue for unique @testdoc", () => {
      const testCase1: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "コンポーネントがレンダリングされる",
      };

      const testCase2: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should handle click",
        line: 20,
        framework: "jest",
        description: "クリックイベントを処理する",
      };

      const allCases = [testCase1, testCase2];

      const issues1 = duplicateTestdocRule.check(testCase1, allCases);
      const issues2 = duplicateTestdocRule.check(testCase2, allCases);

      expect(issues1).toHaveLength(0);
      expect(issues2).toHaveLength(0);
    });

    /**
     * @testdoc 重複する@testdocはissueを返す
     */
    it("should return issue for duplicate @testdoc", () => {
      const testCase1: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "同じ説明文",
      };

      const testCase2: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should handle click",
        line: 20,
        framework: "jest",
        description: "同じ説明文",
      };

      const allCases = [testCase1, testCase2];

      // First occurrence should not have issue
      const issues1 = duplicateTestdocRule.check(testCase1, allCases);
      // Second (and later) occurrences should have issue
      const issues2 = duplicateTestdocRule.check(testCase2, allCases);

      expect(issues1).toHaveLength(0);
      expect(issues2).toHaveLength(1);
      expect(issues2[0].rule).toBe("duplicate-testdoc");
      expect(issues2[0].severity).toBe("error");
    });

    /**
     * @testdoc 複数ファイル間での重複も検出する
     */
    it("should detect duplicates across files", () => {
      const testCase1: TestCaseForLint = {
        file: "test1.ts",
        describe: "Component1",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "同じ説明文",
      };

      const testCase2: TestCaseForLint = {
        file: "test2.ts",
        describe: "Component2",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "同じ説明文",
      };

      const allCases = [testCase1, testCase2];

      const issues1 = duplicateTestdocRule.check(testCase1, allCases);
      const issues2 = duplicateTestdocRule.check(testCase2, allCases);

      expect(issues1).toHaveLength(0);
      expect(issues2).toHaveLength(1);
    });

    /**
     * @testdoc @testdocがない場合はissueを返さない
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

      const issues = duplicateTestdocRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc 同じテストケース自身との比較で誤検出しない
     */
    it("should not false positive on self comparison", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "ユニークな説明",
      };

      const issues = duplicateTestdocRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc 3つ以上の重複でも正しく検出する
     */
    it("should handle multiple duplicates correctly", () => {
      const testCase1: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "test1",
        line: 10,
        framework: "jest",
        description: "重複説明",
      };

      const testCase2: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "test2",
        line: 20,
        framework: "jest",
        description: "重複説明",
      };

      const testCase3: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "test3",
        line: 30,
        framework: "jest",
        description: "重複説明",
      };

      const allCases = [testCase1, testCase2, testCase3];

      const issues1 = duplicateTestdocRule.check(testCase1, allCases);
      const issues2 = duplicateTestdocRule.check(testCase2, allCases);
      const issues3 = duplicateTestdocRule.check(testCase3, allCases);

      // Only first is original, rest are duplicates
      expect(issues1).toHaveLength(0);
      expect(issues2).toHaveLength(1);
      expect(issues3).toHaveLength(1);
    });
  });
});
