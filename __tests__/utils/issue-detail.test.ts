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

const mockSetItemFields = jest.fn<(...args: any[]) => any>();
const mockAutoSetTimestamps = jest.fn<(...args: any[]) => any>();
const mockGetProjectFields = jest.fn<(...args: any[]) => any>();
const mockRunGraphQL = jest.fn<(...args: any[]) => any>();
const mockGetProjectId = jest.fn<(...args: any[]) => any>();

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
  getOwner: jest.fn(() => "test-owner"),
  getRepoName: jest.fn(() => "test-repo"),
  validateTitle: jest.fn(),
  validateBody: jest.fn(),
  isIssueNumber: jest.fn(),
  parseIssueNumber: jest.fn(),
  parseGitRemoteUrl: jest.fn(),
  readBodyFile: jest.fn(),
  checkGitHubAuth: jest.fn(),
  diagnoseRepoFailure: jest.fn(),
  MAX_TITLE_LENGTH: 256,
  MAX_BODY_LENGTH: 65536,
  ITEMS_PER_PAGE: 100,
  FIELDS_PER_PAGE: 20,
}));

// getProjectId は project-utils.js に移動済み（#952）
jest.unstable_mockModule("../../src/utils/project-utils.js", () => ({
  getProjectId: mockGetProjectId,
  fetchWorkflows: jest.fn(),
  RECOMMENDED_WORKFLOWS: ["Item closed", "Pull request merged"],
}));

jest.unstable_mockModule("../../src/utils/gh-config.js", () => ({
  getMetricsConfig: jest.fn(() => ({ enabled: false })),
}));

jest.unstable_mockModule("../../src/utils/status-workflow.js", () => ({
  validateStatusTransition: jest.fn(() => ({ valid: true })),
}));

// octokit-client のモック（github.js が内部で使用）
jest.unstable_mockModule("../../src/utils/octokit-client.js", () => ({
  getOctokit: jest.fn(),
  resolveAuthToken: jest.fn(() => "test-token"),
  resetOctokit: jest.fn(),
  setOctokit: jest.fn(),
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
  it("should call setItemFields and autoSetTimestamps on success", async () => {
    mockSetItemFields.mockResolvedValue(1);

    const result = await updateProjectStatus({
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
  it("should return failure and not call autoSetTimestamps when setItemFields returns 0", async () => {
    mockSetItemFields.mockResolvedValue(0);

    const result = await updateProjectStatus({
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
  it("should call autoSetTimestamps for Not Planned status", async () => {
    mockSetItemFields.mockResolvedValue(1);

    const result = await updateProjectStatus({
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
  it("should return projectItemId and projectId on success", async () => {
    mockRunGraphQL.mockResolvedValue({
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

    const result = await getIssueDetail("test-owner", "test-repo", 42);
    expect(result).toEqual({ projectItemId: "item-1", projectId: "proj-1" });
  });

  /**
   * @testdoc GraphQL 失敗時に null を返す
   */
  it("should return null on GraphQL failure", async () => {
    mockRunGraphQL.mockResolvedValue({ success: false });

    const result = await getIssueDetail("test-owner", "test-repo", 42);
    expect(result).toBeNull();
  });

  /**
   * @testdoc Issue が見つからない場合に null を返す
   */
  it("should return null when issue not found", async () => {
    mockRunGraphQL.mockResolvedValue({
      success: true,
      data: { data: { repository: { issue: null } } },
    });

    const result = await getIssueDetail("test-owner", "test-repo", 999);
    expect(result).toBeNull();
  });

  /**
   * @testdoc projectItems が空の場合に undefined フィールドを返す
   */
  it("should return undefined fields when no project items", async () => {
    mockRunGraphQL.mockResolvedValue({
      success: true,
      data: {
        data: {
          repository: {
            issue: { number: 42, projectItems: { nodes: [] } },
          },
        },
      },
    });

    const result = await getIssueDetail("test-owner", "test-repo", 42);
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
  it("should return null when no project found", async () => {
    mockGetProjectId.mockResolvedValue(null);

    const result = await resolveProjectItem("test-owner", "test-repo", 42, logger);
    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith("No project found");
  });

  /**
   * @testdoc Issue が Project に未登録の場合に null を返す
   */
  it("should return null when issue not in project", async () => {
    mockGetProjectId.mockResolvedValue("proj-1");
    mockRunGraphQL.mockResolvedValue({
      success: true,
      data: {
        data: {
          repository: {
            issue: { number: 42, projectItems: { nodes: [] } },
          },
        },
      },
    });

    const result = await resolveProjectItem("test-owner", "test-repo", 42, logger);
    expect(result).toBeNull();
  });

  /**
   * @testdoc 正常時に ResolvedProjectItem を返す
   */
  it("should return resolved project item on success", async () => {
    mockGetProjectId.mockResolvedValue("proj-1");
    mockRunGraphQL.mockResolvedValue({
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
    mockGetProjectFields.mockResolvedValue(mockFields);

    const result = await resolveProjectItem("test-owner", "test-repo", 42, logger);
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
  it("should resolve and update status successfully", async () => {
    mockGetProjectId.mockResolvedValue("proj-1");
    mockRunGraphQL.mockResolvedValue({
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
    mockGetProjectFields.mockResolvedValue(mockFields);
    mockSetItemFields.mockResolvedValue(1);

    const result = await resolveAndUpdateStatus("test-owner", "test-repo", 42, "Done", logger);
    expect(result.success).toBe(true);
    expect(mockAutoSetTimestamps).toHaveBeenCalled();
  });

  /**
   * @testdoc プロジェクト未検出時に no-item を返す
   */
  it("should return failure with reason when project not found", async () => {
    mockGetProjectId.mockResolvedValue(null);

    const result = await resolveAndUpdateStatus("test-owner", "test-repo", 42, "Done", logger);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("no-item");
  });

  /**
   * @testdoc Status 更新失敗時に update-failed を返す
   */
  it("should return failure when status update fails", async () => {
    mockGetProjectId.mockResolvedValue("proj-1");
    mockRunGraphQL.mockResolvedValue({
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
    mockGetProjectFields.mockResolvedValue(mockFields);
    mockSetItemFields.mockResolvedValue(0);

    const result = await resolveAndUpdateStatus("test-owner", "test-repo", 42, "Done", logger);
    expect(result.success).toBe(false);
    expect(result.reason).toBe("update-failed");
  });
});
