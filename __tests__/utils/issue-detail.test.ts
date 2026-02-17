/**
 * Issue Detail Tests (#676)
 *
 * updateProjectStatus, resolveProjectItem, resolveAndUpdateStatus のテスト。
 * ESM 環境のため jest.unstable_mockModule を使用。
 *
 * @testdoc Issue 詳細取得と Status 更新ヘルパーのテスト
 */

import { jest } from "@jest/globals";
import type { ProjectField } from "../../src/utils/project-fields.js";
import type { Logger } from "../../src/utils/logger.js";

// =============================================================================
// Mocks (ESM: unstable_mockModule + dynamic import)
// =============================================================================

const mockSetItemFields = jest.fn<(...args: any[]) => number>();
const mockAutoSetTimestamps = jest.fn<(...args: any[]) => void>();
const mockGetProjectFields = jest.fn<(...args: any[]) => Record<string, ProjectField>>();
const mockRunGraphQL = jest.fn<(...args: any[]) => any>();
const mockGetProjectId = jest.fn<(...args: any[]) => string | null>();

jest.unstable_mockModule("../../src/utils/project-fields.js", () => ({
  setItemFields: mockSetItemFields,
  autoSetTimestamps: mockAutoSetTimestamps,
  getProjectFields: mockGetProjectFields,
  // re-export non-mocked items
  resolveFieldName: jest.fn(),
  FIELD_FALLBACKS: {},
  generateTimestamp: jest.fn(() => "2026-02-17T10:00:00+09:00"),
  updateTextField: jest.fn(),
  updateSelectField: jest.fn(),
  addItemToProject: jest.fn(),
  GRAPHQL_MUTATION_ADD_TO_PROJECT: "",
}));

jest.unstable_mockModule("../../src/utils/github.js", () => ({
  runGraphQL: mockRunGraphQL,
  getRepoInfo: jest.fn(() => ({ owner: "test-owner", name: "test-repo" })),
  runGhCommand: jest.fn(),
  getOwner: jest.fn(() => "test-owner"),
  getRepoName: jest.fn(() => "test-repo"),
  validateTitle: jest.fn(),
  validateBody: jest.fn(),
  isIssueNumber: jest.fn(),
  parseIssueNumber: jest.fn(),
}));

jest.unstable_mockModule("../../src/commands/projects.js", () => ({
  getProjectId: mockGetProjectId,
}));

jest.unstable_mockModule("../../src/utils/gh-config.js", () => ({
  getMetricsConfig: jest.fn(() => ({ enabled: false })),
}));

jest.unstable_mockModule("../../src/utils/status-workflow.js", () => ({
  validateStatusTransition: jest.fn(() => ({ valid: true })),
}));

// Dynamic import after mocks
const { updateProjectStatus, getIssueDetail, resolveProjectItem, resolveAndUpdateStatus } =
  await import("../../src/utils/issue-detail.js");

// =============================================================================
// Helpers
// =============================================================================

function createMockLogger(): Logger {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    debug: jest.fn(),
  } as unknown as Logger;
}

const mockFields: Record<string, ProjectField> = {
  Status: {
    id: "field-status",
    type: "SINGLE_SELECT",
    options: { Done: "opt-done", "In Progress": "opt-ip", "Not Planned": "opt-np" },
  },
};

// =============================================================================
// updateProjectStatus
// =============================================================================

describe("updateProjectStatus", () => {
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
  });

  /**
   * @testdoc Status 更新成功時に autoSetTimestamps を呼ぶ
   * @purpose Status 更新と同時にタイムスタンプが設定される
   */
  it("should call setItemFields and autoSetTimestamps on success", () => {
    mockSetItemFields.mockReturnValue(1);

    const result = updateProjectStatus({
      projectId: "proj-1",
      itemId: "item-1",
      statusValue: "Done",
      projectFields: mockFields,
      logger,
    });

    expect(result.success).toBe(true);
    expect(mockSetItemFields).toHaveBeenCalledWith(
      "proj-1", "item-1", { Status: "Done" }, logger, mockFields
    );
    expect(mockAutoSetTimestamps).toHaveBeenCalledWith(
      "proj-1", "item-1", "Done", mockFields, logger
    );
  });

  /**
   * @testdoc Status 更新失敗時は autoSetTimestamps を呼ばない
   * @purpose 失敗時のフォールバック動作
   */
  it("should return failure and not call autoSetTimestamps when setItemFields returns 0", () => {
    mockSetItemFields.mockReturnValue(0);

    const result = updateProjectStatus({
      projectId: "proj-1",
      itemId: "item-1",
      statusValue: "Done",
      projectFields: mockFields,
      logger,
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe("update-failed");
    expect(mockAutoSetTimestamps).not.toHaveBeenCalled();
  });

  /**
   * @testdoc Not Planned への更新でも autoSetTimestamps が呼ばれる
   * @purpose Not Planned のタイムスタンプ対応
   */
  it("should call autoSetTimestamps for Not Planned status", () => {
    mockSetItemFields.mockReturnValue(1);

    const result = updateProjectStatus({
      projectId: "proj-1",
      itemId: "item-1",
      statusValue: "Not Planned",
      projectFields: mockFields,
      logger,
    });

    expect(result.success).toBe(true);
    expect(mockAutoSetTimestamps).toHaveBeenCalledWith(
      "proj-1", "item-1", "Not Planned", mockFields, logger
    );
  });
});

// =============================================================================
// getIssueDetail
// =============================================================================

