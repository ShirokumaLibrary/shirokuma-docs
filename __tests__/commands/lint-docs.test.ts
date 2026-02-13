/**
 * lint-docs コマンドテスト
 *
 * 手動ドキュメント（OVERVIEW.md, ADR等）の存在・構造を検証
 */

import { resolve, join } from "node:path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import {
  checkFileExists,
  checkSections,
  checkDocumentLength,
  checkFrontmatter,
  checkInternalLinks,
  checkFilePattern,
  type DocValidationResult,
  type SectionRule,
  type FrontmatterRule,
} from "../../src/validators/markdown-structure.js";

const TEST_DIR = resolve(process.cwd(), "__tests__/fixtures/lint-docs");

/**
 * テストフィクスチャのセットアップとクリーンアップ
 */
beforeAll(() => {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
});

afterAll(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe("checkFileExists", () => {
  /**
   * @testdoc 存在するファイルでsuccessを返す
   */
  it("should return success for existing file", () => {
    const filePath = join(TEST_DIR, "existing.md");
    writeFileSync(filePath, "# Test");

    const result = checkFileExists(filePath);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * @testdoc 存在しないファイルでerrorを返す
   */
  it("should return error for non-existing file", () => {
    const filePath = join(TEST_DIR, "non-existing.md");

    const result = checkFileExists(filePath);

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe("error");
    expect(result.errors[0].message).toContain("not found");
  });
});

describe("checkSections", () => {
  /**
   * @testdoc 必須セクションが全て存在する場合にsuccessを返す
   */
  it("should return success when all required sections exist", () => {
    const content = `# Project Overview

## Introduction

This is the introduction.

## Features

List of features.
`;
    const rules: SectionRule[] = [
      { pattern: "^# .+$", description: "Main title", required: true },
      { pattern: "^## Introduction$", description: "Introduction section", required: true },
      { pattern: "^## Features$", description: "Features section", required: true },
    ];

    const result = checkSections(content, rules, "test.md");

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * @testdoc 必須セクションが不足している場合にerrorを返す
   */
  it("should return error when required section is missing", () => {
    const content = `# Project Overview

## Introduction

This is the introduction.
`;
    const rules: SectionRule[] = [
      { pattern: "^# .+$", description: "Main title", required: true },
      { pattern: "^## Introduction$", description: "Introduction section", required: true },
      { pattern: "^## Features$", description: "Features section", required: true },
    ];

    const result = checkSections(content, rules, "test.md");

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain("Features section");
  });

  /**
   * @testdoc オプションセクションが不足していてもsuccessを返す
   */
  it("should return success when optional section is missing", () => {
    const content = `# Project Overview

## Introduction

This is the introduction.
`;
    const rules: SectionRule[] = [
      { pattern: "^# .+$", description: "Main title", required: true },
      { pattern: "^## Introduction$", description: "Introduction section", required: true },
      { pattern: "^## Optional$", description: "Optional section", required: false },
    ];

    const result = checkSections(content, rules, "test.md");

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0].message).toContain("Optional section");
  });

  /**
   * @testdoc 正規表現パターンで柔軟にマッチする
   */
  it("should match with flexible regex patterns", () => {
    const content = `# DevMemory システム概要

## 1分で理解するDevMemory

Quick overview.
`;
    const rules: SectionRule[] = [
      { pattern: "^# .+ システム概要$", description: "メインタイトル", required: true },
      { pattern: "^## (1分で理解する|プロジェクトの目的)", description: "サマリー", required: true },
    ];

    const result = checkSections(content, rules, "test.md");

    expect(result.valid).toBe(true);
  });
});

describe("checkDocumentLength", () => {
  /**
   * @testdoc 最小行数を満たす場合にsuccessを返す
   */
  it("should return success when content meets minimum length", () => {
    const content = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\n".repeat(5);

    const result = checkDocumentLength(content, { minLength: 10 }, "test.md");

    expect(result.valid).toBe(true);
  });

  /**
   * @testdoc 最小行数を下回る場合にerrorを返す
   */
  it("should return error when content is below minimum length", () => {
    const content = "Short\n";

    const result = checkDocumentLength(content, { minLength: 100 }, "test.md");

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("100");
  });

  /**
   * @testdoc 最大行数を超える場合にwarningを返す
   */
  it("should return warning when content exceeds maximum length", () => {
    const content = "Line\n".repeat(1000);

    const result = checkDocumentLength(content, { maxLength: 500 }, "test.md");

    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].message).toContain("500");
  });

  /**
   * @testdoc minLengthとmaxLengthの両方をチェックする
   */
  it("should check both minLength and maxLength", () => {
    const content = "Line\n".repeat(50);

    const result = checkDocumentLength(content, { minLength: 10, maxLength: 100 }, "test.md");

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });
});

describe("checkFrontmatter", () => {
  /**
   * @testdoc 有効なfrontmatterでsuccessを返す
   */
  it("should return success for valid frontmatter", () => {
    const content = `---
status: Accepted
date: 2025-01-15
deciders: ["Team A"]
---

# ADR-0001: Use TypeScript
`;
    const rules: FrontmatterRule = {
      required: true,
      fields: [
        { name: "status", values: ["Proposed", "Accepted", "Deprecated"] },
        { name: "date" },
      ],
    };

    const result = checkFrontmatter(content, rules, "adr-0001.md");

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * @testdoc frontmatterが必須だが存在しない場合にerrorを返す
   */
  it("should return error when frontmatter is required but missing", () => {
    const content = `# ADR-0001: Use TypeScript

## Status

Accepted
`;
    const rules: FrontmatterRule = {
      required: true,
      fields: [{ name: "status" }],
    };

    const result = checkFrontmatter(content, rules, "adr-0001.md");

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("frontmatter");
  });

  /**
   * @testdoc 必須フィールドが不足している場合にerrorを返す
   */
  it("should return error when required field is missing", () => {
    const content = `---
date: 2025-01-15
---

# ADR-0001
`;
    const rules: FrontmatterRule = {
      required: true,
      fields: [
        { name: "status", values: ["Proposed", "Accepted", "Deprecated"] },
        { name: "date" },
      ],
    };

    const result = checkFrontmatter(content, rules, "adr-0001.md");

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("status");
  });

  /**
   * @testdoc フィールド値が許容値リストにない場合にerrorを返す
   */
  it("should return error when field value is not in allowed values", () => {
    const content = `---
status: Invalid
date: 2025-01-15
---

# ADR-0001
`;
    const rules: FrontmatterRule = {
      required: true,
      fields: [
        { name: "status", values: ["Proposed", "Accepted", "Deprecated"] },
      ],
    };

    const result = checkFrontmatter(content, rules, "adr-0001.md");

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("Invalid");
  });

  /**
   * @testdoc 日付フォーマットの検証をサポートする
   */
  it("should validate date format", () => {
    const content = `---
date: 2025-01-15
---

# ADR-0001
`;
    const rules: FrontmatterRule = {
      required: true,
      fields: [{ name: "date", format: "YYYY-MM-DD" }],
    };

    const result = checkFrontmatter(content, rules, "adr-0001.md");

    expect(result.valid).toBe(true);
  });

  /**
   * @testdoc 不正な日付フォーマットでerrorを返す
   */
  it("should return error for invalid date format", () => {
    const content = `---
date: 15/01/2025
---

# ADR-0001
`;
    const rules: FrontmatterRule = {
      required: true,
      fields: [{ name: "date", format: "YYYY-MM-DD" }],
    };

    const result = checkFrontmatter(content, rules, "adr-0001.md");

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("date");
  });
});

describe("checkInternalLinks", () => {
  beforeEach(() => {
    // リンクテスト用のファイルを作成
    writeFileSync(join(TEST_DIR, "existing-link.md"), "# Existing");
  });

  /**
   * @testdoc 全ての内部リンクが有効な場合にsuccessを返す
   */
  it("should return success when all internal links are valid", () => {
    const content = `# Document

See [existing link](./existing-link.md) for more info.
`;
    const sourceFile = join(TEST_DIR, "doc.md");
    const result = checkInternalLinks(content, TEST_DIR, sourceFile);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * @testdoc 無効な内部リンクがある場合にerrorを返す
   */
  it("should return error for broken internal links", () => {
    const content = `# Document

See [broken link](./non-existing.md) for more info.
`;
    const sourceFile = join(TEST_DIR, "doc.md");
    const result = checkInternalLinks(content, TEST_DIR, sourceFile);

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("non-existing.md");
  });

  /**
   * @testdoc 外部リンクは検証をスキップする
   */
  it("should skip external links", () => {
    const content = `# Document

See [external](https://example.com) for more info.
`;
    const sourceFile = join(TEST_DIR, "doc.md");
    const result = checkInternalLinks(content, TEST_DIR, sourceFile);

    expect(result.valid).toBe(true);
  });

  /**
   * @testdoc アンカーリンク（#section）も処理する
   */
  it("should handle anchor links", () => {
    const content = `# Document

See [section](#features) for more info.
`;
    const sourceFile = join(TEST_DIR, "doc.md");
    const result = checkInternalLinks(content, TEST_DIR, sourceFile);

    // アンカーリンクはファイル存在チェックをスキップ
    expect(result.valid).toBe(true);
  });
});

describe("checkFilePattern", () => {
  beforeEach(() => {
    const adrDir = join(TEST_DIR, "adr");
    if (!existsSync(adrDir)) {
      mkdirSync(adrDir, { recursive: true });
    }
    writeFileSync(join(adrDir, "0001-use-typescript.md"), "# ADR");
    writeFileSync(join(adrDir, "0002-use-react.md"), "# ADR");
    writeFileSync(join(adrDir, "0003-use-nextjs.md"), "# ADR");
  });

  /**
   * @testdoc パターンに一致するファイルを正しくカウントする
   */
  it("should correctly count files matching pattern", () => {
    const result = checkFilePattern(
      join(TEST_DIR, "adr"),
      "[0-9]{4}-*.md",
      { minCount: 3 },
      "ADR files"
    );

    expect(result.valid).toBe(true);
    expect(result.matchedFiles).toHaveLength(3);
  });

  /**
   * @testdoc 最小ファイル数を下回る場合にerrorを返す
   */
  it("should return error when file count is below minimum", () => {
    const result = checkFilePattern(
      join(TEST_DIR, "adr"),
      "[0-9]{4}-*.md",
      { minCount: 5 },
      "ADR files"
    );

    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toContain("5");
  });

  /**
   * @testdoc パターンにマッチするファイルがない場合を処理する
   */
  it("should handle no matching files", () => {
    const result = checkFilePattern(
      join(TEST_DIR, "adr"),
      "NOMATCH-*.md",
      { minCount: 1 },
      "Non-existing pattern"
    );

    expect(result.valid).toBe(false);
    expect(result.matchedFiles).toHaveLength(0);
  });
});

describe("Integration: Full document validation", () => {
  const overviewContent = `# DevMemory システム概要

## 1分で理解するDevMemory

DevMemoryはAI開発作業記録管理システムです。

## ビジネス価値

- 開発効率の向上
- 知識の蓄積

## 今後の計画

Phase 2を予定。
`;

  beforeEach(() => {
    // OVERVIEW.md を作成
    writeFileSync(join(TEST_DIR, "OVERVIEW.md"), overviewContent);
  });

  /**
   * @testdoc OVERVIEW.mdの完全な検証が正しく動作する
   */
  it("should correctly validate complete OVERVIEW.md", () => {
    const filePath = join(TEST_DIR, "OVERVIEW.md");

    // ファイル存在チェック
    const existsResult = checkFileExists(filePath);
    expect(existsResult.valid).toBe(true);

    // セクションチェック
    const sectionRules: SectionRule[] = [
      { pattern: "^# .+ システム概要$", description: "メインタイトル", required: true },
      { pattern: "^## (1分で理解する|プロジェクトの目的)", description: "サマリー", required: true },
      { pattern: "^## ビジネス価値$", description: "ROI", required: true },
      { pattern: "^## (今後の計画|ロードマップ)$", description: "計画", required: true },
    ];

    const sectionsResult = checkSections(overviewContent, sectionRules, filePath);
    expect(sectionsResult.valid).toBe(true);

    // 長さチェック
    const lengthResult = checkDocumentLength(overviewContent, { minLength: 10, maxLength: 500 }, filePath);
    expect(lengthResult.valid).toBe(true);
  });
});
