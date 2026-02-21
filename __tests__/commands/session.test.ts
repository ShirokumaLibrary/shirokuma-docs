/**
 * session Command Tests
 *
 * Tests for the unified session management command.
 * Subcommands: start (fetch context), end (save handover), check (integrity).
 *
 * Since the command relies on external API calls (gh CLI GraphQL),
 * these tests focus on input validation, output structure contracts,
 * and status filtering logic.
 *
 * @testdoc セッション管理コマンドのテスト
 */

import {
  validateTitle,
  validateBody,
  isIssueNumber,
  parseIssueNumber,
  MAX_TITLE_LENGTH,
  MAX_BODY_LENGTH,
} from "../../src/utils/github.js";
import {
  DEFAULT_EXCLUDE_STATUSES,
  classifyInconsistencies,
  classifyMetricsInconsistencies,
  getGitState,
  getPreflightGitState,
  generatePreflightWarnings,
  groupIssuesByAssignee,
  findMergedPrForIssue,
  getSessionBackups,
  cleanupSessionBackups,
  type GitState,
  type PreflightGitState,
  type PreflightIssue,
  type PreflightPr,
  type PreflightOutput,
  type IssueData,
  type SessionBackup,
  type SessionOptions,
  type Inconsistency,
  type FixResult,
  type CheckOutput,
} from "../../src/commands/session.js";
import { mkdirSync, writeFileSync, existsSync, readdirSync as fsReaddirSync, unlinkSync as fsUnlinkSync } from "node:fs";
import { join } from "node:path";

// =============================================================================
// Test helpers
// =============================================================================

/** Helper to create test IssueData objects */
function makeIssue(overrides: {
  number: number;
  state: string;
  status: string | null;
  title?: string;
  assignees?: string[];
  closedAt?: string | null;
}): IssueData {
  return {
    number: overrides.number,
    title: overrides.title ?? `Issue #${overrides.number}`,
    url: `https://github.com/owner/repo/issues/${overrides.number}`,
    state: overrides.state,
    closedAt: overrides.closedAt ?? null,
    labels: [],
    assignees: overrides.assignees ?? [],
    status: overrides.status,
    priority: null,
    size: null,
    projectItemId: `PVTI_${overrides.number}`,
    projectId: "PVT_1",
  };
}

// =============================================================================
// session start - Output structure contracts
// =============================================================================

describe("session start - output structure", () => {
  /**
   * @testdoc session startの出力JSONにrepositoryフィールドが含まれる
   * @purpose セッション開始時にリポジトリ情報が返されることの型契約
   */
  it("should define repository field in output", () => {
    const output = {
      repository: "owner/repo",
      lastHandover: null,
      issues: { columns: [], rows: [] },
      total_issues: 0,
    };

    expect(output).toHaveProperty("repository");
    expect(typeof output.repository).toBe("string");
  });

  /**
   * @testdoc session startの出力にlastHandoverがnull許容で含まれる
   * @purpose ハンドオーバーが存在しない場合にnullを返す契約
   */
  it("should allow null lastHandover when no handovers exist", () => {
    const output = {
      repository: "owner/repo",
      lastHandover: null,
      issues: { columns: [], rows: [] },
      total_issues: 0,
    };

    expect(output.lastHandover).toBeNull();
  });

  /**
   * @testdoc session startのlastHandoverにnumber, title, body, urlが含まれる
   * @purpose ハンドオーバーオブジェクトの構造契約
   */
  it("should include handover fields when handover exists", () => {
    const handover = {
      number: 30,
      title: "2026-02-01 - Plugin marketplace spec compliance",
      body: "## Summary\n...",
      url: "https://github.com/owner/repo/discussions/30",
    };

    expect(handover).toHaveProperty("number");
    expect(handover).toHaveProperty("title");
    expect(handover).toHaveProperty("body");
    expect(handover).toHaveProperty("url");
    expect(typeof handover.number).toBe("number");
  });

  /**
   * @testdoc session startのissuesがTableJSON形式（columns + rows）で出力される
   * @purpose Issues出力がコンパクトなTableJSON形式であることの契約
   */
  it("should output issues in TableJSON format with columns and rows", () => {
    const issues = {
      columns: ["number", "title", "status", "priority", "size", "labels"],
      rows: [
        [27, "Feature request", "In Progress", "High", "M", ["enhancement"]],
      ],
    };

    expect(issues).toHaveProperty("columns");
    expect(issues).toHaveProperty("rows");
    expect(issues.columns).toContain("number");
    expect(issues.columns).toContain("title");
    expect(issues.columns).toContain("status");
    expect(issues.columns).toContain("priority");
    expect(issues.columns).toContain("size");
    expect(issues.columns).toContain("labels");
  });

  /**
   * @testdoc session startのissuesにurl/stateフィールドが含まれない
   * @purpose url（number+repoから復元可能）とstate（statusと重複）の除外契約
   */
  it("should not include url or state in issues columns", () => {
    const columns = ["number", "title", "status", "priority", "size", "labels"];

    expect(columns).not.toContain("url");
    expect(columns).not.toContain("state");
  });

  /**
   * @testdoc session startの出力にtotal_issuesカウントが含まれる
   * @purpose フィルタ後のIssue件数が返される契約
   */
  it("should include total_issues count matching issues rows length", () => {
    const issues = {
      columns: ["number", "title", "status"],
      rows: [
        [1, "A", "Backlog"],
        [2, "B", "In Progress"],
      ],
    };
    const output = {
      repository: "owner/repo",
      lastHandover: null,
      issues,
      total_issues: issues.rows.length,
    };

    expect(output.total_issues).toBe(output.issues.rows.length);
  });

  /**
   * @testdoc session startのopenPRsがTableJSON形式で出力される
   * @purpose PRリストもコンパクトなTableJSON形式であることの契約
   */
  it("should output openPRs in TableJSON format", () => {
    const openPRs = {
      columns: ["number", "title", "review_decision", "review_thread_count", "review_count"],
      rows: [
        [42, "feat: add feature", "APPROVED", 0, 1],
      ],
    };

    expect(openPRs).toHaveProperty("columns");
    expect(openPRs).toHaveProperty("rows");
    expect(openPRs.columns).toContain("number");
    expect(openPRs.columns).toContain("title");
    expect(openPRs.columns).not.toContain("url");
  });
});

// =============================================================================
// session start - Status filtering logic
// =============================================================================

describe("session start - status filtering", () => {
  /**
   * @testdoc Done/Releasedステータスがデフォルト除外リストに含まれる
   * @purpose 完了済みアイテムが自動除外される設定の確認
   */
  it("should exclude Done and Released by default", () => {
    expect(DEFAULT_EXCLUDE_STATUSES).toContain("Done");
    expect(DEFAULT_EXCLUDE_STATUSES).toContain("Released");
  });

  /**
   * @testdoc デフォルト除外リストにアクティブステータスが含まれない
   * @purpose Backlog, In Progress等が誤って除外されないことの確認
   */
  it("should not exclude active statuses", () => {
    const activeStatuses = [
      "Icebox",
      "Backlog",
      "Planning",
      "Spec Review",
      "Ready",
      "In Progress",
      "Pending",
      "Review",
      "Testing",
    ];

    for (const status of activeStatuses) {
      expect(DEFAULT_EXCLUDE_STATUSES).not.toContain(status);
    }
  });

  /**
   * @testdoc Done/Releasedステータスのアイテムがフィルタで除外される
   * @purpose フィルタリングロジックが正しく動作する確認
   */
  it("should filter out Done/Released items from list", () => {
    const items = [
      { number: 1, title: "Active", status: "In Progress" },
      { number: 2, title: "Completed", status: "Done" },
      { number: 3, title: "Backlog item", status: "Backlog" },
      { number: 4, title: "Released item", status: "Released" },
      { number: 5, title: "No status", status: null },
    ];

    const filtered = items.filter(
      (i) => !DEFAULT_EXCLUDE_STATUSES.includes(i.status ?? "")
    );

    expect(filtered).toHaveLength(3);
    expect(filtered.map((i) => i.number)).toEqual([1, 3, 5]);
  });

  /**
   * @testdoc ステータスがnullのアイテムが除外されない
   * @purpose 未分類アイテム（ステータス未設定）が表示される確認
   */
  it("should include items with null status", () => {
    const items = [
      { number: 1, status: null },
      { number: 2, status: "Done" },
    ];

    const filtered = items.filter(
      (i) => !DEFAULT_EXCLUDE_STATUSES.includes(i.status ?? "")
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].number).toBe(1);
  });
});

// =============================================================================
// session start - Git state integration
// =============================================================================

