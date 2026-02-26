/**
 * testdoc-japanese Rule Tests
 *
 * Tests for the rule that checks if @testdoc contains Japanese characters.
 */

import { testdocJapaneseRule } from "../../../src/lint/rules/testdoc-japanese.js";
import type { TestCaseForLint } from "../../../src/lint/types.js";

describe("testdoc-japanese rule", () => {
  /**
   * @testdoc [testdoc-japanese] ルールメタデータが正しく定義されている
   */
  it("should have correct metadata", () => {
    expect(testdocJapaneseRule.id).toBe("testdoc-japanese");
    expect(testdocJapaneseRule.severity).toBe("warning");
    expect(testdocJapaneseRule.description).toBeDefined();
  });

  describe("check", () => {
    /**
     * @testdoc 日本語を含む@testdocはissueを返さない
     */
    it("should not return issue for @testdoc with Japanese", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "コンポーネントが正しくレンダリングされる",
      };

      const issues = testdocJapaneseRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc 英語のみの@testdocはissueを返す
     */
    it("should return issue for @testdoc without Japanese", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "Component renders correctly",
      };

      const issues = testdocJapaneseRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(1);
      expect(issues[0].rule).toBe("testdoc-japanese");
      expect(issues[0].severity).toBe("warning");
    });

    /**
     * @testdoc @testdocがない場合はissueを返さない（testdoc-requiredの責務）
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

      const issues = testdocJapaneseRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc ひらがなのみの@testdocはOK
     */
    it("should pass for hiragana-only @testdoc", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "これはてすと",
      };

      const issues = testdocJapaneseRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc カタカナのみの@testdocはOK
     */
    it("should pass for katakana-only @testdoc", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "テスト",
      };

      const issues = testdocJapaneseRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc 漢字のみの@testdocはOK
     */
    it("should pass for kanji-only @testdoc", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "日本語説明",
      };

      const issues = testdocJapaneseRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc 混合テキスト（日本語+英語）はOK
     */
    it("should pass for mixed Japanese and English", () => {
      const testCase: TestCaseForLint = {
        file: "test.ts",
        describe: "MyComponent",
        it: "should render",
        line: 10,
        framework: "jest",
        description: "Component が正しく render される",
      };

      const issues = testdocJapaneseRule.check(testCase, [testCase]);

      expect(issues).toHaveLength(0);
    });
  });
});
