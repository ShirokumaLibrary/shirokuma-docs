/**
 * discussion-templates Command Tests
 *
 * Tests for GitHub Discussion template generation command.
 * This command generates `.github/DISCUSSION_TEMPLATE/` files from
 * Handlebars templates with i18n dictionary support.
 *
 * @testdoc Discussion テンプレート生成コマンドのテスト
 */

import { existsSync, readFileSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Types
// =============================================================================

interface ListLanguagesOutput {
  languages: string[];
  total_count: number;
}

interface GenerateOutput {
  language: string;
  output_directory: string;
  generated: string[];
  errors?: string[];
}

// =============================================================================
// Test Constants
// =============================================================================

const CLI_PATH = join(__dirname, "..", "..", "dist", "index.js");
const TEST_OUTPUT_DIR = join(__dirname, "..", "..", ".test-output", "discussion-templates");

// =============================================================================
// Test Helpers
// =============================================================================

function runCli(args: string[]): { stdout: string; stderr: string; status: number } {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    encoding: "utf-8",
    cwd: join(__dirname, "..", ".."),
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

/**
 * Extract JSON from stdout that may contain log messages
 */
function extractJson<T>(stdout: string): T {
  // Find the first { and last } to extract JSON object
  const firstBrace = stdout.indexOf("{");
  const lastBrace = stdout.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error(`No JSON found in output: ${stdout}`);
  }
  return JSON.parse(stdout.slice(firstBrace, lastBrace + 1)) as T;
}

function setupTestDir(): void {
  if (existsSync(TEST_OUTPUT_DIR)) {
    rmSync(TEST_OUTPUT_DIR, { recursive: true });
  }
  mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
}

function cleanupTestDir(): void {
  if (existsSync(TEST_OUTPUT_DIR)) {
    rmSync(TEST_OUTPUT_DIR, { recursive: true });
  }
}

// =============================================================================
// Tests
// =============================================================================

describe("discussion-templates command", () => {
  beforeEach(() => {
    setupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe("list-languages subcommand", () => {
    /**
     * @testdoc 利用可能な言語を一覧表示する
     * @purpose list-languages サブコマンドが正しく動作することを確認
     */
    it("should list available languages", () => {
      const result = runCli(["discussion-templates", "list-languages"]);

      expect(result.status).toBe(0);
      const output = extractJson<ListLanguagesOutput>(result.stdout);
      expect(output.languages).toContain("en");
      expect(output.languages).toContain("ja");
      expect(output.total_count).toBeGreaterThanOrEqual(2);
    });

    /**
     * @testdoc list サブコマンドも動作する (エイリアス)
     * @purpose list が list-languages のエイリアスとして機能することを確認
     */
    it("should support 'list' as alias for 'list-languages'", () => {
      const result = runCli(["discussion-templates", "list"]);

      expect(result.status).toBe(0);
      const output = extractJson<ListLanguagesOutput>(result.stdout);
      expect(output.languages).toBeInstanceOf(Array);
    });
  });

  describe("generate subcommand", () => {
    /**
     * @testdoc 日本語テンプレートを生成する
     * @purpose generate --lang ja が正しくテンプレートを生成することを確認
     */
    it("should generate Japanese templates", () => {
      const result = runCli([
        "discussion-templates",
        "generate",
        "--lang",
        "ja",
        "--output",
        TEST_OUTPUT_DIR,
      ]);

      expect(result.status).toBe(0);

      const output = extractJson<GenerateOutput>(result.stdout);
      expect(output.language).toBe("ja");
      expect(output.generated).toContain("handovers");
      expect(output.generated).toContain("adr");
      expect(output.generated).toContain("knowledge");
      expect(output.generated).toContain("research");
      expect(output.generated).toContain("reports");

      // Check files exist
      expect(existsSync(join(TEST_OUTPUT_DIR, "handovers.yml"))).toBe(true);
      expect(existsSync(join(TEST_OUTPUT_DIR, "adr.yml"))).toBe(true);
      expect(existsSync(join(TEST_OUTPUT_DIR, "knowledge.yml"))).toBe(true);
      expect(existsSync(join(TEST_OUTPUT_DIR, "research.yml"))).toBe(true);
      expect(existsSync(join(TEST_OUTPUT_DIR, "reports.yml"))).toBe(true);
    });

    /**
     * @testdoc 英語テンプレートを生成する
     * @purpose generate --lang en が正しくテンプレートを生成することを確認
     */
    it("should generate English templates", () => {
      const result = runCli([
        "discussion-templates",
        "generate",
        "--lang",
        "en",
        "--output",
        TEST_OUTPUT_DIR,
      ]);

      expect(result.status).toBe(0);

      const output = extractJson<GenerateOutput>(result.stdout);
      expect(output.language).toBe("en");
      expect(output.generated.length).toBe(5);
    });

    /**
     * @testdoc 生成されたテンプレートが正しいYAML構造を持つ
     * @purpose テンプレートが有効なGitHub Discussion Formsフォーマットであることを確認
     */
    it("should generate valid YAML templates", () => {
      runCli([
        "discussion-templates",
        "generate",
        "--lang",
        "ja",
        "--output",
        TEST_OUTPUT_DIR,
      ]);

      const handoversContent = readFileSync(join(TEST_OUTPUT_DIR, "handovers.yml"), "utf-8");

      // Check YAML structure
      expect(handoversContent).toContain("title:");
      expect(handoversContent).toContain("labels:");
      expect(handoversContent).toContain("body:");
      expect(handoversContent).toContain("type: markdown");
      expect(handoversContent).toContain("type: textarea");

      // Check Japanese content
      expect(handoversContent).toContain("セッション引き継ぎ");
      expect(handoversContent).toContain("概要");
    });

    /**
     * @testdoc 複数行プレースホルダーが正しいインデントを持つ
     * @purpose YAML block literal のインデントが正しいことを確認
     */
    it("should preserve correct YAML indentation for multiline placeholders", () => {
      runCli([
        "discussion-templates",
        "generate",
        "--lang",
        "ja",
        "--output",
        TEST_OUTPUT_DIR,
      ]);

      const handoversContent = readFileSync(join(TEST_OUTPUT_DIR, "handovers.yml"), "utf-8");
      const lines = handoversContent.split("\n");

      // Find placeholder content and verify indentation
      const placeholderIndex = lines.findIndex((l) => l.includes("placeholder: |"));
      if (placeholderIndex >= 0) {
        // Next line should be indented by 8 spaces
        const nextLine = lines[placeholderIndex + 1];
        expect(nextLine.startsWith("        ")).toBe(true);
      }
    });

    /**
     * @testdoc Reports テンプレートが正しいYAML構造を持つ
     * @purpose reports テンプレートが有効な GitHub Discussion Forms フォーマットであることを確認
     */
    it("should generate valid Reports template with dropdown and checkboxes", () => {
      runCli([
        "discussion-templates",
        "generate",
        "--lang",
        "en",
        "--output",
        TEST_OUTPUT_DIR,
      ]);

      const reportsContent = readFileSync(join(TEST_OUTPUT_DIR, "reports.yml"), "utf-8");

      // Check YAML structure
      expect(reportsContent).toContain("title:");
      expect(reportsContent).toContain("type: markdown");
      expect(reportsContent).toContain("type: dropdown");
      expect(reportsContent).toContain("type: textarea");
      expect(reportsContent).toContain("type: checkboxes");

      // Check English content
      expect(reportsContent).toContain("Agent / Manual Report");
      expect(reportsContent).toContain("Report Type");
      expect(reportsContent).toContain("Code Review");
      expect(reportsContent).toContain("Implementation");
    });

    /**
     * @testdoc 存在しない言語を指定するとエラーになる
     * @purpose 無効な言語コードがエラーを返すことを確認
     */
    it("should error for non-existent language", () => {
      const result = runCli([
        "discussion-templates",
        "generate",
        "--lang",
        "xyz",
        "--output",
        TEST_OUTPUT_DIR,
      ]);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Language 'xyz' not found");
    });

    /**
     * @testdoc デフォルト言語は英語
     * @purpose --lang を指定しない場合に英語が使用されることを確認
     */
    it("should default to English language", () => {
      const result = runCli([
        "discussion-templates",
        "generate",
        "--output",
        TEST_OUTPUT_DIR,
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<GenerateOutput>(result.stdout);
      expect(output.language).toBe("en");

      const content = readFileSync(join(TEST_OUTPUT_DIR, "handovers.yml"), "utf-8");
      expect(content).toContain("Session Handover");
    });
  });

  describe("add-language subcommand", () => {
    const TEST_LANG_DIR = join(__dirname, "..", "..", "i18n", "discussion");
    const testLangFile = join(TEST_LANG_DIR, "test-lang.json");

    afterEach(() => {
      // Clean up test language file
      if (existsSync(testLangFile)) {
        rmSync(testLangFile);
      }
    });

    /**
     * @testdoc 新しい言語を追加する
     * @purpose add-language が基本辞書をコピーして新言語ファイルを作成することを確認
     */
    it("should add a new language based on English", () => {
      const result = runCli(["discussion-templates", "add-language", "test-lang"]);

      expect(result.status).toBe(0);
      expect(existsSync(testLangFile)).toBe(true);

      const content = JSON.parse(readFileSync(testLangFile, "utf-8"));
      expect(content.handovers).toBeDefined();
      expect(content.adr).toBeDefined();
      expect(content.knowledge).toBeDefined();
      expect(content.research).toBeDefined();
      expect(content.reports).toBeDefined();
    });

    /**
     * @testdoc add サブコマンドも動作する (エイリアス)
     * @purpose add が add-language のエイリアスとして機能することを確認
     */
    it("should support 'add' as alias for 'add-language'", () => {
      const result = runCli(["discussion-templates", "add", "test-lang"]);

      expect(result.status).toBe(0);
      expect(existsSync(testLangFile)).toBe(true);
    });

    /**
     * @testdoc 既存言語の追加はエラーになる
     * @purpose 既存の言語コードを指定するとエラーになることを確認
     */
    it("should error when language already exists", () => {
      const result = runCli(["discussion-templates", "add-language", "ja"]);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Language 'ja' already exists");
    });

    /**
     * @testdoc 言語コードが指定されていない場合はエラー
     * @purpose 言語コード引数が必須であることを確認
     */
    it("should error when language code is not provided", () => {
      const result = runCli(["discussion-templates", "add-language"]);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Language code required");
    });
  });

  describe("error handling", () => {
    /**
     * @testdoc 不明なアクションはエラーになる
     * @purpose サポートされていないアクションがエラーを返すことを確認
     */
    it("should error for unknown action", () => {
      const result = runCli(["discussion-templates", "invalid-action"]);

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("Unknown action: invalid-action");
      // "Available actions" info is printed to stdout, not stderr
      expect(result.stdout).toContain("Available actions:");
    });
  });
});

describe("discussion-templates template structure", () => {
  describe("Handlebars templates", () => {
    /**
     * @testdoc テンプレートファイルが存在する
     * @purpose 必要なテンプレートファイルがすべて存在することを確認
     */
    it("should have all required template files", () => {
      const templatesDir = join(__dirname, "..", "..", "templates", "discussion");

      expect(existsSync(join(templatesDir, "handovers.yml.hbs"))).toBe(true);
      expect(existsSync(join(templatesDir, "adr.yml.hbs"))).toBe(true);
      expect(existsSync(join(templatesDir, "knowledge.yml.hbs"))).toBe(true);
      expect(existsSync(join(templatesDir, "research.yml.hbs"))).toBe(true);
      expect(existsSync(join(templatesDir, "reports.yml.hbs"))).toBe(true);
    });

    /**
     * @testdoc テンプレートにHandlebars翻訳ヘルパーが含まれている
     * @purpose テンプレートが正しいヘルパー構文を使用していることを確認
     */
    it("should use Handlebars translation helpers", () => {
      const templatesDir = join(__dirname, "..", "..", "templates", "discussion");
      const handoversContent = readFileSync(join(templatesDir, "handovers.yml.hbs"), "utf-8");

      // Check for {{t "key"}} helper usage
      expect(handoversContent).toMatch(/\{\{t\s+"[^"]+"\}\}/);

      // Check for {{ti "key" N}} helper usage (for indented multiline)
      expect(handoversContent).toMatch(/\{\{ti\s+"[^"]+"\s+\d+\}\}/);
    });
  });

  describe("i18n dictionaries", () => {
    /**
     * @testdoc 英語辞書が存在し有効なJSONである
     * @purpose 英語辞書ファイルの存在と形式を確認
     */
    it("should have valid English dictionary", () => {
      const dictPath = join(__dirname, "..", "..", "i18n", "discussion", "en.json");

      expect(existsSync(dictPath)).toBe(true);

      const content = JSON.parse(readFileSync(dictPath, "utf-8"));
      expect(content.handovers).toBeDefined();
      expect(content.handovers.header).toBeDefined();
      expect(content.handovers.header.title).toBe("Session Handover");
    });

    /**
     * @testdoc 日本語辞書が存在し有効なJSONである
     * @purpose 日本語辞書ファイルの存在と形式を確認
     */
    it("should have valid Japanese dictionary", () => {
      const dictPath = join(__dirname, "..", "..", "i18n", "discussion", "ja.json");

      expect(existsSync(dictPath)).toBe(true);

      const content = JSON.parse(readFileSync(dictPath, "utf-8"));
      expect(content.handovers).toBeDefined();
      expect(content.handovers.header).toBeDefined();
      expect(content.handovers.header.title).toBe("セッション引き継ぎ");
    });

    /**
     * @testdoc 英語と日本語の辞書が同じキー構造を持つ
     * @purpose 辞書間のキー一貫性を確認
     */
    it("should have consistent key structure between languages", () => {
      const enDict = JSON.parse(
        readFileSync(join(__dirname, "..", "..", "i18n", "discussion", "en.json"), "utf-8")
      );
      const jaDict = JSON.parse(
        readFileSync(join(__dirname, "..", "..", "i18n", "discussion", "ja.json"), "utf-8")
      );

      // Check top-level keys
      expect(Object.keys(enDict).sort()).toEqual(Object.keys(jaDict).sort());

      // Check nested keys for handovers
      expect(Object.keys(enDict.handovers).sort()).toEqual(Object.keys(jaDict.handovers).sort());

      // Check nested keys for research.nextActions.options
      expect(Object.keys(enDict.research.nextActions.options).sort()).toEqual(
        Object.keys(jaDict.research.nextActions.options).sort()
      );
    });
  });
});

describe("discussion-templates output format", () => {
  describe("list-languages output", () => {
    /**
     * @testdoc list-languages出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document list-languages output structure", () => {
      const expectedOutput = {
        languages: ["en", "ja"],
        total_count: 2,
      };

      expect(expectedOutput.languages).toBeInstanceOf(Array);
      expect(expectedOutput.total_count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("generate output", () => {
    /**
     * @testdoc generate出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document generate output structure", () => {
      const expectedOutput = {
        language: "ja",
        output_directory: ".github/DISCUSSION_TEMPLATE",
        generated: ["handovers", "adr", "knowledge", "research", "reports"],
        errors: undefined,
      };

      expect(expectedOutput.language).toBeDefined();
      expect(expectedOutput.output_directory).toBeDefined();
      expect(expectedOutput.generated).toBeInstanceOf(Array);
    });

    /**
     * @testdoc 部分的なエラー時の出力
     * @purpose 一部テンプレートの生成に失敗した場合の出力を文書化
     */
    it("should document partial error output structure", () => {
      const outputWithErrors = {
        language: "ja",
        output_directory: ".github/DISCUSSION_TEMPLATE",
        generated: ["handovers", "adr"],
        errors: ["knowledge", "research"],
      };

      expect(outputWithErrors.generated).toBeInstanceOf(Array);
      expect(outputWithErrors.errors).toBeInstanceOf(Array);
    });
  });

  describe("add-language output", () => {
    /**
     * @testdoc add-language出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document add-language output structure", () => {
      const expectedOutput = {
        language: "zh",
        file: "/path/to/i18n/discussion/zh.json",
        status: "created",
      };

      expect(expectedOutput.language).toBeDefined();
      expect(expectedOutput.file).toBeDefined();
      expect(expectedOutput.status).toBe("created");
    });
  });
});

describe("discussion-templates GitHub Discussion Forms compatibility", () => {
  /**
   * @testdoc GitHub Discussion Forms仕様に準拠
   * @purpose 生成されるテンプレートがGitHub仕様に準拠することを文書化
   */
  describe("GitHub specification compliance", () => {
    it("should document required template fields", () => {
      const templateStructure = {
        title: "Optional default title",
        labels: "Optional array of labels",
        body: "Required array of form elements",
      };

      expect(templateStructure.body).toBeDefined();
    });

    it("should document supported body element types", () => {
      const supportedTypes = ["markdown", "textarea", "input", "dropdown", "checkboxes"];

      expect(supportedTypes).toContain("markdown");
      expect(supportedTypes).toContain("textarea");
      expect(supportedTypes).toContain("dropdown");
      expect(supportedTypes).toContain("checkboxes");
    });

    it("should document textarea attributes", () => {
      const textareaAttributes = {
        label: "Required field label",
        description: "Optional field description",
        placeholder: "Optional placeholder text",
        value: "Optional default value",
        render: "Optional syntax highlighting language",
      };

      expect(textareaAttributes.label).toBeDefined();
    });
  });
});
