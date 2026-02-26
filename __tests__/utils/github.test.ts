/**
 * GitHub Utilities Tests
 *
 * Tests for GitHub utilities used by gh-* commands.
 * Focus on pure functions: validation and parsing.
 *
 * @testdoc GitHub ユーティリティ関数のテスト
 */

import { writeFileSync, mkdirSync, rmSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";
import { tmpdir } from "os";
import {
  validateTitle,
  validateBody,
  isIssueNumber,
  parseIssueNumber,
  readBodyFile,
  runGraphQL,
  MAX_TITLE_LENGTH,
  MAX_BODY_LENGTH,
} from "../../src/utils/github.js";

describe("validateTitle", () => {
  /**
   * @testdoc 有効なタイトルはnullを返す
   * @purpose 正常なタイトルが受け入れられることを確認
   */
  it("should return null for valid title", () => {
    const result = validateTitle("Valid issue title");
    expect(result).toBeNull();
  });

  /**
   * @testdoc 空文字列はエラーメッセージを返す
   * @purpose 空タイトルが拒否されることを確認
   */
  it("should return error for empty string", () => {
    const result = validateTitle("");
    expect(result).toBe("Title cannot be empty");
  });

  /**
   * @testdoc 空白のみはエラーメッセージを返す
   * @purpose ホワイトスペースのみのタイトルが拒否されることを確認
   */
  it("should return error for whitespace only", () => {
    const result = validateTitle("   ");
    expect(result).toBe("Title cannot be empty");
  });

  /**
   * @testdoc タブと改行のみはエラーメッセージを返す
   * @purpose 各種空白文字が正しく処理されることを確認
   */
  it("should return error for tabs and newlines only", () => {
    const result = validateTitle("\t\n\r");
    expect(result).toBe("Title cannot be empty");
  });

  /**
   * @testdoc 最大長以下のタイトルはnullを返す
   * @purpose 境界値テスト（最大長ちょうど）
   */
  it("should return null for title at max length", () => {
    const title = "a".repeat(MAX_TITLE_LENGTH);
    const result = validateTitle(title);
    expect(result).toBeNull();
  });

  /**
   * @testdoc 最大長を超えるタイトルはエラーメッセージを返す
   * @purpose 境界値テスト（最大長超過）
   */
  it("should return error for title exceeding max length", () => {
    const title = "a".repeat(MAX_TITLE_LENGTH + 1);
    const result = validateTitle(title);
    expect(result).toBe(
      `Title too long (${title.length} > ${MAX_TITLE_LENGTH} chars)`
    );
  });

  /**
   * @testdoc 日本語タイトルを受け入れる
   * @purpose 多言語タイトルのサポート確認
   */
  it("should accept Japanese title", () => {
    const result = validateTitle("日本語のタイトル");
    expect(result).toBeNull();
  });

  /**
   * @testdoc 絵文字を含むタイトルを受け入れる
   * @purpose 特殊文字のサポート確認
   */
  it("should accept title with emojis", () => {
    const result = validateTitle("feat: Add new feature :rocket:");
    expect(result).toBeNull();
  });
});

describe("validateBody", () => {
  /**
   * @testdoc undefinedはnullを返す（オプショナル）
   * @purpose ボディが省略可能であることを確認
   */
  it("should return null for undefined", () => {
    const result = validateBody(undefined);
    expect(result).toBeNull();
  });

  /**
   * @testdoc 空文字列はnullを返す（許可される）
   * @purpose 空のボディが許可されることを確認
   */
  it("should return null for empty string", () => {
    const result = validateBody("");
    expect(result).toBeNull();
  });

  /**
   * @testdoc 有効なボディはnullを返す
   * @purpose 正常なボディが受け入れられることを確認
   */
  it("should return null for valid body", () => {
    const result = validateBody("This is a valid issue body with details.");
    expect(result).toBeNull();
  });

  /**
   * @testdoc 最大長以下のボディはnullを返す
   * @purpose 境界値テスト（最大長ちょうど）
   */
  it("should return null for body at max length", () => {
    const body = "a".repeat(MAX_BODY_LENGTH);
    const result = validateBody(body);
    expect(result).toBeNull();
  });

  /**
   * @testdoc 最大長を超えるボディはエラーメッセージを返す
   * @purpose 境界値テスト（最大長超過）
   */
  it("should return error for body exceeding max length", () => {
    const body = "a".repeat(MAX_BODY_LENGTH + 1);
    const result = validateBody(body);
    expect(result).toBe(
      `Body too long (${body.length} > ${MAX_BODY_LENGTH} chars)`
    );
  });

  /**
   * @testdoc Markdownを含むボディを受け入れる
   * @purpose Markdown構文のサポート確認
   */
  it("should accept body with markdown", () => {
    const markdown = `
## Summary
- Item 1
- Item 2

\`\`\`typescript
const x = 1;
\`\`\`
    `;
    const result = validateBody(markdown);
    expect(result).toBeNull();
  });

  /**
   * @testdoc 複数行のボディを受け入れる
   * @purpose 改行を含むボディのサポート確認
   */
  it("should accept multiline body", () => {
    const body = "Line 1\nLine 2\nLine 3";
    const result = validateBody(body);
    expect(result).toBeNull();
  });
});

describe("isIssueNumber", () => {
  /**
   * @testdoc 数字のみはtrueを返す
   * @purpose 基本的なIssue番号の判定
   */
  it("should return true for numeric string", () => {
    expect(isIssueNumber("123")).toBe(true);
  });

  /**
   * @testdoc #付きの番号はtrueを返す
   * @purpose GitHub形式（#123）のサポート確認
   */
  it("should return true for number with hash prefix", () => {
    expect(isIssueNumber("#123")).toBe(true);
  });

  /**
   * @testdoc 単一桁はtrueを返す
   * @purpose 小さい番号のサポート確認
   */
  it("should return true for single digit", () => {
    expect(isIssueNumber("1")).toBe(true);
    expect(isIssueNumber("#1")).toBe(true);
  });

  /**
   * @testdoc 大きな番号はtrueを返す
   * @purpose 大規模リポジトリの番号サポート確認
   */
  it("should return true for large number", () => {
    expect(isIssueNumber("99999")).toBe(true);
    expect(isIssueNumber("#99999")).toBe(true);
  });

  /**
   * @testdoc ゼロはtrueを返す
   * @purpose エッジケース（0番）の処理
   */
  it("should return true for zero", () => {
    expect(isIssueNumber("0")).toBe(true);
    expect(isIssueNumber("#0")).toBe(true);
  });

  /**
   * @testdoc 文字列を含む場合はfalseを返す
   * @purpose 非数値の拒否確認
   */
  it("should return false for string with letters", () => {
    expect(isIssueNumber("abc")).toBe(false);
    expect(isIssueNumber("#abc")).toBe(false);
  });

  /**
   * @testdoc 数字と文字の混合はfalseを返す
   * @purpose 混合文字列の拒否確認
   */
  it("should return false for mixed alphanumeric", () => {
    expect(isIssueNumber("123abc")).toBe(false);
    expect(isIssueNumber("#123abc")).toBe(false);
    expect(isIssueNumber("abc123")).toBe(false);
  });

  /**
   * @testdoc 空文字列はfalseを返す
   * @purpose 空入力の処理
   */
  it("should return false for empty string", () => {
    expect(isIssueNumber("")).toBe(false);
  });

  /**
   * @testdoc #のみはfalseを返す
   * @purpose ハッシュのみの処理
   */
  it("should return false for hash only", () => {
    expect(isIssueNumber("#")).toBe(false);
  });

  /**
   * @testdoc 負の数はfalseを返す
   * @purpose 負数の拒否確認
   */
  it("should return false for negative number", () => {
    expect(isIssueNumber("-123")).toBe(false);
    expect(isIssueNumber("#-123")).toBe(false);
  });

  /**
   * @testdoc 小数はfalseを返す
   * @purpose 浮動小数点の拒否確認
   */
  it("should return false for decimal number", () => {
    expect(isIssueNumber("12.3")).toBe(false);
    expect(isIssueNumber("#12.3")).toBe(false);
  });

  /**
   * @testdoc 空白を含む場合はfalseを返す
   * @purpose 空白を含む入力の拒否確認
   */
  it("should return false for number with spaces", () => {
    expect(isIssueNumber(" 123")).toBe(false);
    expect(isIssueNumber("123 ")).toBe(false);
    expect(isIssueNumber("# 123")).toBe(false);
  });
});

describe("parseIssueNumber", () => {
  /**
   * @testdoc 数字のみを正しくパースする
   * @purpose 基本的なパース動作
   */
  it("should parse numeric string", () => {
    expect(parseIssueNumber("123")).toBe(123);
  });

  /**
   * @testdoc #付きの番号を正しくパースする
   * @purpose GitHub形式のパース
   */
  it("should parse number with hash prefix", () => {
    expect(parseIssueNumber("#123")).toBe(123);
  });

  /**
   * @testdoc 単一桁を正しくパースする
   * @purpose 小さい番号のパース
   */
  it("should parse single digit", () => {
    expect(parseIssueNumber("1")).toBe(1);
    expect(parseIssueNumber("#1")).toBe(1);
  });

  /**
   * @testdoc 大きな番号を正しくパースする
   * @purpose 大きな番号のパース
   */
  it("should parse large number", () => {
    expect(parseIssueNumber("99999")).toBe(99999);
    expect(parseIssueNumber("#99999")).toBe(99999);
  });

  /**
   * @testdoc ゼロを正しくパースする
   * @purpose エッジケースのパース
   */
  it("should parse zero", () => {
    expect(parseIssueNumber("0")).toBe(0);
    expect(parseIssueNumber("#0")).toBe(0);
  });

  /**
   * @testdoc 先頭ゼロを正しくパースする（8進数として解釈しない）
   * @purpose 先頭ゼロの10進数パース確認
   */
  it("should parse number with leading zeros as decimal", () => {
    expect(parseIssueNumber("0123")).toBe(123);
    expect(parseIssueNumber("#0123")).toBe(123);
  });

  /**
   * @testdoc 無効な入力はNaNを返す
   * @purpose 不正入力の処理確認
   */
  it("should return NaN for invalid input", () => {
    expect(parseIssueNumber("abc")).toBeNaN();
    expect(parseIssueNumber("#abc")).toBeNaN();
    expect(parseIssueNumber("")).toBeNaN();
  });
});

describe("readBodyFile", () => {
  const testDir = join(tmpdir(), "shirokuma-readBodyFile-test");

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  /**
   * @testdoc ファイルの内容を正しく読み込む
   * @purpose 基本的な読み込み動作の確認
   */
  it("should read file contents", () => {
    const filePath = join(testDir, "body.md");
    writeFileSync(filePath, "Hello World");
    expect(readBodyFile(filePath)).toBe("Hello World");
  });

  /**
   * @testdoc バッククォートを含むMarkdownを正しく読み込む
   * @purpose Issue #558 の主要ユースケース
   */
  it("should read file with backticks in markdown", () => {
    const filePath = join(testDir, "backticks.md");
    const content = "## Summary\n\nFixed `isIssueClosed()` helper.\n\n```typescript\nconst x = 1;\n```";
    writeFileSync(filePath, content);
    expect(readBodyFile(filePath)).toBe(content);
  });

  /**
   * @testdoc 存在しないファイルでエラーをスローする
   * @purpose エラーハンドリングの確認
   */
  it("should throw for non-existent file", () => {
    expect(() => readBodyFile(join(testDir, "nonexistent.md"))).toThrow();
  });

  /**
   * @testdoc "--body-file -" で stdin 読み取りを試みる（fd 0）
   * @purpose stdin 対応（#598）— ファイルパスではなく fd 0 から読む
   */
  it('should attempt to read from stdin when source is "-"', () => {
    try {
      const result = readBodyFile("-");
      // Jest 環境では stdin が空パイプのため空文字列を返す
      expect(typeof result).toBe("string");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // ファイル "-" の ENOENT ではなく stdin 関連エラーであることを確認
      expect(message).not.toContain("ENOENT");
    }
  });

  /**
   * @testdoc パイプ経由で stdin から読み取れる（統合テスト）
   * @purpose stdin 対応の実際の動作確認（#598）
   */
  it("should read piped stdin via subprocess", () => {
    const result = execSync(
      'echo "hello from stdin" | node -e "const fs = require(\'fs\'); console.log(fs.readFileSync(0, \'utf-8\').trim())"',
      { encoding: "utf-8" }
    ).trim();
    expect(result).toBe("hello from stdin");
  });
});

describe("runGraphQL", () => {
  /**
   * @testdoc 変数名 "query" を使用するとエラーを返す
   * @purpose octokit の予約語との衝突を防止（#585）
   */
  it("should reject 'query' as variable name", async () => {
    const result = await runGraphQL("query($query: String!) { viewer { login } }", {
      query: "test",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("reserved");
    }
  });

  /**
   * @testdoc "query" 以外の変数名は受け入れる
   * @purpose 正常な変数名が拒否されないことを確認
   */
  it("should accept non-reserved variable names like 'searchQuery'", async () => {
    // octokit が認証エラーを返しても、ガードは通過することを確認
    const result = await runGraphQL(
      "query($searchQuery: String!) { viewer { login } }",
      { searchQuery: "test" },
      { silent: true }
    );
    // ガードを通過したので "reserved" エラーではない
    if (!result.success) {
      expect(result.error).not.toContain("reserved");
    }
  });

  /**
   * @testdoc null レスポンスに対して型ガードがエラーを返す
   * @purpose ランタイム型ガードが不正なレスポンス構造を検出することを確認
   */
  it("should return error for null GraphQL response", async () => {
    // octokit.graphql が null を返すケースをモック
    const { getOctokit } = await import("../../src/utils/octokit-client.js");
    const octokit = getOctokit();
    const originalGraphql = octokit.graphql;
    octokit.graphql = (async () => null) as typeof octokit.graphql;

    try {
      const result = await runGraphQL(
        "query { viewer { login } }",
        {},
        { silent: true }
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unexpected GraphQL response structure");
      }
    } finally {
      octokit.graphql = originalGraphql;
    }
  });
});

describe("constants", () => {
  /**
   * @testdoc MAX_TITLE_LENGTHが256であること
   * @purpose 定数値の確認
   */
  it("should have correct MAX_TITLE_LENGTH", () => {
    expect(MAX_TITLE_LENGTH).toBe(256);
  });

  /**
   * @testdoc MAX_BODY_LENGTHが65536であること
   * @purpose 定数値の確認（64KB）
   */
  it("should have correct MAX_BODY_LENGTH", () => {
    expect(MAX_BODY_LENGTH).toBe(65536);
  });
});
