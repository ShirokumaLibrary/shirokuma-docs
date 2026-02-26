/**
 * Test Annotations Parser Tests
 *
 * Tests for extracting test cases, JSDoc comments, BDD annotations,
 * and describe-level documentation from test files.
 */

import {
  extractTestCases,
  extractTestDocComment,
  extractFileDocComment,
  extractDescribeDocComment,
  parseTestCategory,
  countBraces,
} from "../../src/parsers/test-annotations.js";

describe("test-annotations", () => {
  describe("countBraces", () => {
    /**
     * @testdoc Simple opening brace
     */
    it("should count single opening brace", () => {
      expect(countBraces("{")).toBe(1);
    });

    /**
     * @testdoc Opening and closing braces
     */
    it("should count balanced braces", () => {
      expect(countBraces("{ }")).toBe(0);
    });

    /**
     * @testdoc [test-annotations] Nested braces
     */
    it("should count nested braces", () => {
      expect(countBraces("{ { } }")).toBe(0);
      expect(countBraces("{ {")).toBe(2);
    });

    /**
     * @testdoc Braces in strings ignored
     */
    it("should ignore braces inside strings", () => {
      expect(countBraces('const x = "{ }"')).toBe(0);
      expect(countBraces("const x = '{ }'")).toBe(0);
      expect(countBraces("const x = `{ }`")).toBe(0);
    });

    /**
     * @testdoc Empty line returns 0
     */
    it("should return 0 for empty line", () => {
      expect(countBraces("")).toBe(0);
    });

    /**
     * @testdoc Escaped characters in strings
     */
    it("should handle escaped characters", () => {
      expect(countBraces('const x = "\\"{\\""')).toBe(0);
    });
  });

  describe("parseTestCategory", () => {
    /**
     * @testdoc Happy path categories
     */
    it("should parse happy-path variants", () => {
      expect(parseTestCategory("happy-path")).toBe("happy-path");
      expect(parseTestCategory("success")).toBe("happy-path");
      expect(parseTestCategory("normal")).toBe("happy-path");
      expect(parseTestCategory("正常系")).toBe("happy-path");
    });

    /**
     * @testdoc Auth categories
     */
    it("should parse auth variants", () => {
      expect(parseTestCategory("auth")).toBe("auth");
      expect(parseTestCategory("authentication")).toBe("auth");
      expect(parseTestCategory("authorization")).toBe("auth");
      expect(parseTestCategory("認証")).toBe("auth");
      expect(parseTestCategory("認可")).toBe("auth");
    });

    /**
     * @testdoc Error handling categories
     */
    it("should parse error-handling variants", () => {
      expect(parseTestCategory("error")).toBe("error-handling");
      expect(parseTestCategory("error-handling")).toBe("error-handling");
      expect(parseTestCategory("エラー")).toBe("error-handling");
    });

    /**
     * @testdoc Validation categories
     */
    it("should parse validation variants", () => {
      expect(parseTestCategory("validation")).toBe("validation");
      expect(parseTestCategory("バリデーション")).toBe("validation");
      expect(parseTestCategory("検証")).toBe("validation");
    });

    /**
     * @testdoc Edge-case categories
     */
    it("should parse edge-case variants", () => {
      expect(parseTestCategory("edge")).toBe("edge-case");
      expect(parseTestCategory("boundary")).toBe("edge-case");
      expect(parseTestCategory("edge-case")).toBe("edge-case");
      expect(parseTestCategory("エッジケース")).toBe("edge-case");
      expect(parseTestCategory("境界値")).toBe("edge-case");
    });

    /**
     * @testdoc Unknown category defaults to other
     */
    it("should return 'other' for unknown categories", () => {
      expect(parseTestCategory("unknown")).toBe("other");
      expect(parseTestCategory("random")).toBe("other");
    });

    /**
     * @testdoc Case insensitive
     */
    it("should be case insensitive", () => {
      expect(parseTestCategory("AUTH")).toBe("auth");
      expect(parseTestCategory("Validation")).toBe("validation");
    });
  });

  describe("extractTestDocComment", () => {
    /**
     * @testdoc Basic testdoc extraction
     */
    it("should extract @testdoc from JSDoc", () => {
      const lines = [
        "/**",
        " * @testdoc ユーザーを作成する",
        " */",
        'it("should create user", () => {});',
      ];
      const result = extractTestDocComment(lines, 3);
      expect(result).not.toBeNull();
      expect(result!.testdoc).toBe("ユーザーを作成する");
    });

    /**
     * @testdoc Multiple tags extraction
     */
    it("should extract multiple tags", () => {
      const lines = [
        "/**",
        " * @testdoc テスト説明",
        " * @purpose テスト目的",
        " * @precondition 前提条件",
        " * @expected 期待結果",
        " */",
        'it("test", () => {});',
      ];
      const result = extractTestDocComment(lines, 6);
      expect(result).not.toBeNull();
      expect(result!.testdoc).toBe("テスト説明");
      expect(result!.purpose).toBe("テスト目的");
      expect(result!.precondition).toBe("前提条件");
      expect(result!.expected).toBe("期待結果");
    });

    /**
     * @testdoc BDD annotations
     */
    it("should extract BDD annotations", () => {
      const lines = [
        "/**",
        " * @given ユーザーが存在する",
        " * @when ログインする",
        " * @then ダッシュボードが表示される",
        " * @and メッセージが表示される",
        " */",
        'it("login flow", () => {});',
      ];
      const result = extractTestDocComment(lines, 6);
      expect(result).not.toBeNull();
      expect(result!.bdd).toBeDefined();
      expect(result!.bdd!.given).toBe("ユーザーが存在する");
      expect(result!.bdd!.when).toBe("ログインする");
      expect(result!.bdd!.then).toBe("ダッシュボードが表示される");
      expect(result!.bdd!.and).toEqual(["メッセージが表示される"]);
    });

    /**
     * @testdoc Category tag extraction
     */
    it("should extract @testCategory", () => {
      const lines = [
        "/**",
        " * @testCategory auth",
        " */",
        'it("test", () => {});',
      ];
      const result = extractTestDocComment(lines, 3);
      expect(result).not.toBeNull();
      expect(result!.category).toBe("auth");
    });

    /**
     * @testdoc App tag extraction
     */
    it("should extract @app tag", () => {
      const lines = [
        "/**",
        " * @testdoc テスト",
        " * @app admin",
        " */",
        'it("test", () => {});',
      ];
      const result = extractTestDocComment(lines, 4);
      expect(result).not.toBeNull();
      expect(result!.app).toBe("admin");
    });

    /**
     * @testdoc Skip reason extraction
     */
    it("should extract @skip-reason tag", () => {
      const lines = [
        "/**",
        " * @skip-reason CI環境で不安定",
        " */",
        'it.skip("test", () => {});',
      ];
      const result = extractTestDocComment(lines, 3);
      expect(result).not.toBeNull();
      expect(result!.skipReason).toBe("CI環境で不安定");
    });

    /**
     * @testdoc No JSDoc returns null
     */
    it("should return null when no JSDoc present", () => {
      const lines = [
        'const x = 1;',
        'it("test", () => {});',
      ];
      const result = extractTestDocComment(lines, 1);
      expect(result).toBeNull();
    });

    /**
     * @testdoc Empty JSDoc returns null
     */
    it("should return null for JSDoc without relevant tags", () => {
      const lines = [
        "/**",
        " * Just a description",
        " */",
        'it("test", () => {});',
      ];
      const result = extractTestDocComment(lines, 3);
      expect(result).toBeNull();
    });
  });

  describe("extractFileDocComment", () => {
    /**
     * @testdoc File-level doc extraction
     */
    it("should extract @testFileDoc from file header", () => {
      const content = `/**
 * @testFileDoc Server Actions テスト
 * @module actions
 * @coverage lib/actions
 */

describe("test", () => {});`;
      const result = extractFileDocComment(content);
      expect(result).not.toBeNull();
      expect(result!.description).toBe("Server Actions テスト");
      expect(result!.module).toBe("actions");
      expect(result!.coverage).toBe("lib/actions");
    });

    /**
     * @testdoc App tag in file header
     */
    it("should extract @app from file header", () => {
      const content = `/**
 * @testFileDoc テスト
 * @app admin
 */`;
      const result = extractFileDocComment(content);
      expect(result).not.toBeNull();
      expect(result!.app).toBe("admin");
    });

    /**
     * @testdoc No file doc returns null
     */
    it("should return null when no file doc present", () => {
      const content = `import { something } from "somewhere";
describe("test", () => {});`;
      const result = extractFileDocComment(content);
      expect(result).toBeNull();
    });

    /**
     * @testdoc JSDoc without relevant tags returns null
     */
    it("should return null for JSDoc without testFileDoc tags", () => {
      const content = `/**
 * Just a description without tags
 */
describe("test", () => {});`;
      const result = extractFileDocComment(content);
      expect(result).toBeNull();
    });
  });

  describe("extractDescribeDocComment", () => {
    /**
     * @testdoc Describe group doc extraction
     */
    it("should extract @testGroupDoc from describe", () => {
      const lines = [
        "/**",
        " * @testGroupDoc ユーザー管理テスト",
        " * @purpose CRUD操作の検証",
        " */",
        'describe("UserManagement", () => {',
      ];
      const result = extractDescribeDocComment(lines, 4);
      expect(result).not.toBeNull();
      expect(result!.testdoc).toBe("ユーザー管理テスト");
      expect(result!.purpose).toBe("CRUD操作の検証");
    });

    /**
     * @testdoc Priority extraction
     */
    it("should extract @priority", () => {
      const lines = [
        "/**",
        " * @testGroupDoc テスト",
        " * @priority high",
        " */",
        'describe("test", () => {',
      ];
      const result = extractDescribeDocComment(lines, 4);
      expect(result).not.toBeNull();
      expect(result!.priority).toBe("high");
    });

    /**
     * @testdoc No describe doc returns null
     */
    it("should return null when no doc present", () => {
      const lines = [
        'const x = 1;',
        'describe("test", () => {',
      ];
      const result = extractDescribeDocComment(lines, 1);
      expect(result).toBeNull();
    });
  });

  describe("extractTestCases", () => {
    /**
     * @testdoc Simple test extraction
     */
    it("should extract simple test cases", () => {
      const content = `
describe("UserService", () => {
  it("should create user", () => {
    expect(true).toBe(true);
  });

  it("should delete user", () => {
    expect(true).toBe(true);
  });
});`;
      const cases = extractTestCases(content, "test.ts", "jest");
      expect(cases).toHaveLength(2);
      expect(cases[0].describe).toBe("UserService");
      expect(cases[0].it).toBe("should create user");
      expect(cases[1].it).toBe("should delete user");
    });

    /**
     * @testdoc Nested describe extraction
     */
    it("should handle nested describes", () => {
      const content = `
describe("outer", () => {
  describe("inner", () => {
    it("test", () => {});
  });
});`;
      const cases = extractTestCases(content, "test.ts", "jest");
      expect(cases).toHaveLength(1);
      expect(cases[0].describe).toBe("outer > inner");
    });

    /**
     * @testdoc Test with JSDoc annotation
     */
    it("should extract JSDoc annotations from test cases", () => {
      const content = `
describe("test", () => {
  /**
   * @testdoc ユーザーを作成する
   */
  it("should create user", () => {});
});`;
      const cases = extractTestCases(content, "test.ts", "jest");
      expect(cases).toHaveLength(1);
      expect(cases[0].description).toBe("ユーザーを作成する");
    });

    /**
     * @testdoc Skipped test detection
     */
    it("should detect skipped tests", () => {
      const content = `
describe("test", () => {
  it.skip("skipped test", () => {});
  it("normal test", () => {});
});`;
      const cases = extractTestCases(content, "test.ts", "jest");
      expect(cases).toHaveLength(2);
      expect(cases[0].skipped).toBe(true);
      expect(cases[1].skipped).toBeUndefined();
    });

    /**
     * @testdoc Playwright test.describe support
     */
    it("should handle test.describe syntax", () => {
      const content = `
test.describe("E2E test", () => {
  test("should load page", async ({ page }) => {});
});`;
      const cases = extractTestCases(content, "test.spec.ts", "playwright");
      expect(cases).toHaveLength(1);
      expect(cases[0].describe).toBe("E2E test");
      expect(cases[0].framework).toBe("playwright");
    });

    /**
     * @testdoc Line numbers
     */
    it("should capture correct line numbers", () => {
      const content = `describe("test", () => {
  it("first", () => {});
  it("second", () => {});
});`;
      const cases = extractTestCases(content, "test.ts", "jest");
      expect(cases[0].line).toBe(2);
      expect(cases[1].line).toBe(3);
    });

    /**
     * @testdoc Test outside describe
     */
    it("should handle tests outside describe blocks", () => {
      const content = `it("standalone test", () => {});`;
      const cases = extractTestCases(content, "standalone.test.ts", "jest");
      expect(cases).toHaveLength(1);
      // Falls back to filename-based describe
      expect(cases[0].describe).toBe("standalone");
    });
  });
});