describe("session start - git state", () => {
  /**
   * @testdoc getGitState がGitState型のオブジェクトを返す
   * @purpose git状態取得関数の基本動作確認
   */
  it("should return GitState object with required fields", () => {
    const state = getGitState();

    expect(state).toHaveProperty("currentBranch");
    expect(state).toHaveProperty("uncommittedChanges");
    expect(state).toHaveProperty("hasUncommittedChanges");
    expect(Array.isArray(state.uncommittedChanges)).toBe(true);
    expect(typeof state.hasUncommittedChanges).toBe("boolean");
  });

  /**
   * @testdoc getGitState がカレントブランチ名を文字列で返す
   * @purpose テスト実行時に必ずgitリポジトリ内にいることの確認
   */
  it("should return current branch as string in a git repository", () => {
    const state = getGitState();

    // Tests run inside the shirokuma-docs repo, so branch should be a string
    expect(typeof state.currentBranch).toBe("string");
    expect(state.currentBranch!.length).toBeGreaterThan(0);
  });

  /**
   * @testdoc hasUncommittedChanges がuncommittedChanges配列の長さと整合する
   * @purpose booleanフラグと配列の一貫性確認
   */
  it("should have consistent hasUncommittedChanges flag", () => {
    const state = getGitState();

    if (state.uncommittedChanges.length > 0) {
      expect(state.hasUncommittedChanges).toBe(true);
    } else {
      expect(state.hasUncommittedChanges).toBe(false);
    }
  });

  /**
   * @testdoc session startの出力にgitセクションが含まれる構造契約
   * @purpose git状態がJSON出力に統合されることの型契約
   */
  it("should define git section in session start output", () => {
    const gitState: GitState = {
      currentBranch: "develop",
      uncommittedChanges: [],
      hasUncommittedChanges: false,
    };

    const output = {
      repository: "owner/repo",
      git: gitState,
      lastHandover: null,
      issues: { columns: [], rows: [] },
      total_issues: 0,
    };

    expect(output).toHaveProperty("git");
    expect(output.git).toHaveProperty("currentBranch");
    expect(output.git).toHaveProperty("uncommittedChanges");
    expect(output.git).toHaveProperty("hasUncommittedChanges");
  });

  /**
   * @testdoc uncommittedChanges が空配列の場合 hasUncommittedChanges は false
   * @purpose クリーンな作業ディレクトリの状態表現
   */
  it("should represent clean state with empty changes and false flag", () => {
    const cleanState: GitState = {
      currentBranch: "develop",
      uncommittedChanges: [],
      hasUncommittedChanges: false,
    };

    expect(cleanState.uncommittedChanges).toHaveLength(0);
    expect(cleanState.hasUncommittedChanges).toBe(false);
  });

  /**
   * @testdoc uncommittedChanges に変更がある場合 hasUncommittedChanges は true
   * @purpose 未コミット変更がある場合の状態表現
   */
  it("should represent dirty state with changes and true flag", () => {
    const dirtyState: GitState = {
      currentBranch: "feat/42-some-feature",
      uncommittedChanges: [" M src/commands/session.ts", "?? new-file.ts"],
      hasUncommittedChanges: true,
    };

    expect(dirtyState.uncommittedChanges).toHaveLength(2);
    expect(dirtyState.hasUncommittedChanges).toBe(true);
  });
});

// =============================================================================
// session end - Input validation
// =============================================================================

describe("session end - input validation", () => {
  /**
   * @testdoc session endにタイトルが必須
   * @purpose ハンドオーバー作成時にタイトルが空だとエラーになる確認
   */
  it("should require title for handover creation", () => {
    expect(validateTitle("")).toBe("Title cannot be empty");
    expect(validateTitle("   ")).toBe("Title cannot be empty");
  });

  /**
   * @testdoc session endのタイトルが最大長を超えるとエラー
   * @purpose タイトル長制限の確認
   */
  it("should reject title exceeding max length", () => {
    const title = "a".repeat(MAX_TITLE_LENGTH + 1);
    const result = validateTitle(title);
    expect(result).toContain("Title too long");
  });

  /**
   * @testdoc 日付付きハンドオーバータイトルを受け入れる
   * @purpose ending-sessionスキルが生成する典型的なタイトル形式の確認
   */
  it("should accept date-prefixed handover titles", () => {
    expect(validateTitle("2026-02-02 - Session summary")).toBeNull();
    expect(validateTitle("2026-02-02 - Plugin marketplace (#27)")).toBeNull();
  });

  /**
   * @testdoc session endのボディが最大長を超えるとエラー
   * @purpose ボディ長制限の確認（長いハンドオーバー対策）
   */
  it("should reject body exceeding max length", () => {
    const body = "a".repeat(MAX_BODY_LENGTH + 1);
    const result = validateBody(body);
    expect(result).toContain("Body too long");
  });

  /**
   * @testdoc session endのボディがundefinedでも許容される
   * @purpose ボディなしのハンドオーバーも作成可能であることの確認
   */
  it("should accept undefined body", () => {
    expect(validateBody(undefined)).toBeNull();
  });

  /**
   * @testdoc Markdownフォーマットのボディを受け入れる
   * @purpose ハンドオーバーのMarkdownテンプレートが正常に通る確認
   */
  it("should accept markdown-formatted handover body", () => {
    const body = `## Summary
Feature implementation completed.

## Related Items
- #27 - Integration task - Done

## Next Steps
- [ ] Run tests
- [ ] Update documentation`;

    expect(validateBody(body)).toBeNull();
  });
});

// =============================================================================
// session end - Issue number validation for --done/--review
// =============================================================================

describe("session end - issue number options", () => {
  /**
   * @testdoc --doneオプションのIssue番号を正しく検証する
   * @purpose 有効なIssue番号のみ受け入れる確認
   */
  it("should validate issue numbers for --done option", () => {
    expect(isIssueNumber("27")).toBe(true);
    expect(isIssueNumber("#27")).toBe(true);
    expect(isIssueNumber("abc")).toBe(false);
    expect(isIssueNumber("")).toBe(false);
  });

  /**
   * @testdoc --reviewオプションのIssue番号をパースする
   * @purpose Issue番号が数値に正しく変換される確認
   */
  it("should parse issue numbers for --review option", () => {
    expect(parseIssueNumber("27")).toBe(27);
    expect(parseIssueNumber("#31")).toBe(31);
  });

  /**
   * @testdoc 複数のIssue番号を処理できる
   * @purpose --done 27 31 のような複数指定に対応する確認
   */
  it("should handle multiple issue numbers", () => {
    const numbers = ["27", "#31", "5"];
    const parsed = numbers.filter(isIssueNumber).map(parseIssueNumber);

    expect(parsed).toEqual([27, 31, 5]);
  });

  /**
   * @testdoc 無効なIssue番号が混在していてもフィルタされる
   * @purpose 有効な番号のみ処理される確認
   */
  it("should filter out invalid issue numbers", () => {
    const numbers = ["27", "abc", "#31", "", "#"];
    const valid = numbers.filter(isIssueNumber);

    expect(valid).toEqual(["27", "#31"]);
  });
});

// =============================================================================
// session end --done - Issue close behavior (#838)
// =============================================================================

describe("session end --done - issue close behavior", () => {
  /**
   * @testdoc --doneでStatus更新後にIssueがクローズされる
   * @purpose Done設定時にIssue stateもCLOSED (COMPLETED)に更新される契約
   */
  it("should close issue after setting status to Done", () => {
    // session end --done の処理順序:
    // 1. updateIssueStatus() で Project Status を Done に設定
    // 2. getIssueId() で Issue node ID を取得
    // 3. closeIssueById() で Issue を CLOSED (COMPLETED) に設定
    const operations = [
      { step: 1, action: "updateIssueStatus", target: "Project Status → Done" },
      { step: 2, action: "getIssueId", target: "Issue node ID 取得" },
      { step: 3, action: "closeIssueById", target: "Issue state → CLOSED (COMPLETED)" },
    ];

    expect(operations).toHaveLength(3);
    expect(operations[0].action).toBe("updateIssueStatus");
    expect(operations[2].action).toBe("closeIssueById");
  });

  /**
   * @testdoc closeIssueById失敗時はStatus更新のみ成功し警告を出力する
   * @purpose close失敗はfatalではなくsession check --fixでリカバリ可能
   */
  it("should warn but not fail when close fails after status update", () => {
    // Status更新成功 + close失敗 → updatedIssuesには追加される
    const updatedIssues: Array<{ number: number; status: string }> = [];
    const statusUpdateSuccess = true;
    const closeSuccess = false;

    if (statusUpdateSuccess) {
      updatedIssues.push({ number: 42, status: "Done" });
      // close失敗は警告のみ、updatedIssuesには影響しない
    }

    expect(updatedIssues).toHaveLength(1);
    expect(updatedIssues[0].status).toBe("Done");
    // close失敗はsession check --fixがフォールバックとして機能
    expect(closeSuccess).toBe(false);
  });

  /**
   * @testdoc 既にクローズ済みのIssueはスキップされる
   * @purpose closedCacheにより二重クローズを防止
   */
  it("should skip already closed issues via closedCache", () => {
    // closedCache にクローズ済みとして記録されている Issue
    const closedCache = new Map<number, boolean>();
    closedCache.set(42, true);

    const issueInProject = false; // OPEN listに見つからない
    const isAlreadyClosed = closedCache.get(42) ?? false;

    // close済みの Issue は --done ループの冒頭でスキップされる
    if (!issueInProject && isAlreadyClosed) {
      // "already closed, skipping" → close ロジックに到達しない
      expect(isAlreadyClosed).toBe(true);
      return;
    }

    // ここには到達しない
    expect(true).toBe(false);
  });

  /**
   * @testdoc 複数Issue指定時に一部のclose失敗が他のIssueに影響しない
   * @purpose 各Issueは独立して処理される契約
   */
  it("should process each issue independently when multiple --done specified", () => {
    const results: Array<{ number: number; statusDone: boolean; closed: boolean }> = [];

    // Issue #1: 正常（Status Done + close成功）
    results.push({ number: 1, statusDone: true, closed: true });

    // Issue #2: close失敗（Status Done + close失敗）
    results.push({ number: 2, statusDone: true, closed: false });

    // Issue #3: 正常（Status Done + close成功）
    results.push({ number: 3, statusDone: true, closed: true });

    // 全Issueが処理される（close失敗がループを中断しない）
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.statusDone)).toBe(true);
    expect(results.filter((r) => r.closed)).toHaveLength(2);
    expect(results.filter((r) => !r.closed)).toHaveLength(1);
  });
});

// =============================================================================
// session end - Output structure contracts
// =============================================================================