describe("getIssueDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * @testdoc GraphQL 成功時に projectItemId と projectId を返す
   */
  it("should return projectItemId and projectId on success", () => {
    mockRunGraphQL.mockReturnValue({
      success: true,
      data: {
        data: {
          repository: {
            issue: {
              number: 42,
              projectItems: {
                nodes: [
                  { id: "item-1", project: { id: "proj-1", title: "test-repo" } },
                ],
              },
            },
          },
        },
      },
    });

    const result = getIssueDetail("test-owner", "test-repo", 42);
    expect(result).toEqual({ projectItemId: "item-1", projectId: "proj-1" });
  });

  /**
   * @testdoc GraphQL 失敗時に null を返す
   */
  it("should return null on GraphQL failure", () => {
    mockRunGraphQL.mockReturnValue({ success: false });

    const result = getIssueDetail("test-owner", "test-repo", 42);
    expect(result).toBeNull();
  });

  /**
   * @testdoc Issue が見つからない場合に null を返す
   */
  it("should return null when issue not found", () => {
    mockRunGraphQL.mockReturnValue({
      success: true,
      data: { data: { repository: { issue: null } } },
    });

    const result = getIssueDetail("test-owner", "test-repo", 999);
    expect(result).toBeNull();
  });

  /**
   * @testdoc projectItems が空の場合に undefined フィールドを返す
   */
  it("should return undefined fields when no project items", () => {
    mockRunGraphQL.mockReturnValue({
      success: true,
      data: {
        data: {
          repository: {
            issue: { number: 42, projectItems: { nodes: [] } },
          },
        },
      },
    });

    const result = getIssueDetail("test-owner", "test-repo", 42);
    expect(result).toEqual({ projectItemId: undefined, projectId: undefined });
  });
});

// =============================================================================
// resolveProjectItem
// =============================================================================

describe("resolveProjectItem", () => {
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
  });

  /**
   * @testdoc プロジェクト未検出時に null を返す
   */
  it("should return null when no project found", () => {
    mockGetProjectId.mockReturnValue(null);

    const result = resolveProjectItem("test-owner", "test-repo", 42, logger);
    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith("No project found");
  });

  /**
   * @testdoc Issue が Project に未登録の場合に null を返す
   */
  it("should return null when issue not in project", () => {
    mockGetProjectId.mockReturnValue("proj-1");
    mockRunGraphQL.mockReturnValue({
      success: true,
      data: {
        data: {
          repository: {
            issue: { number: 42, projectItems: { nodes: [] } },
          },
        },
      },
    });

    const result = resolveProjectItem("test-owner", "test-repo", 42, logger);
    expect(result).toBeNull();
  });

  /**
   * @testdoc 正常時に ResolvedProjectItem を返す
   */
  it("should return resolved project item on success", () => {
    mockGetProjectId.mockReturnValue("proj-1");
    mockRunGraphQL.mockReturnValue({
      success: true,
      data: {
        data: {
          repository: {
            issue: {
              number: 42,
              projectItems: {
                nodes: [{ id: "item-1", project: { id: "proj-1", title: "test-repo" } }],
              },
            },
          },
        },
      },
    });
    mockGetProjectFields.mockReturnValue(mockFields);

    const result = resolveProjectItem("test-owner", "test-repo", 42, logger);
    expect(result).toEqual({
      projectId: "proj-1",
      projectItemId: "item-1",
      fields: mockFields,
    });
  });
});

// =============================================================================
// resolveAndUpdateStatus
// =============================================================================

describe("resolveAndUpdateStatus", () => {
  let logger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createMockLogger();
  });

  /**
   * @testdoc 解決から更新までの一連の流れ
   */
  it("should resolve and update status successfully", () => {
    mockGetProjectId.mockReturnValue("proj-1");
    mockRunGraphQL.mockReturnValue({
      success: true,
      data: {
        data: {
          repository: {
            issue: {
              number: 42,
              projectItems: {
                nodes: [{ id: "item-1", project: { id: "proj-1", title: "test-repo" } }],
              },
            },
          },
        },
      },
    });
    mockGetProjectFields.mockReturnValue(mockFields);
    mockSetItemFields.mockReturnValue(1);

    const result = resolveAndUpdateStatus("test-owner", "test-repo", 42, "Done", logger);
    expect(result.success).toBe(true);
    expect(mockAutoSetTimestamps).toHaveBeenCalled();
  });

  /**
   * @testdoc プロジェクト未検出時に no-item を返す
   */
  it("should return failure with reason when project not found", () => {
    mockGetProjectId.mockReturnValue(null);

    const result = resolveAndUpdateStatus("test-owner", "test-repo", 42, "Done", logger);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("no-item");
  });

  /**
   * @testdoc Status 更新失敗時に update-failed を返す
   */
  it("should return failure when status update fails", () => {
    mockGetProjectId.mockReturnValue("proj-1");
    mockRunGraphQL.mockReturnValue({
      success: true,
      data: {
        data: {
          repository: {
            issue: {
              number: 42,
              projectItems: {
                nodes: [{ id: "item-1", project: { id: "proj-1", title: "test-repo" } }],
              },
            },
          },
        },
      },
    });
    mockGetProjectFields.mockReturnValue(mockFields);
    mockSetItemFields.mockReturnValue(0);

    const result = resolveAndUpdateStatus("test-owner", "test-repo", 42, "Done", logger);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("update-failed");
  });
});
