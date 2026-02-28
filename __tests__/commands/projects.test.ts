/**
 * projects Command Tests
 *
 * Tests for GitHub Projects V2 management command.
 * 純粋関数テスト (static import) + モックベース統合テスト (ESM mock + dynamic import)。
 *
 * @testdoc GitHub Projects V2管理コマンドのテスト
 */

// =============================================================================
// Static imports — pure function tests (real implementations)
// NOTE: projects.js は static import しない（依存モジュールが先にロードされモックが効かなくなるため）
// =============================================================================

import {
  validateTitle,
  validateBody,
  isIssueNumber,
  parseIssueNumber,
  MAX_TITLE_LENGTH,
  MAX_BODY_LENGTH,
} from "../../src/utils/github.js";

// =============================================================================
// Pure function tests
// =============================================================================

describe("projects command validation", () => {
  // ===========================================================================
  // Input validation tests (pure functions from github.js)
  // ===========================================================================

  describe("Issue number validation for project item lookup", () => {
    /**
     * @testdoc 有効なIssue番号を認識する（プロジェクトアイテム検索用）
     * @purpose 数字のみの文字列がIssue番号として認識されることを確認
     */
    it("should recognize valid issue numbers", () => {
      expect(isIssueNumber("1")).toBe(true);
      expect(isIssueNumber("42")).toBe(true);
      expect(isIssueNumber("12345")).toBe(true);
    });

    /**
     * @testdoc [projects] #付きのIssue番号を認識する
     * @purpose GitHub形式（#123）がIssue番号として認識されることを確認
     */
    it("should recognize issue numbers with hash prefix", () => {
      expect(isIssueNumber("#1")).toBe(true);
      expect(isIssueNumber("#42")).toBe(true);
      expect(isIssueNumber("#12345")).toBe(true);
    });

    /**
     * @testdoc [projects] 無効な入力を拒否する
     * @purpose 非数値入力がIssue番号として認識されないことを確認
     */
    it("should reject invalid inputs", () => {
      expect(isIssueNumber("")).toBe(false);
      expect(isIssueNumber("#")).toBe(false);
      expect(isIssueNumber("abc")).toBe(false);
      expect(isIssueNumber("#abc")).toBe(false);
      expect(isIssueNumber("12abc")).toBe(false);
      expect(isIssueNumber("-1")).toBe(false);
    });

    /**
     * @testdoc [projects] Issue番号を正しくパースする
     * @purpose 文字列から数値への変換が正しく行われることを確認
     */
    it("should parse issue numbers correctly", () => {
      expect(parseIssueNumber("1")).toBe(1);
      expect(parseIssueNumber("42")).toBe(42);
      expect(parseIssueNumber("#1")).toBe(1);
      expect(parseIssueNumber("#42")).toBe(42);
      expect(parseIssueNumber("#12345")).toBe(12345);
    });

    /**
     * @testdoc [projects] 先頭ゼロを10進数としてパースする
     * @purpose 8進数として解釈されないことを確認
     */
    it("should parse leading zeros as decimal", () => {
      expect(parseIssueNumber("0123")).toBe(123);
      expect(parseIssueNumber("#0001")).toBe(1);
    });
  });

  describe("Title validation for draft issue creation", () => {
    /**
     * @testdoc [projects] 有効なタイトルを受け入れる
     * @purpose 通常のタイトル文字列が受け入れられることを確認
     */
    it("should accept valid titles", () => {
      expect(validateTitle("Implement user authentication")).toBeNull();
      expect(validateTitle("Add new feature")).toBeNull();
      expect(validateTitle("a")).toBeNull(); // minimum valid
    });

    /**
     * @testdoc [projects] 空のタイトルを拒否する
     * @purpose 空文字列がエラーを返すことを確認
     */
    it("should reject empty title", () => {
      expect(validateTitle("")).toBe("Title cannot be empty");
    });

    /**
     * @testdoc [projects] 空白のみのタイトルを拒否する
     * @purpose ホワイトスペースのみがエラーを返すことを確認
     */
    it("should reject whitespace-only title", () => {
      expect(validateTitle("   ")).toBe("Title cannot be empty");
      expect(validateTitle("\t\n")).toBe("Title cannot be empty");
    });

    /**
     * @testdoc [projects] 最大長のタイトルを受け入れる
     * @purpose 境界値（最大長ちょうど）が受け入れられることを確認
     */
    it("should accept title at max length", () => {
      const title = "a".repeat(MAX_TITLE_LENGTH);
      expect(validateTitle(title)).toBeNull();
    });

    /**
     * @testdoc [projects] 最大長を超えるタイトルを拒否する
     * @purpose 境界値（最大長超過）がエラーを返すことを確認
     */
    it("should reject title exceeding max length", () => {
      const title = "a".repeat(MAX_TITLE_LENGTH + 1);
      const result = validateTitle(title);
      expect(result).toContain("Title too long");
      expect(result).toContain(`${MAX_TITLE_LENGTH}`);
    });

    /**
     * @testdoc [projects] 多言語タイトルを受け入れる
     * @purpose 日本語や絵文字が受け入れられることを確認
     */
    it("should accept multilingual titles", () => {
      expect(validateTitle("新機能: ダッシュボード実装")).toBeNull();
      expect(validateTitle("feat: Add feature :rocket:")).toBeNull();
      expect(validateTitle("fix: Correct Chinese characters 修复错误")).toBeNull();
    });
  });

  describe("Body validation for draft issue creation", () => {
    /**
     * @testdoc [projects] undefinedのボディを受け入れる
     * @purpose ボディが省略可能であることを確認
     */
    it("should accept undefined body", () => {
      expect(validateBody(undefined)).toBeNull();
    });

    /**
     * @testdoc [projects] 空のボディを受け入れる
     * @purpose 空文字列が許可されることを確認
     */
    it("should accept empty body", () => {
      expect(validateBody("")).toBeNull();
    });

    /**
     * @testdoc [projects] 有効なボディを受け入れる
     * @purpose 通常のボディ文字列が受け入れられることを確認
     */
    it("should accept valid body", () => {
      expect(validateBody("This is a task description")).toBeNull();
      expect(validateBody("Multi\nline\nbody")).toBeNull();
    });

    /**
     * @testdoc [projects] Markdown形式のボディを受け入れる
     * @purpose Markdown構文が受け入れられることを確認
     */
    it("should accept markdown body", () => {
      const markdown = `## 概要
- タスク1
- タスク2

## タスク
- [ ] 実装
- [ ] テスト

## Deliverable
機能が動作すること
`;
      expect(validateBody(markdown)).toBeNull();
    });

    /**
     * @testdoc [projects] 最大長のボディを受け入れる
     * @purpose 境界値（最大長ちょうど）が受け入れられることを確認
     */
    it("should accept body at max length", () => {
      const body = "a".repeat(MAX_BODY_LENGTH);
      expect(validateBody(body)).toBeNull();
    });

    /**
     * @testdoc [projects] 最大長を超えるボディを拒否する
     * @purpose 境界値（最大長超過）がエラーを返すことを確認
     */
    it("should reject body exceeding max length", () => {
      const body = "a".repeat(MAX_BODY_LENGTH + 1);
      const result = validateBody(body);
      expect(result).toContain("Body too long");
      expect(result).toContain(`${MAX_BODY_LENGTH}`);
    });
  });
});