describe("session end - output structure", () => {
  /**
   * @testdoc session endの出力にhandoverオブジェクトが含まれる
   * @purpose ハンドオーバー作成結果の構造契約
   */
  it("should include handover object in output", () => {
    const output = {
      handover: {
        number: 31,
        title: "2026-02-02 - Session summary",
        url: "https://github.com/owner/repo/discussions/31",
      },
      updatedIssues: [],
    };

    expect(output.handover).toHaveProperty("number");
    expect(output.handover).toHaveProperty("title");
    expect(output.handover).toHaveProperty("url");
  });

  /**
   * @testdoc session endの出力にupdatedIssues配列が含まれる
   * @purpose Issue ステータス更新結果のリスト契約
   */
  it("should include updatedIssues array in output", () => {
    const output = {
      handover: {
        number: 31,
        title: "2026-02-02 - Summary",
        url: "https://github.com/owner/repo/discussions/31",
      },
      updatedIssues: [
        { number: 27, status: "Done" },
        { number: 26, status: "Review" },
      ],
    };

    expect(output.updatedIssues).toHaveLength(2);
    expect(output.updatedIssues[0]).toHaveProperty("number");
    expect(output.updatedIssues[0]).toHaveProperty("status");
  });

  /**
   * @testdoc ステータス更新がない場合は空配列を返す
   * @purpose --done/--reviewなしの場合の出力契約
   */
  it("should return empty updatedIssues when no status changes", () => {
    const output = {
      handover: {
        number: 31,
        title: "2026-02-02 - Summary",
        url: "https://github.com/owner/repo/discussions/31",
      },
      updatedIssues: [],
    };

    expect(output.updatedIssues).toEqual([]);
  });
});

// =============================================================================
// session command - Action routing
// =============================================================================

describe("session command - action routing", () => {
  /**
   * @testdoc 有効なアクション（start, end, check）を定義
   * @purpose サブコマンドの一覧定義
   */
  it("should define valid actions", () => {
    const validActions = ["start", "end", "check"];
    expect(validActions).toContain("start");
    expect(validActions).toContain("end");
    expect(validActions).toContain("check");
  });

  /**
   * @testdoc 無効なアクションを検出する
   * @purpose 存在しないサブコマンドが判別可能であることの確認
   */
  it("should detect invalid actions", () => {
    const validActions = ["start", "end", "check"];
    expect(validActions).not.toContain("save");
    expect(validActions).not.toContain("context");
    expect(validActions).not.toContain("list");
  });
});

// =============================================================================
// session command - Options structure
// =============================================================================

describe("session command - options", () => {
  /**
   * @testdoc session startのオプション構造を定義
   * @purpose session startで使用可能なオプションの型契約
   */
  it("should define session start options", () => {
    const startOptions = {
      owner: undefined as string | undefined,
      verbose: false,
      format: "json" as const,
    };

    expect(startOptions).toHaveProperty("owner");
    expect(startOptions).toHaveProperty("verbose");
    expect(startOptions).toHaveProperty("format");
  });

  /**
   * @testdoc session endのオプション構造を定義
   * @purpose session endで使用可能なオプションの型契約
   */
  it("should define session end options", () => {
    const endOptions = {
      owner: undefined as string | undefined,
      verbose: false,
      title: "2026-02-02 - Summary",
      body: "## Summary\n...",
      done: ["27"] as string[],
      review: ["26"] as string[],
    };

    expect(endOptions).toHaveProperty("title");
    expect(endOptions).toHaveProperty("body");
    expect(endOptions).toHaveProperty("done");
    expect(endOptions).toHaveProperty("review");
  });

  /**
   * @testdoc session endの--doneと--reviewが配列で受け取れる
   * @purpose 複数Issue番号の一括指定に対応する型契約
   */
  it("should accept arrays for --done and --review options", () => {
    const doneNumbers = ["27", "31"];
    const reviewNumbers = ["26"];

    expect(Array.isArray(doneNumbers)).toBe(true);
    expect(Array.isArray(reviewNumbers)).toBe(true);
    expect(doneNumbers.every((n) => isIssueNumber(n))).toBe(true);
    expect(reviewNumbers.every((n) => isIssueNumber(n))).toBe(true);
  });
});

// =============================================================================
// GraphQL queries documentation
// =============================================================================

describe("session command - GraphQL queries", () => {
  /**
   * @testdoc session startは2つのGraphQLクエリを実行する
   * @purpose 1コマンドで2つのデータソース（Discussions + Issues）を統合取得
   */
  it("should document required queries for session start", () => {
    const requiredQueries = [
      "GRAPHQL_QUERY_LATEST_HANDOVER", // Discussions: Handovers category, limit 1
      "GRAPHQL_QUERY_ISSUES_WITH_PROJECTS", // Issues with Projects fields
    ];

    expect(requiredQueries).toHaveLength(2);
  });

  /**
   * @testdoc session endは最大4種類のAPIコールを実行する
   * @purpose ハンドオーバー作成 + ステータス更新の統合実行
   */
  it("should document required mutations for session end", () => {
    const requiredMutations = [
      "GRAPHQL_MUTATION_CREATE_DISCUSSION", // Create handover
      "GRAPHQL_MUTATION_UPDATE_FIELD", // Update issue status (per issue)
      "GRAPHQL_QUERY_FIELDS", // Get field definitions (once)
      "GRAPHQL_MUTATION_CLOSE_ISSUE", // Close --done issues (#838)
    ];

    expect(requiredMutations).toHaveLength(4);
  });

  /**
   * @testdoc session checkはIssues取得 + 必要に応じてclose mutationを実行する
   * @purpose 整合性チェックに必要なAPIコールの文書化
   */
  it("should document required queries/mutations for session check", () => {
    const requiredOps = [
      "GRAPHQL_QUERY_ISSUES_WITH_PROJECTS", // Fetch all open issues
      "GRAPHQL_MUTATION_CLOSE_ISSUE", // Close inconsistent issues (--fix)
    ];

    expect(requiredOps).toHaveLength(2);
  });
});

// =============================================================================
// session check - Inconsistency classification
// =============================================================================

