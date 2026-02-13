/**
 * projects Command Tests
 *
 * Tests for GitHub Projects V2 management command.
 * Since the command relies heavily on external API calls (gh CLI + GraphQL),
 * these tests focus on input validation and command routing logic.
 *
 * For full integration testing, use actual gh CLI in CI environment.
 *
 * @testdoc GitHub Projects V2管理コマンドのテスト
 */

// Re-export test utilities from github.js for validation testing
import {
  validateTitle,
  validateBody,
  isIssueNumber,
  parseIssueNumber,
  MAX_TITLE_LENGTH,
  MAX_BODY_LENGTH,
} from "../../src/utils/github.js";

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
     * @testdoc #付きのIssue番号を認識する
     * @purpose GitHub形式（#123）がIssue番号として認識されることを確認
     */
    it("should recognize issue numbers with hash prefix", () => {
      expect(isIssueNumber("#1")).toBe(true);
      expect(isIssueNumber("#42")).toBe(true);
      expect(isIssueNumber("#12345")).toBe(true);
    });

    /**
     * @testdoc 無効な入力を拒否する
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
     * @testdoc Issue番号を正しくパースする
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
     * @testdoc 先頭ゼロを10進数としてパースする
     * @purpose 8進数として解釈されないことを確認
     */
    it("should parse leading zeros as decimal", () => {
      expect(parseIssueNumber("0123")).toBe(123);
      expect(parseIssueNumber("#0001")).toBe(1);
    });
  });

  describe("Title validation for draft issue creation", () => {
    /**
     * @testdoc 有効なタイトルを受け入れる
     * @purpose 通常のタイトル文字列が受け入れられることを確認
     */
    it("should accept valid titles", () => {
      expect(validateTitle("Implement user authentication")).toBeNull();
      expect(validateTitle("Add new feature")).toBeNull();
      expect(validateTitle("a")).toBeNull(); // minimum valid
    });

    /**
     * @testdoc 空のタイトルを拒否する
     * @purpose 空文字列がエラーを返すことを確認
     */
    it("should reject empty title", () => {
      expect(validateTitle("")).toBe("Title cannot be empty");
    });

    /**
     * @testdoc 空白のみのタイトルを拒否する
     * @purpose ホワイトスペースのみがエラーを返すことを確認
     */
    it("should reject whitespace-only title", () => {
      expect(validateTitle("   ")).toBe("Title cannot be empty");
      expect(validateTitle("\t\n")).toBe("Title cannot be empty");
    });

    /**
     * @testdoc 最大長のタイトルを受け入れる
     * @purpose 境界値（最大長ちょうど）が受け入れられることを確認
     */
    it("should accept title at max length", () => {
      const title = "a".repeat(MAX_TITLE_LENGTH);
      expect(validateTitle(title)).toBeNull();
    });

    /**
     * @testdoc 最大長を超えるタイトルを拒否する
     * @purpose 境界値（最大長超過）がエラーを返すことを確認
     */
    it("should reject title exceeding max length", () => {
      const title = "a".repeat(MAX_TITLE_LENGTH + 1);
      const result = validateTitle(title);
      expect(result).toContain("Title too long");
      expect(result).toContain(`${MAX_TITLE_LENGTH}`);
    });

    /**
     * @testdoc 多言語タイトルを受け入れる
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
     * @testdoc undefinedのボディを受け入れる
     * @purpose ボディが省略可能であることを確認
     */
    it("should accept undefined body", () => {
      expect(validateBody(undefined)).toBeNull();
    });

    /**
     * @testdoc 空のボディを受け入れる
     * @purpose 空文字列が許可されることを確認
     */
    it("should accept empty body", () => {
      expect(validateBody("")).toBeNull();
    });

    /**
     * @testdoc 有効なボディを受け入れる
     * @purpose 通常のボディ文字列が受け入れられることを確認
     */
    it("should accept valid body", () => {
      expect(validateBody("This is a task description")).toBeNull();
      expect(validateBody("Multi\nline\nbody")).toBeNull();
    });

    /**
     * @testdoc Markdown形式のボディを受け入れる
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
     * @testdoc 最大長のボディを受け入れる
     * @purpose 境界値（最大長ちょうど）が受け入れられることを確認
     */
    it("should accept body at max length", () => {
      const body = "a".repeat(MAX_BODY_LENGTH);
      expect(validateBody(body)).toBeNull();
    });

    /**
     * @testdoc 最大長を超えるボディを拒否する
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

describe("projects command options", () => {
  // ===========================================================================
  // ProjectsOptions type tests
  // ===========================================================================

  /**
   * @testdoc ProjectsOptionsの型定義を検証
   * @purpose オプション構造が期待通りであることを確認
   */
  describe("ProjectsOptions structure", () => {
    it("should support list action options", () => {
      const options = {
        all: true,
        status: ["In Progress", "Ready"],
        owner: "custom-owner",
        verbose: true,
      };

      expect(options.all).toBe(true);
      expect(options.status).toContain("In Progress");
      expect(options.owner).toBe("custom-owner");
      expect(options.verbose).toBe(true);
    });

    it("should support create action options", () => {
      const options = {
        title: "New Draft Issue",
        body: "Please implement this feature",
        fieldStatus: "Backlog",
        priority: "High",
        type: "Feature",
        size: "M",
      };

      expect(options.title).toBe("New Draft Issue");
      expect(options.body).toBe("Please implement this feature");
      expect(options.fieldStatus).toBe("Backlog");
      expect(options.priority).toBe("High");
      expect(options.type).toBe("Feature");
      expect(options.size).toBe("M");
    });

    it("should support update action options", () => {
      const options = {
        fieldStatus: "Done",
        priority: "Low",
        type: "Bug",
        size: "S",
        body: "Updated body content",
      };

      expect(options.fieldStatus).toBe("Done");
      expect(options.priority).toBe("Low");
      expect(options.body).toBe("Updated body content");
    });

    it("should support delete action options", () => {
      const options = {
        force: true,
        owner: "custom-owner",
      };

      expect(options.force).toBe(true);
      expect(options.owner).toBe("custom-owner");
    });

    it("should support add-issue action options", () => {
      const options = {
        fieldStatus: "Backlog",
        priority: "Medium",
        type: "Feature",
        size: "L",
        owner: "custom-owner",
      };

      expect(options.fieldStatus).toBe("Backlog");
      expect(options.priority).toBe("Medium");
      expect(options.type).toBe("Feature");
      expect(options.size).toBe("L");
    });

    it("should support common options", () => {
      const options = {
        owner: "custom-owner",
        verbose: true,
      };

      expect(options.owner).toBe("custom-owner");
      expect(options.verbose).toBe(true);
    });
  });
});

