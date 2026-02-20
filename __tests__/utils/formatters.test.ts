/**
 * Formatters Tests
 *
 * Tests for Table JSON formatter that reduces token usage for AI agents.
 *
 * @testdoc CLI出力フォーマッタのテスト
 */

import {
  toTableJson,
  formatOutput,
  formatFrontmatter,
  OutputFormat,
  TableJsonOutput,
} from "../../src/utils/formatters.js";

describe("toTableJson", () => {
  /**
   * @testdoc 空配列を正しくフォーマットする
   * @purpose 空配列の場合でも正しい構造を返すことを確認
   */
  it("should format empty array correctly", () => {
    const result = toTableJson([]);

    expect(result.columns).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  /**
   * @testdoc 空配列でも明示的なcolumns指定が保持される
   * @purpose スキーマ情報がデータ不在時でも失われないことを確認
   */
  it("should preserve explicit columns for empty array", () => {
    const result = toTableJson([], ["number", "title", "status"]);

    expect(result.columns).toEqual(["number", "title", "status"]);
    expect(result.rows).toEqual([]);
  });

  /**
   * @testdoc 単一オブジェクトの配列をフォーマットする
   * @purpose 1件のデータを正しくテーブル形式に変換することを確認
   */
  it("should format array with single object", () => {
    const data = [{ number: 19, title: "Fix bug", status: "Backlog" }];

    const result = toTableJson(data);

    expect(result.columns).toEqual(["number", "title", "status"]);
    expect(result.rows).toEqual([[19, "Fix bug", "Backlog"]]);
  });

  /**
   * @testdoc 複数オブジェクトの配列をフォーマットする
   * @purpose 複数件のデータを正しくテーブル形式に変換することを確認
   */
  it("should format array with multiple objects", () => {
    const data = [
      { number: 19, title: "execSync fix", status: "Backlog", priority: "High" },
      { number: 20, title: "zod-schema", status: "Backlog", priority: "Low" },
    ];

    const result = toTableJson(data);

    expect(result.columns).toEqual(["number", "title", "status", "priority"]);
    expect(result.rows).toEqual([
      [19, "execSync fix", "Backlog", "High"],
      [20, "zod-schema", "Backlog", "Low"],
    ]);
  });

  /**
   * @testdoc 指定したカラムのみを含める
   * @purpose columns引数で指定したカラムのみが出力されることを確認
   */
  it("should include only specified columns", () => {
    const data = [
      { number: 19, title: "Fix bug", status: "Backlog", priority: "High", extra: "ignored" },
    ];

    const result = toTableJson(data, ["number", "title", "status"]);

    expect(result.columns).toEqual(["number", "title", "status"]);
    expect(result.rows).toEqual([[19, "Fix bug", "Backlog"]]);
  });

  /**
   * @testdoc カラム順序を保持する
   * @purpose 指定したカラム順序が維持されることを確認
   */
  it("should preserve column order", () => {
    const data = [{ a: 1, b: 2, c: 3 }];

    const result = toTableJson(data, ["c", "a", "b"]);

    expect(result.columns).toEqual(["c", "a", "b"]);
    expect(result.rows).toEqual([[3, 1, 2]]);
  });

  /**
   * @testdoc null/undefinedの値を正しく処理する
   * @purpose 欠損値がnullとして出力されることを確認
   */
  it("should handle null and undefined values", () => {
    const data = [
      { number: 19, title: "Test", status: null },
      { number: 20, title: "Test2", status: undefined },
    ];

    const result = toTableJson(data);

    expect(result.rows).toEqual([
      [19, "Test", null],
      [20, "Test2", null],
    ]);
  });

  /**
   * @testdoc 配列値を文字列に変換する
   * @purpose 配列の値がJSON文字列に変換されることを確認
   */
  it("should convert array values to string", () => {
    const data = [{ number: 19, labels: ["bug", "urgent"] }];

    const result = toTableJson(data);

    expect(result.rows[0][1]).toEqual(["bug", "urgent"]);
  });

  /**
   * @testdoc 存在しないカラムをnullとして処理する
   * @purpose 指定したカラムがオブジェクトに存在しない場合nullになることを確認
   */
  it("should handle missing columns as null", () => {
    const data = [
      { number: 19, title: "Has all" },
      { number: 20 }, // missing title
    ];

    const result = toTableJson(data, ["number", "title"]);

    expect(result.rows).toEqual([
      [19, "Has all"],
      [20, null],
    ]);
  });

  /**
   * @testdoc トークン数削減効果を確認する
   * @purpose Table JSON形式が通常のJSON形式より小さくなることを確認
   */
  it("should reduce token count compared to regular JSON", () => {
    const data = [
      { number: 19, title: "execSync fix", status: "Backlog", priority: "High" },
      { number: 20, title: "zod-schema", status: "Backlog", priority: "Low" },
      { number: 21, title: "table-json", status: "Ready", priority: "Medium" },
    ];

    const regularJson = JSON.stringify({ issues: data });
    const tableJson = JSON.stringify(toTableJson(data));

    // Table JSON should be smaller (fewer repeated keys)
    expect(tableJson.length).toBeLessThan(regularJson.length);
  });
});

describe("formatOutput", () => {
  const testData = {
    repository: "owner/repo",
    issues: [
      { number: 19, title: "Fix bug", status: "Backlog" },
      { number: 20, title: "New feature", status: "Ready" },
    ],
    total_count: 2,
  };

  /**
   * @testdoc json形式で出力する
   * @purpose format=jsonで通常のJSON形式が出力されることを確認
   */
  it('should output regular JSON when format is "json"', () => {
    const result = formatOutput(testData, "json");

    const parsed = JSON.parse(result);
    expect(parsed.repository).toBe("owner/repo");
    expect(parsed.issues).toHaveLength(2);
    expect(parsed.issues[0].number).toBe(19);
  });

  /**
   * @testdoc table-json形式で出力する
   * @purpose format=table-jsonでテーブル形式が出力されることを確認
   */
  it('should output table JSON when format is "table-json"', () => {
    const result = formatOutput(testData, "table-json", {
      arrayKey: "issues",
      columns: ["number", "title", "status"],
    });

    const parsed = JSON.parse(result);
    expect(parsed.repository).toBe("owner/repo");
    expect(parsed.columns).toEqual(["number", "title", "status"]);
    expect(parsed.rows).toEqual([
      [19, "Fix bug", "Backlog"],
      [20, "New feature", "Ready"],
    ]);
    expect(parsed.total_count).toBe(2);
  });

  /**
   * @testdoc arrayKeyが指定されない場合はjsonとして出力する
   * @purpose table-json指定でもarrayKeyがなければ通常JSON出力
   */
  it("should fallback to json when arrayKey not specified for table-json", () => {
    const result = formatOutput(testData, "table-json");

    // Should be valid JSON
    const parsed = JSON.parse(result);
    expect(parsed.issues).toBeDefined();
  });

  /**
   * @testdoc 無効な形式は空文字列を返す
   * @purpose サポートされていないformat値の場合の動作確認
   */
  it("should return empty string for unsupported format", () => {
    const result = formatOutput(testData, "invalid" as OutputFormat);

    expect(result).toBe("");
  });

  /**
   * @testdoc メタデータを保持する
   * @purpose table-json形式でもarrayKey以外のフィールドが保持されることを確認
   */
  it("should preserve metadata fields in table-json format", () => {
    const result = formatOutput(testData, "table-json", {
      arrayKey: "issues",
    });

    const parsed = JSON.parse(result);
    expect(parsed.repository).toBe("owner/repo");
    expect(parsed.total_count).toBe(2);
  });
});

describe("formatFrontmatter", () => {
  /**
   * @testdoc 基本的な frontmatter 形式で出力する
   * @purpose メタデータが YAML frontmatter、body が Markdown として出力されることを確認
   */
  it("should format data as YAML frontmatter with Markdown body", () => {
    const data = {
      number: 803,
      title: "Release 0.2.0-alpha.6",
      body: "## 目的\nユーザーが...",
      state: "OPEN",
      status: "In Progress",
    };

    const result = formatFrontmatter(data);

    expect(result).toContain("---");
    expect(result).toContain("number: 803");
    expect(result).toContain("title: Release 0.2.0-alpha.6");
    expect(result).toContain("state: OPEN");
    expect(result).toContain("status: In Progress");
    // body は frontmatter 外に出力
    expect(result).toContain("## 目的\nユーザーが...");
    // body は frontmatter 内に含まれない
    const frontmatterSection = result.split("---")[1];
    expect(frontmatterSection).not.toContain("body:");
  });

  /**
   * @testdoc null 値のフィールドを省略する
   * @purpose null/undefined は frontmatter に含まれないことを確認
   */
  it("should omit null and undefined values", () => {
    const data = {
      number: 42,
      title: "Test",
      type: null,
      size: undefined,
    };

    const result = formatFrontmatter(data);

    expect(result).toContain("number: 42");
    expect(result).not.toContain("type:");
    expect(result).not.toContain("size:");
  });

  /**
   * @testdoc 配列値を YAML フロー形式で出力する
   * @purpose labels 等の配列が ["item1", "item2"] 形式で出力されることを確認
   */
  it("should format arrays in YAML flow style", () => {
    const data = {
      number: 808,
      labels: ["area:cli", "area:plugin"],
    };

    const result = formatFrontmatter(data);

    expect(result).toContain('labels: ["area:cli", "area:plugin"]');
  });

  /**
   * @testdoc 特殊文字を含む文字列をクォートする
   * @purpose YAML の特殊文字（: # [ ] 等）を含む値がクォートされることを確認
   */
  it("should quote strings with special characters", () => {
    const data = {
      title: "feat: add new feature (#42)",
      status: "In Progress",
    };

    const result = formatFrontmatter(data);

    expect(result).toContain('title: "feat: add new feature (#42)"');
    // "In Progress" は YAML 特殊文字を含まないのでクォート不要
    expect(result).toContain("status: In Progress");
  });

  /**
   * @testdoc body がない場合は frontmatter のみ出力する
   * @purpose body が null/空の場合は --- で閉じて終わることを確認
   */
  it("should output only frontmatter when body is empty or null", () => {
    const data = {
      number: 42,
      title: "Test",
      body: null,
    };

    const result = formatFrontmatter(data);
    const lines = result.split("\n");

    // 最後の行が --- であること（body セクションがない）
    expect(lines[lines.length - 1]).toBe("---");
  });

  /**
   * @testdoc 内部フィールドを除外する
   * @purpose project_item_id, project_id, *_option_id が出力されないことを確認
   */
  it("should exclude internal fields", () => {
    const data = {
      number: 42,
      status: "Backlog",
      project_item_id: "PVTI_xxx",
      project_id: "PVT_xxx",
      status_option_id: "abc123",
      priority_option_id: "def456",
      size_option_id: "ghi789",
    };

    const result = formatFrontmatter(data);

    expect(result).toContain("number: 42");
    expect(result).toContain("status: Backlog");
    expect(result).not.toContain("project_item_id");
    expect(result).not.toContain("project_id");
    expect(result).not.toContain("status_option_id");
    expect(result).not.toContain("priority_option_id");
    expect(result).not.toContain("size_option_id");
  });

  /**
   * @testdoc url / comment_url フィールドを除外する
   * @purpose url と comment_url が frontmatter に含まれないことを確認
   */
  it("should exclude url and comment_url fields", () => {
    const data = {
      number: 42,
      url: "https://github.com/owner/repo/issues/42",
      comment_url: "https://github.com/owner/repo/issues/42#comment",
    };

    const result = formatFrontmatter(data);

    expect(result).toContain("number: 42");
    expect(result).not.toContain("url:");
    expect(result).not.toContain("comment_url:");
  });

  /**
   * @testdoc boolean 値を正しく出力する
   * @purpose true/false がそのまま出力されることを確認
   */
  it("should format boolean values correctly", () => {
    const data = {
      number: 456,
      answer_chosen: false,
    };

    const result = formatFrontmatter(data);

    expect(result).toContain("answer_chosen: false");
  });

  /**
   * @testdoc formatOutput から frontmatter 形式で呼び出せる
   * @purpose formatOutput の format="frontmatter" が formatFrontmatter を呼ぶことを確認
   */
  it("should be accessible via formatOutput with frontmatter format", () => {
    const data = {
      number: 42,
      title: "Test",
      body: "Body content",
    };

    const result = formatOutput(data, "frontmatter");

    expect(result).toContain("---");
    expect(result).toContain("number: 42");
    expect(result).toContain("Body content");
  });
});

describe("TableJsonOutput type", () => {
  /**
   * @testdoc TableJsonOutput型の構造を検証
   * @purpose 型定義が正しい構造を持つことを確認
   */
  it("should have correct structure", () => {
    const output: TableJsonOutput = {
      columns: ["a", "b"],
      rows: [
        [1, "x"],
        [2, "y"],
      ],
    };

    expect(output.columns).toBeInstanceOf(Array);
    expect(output.rows).toBeInstanceOf(Array);
    expect(output.rows[0]).toBeInstanceOf(Array);
  });
});