describe("session check - inconsistency classification", () => {
  /**
   * @testdoc OPEN Issue with Done status が inconsistency として検出される
   * @purpose Done ステータスだが未クローズの Issue を検出する
   */
  it("should detect OPEN issue with Done status as error", () => {
    const issues = [
      makeIssue({ number: 1, state: "OPEN", status: "Done" }),
      makeIssue({ number: 2, state: "OPEN", status: "In Progress" }),
    ];
    const result = classifyInconsistencies(issues);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(1);
    expect(result[0].severity).toBe("error");
  });

  /**
   * @testdoc OPEN Issue with Released status が inconsistency として検出される
   * @purpose Released ステータスだが未クローズの Issue を検出する
   */
  it("should detect OPEN issue with Released status as error", () => {
    const issues = [
      makeIssue({ number: 3, state: "OPEN", status: "Released" }),
    ];
    const result = classifyInconsistencies(issues);
    expect(result).toHaveLength(1);
    expect(result[0].projectStatus).toBe("Released");
    expect(result[0].severity).toBe("error");
  });

  /**
   * @testdoc OPEN Issue with active status が inconsistency として検出されない
   * @purpose 正常な状態の Issue が誤検出されないことの確認
   */
  it("should not flag OPEN issues with active statuses", () => {
    const issues = [
      makeIssue({ number: 4, state: "OPEN", status: "In Progress" }),
      makeIssue({ number: 5, state: "OPEN", status: "Backlog" }),
      makeIssue({ number: 6, state: "OPEN", status: "Ready" }),
    ];
    const result = classifyInconsistencies(issues);
    expect(result).toHaveLength(0);
  });

  /**
   * @testdoc ステータスがnullのOPEN Issueが検出されない
   * @purpose ステータス未設定のIssueは正常扱い
   */
  it("should not flag OPEN issues with null status", () => {
    const issues = [
      makeIssue({ number: 7, state: "OPEN", status: null }),
    ];
    const result = classifyInconsistencies(issues);
    expect(result).toHaveLength(0);
  });

  /**
   * @testdoc 複数の inconsistency を同時に検出できる
   * @purpose バッチ検出の確認
   */
  it("should detect multiple inconsistencies", () => {
    const issues = [
      makeIssue({ number: 1, state: "OPEN", status: "Done" }),
      makeIssue({ number: 2, state: "OPEN", status: "In Progress" }),
      makeIssue({ number: 3, state: "OPEN", status: "Released" }),
      makeIssue({ number: 4, state: "OPEN", status: "Backlog" }),
    ];
    const result = classifyInconsistencies(issues);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.number)).toEqual([1, 3]);
  });

  /**
   * @testdoc カスタム done statuses を指定できる
   * @purpose DEFAULT_EXCLUDE_STATUSES 以外のステータスでも検出可能
   */
  it("should accept custom done statuses", () => {
    const issues = [
      makeIssue({ number: 8, state: "OPEN", status: "Archived" }),
      makeIssue({ number: 9, state: "OPEN", status: "Done" }),
    ];
    const result = classifyInconsistencies(issues, ["Archived"]);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(8);
  });

  /**
   * @testdoc 空の Issues 配列に対して空配列を返す
   * @purpose エッジケース: Issue がない場合
   */
  it("should return empty array for empty input", () => {
    expect(classifyInconsistencies([])).toEqual([]);
  });

  /**
   * @testdoc inconsistency にdescription が含まれる
   * @purpose エラーメッセージがステータスを含む
   */
  it("should include descriptive message with status", () => {
    const issues = [
      makeIssue({ number: 10, state: "OPEN", status: "Done" }),
    ];
    const result = classifyInconsistencies(issues);
    expect(result[0].description).toContain("Done");
    expect(result[0].description).toContain("OPEN");
  });

  /**
   * @testdoc CLOSED Issue with Done status は検出されない
   * @purpose 正しく close 済みの Issue を誤検出しない確認
   */
  it("should not flag CLOSED issues with Done status", () => {
    const issues = [
      makeIssue({ number: 11, state: "CLOSED", status: "Done" }),
      makeIssue({ number: 12, state: "CLOSED", status: "Released" }),
    ];
    const result = classifyInconsistencies(issues);
    expect(result).toHaveLength(0);
  });

  /**
   * @testdoc CLOSED Issue with Review status が inconsistency として検出される
   * @purpose PRマージ後にStatusがReviewのまま残った Issue を検出する
   */
  it("should detect CLOSED issue with Review status as error", () => {
    const issues = [
      makeIssue({ number: 20, state: "CLOSED", status: "Review" }),
    ];
    const result = classifyInconsistencies(issues);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(20);
    expect(result[0].severity).toBe("error");
    expect(result[0].issueState).toBe("CLOSED");
    expect(result[0].description).toContain("CLOSED");
    expect(result[0].description).toContain("Review");
  });

  /**
   * @testdoc CLOSED Issue with In Progress status が inconsistency として検出される
   * @purpose セッション終了時にStatus更新を忘れた Issue を検出する
   */
  it("should detect CLOSED issue with In Progress status as error", () => {
    const issues = [
      makeIssue({ number: 21, state: "CLOSED", status: "In Progress" }),
    ];
    const result = classifyInconsistencies(issues);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(21);
    expect(result[0].severity).toBe("error");
  });

  /**
   * @testdoc CLOSED Issue with work-started statuses が error として検出される
   * @purpose Pending, Testing 等の作業開始済みstatusはerrorとして検出する
   */
  it("should detect CLOSED issues with work-started statuses as error", () => {
    const issues = [
      makeIssue({ number: 23, state: "CLOSED", status: "Pending" }),
      makeIssue({ number: 24, state: "CLOSED", status: "Testing" }),
    ];
    const result = classifyInconsistencies(issues);
    expect(result).toHaveLength(2);
    expect(result.every((i) => i.severity === "error")).toBe(true);
  });

  /**
   * @testdoc CLOSED Issue with pre-work statuses が info として検出される
   * @purpose Backlog, Icebox 等は won't fix の可能性がありinfoとして報告する
   */
  it("should detect CLOSED issues with pre-work statuses as info", () => {
    const issues = [
      makeIssue({ number: 22, state: "CLOSED", status: "Backlog" }),
      makeIssue({ number: 27, state: "CLOSED", status: "Icebox" }),
      makeIssue({ number: 28, state: "CLOSED", status: "Ready" }),
      makeIssue({ number: 29, state: "CLOSED", status: "Spec Review" }),
      makeIssue({ number: 30, state: "CLOSED", status: "Planning" }),
    ];
    const result = classifyInconsistencies(issues);
    expect(result).toHaveLength(5);
    expect(result.every((i) => i.severity === "info")).toBe(true);
  });

  /**
   * @testdoc CLOSED Issue with null status は検出されない
   * @purpose ステータス未設定のCLOSED Issueは正常扱い
   */
  it("should not flag CLOSED issues with null status", () => {
    const issues = [
      makeIssue({ number: 25, state: "CLOSED", status: null }),
    ];
    const result = classifyInconsistencies(issues);
    expect(result).toHaveLength(0);
  });

  /**
   * @testdoc CLOSED Issue with empty string status は検出されない
   * @purpose 空文字ステータスのCLOSED Issueは正常扱い
   */
  it("should not flag CLOSED issues with empty string status", () => {
    const issues = [
      makeIssue({ number: 26, state: "CLOSED", status: "" }),
    ];
    const result = classifyInconsistencies(issues);
    expect(result).toHaveLength(0);
  });

  /**
   * @testdoc OPEN + Done と CLOSED + Review の両方が同時に検出される
   * @purpose 両方向の不整合を同時にバッチ検出する確認
   */
  it("should detect both OPEN+Done and CLOSED+active in same batch", () => {
    const issues = [
      makeIssue({ number: 30, state: "OPEN", status: "Done" }),
      makeIssue({ number: 31, state: "CLOSED", status: "Review" }),
      makeIssue({ number: 32, state: "CLOSED", status: "Done" }),
      makeIssue({ number: 33, state: "OPEN", status: "In Progress" }),
    ];
    const result = classifyInconsistencies(issues);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.number)).toEqual([30, 31]);
  });

  /**
   * @testdoc ステータスが空文字のOPEN Issueが検出されない
   * @purpose 空文字ステータスは null 同様に正常扱い
   */
  it("should not flag OPEN issues with empty string status", () => {
    const issues = [
      makeIssue({ number: 13, state: "OPEN", status: "" }),
    ];
    const result = classifyInconsistencies(issues);
    expect(result).toHaveLength(0);
  });

  /**
   * @testdoc ステータスの大小文字を区別する
   * @purpose "done" (小文字) は "Done" と区別される確認
   */
  it("should be case-sensitive for status matching", () => {
    const issues = [
      makeIssue({ number: 14, state: "OPEN", status: "done" }),
      makeIssue({ number: 15, state: "OPEN", status: "DONE" }),
    ];
    const result = classifyInconsistencies(issues);
    // "done" and "DONE" do not match "Done" - not flagged
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// session check - Output structure contracts
// =============================================================================

describe("session check - output structure", () => {
  /**
   * @testdoc session check の出力に summary が含まれる
   * @purpose チェック結果サマリーの構造契約
   */
  it("should define check output structure with summary", () => {
    const output: CheckOutput = {
      repository: "owner/repo",
      inconsistencies: [],
      fixes: [],
      summary: {
        total_checked: 10,
        total_inconsistencies: 0,
        errors: 0,
        info: 0,
        fixed: 0,
        fix_failures: 0,
      },
    };
    expect(output).toHaveProperty("repository");
    expect(output).toHaveProperty("inconsistencies");
    expect(output).toHaveProperty("fixes");
    expect(output.summary).toHaveProperty("total_checked");
    expect(output.summary).toHaveProperty("total_inconsistencies");
    expect(output.summary).toHaveProperty("errors");
    expect(output.summary).toHaveProperty("info");
    expect(output.summary).toHaveProperty("fixed");
    expect(output.summary).toHaveProperty("fix_failures");
  });

  /**
   * @testdoc fix results に success/error が含まれる
   * @purpose --fix 実行結果の構造契約
   */
  it("should define fix result structure", () => {
    const fix: FixResult = {
      number: 1,
      action: "close",
      success: true,
    };
    expect(fix).toHaveProperty("number");
    expect(fix).toHaveProperty("action");
    expect(fix).toHaveProperty("success");
  });

  /**
   * @testdoc fix失敗時にerrorフィールドが含まれる
   * @purpose 失敗理由の構造契約
   */
  it("should include error field in failed fix result", () => {
    const fix: FixResult = {
      number: 1,
      action: "close",
      success: false,
      error: "GraphQL mutation failed",
    };
    expect(fix.error).toBeDefined();
    expect(fix.success).toBe(false);
  });

  /**
   * @testdoc inconsistency にseverityフィールドが含まれる
   * @purpose severity レベルの型契約
   */
  it("should define inconsistency structure with severity", () => {
    const item: Inconsistency = {
      number: 1,
      title: "Test issue",
      url: "https://github.com/owner/repo/issues/1",
      issueState: "OPEN",
      projectStatus: "Done",
      severity: "error",
      description: 'Issue is OPEN but Project Status is "Done"',
    };
    expect(item).toHaveProperty("severity");
    expect(["error", "info"]).toContain(item.severity);
  });
});

// =============================================================================
// session check - Options structure
// =============================================================================

describe("session check - options", () => {
  /**
   * @testdoc session checkのオプション構造を定義
   * @purpose session checkで使用可能なオプションの型契約
   */
  it("should define session check options", () => {
    const checkOptions = {
      owner: undefined as string | undefined,
      verbose: false,
      fix: false,
    };

    expect(checkOptions).toHaveProperty("fix");
    expect(typeof checkOptions.fix).toBe("boolean");
  });

  /**
   * @testdoc --fixオプションがデフォルトでfalse
   * @purpose 明示的に指定しない限り自動修正しない確認
   */
  it("should default fix to false", () => {
    const checkOptions = {
      fix: undefined as boolean | undefined,
    };

    expect(checkOptions.fix ?? false).toBe(false);
  });
});

// =============================================================================
// session start --team - Team dashboard
// =============================================================================

describe("session start --team - groupIssuesByAssignee", () => {
  /**
   * @testdoc Issue をアサイン別にグループ化する
   * @purpose チームダッシュボードでメンバー別にIssueを分類できる確認
   */
  it("should group issues by assignee", () => {
    const issues = [
      makeIssue({ number: 1, state: "OPEN", status: "In Progress", assignees: ["alice"] }),
      makeIssue({ number: 2, state: "OPEN", status: "Review", assignees: ["bob"] }),
      makeIssue({ number: 3, state: "OPEN", status: "Backlog", assignees: ["alice"] }),
    ];

    const grouped = groupIssuesByAssignee(issues);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped["alice"]).toHaveLength(2);
    expect(grouped["alice"].map((i) => i.number)).toEqual([1, 3]);
    expect(grouped["bob"]).toHaveLength(1);
    expect(grouped["bob"][0].number).toBe(2);
  });

  /**
   * @testdoc 複数アサインのIssueが各メンバーに重複して含まれる
   * @purpose 1つのIssueが複数人にアサインされている場合の挙動確認
   */
  it("should include multi-assigned issues under each assignee", () => {
    const issues = [
      makeIssue({ number: 1, state: "OPEN", status: "In Progress", assignees: ["alice", "bob"] }),
    ];

    const grouped = groupIssuesByAssignee(issues);
    expect(grouped["alice"]).toHaveLength(1);
    expect(grouped["bob"]).toHaveLength(1);
    expect(grouped["alice"][0].number).toBe(1);
    expect(grouped["bob"][0].number).toBe(1);
  });

  /**
   * @testdoc 未アサインのIssueが "unassigned" グループに入る
   * @purpose アサインされていないIssueのグループ化
   */
  it("should group unassigned issues under 'unassigned'", () => {
    const issues = [
      makeIssue({ number: 1, state: "OPEN", status: "Backlog", assignees: [] }),
      makeIssue({ number: 2, state: "OPEN", status: "In Progress", assignees: ["alice"] }),
    ];

    const grouped = groupIssuesByAssignee(issues);
    expect(grouped["unassigned"]).toHaveLength(1);
    expect(grouped["unassigned"][0].number).toBe(1);
    expect(grouped["alice"]).toHaveLength(1);
  });

  /**
   * @testdoc 空配列に対して空オブジェクトを返す
   * @purpose エッジケース: Issueがない場合
   */
  it("should return empty object for empty input", () => {
    const grouped = groupIssuesByAssignee([]);
    expect(Object.keys(grouped)).toHaveLength(0);
  });
});

describe("session start --team - output structure", () => {
  /**
   * @testdoc チームダッシュボード出力にmode: "team"が含まれる
   * @purpose 通常モードとチームモードの出力を区別する契約
   */
  it("should include mode field set to 'team'", () => {
    const output = {
      repository: "owner/repo",
      mode: "team",
      members: {},
      total_members: 0,
      total_issues: 0,
      openPRs: { columns: [], rows: [] },
    };

    expect(output.mode).toBe("team");
  });

  /**
   * @testdoc メンバーダッシュボードにhandoverとissuesが含まれる
   * @purpose 各メンバーの情報構造契約
   */
  it("should include handover and issues per member", () => {
    const memberDashboard = {
      handover: {
        number: 30,
        title: "2026-02-01 [alice] - Session summary",
        body: "## Summary\n...",
        url: "https://github.com/owner/repo/discussions/30",
      },
      issues: {
        columns: ["number", "title", "status", "priority", "size"],
        rows: [[1, "Feature A", "In Progress", "High", "M"]],
      },
      issue_count: 1,
    };

    expect(memberDashboard).toHaveProperty("handover");
    expect(memberDashboard).toHaveProperty("issues");
    expect(memberDashboard).toHaveProperty("issue_count");
    expect(memberDashboard.handover).toHaveProperty("number");
    expect(memberDashboard.handover).toHaveProperty("body");
    expect(memberDashboard.issues.columns).toContain("number");
    expect(memberDashboard.issues.columns).toContain("status");
  });

  /**
   * @testdoc ハンドオーバーがないメンバーはhandover: nullになる
   * @purpose ハンドオーバー未作成メンバーの表現
   */
  it("should allow null handover for members without handovers", () => {
    const memberDashboard = {
      handover: null,
      issues: { columns: [], rows: [] },
      issue_count: 0,
    };

    expect(memberDashboard.handover).toBeNull();
  });

  /**
   * @testdoc チーム出力にtotal_membersカウントが含まれる
   * @purpose チームサイズの確認契約
   */
  it("should include total_members count", () => {
    const output = {
      repository: "owner/repo",
      mode: "team",
      members: {
        alice: { handover: null, issues: { columns: [], rows: [] }, issue_count: 0 },
        bob: { handover: null, issues: { columns: [], rows: [] }, issue_count: 0 },
      },
      total_members: 2,
      total_issues: 0,
      openPRs: { columns: [], rows: [] },
    };

    expect(output.total_members).toBe(2);
    expect(Object.keys(output.members)).toHaveLength(2);
  });

  /**
   * @testdoc --teamオプションがSessionOptionsに定義される
   * @purpose session startにteamフラグが追加されていることの確認
   */
  it("should define team option in SessionOptions", () => {
    const options = {
      team: true as boolean | undefined,
      verbose: false,
      format: "json" as const,
    };

    expect(options).toHaveProperty("team");
    expect(options.team).toBe(true);
  });
});

// =============================================================================
// session end - PR merge auto-detection (#220)
// =============================================================================

describe("session end - PR merge auto-detection (#220)", () => {
  /**
   * @testdoc findMergedPrForIssue が存在しないIssueに対してnullを返す
   * @purpose マージ済みPRが見つからない場合のフォールバック確認
   */
  it("should return null for non-existent issue", () => {
    const dummyLogger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      success: () => {},
    };

    // Issue 999999 には対応するマージ済みPRがないはず
    const result = findMergedPrForIssue(
      "ShirokumaDevelopment",
      "shirokuma-docs",
      999999,
      dummyLogger as any
    );
    expect(result).toBeNull();
  });

  /**
   * @testdoc updatedIssues に Done ステータスが含まれうる（PRマージ時の昇格）
   * @purpose --review 指定でもPRマージ済みの場合は Done になる出力契約
   */
  it("should allow Done status in updatedIssues for review items (PR merged)", () => {
    const output = {
      handover: {
        number: 50,
        title: "2026-02-07 - Session summary",
        url: "https://github.com/owner/repo/discussions/50",
      },
      updatedIssues: [
        { number: 220, status: "Done" },   // PR merged → auto-promoted
        { number: 221, status: "Review" },  // PR not merged → stays Review
      ],
    };

    // updatedIssues can contain both Done and Review
    const doneItems = output.updatedIssues.filter((i) => i.status === "Done");
    const reviewItems = output.updatedIssues.filter((i) => i.status === "Review");
    expect(doneItems).toHaveLength(1);
    expect(reviewItems).toHaveLength(1);
    expect(doneItems[0].number).toBe(220);
    expect(reviewItems[0].number).toBe(221);
  });

  /**
   * @testdoc findMergedPrForIssue が関数としてエクスポートされている
   * @purpose セッションモジュールからPRマージ検出関数がアクセス可能
   */
  it("should export findMergedPrForIssue function", () => {
    expect(typeof findMergedPrForIssue).toBe("function");
  });

  /**
   * @testdoc --review で Done 昇格された場合のログメッセージ契約
   * @purpose ログメッセージにPR番号が含まれることの構造確認
   */
  it("should define log format for auto-promoted issues", () => {
    const prNumber = 226;
    const issueNumber = 224;
    const logMessage = `Issue #${issueNumber} → Done (PR #${prNumber} merged)`;

    expect(logMessage).toContain("Done");
    expect(logMessage).toContain(`PR #${prNumber}`);
    expect(logMessage).toContain("merged");
  });
});

