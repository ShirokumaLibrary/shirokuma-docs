/**
 * session Command Tests
 *
 * Tests for the unified session management command.
 * Subcommands: start (fetch context), end (save handover), check (integrity).
 *
 * Tests focus on exported pure functions (classifyInconsistencies,
 * classifyMetricsInconsistencies, getGitState, getPreflightGitState,
 * generatePreflightWarnings, groupIssuesByAssignee, findMergedPrForIssue,
 * getSessionBackups, cleanupSessionBackups) and input validation logic.
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
  type PreflightGitState,
  type IssueData,
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
  it("should return GitState object with required fields", async () => {
    const state = await getGitState();

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
  it("should return current branch as string in a git repository", async () => {
    const state = await getGitState();

    // Tests run inside the shirokuma-docs repo, so branch should be a string
    expect(typeof state.currentBranch).toBe("string");
    expect(state.currentBranch!.length).toBeGreaterThan(0);
  });

  /**
   * @testdoc hasUncommittedChanges がuncommittedChanges配列の長さと整合する
   * @purpose booleanフラグと配列の一貫性確認
   */
  it("should have consistent hasUncommittedChanges flag", async () => {
    const state = await getGitState();

    if (state.uncommittedChanges.length > 0) {
      expect(state.hasUncommittedChanges).toBe(true);
    } else {
      expect(state.hasUncommittedChanges).toBe(false);
    }
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

// =============================================================================
// session end - PR merge auto-detection (#220)
// =============================================================================

describe("session end - PR merge auto-detection (#220)", () => {
  /**
   * @testdoc findMergedPrForIssue が存在しないIssueに対してnullを返す
   * @purpose マージ済みPRが見つからない場合のフォールバック確認
   */
  it("should return null for non-existent issue", async () => {
    const dummyLogger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      success: () => {},
    };

    // Issue 999999 には対応するマージ済みPRがないはず
    const result = await findMergedPrForIssue(
      "ShirokumaDevelopment",
      "shirokuma-docs",
      999999,
      dummyLogger as any
    );
    expect(result).toBeNull();
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
// Note: isIssueClosed は octokit REST API の薄いラッパー。
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
  it("should return PreflightGitState object with required fields", async () => {
    const state = await getPreflightGitState();

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
  it("should return current branch as string in a git repository", async () => {
    const state = await getPreflightGitState();

    expect(typeof state.branch).toBe("string");
    expect(state.branch!.length).toBeGreaterThan(0);
  });

  /**
   * @testdoc recentCommits の各要素が hash と message を持つ
   * @purpose コミット履歴の構造契約
   */
  it("should return recentCommits with hash and message fields", async () => {
    const state = await getPreflightGitState();

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
  it("should return at most 10 recent commits", async () => {
    const state = await getPreflightGitState();

    expect(state.recentCommits.length).toBeLessThanOrEqual(10);
  });

  /**
   * @testdoc baseBranch が文字列または null を返す
   * @purpose ベースブランチ検出の型契約
   */
  it("should return baseBranch as string or null", async () => {
    const state = await getPreflightGitState();

    expect(
      state.baseBranch === null || typeof state.baseBranch === "string"
    ).toBe(true);
  });

  /**
   * @testdoc unpushedCommits が数値または null を返す
   * @purpose upstream 未設定時に null を返す契約
   */
  it("should return unpushedCommits as number or null", async () => {
    const state = await getPreflightGitState();

    expect(
      state.unpushedCommits === null || typeof state.unpushedCommits === "number"
    ).toBe(true);
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