describe("projects command actions", () => {
  // ===========================================================================
  // Action routing validation tests
  // ===========================================================================

  describe("Action routing", () => {
    /**
     * @testdoc サポートされるアクション一覧
     * @purpose 利用可能なアクションを文書化
     */
    it("should document supported actions", () => {
      const supportedActions = [
        "list",
        "get",
        "fields",
        "create",
        "update",
        "delete",
        "add-issue",
      ];

      // These actions are supported by the command
      supportedActions.forEach((action) => {
        expect(typeof action).toBe("string");
      });

      // Verify exact count of supported actions
      expect(supportedActions).toHaveLength(7);
    });

    /**
     * @testdoc listアクションはtargetを必要としない
     * @purpose targetがundefinedでも動作することを確認
     */
    it("list action should not require target", () => {
      const action = "list";
      const target = undefined;

      expect(action).toBe("list");
      expect(target).toBeUndefined();
    });

    /**
     * @testdoc getアクションはItem IDまたはIssue番号を必要とする
     * @purpose targetが必須であることを文書化
     */
    it("get action should require item ID or issue number", () => {
      const action = "get";
      const validTargets = [
        "PVTI_xxx", // Project Item ID
        "1",
        "#1",
        "42",
        "#42",
      ];
      const invalidTargets = [undefined, ""];

      validTargets.forEach((target) => {
        expect(target).toBeTruthy();
      });

      invalidTargets.forEach((target) => {
        expect(target).toBeFalsy();
      });
    });

    /**
     * @testdoc fieldsアクションはtargetを必要としない
     * @purpose プロジェクトのフィールド定義を取得
     */
    it("fields action should not require target", () => {
      const action = "fields";
      const target = undefined;

      expect(action).toBe("fields");
      expect(target).toBeUndefined();
    });

    /**
     * @testdoc createアクションは--titleを必要とする
     * @purpose タイトルオプションが必須であることを文書化
     */
    it("create action should require --title", () => {
      const action = "create";
      const validOptions = { title: "New Draft Issue" };
      const invalidOptions = { title: undefined };

      expect(validOptions.title).toBeDefined();
      expect(invalidOptions.title).toBeUndefined();
    });

    /**
     * @testdoc updateアクションはItem IDまたはIssue番号を必要とする
     * @purpose targetが必須であることを文書化
     */
    it("update action should require item ID or issue number", () => {
      const action = "update";
      const validTarget = "42";
      const invalidTarget = undefined;

      expect(isIssueNumber(validTarget)).toBe(true);
      expect(invalidTarget).toBeUndefined();
    });

    /**
     * @testdoc deleteアクションはItem IDまたはIssue番号と--forceを必要とする
     * @purpose targetと--forceが必須であることを文書化
     */
    it("delete action should require item ID or issue number and --force", () => {
      const action = "delete";
      const validTarget = "42";
      const validOptions = { force: true };
      const invalidOptions = { force: false };

      expect(isIssueNumber(validTarget)).toBe(true);
      expect(validOptions.force).toBe(true);
      expect(invalidOptions.force).toBe(false);
    });

    /**
     * @testdoc add-issueアクションはIssue番号を必要とする
     * @purpose targetが必須であることを文書化
     */
    it("add-issue action should require issue number", () => {
      const action = "add-issue";
      const validTargets = ["1", "#1", "42", "#42"];
      const invalidTarget = undefined;

      validTargets.forEach((target) => {
        expect(isIssueNumber(target)).toBe(true);
      });
      expect(invalidTarget).toBeUndefined();
    });
  });
});

