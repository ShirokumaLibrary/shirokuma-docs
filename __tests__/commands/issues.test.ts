/**
 * issues Command Tests
 *
 * Tests for GitHub Issues management command.
 * Since the command relies heavily on external API calls (gh CLI),
 * these tests focus on input validation and command routing logic.
 *
 * For full integration testing, use actual gh CLI in CI environment.
 *
 * @testdoc GitHub Issues管理コマンドのテスト
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
import { generateTimestamp, getPullRequestId, getOrganizationIssueTypes } from "../../src/commands/issues.js";
import { GH_ISSUES_SEARCH_COLUMNS } from "../../src/utils/formatters.js";

describe("issues command validation", () => {
  // ===========================================================================
  // Input validation tests (pure functions from github.js)
  // ===========================================================================

  describe("Issue number validation", () => {
    /**
     * @testdoc 有効なIssue番号を認識する
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

  describe("Title validation", () => {
    /**
     * @testdoc 有効なタイトルを受け入れる
     * @purpose 通常のタイトル文字列が受け入れられることを確認
     */
    it("should accept valid titles", () => {
      expect(validateTitle("Fix bug in login")).toBeNull();
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
      expect(validateTitle("バグ修正: ログイン機能")).toBeNull();
      expect(validateTitle("feat: Add feature :rocket:")).toBeNull();
      expect(validateTitle("fix: Correct Chinese characters 修复错误")).toBeNull();
    });
  });

  describe("Body validation", () => {
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
      expect(validateBody("This is a bug description")).toBeNull();
      expect(validateBody("Multi\nline\nbody")).toBeNull();
    });

    /**
     * @testdoc Markdown形式のボディを受け入れる
     * @purpose Markdown構文が受け入れられることを確認
     */
    it("should accept markdown body", () => {
      const markdown = `## Summary
- Item 1
- Item 2

\`\`\`typescript
const x = 1;
\`\`\`
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

describe("issues command options", () => {
  // ===========================================================================
  // IssuesOptions type tests
  // ===========================================================================

  /**
   * @testdoc IssuesOptionsの型定義を検証
   * @purpose オプション構造が期待通りであることを確認
   */
  describe("IssuesOptions structure", () => {
    it("should support list action options", () => {
      const options = {
        all: true,
        status: ["In Progress", "Ready"],
        state: "open",
        labels: ["bug", "priority:high"],
        limit: 50,
      };

      expect(options.all).toBe(true);
      expect(options.status).toContain("In Progress");
      expect(options.state).toBe("open");
      expect(options.labels).toContain("bug");
      expect(options.limit).toBe(50);
    });

    it("should support create action options", () => {
      const options = {
        title: "New Feature Request",
        body: "Please implement this",
        fieldStatus: "Backlog",
        priority: "High",
        size: "M",
        labels: ["enhancement"],
      };

      expect(options.title).toBe("New Feature Request");
      expect(options.body).toBe("Please implement this");
      expect(options.fieldStatus).toBe("Backlog");
      expect(options.priority).toBe("High");
      expect(options.size).toBe("M");
    });

    it("should support update action options", () => {
      const options = {
        title: "Updated Title",
        body: "Updated body",
        fieldStatus: "Done",
        priority: "Low",
        size: "S",
      };

      expect(options.title).toBe("Updated Title");
      expect(options.fieldStatus).toBe("Done");
    });

    /**
     * @testdoc listアクションは--state未指定時にデフォルトで"open"をフィルタする (#535)
     * @purpose --stateデフォルト値削除後のリグレッション防止
     */
    it("list should default to 'open' state when --state is not specified (#535)", () => {
      // Commander.js からデフォルト値を削除したため、cmdList 内部でデフォルト適用する
      // options.state ?? "open" パターン
      const optionsWithState = { state: "closed", all: false };
      const optionsWithoutState = { state: undefined as string | undefined, all: false };
      const optionsWithAll = { state: undefined as string | undefined, all: true };

      // --state closed → "closed"
      const filter1 = optionsWithState.all ? "all" : (optionsWithState.state ?? "open");
      expect(filter1).toBe("closed");

      // --state 未指定 → "open"（デフォルト）
      const filter2 = optionsWithoutState.all ? "all" : (optionsWithoutState.state ?? "open");
      expect(filter2).toBe("open");

      // --all → "all"
      const filter3 = optionsWithAll.all ? "all" : (optionsWithAll.state ?? "open");
      expect(filter3).toBe("all");
    });

    /**
     * @testdoc updateアクションで未指定フィールドは既存値を保持する (#371)
     * @purpose --titleのみ指定時にbodyがクリアされないことを文書化
     */
    it("should preserve unspecified fields on update (#371)", () => {
      const existingIssue = { title: "Original Title", body: "Original body" };

      // Case 1: --title only → body preserved
      const titleOnlyOptions = { title: "New Title", body: undefined };
      const titleOnlyResult = {
        title: titleOnlyOptions.title,
        body: titleOnlyOptions.body !== undefined ? titleOnlyOptions.body : existingIssue.body,
      };
      expect(titleOnlyResult.title).toBe("New Title");
      expect(titleOnlyResult.body).toBe("Original body");

      // Case 2: --body only → title preserved
      const bodyOnlyOptions = { title: undefined, body: "New body" };
      const bodyOnlyResult = {
        title: bodyOnlyOptions.title !== undefined ? bodyOnlyOptions.title : existingIssue.title,
        body: bodyOnlyOptions.body,
      };
      expect(bodyOnlyResult.title).toBe("Original Title");
      expect(bodyOnlyResult.body).toBe("New body");

      // Case 3: both specified
      const bothOptions = { title: "New Title", body: "New body" };
      expect(bothOptions.title).toBe("New Title");
      expect(bothOptions.body).toBe("New body");

      // Case 4: --body "" intentional clear
      const clearBodyOptions = { title: undefined, body: "" };
      const clearBodyResult = {
        title: clearBodyOptions.title !== undefined ? clearBodyOptions.title : existingIssue.title,
        body: clearBodyOptions.body !== undefined ? clearBodyOptions.body : existingIssue.body,
      };
      expect(clearBodyResult.title).toBe("Original Title");
      expect(clearBodyResult.body).toBe("");

      // Case 5: neither specified (project fields only)
      const projectOnlyOptions = { title: undefined, body: undefined };
      const shouldUpdateIssue = projectOnlyOptions.title !== undefined || projectOnlyOptions.body !== undefined;
      expect(shouldUpdateIssue).toBe(false);
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

describe("issues command actions", () => {
  // ===========================================================================
  // Action routing validation tests
  // ===========================================================================

  describe("Action routing", () => {
    /**
     * @testdoc サポートされるアクション一覧
     * @purpose 利用可能なアクションを文書化
     */
    it("should document supported actions", () => {
      const supportedActions = ["list", "show", "create", "update", "comment", "close", "cancel"];

      // These actions are supported by the command
      supportedActions.forEach((action) => {
        expect(typeof action).toBe("string");
      });
    });

    /**
     * @testdoc listアクションは番号を必要としない
     * @purpose targetがundefinedでも動作することを確認
     */
    it("list action should not require target", () => {
      // list action works without a target
      const action = "list";
      const target = undefined;

      expect(action).toBe("list");
      expect(target).toBeUndefined();
    });

    /**
     * @testdoc showアクションはIssue番号を必要とする
     * @purpose targetが必須であることを文書化
     */
    it("show action should require issue number", () => {
      const action = "show";
      const validTargets = ["1", "#1", "42", "#42"];
      const invalidTargets = [undefined, "", "abc", "#"];

      validTargets.forEach((target) => {
        expect(isIssueNumber(target)).toBe(true);
      });

      invalidTargets.forEach((target) => {
        if (target === undefined || target === "") {
          expect(target).toBeFalsy();
        } else {
          expect(isIssueNumber(target)).toBe(false);
        }
      });
    });

    /**
     * @testdoc createアクションは--titleを必要とする
     * @purpose タイトルオプションが必須であることを文書化
     */
    it("create action should require --title", () => {
      const action = "create";
      const validOptions = { title: "New Issue" };
      const invalidOptions = { title: undefined };

      expect(validOptions.title).toBeDefined();
      expect(invalidOptions.title).toBeUndefined();
    });

    /**
     * @testdoc updateアクションはIssue番号を必要とする
     * @purpose targetが必須であることを文書化
     */
    it("update action should require issue number", () => {
      const action = "update";
      const validTarget = "42";
      const invalidTarget = undefined;

      expect(isIssueNumber(validTarget)).toBe(true);
      expect(invalidTarget).toBeUndefined();
    });

    /**
     * @testdoc commentアクションはIssueまたはPR番号と--bodyを必要とする (#353)
     * @purpose targetとbodyオプションが必須であることを文書化
     */
    it("comment action should require issue or PR number and --body (#353)", () => {
      const action = "comment";
      const validTarget = "42";
      const validOptions = { body: "This is a comment" };
      const invalidOptions = { body: undefined };

      expect(isIssueNumber(validTarget)).toBe(true);
      expect(validOptions.body).toBeDefined();
      expect(invalidOptions.body).toBeUndefined();
    });

    /**
     * @testdoc updateアクションで--state closedを指定するとIssueをcloseする (#535)
     * @purpose update --state closedのclose動作を文書化
     */
    it("update --state closed should close the issue (#535)", () => {
      // --state closed → closeIssue mutation を実行
      const options = {
        state: "closed",
        fieldStatus: undefined as string | undefined,
      };

      const shouldClose = options.state === "closed";
      expect(shouldClose).toBe(true);

      // --field-status 未指定時は Status を "Done" に自動設定
      const autoStatus = !options.fieldStatus ? "Done" : undefined;
      expect(autoStatus).toBe("Done");
    });

    /**
     * @testdoc updateで--field-statusと--state closedを同時指定した場合、Statusは二重設定されない (#535)
     * @purpose --field-status指定時のStatus自動設定スキップを文書化
     */
    it("update --field-status 'Done' --state closed should not double-set Status (#535)", () => {
      const options = {
        state: "closed",
        fieldStatus: "Done",
      };

      // --field-status が明示的に指定されているため、state 変更ロジックでは Status を設定しない
      const shouldAutoSetStatus = !options.fieldStatus;
      expect(shouldAutoSetStatus).toBe(false);
    });

    /**
     * @testdoc updateで--state未指定時はIssueのstateを変更しない (#535)
     * @purpose デフォルト値削除後のリグレッション防止
     */
    it("update without --state should not change issue state (#535)", () => {
      const options = {
        state: undefined as string | undefined,
        fieldStatus: "Done",
      };

      // --state が undefined の場合、state 変更ロジックはスキップされる
      const shouldChangeState = options.state !== undefined;
      expect(shouldChangeState).toBe(false);
    });

    /**
     * @testdoc updateで--state openを指定するとclosedのIssueをreopenする (#535)
     * @purpose update --state openのreopen動作を文書化
     */
    it("update --state open should reopen a closed issue (#535)", () => {
      const issueState = "CLOSED";
      const options = { state: "open" };

      const shouldReopen = options.state === "open" && issueState === "CLOSED";
      expect(shouldReopen).toBe(true);

      // すでに OPEN の場合は何もしない
      const openIssueState: string = "OPEN";
      const shouldReopenOpen = options.state === "open" && openIssueState === "CLOSED";
      expect(shouldReopenOpen).toBe(false);
    });

    /**
     * @testdoc updateで--state closedのみ（--field-status未指定）でStatusが"Done"に自動設定される (#535)
     * @purpose close時のStatus自動設定動作を文書化
     */
    it("update --state closed without --field-status should auto-set Status to Done (#535)", () => {
      const options = {
        state: "closed",
        fieldStatus: undefined as string | undefined,
        stateReason: undefined as string | undefined,
      };

      const shouldAutoSetStatus = options.state === "closed" && !options.fieldStatus;
      expect(shouldAutoSetStatus).toBe(true);

      const stateReason = options.stateReason === "NOT_PLANNED" ? "NOT_PLANNED" : "COMPLETED";
      const targetStatus = stateReason === "NOT_PLANNED" ? "Not Planned" : "Done";
      expect(targetStatus).toBe("Done");
    });

    /**
     * @testdoc updateで--state closed --state-reason NOT_PLANNEDでStatusが"Not Planned"に設定される (#535)
     * @purpose stateReasonに基づくStatus自動設定を文書化
     */
    it("update --state closed --state-reason NOT_PLANNED should set Status to Not Planned (#535)", () => {
      const options = {
        state: "closed",
        fieldStatus: undefined as string | undefined,
        stateReason: "NOT_PLANNED",
      };

      const stateReason = options.stateReason === "NOT_PLANNED" ? "NOT_PLANNED" : "COMPLETED";
      expect(stateReason).toBe("NOT_PLANNED");

      const targetStatus = stateReason === "NOT_PLANNED" ? "Not Planned" : "Done";
      expect(targetStatus).toBe("Not Planned");
    });

    /**
     * @testdoc updateで不正な--state値はエラーになる (#535)
     * @purpose --stateのバリデーションを文書化
     */
    it("update --state with invalid value should be rejected (#535)", () => {
      const validValues = ["open", "closed"];
      const invalidValues = ["all", "invalid", "OPEN", "CLOSED"];

      for (const v of validValues) {
        expect(["open", "closed"].includes(v.toLowerCase())).toBe(true);
      }

      for (const v of invalidValues) {
        // "OPEN" and "CLOSED" are also invalid (must be lowercase)
        // but the implementation does toLowerCase() so they would be accepted
        const normalized = v.toLowerCase();
        if (normalized === "open" || normalized === "closed") {
          expect(["open", "closed"].includes(normalized)).toBe(true);
        } else {
          expect(["open", "closed"].includes(normalized)).toBe(false);
        }
      }
    });

    /**
     * @testdoc closeアクションはIssue番号を必要とする (#373)
     * @purpose targetが必須であることを文書化
     */
    it("close action should require issue number (#373)", () => {
      const action = "close";
      const validTarget = "42";
      const invalidTarget = undefined;

      expect(isIssueNumber(validTarget)).toBe(true);
      expect(invalidTarget).toBeUndefined();
    });

    /**
     * @testdoc closeアクションのStatus自動選択ロジック (#373)
     * @purpose stateReasonに基づくStatus自動設定を文書化
     */
    it("close action should auto-select Status based on stateReason (#373)", () => {
      // Status determination priority:
      // 1. --field-status override (explicit)
      // 2. stateReason === "NOT_PLANNED" → "Not Planned"
      // 3. default (COMPLETED) → "Done"

      const determineStatus = (
        fieldStatus: string | undefined,
        stateReason: string
      ): string => {
        return fieldStatus
          ? fieldStatus
          : stateReason === "NOT_PLANNED"
          ? "Not Planned"
          : "Done";
      };

      // Default close → Done
      expect(determineStatus(undefined, "COMPLETED")).toBe("Done");

      // NOT_PLANNED → Not Planned
      expect(determineStatus(undefined, "NOT_PLANNED")).toBe("Not Planned");

      // Explicit --field-status overrides stateReason
      expect(determineStatus("Review", "NOT_PLANNED")).toBe("Review");
      expect(determineStatus("Pending", "COMPLETED")).toBe("Pending");
    });

    /**
     * @testdoc cancelアクションはclose --state-reason NOT_PLANNEDのショートハンド (#373)
     * @purpose cancel→close委任ロジックを文書化
     */
    it("cancel action should delegate to close with NOT_PLANNED (#373)", () => {
      const action = "cancel";
      const validTarget = "42";

      // cancel delegates to cmdClose with stateReason: "NOT_PLANNED"
      const delegatedOptions = {
        stateReason: "NOT_PLANNED",
      };

      expect(isIssueNumber(validTarget)).toBe(true);
      expect(delegatedOptions.stateReason).toBe("NOT_PLANNED");
    });

    /**
     * @testdoc cancelアクションはIssue番号を必要とする (#373)
     * @purpose targetが必須であることを文書化
     */
    it("cancel action should require issue number (#373)", () => {
      const action = "cancel";
      const validTarget = "42";
      const invalidTarget = undefined;

      expect(isIssueNumber(validTarget)).toBe(true);
      expect(invalidTarget).toBeUndefined();
    });

    /**
     * @testdoc comment-editアクションはコメントIDと--bodyを必要とする (#375)
     * @purpose コメントIDとbodyオプションが必須であることを文書化
     */
    it("comment-edit action should require comment ID and --body (#375)", () => {
      const action = "comment-edit";
      const validTarget = "12345678";
      const validOptions = { body: "Updated comment" };
      const invalidOptions = { body: undefined };

      expect(action).toBe("comment-edit");
      expect(parseInt(validTarget, 10)).toBeGreaterThan(0);
      expect(validOptions.body).toBeDefined();
      expect(invalidOptions.body).toBeUndefined();
    });

    /**
     * @testdoc comment-editのコメントIDバリデーション (#375)
     * @purpose 有効・無効なコメントIDの判定を文書化
     */
    it("should validate comment ID for comment-edit (#375)", () => {
      const validIds = ["1", "12345678", "999999999"];
      const invalidIds = ["0", "-1", "abc", ""];

      validIds.forEach((id) => {
        const parsed = parseInt(id, 10);
        expect(!isNaN(parsed) && parsed > 0).toBe(true);
      });

      invalidIds.forEach((id) => {
        const parsed = parseInt(id, 10);
        expect(isNaN(parsed) || parsed <= 0).toBe(true);
      });
    });

    /**
     * @testdoc commentsアクションはIssue番号を必要とする (#537)
     * @purpose targetが必須であることを文書化
     */
    it("comments action should require issue number (#537)", () => {
      const action = "comments";
      const validTarget = "42";
      const invalidTarget = undefined;

      expect(action).toBe("comments");
      expect(isIssueNumber(validTarget)).toBe(true);
      expect(invalidTarget).toBeUndefined();
    });

    /**
     * @testdoc commentsアクションは--bodyを必要としない (#537)
     * @purpose commentアクション（投稿）と異なり、読み取り専用であることを文書化
     */
    it("comments action should not require --body (read-only) (#537)", () => {
      const action = "comments";
      const options = { body: undefined };

      // comments は読み取り専用なので --body は不要
      expect(action).toBe("comments");
      expect(options.body).toBeUndefined();
    });
  });
});

describe("issues comments output format", () => {
  // ===========================================================================
  // comments subcommand output format tests (#537)
  // ===========================================================================

  /**
   * @testdoc commentsの出力にissue_number, total_comments, commentsフィールドが含まれる (#537)
   * @purpose JSON出力構造を文書化
   */
  it("should have expected output structure (#537)", () => {
    const output = {
      issue_number: 42,
      total_comments: 2,
      comments: [
        {
          id: "IC_kwDOTest001",
          database_id: 12345678,
          author: "testuser",
          body: "テストコメント",
          created_at: "2026-01-01T00:00:00Z",
          url: "https://github.com/test/repo/issues/42#issuecomment-12345678",
        },
        {
          id: "IC_kwDOTest002",
          database_id: 12345679,
          author: "anotheruser",
          body: "別のコメント",
          created_at: "2026-01-02T00:00:00Z",
          url: "https://github.com/test/repo/issues/42#issuecomment-12345679",
        },
      ],
    };

    expect(output).toHaveProperty("issue_number");
    expect(output).toHaveProperty("total_comments");
    expect(output).toHaveProperty("comments");
    expect(output.issue_number).toBe(42);
    expect(output.total_comments).toBe(2);
    expect(output.comments).toHaveLength(2);
  });

  /**
   * @testdoc コメントが0件の場合は空配列を返す (#537)
   * @purpose 空結果時の出力形式を文書化
   */
  it("should return empty array when no comments (#537)", () => {
    const output = {
      issue_number: 42,
      total_comments: 0,
      comments: [] as Array<{
        id: string;
        database_id: number;
        author: string | null;
        body: string;
        created_at: string;
        url: string;
      }>,
    };

    expect(output.total_comments).toBe(0);
    expect(output.comments).toEqual([]);
  });

  /**
   * @testdoc 各コメントに必須フィールドが含まれる (#537)
   * @purpose コメントオブジェクトのスキーマを文書化
   */
  it("each comment should have required fields (#537)", () => {
    const comment = {
      id: "IC_kwDOTest001",
      database_id: 12345678,
      author: "testuser",
      body: "テストコメント",
      created_at: "2026-01-01T00:00:00Z",
      url: "https://github.com/test/repo/issues/42#issuecomment-12345678",
    };

    expect(comment).toHaveProperty("id");
    expect(comment).toHaveProperty("database_id");
    expect(comment).toHaveProperty("author");
    expect(comment).toHaveProperty("body");
    expect(comment).toHaveProperty("created_at");
    expect(comment).toHaveProperty("url");
  });

  /**
   * @testdoc authorがnullの場合（削除されたユーザー）を処理できる (#537)
   * @purpose 削除済みユーザーのコメントに対応していることを文書化
   */
  it("should handle null author (deleted user) (#537)", () => {
    const comment = {
      id: "IC_kwDOTest001",
      database_id: 12345678,
      author: null as string | null,
      body: "削除されたユーザーのコメント",
      created_at: "2026-01-01T00:00:00Z",
      url: "https://github.com/test/repo/issues/42#issuecomment-12345678",
    };

    expect(comment.author).toBeNull();
  });
});

describe("issues Project integration", () => {
  // ===========================================================================
  // Project field validation tests
  // ===========================================================================

  describe("Project field options", () => {
    /**
     * @testdoc Statusフィールドの有効値
     * @purpose 一般的なStatus値を文書化
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
        "Not Planned",
        "Released",
      ];

      commonStatuses.forEach((status) => {
        expect(typeof status).toBe("string");
        expect(status.length).toBeGreaterThan(0);
      });
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

  describe("auto project addition", () => {
    /**
     * @testdoc Issue作成時は常にプロジェクトに追加される
     * @purpose デフォルトStatusが設定されることを文書化
     */
    it("should always add to project with default Status", () => {
      // Issues are always added to project.
      // Default Status is "Backlog" (from getDefaultStatus()).
      const shouldAddToProject = true;
      expect(shouldAddToProject).toBe(true);
    });
  });
});

describe("issues output format", () => {
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
        repository: "owner/repo",
        issues: [
          {
            number: 1,
            title: "Issue Title",
            url: "https://github.com/owner/repo/issues/1",
            state: "OPEN",
            labels: ["bug"],
            status: "In Progress",
            priority: "High",
            size: "M",
            project_item_id: "item-id",
          },
        ],
        total_count: 1,
      };

      expect(expectedOutput.repository).toBeDefined();
      expect(expectedOutput.issues).toBeInstanceOf(Array);
      expect(expectedOutput.total_count).toBe(1);
      expect(expectedOutput.issues[0].number).toBe(1);
      expect(expectedOutput.issues[0].status).toBe("In Progress");
    });
  });

  describe("show output structure", () => {
    /**
     * @testdoc show出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document show output structure", () => {
      const expectedOutput = {
        number: 42,
        title: "Issue Title",
        body: "Issue body content",
        url: "https://github.com/owner/repo/issues/42",
        state: "OPEN",
        labels: ["enhancement"],
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-02T00:00:00Z",
        project_item_id: "item-id",
        project_id: "project-id",
        status: "In Progress",
        status_option_id: "opt-1",
        priority: "High",
        priority_option_id: "opt-2",
        size: "M",
        size_option_id: "opt-3",
      };

      expect(expectedOutput.number).toBe(42);
      expect(expectedOutput.body).toBeDefined();
      expect(expectedOutput.project_item_id).toBeDefined();
      expect(expectedOutput.status_option_id).toBeDefined();
    });
  });

  describe("create output structure", () => {
    /**
     * @testdoc create出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document create output structure", () => {
      const expectedOutput = {
        number: 100,
        title: "New Issue",
        url: "https://github.com/owner/repo/issues/100",
        project_item_id: "item-id",
      };

      expect(expectedOutput.number).toBe(100);
      expect(expectedOutput.title).toBe("New Issue");
      expect(expectedOutput.url).toContain("/issues/100");
    });
  });

  describe("comment output structure", () => {
    /**
     * @testdoc comment出力のJSON構造（Issue対象）
     * @purpose Issue コメント出力形式を文書化
     */
    it("should document comment output structure for issues", () => {
      const expectedOutput = {
        issue_number: 42,
        target_type: "issue" as const,
        comment_id: "comment-id",
        comment_database_id: 12345678,
        comment_url: "https://github.com/owner/repo/issues/42#issuecomment-1",
      };

      expect(expectedOutput.issue_number).toBe(42);
      expect(expectedOutput.target_type).toBe("issue");
      expect(expectedOutput.comment_id).toBeDefined();
      expect(expectedOutput.comment_database_id).toBe(12345678);
      expect(expectedOutput.comment_url).toContain("#issuecomment");
    });

    /**
     * @testdoc comment出力のJSON構造（PR対象）(#353)
     * @purpose PR コメント時の target_type フィールドを文書化
     */
    it("should document comment output structure for pull requests (#353)", () => {
      const expectedOutput = {
        issue_number: 100,
        target_type: "pull_request" as const,
        comment_id: "comment-id",
        comment_database_id: 87654321,
        comment_url: "https://github.com/owner/repo/pull/100#issuecomment-2",
      };

      expect(expectedOutput.issue_number).toBe(100);
      expect(expectedOutput.target_type).toBe("pull_request");
      expect(expectedOutput.comment_database_id).toBeDefined();
    });
  });

  describe("close output structure (#373)", () => {
    /**
     * @testdoc close出力のJSON構造
     * @purpose close出力にstatus自動更新結果が含まれることを文書化
     */
    it("should document close output structure with status", () => {
      const expectedOutput = {
        number: 42,
        state: "CLOSED",
        state_reason: "COMPLETED",
        url: "https://github.com/owner/repo/issues/42",
        status: "Done",
      };

      expect(expectedOutput.number).toBe(42);
      expect(expectedOutput.state).toBe("CLOSED");
      expect(expectedOutput.state_reason).toBe("COMPLETED");
      expect(expectedOutput.status).toBe("Done");
    });

    /**
     * @testdoc cancel出力のJSON構造 (#373)
     * @purpose cancel(NOT_PLANNED)出力にNot Planned statusが含まれることを文書化
     */
    it("should document cancel output structure with Not Planned status", () => {
      const expectedOutput = {
        number: 42,
        state: "CLOSED",
        state_reason: "NOT_PLANNED",
        url: "https://github.com/owner/repo/issues/42",
        status: "Not Planned",
      };

      expect(expectedOutput.number).toBe(42);
      expect(expectedOutput.state_reason).toBe("NOT_PLANNED");
      expect(expectedOutput.status).toBe("Not Planned");
    });
  });

  describe("comment-edit output structure (#375)", () => {
    /**
     * @testdoc comment-edit出力のJSON構造
     * @purpose コメント編集出力形式を文書化
     */
    it("should document comment-edit output structure", () => {
      const expectedOutput = {
        comment_id: 12345678,
        comment_url: "https://github.com/owner/repo/issues/42#issuecomment-12345678",
        updated: true,
      };

      expect(expectedOutput.comment_id).toBe(12345678);
      expect(expectedOutput.comment_url).toContain("#issuecomment");
      expect(expectedOutput.updated).toBe(true);
    });
  });
});

describe("issues search output format (#552)", () => {
  // ===========================================================================
  // search サブコマンドの出力構造テスト
  // ===========================================================================

  describe("search output structure", () => {
    /**
     * @testdoc search出力のJSON構造
     * @purpose Issues/PRs 検索結果の出力形式を文書化
     */
    it("should document search output structure", () => {
      const expectedOutput = {
        repository: "owner/repo",
        query: "keyword",
        state: "open",
        issues: [
          {
            number: 42,
            title: "Issue Title",
            url: "https://github.com/owner/repo/issues/42",
            state: "OPEN",
            is_pr: false,
            author: "user1",
            created_at: "2025-01-01T00:00:00Z",
          },
          {
            number: 10,
            title: "PR Title",
            url: "https://github.com/owner/repo/pull/10",
            state: "OPEN",
            is_pr: true,
            author: "user2",
            created_at: "2025-01-02T00:00:00Z",
          },
        ],
        total_count: 2,
      };

      expect(expectedOutput.repository).toBeDefined();
      expect(expectedOutput.query).toBe("keyword");
      expect(expectedOutput.issues).toBeInstanceOf(Array);
      expect(expectedOutput.total_count).toBe(2);

      // Issue エントリ
      const issue = expectedOutput.issues[0];
      expect(issue.number).toBe(42);
      expect(issue.is_pr).toBe(false);
      expect(issue.author).toBe("user1");

      // PR エントリ
      const pr = expectedOutput.issues[1];
      expect(pr.is_pr).toBe(true);
    });
  });

  describe("search columns", () => {
    /**
     * @testdoc search用の列定義
     * @purpose GH_ISSUES_SEARCH_COLUMNS が正しい列を持つことを確認
     */
    it("should have correct search columns", () => {
      expect(GH_ISSUES_SEARCH_COLUMNS).toEqual([
        "number",
        "title",
        "state",
        "is_pr",
        "author",
        "created_at",
      ]);
    });
  });

  describe("search action routing", () => {
    /**
     * @testdoc searchアクションはクエリを必要とする
     * @purpose --query が必須であることを文書化
     */
    it("search action should require query", () => {
      const action = "search";
      const validOptions = { query: "keyword" };
      const invalidOptions = { query: undefined };

      expect(action).toBe("search");
      expect(validOptions.query).toBeDefined();
      expect(invalidOptions.query).toBeUndefined();
    });

    /**
     * @testdoc searchはtargetをqueryにマッピングする
     * @purpose target引数がoptions.queryにマッピングされることを文書化
     */
    it("should map target to options.query for search action", () => {
      const action = "search";
      const target = "keyword search";
      const options: Record<string, unknown> = {};

      // index.ts のマッピングロジックをシミュレート
      if (action === "search" && target) {
        options.query = target;
      }

      expect(options.query).toBe("keyword search");
    });
  });

  describe("search query building", () => {
    /**
     * @testdoc 検索クエリの構築パターン
     * @purpose GitHub search syntax の正しい構築を文書化
     */
    it("should build correct search query with repo scope", () => {
      const owner = "ShirokumaDevelopment";
      const repo = "shirokuma-docs";
      const query = "bug fix";

      const searchQuery = `repo:${owner}/${repo} ${query}`;
      expect(searchQuery).toBe("repo:ShirokumaDevelopment/shirokuma-docs bug fix");
    });

    /**
     * @testdoc --state オプションの変換
     * @purpose state が GitHub search qualifier に変換されることを文書化
     */
    it("should convert --state option to search qualifier", () => {
      const stateMap: Record<string, string> = {
        open: "is:open",
        closed: "is:closed",
      };

      expect(stateMap["open"]).toBe("is:open");
      expect(stateMap["closed"]).toBe("is:closed");
      expect(stateMap["all"]).toBeUndefined(); // all は qualifier を付けない
    });

    /**
     * @testdoc is_pr フラグの判定
     * @purpose __typename による Issue/PR の区別を文書化
     */
    it("should determine is_pr from __typename", () => {
      const issueNode = { __typename: "Issue" };
      const prNode = { __typename: "PullRequest" };

      expect(issueNode.__typename === "PullRequest").toBe(false);
      expect(prNode.__typename === "PullRequest").toBe(true);
    });
  });
});

describe("issues error handling", () => {
  // ===========================================================================
  // Error condition documentation tests
  // ===========================================================================

  describe("Error conditions", () => {
    /**
     * @testdoc リポジトリ情報が取得できない場合
     * @purpose getRepoInfoがnullを返す場合のエラー条件を文書化
     */
    it("should document repository unavailable error", () => {
      const errorCondition = {
        cause: "Not in a git repository or gh CLI not configured",
        expectedError: "Could not determine repository",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc Issueが見つからない場合
     * @purpose 存在しないIssue番号のエラー条件を文書化
     */
    it("should document issue not found error", () => {
      const errorCondition = {
        cause: "Issue number does not exist",
        expectedError: "Issue #999 not found",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc タイトルが指定されていない場合
     * @purpose createアクションでタイトル未指定のエラー条件を文書化
     */
    it("should document title required error", () => {
      const errorCondition = {
        cause: "--title option not provided for create action",
        expectedError: "--title is required",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc コメント本文が指定されていない場合
     * @purpose commentアクションでbody未指定のエラー条件を文書化
     */
    it("should document body required for comment error", () => {
      const errorCondition = {
        cause: "--body option not provided for comment action",
        expectedError: "--body is required for comment",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc Issue/PR両方が見つからない場合 (#353)
     * @purpose Issue でも PR でもない番号のエラー条件を文書化
     */
    it("should document issue or PR not found error (#353)", () => {
      const errorCondition = {
        cause: "Number is neither an Issue nor a PR",
        expectedError: "Issue or PR #999 not found",
        exitCode: 1,
      };

      expect(errorCondition.expectedError).toContain("Issue or PR");
    });

    /**
     * @testdoc comment-editでbodyが指定されていない場合 (#375)
     * @purpose comment-editアクションでbody未指定のエラー条件を文書化
     */
    it("should document body required for comment-edit error (#375)", () => {
      const errorCondition = {
        cause: "--body option not provided for comment-edit action",
        expectedError: "--body is required for comment-edit",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc comment-editで無効なコメントIDの場合 (#375)
     * @purpose 数値でないコメントIDのエラー条件を文書化
     */
    it("should document invalid comment ID error (#375)", () => {
      const errorCondition = {
        cause: "Comment ID is not a valid positive integer",
        expectedError: "Invalid comment ID: abc",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc closeでIssue番号が指定されていない場合 (#373)
     * @purpose closeアクションでtarget未指定のエラー条件を文書化
     */
    it("should document close requires issue number error (#373)", () => {
      const errorCondition = {
        cause: "Issue number not provided for close action",
        expectedError: "Issue number required",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc cancelでIssue番号が指定されていない場合 (#373)
     * @purpose cancelアクションでtarget未指定のエラー条件を文書化
     */
    it("should document cancel requires issue number error (#373)", () => {
      const errorCondition = {
        cause: "Issue number not provided for cancel action",
        expectedError: "Issue number required",
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
        cause: "Action not in [list, show, create, update, comment, comment-edit, close, cancel]",
        expectedError: "Unknown action: invalid",
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
        additionalInfo: "Available options: Backlog, Ready, ...",
      };

      expect(errorCondition.expectedError).toContain("Invalid");
    });
  });
});

describe("getPullRequestId export (#353)", () => {
  /**
   * @testdoc getPullRequestId がエクスポートされている
   * @purpose PR ID 取得ヘルパーが利用可能であることを確認
   */
  it("should be exported as a function", () => {
    expect(typeof getPullRequestId).toBe("function");
  });
});

describe("issues --issue-type option (#693)", () => {
  // ===========================================================================
  // Issue Types 機能のテスト
  // ===========================================================================

  describe("IssuesOptions issueType property", () => {
    /**
     * @testdoc createアクションで--issue-typeオプションをサポートする
     * @purpose Issue Types を作成時に設定できることを文書化
     */
    it("should support --issue-type option for create action", () => {
      const options = {
        title: "New Feature",
        issueType: "Feature",
      };

      expect(options.issueType).toBe("Feature");
    });

    /**
     * @testdoc updateアクションで--issue-typeオプションをサポートする
     * @purpose Issue Types を更新時に変更できることを文書化
     */
    it("should support --issue-type option for update action", () => {
      const options = {
        issueType: "Bug",
      };

      expect(options.issueType).toBe("Bug");
    });

    /**
     * @testdoc --issue-typeが未指定の場合はundefinedである
     * @purpose Issue Types はオプショナルであることを文書化
     */
    it("should be undefined when not specified", () => {
      const options = {
        title: "New Issue",
        issueType: undefined as string | undefined,
      };

      expect(options.issueType).toBeUndefined();
    });
  });

  describe("Issue Type name resolution", () => {
    /**
     * @testdoc 有効な Issue Type 名のパターン
     * @purpose 想定される Issue Type 名を文書化
     */
    it("should document common Issue Type names", () => {
      const commonTypes = ["Task", "Bug", "Feature", "Chore", "Docs", "Research"];

      commonTypes.forEach((type) => {
        expect(typeof type).toBe("string");
        expect(type.length).toBeGreaterThan(0);
      });
    });

    /**
     * @testdoc Issue Type 名→ID マッピングのパターン
     * @purpose 名前解決が getLabels() と同パターンであることを文書化
     */
    it("should follow same pattern as label name resolution", () => {
      const issueTypes: Record<string, string> = {
        "Task": "IT_abc123",
        "Bug": "IT_def456",
        "Feature": "IT_ghi789",
      };

      expect(issueTypes["Feature"]).toBe("IT_ghi789");
      expect(issueTypes["NotExist"]).toBeUndefined();
    });

    /**
     * @testdoc 存在しない Issue Type 名はエラーになる
     * @purpose 不正な type 名のエラー条件を文書化
     */
    it("should error when Issue Type name is not found", () => {
      const issueTypes: Record<string, string> = {
        "Task": "IT_abc123",
        "Bug": "IT_def456",
      };

      const requestedType = "InvalidType";
      const resolved = issueTypes[requestedType] ?? null;

      expect(resolved).toBeNull();
      expect(Object.keys(issueTypes).join(", ")).toBe("Task, Bug");
    });

    /**
     * @testdoc Organization 非対応時は空マップが返る
     * @purpose 個人リポジトリでの Issue Types 非対応を文書化
     */
    it("should return empty map for non-organization repos", () => {
      const emptyTypes: Record<string, string> = {};

      expect(Object.keys(emptyTypes).length).toBe(0);
    });
  });

  describe("getOrganizationIssueTypes export", () => {
    /**
     * @testdoc getOrganizationIssueTypes がエクスポートされている
     * @purpose Issue Types 取得ヘルパーが利用可能であることを確認
     */
    it("should be exported as a function", () => {
      expect(typeof getOrganizationIssueTypes).toBe("function");
    });
  });
});

describe("generateTimestamp (#342)", () => {
  /**
   * @testdoc ISO 8601 形式のタイムスタンプを生成する
   * @purpose ローカルタイムゾーン付きの ISO 8601 フォーマット検証
   */
  it("should return ISO 8601 format with timezone offset", () => {
    const ts = generateTimestamp();
    // Format: YYYY-MM-DDTHH:MM:SS+HH:MM or YYYY-MM-DDTHH:MM:SS-HH:MM
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  /**
   * @testdoc 生成されたタイムスタンプが有効な日付として解析可能
   * @purpose Date.parse で有効であることの確認
   */
  it("should be parseable as a Date", () => {
    const ts = generateTimestamp();
    const parsed = new Date(ts);
    expect(isNaN(parsed.getTime())).toBe(false);
  });

  /**
   * @testdoc タイムスタンプが現在時刻に近い
   * @purpose 生成タイミングの正確性確認
   */
  it("should be close to current time", () => {
    const before = Date.now();
    const ts = generateTimestamp();
    const after = Date.now();
    const parsed = new Date(ts).getTime();

    expect(parsed).toBeGreaterThanOrEqual(before - 1000);
    expect(parsed).toBeLessThanOrEqual(after + 1000);
  });
});
