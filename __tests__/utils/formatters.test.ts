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