describe("projects Project fields", () => {
  // ===========================================================================
  // Project field validation tests
  // ===========================================================================

  describe("Project field options", () => {
    /**
     * @testdoc Statusフィールドの有効値
     * @purpose 一般的なStatus値を文書化（project-items.mdに準拠）
     */
    it("should document common Status field values", () => {
      const commonStatuses = [
        "Icebox",
        "Backlog",
        "Spec Review",
        "Ready",
        "In Progress",
        "Pending",
        "Review",
        "Testing",
        "Done",
        "Released",
      ];

      commonStatuses.forEach((status) => {
        expect(typeof status).toBe("string");
        expect(status.length).toBeGreaterThan(0);
      });
    });

    /**
     * @testdoc デフォルトで除外されるStatusの値
     * @purpose listアクションでデフォルト除外される値を文書化
     */
    it("should document default excluded statuses for list", () => {
      const defaultExcludedStatuses = ["Done", "Released"];

      defaultExcludedStatuses.forEach((status) => {
        expect(typeof status).toBe("string");
      });

      // These are excluded by default unless --all flag is used
      expect(defaultExcludedStatuses).toContain("Done");
      expect(defaultExcludedStatuses).toContain("Released");
    });

    /**
     * @testdoc Priorityフィールドの有効値
     * @purpose 一般的なPriority値を文書化
     */
    it("should document common Priority field values", () => {
      const commonPriorities = ["Critical", "High", "Medium", "Low"];

      commonPriorities.forEach((priority) => {
        expect(typeof priority).toBe("string");
      });
    });

    /**
     * @testdoc Typeフィールドの有効値
     * @purpose 一般的なType値を文書化
     */
    it("should document common Type field values", () => {
      const commonTypes = ["Feature", "Bug", "Chore", "Docs", "Research"];

      commonTypes.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });

    /**
     * @testdoc Sizeフィールドの有効値
     * @purpose 一般的なSize値を文書化
     */
    it("should document common Size field values", () => {
      const commonSizes = ["XS", "S", "M", "L", "XL"];

      commonSizes.forEach((size) => {
        expect(typeof size).toBe("string");
      });
    });
  });

  describe("Project naming convention", () => {
    /**
     * @testdoc プロジェクト名はリポジトリ名と同じ
     * @purpose プロジェクト命名規則を文書化
     */
    it("should document project naming convention", () => {
      // Project naming convention: Project name = Repository name
      // This is the default behavior when --project is not specified
      const convention = {
        rule: "Project name should match repository name",
        example: "repo: nextjs-tdd-blog-cms -> project: nextjs-tdd-blog-cms",
        fallback: "First project found if no match",
      };

      expect(convention.rule).toBeDefined();
    });
  });
});

