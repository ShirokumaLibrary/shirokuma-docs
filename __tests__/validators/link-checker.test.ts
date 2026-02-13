/**
 * Link Checker Tests
 *
 * Markdown 内部リンクの検証テスト
 */

import { resolve, join } from "node:path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import {
  extractLinks,
  classifyLink,
  resolveRelativePath,
  validateInternalLink,
  type LinkInfo,
  type LinkType,
} from "../../src/validators/link-checker.js";

const TEST_DIR = resolve(process.cwd(), "__tests__/fixtures/link-checker");

beforeAll(() => {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
  // テスト用ファイルを作成
  writeFileSync(join(TEST_DIR, "target.md"), "# Target");
  mkdirSync(join(TEST_DIR, "subdir"), { recursive: true });
  writeFileSync(join(TEST_DIR, "subdir", "nested.md"), "# Nested");
});

afterAll(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe("extractLinks", () => {
  /**
   * @testdoc Markdownリンクを正しく抽出する
   */
  it("should extract markdown links correctly", () => {
    const content = `# Document

See [link1](./file1.md) and [link2](https://example.com).

Also check [link3](/absolute/path.md) and [anchor](#section).
`;

    const links = extractLinks(content);

    expect(links).toHaveLength(4);
    expect(links[0]).toEqual({ text: "link1", url: "./file1.md", line: 3 });
    expect(links[1]).toEqual({ text: "link2", url: "https://example.com", line: 3 });
    expect(links[2]).toEqual({ text: "link3", url: "/absolute/path.md", line: 5 });
    expect(links[3]).toEqual({ text: "anchor", url: "#section", line: 5 });
  });

  /**
   * @testdoc 画像リンクも抽出する
   */
  it("should extract image links", () => {
    const content = `# Document

![image](./images/screenshot.png)
`;

    const links = extractLinks(content);

    expect(links).toHaveLength(1);
    expect(links[0].url).toBe("./images/screenshot.png");
  });

  /**
   * @testdoc リンクがない場合は空配列を返す
   */
  it("should return empty array when no links exist", () => {
    const content = `# Document

No links here.
`;

    const links = extractLinks(content);

    expect(links).toHaveLength(0);
  });

  /**
   * @testdoc 参照形式リンクも抽出する
   */
  it("should extract reference-style links", () => {
    const content = `# Document

See [link][ref1] for more.

[ref1]: ./reference.md
`;

    const links = extractLinks(content);

    // 参照形式の定義部分も抽出
    expect(links.some((l) => l.url === "./reference.md")).toBe(true);
  });

  /**
   * @testdoc 複数行にまたがるリンクを処理する
   */
  it("should handle links on multiple lines", () => {
    const content = `Line 1 [link1](./a.md)
Line 2 [link2](./b.md)
Line 3 [link3](./c.md)`;

    const links = extractLinks(content);

    expect(links).toHaveLength(3);
    expect(links[0].line).toBe(1);
    expect(links[1].line).toBe(2);
    expect(links[2].line).toBe(3);
  });
});

describe("classifyLink", () => {
  /**
   * @testdoc 外部リンクを正しく分類する
   */
  it("should classify external links correctly", () => {
    expect(classifyLink("https://example.com")).toBe("external");
    expect(classifyLink("http://example.com")).toBe("external");
    expect(classifyLink("https://github.com/user/repo")).toBe("external");
  });

  /**
   * @testdoc アンカーリンクを正しく分類する
   */
  it("should classify anchor links correctly", () => {
    expect(classifyLink("#section")).toBe("anchor");
    expect(classifyLink("#features")).toBe("anchor");
  });

  /**
   * @testdoc 相対パスリンクを正しく分類する
   */
  it("should classify relative path links correctly", () => {
    expect(classifyLink("./file.md")).toBe("relative");
    expect(classifyLink("../parent/file.md")).toBe("relative");
    expect(classifyLink("file.md")).toBe("relative");
    expect(classifyLink("subdir/file.md")).toBe("relative");
  });

  /**
   * @testdoc 絶対パスリンクを正しく分類する
   */
  it("should classify absolute path links correctly", () => {
    expect(classifyLink("/docs/file.md")).toBe("absolute");
    expect(classifyLink("/README.md")).toBe("absolute");
  });

  /**
   * @testdoc メールリンクを正しく分類する
   */
  it("should classify mailto links correctly", () => {
    expect(classifyLink("mailto:user@example.com")).toBe("external");
  });

  /**
   * @testdoc アンカー付きの相対リンクを処理する
   */
  it("should handle relative links with anchors", () => {
    expect(classifyLink("./file.md#section")).toBe("relative");
    expect(classifyLink("file.md#heading")).toBe("relative");
  });
});

describe("resolveRelativePath", () => {
  /**
   * @testdoc 同一ディレクトリの相対パスを解決する
   */
  it("should resolve relative path in same directory", () => {
    const result = resolveRelativePath(
      "./target.md",
      "/docs/source.md",
      "/docs"
    );

    expect(result).toBe("/docs/target.md");
  });

  /**
   * @testdoc 親ディレクトリへの相対パスを解決する
   */
  it("should resolve relative path to parent directory", () => {
    const result = resolveRelativePath(
      "../other.md",
      "/docs/subdir/source.md",
      "/docs"
    );

    expect(result).toBe("/docs/other.md");
  });

  /**
   * @testdoc サブディレクトリへの相対パスを解決する
   */
  it("should resolve relative path to subdirectory", () => {
    const result = resolveRelativePath(
      "./subdir/nested.md",
      "/docs/source.md",
      "/docs"
    );

    expect(result).toBe("/docs/subdir/nested.md");
  });

  /**
   * @testdoc アンカーを保持しながらパスを解決する
   */
  it("should preserve anchor while resolving path", () => {
    const result = resolveRelativePath(
      "./target.md#section",
      "/docs/source.md",
      "/docs"
    );

    expect(result).toBe("/docs/target.md");
  });
});

describe("validateInternalLink", () => {
  /**
   * @testdoc 存在するファイルへのリンクをvalidとする
   */
  it("should validate existing file link as valid", () => {
    const link: LinkInfo = { text: "target", url: "./target.md", line: 1 };

    const result = validateInternalLink(link, TEST_DIR, join(TEST_DIR, "source.md"));

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  /**
   * @testdoc 存在しないファイルへのリンクをinvalidとする
   */
  it("should validate non-existing file link as invalid", () => {
    const link: LinkInfo = { text: "missing", url: "./missing.md", line: 1 };

    const result = validateInternalLink(link, TEST_DIR, join(TEST_DIR, "source.md"));

    expect(result.valid).toBe(false);
    expect(result.error).toContain("missing.md");
  });

  /**
   * @testdoc サブディレクトリ内のファイルリンクを検証する
   */
  it("should validate link to file in subdirectory", () => {
    const link: LinkInfo = { text: "nested", url: "./subdir/nested.md", line: 1 };

    const result = validateInternalLink(link, TEST_DIR, join(TEST_DIR, "source.md"));

    expect(result.valid).toBe(true);
  });

  /**
   * @testdoc アンカーリンクは常にvalidとする
   */
  it("should always validate anchor links as valid", () => {
    const link: LinkInfo = { text: "section", url: "#features", line: 1 };

    const result = validateInternalLink(link, TEST_DIR, join(TEST_DIR, "source.md"));

    expect(result.valid).toBe(true);
  });

  /**
   * @testdoc 外部リンクはスキップする
   */
  it("should skip external links", () => {
    const link: LinkInfo = { text: "external", url: "https://example.com", line: 1 };

    const result = validateInternalLink(link, TEST_DIR, join(TEST_DIR, "source.md"));

    expect(result.valid).toBe(true);
    expect(result.skipped).toBe(true);
  });
});