describe("detectOptionDiff (#708)", () => {
  /**
   * @testdoc 定義と既存が完全一致する場合、差分なしを返す
   * @purpose 全オプションが揃っている場合にスキップ判定できることを確認
   */
  it("should return no diff when options match exactly", () => {
    const existing = ["Icebox", "Backlog", "Done"];
    const defined = ["Icebox", "Backlog", "Done"];
    const result = detectOptionDiff(existing, defined);
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
  });

  /**
   * @testdoc 定義に不足がある場合、missingに検出する
   * @purpose 新しく追加されたオプション（例: Not Planned）を検出できることを確認
   */
  it("should detect missing options", () => {
    const existing = ["Icebox", "Backlog", "Done"];
    const defined = ["Icebox", "Backlog", "Done", "Not Planned"];
    const result = detectOptionDiff(existing, defined);
    expect(result.missing).toEqual(["Not Planned"]);
    expect(result.extra).toEqual([]);
  });

  /**
   * @testdoc 既存に定義にないオプションがある場合、extraに検出する
   * @purpose ユーザーがUIで追加したカスタムオプションを検出できることを確認
   */
  it("should detect extra options", () => {
    const existing = ["Icebox", "Backlog", "Done", "Custom Status"];
    const defined = ["Icebox", "Backlog", "Done"];
    const result = detectOptionDiff(existing, defined);
    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual(["Custom Status"]);
  });

  /**
   * @testdoc missingとextraが同時に存在する場合、両方検出する
   * @purpose UIでリネームした場合等の混在ケースを確認
   */
  it("should detect both missing and extra options", () => {
    const existing = ["Todo", "In Progress", "Done"];
    const defined = ["Icebox", "Backlog", "Done", "Not Planned"];
    const result = detectOptionDiff(existing, defined);
    expect(result.missing).toEqual(["Icebox", "Backlog", "Not Planned"]);
    expect(result.extra).toEqual(["Todo", "In Progress"]);
  });

  /**
   * @testdoc 既存が空の場合、全定義がmissingになる
   * @purpose 初回セットアップ時の判定を確認
   */
  it("should treat all defined as missing when existing is empty", () => {
    const existing: string[] = [];
    const defined = ["Icebox", "Backlog", "Done"];
    const result = detectOptionDiff(existing, defined);
    expect(result.missing).toEqual(["Icebox", "Backlog", "Done"]);
    expect(result.extra).toEqual([]);
  });

  /**
   * @testdoc 完全不一致の場合、missing.lengthがdefined.lengthと等しい
   * @purpose GitHubデフォルトオプション（Todo, In Progress, Done）からの初回セットアップ判定
   */
  it("should detect full mismatch for initial setup detection", () => {
    // GitHubが自動生成するデフォルトオプション
    const existing = ["Todo", "In Progress", "Done"];
    const defined = ["Icebox", "Backlog", "Planning", "Spec Review", "Ready",
      "In Progress", "Pending", "Review", "Testing", "Done", "Not Planned", "Released"];
    const result = detectOptionDiff(existing, defined);
    // "In Progress" と "Done" は一致するので、完全不一致ではない
    expect(result.missing.length).toBe(10);
    expect(result.extra).toEqual(["Todo"]);
  });
});

