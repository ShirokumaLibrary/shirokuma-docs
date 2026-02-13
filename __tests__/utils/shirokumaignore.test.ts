/**
 * .shirokumaignore Parser Tests
 *
 * Tests for parsing, loading, and merging exclude patterns
 * from .shirokumaignore files (gitignore-like syntax).
 *
 * @testdoc .shirokumaignoreパーサーのテスト
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseShirokumaIgnore, loadShirokumaIgnoreFile, mergeExcludePatterns } from "../../src/utils/shirokumaignore.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(__dirname, "..", "..", ".test-output", "shirokumaignore");

// ========================================
// Setup / Teardown
// ========================================

beforeEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

// ========================================
// parseShirokumaIgnore
// ========================================

describe("parseShirokumaIgnore", () => {
  /**
   * @testdoc パターン行を正しく抽出する
   * @purpose 基本的なパターン解析の動作確認
   * @expected 各行がパターンとして返される
   */
  it("should parse simple patterns", () => {
    const content = `.claude/
.github/DISCUSSION_TEMPLATE/
docs/internal/`;
    const result = parseShirokumaIgnore(content);
    expect(result).toEqual([
      ".claude/",
      ".github/DISCUSSION_TEMPLATE/",
      "docs/internal/",
    ]);
  });

  /**
   * @testdoc コメント行(#)を無視する
   * @purpose コメント行のスキップ処理確認
   * @expected コメント行はパターンに含まれない
   */
  it("should ignore comment lines", () => {
    const content = `# This is a comment
.claude/
# Another comment
docs/internal/`;
    const result = parseShirokumaIgnore(content);
    expect(result).toEqual([".claude/", "docs/internal/"]);
  });

  /**
   * @testdoc 空行を無視する
   * @purpose 空行のスキップ処理確認
   * @expected 空行はパターンに含まれない
   */
  it("should ignore empty lines", () => {
    const content = `.claude/

docs/internal/

`;
    const result = parseShirokumaIgnore(content);
    expect(result).toEqual([".claude/", "docs/internal/"]);
  });

  /**
   * @testdoc 行の前後の空白をトリムする
   * @purpose 空白文字のトリミング処理確認
   * @expected 前後の空白が除去されたパターンが返される
   */
  it("should trim whitespace from lines", () => {
    const content = `  .claude/
  docs/internal/  `;
    const result = parseShirokumaIgnore(content);
    expect(result).toEqual([".claude/", "docs/internal/"]);
  });

  /**
   * @testdoc 空白のみの行を無視する
   * @purpose 空白文字のみの行のスキップ処理確認
   * @expected 空白のみの行はパターンに含まれない
   */
  it("should ignore whitespace-only lines", () => {
    const content = `.claude/

docs/internal/`;
    const result = parseShirokumaIgnore(content);
    expect(result).toEqual([".claude/", "docs/internal/"]);
  });

  /**
   * @testdoc 空の文字列から空配列を返す
   * @purpose 空入力の処理確認
   * @expected 空配列が返される
   */
  it("should return empty array for empty content", () => {
    const result = parseShirokumaIgnore("");
    expect(result).toEqual([]);
  });

  /**
   * @testdoc コメントと空行のみの場合、空配列を返す
   * @purpose コメント/空行のみの入力処理確認
   * @expected 空配列が返される
   */
  it("should return empty array for content with only comments and empty lines", () => {
    const content = `# Only comments
# and nothing else

`;
    const result = parseShirokumaIgnore(content);
    expect(result).toEqual([]);
  });

  /**
   * @testdoc グロブパターンを正しく解析する
   * @purpose ワイルドカードパターンのサポート確認
   * @expected グロブパターンがそのまま返される
   */
  it("should parse glob patterns", () => {
    const content = `*.test.ts
**/*.spec.ts
coverage/`;
    const result = parseShirokumaIgnore(content);
    expect(result).toEqual(["*.test.ts", "**/*.spec.ts", "coverage/"]);
  });

  /**
   * @testdoc インラインコメントを除去する
   * @purpose スペース+#の後のコメントを除去する動作確認
   * @expected パターン部分のみが返される
   */
  it("should strip inline comments", () => {
    const content = `.claude/ # development config`;
    const result = parseShirokumaIgnore(content);
    expect(result).toEqual([".claude/"]);
  });

  /**
   * @testdoc Windows改行コード(CRLF)を正しく処理する
   * @purpose クロスプラットフォーム対応確認
   * @expected CRLFでも正しくパターンが解析される
   */
  it("should handle Windows line endings (CRLF)", () => {
    const content = ".claude/\r\ndocs/internal/\r\n";
    const result = parseShirokumaIgnore(content);
    expect(result).toEqual([".claude/", "docs/internal/"]);
  });

  /**
   * @testdoc 実際の.shirokumaignoreファイルの内容を正しく解析する
   * @purpose 典型的な使用例での動作確認
   * @expected コメント・空行を除外したパターン配列が返される
   */
  it("should parse a realistic .shirokumaignore file", () => {
    const content = `# .shirokumaignore - Patterns to exclude from public repo releases

# Development tools
.claude/
.vscode/

# GitHub Discussion templates (private)
.github/DISCUSSION_TEMPLATE/

# Internal documentation
docs/internal/

# Test artifacts
coverage/
*.test.snap
`;
    const result = parseShirokumaIgnore(content);
    expect(result).toEqual([
      ".claude/",
      ".vscode/",
      ".github/DISCUSSION_TEMPLATE/",
      "docs/internal/",
      "coverage/",
      "*.test.snap",
    ]);
  });
});