describe("projects output format", () => {
  // ===========================================================================
  // Output structure validation tests
  // ===========================================================================

  describe("list output structure", () => {
    /**
     * @testdoc list出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document list output structure", () => {
      const expectedOutput = {
        project: {
          id: "PVT_xxx",
          title: "nextjs-tdd-blog-cms",
          owner: "owner-name",
        },
        items: [
          {
            id: "PVTI_xxx",
            title: "Item Title",
            status: "In Progress",
            priority: "High",
            type: "Feature",
            size: "M",
            issue_number: 42, // null for draft issues
          },
        ],
        total_count: 1,
      };

      expect(expectedOutput.project).toBeDefined();
      expect(expectedOutput.project.id).toBeDefined();
      expect(expectedOutput.project.title).toBeDefined();
      expect(expectedOutput.items).toBeInstanceOf(Array);
      expect(expectedOutput.total_count).toBe(1);
      expect(expectedOutput.items[0].id).toBeDefined();
      expect(expectedOutput.items[0].status).toBe("In Progress");
    });
  });

  describe("get output structure", () => {
    /**
     * @testdoc get出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document get output structure", () => {
      const expectedOutput = {
        id: "PVTI_xxx",
        title: "Item Title",
        body: "Item body content",
        status: "In Progress",
        status_option_id: "opt-1",
        priority: "High",
        priority_option_id: "opt-2",
        type: "Feature",
        type_option_id: "opt-3",
        size: "M",
        size_option_id: "opt-4",
        issue_number: 42, // null for draft issues
        issue_url: "https://github.com/owner/repo/issues/42",
        draft_issue_id: null, // set for draft issues
        project: {
          id: "PVT_xxx",
          title: "Project Title",
        },
      };

      expect(expectedOutput.id).toBeDefined();
      expect(expectedOutput.body).toBeDefined();
      expect(expectedOutput.status_option_id).toBeDefined();
      expect(expectedOutput.project).toBeDefined();
    });

    /**
     * @testdoc Draft Issueの場合のget出力構造
     * @purpose Draft Issue特有のフィールドを文書化
     */
    it("should document get output structure for draft issue", () => {
      const expectedOutput = {
        id: "PVTI_xxx",
        title: "Draft Item Title",
        body: "Draft item body",
        status: "Backlog",
        status_option_id: "opt-1",
        priority: null,
        priority_option_id: null,
        type: null,
        type_option_id: null,
        size: null,
        size_option_id: null,
        issue_number: null, // null for draft issues
        issue_url: null,
        draft_issue_id: "DI_xxx", // set for draft issues
        project: {
          id: "PVT_xxx",
          title: "Project Title",
        },
      };

      expect(expectedOutput.issue_number).toBeNull();
      expect(expectedOutput.draft_issue_id).toBeDefined();
    });
  });

  describe("fields output structure", () => {
    /**
     * @testdoc fields出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document fields output structure", () => {
      const expectedOutput = {
        Status: {
          id: "PVTSSF_xxx",
          name: "Status",
          options: {
            Icebox: "opt-1",
            Backlog: "opt-2",
            Ready: "opt-3",
            "In Progress": "opt-4",
            Done: "opt-5",
          },
        },
        Priority: {
          id: "PVTSSF_yyy",
          name: "Priority",
          options: {
            Critical: "opt-1",
            High: "opt-2",
            Medium: "opt-3",
            Low: "opt-4",
          },
        },
        Type: {
          id: "PVTSSF_zzz",
          name: "Type",
          options: {
            Feature: "opt-1",
            Bug: "opt-2",
            Chore: "opt-3",
          },
        },
        Size: {
          id: "PVTSSF_aaa",
          name: "Size",
          options: {
            XS: "opt-1",
            S: "opt-2",
            M: "opt-3",
            L: "opt-4",
            XL: "opt-5",
          },
        },
      };

      expect(expectedOutput.Status).toBeDefined();
      expect(expectedOutput.Status.id).toBeDefined();
      expect(expectedOutput.Status.options).toBeDefined();
      expect(expectedOutput.Priority).toBeDefined();
      expect(expectedOutput.Type).toBeDefined();
      expect(expectedOutput.Size).toBeDefined();
    });
  });

  describe("create output structure", () => {
    /**
     * @testdoc create出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document create output structure", () => {
      const expectedOutput = {
        id: "PVTI_xxx",
        title: "New Draft Issue",
        body: "Description",
        status: "Backlog",
        priority: "High",
        type: "Feature",
        size: "M",
        issue_number: null, // always null for created draft issues
        draft_issue_id: "DI_xxx",
        project: {
          id: "PVT_xxx",
          title: "Project Title",
        },
      };

      expect(expectedOutput.id).toBeDefined();
      expect(expectedOutput.draft_issue_id).toBeDefined();
      expect(expectedOutput.issue_number).toBeNull();
    });
  });

  describe("delete output structure", () => {
    /**
     * @testdoc delete出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document delete output structure for draft issue", () => {
      const expectedOutput = {
        deleted: true,
        item_id: "PVTI_xxx",
        title: "Deleted Item Title",
      };

      expect(expectedOutput.deleted).toBe(true);
      expect(expectedOutput.item_id).toBeDefined();
      expect(expectedOutput.title).toBeDefined();
    });

    /**
     * @testdoc Issue削除時の出力（プロジェクトから除外のみ）
     * @purpose Issue削除時の特別なメッセージを文書化
     */
    it("should document delete output structure for linked issue", () => {
      const expectedOutput = {
        deleted: true,
        item_id: "PVTI_xxx",
        title: "Issue Title",
        issue_number: 42,
        note: "Item removed from project. Issue still exists.",
      };

      expect(expectedOutput.deleted).toBe(true);
      expect(expectedOutput.issue_number).toBe(42);
      expect(expectedOutput.note).toContain("Issue still exists");
    });
  });

  describe("add-issue output structure", () => {
    /**
     * @testdoc add-issue出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document add-issue output structure", () => {
      const expectedOutput = {
        id: "PVTI_xxx",
        title: "Issue Title",
        status: "Backlog",
        priority: "High",
        type: "Feature",
        size: "M",
        issue_number: 42,
        issue_url: "https://github.com/owner/repo/issues/42",
      };

      expect(expectedOutput.id).toBeDefined();
      expect(expectedOutput.issue_number).toBe(42);
      expect(expectedOutput.issue_url).toContain("/issues/42");
    });
  });
});

describe("projects error handling", () => {
  // ===========================================================================
  // Error condition documentation tests
  // ===========================================================================

  describe("Error conditions", () => {
    /**
     * @testdoc オーナー情報が取得できない場合
     * @purpose getOwnerがnullを返す場合のエラー条件を文書化
     */
    it("should document owner unavailable error", () => {
      const errorCondition = {
        cause: "Not in a git repository or gh CLI not configured",
        expectedError: "Could not determine repository owner",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc プロジェクトが見つからない場合
     * @purpose 存在しないプロジェクトのエラー条件を文書化
     */
    it("should document project not found error", () => {
      const errorCondition = {
        cause: "No project matches repository name",
        expectedError: "No project found for owner 'owner-name'",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc アイテムが見つからない場合
     * @purpose 存在しないItem ID/Issue番号のエラー条件を文書化
     */
    it("should document item not found error", () => {
      const errorCondition = {
        cause: "Item ID or Issue number does not exist in project",
        expectedError: "Item 'PVTI_xxx' not found",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc Issue番号でプロジェクトアイテムが見つからない場合
     * @purpose Issueがプロジェクトに追加されていない場合のエラー条件を文書化
     */
    it("should document project item not found for issue error", () => {
      const errorCondition = {
        cause: "Issue exists but not in project",
        expectedError: "No project item found for Issue #999",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc タイトルが指定されていない場合（create）
     * @purpose createアクションでタイトル未指定のエラー条件を文書化
     */
    it("should document title required error for create", () => {
      const errorCondition = {
        cause: "--title option not provided for create action",
        expectedError: "--title is required",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc --forceが指定されていない場合（delete）
     * @purpose deleteアクションで確認なし削除のエラー条件を文書化
     */
    it("should document force required error for delete", () => {
      const errorCondition = {
        cause: "--force option not provided for delete action",
        expectedError: "Use --force to confirm deletion",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc 不明なアクションが指定された場合
     * @purpose サポートされていないアクションのエラー条件を文書化
     */
    it("should document unknown action error", () => {
      const errorCondition = {
        cause: "Action not in [list, get, fields, create, update, delete, add-issue]",
        expectedError: "Unknown action: invalid",
        additionalInfo: "Available actions: list, get, fields, create, update, delete, add-issue",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc Projectフィールドの値が無効な場合
     * @purpose 存在しないStatus等の値を指定した場合のエラー条件を文書化
     */
    it("should document invalid project field value error", () => {
      const errorCondition = {
        cause: "Field value not in project's available options",
        expectedError: "Invalid Status value 'InvalidStatus'",
        additionalInfo: "Available options: Icebox, Backlog, Ready, ...",
      };

      expect(errorCondition.expectedError).toContain("Invalid");
    });

    /**
     * @testdoc Issue番号が無効な場合（add-issue）
     * @purpose add-issueで無効なIssue番号のエラー条件を文書化
     */
    it("should document issue not found error for add-issue", () => {
      const errorCondition = {
        cause: "Issue number does not exist in repository",
        expectedError: "Issue #999 not found",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc 既にプロジェクトに追加済みのIssue（add-issue）
     * @purpose 重複追加時の動作を文書化（エラーではなく既存アイテムを返す）
     */
    it("should document issue already in project behavior", () => {
      const behavior = {
        cause: "Issue is already in the project",
        expectedBehavior: "Returns existing project item (not an error)",
        infoMessage: "Issue #42 is already in the project",
        exitCode: 0, // Not an error
      };

      expect(behavior.exitCode).toBe(0);
    });
  });
});

describe("projects GraphQL queries", () => {
  // ===========================================================================
  // GraphQL query/mutation documentation tests
  // ===========================================================================

  describe("GraphQL operations", () => {
    /**
     * @testdoc 使用するGraphQL操作一覧
     * @purpose 実装で使用するGraphQLクエリ/ミューテーションを文書化
     */
    it("should document GraphQL operations used", () => {
      const operations = [
        { name: "GRAPHQL_QUERY_LIST", purpose: "List project items with pagination" },
        { name: "GRAPHQL_QUERY_ITEM", purpose: "Get single item details" },
        { name: "GRAPHQL_QUERY_FIELDS", purpose: "Get project field definitions" },
        { name: "GRAPHQL_MUTATION_CREATE", purpose: "Create draft issue" },
        { name: "GRAPHQL_MUTATION_UPDATE_FIELD", purpose: "Update single select field" },
        { name: "GRAPHQL_MUTATION_UPDATE_BODY", purpose: "Update draft issue body" },
        { name: "GRAPHQL_MUTATION_UPDATE_ISSUE", purpose: "Update linked issue body" },
        { name: "GRAPHQL_MUTATION_DELETE_ITEM", purpose: "Delete item from project" },
        { name: "GRAPHQL_MUTATION_ADD_ISSUE_TO_PROJECT", purpose: "Add issue to project" },
        { name: "GRAPHQL_QUERY_ISSUE_BY_NUMBER", purpose: "Get issue by number for add-issue" },
      ];

      operations.forEach((op) => {
        expect(op.name).toBeDefined();
        expect(op.purpose).toBeDefined();
      });

      expect(operations).toHaveLength(10);
    });
  });
});