// =============================================================================
// Mock-based integration tests (ESM: unstable_mockModule + dynamic import)
// =============================================================================

import { jest } from "@jest/globals";
import type { Logger } from "../../src/utils/logger.js";
import { createMockLogger } from "../helpers/command-test-utils.js";

const mockRunGraphQL = jest.fn<(...args: any[]) => any>();
const mockGetOwner = jest.fn<(...args: any[]) => any>();
const mockGetRepoName = jest.fn<(...args: any[]) => any>();
const mockGetRepoInfo = jest.fn<(...args: any[]) => any>();
const mockValidateTitle = jest.fn<(...args: any[]) => any>();
const mockValidateBody = jest.fn<(...args: any[]) => any>();
const mockCreateLogger = jest.fn<(...args: any[]) => any>();
const mockGetProjectId = jest.fn<(...args: any[]) => any>();
const mockGetProjectFields = jest.fn<(...args: any[]) => any>();
const mockFormatOutput = jest.fn<(...args: any[]) => any>();
const mockLoadGhConfig = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule("../../src/utils/github.js", () => ({
  runGraphQL: mockRunGraphQL,
  getOwner: mockGetOwner,
  getRepoName: mockGetRepoName,
  getRepoInfo: mockGetRepoInfo,
  validateTitle: mockValidateTitle,
  validateBody: mockValidateBody,
  isIssueNumber: jest.fn(),
  parseIssueNumber: jest.fn(),
  diagnoseRepoFailure: jest.fn(),
  MAX_TITLE_LENGTH: 256,
  MAX_BODY_LENGTH: 65536,
}));

jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  createLogger: mockCreateLogger,
}));

jest.unstable_mockModule("../../src/utils/project-utils.js", () => ({
  getProjectId: mockGetProjectId,
  getOwnerNodeId: jest.fn(),
  fetchWorkflows: jest.fn(),
  RECOMMENDED_WORKFLOWS: [],
}));

jest.unstable_mockModule("../../src/utils/project-fields.js", () => ({
  getProjectFields: mockGetProjectFields,
  setItemFields: jest.fn(),
  updateSelectField: jest.fn(),
  updateTextField: jest.fn(),
  resolveFieldName: jest.fn(),
  autoSetTimestamps: jest.fn(),
  generateTimestamp: jest.fn(),
  GRAPHQL_MUTATION_ADD_TO_PROJECT: "mutation AddToProject {}",
}));

jest.unstable_mockModule("../../src/utils/formatters.js", () => ({
  formatOutput: mockFormatOutput,
  GH_PROJECTS_LIST_COLUMNS: [],
}));

jest.unstable_mockModule("../../src/utils/gh-config.js", () => ({
  loadGhConfig: mockLoadGhConfig,
  getMetricsConfig: jest.fn(),
}));

jest.unstable_mockModule("../../src/utils/octokit-client.js", () => ({
  getOctokit: jest.fn(),
}));

jest.unstable_mockModule("../../src/utils/graphql-queries.js", () => ({
  GRAPHQL_MUTATION_DELETE_ITEM: "mutation DeleteItem {}",
  getRepoId: jest.fn(),
}));

const { projectsCommand, detectOptionDiff } = await import("../../src/commands/projects.js");

// =============================================================================
// Helpers
// =============================================================================

function mockGraphQLSuccess<T>(data: T) {
  return { success: true, data: { data } };
}

// =============================================================================
// Integration tests
// =============================================================================