// ========================================
// loadShirokumaIgnoreFile
// ========================================

describe("loadShirokumaIgnoreFile", () => {
  /**
   * @testdoc .shirokumaignoreファイルが存在する場合、パターンを返す
   * @purpose ファイル読み込みの正常系確認
   * @expected ファイル内容が解析されたパターン配列が返される
   */
  it("should load and parse .shirokumaignore file when it exists", () => {
    writeFileSync(join(TEST_DIR, ".shirokumaignore"), `.claude/
# Comment
docs/internal/`);

    const result = loadShirokumaIgnoreFile(TEST_DIR);
    expect(result).toEqual([".claude/", "docs/internal/"]);
  });

  /**
   * @testdoc .shirokumaignoreファイルが存在しない場合、空配列を返す
   * @purpose ファイル不在時のフォールバック確認
   * @expected 空配列が返される
   */
  it("should return empty array when .shirokumaignore does not exist", () => {
    const result = loadShirokumaIgnoreFile(TEST_DIR);
    expect(result).toEqual([]);
  });

  /**
   * @testdoc 空のファイルの場合、空配列を返す
   * @purpose 空ファイルの処理確認
   * @expected 空配列が返される
   */
  it("should return empty array for empty file", () => {
    writeFileSync(join(TEST_DIR, ".shirokumaignore"), "");

    const result = loadShirokumaIgnoreFile(TEST_DIR);
    expect(result).toEqual([]);
  });

  /**
   * @testdoc 存在しないディレクトリパスでも空配列を返す
   * @purpose 無効パスのエラーハンドリング確認
   * @expected エラーは発生せず空配列が返される
   */
  it("should return empty array for non-existent directory", () => {
    const result = loadShirokumaIgnoreFile("/non/existent/path");
    expect(result).toEqual([]);
  });
});

// ========================================
// mergeExcludePatterns
// ========================================

describe("mergeExcludePatterns", () => {
  /**
   * @testdoc 3つのパターンソースをマージする
   * @purpose 基本的なマージ動作確認
   * @expected 全ソースのパターンが結合される
   */
  it("should merge patterns from all three sources", () => {
    const defaults = [".claude/"];
    const config = ["docs/internal/"];
    const file = ["*.test.ts"];

    const result = mergeExcludePatterns(defaults, config, file);
    expect(result).toEqual([".claude/", "docs/internal/", "*.test.ts"]);
  });

  /**
   * @testdoc 重複パターンを排除する
   * @purpose 重複排除の動作確認
   * @expected 同じパターンは1つだけ残る
   */
  it("should deduplicate patterns", () => {
    const defaults = [".claude/", "docs/internal/"];
    const config = [".claude/", ".github/DISCUSSION_TEMPLATE/"];
    const file = ["docs/internal/", "coverage/"];

    const result = mergeExcludePatterns(defaults, config, file);
    expect(result).toEqual([
      ".claude/",
      "docs/internal/",
      ".github/DISCUSSION_TEMPLATE/",
      "coverage/",
    ]);
  });

  /**
   * @testdoc 空の配列でもエラーなくマージする
   * @purpose 空入力の処理確認
   * @expected 空でないソースのパターンのみ返される
   */
  it("should handle empty arrays gracefully", () => {
    const result = mergeExcludePatterns([], [], []);
    expect(result).toEqual([]);
  });

  /**
   * @testdoc 一部のソースのみにパターンがある場合も正しくマージする
   * @purpose 部分的な入力の処理確認
   * @expected 存在するパターンのみが結合される
   */
  it("should handle partially populated sources", () => {
    const defaults = [".claude/"];
    const config: string[] = [];
    const file = ["*.test.ts"];

    const result = mergeExcludePatterns(defaults, config, file);
    expect(result).toEqual([".claude/", "*.test.ts"]);
  });

  /**
   * @testdoc マージ順序: default → config → fileの順で結合される
   * @purpose パターンの順序保証確認
   * @expected 先にdefault、次にconfig、最後にfileの順でパターンが並ぶ
   */
  it("should maintain order: defaults → config → file", () => {
    const defaults = ["a/"];
    const config = ["b/"];
    const file = ["c/"];

    const result = mergeExcludePatterns(defaults, config, file);
    expect(result).toEqual(["a/", "b/", "c/"]);
  });
});