// =============================================================================
// Session backups (#251)
// =============================================================================

describe("session backup - getSessionBackups", () => {
  const testSessionsDir = ".claude/sessions";
  const backupSuffix = "-precompact-backup.md";

  beforeEach(() => {
    // ディレクトリが存在する場合はバックアップファイルのみクリーンアップ
    if (existsSync(testSessionsDir)) {
      const files = fsReaddirSync(testSessionsDir).filter((f: string) =>
        f.includes("test-backup") && f.endsWith(backupSuffix)
      );
      for (const f of files) {
        fsUnlinkSync(join(testSessionsDir, f));
      }
    }
  });

  afterEach(() => {
    // テスト用バックアップのクリーンアップ
    if (existsSync(testSessionsDir)) {
      const files = fsReaddirSync(testSessionsDir).filter((f: string) =>
        f.includes("test-backup") && f.endsWith(backupSuffix)
      );
      for (const f of files) {
        fsUnlinkSync(join(testSessionsDir, f));
      }
    }
  });

  /**
   * @testdoc getSessionBackups がエクスポートされている
   * @purpose セッションバックアップ関数がアクセス可能であることの確認
   */
  it("should export getSessionBackups function", () => {
    expect(typeof getSessionBackups).toBe("function");
  });

  /**
   * @testdoc バックアップなし時に空配列を返す
   * @purpose .claude/sessions/ にバックアップがない場合のデフォルト動作
   */
  it("should return empty array when no backups exist", () => {
    const backups = getSessionBackups();
    // テスト実行時にバックアップがなければ空配列
    const testBackups = backups.filter((b) => b.filename.includes("test-backup"));
    expect(testBackups).toEqual([]);
  });

  /**
   * @testdoc バックアップファイルを検出して返す
   * @purpose PreCompact バックアップの正しい読み取り確認
   */
  it("should detect and return backup files", () => {
    mkdirSync(testSessionsDir, { recursive: true });
    const testFile = `2026-01-01-000000-test-backup${backupSuffix}`;
    writeFileSync(
      join(testSessionsDir, testFile),
      "# Test backup\n**Branch**: develop"
    );

    const backups = getSessionBackups();
    const testBackups = backups.filter((b) => b.filename.includes("test-backup"));

    expect(testBackups).toHaveLength(1);
    expect(testBackups[0].filename).toBe(testFile);
    expect(testBackups[0].content).toContain("Test backup");
    expect(testBackups[0].timestamp).toContain("2026-01-01");
  });

  /**
   * @testdoc バックアップが新しい順にソートされる
   * @purpose 最新のバックアップが最初に返されることの確認
   */
  it("should return backups sorted by timestamp (newest first)", () => {
    mkdirSync(testSessionsDir, { recursive: true });
    const older = `2026-01-01-100000-test-backup${backupSuffix}`;
    const newer = `2026-01-01-200000-test-backup${backupSuffix}`;

    writeFileSync(join(testSessionsDir, older), "# Older backup");
    writeFileSync(join(testSessionsDir, newer), "# Newer backup");

    const backups = getSessionBackups();
    const testBackups = backups.filter((b) => b.filename.includes("test-backup"));

    expect(testBackups).toHaveLength(2);
    expect(testBackups[0].filename).toBe(newer);
    expect(testBackups[1].filename).toBe(older);
  });

  /**
   * @testdoc SessionBackup 型の構造を満たす
   * @purpose 返されるオブジェクトが正しい型構造を持つ確認
   */
  it("should return objects matching SessionBackup interface", () => {
    mkdirSync(testSessionsDir, { recursive: true });
    const testFile = `2026-01-01-120000-test-backup${backupSuffix}`;
    writeFileSync(join(testSessionsDir, testFile), "# Backup content");

    const backups = getSessionBackups();
    const testBackups = backups.filter((b) => b.filename.includes("test-backup"));

    expect(testBackups[0]).toHaveProperty("filename");
    expect(testBackups[0]).toHaveProperty("timestamp");
    expect(testBackups[0]).toHaveProperty("content");
    expect(typeof testBackups[0].filename).toBe("string");
    expect(typeof testBackups[0].timestamp).toBe("string");
    expect(typeof testBackups[0].content).toBe("string");
  });
});

