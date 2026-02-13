/**
 * Frontmatter Validator Tests
 *
 * YAML front matter の解析と検証のテスト
 */

import {
  parseFrontmatter,
  validateFrontmatterField,
  validateDateFormat,
  type ParsedFrontmatter,
} from "../../src/validators/frontmatter.js";

describe("parseFrontmatter", () => {
  /**
   * @testdoc 有効なYAML frontmatterを正しく解析する
   */
  it("should correctly parse valid YAML frontmatter", () => {
    const content = `---
title: My Document
status: Accepted
date: 2025-01-15
tags:
  - typescript
  - react
---

# Content here
`;

    const result = parseFrontmatter(content);

    expect(result.hasFrontmatter).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.title).toBe("My Document");
    expect(result.data?.status).toBe("Accepted");
    expect(result.data?.tags).toEqual(["typescript", "react"]);
  });

  /**
   * @testdoc frontmatterがない場合を正しく処理する
   */
  it("should handle content without frontmatter", () => {
    const content = `# Document

No frontmatter here.
`;

    const result = parseFrontmatter(content);

    expect(result.hasFrontmatter).toBe(false);
    expect(result.data).toBeUndefined();
  });

  /**
   * @testdoc 空のfrontmatterを処理する
   */
  it("should handle empty frontmatter", () => {
    const content = `---
---

# Document
`;

    const result = parseFrontmatter(content);

    expect(result.hasFrontmatter).toBe(true);
    expect(result.data).toEqual({});
  });

  /**
   * @testdoc 不正なYAMLでエラーを返す
   */
  it("should return error for invalid YAML", () => {
    const content = `---
title: "unclosed string
invalid: yaml:here
---

# Document
`;

    const result = parseFrontmatter(content);

    expect(result.hasFrontmatter).toBe(true);
    expect(result.parseError).toBeDefined();
  });

  /**
   * @testdoc 複数行の値を正しく解析する
   */
  it("should correctly parse multiline values", () => {
    const content = `---
description: |
  This is a
  multiline description
---

# Document
`;

    const result = parseFrontmatter(content);

    expect(result.hasFrontmatter).toBe(true);
    expect(result.data?.description).toContain("multiline");
  });

  /**
   * @testdoc frontmatter後のコンテンツを保持する
   */
  it("should preserve content after frontmatter", () => {
    const content = `---
title: Test
---

# Main Content

Body text here.
`;

    const result = parseFrontmatter(content);

    expect(result.content).toContain("# Main Content");
    expect(result.content).toContain("Body text here.");
  });
});

describe("validateFrontmatterField", () => {
  /**
   * @testdoc フィールドが存在し値が許容リストにある場合にsuccessを返す
   */
  it("should return success when field exists and value is in allowed list", () => {
    const data = { status: "Accepted" };
    const field = { name: "status", values: ["Proposed", "Accepted", "Deprecated"] };

    const result = validateFrontmatterField(data, field);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  /**
   * @testdoc フィールドが存在しない場合にerrorを返す
   */
  it("should return error when field does not exist", () => {
    const data = { title: "Test" };
    const field = { name: "status" };

    const result = validateFrontmatterField(data, field);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("status");
  });

  /**
   * @testdoc 値が許容リストにない場合にerrorを返す
   */
  it("should return error when value is not in allowed list", () => {
    const data = { status: "Invalid" };
    const field = { name: "status", values: ["Proposed", "Accepted"] };

    const result = validateFrontmatterField(data, field);

    expect(result.valid).toBe(false);
    expect(result.error).toContain("Invalid");
    expect(result.error).toContain("Proposed");
  });

  /**
   * @testdoc valuesが未定義の場合は存在チェックのみ行う
   */
  it("should only check existence when values is undefined", () => {
    const data = { title: "Any Value Here" };
    const field = { name: "title" };

    const result = validateFrontmatterField(data, field);

    expect(result.valid).toBe(true);
  });

  /**
   * @testdoc 配列フィールドを正しく検証する
   */
  it("should validate array fields correctly", () => {
    const data = { tags: ["typescript", "react"] };
    const field = { name: "tags" };

    const result = validateFrontmatterField(data, field);

    expect(result.valid).toBe(true);
  });
});

describe("validateDateFormat", () => {
  /**
   * @testdoc YYYY-MM-DD形式の日付を正しく検証する
   */
  it("should validate YYYY-MM-DD format correctly", () => {
    expect(validateDateFormat("2025-01-15", "YYYY-MM-DD")).toBe(true);
    expect(validateDateFormat("2025-12-31", "YYYY-MM-DD")).toBe(true);
  });

  /**
   * @testdoc 不正なYYYY-MM-DD形式でfalseを返す
   */
  it("should return false for invalid YYYY-MM-DD format", () => {
    expect(validateDateFormat("15/01/2025", "YYYY-MM-DD")).toBe(false);
    expect(validateDateFormat("2025-1-15", "YYYY-MM-DD")).toBe(false);
    expect(validateDateFormat("2025/01/15", "YYYY-MM-DD")).toBe(false);
    expect(validateDateFormat("invalid", "YYYY-MM-DD")).toBe(false);
  });

  /**
   * @testdoc 境界値の日付を正しく処理する
   */
  it("should handle edge case dates", () => {
    expect(validateDateFormat("2025-13-01", "YYYY-MM-DD")).toBe(false); // Invalid month
    expect(validateDateFormat("2025-00-01", "YYYY-MM-DD")).toBe(false); // Invalid month
    expect(validateDateFormat("2025-01-32", "YYYY-MM-DD")).toBe(false); // Invalid day
    expect(validateDateFormat("2025-02-29", "YYYY-MM-DD")).toBe(false); // 2025 is not leap year
    expect(validateDateFormat("2024-02-29", "YYYY-MM-DD")).toBe(true);  // 2024 is leap year
  });

  /**
   * @testdoc formatが未定義の場合は常にtrueを返す
   */
  it("should return true when format is undefined", () => {
    expect(validateDateFormat("any-value", undefined)).toBe(true);
  });

  /**
   * @testdoc Date型の値も処理する
   */
  it("should handle Date type values", () => {
    const dateObj = new Date("2025-01-15");
    expect(validateDateFormat(dateObj, "YYYY-MM-DD")).toBe(true);
  });
});
