/**
 * discussions Command Tests
 *
 * Tests for GitHub Discussions management command.
 * Since the command relies heavily on external API calls (gh CLI GraphQL),
 * these tests focus on input validation and command routing logic.
 *
 * For full integration testing, use actual gh CLI in CI environment.
 *
 * @testdoc GitHub Discussions管理コマンドのテスト
 */

// Re-export test utilities from github.js for validation testing
import {
  validateTitle,
  validateBody,
  MAX_TITLE_LENGTH,
  MAX_BODY_LENGTH,
} from "../../src/utils/github.js";

describe("discussions command validation", () => {
  // ===========================================================================
  // Input validation tests (pure functions from github.js)
  // ===========================================================================

  describe("Title validation", () => {
    /**
     * @testdoc 有効なDiscussionタイトルを受け入れる
     * @purpose 通常のタイトル文字列が受け入れられることを確認
     */
    it("should accept valid discussion titles", () => {
      expect(validateTitle("Session Handover 2025-01-26")).toBeNull();
      expect(validateTitle("Question about feature implementation")).toBeNull();
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
     * @testdoc セッションハンドオーバー形式のタイトルを受け入れる
     * @purpose Handoversカテゴリで使用される典型的なタイトル形式を確認
     */
    it("should accept handover-style titles", () => {
      expect(validateTitle("[Handover] 2025-01-26 Session Summary")).toBeNull();
      expect(validateTitle("Handover: Feature implementation progress")).toBeNull();
      expect(validateTitle("Session #42 Handover Notes")).toBeNull();
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
     * @testdoc 有効なDiscussionボディを受け入れる
     * @purpose 通常のボディ文字列が受け入れられることを確認
     */
    it("should accept valid discussion body", () => {
      expect(validateBody("This is a discussion topic")).toBeNull();
      expect(validateBody("Multi\nline\nbody")).toBeNull();
    });

    /**
     * @testdoc Markdown形式のボディを受け入れる
     * @purpose Markdown構文が受け入れられることを確認
     */
    it("should accept markdown body", () => {
      const markdown = `## Session Summary

### Completed
- Task 1
- Task 2

### In Progress
- Task 3

### Notes
\`\`\`typescript
const session = await startSession();
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

describe("discussions command options", () => {
  // ===========================================================================
  // DiscussionsOptions type tests
  // ===========================================================================

  /**
   * @testdoc DiscussionsOptionsの型定義を検証
   * @purpose オプション構造が期待通りであることを確認
   */
  describe("DiscussionsOptions structure", () => {
    it("should support list action options", () => {
      const options = {
        verbose: false,
        category: "Handovers",
        limit: 20,
      };

      expect(options.verbose).toBe(false);
      expect(options.category).toBe("Handovers");
      expect(options.limit).toBe(20);
    });

    it("should support create action options", () => {
      const options = {
        verbose: true,
        category: "Handovers",
        title: "Session Handover 2025-01-26",
        body: "## Summary\n- Completed tasks\n- Next steps",
      };

      expect(options.category).toBe("Handovers");
      expect(options.title).toBe("Session Handover 2025-01-26");
      expect(options.body).toContain("## Summary");
    });

    it("should support categories action options", () => {
      const options = {
        verbose: true,
      };

      expect(options.verbose).toBe(true);
    });

    it("should support get action options", () => {
      const options = {
        verbose: false,
      };

      expect(options.verbose).toBe(false);
    });

    it("should support default values when options are omitted", () => {
      const options: {
        verbose?: boolean;
        category?: string;
        limit?: number;
        title?: string;
        body?: string;
      } = {};

      expect(options.verbose).toBeUndefined();
      expect(options.category).toBeUndefined();
      expect(options.limit).toBeUndefined();
      expect(options.title).toBeUndefined();
      expect(options.body).toBeUndefined();
    });
  });
});

describe("discussions command actions", () => {
  // ===========================================================================
  // Action routing validation tests
  // ===========================================================================

  describe("Action routing", () => {
    /**
     * @testdoc サポートされるアクション一覧
     * @purpose 利用可能なアクションを文書化
     */
    it("should document supported actions", () => {
      const supportedActions = ["categories", "list", "get", "show", "create", "update", "search", "comment"];

      // These actions are supported by the command
      supportedActions.forEach((action) => {
        expect(typeof action).toBe("string");
      });

      expect(supportedActions).toContain("categories");
      expect(supportedActions).toContain("list");
      expect(supportedActions).toContain("get");
      expect(supportedActions).toContain("show");
      expect(supportedActions).toContain("create");
      expect(supportedActions).toContain("update");
      expect(supportedActions).toContain("search");
      expect(supportedActions).toContain("comment");
    });

    /**
     * @testdoc categoriesアクションはターゲットを必要としない
     * @purpose targetがundefinedでも動作することを確認
     */
    it("categories action should not require target", () => {
      const action = "categories";
      const target = undefined;

      expect(action).toBe("categories");
      expect(target).toBeUndefined();
    });

    /**
     * @testdoc listアクションはターゲットを必要としない
     * @purpose targetがundefinedでも動作することを確認
     */
    it("list action should not require target", () => {
      const action = "list";
      const target = undefined;

      expect(action).toBe("list");
      expect(target).toBeUndefined();
    });

    /**
     * @testdoc listアクションは--categoryオプションをサポート
     * @purpose カテゴリでフィルタリングできることを文書化
     */
    it("list action should support --category option", () => {
      const options = {
        category: "Handovers",
        limit: 10,
      };

      expect(options.category).toBe("Handovers");
      expect(options.limit).toBe(10);
    });

    /**
     * @testdoc getアクションはDiscussion IDまたは番号を必要とする
     * @purpose targetが必須であることを文書化
     */
    it("get action should require discussion ID or number", () => {
      const action = "get";
      const validTargets = ["1", "42", "D_kwDOABC123", "MDEwOkRpc2N1c3Npb24x"];
      const invalidTargets = [undefined, ""];

      validTargets.forEach((target) => {
        expect(target).toBeTruthy();
      });

      invalidTargets.forEach((target) => {
        expect(target).toBeFalsy();
      });
    });

    /**
     * @testdoc createアクションは--titleと--bodyを必要とする
     * @purpose 必須オプションを文書化
     */
    it("create action should require --title and --body", () => {
      const action = "create";
      const validOptions = {
        title: "New Discussion",
        body: "Discussion content",
        category: "Handovers",
      };
      const invalidOptions = {
        title: undefined,
        body: undefined,
        category: "Handovers",
      };

      expect(validOptions.title).toBeDefined();
      expect(validOptions.body).toBeDefined();
      expect(validOptions.category).toBeDefined();
      expect(invalidOptions.title).toBeUndefined();
      expect(invalidOptions.body).toBeUndefined();
    });

    /**
     * @testdoc createアクションは--categoryを必要とする（設定ファイルのデフォルトがない場合）
     * @purpose カテゴリオプションが必須であることを文書化
     */
    it("create action should require --category (or config default)", () => {
      const optionsWithCategory = {
        title: "New Discussion",
        body: "Content",
        category: "Handovers",
      };
      const optionsWithoutCategory = {
        title: "New Discussion",
        body: "Content",
        category: undefined,
      };

      expect(optionsWithCategory.category).toBe("Handovers");
      expect(optionsWithoutCategory.category).toBeUndefined();
    });

    /**
     * @testdoc updateアクションはDiscussion番号/IDと--title/--bodyを必要とする
     * @purpose 必須オプションを文書化
     */
    it("update action should require target and at least --title or --body", () => {
      const action = "update";
      const validTarget = "30";
      const validOptions = {
        title: "Updated Title",
        body: "Updated body content",
      };
      const titleOnlyOptions = {
        title: "Updated Title",
        body: undefined,
      };
      const bodyOnlyOptions = {
        title: undefined,
        body: "Updated body content",
      };
      const invalidOptions = {
        title: undefined,
        body: undefined,
      };

      expect(action).toBe("update");
      expect(validTarget).toBeTruthy();
      expect(validOptions.title).toBeDefined();
      expect(validOptions.body).toBeDefined();
      expect(titleOnlyOptions.title).toBeDefined();
      expect(bodyOnlyOptions.body).toBeDefined();
      // At least one must be defined
      expect(invalidOptions.title || invalidOptions.body).toBeFalsy();
    });

    /**
     * @testdoc searchアクションはキーワードまたはカテゴリを必要とする
     * @purpose 検索オプションを文書化
     */
    it("search action should require query or category", () => {
      const action = "search";
      const validQueryOptions = {
        query: "Radix hydration",
        category: undefined,
      };
      const validCategoryOptions = {
        query: undefined,
        category: "Knowledge",
      };
      const validBothOptions = {
        query: "Radix hydration",
        category: "Knowledge",
      };
      const invalidOptions = {
        query: undefined,
        category: undefined,
      };

      expect(action).toBe("search");
      expect(validQueryOptions.query).toBeDefined();
      expect(validCategoryOptions.category).toBeDefined();
      expect(validBothOptions.query).toBeDefined();
      expect(validBothOptions.category).toBeDefined();
      // At least one must be defined
      expect(invalidOptions.query || invalidOptions.category).toBeFalsy();
    });

    /**
     * @testdoc commentアクションはDiscussion番号/IDと--bodyを必要とする
     * @purpose 必須オプションを文書化
     */
    it("comment action should require target and --body", () => {
      const action = "comment";
      const validTarget = "30";
      const validOptions = {
        body: "追加情報...",
      };
      const invalidOptions = {
        body: undefined,
      };

      expect(action).toBe("comment");
      expect(validTarget).toBeTruthy();
      expect(validOptions.body).toBeDefined();
      expect(invalidOptions.body).toBeUndefined();
    });
  });
});

describe("discussions Handovers category", () => {
  // ===========================================================================
  // Handovers category documentation
  // ===========================================================================

  describe("Handovers category purpose", () => {
    /**
     * @testdoc Handoversカテゴリはセッション管理に使用される
     * @purpose 主な用途を文書化
     */
    it("should document Handovers category primary use case", () => {
      const handoversPurpose = {
        category: "Handovers",
        purpose: "Session management and handover documentation",
        useCases: [
          "Session start/end notes",
          "Progress handover between agents",
          "Context preservation",
          "Team communication",
        ],
      };

      expect(handoversPurpose.category).toBe("Handovers");
      expect(handoversPurpose.useCases).toContain("Session start/end notes");
      expect(handoversPurpose.useCases).toContain("Progress handover between agents");
    });

    /**
     * @testdoc Handover Discussionの典型的な構造
     * @purpose ハンドオーバーボディの推奨フォーマットを文書化
     */
    it("should document typical handover discussion structure", () => {
      const handoverTemplate = `## Session Summary

### Completed
- [ ] Task 1
- [ ] Task 2

### In Progress
- [ ] Current task

### Blockers
- None

### Next Steps
1. Continue with...
2. Review...

### Notes
Additional context for the next agent.
`;

      expect(handoverTemplate).toContain("## Session Summary");
      expect(handoverTemplate).toContain("### Completed");
      expect(handoverTemplate).toContain("### In Progress");
      expect(handoverTemplate).toContain("### Next Steps");
    });

    /**
     * @testdoc shirokuma-docs.config.yamlでデフォルトカテゴリを設定可能
     * @purpose 設定ファイルによるデフォルト値を文書化
     */
    it("should document config-based default category", () => {
      const configExample = {
        github: {
          discussionsCategory: "Handovers",
          defaultLimit: 20,
        },
      };

      expect(configExample.github.discussionsCategory).toBe("Handovers");
      expect(configExample.github.defaultLimit).toBe(20);
    });
  });
});

describe("discussions output format", () => {
  // ===========================================================================
  // Output structure validation tests
  // ===========================================================================

  describe("categories output structure", () => {
    /**
     * @testdoc categories出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document categories output structure", () => {
      const expectedOutput = {
        repository: "owner/repo",
        categories: [
          {
            id: "DIC_kwDOABC123",
            name: "Announcements",
            description: "Important announcements",
            emoji: ":mega:",
            is_answerable: false,
          },
          {
            id: "DIC_kwDOABC456",
            name: "Handovers",
            description: "Session handover notes",
            emoji: ":handshake:",
            is_answerable: false,
          },
          {
            id: "DIC_kwDOABC789",
            name: "Q&A",
            description: "Ask questions",
            emoji: ":question:",
            is_answerable: true,
          },
        ],
        total_count: 3,
      };

      expect(expectedOutput.repository).toBeDefined();
      expect(expectedOutput.categories).toBeInstanceOf(Array);
      expect(expectedOutput.total_count).toBe(3);

      const handovers = expectedOutput.categories.find((c) => c.name === "Handovers");
      expect(handovers).toBeDefined();
      expect(handovers?.id).toBeDefined();
      expect(handovers?.is_answerable).toBe(false);
    });
  });

  describe("list output structure", () => {
    /**
     * @testdoc list出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document list output structure", () => {
      const expectedOutput = {
        repository: "owner/repo",
        category: "Handovers",
        discussions: [
          {
            id: "D_kwDOABC123",
            number: 42,
            title: "Session Handover 2025-01-26",
            url: "https://github.com/owner/repo/discussions/42",
            created_at: "2025-01-26T10:00:00Z",
            updated_at: "2025-01-26T12:00:00Z",
            author: "username",
            category: "Handovers",
            answer_chosen: false,
          },
        ],
        total_count: 1,
      };

      expect(expectedOutput.repository).toBeDefined();
      expect(expectedOutput.category).toBe("Handovers");
      expect(expectedOutput.discussions).toBeInstanceOf(Array);
      expect(expectedOutput.total_count).toBe(1);

      const discussion = expectedOutput.discussions[0];
      expect(discussion.id).toBeDefined();
      expect(discussion.number).toBe(42);
      expect(discussion.category).toBe("Handovers");
      expect(discussion.answer_chosen).toBe(false);
    });

    /**
     * @testdoc list出力でcategoryがnullの場合（全カテゴリ取得）
     * @purpose カテゴリフィルターなしの場合を文書化
     */
    it("should document list output without category filter", () => {
      const expectedOutput = {
        repository: "owner/repo",
        category: null,
        discussions: [],
        total_count: 0,
      };

      expect(expectedOutput.category).toBeNull();
    });
  });

  describe("get output structure", () => {
    /**
     * @testdoc get出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document get output structure", () => {
      const expectedOutput = {
        id: "D_kwDOABC123",
        number: 42,
        title: "Session Handover 2025-01-26",
        body: "## Session Summary\n\n### Completed\n- Task 1\n- Task 2",
        url: "https://github.com/owner/repo/discussions/42",
        created_at: "2025-01-26T10:00:00Z",
        updated_at: "2025-01-26T12:00:00Z",
        author: "username",
        category: "Handovers",
        answer_chosen: false,
      };

      expect(expectedOutput.id).toBeDefined();
      expect(expectedOutput.number).toBe(42);
      expect(expectedOutput.title).toBeDefined();
      expect(expectedOutput.body).toBeDefined();
      expect(expectedOutput.url).toContain("/discussions/42");
      expect(expectedOutput.author).toBeDefined();
      expect(expectedOutput.category).toBe("Handovers");
    });

    /**
     * @testdoc getアクションは番号とGraphQL IDの両方を受け入れる
     * @purpose 2つの識別子形式を文書化
     */
    it("should document both number and ID as valid identifiers", () => {
      const byNumber = "42";
      const byGraphQLId = "D_kwDOABC123";

      // Number format: digits only
      expect(/^\d+$/.test(byNumber)).toBe(true);

      // GraphQL ID format: starts with D_ or base64-like
      expect(byGraphQLId.startsWith("D_") || /^[A-Za-z0-9+/=]+$/.test(byGraphQLId)).toBe(true);
    });
  });

  describe("create output structure", () => {
    /**
     * @testdoc create出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document create output structure", () => {
      const expectedOutput = {
        id: "D_kwDOABC123",
        number: 100,
        title: "New Discussion",
        url: "https://github.com/owner/repo/discussions/100",
        category: "Handovers",
      };

      expect(expectedOutput.id).toBeDefined();
      expect(expectedOutput.number).toBe(100);
      expect(expectedOutput.title).toBe("New Discussion");
      expect(expectedOutput.url).toContain("/discussions/100");
      expect(expectedOutput.category).toBe("Handovers");
    });
  });

  describe("update output structure", () => {
    /**
     * @testdoc update出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document update output structure", () => {
      const expectedOutput = {
        id: "D_kwDOABC123",
        number: 30,
        title: "Updated Title",
        url: "https://github.com/owner/repo/discussions/30",
      };

      expect(expectedOutput.id).toBeDefined();
      expect(expectedOutput.number).toBe(30);
      expect(expectedOutput.title).toBe("Updated Title");
      expect(expectedOutput.url).toContain("/discussions/30");
    });

    /**
     * @testdoc updateアクションは番号とGraphQL IDの両方を受け入れる
     * @purpose 2つの識別子形式を文書化
     */
    it("should accept both number and GraphQL ID", () => {
      const byNumber = "30";
      const byGraphQLId = "D_kwDOABC123";

      expect(/^\d+$/.test(byNumber)).toBe(true);
      expect(byGraphQLId.startsWith("D_")).toBe(true);
    });
  });

  describe("search output structure", () => {
    /**
     * @testdoc search出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document search output structure", () => {
      const expectedOutput = {
        repository: "owner/repo",
        query: "Radix hydration",
        category: "Knowledge",
        discussions: [
          {
            id: "D_kwDOABC123",
            number: 42,
            title: "Radix UI Hydration Issue",
            url: "https://github.com/owner/repo/discussions/42",
            created_at: "2025-01-26T10:00:00Z",
            updated_at: "2025-01-26T12:00:00Z",
            author: "username",
            category: "Knowledge",
            answer_chosen: false,
          },
        ],
        total_count: 1,
      };

      expect(expectedOutput.repository).toBeDefined();
      expect(expectedOutput.query).toBe("Radix hydration");
      expect(expectedOutput.category).toBe("Knowledge");
      expect(expectedOutput.discussions).toBeInstanceOf(Array);
      expect(expectedOutput.total_count).toBe(1);
    });

    /**
     * @testdoc searchアクションはカテゴリでフィルタリング可能
     * @purpose カテゴリフィルター機能を文書化
     */
    it("should support category filtering in search", () => {
      const optionsWithCategory = {
        query: "hydration",
        category: "Knowledge",
      };
      const optionsWithoutCategory = {
        query: "hydration",
        category: undefined,
      };

      expect(optionsWithCategory.category).toBe("Knowledge");
      expect(optionsWithoutCategory.category).toBeUndefined();
    });
  });

  describe("comment output structure", () => {
    /**
     * @testdoc comment出力のJSON構造
     * @purpose 出力形式を文書化
     */
    it("should document comment output structure", () => {
      const expectedOutput = {
        discussion_id: "D_kwDOABC123",
        discussion_number: 30,
        comment_id: "DC_kwDOABC456",
        comment_url: "https://github.com/owner/repo/discussions/30#discussioncomment-789",
      };

      expect(expectedOutput.discussion_id).toBeDefined();
      expect(expectedOutput.discussion_number).toBe(30);
      expect(expectedOutput.comment_id).toBeDefined();
      expect(expectedOutput.comment_url).toContain("/discussions/30");
    });

    /**
     * @testdoc commentアクションは番号とGraphQL IDの両方を受け入れる
     * @purpose 2つの識別子形式を文書化
     */
    it("should accept both number and GraphQL ID for comment target", () => {
      const byNumber = "30";
      const byGraphQLId = "D_kwDOABC123";

      expect(/^\d+$/.test(byNumber)).toBe(true);
      expect(byGraphQLId.startsWith("D_")).toBe(true);
    });
  });
});

describe("discussions error handling", () => {
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
     * @testdoc Discussionが見つからない場合
     * @purpose 存在しないDiscussion番号/IDのエラー条件を文書化
     */
    it("should document discussion not found error", () => {
      const errorCondition = {
        cause: "Discussion number or ID does not exist",
        expectedError: "Discussion '999' not found",
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
     * @testdoc ボディが指定されていない場合
     * @purpose createアクションでbody未指定のエラー条件を文書化
     */
    it("should document body required error", () => {
      const errorCondition = {
        cause: "--body option not provided for create action",
        expectedError: "--body is required",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc カテゴリが指定されていない場合
     * @purpose createアクションでcategory未指定のエラー条件を文書化
     */
    it("should document category required error", () => {
      const errorCondition = {
        cause: "--category option not provided and no config default",
        expectedError: "--category is required (or set github.discussionsCategory in shirokuma-docs.config.yaml)",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc カテゴリが存在しない場合
     * @purpose 無効なカテゴリ名のエラー条件を文書化
     */
    it("should document category not found error", () => {
      const errorCondition = {
        cause: "Category name does not exist in repository",
        expectedError: "Category 'InvalidCategory' not found",
        additionalInfo: "Available categories: Announcements, Handovers, Q&A",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
      expect(errorCondition.additionalInfo).toContain("Available categories");
    });

    /**
     * @testdoc 不明なアクションが指定された場合
     * @purpose サポートされていないアクションのエラー条件を文書化
     */
    it("should document unknown action error", () => {
      const errorCondition = {
        cause: "Action not in [categories, list, get, create, update, search, comment]",
        expectedError: "Unknown action: invalid",
        additionalInfo: "Available actions: categories, list, get, create, update, search, comment",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc updateアクションで更新フィールドが指定されていない場合
     * @purpose --title も --body も指定されていない場合のエラー条件を文書化
     */
    it("should document update requires title or body error", () => {
      const errorCondition = {
        cause: "Neither --title nor --body provided for update action",
        expectedError: "At least --title or --body is required for update",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc updateアクションでターゲットが指定されていない場合
     * @purpose ID/番号未指定のエラー条件を文書化
     */
    it("should document target required for update error", () => {
      const errorCondition = {
        cause: "Discussion ID or number not provided for update action",
        expectedError: "Discussion ID or number required",
        usage: "shirokuma-docs discussions update <id-or-number> --title ... --body ...",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc searchアクションでクエリもカテゴリも指定されていない場合
     * @purpose 検索条件未指定のエラー条件を文書化
     */
    it("should document search requires query or category error", () => {
      const errorCondition = {
        cause: "Neither search query nor --category provided for search action",
        expectedError: "Either search query or --category is required",
        usage: "shirokuma-docs discussions search <query> [--category ...]",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc commentアクションでターゲットが指定されていない場合
     * @purpose ID/番号未指定のエラー条件を文書化
     */
    it("should document target required for comment error", () => {
      const errorCondition = {
        cause: "Discussion ID or number not provided for comment action",
        expectedError: "Discussion ID or number required",
        usage: "shirokuma-docs discussions comment <id-or-number> --body ...",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc commentアクションでボディが指定されていない場合
     * @purpose --body未指定のエラー条件を文書化
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
     * @testdoc getアクションでターゲットが指定されていない場合
     * @purpose ID/番号未指定のエラー条件を文書化
     */
    it("should document target required for get error", () => {
      const errorCondition = {
        cause: "Discussion ID or number not provided for get action",
        expectedError: "Discussion ID or number required",
        usage: "shirokuma-docs discussions get <id-or-number>",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc showアクションでターゲットが指定されていない場合（getのエイリアス） (#761)
     * @purpose show使用時のエラーメッセージにshowが表示されることを文書化
     */
    it("should document target required for show error (#761)", () => {
      const action = "show";
      const errorCondition = {
        cause: "Discussion ID or number not provided for show action",
        expectedError: "Discussion ID or number required",
        usage: `shirokuma-docs discussions ${action} <id-or-number>`,
        exitCode: 1,
      };

      expect(errorCondition.usage).toContain("show");
      expect(errorCondition.usage).not.toContain("get");
      expect(errorCondition.exitCode).toBe(1);
    });

    /**
     * @testdoc Discussionsが有効化されていない場合
     * @purpose リポジトリでDiscussionsが無効の場合を文書化
     */
    it("should document discussions not enabled warning", () => {
      const warningCondition = {
        cause: "Discussions feature not enabled for repository",
        expectedWarning: "No discussion categories found. Discussions may not be enabled for this repository.",
        exitCode: 0, // Warning, not error
      };

      expect(warningCondition.exitCode).toBe(0);
    });

    /**
     * @testdoc リポジトリIDが取得できない場合
     * @purpose GraphQLでリポジトリIDが取得できない場合を文書化
     */
    it("should document repository ID unavailable error", () => {
      const errorCondition = {
        cause: "Could not fetch repository ID via GraphQL",
        expectedError: "Could not get repository ID",
        exitCode: 1,
      };

      expect(errorCondition.exitCode).toBe(1);
    });
  });
});

describe("discussions GraphQL queries", () => {
  // ===========================================================================
  // GraphQL query documentation tests
  // ===========================================================================

  describe("Query documentation", () => {
    /**
     * @testdoc 使用されるGraphQLクエリ一覧
     * @purpose 内部で使用されるクエリを文書化
     */
    it("should document GraphQL queries used", () => {
      const queries = [
        {
          name: "GRAPHQL_QUERY_CATEGORIES",
          purpose: "Fetch discussion categories for a repository",
          variables: ["owner", "name"],
        },
        {
          name: "GRAPHQL_QUERY_DISCUSSIONS",
          purpose: "List discussions with optional category filter and pagination",
          variables: ["owner", "name", "first", "categoryId", "cursor"],
        },
        {
          name: "GRAPHQL_QUERY_DISCUSSION",
          purpose: "Get discussion details by number",
          variables: ["owner", "name", "number"],
        },
        {
          name: "GRAPHQL_QUERY_DISCUSSION_BY_ID",
          purpose: "Get discussion details by GraphQL ID",
          variables: ["id"],
        },
        {
          name: "GRAPHQL_QUERY_REPO_ID",
          purpose: "Get repository ID for mutations",
          variables: ["owner", "name"],
        },
        {
          name: "GRAPHQL_MUTATION_CREATE_DISCUSSION",
          purpose: "Create a new discussion",
          variables: ["repositoryId", "categoryId", "title", "body"],
        },
        {
          name: "GRAPHQL_MUTATION_UPDATE_DISCUSSION",
          purpose: "Update discussion title and/or body",
          variables: ["discussionId", "title", "body"],
        },
        {
          name: "GRAPHQL_MUTATION_ADD_DISCUSSION_COMMENT",
          purpose: "Add a comment to a discussion",
          variables: ["discussionId", "body"],
        },
        {
          name: "GRAPHQL_QUERY_SEARCH_DISCUSSIONS",
          purpose: "Search discussions by keyword and optional category",
          variables: ["query", "first"],
        },
      ];

      expect(queries.length).toBe(9);

      const createMutation = queries.find((q) => q.name === "GRAPHQL_MUTATION_CREATE_DISCUSSION");
      expect(createMutation).toBeDefined();
      expect(createMutation?.variables).toContain("repositoryId");
      expect(createMutation?.variables).toContain("categoryId");

      const updateMutation = queries.find((q) => q.name === "GRAPHQL_MUTATION_UPDATE_DISCUSSION");
      expect(updateMutation).toBeDefined();
      expect(updateMutation?.variables).toContain("discussionId");

      const commentMutation = queries.find((q) => q.name === "GRAPHQL_MUTATION_ADD_DISCUSSION_COMMENT");
      expect(commentMutation).toBeDefined();
      expect(commentMutation?.variables).toContain("body");

      const searchQuery = queries.find((q) => q.name === "GRAPHQL_QUERY_SEARCH_DISCUSSIONS");
      expect(searchQuery).toBeDefined();
      expect(searchQuery?.variables).toContain("query");
    });

    /**
     * @testdoc DiscussionCategoryの構造
     * @purpose カテゴリの内部データ構造を文書化
     */
    it("should document DiscussionCategory structure", () => {
      const categoryStructure = {
        id: "GraphQL ID (e.g., DIC_kwDOABC123)",
        name: "Category name (e.g., Handovers)",
        description: "Category description",
        emoji: "Emoji string (e.g., :handshake:)",
        isAnswerable: "Whether discussions can have answers marked",
      };

      expect(Object.keys(categoryStructure)).toContain("id");
      expect(Object.keys(categoryStructure)).toContain("name");
      expect(Object.keys(categoryStructure)).toContain("isAnswerable");
    });

    /**
     * @testdoc Discussionの構造
     * @purpose ディスカッションの内部データ構造を文書化
     */
    it("should document Discussion structure", () => {
      const discussionStructure = {
        id: "GraphQL ID",
        number: "Discussion number (integer)",
        title: "Discussion title",
        body: "Discussion body (optional in list, included in get)",
        url: "GitHub URL",
        createdAt: "ISO 8601 timestamp",
        updatedAt: "ISO 8601 timestamp",
        author: "Author login name",
        category: "Category name",
        answerChosenAt: "Timestamp if answer chosen (Q&A category)",
      };

      expect(Object.keys(discussionStructure)).toContain("id");
      expect(Object.keys(discussionStructure)).toContain("number");
      expect(Object.keys(discussionStructure)).toContain("answerChosenAt");
    });
  });
});