describe("projectsCommand", () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let exitSpy: jest.SpiedFunction<typeof process.exit>;
  let mockLogger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = createMockLogger();
    mockCreateLogger.mockReturnValue(mockLogger);
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    exitSpy = jest.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  // ===========================================================================
  // list subcommand
  // ===========================================================================

  describe("list action", () => {
    /**
     * @testdoc list アクションがプロジェクトアイテム一覧を出力する
     */
    it("should output project items list", async () => {
      mockLoadGhConfig.mockReturnValue({});
      mockGetOwner.mockReturnValue("test-owner");
      mockGetProjectId.mockResolvedValue("PVT_abc123");
      mockRunGraphQL.mockResolvedValue(mockGraphQLSuccess({
        node: {
          title: "Test Project",
          items: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                id: "PVTI_1",
                status: { name: "In Progress" },
                priority: { name: "High" },
                size: { name: "M" },
                content: { title: "Task 1", number: 42 },
              },
              {
                id: "PVTI_2",
                status: { name: "Backlog" },
                priority: { name: "Low" },
                size: { name: "S" },
                content: { title: "Task 2", number: 43 },
              },
            ],
          },
        },
      }));
      mockFormatOutput.mockReturnValue('{"formatted": true}');

      await projectsCommand("list", undefined, {});

      expect(exitSpy).not.toHaveBeenCalled();
      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          project: expect.objectContaining({ id: "PVT_abc123", title: "Test Project" }),
          items: expect.arrayContaining([
            expect.objectContaining({ id: "PVTI_1", title: "Task 1", issue_number: 42 }),
          ]),
          total_count: 2,
        }),
        "json",
        expect.any(Object),
      );
      expect(logSpy).toHaveBeenCalledWith('{"formatted": true}');
    });

    /**
     * @testdoc owner が取得できないと exit(1)
     */
    it("should exit(1) when owner is unavailable", async () => {
      mockLoadGhConfig.mockReturnValue({});
      mockGetOwner.mockReturnValue(null);

      await projectsCommand("list", undefined, {});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Could not determine repository owner"),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    /**
     * @testdoc プロジェクトが見つからないと exit(1)
     */
    it("should exit(1) when project not found", async () => {
      mockLoadGhConfig.mockReturnValue({});
      mockGetOwner.mockReturnValue("test-owner");
      mockGetProjectId.mockResolvedValue(null);

      await projectsCommand("list", undefined, {});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("No project found"),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    /**
     * @testdoc Done/Released ステータスがデフォルトで除外される
     */
    it("should exclude Done/Released items by default", async () => {
      mockLoadGhConfig.mockReturnValue({});
      mockGetOwner.mockReturnValue("test-owner");
      mockGetProjectId.mockResolvedValue("PVT_abc123");
      mockRunGraphQL.mockResolvedValue(mockGraphQLSuccess({
        node: {
          title: "Test Project",
          items: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [
              {
                id: "PVTI_1",
                status: { name: "In Progress" },
                priority: null,
                size: null,
                content: { title: "Active", number: 1 },
              },
              {
                id: "PVTI_2",
                status: { name: "Done" },
                priority: null,
                size: null,
                content: { title: "Completed", number: 2 },
              },
              {
                id: "PVTI_3",
                status: { name: "Released" },
                priority: null,
                size: null,
                content: { title: "Released item", number: 3 },
              },
            ],
          },
        },
      }));
      mockFormatOutput.mockReturnValue("{}");

      await projectsCommand("list", undefined, {});

      expect(mockFormatOutput).toHaveBeenCalledWith(
        expect.objectContaining({
          total_count: 1,
          items: [expect.objectContaining({ id: "PVTI_1", title: "Active" })],
        }),
        "json",
        expect.any(Object),
      );
    });
  });

  // ===========================================================================
  // fields subcommand
  // ===========================================================================

  describe("fields action", () => {
    /**
     * @testdoc fields アクションがフィールド一覧を JSON 出力する
     */
    it("should output project fields as JSON", async () => {
      mockGetOwner.mockReturnValue("test-owner");
      mockGetProjectId.mockResolvedValue("PVT_abc123");
      const fieldsData = {
        Status: { id: "PVTSSF_1", type: "ProjectV2SingleSelectField", options: { "In Progress": "opt1" } },
        Priority: { id: "PVTSSF_2", type: "ProjectV2SingleSelectField", options: { High: "opt2" } },
      };
      mockGetProjectFields.mockResolvedValue(fieldsData);

      await projectsCommand("fields", undefined, {});

      expect(exitSpy).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledTimes(1);
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.Status).toBeDefined();
      expect(output.Status.id).toBe("PVTSSF_1");
      expect(output.Priority).toBeDefined();
    });

    /**
     * @testdoc projects workflows: owner が取得できないと exit(1)
     */
    it("should exit(1) when owner is unavailable", async () => {
      mockGetOwner.mockReturnValue(null);

      await projectsCommand("fields", undefined, {});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Could not determine repository owner"),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ===========================================================================
  // get subcommand
  // ===========================================================================

  describe("get action", () => {
    /**
     * @testdoc target が未指定だと exit(1)
     */
    it("should exit(1) when target is missing", async () => {
      await projectsCommand("get", undefined, {});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Item ID or issue number required"),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ===========================================================================
  // create subcommand
  // ===========================================================================

  describe("create action", () => {
    /**
     * @testdoc title が未指定だと exit(1)
     */
    it("should exit(1) when title is missing", async () => {
      await projectsCommand("create", undefined, {});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("--title is required"),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  // ===========================================================================
  // unknown action
  // ===========================================================================

  describe("unknown action", () => {
    /**
     * @testdoc projects: 不明なアクションで exit(1)
     */
    it("should exit(1) for unknown action", async () => {
      await projectsCommand("invalid", undefined, {});

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining("Unknown action: invalid"),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