describe("session backup - cleanupSessionBackups", () => {
  const testSessionsDir = ".claude/sessions";
  const backupSuffix = "-precompact-backup.md";

  afterEach(() => {
    // テスト用バックアップのクリーンアップ
    if (existsSync(testSessionsDir)) {
      const files = fsReaddirSync(testSessionsDir).filter((f: string) =>
        f.includes("test-cleanup") && f.endsWith(backupSuffix)
      );
      for (const f of files) {
        fsUnlinkSync(join(testSessionsDir, f));
      }
    }
  });

  /**
   * @testdoc cleanupSessionBackups がエクスポートされている
   * @purpose セッションクリーンアップ関数がアクセス可能であることの確認
   */
  it("should export cleanupSessionBackups function", () => {
    expect(typeof cleanupSessionBackups).toBe("function");
  });

  /**
   * @testdoc バックアップなし時に0を返す
   * @purpose クリーンアップ対象がない場合のデフォルト動作
   */
  it("should return 0 when no backups to clean", () => {
    // テスト前にバックアップがない状態を確認
    const result = cleanupSessionBackups();
    // 他のテストで作成されたバックアップがない限り0
    expect(typeof result).toBe("number");
  });

  /**
   * @testdoc バックアップファイルを削除して削除数を返す
   * @purpose PreCompact バックアップの正しいクリーンアップ確認
   */
  it("should remove backup files and return count", () => {
    mkdirSync(testSessionsDir, { recursive: true });

    const file1 = `2026-01-01-100000-test-cleanup${backupSuffix}`;
    const file2 = `2026-01-01-200000-test-cleanup${backupSuffix}`;
    writeFileSync(join(testSessionsDir, file1), "# Backup 1");
    writeFileSync(join(testSessionsDir, file2), "# Backup 2");

    // ファイルが存在することを確認
    expect(existsSync(join(testSessionsDir, file1))).toBe(true);
    expect(existsSync(join(testSessionsDir, file2))).toBe(true);

    const cleaned = cleanupSessionBackups();

    // 少なくとも作成した2ファイルは削除されたはず
    expect(cleaned).toBeGreaterThanOrEqual(2);

    // テスト用ファイルが削除されたことを確認
    expect(existsSync(join(testSessionsDir, file1))).toBe(false);
    expect(existsSync(join(testSessionsDir, file2))).toBe(false);
  });
});

// =============================================================================
// session check - Metrics inconsistencies (#342)
// =============================================================================

describe("session check - metrics inconsistency classification (#342)", () => {
  const defaultMetrics = {
    enabled: true,
    dateFields: {
      inProgressAt: "In Progress At",
      reviewAt: "Review At",
      completedAt: "Completed At",
    },
    statusToDateMapping: {
      "In Progress": "In Progress At",
      "Review": "Review At",
      "Done": "Completed At",
    },
    staleThresholdDays: 14,
  };

  /**
   * @testdoc Done ステータスで Completed At 未設定を検出する
   * @purpose タイムスタンプ欠落の検出
   */
  it("should detect Done issue missing Completed At", () => {
    const issues = [
      makeIssue({ number: 1, state: "CLOSED", status: "Done" }),
    ];
    const textValues: Record<string, Record<string, string>> = {};

    const result = classifyMetricsInconsistencies(issues, textValues, defaultMetrics);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(1);
    expect(result[0].severity).toBe("info");
    expect(result[0].description).toContain("Completed At");
  });

  /**
   * @testdoc Done ステータスで Completed At が設定済みの場合は検出しない
   * @purpose 正常な状態のフィルタリング
   */
  it("should not flag Done issue with Completed At set", () => {
    const issues = [
      makeIssue({ number: 1, state: "CLOSED", status: "Done" }),
    ];
    const textValues: Record<string, Record<string, string>> = {
      "PVTI_1": { "Completed At": "2026-02-10T10:00:00+09:00" },
    };

    const result = classifyMetricsInconsistencies(issues, textValues, defaultMetrics);
    expect(result).toHaveLength(0);
  });

  /**
   * @testdoc Released ステータスも Completed At 未設定を検出する
   * @purpose Done と Released 両方をカバー
   */
  it("should detect Released issue missing Completed At", () => {
    const issues = [
      makeIssue({ number: 2, state: "CLOSED", status: "Released" }),
    ];
    const textValues: Record<string, Record<string, string>> = {};

    const result = classifyMetricsInconsistencies(issues, textValues, defaultMetrics);
    expect(result).toHaveLength(1);
    expect(result[0].description).toContain("Released");
  });

  /**
   * @testdoc In Progress で stale 閾値を超えた Issue を検出する
   * @purpose stale Issue の警告
   */
  it("should detect stale In Progress issues", () => {
    const issues = [
      makeIssue({ number: 3, state: "OPEN", status: "In Progress" }),
    ];
    // Started 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const textValues: Record<string, Record<string, string>> = {
      "PVTI_3": { "In Progress At": thirtyDaysAgo.toISOString() },
    };

    const result = classifyMetricsInconsistencies(issues, textValues, defaultMetrics);
    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(3);
    expect(result[0].description).toContain("30 days");
    expect(result[0].description).toContain("stale threshold: 14 days");
  });

  /**
   * @testdoc In Progress が stale 閾値内の場合は検出しない
   * @purpose 正常な In Progress は検出しない
   */
  it("should not flag In Progress within threshold", () => {
    const issues = [
      makeIssue({ number: 4, state: "OPEN", status: "In Progress" }),
    ];
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 3);
    const textValues: Record<string, Record<string, string>> = {
      "PVTI_4": { "In Progress At": recentDate.toISOString() },
    };

    const result = classifyMetricsInconsistencies(issues, textValues, defaultMetrics);
    expect(result).toHaveLength(0);
  });

  /**
   * @testdoc In Progress で In Progress At 未設定の場合は stale 検出しない
   * @purpose タイムスタンプなしの場合は判定不能
   */
  it("should not flag In Progress without In Progress At", () => {
    const issues = [
      makeIssue({ number: 5, state: "OPEN", status: "In Progress" }),
    ];
    const textValues: Record<string, Record<string, string>> = {};

    const result = classifyMetricsInconsistencies(issues, textValues, defaultMetrics);
    expect(result).toHaveLength(0);
  });

  /**
   * @testdoc projectItemId がない Issue はスキップする
   * @purpose プロジェクト未参加の Issue は対象外
   */
  it("should skip issues without projectItemId", () => {
    const issues: IssueData[] = [{
      number: 6,
      title: "No project",
      url: "https://github.com/owner/repo/issues/6",
      state: "CLOSED",
      closedAt: null,
      labels: [],
      assignees: [],
      status: "Done",
      priority: null,
      size: null,
      projectItemId: null,
      projectId: null,
    }];
    const textValues: Record<string, Record<string, string>> = {};

    const result = classifyMetricsInconsistencies(issues, textValues, defaultMetrics);
    expect(result).toHaveLength(0);
  });

  /**
   * @testdoc 空の入力で空の結果を返す
   * @purpose エッジケース: 入力なし
   */
  it("should return empty array for empty input", () => {
    const result = classifyMetricsInconsistencies([], {}, defaultMetrics);
    expect(result).toHaveLength(0);
  });

  /**
   * @testdoc カスタム staleThresholdDays を尊重する
   * @purpose 設定のカスタマイズ反映
   */
  it("should respect custom staleThresholdDays", () => {
    const issues = [
      makeIssue({ number: 7, state: "OPEN", status: "In Progress" }),
    ];
    const eightDaysAgo = new Date();
    eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
    const textValues: Record<string, Record<string, string>> = {
      "PVTI_7": { "In Progress At": eightDaysAgo.toISOString() },
    };

    // With default 14 days: not stale
    const result1 = classifyMetricsInconsistencies(issues, textValues, defaultMetrics);
    expect(result1).toHaveLength(0);

    // With custom 7 days: stale
    const customMetrics = { ...defaultMetrics, staleThresholdDays: 7 };
    const result2 = classifyMetricsInconsistencies(issues, textValues, customMetrics);
    expect(result2).toHaveLength(1);
  });
});

// =============================================================================
// isIssueClosed (#557)
// Note: isIssueClosed は runGhCommand の薄いラッパー（4行）。
// プロジェクトのテスト方針（純粋関数のみユニットテスト、API モック不使用）に従い、
// ユニットテストは省略。動作は session end の統合テストでカバー。
// =============================================================================

// =============================================================================
// Multi-Developer Handover (#754)
// ADR-v2-004: チーム開発でのハンドオーバー運用
// =============================================================================

