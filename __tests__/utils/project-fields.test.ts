/**
 * Project Fields Tests
 *
 * Tests for shared project field operations.
 * Focus on pure functions: field name resolution, option ID resolution, timestamp generation.
 *
 * @testdoc プロジェクトフィールド共通モジュールのテスト
 */

import {
  FIELD_FALLBACKS,
  resolveFieldName,
  generateTimestamp,
  type ProjectField,
} from "../../src/utils/project-fields.js";

describe("FIELD_FALLBACKS", () => {
  /**
   * @testdoc Type フィールドのフォールバックが定義されている
   * @purpose GitHub の予約語に対するフォールバック定義確認
   */
  it("should define fallbacks for Type field", () => {
    expect(FIELD_FALLBACKS["Type"]).toEqual(["Item Type", "ItemType"]);
  });
});

describe("resolveFieldName", () => {
  const projectFields: Record<string, ProjectField> = {
    Status: { id: "f1", type: "SINGLE_SELECT", options: {} },
    Priority: { id: "f2", type: "SINGLE_SELECT", options: {} },
    "Item Type": { id: "f3", type: "SINGLE_SELECT", options: {} },
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
   * @testdoc フォールバック名で解決する
   * @purpose GitHub 予約語のフォールバック解決
   */
  it("should resolve Type to Item Type via fallback", () => {
    expect(resolveFieldName("Type", projectFields)).toBe("Item Type");
  });

  /**
   * @testdoc 見つからない場合は null を返す
   * @purpose 存在しないフィールドのハンドリング
   */
  it("should return null for unknown field", () => {
    expect(resolveFieldName("Unknown", projectFields)).toBeNull();
  });

  /**
   * @testdoc フォールバックも見つからない場合は null を返す
   * @purpose フォールバック全てが不一致の場合
   */
  it("should return null when fallbacks also not found", () => {
    const fields: Record<string, ProjectField> = {
      Status: { id: "f1", type: "SINGLE_SELECT", options: {} },
    };
    expect(resolveFieldName("Type", fields)).toBeNull();
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
   * @testdoc ISO 8601 形式のタイムスタンプを生成する
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
