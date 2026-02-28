/**
 * Project Fields Tests
 *
 * Tests for shared project field operations.
 * Focus on pure functions: field name resolution, option ID resolution, timestamp generation.
 * Also tests setItemFields field-type dispatching with mocked GraphQL.
 *
 * @testdoc プロジェクトフィールド共通モジュールのテスト
 */

import { jest } from "@jest/globals";

// =============================================================================
// Mocks (ESM: unstable_mockModule + dynamic import)
// =============================================================================

const mockRunGraphQL = jest.fn<(...args: any[]) => Promise<any>>();

jest.unstable_mockModule("../../src/utils/github.js", () => ({
  runGraphQL: mockRunGraphQL,
  // Re-export non-mocked symbols that project-fields.ts might need at import time
  parseGitRemoteUrl: jest.fn(),
  getOwner: jest.fn(),
  getRepoName: jest.fn(),
  getRepoInfo: jest.fn(),
  diagnoseRepoFailure: jest.fn(),
  validateTitle: jest.fn(),
  validateBody: jest.fn(),
  readBodyFile: jest.fn(),
  isIssueNumber: jest.fn(),
  parseIssueNumber: jest.fn(),
  checkGitHubAuth: jest.fn(),
  MAX_TITLE_LENGTH: 256,
  MAX_BODY_LENGTH: 65536,
  ITEMS_PER_PAGE: 100,
  FIELDS_PER_PAGE: 20,
}));

// Mock status-workflow to avoid import chain issues
jest.unstable_mockModule("../../src/utils/status-workflow.js", () => ({
  validateStatusTransition: jest.fn(() => ({ valid: true })),
}));

// Mock gh-config
jest.unstable_mockModule("../../src/utils/gh-config.js", () => ({
  getMetricsConfig: jest.fn(() => ({ enabled: false })),
}));

const {
  resolveFieldName,
  generateTimestamp,
  setItemFields,
} = await import("../../src/utils/project-fields.js");
import type { ProjectField } from "../../src/utils/project-fields.js";

describe("resolveFieldName", () => {
  const projectFields: Record<string, ProjectField> = {
    Status: { id: "f1", type: "SINGLE_SELECT", options: {} },
    Priority: { id: "f2", type: "SINGLE_SELECT", options: {} },
    Notes: { id: "f4", type: "TEXT", options: {} },
    StoryPoints: { id: "f5", type: "NUMBER", options: {} },
    DueDate: { id: "f6", type: "DATE", options: {} },
  };

  /**
   * @testdoc 完全一致するフィールド名を返す
   * @purpose 基本的なフィールド名解決
   */
  it("should return exact match", () => {
    expect(resolveFieldName("Status", projectFields)).toBe("Status");
    expect(resolveFieldName("Priority", projectFields)).toBe("Priority");
    expect(resolveFieldName("StoryPoints", projectFields)).toBe("StoryPoints");
    expect(resolveFieldName("DueDate", projectFields)).toBe("DueDate");
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

describe("setItemFields", () => {
  const cachedFields: Record<string, ProjectField> = {
    Status: {
      id: "f1",
      type: "SINGLE_SELECT",
      options: { "In Progress": "opt1", Done: "opt2" },
    },
    Notes: { id: "f2", type: "TEXT", options: {} },
    StoryPoints: { id: "f3", type: "NUMBER", options: {} },
    DueDate: { id: "f4", type: "DATE", options: {} },
    Unknown: { id: "f5", type: "UNKNOWN" as any, options: {} },
  };

  beforeEach(() => {
    mockRunGraphQL.mockReset();
    mockRunGraphQL.mockResolvedValue({ success: true, data: {} });
  });

  /**
   * @testdoc NUMBER フィールドに数値を正しく設定する
   */
  it("should dispatch NUMBER field to updateNumberField", async () => {
    const count = await setItemFields("proj1", "item1", { StoryPoints: "5" }, undefined, cachedFields);
    expect(count).toBe(1);
    expect(mockRunGraphQL).toHaveBeenCalledWith(
      expect.stringContaining("number: $number"),
      expect.objectContaining({ number: 5 })
    );
  });

  /**
   * @testdoc NUMBER フィールドに非数値を指定するとエラー
   */
  it("should fail NUMBER field with non-numeric value", async () => {
    const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() };
    const count = await setItemFields("proj1", "item1", { StoryPoints: "abc" }, mockLogger as any, cachedFields);
    expect(count).toBe(0);
    expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("not a number"));
  });

  /**
   * @testdoc DATE フィールドに日付文字列を正しく設定する
   */
  it("should dispatch DATE field to updateDateField", async () => {
    const count = await setItemFields("proj1", "item1", { DueDate: "2026-03-01" }, undefined, cachedFields);
    expect(count).toBe(1);
    expect(mockRunGraphQL).toHaveBeenCalledWith(
      expect.stringContaining("date: $date"),
      expect.objectContaining({ date: "2026-03-01" })
    );
  });

  /**
   * @testdoc 未対応フィールドタイプで警告を出力する
   */
  it("should warn for unsupported field type", async () => {
    const mockLogger = { error: jest.fn(), warn: jest.fn(), info: jest.fn() };
    const count = await setItemFields("proj1", "item1", { Unknown: "value" }, mockLogger as any, cachedFields);
    expect(count).toBe(0);
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("unsupported type"));
  });
});