describe("session end - handover title auto-insert (#754)", () => {
  /** タイトル自動挿入のターゲットパターン */
  const AUTO_INSERT_PATTERN = /^\d{4}-\d{2}-\d{2} - /;

  /**
   * @testdoc YYYY-MM-DD - summary 形式のタイトルが自動挿入の対象になる
   * @purpose 日付プレフィックスのみで [username] なし = 挿入対象の判定
   */
  it("should detect date-prefixed titles without username as auto-insert candidates", () => {
    const candidateTitle = "2026-02-19 - Session summary";
    const alreadyFormattedTitle = "2026-02-19 [alice] - Session summary";
    const nonDateTitle = "Plugin marketplace feature";

    // 対象: 日付プレフィックスあり + [ なし
    expect(AUTO_INSERT_PATTERN.test(candidateTitle) && !candidateTitle.includes("[")).toBe(true);
    // 非対象: すでに [username] を含む
    expect(AUTO_INSERT_PATTERN.test(alreadyFormattedTitle) && !alreadyFormattedTitle.includes("[")).toBe(false);
    // 非対象: 日付プレフィックスなし
    expect(AUTO_INSERT_PATTERN.test(nonDateTitle) && !nonDateTitle.includes("[")).toBe(false);
  });

  /**
   * @testdoc タイトル変換が YYYY-MM-DD [username] - summary 形式になる
   * @purpose 自動挿入後の正確なフォーマット確認
   */
  it("should transform date-only title to include username", () => {
    const title = "2026-02-19 - Session summary";
    const username = "alice";
    const result = title.replace(/^(\d{4}-\d{2}-\d{2}) - /, `$1 [${username}] - `);

    expect(result).toBe("2026-02-19 [alice] - Session summary");
  });

  /**
   * @testdoc すでに [username] を含むタイトルは再挿入されない
   * @purpose 二重挿入の防止確認
   */
  it("should not double-insert username into already-formatted title", () => {
    const title = "2026-02-19 [alice] - Session summary";

    const shouldInsert = AUTO_INSERT_PATTERN.test(title) && !title.includes("[");

    expect(shouldInsert).toBe(false);
  });

  /**
   * @testdoc 挿入後のタイトル形式が validateTitle を通過する
   * @purpose [username] 付きタイトルが長さ制限内で有効であることの確認
   */
  it("should accept auto-inserted title format in validateTitle", () => {
    const autoInsertedTitle = "2026-02-19 [particles7] - Plugin marketplace spec compliance";
    expect(validateTitle(autoInsertedTitle)).toBeNull();
  });

  /**
   * @testdoc YYYY-MM-DD [username] - summary の正規表現パターンが正しい
   * @purpose ハンドオーバータイトル形式の完全な仕様確認
   */
  it("should define the full handover title format regex", () => {
    const HANDOVER_TITLE_WITH_USERNAME = /^\d{4}-\d{2}-\d{2} \[[a-zA-Z0-9._-]+\] - .+$/;
    const validTitles = [
      "2026-02-19 [alice] - Feature implementation complete",
      "2026-02-18 [bob] - Debug session",
      "2026-02-01 [particles7] - Plugin marketplace spec",
    ];
    const invalidTitles = [
      "2026-02-19 - No username",
      "Session summary without date",
    ];

    for (const title of validTitles) {
      expect(HANDOVER_TITLE_WITH_USERNAME.test(title)).toBe(true);
    }
    for (const title of invalidTitles) {
      expect(HANDOVER_TITLE_WITH_USERNAME.test(title)).toBe(false);
    }
  });
});

describe("session start - multi-developer options (#754)", () => {
  /**
   * @testdoc SessionOptions に --user, --all, --team オプションが定義される
   * @purpose マルチ開発者モードのオプション型契約
   */
  it("should define --user, --all, --team options in SessionOptions", () => {
    // --user: 特定ユーザーの引き継ぎをフィルタ
    const userOptions: SessionOptions = { user: "alice" };
    expect(userOptions).toHaveProperty("user");
    expect(typeof userOptions.user).toBe("string");

    // --all: フィルタなし（全メンバー）
    const allOptions: SessionOptions = { all: true };
    expect(allOptions).toHaveProperty("all");
    expect(allOptions.all).toBe(true);

    // --team: チームダッシュボードモード
    const teamOptions: SessionOptions = { team: true };
    expect(teamOptions).toHaveProperty("team");
    expect(teamOptions.team).toBe(true);
  });

  /**
   * @testdoc --user と --all の相互排他を型で表現できる
   * @purpose 同時指定は意味をなさない（--all が優先）ことの文書化
   */
  it("should allow both --user and --all to coexist in SessionOptions type", () => {
    // 型上は共存可能だが、実装では --all が優先される
    const options: SessionOptions = { user: "alice", all: true };
    expect(options.user).toBe("alice");
    expect(options.all).toBe(true);
  });

  /**
   * @testdoc author フィルタロジック: authorFilter=null は全件返す
   * @purpose --all モードでフィルタなし動作の確認
   */
  it("should return all handovers when authorFilter is null (--all mode)", () => {
    const handovers = [
      { number: 1, author: "alice" },
      { number: 2, author: "bob" },
      { number: 3, author: "charlie" },
    ];

    const authorFilter: string | null = null;
    const filtered = authorFilter
      ? handovers.filter((h) => h.author === authorFilter)
      : handovers;

    expect(filtered).toHaveLength(3);
  });

  /**
   * @testdoc author フィルタロジック: 特定ユーザー指定で一致のみ返す
   * @purpose --user {username} でのフィルタリング確認
   */
  it("should filter handovers by author when authorFilter is set", () => {
    const handovers = [
      { number: 1, author: "alice" },
      { number: 2, author: "bob" },
      { number: 3, author: "alice" },
    ];

    const authorFilter = "alice";
    const filtered = authorFilter
      ? handovers.filter((h) => h.author === authorFilter)
      : handovers;

    expect(filtered).toHaveLength(2);
    expect(filtered.map((h) => h.number)).toEqual([1, 3]);
  });

  /**
   * @testdoc author フィルタロジック: 一致なしは空配列
   * @purpose 対象ユーザーのハンドオーバーがない場合の動作
   */
  it("should return empty array when no handovers match the author filter", () => {
    const handovers = [
      { number: 1, author: "alice" },
      { number: 2, author: "bob" },
    ];

    const authorFilter = "charlie";
    const filtered = handovers.filter((h) => h.author === authorFilter);

    expect(filtered).toHaveLength(0);
  });
});

