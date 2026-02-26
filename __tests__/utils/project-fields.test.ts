/**
 * Project Fields Tests
 *
 * Tests for shared project field operations.
 * Focus on pure functions: field name resolution, option ID resolution, timestamp generation.
 *
 * @testdoc プロジェクトフィールド共通モジュールのテスト
 */

import {
  resolveFieldName,
  generateTimestamp,
  type ProjectField,
} from "../../src/utils/project-fields.js";

describe("resolveFieldName", () => {
  const projectFields: Record<string, ProjectField> = {
    Status: { id: "f1", type: "SINGLE_SELECT", options: {} },
    Priority: { id: "f2", type: "SINGLE_SELECT", options: {} },
    Notes: { id: "f4", type: "TEXT", options: {} },
  };

  /**
   * @testdoc 完全一致するフィールド名を返す
   * @purpose 基本的なフィールド名解決
   */
  it("should return exact match", () => {
    expect(resolveFieldName("Status", projectFields)).toBe("Status");
    expect(resolveFieldName("Priority", projectFields)).toBe("Priority");
  });

  /**
   * @testdoc 見つからない場合は null を返す
   * @purpose 存在しないフィールドのハンドリング
   */
  it("should return null for unknown field", () => {
    expect(resolveFieldName("Unknown", projectFields)).toBeNull();
  });

  /**
   * @testdoc フォールバック定義がないフィールドで一致しない場合は null
   * @purpose フォールバックなしフィールドの処理
   */
  it("should return null for field without fallbacks when not found", () => {
    expect(resolveFieldName("CustomField", projectFields)).toBeNull();
  });
});

describe("generateTimestamp", () => {
  /**
   * @testdoc [project-fields] ISO 8601 形式のタイムスタンプを生成する
   * @purpose タイムスタンプフォーマット確認
   */
  it("should generate ISO 8601 timestamp with timezone", () => {
    const ts = generateTimestamp();
    // Format: YYYY-MM-DDTHH:MM:SS+HH:MM or YYYY-MM-DDTHH:MM:SS-HH:MM
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  /**
   * @testdoc 現在時刻に近いタイムスタンプを返す
   * @purpose タイムスタンプの正確性
   */
  it("should return timestamp close to current time", () => {
    const ts = generateTimestamp();
    const parsed = new Date(ts);
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - parsed.getTime());
    // Within 2 seconds
    expect(diffMs).toBeLessThan(2000);
  });
});