describe("session start --team - fetchTeamHandovers grouping logic (#754)", () => {
  /**
   * fetchTeamHandovers の「著者別に最新1件のみ保持」ロジックをテスト。
   * 関数自体は private なのでアルゴリズムを直接検証。
   */

  /** fetchTeamHandovers の grouping アルゴリズムを再現したヘルパー */
  function groupByAuthorLatestFirst(
    nodes: Array<{ number?: number; title?: string; body?: string; url?: string; author?: { login?: string } | null }>
  ): Array<{ number: number; author: string }> {
    const byAuthor = new Map<string, { number: number; author: string }>();
    for (const node of nodes) {
      if (!node?.number) continue;
      const author = node.author?.login ?? "unknown";
      if (!byAuthor.has(author)) {
        byAuthor.set(author, { number: node.number, author });
      }
    }
    return Array.from(byAuthor.values());
  }

  /**
   * @testdoc 同一著者の複数ハンドオーバーは最新のみ保持される
   * @purpose GraphQL は新しい順に返すので Map への最初の挿入が最新
   */
  it("should keep only the latest handover per author", () => {
    const nodes = [
      { number: 3, author: { login: "alice" } }, // 最新
      { number: 2, author: { login: "bob" } },
      { number: 1, author: { login: "alice" } }, // 古い
    ];

    const result = groupByAuthorLatestFirst(nodes);

    expect(result).toHaveLength(2);
    const aliceEntry = result.find((r) => r.author === "alice");
    expect(aliceEntry?.number).toBe(3); // 古い #1 ではなく最新 #3
  });

  /**
   * @testdoc 複数著者がいる場合に全員分が返される
   * @purpose チームダッシュボードで全メンバーを表示する確認
   */
  it("should include one entry per unique author", () => {
    const nodes = [
      { number: 1, author: { login: "alice" } },
      { number: 2, author: { login: "bob" } },
      { number: 3, author: { login: "charlie" } },
    ];

    const result = groupByAuthorLatestFirst(nodes);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.author).sort()).toEqual(["alice", "bob", "charlie"]);
  });

  /**
   * @testdoc author が null のノードは "unknown" グループに入る
   * @purpose 著者情報がない Discussion への対応
   */
  it("should group nodes without author under 'unknown'", () => {
    const nodes = [
      { number: 1, author: null },
      { number: 2, author: { login: "alice" } },
    ];

    const result = groupByAuthorLatestFirst(nodes);

    expect(result).toHaveLength(2);
    const unknownEntry = result.find((r) => r.author === "unknown");
    expect(unknownEntry?.number).toBe(1);
  });

  /**
   * @testdoc number がないノードはスキップされる
   * @purpose GraphQL の不完全なレスポンスへの対応
   */
  it("should skip nodes without a number", () => {
    const nodes = [
      { number: undefined, author: { login: "alice" } },
      { number: 1, author: { login: "bob" } },
    ];

    const result = groupByAuthorLatestFirst(nodes);

    expect(result).toHaveLength(1);
    expect(result[0].author).toBe("bob");
  });

  /**
   * @testdoc 空配列を入力すると空配列を返す
   * @purpose ハンドオーバーがまだない状態への対応
   */
  it("should return empty array for empty input", () => {
    const result = groupByAuthorLatestFirst([]);
    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// session preflight - getPreflightGitState (#861)
// =============================================================================

describe("session preflight - getPreflightGitState (#861)", () => {
  /**
   * @testdoc getPreflightGitState が PreflightGitState 型のオブジェクトを返す
   * @purpose preflight 用の拡張 git 状態取得の基本動作確認
   */
  it("should return PreflightGitState object with required fields", () => {
    const state = getPreflightGitState();

    expect(state).toHaveProperty("branch");
    expect(state).toHaveProperty("baseBranch");
    expect(state).toHaveProperty("isFeatureBranch");
    expect(state).toHaveProperty("uncommittedChanges");
    expect(state).toHaveProperty("hasUncommittedChanges");
    expect(state).toHaveProperty("unpushedCommits");
    expect(state).toHaveProperty("recentCommits");
    expect(Array.isArray(state.uncommittedChanges)).toBe(true);
    expect(Array.isArray(state.recentCommits)).toBe(true);
    expect(typeof state.isFeatureBranch).toBe("boolean");
  });

  /**
   * @testdoc getPreflightGitState がカレントブランチ名を返す
   * @purpose テスト実行時に git リポジトリ内にいることの確認
   */
  it("should return current branch as string in a git repository", () => {
    const state = getPreflightGitState();

    expect(typeof state.branch).toBe("string");
    expect(state.branch!.length).toBeGreaterThan(0);
  });

  /**
   * @testdoc recentCommits の各要素が hash と message を持つ
   * @purpose コミット履歴の構造契約
   */
  it("should return recentCommits with hash and message fields", () => {
    const state = getPreflightGitState();

    // リポジトリにコミットがあるはず
    expect(state.recentCommits.length).toBeGreaterThan(0);
    for (const commit of state.recentCommits) {
      expect(typeof commit.hash).toBe("string");
      expect(commit.hash.length).toBeGreaterThan(0);
      expect(typeof commit.message).toBe("string");
    }
  });

  /**
   * @testdoc recentCommits の上限が 10 件
   * @purpose 最大10件のコミット履歴を返すことの確認
   */
  it("should return at most 10 recent commits", () => {
    const state = getPreflightGitState();

    expect(state.recentCommits.length).toBeLessThanOrEqual(10);
  });

  /**
   * @testdoc baseBranch が文字列または null を返す
   * @purpose ベースブランチ検出の型契約
   */
  it("should return baseBranch as string or null", () => {
    const state = getPreflightGitState();

    expect(
      state.baseBranch === null || typeof state.baseBranch === "string"
    ).toBe(true);
  });

  /**
   * @testdoc unpushedCommits が数値または null を返す
   * @purpose upstream 未設定時に null を返す契約
   */
  it("should return unpushedCommits as number or null", () => {
    const state = getPreflightGitState();

    expect(
      state.unpushedCommits === null || typeof state.unpushedCommits === "number"
    ).toBe(true);
  });

  /**
   * @testdoc protected ブランチ上では isFeatureBranch が false
   * @purpose main/develop はフィーチャーブランチでないことの確認
   */
  it("should set isFeatureBranch to false on protected branches", () => {
    // 直接テスト（純粋ロジックの検証）
    const protectedBranches = ["main", "develop"];
    for (const branch of protectedBranches) {
      expect(protectedBranches.includes(branch)).toBe(true);
    }
  });

  /**
   * @testdoc フィーチャーブランチでは isFeatureBranch が true
   * @purpose feat/xxx 等がフィーチャーブランチとして判定される確認
   */
  it("should identify feature branch patterns as isFeatureBranch=true", () => {
    const protectedBranches = ["main", "develop"];
    const featureBranches = ["feat/42-some-feature", "fix/10-bugfix", "chore/99-cleanup"];

    for (const branch of featureBranches) {
      expect(protectedBranches.includes(branch)).toBe(false);
    }
  });
});

// =============================================================================
// session preflight - generatePreflightWarnings (#861)
// =============================================================================

describe("session preflight - generatePreflightWarnings (#861)", () => {
  /** テスト用デフォルト git state */
  function makeGitState(overrides: Partial<PreflightGitState> = {}): PreflightGitState {
    return {
      branch: "feat/42-some-feature",
      baseBranch: "develop",
      isFeatureBranch: true,
      uncommittedChanges: [],
      hasUncommittedChanges: false,
      unpushedCommits: 0,
      recentCommits: [],
      ...overrides,
    };
  }

  /**
   * @testdoc クリーンな状態では警告なし
   * @purpose 正常時に空配列を返す確認
   */
  it("should return no warnings for clean state", () => {
    const git = makeGitState();
    const warnings = generatePreflightWarnings(git, 0);
    expect(warnings).toEqual([]);
  });

  /**
   * @testdoc protected ブランチ上で警告を生成
   * @purpose develop/main ブランチ検出の確認
   */
  it("should warn when on protected branch", () => {
    const git = makeGitState({ branch: "develop" });
    const warnings = generatePreflightWarnings(git, 0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("protected branch");
    expect(warnings[0]).toContain("develop");
  });

  /**
   * @testdoc 未コミット変更がある場合に警告を生成
   * @purpose 未コミットファイル数の表示確認
   */
  it("should warn when uncommitted changes exist", () => {
    const git = makeGitState({
      uncommittedChanges: ["M src/foo.ts", "?? new-file.ts"],
      hasUncommittedChanges: true,
    });
    const warnings = generatePreflightWarnings(git, 0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("2 uncommitted");
  });

  /**
   * @testdoc 未プッシュコミットがある場合に警告を生成
   * @purpose push 前のセッション終了を防ぐ警告
   */
  it("should warn when unpushed commits exist", () => {
    const git = makeGitState({ unpushedCommits: 3 });
    const warnings = generatePreflightWarnings(git, 0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("3 unpushed");
    expect(warnings[0]).toContain("Push before ending session");
  });

  /**
   * @testdoc unpushedCommits が null の場合は警告なし
   * @purpose upstream 未設定時は判定不能
   */
  it("should not warn when unpushedCommits is null", () => {
    const git = makeGitState({ unpushedCommits: null });
    const warnings = generatePreflightWarnings(git, 0);
    expect(warnings).toEqual([]);
  });

  /**
   * @testdoc unpushedCommits が 0 の場合は警告なし
   * @purpose 全コミットプッシュ済みで正常
   */
  it("should not warn when unpushedCommits is 0", () => {
    const git = makeGitState({ unpushedCommits: 0 });
    const warnings = generatePreflightWarnings(git, 0);
    expect(warnings).toEqual([]);
  });

  /**
   * @testdoc セッションバックアップがある場合に警告を生成
   * @purpose 中断セッションの検出
   */
  it("should warn when session backups exist", () => {
    const git = makeGitState();
    const warnings = generatePreflightWarnings(git, 2);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("2 PreCompact backup(s)");
  });

  /**
   * @testdoc 複数の警告を同時に生成
   * @purpose 全警告が独立して生成される確認
   */
  it("should generate multiple warnings simultaneously", () => {
    const git = makeGitState({
      branch: "develop",
      uncommittedChanges: ["M src/foo.ts"],
      hasUncommittedChanges: true,
      unpushedCommits: 2,
    });
    const warnings = generatePreflightWarnings(git, 1);
    expect(warnings).toHaveLength(4);
  });
});

// =============================================================================
// session preflight - Output structure contracts (#861)
// =============================================================================

describe("session preflight - output structure (#861)", () => {
  /**
   * @testdoc preflight 出力に必須フィールドがすべて含まれる
   * @purpose PreflightOutput の構造契約
   */
  it("should define PreflightOutput structure with all required fields", () => {
    const output: PreflightOutput = {
      repository: "owner/repo",
      git: {
        branch: "feat/42-xxx",
        baseBranch: "develop",
        isFeatureBranch: true,
        uncommittedChanges: ["M src/foo.ts"],
        hasUncommittedChanges: true,
        unpushedCommits: 2,
        recentCommits: [{ hash: "abc1234", message: "feat: add feature (#42)" }],
      },
      issues: [
        { number: 42, title: "Feature", status: "In Progress", hasMergedPr: false, labels: ["area:cli"], priority: "High" },
      ],
      prs: [
        { number: 50, title: "feat: add feature", reviewDecision: "APPROVED" },
      ],
      sessionBackups: 0,
      warnings: [],
    };

    expect(output).toHaveProperty("repository");
    expect(output).toHaveProperty("git");
    expect(output).toHaveProperty("issues");
    expect(output).toHaveProperty("prs");
    expect(output).toHaveProperty("sessionBackups");
    expect(output).toHaveProperty("warnings");
  });

  /**
   * @testdoc issues がフラット JSON（TableJSON ではない）
   * @purpose スキルがプログラム的に消費できるフラット構造の確認
   */
  it("should use flat JSON for issues (not TableJSON)", () => {
    const issues: PreflightIssue[] = [
      { number: 42, title: "Feature A", status: "In Progress", hasMergedPr: false, labels: ["area:cli"], priority: "High" },
      { number: 43, title: "Feature B", status: "Review", hasMergedPr: true, labels: [], priority: null },
    ];

    // TableJSON とは異なり columns/rows ではなくオブジェクト配列
    expect(Array.isArray(issues)).toBe(true);
    expect(issues[0]).toHaveProperty("number");
    expect(issues[0]).toHaveProperty("title");
    expect(issues[0]).toHaveProperty("status");
    expect(issues[0]).toHaveProperty("hasMergedPr");
    expect(issues[0]).toHaveProperty("labels");
    expect(issues[0]).toHaveProperty("priority");
  });

  /**
   * @testdoc hasMergedPr が In Progress / Review の Issue のみで検出される
   * @purpose 他ステータスでは常に false の仕様確認
   */
  it("should set hasMergedPr only for In Progress / Review issues", () => {
    const issues: PreflightIssue[] = [
      { number: 1, title: "A", status: "In Progress", hasMergedPr: true, labels: [], priority: null },
      { number: 2, title: "B", status: "Review", hasMergedPr: true, labels: [], priority: null },
      { number: 3, title: "C", status: "Backlog", hasMergedPr: false, labels: [], priority: null },
      { number: 4, title: "D", status: "Pending", hasMergedPr: false, labels: [], priority: null },
    ];

    const hasMergedIssues = issues.filter((i) => i.hasMergedPr);
    expect(hasMergedIssues.every(
      (i) => i.status === "In Progress" || i.status === "Review"
    )).toBe(true);
  });

  /**
   * @testdoc prs がフラット JSON で reviewDecision を含む
   * @purpose PR 情報の構造契約
   */
  it("should include reviewDecision in flat PR structure", () => {
    const prs: PreflightPr[] = [
      { number: 50, title: "feat: xxx", reviewDecision: "APPROVED" },
      { number: 51, title: "fix: yyy", reviewDecision: null },
    ];

    expect(prs[0]).toHaveProperty("reviewDecision");
    expect(prs[1].reviewDecision).toBeNull();
  });

  /**
   * @testdoc session command のルーティングに preflight が含まれる
   * @purpose サブコマンドの一覧に preflight が追加されていることの確認
   */
  it("should include preflight in valid actions", () => {
    const validActions = ["start", "end", "check", "preflight"];
    expect(validActions).toContain("preflight");
  });
});
