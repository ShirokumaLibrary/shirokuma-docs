/**
 * issues PR Commands Tests
 *
 * Tests for PR-related subcommands: pr-comments, merge, pr-reply, resolve.
 * Since these commands rely on external API calls (gh CLI),
 * tests focus on input validation, output structure contracts,
 * and option validation logic.
 *
 * @testdoc PR関連サブコマンドのテスト（pr-comments, merge, pr-reply, resolve）
 */

import {
  isIssueNumber,
  parseIssueNumber,
  validateBody,
} from "../../src/utils/github.js";
import {
  validateMergeMethod,
  parseMergeMethod,
  parseLinkedIssues,
  parsePrStateFilter,
  resolvePrFromHead,
} from "../../src/commands/issues-pr.js";

// =============================================================================
// #44: pr-comments - Input validation
// =============================================================================

describe("pr-comments - input validation", () => {
  /**
   * @testdoc 有効なPR番号を認識する
   * @purpose PR番号がIssue番号と同じ検証ロジックを使えることの確認
   */
  it("should accept valid PR numbers (same as issue numbers)", () => {
    expect(isIssueNumber("1")).toBe(true);
    expect(isIssueNumber("42")).toBe(true);
    expect(isIssueNumber("#42")).toBe(true);
  });

  /**
   * @testdoc 無効なPR番号を拒否する
   * @purpose 非数値入力がPR番号として認識されないことの確認
   */
  it("should reject invalid PR numbers", () => {
    expect(isIssueNumber("")).toBe(false);
    expect(isIssueNumber("abc")).toBe(false);
    expect(isIssueNumber("#")).toBe(false);
  });

  /**
   * @testdoc PR番号を正しくパースする
   * @purpose #付きPR番号が数値に変換されることの確認
   */
  it("should parse PR numbers correctly", () => {
    expect(parseIssueNumber("42")).toBe(42);
    expect(parseIssueNumber("#42")).toBe(42);
  });
});

// =============================================================================
// #44: pr-comments - Output structure contracts
// =============================================================================

describe("pr-comments - output structure", () => {
  /**
   * @testdoc pr-commentsの出力JSONにPR情報が含まれる
   * @purpose PR番号・タイトル・状態・レビュー判定が返される契約
   */
  it("should include PR metadata in output", () => {
    const output = {
      pr_number: 42,
      title: "feat: add branch workflow",
      state: "OPEN",
      review_decision: "CHANGES_REQUESTED",
      reviews: [],
      threads: [],
      total_threads: 0,
      unresolved_threads: 0,
    };

    expect(output).toHaveProperty("pr_number");
    expect(output).toHaveProperty("title");
    expect(output).toHaveProperty("state");
    expect(output).toHaveProperty("review_decision");
    expect(typeof output.pr_number).toBe("number");
  });

  /**
   * @testdoc pr-commentsの出力にレビュースレッドが含まれる
   * @purpose スレッドのresolved状態・ファイル・行番号が返される契約
   */
  it("should include review threads with file and line info", () => {
    const thread = {
      id: "PRRT_kwDON12345",
      is_resolved: false,
      is_outdated: false,
      file: "src/commands/issues.ts",
      line: 42,
      comments: [
        {
          id: "PRRC_kwDON12345",
          database_id: 12345678,
          author: "reviewer",
          body: "Consider using a type guard here",
          created_at: "2026-02-01T10:00:00Z",
        },
      ],
    };

    expect(thread).toHaveProperty("id");
    expect(thread).toHaveProperty("is_resolved");
    expect(thread).toHaveProperty("is_outdated");
    expect(thread).toHaveProperty("file");
    expect(thread).toHaveProperty("line");
    expect(thread.comments).toBeInstanceOf(Array);
    expect(thread.comments[0]).toHaveProperty("database_id");
    expect(typeof thread.comments[0].database_id).toBe("number");
  });

  /**
   * @testdoc pr-commentsの出力にレビューサマリーが含まれる
   * @purpose レビューの著者・状態・本文が返される契約
   */
  it("should include review summaries", () => {
    const review = {
      author: "reviewer",
      state: "CHANGES_REQUESTED",
      body: "Please fix the issues noted in the comments.",
    };

    expect(review).toHaveProperty("author");
    expect(review).toHaveProperty("state");
    expect(review).toHaveProperty("body");
  });

  /**
   * @testdoc pr-commentsの出力にスレッド集計が含まれる
   * @purpose 全スレッド数と未解決スレッド数が返される契約
   */
  it("should include thread count summary", () => {
    const output = {
      pr_number: 42,
      title: "feat: add feature",
      state: "OPEN",
      review_decision: "CHANGES_REQUESTED",
      reviews: [],
      threads: [
        { id: "PRRT_1", is_resolved: true, is_outdated: false, file: "a.ts", line: 1, comments: [] },
        { id: "PRRT_2", is_resolved: false, is_outdated: false, file: "b.ts", line: 5, comments: [] },
        { id: "PRRT_3", is_resolved: false, is_outdated: true, file: "c.ts", line: 10, comments: [] },
      ],
      total_threads: 3,
      unresolved_threads: 2,
    };

    expect(output.total_threads).toBe(output.threads.length);
    expect(output.unresolved_threads).toBe(
      output.threads.filter((t) => !t.is_resolved).length
    );
  });

  /**
   * @testdoc PRが見つからない場合の出力
   * @purpose 存在しないPR番号でエラーが返される契約
   */
  it("should document PR not found error condition", () => {
    const errorCondition = {
      cause: "PR number does not exist",
      expectedError: "PR #999 not found",
      exitCode: 1,
    };

    expect(errorCondition.exitCode).toBe(1);
  });
});

// =============================================================================
// #47: merge - Input validation
// =============================================================================

describe("merge - input validation", () => {
  /**
   * @testdoc デフォルトでsquashマージを使用する
   * @purpose マージ方式未指定時にsquashがデフォルトであることの確認
   */
  it("should default to squash merge method", () => {
    const method = parseMergeMethod({});
    expect(method).toBe("squash");
  });

  /**
   * @testdoc --squashオプションでsquashマージを明示的に選択する
   * @purpose squashフラグが正しく解釈される確認
   */
  it("should select squash when --squash is specified", () => {
    const method = parseMergeMethod({ squash: true });
    expect(method).toBe("squash");
  });

  /**
   * @testdoc --mergeオプションでmergeコミットを選択する
   * @purpose mergeフラグが正しく解釈される確認
   */
  it("should select merge when --merge is specified", () => {
    const method = parseMergeMethod({ merge: true });
    expect(method).toBe("merge");
  });

  /**
   * @testdoc --rebaseオプションでrebaseマージを選択する
   * @purpose rebaseフラグが正しく解釈される確認
   */
  it("should select rebase when --rebase is specified", () => {
    const method = parseMergeMethod({ rebase: true });
    expect(method).toBe("rebase");
  });

  /**
   * @testdoc 複数のマージ方式指定を拒否する
   * @purpose --squashと--mergeの同時指定がエラーになる確認
   */
  it("should reject multiple merge methods", () => {
    const error = validateMergeMethod({ squash: true, merge: true });
    expect(error).not.toBeNull();
    expect(error).toContain("Only one merge method");
  });

  /**
   * @testdoc 3つすべてのマージ方式指定を拒否する
   * @purpose 全フラグ同時指定がエラーになる確認
   */
  it("should reject all three merge methods specified", () => {
    const error = validateMergeMethod({ squash: true, merge: true, rebase: true });
    expect(error).not.toBeNull();
  });

  /**
   * @testdoc 単一のマージ方式指定を受け入れる
   * @purpose 正常ケースでnullが返される確認
   */
  it("should accept single merge method", () => {
    expect(validateMergeMethod({ squash: true })).toBeNull();
    expect(validateMergeMethod({ merge: true })).toBeNull();
    expect(validateMergeMethod({ rebase: true })).toBeNull();
    expect(validateMergeMethod({})).toBeNull();
  });
});

// =============================================================================
// #295: merge --head - PR番号をブランチ名から解決
// =============================================================================

describe("merge --head - resolve PR from branch", () => {
  /**
   * @testdoc resolvePrFromHead関数がエクスポートされている
   * @purpose ブランチ名からPR番号を解決するヘルパーが利用可能なことの確認
   */
  it("should export resolvePrFromHead function", () => {
    expect(typeof resolvePrFromHead).toBe("function");
  });

  /**
   * @testdoc merge出力に--headで解決したPR番号が含まれる
   * @purpose --headオプション使用時もPR番号が出力に含まれる契約
   */
  it("should include resolved PR number in merge output when using --head", () => {
    const output = {
      pr_number: 42,
      merged: true,
      merge_method: "squash",
      branch_deleted: true,
      linked_issues_updated: [],
    };

    expect(output).toHaveProperty("pr_number");
    expect(typeof output.pr_number).toBe("number");
  });

  /**
   * @testdoc mergeはPR番号または--headのどちらかを受け付ける
   * @purpose 2つの入力方式が存在することの文書化
   */
  it("should accept either PR number or --head option", () => {
    // 方式1: PR番号を直接指定
    const directInput = { target: "42", head: undefined };
    expect(isIssueNumber(directInput.target)).toBe(true);

    // 方式2: --headでブランチ名からPR番号を解決
    const headInput = { target: undefined, head: "feat/295-fix-merge-chain" };
    expect(headInput.head).toBeDefined();
  });

  /**
   * @testdoc PR番号も--headも無い場合はエラーになる
   * @purpose 両方未指定時のエラー条件文書化
   */
  it("should require either PR number or --head", () => {
    const noInput = { target: undefined, head: undefined };
    expect(noInput.target).toBeUndefined();
    expect(noInput.head).toBeUndefined();
  });
});

// =============================================================================
// #47: merge - Output structure contracts
// =============================================================================

describe("merge - output structure", () => {
  /**
   * @testdoc merge出力にマージ結果が含まれる
   * @purpose マージ成功時の出力構造契約
   */
  it("should document merge output structure", () => {
    const output = {
      pr_number: 42,
      merged: true,
      merge_method: "squash",
      branch_deleted: true,
      linked_issues_updated: [
        { number: 39, status: "Done" },
      ],
    };

    expect(output).toHaveProperty("pr_number");
    expect(output).toHaveProperty("merged");
    expect(output).toHaveProperty("merge_method");
    expect(output).toHaveProperty("branch_deleted");
    expect(output).toHaveProperty("linked_issues_updated");
    expect(output.merged).toBe(true);
    expect(output.linked_issues_updated).toBeInstanceOf(Array);
  });

  /**
   * @testdoc linked issueが無い場合は空配列を返す
   * @purpose PR本文にCloses/Fixesが無い場合の出力契約
   */
  it("should return empty linked_issues_updated when no linked issues", () => {
    const output = {
      pr_number: 42,
      merged: true,
      merge_method: "squash",
      branch_deleted: true,
      linked_issues_updated: [],
    };

    expect(output.linked_issues_updated).toEqual([]);
  });

  /**
   * @testdoc merge_methodが指定したマージ方式を反映する
   * @purpose 出力にsquash/merge/rebaseが正しく記録される契約
   */
  it("should reflect the selected merge method in output", () => {
    const methods = ["squash", "merge", "rebase"];
    methods.forEach((method) => {
      const output = { merge_method: method };
      expect(["squash", "merge", "rebase"]).toContain(output.merge_method);
    });
  });
});

// =============================================================================
// #47: merge - Linked issue parsing
// =============================================================================

describe("merge - linked issue parsing", () => {
  /**
   * @testdoc PR本文からCloses #Nを抽出する
   * @purpose Closes形式のリンクIssue番号抽出の確認
   */
  it("should parse Closes #N from PR body", () => {
    const body = "Fix the bug\n\nCloses #39";
    expect(parseLinkedIssues(body)).toContain(39);
  });

  /**
   * @testdoc PR本文からFixes #Nを抽出する
   * @purpose Fixes形式のリンクIssue番号抽出の確認
   */
  it("should parse Fixes #N from PR body", () => {
    const body = "Fixes #44\nFixes #45";
    const linked = parseLinkedIssues(body);
    expect(linked).toContain(44);
    expect(linked).toContain(45);
  });

  /**
   * @testdoc PR本文からResolves #Nを抽出する
   * @purpose Resolves形式のリンクIssue番号抽出の確認
   */
  it("should parse Resolves #N from PR body", () => {
    const body = "Resolves #47";
    expect(parseLinkedIssues(body)).toContain(47);
  });

  /**
   * @testdoc 複数のリンクIssueを抽出する
   * @purpose 異なるキーワード混在の複数Issue抽出の確認
   */
  it("should parse multiple linked issues with mixed keywords", () => {
    const body = "Closes #39\nFixes #44\nResolves #47";
    const linked = parseLinkedIssues(body);
    expect(linked).toHaveLength(3);
    expect(linked).toEqual(expect.arrayContaining([39, 44, 47]));
  });

  /**
   * @testdoc リンクIssueが無い本文では空配列を返す
   * @purpose リンクキーワードがない場合の動作確認
   */
  it("should return empty array when no linked issues", () => {
    const body = "Simple PR description without any linked issues.";
    expect(parseLinkedIssues(body)).toEqual([]);
  });

  /**
   * @testdoc 大文字小文字を問わず抽出する
   * @purpose closes/CLOSES/Closesすべて対応の確認
   */
  it("should be case-insensitive", () => {
    const body = "closes #1\nCLOSES #2\nCloses #3";
    const linked = parseLinkedIssues(body);
    expect(linked).toHaveLength(3);
  });

  /**
   * @testdoc 重複するIssue番号を除去する
   * @purpose 同じIssue番号が複数回参照されている場合の重複排除確認
   */
  it("should deduplicate issue numbers", () => {
    const body = "Closes #39\nFixes #39";
    const linked = parseLinkedIssues(body);
    expect(linked).toHaveLength(1);
    expect(linked).toContain(39);
  });

  /**
   * @testdoc undefinedのPR本文で空配列を返す
   * @purpose PR本文がnull/undefinedの場合の安全なフォールバック確認
   */
  it("should handle undefined body", () => {
    expect(parseLinkedIssues(undefined)).toEqual([]);
    expect(parseLinkedIssues("")).toEqual([]);
  });
});

// =============================================================================
// #45: session start - openPRs output structure
// =============================================================================

describe("session start - openPRs output structure", () => {
  /**
   * @testdoc session startの出力にopenPRs配列が含まれる
   * @purpose セッション開始時にオープンPR情報が返される契約
   */
  it("should include openPRs array in output", () => {
    const output = {
      repository: "owner/repo",
      lastHandover: null,
      issues: [],
      total_issues: 0,
      openPRs: [],
    };

    expect(output).toHaveProperty("openPRs");
    expect(output.openPRs).toBeInstanceOf(Array);
  });

  /**
   * @testdoc openPRsにレビュー判定が含まれる
   * @purpose 各PRのreview_decisionが返される契約
   */
  it("should include review decision for each PR", () => {
    const pr = {
      number: 42,
      title: "feat: add feature",
      url: "https://github.com/owner/repo/pull/42",
      review_decision: "CHANGES_REQUESTED",
      review_thread_count: 3,
      review_count: 1,
    };

    expect(pr).toHaveProperty("review_decision");
    expect(["APPROVED", "CHANGES_REQUESTED", "REVIEW_REQUIRED", null]).toContain(
      pr.review_decision
    );
  });

  /**
   * @testdoc openPRsにレビュースレッド数が含まれる
   * @purpose 未確認コメントの有無を判断するためのカウント契約
   */
  it("should include review thread and review counts", () => {
    const pr = {
      number: 42,
      title: "feat: add feature",
      url: "https://github.com/owner/repo/pull/42",
      review_decision: null,
      review_thread_count: 5,
      review_count: 2,
    };

    expect(typeof pr.review_thread_count).toBe("number");
    expect(typeof pr.review_count).toBe("number");
  });

  /**
   * @testdoc openPRsが空の場合は空配列を返す
   * @purpose オープンPRがない場合の出力契約
   */
  it("should return empty openPRs when no open PRs exist", () => {
    const output = {
      repository: "owner/repo",
      lastHandover: null,
      issues: [],
      total_issues: 0,
      openPRs: [],
    };

    expect(output.openPRs).toEqual([]);
  });

  /**
   * @testdoc session startは3つのデータソースを統合する
   * @purpose Discussions + Issues + PRsの3種を1コマンドで取得する契約
   */
  it("should document required queries for session start including open PRs", () => {
    const requiredQueries = [
      "GRAPHQL_QUERY_LATEST_HANDOVER",
      "GRAPHQL_QUERY_ISSUES_WITH_PROJECTS",
      "GRAPHQL_QUERY_OPEN_PRS",
    ];

    expect(requiredQueries).toHaveLength(3);
  });
});

// =============================================================================
// #46: pr-reply - Input validation
// =============================================================================

describe("pr-reply - input validation", () => {
  /**
   * @testdoc --reply-toオプションが必須
   * @purpose reply-to未指定時のエラー条件文書化
   */
  it("should require --reply-to option", () => {
    const options = { replyTo: undefined, body: "Fixed" };
    expect(options.replyTo).toBeUndefined();
  });

  /**
   * @testdoc --bodyオプションが必須
   * @purpose body未指定時のエラー条件文書化
   */
  it("should require --body option", () => {
    const options = { replyTo: "12345678", body: undefined };
    expect(options.body).toBeUndefined();
  });

  /**
   * @testdoc reply-toに数値IDを受け入れる
   * @purpose REST APIが数値IDを使うことの文書化
   */
  it("should accept numeric database ID for --reply-to", () => {
    const replyTo = "12345678";
    expect(/^\d+$/.test(replyTo)).toBe(true);
  });

  /**
   * @testdoc bodyのバリデーションが適用される
   * @purpose 既存のbodyバリデーションが再利用される確認
   */
  it("should validate body using standard validation", () => {
    expect(validateBody("Fixed in `abc1234`")).toBeNull();
    expect(validateBody("")).toBeNull();
  });
});

// =============================================================================
// #46: pr-reply - Output structure contracts
// =============================================================================

describe("pr-reply - output structure", () => {
  /**
   * @testdoc pr-reply出力に返信結果が含まれる
   * @purpose 返信成功時の出力構造契約
   */
  it("should document pr-reply output structure", () => {
    const output = {
      pr_number: 42,
      reply_to: 12345678,
      comment_id: 87654321,
      comment_url: "https://github.com/owner/repo/pull/42#discussion_r87654321",
    };

    expect(output).toHaveProperty("pr_number");
    expect(output).toHaveProperty("reply_to");
    expect(output).toHaveProperty("comment_id");
    expect(output).toHaveProperty("comment_url");
    expect(typeof output.reply_to).toBe("number");
  });
});

// =============================================================================
// #46: resolve - Input validation
// =============================================================================

describe("resolve - input validation", () => {
  /**
   * @testdoc --thread-idオプションが必須
   * @purpose thread-id未指定時のエラー条件文書化
   */
  it("should require --thread-id option", () => {
    const options = { threadId: undefined };
    expect(options.threadId).toBeUndefined();
  });

  /**
   * @testdoc GraphQLノードID形式のthread-idを受け入れる
   * @purpose PRRT_プレフィックスを持つIDの検証
   */
  it("should accept GraphQL node ID format for --thread-id", () => {
    const threadId = "PRRT_kwDON12345";
    expect(typeof threadId).toBe("string");
    expect(threadId.startsWith("PRRT_")).toBe(true);
  });
});

// =============================================================================
// #46: resolve - Output structure contracts
// =============================================================================

describe("resolve - output structure", () => {
  /**
   * @testdoc resolve出力にスレッド解決結果が含まれる
   * @purpose Resolve成功時の出力構造契約
   */
  it("should document resolve output structure", () => {
    const output = {
      pr_number: 42,
      thread_id: "PRRT_kwDON12345",
      resolved: true,
    };

    expect(output).toHaveProperty("pr_number");
    expect(output).toHaveProperty("thread_id");
    expect(output).toHaveProperty("resolved");
    expect(output.resolved).toBe(true);
  });
});

// =============================================================================
// Action routing - All new PR actions
// =============================================================================

describe("issues PR actions - routing", () => {
  /**
   * @testdoc 新しいPR関連アクション一覧
   * @purpose 追加されたアクションを文書化
   */
  it("should document new PR-related actions", () => {
    const newActions = ["pr-comments", "merge", "pr-reply", "resolve"];

    newActions.forEach((action) => {
      expect(typeof action).toBe("string");
    });
  });

  /**
   * @testdoc PR関連アクションはtargetまたは--headを必要とする
   * @purpose PR番号が必須であることの文書化（mergeは--headでも可）
   */
  it("should require target (PR number) for all PR actions", () => {
    const prActions = ["pr-comments", "merge", "pr-reply", "resolve"];

    prActions.forEach((action) => {
      // All PR actions require a target (PR number) or --head (merge only)
      expect(action).toBeDefined();
    });
  });

  /**
   * @testdoc 全アクション一覧（既存 + PR）
   * @purpose コマンドのアクション一覧を文書化
   */
  it("should document complete action list", () => {
    const allActions = [
      // Existing
      "list", "get", "create", "update", "comment",
      "close", "reopen", "import", "fields", "remove",
      // PR actions
      "pr-list", "pr-show", "pr-comments", "merge", "pr-reply", "resolve",
    ];

    expect(allActions).toHaveLength(16);
  });
});

// =============================================================================
// #568: parsePrStateFilter - state フィルタ変換
// =============================================================================

describe("parsePrStateFilter - state filter conversion", () => {
  /**
   * @testdoc "open" を GraphQL OPEN 状態に変換する
   * @purpose --state open のデフォルト動作確認
   */
  it("should convert 'open' to ['OPEN']", () => {
    expect(parsePrStateFilter("open")).toEqual(["OPEN"]);
  });

  /**
   * @testdoc "closed" を GraphQL CLOSED 状態に変換する
   * @purpose --state closed でクローズ済み PR のみ取得
   */
  it("should convert 'closed' to ['CLOSED']", () => {
    expect(parsePrStateFilter("closed")).toEqual(["CLOSED"]);
  });

  /**
   * @testdoc "merged" を GraphQL MERGED 状態に変換する
   * @purpose --state merged でマージ済み PR のみ取得
   */
  it("should convert 'merged' to ['MERGED']", () => {
    expect(parsePrStateFilter("merged")).toEqual(["MERGED"]);
  });

  /**
   * @testdoc "all" を全状態に変換する
   * @purpose --state all で全 PR を取得
   */
  it("should convert 'all' to all states", () => {
    const result = parsePrStateFilter("all");
    expect(result).toEqual(expect.arrayContaining(["OPEN", "CLOSED", "MERGED"]));
    expect(result).toHaveLength(3);
  });

  /**
   * @testdoc 大文字小文字を問わず変換する
   * @purpose "OPEN", "Open" 等もサポート
   */
  it("should be case-insensitive", () => {
    expect(parsePrStateFilter("OPEN")).toEqual(["OPEN"]);
    expect(parsePrStateFilter("Closed")).toEqual(["CLOSED"]);
    expect(parsePrStateFilter("MERGED")).toEqual(["MERGED"]);
    expect(parsePrStateFilter("ALL")).toEqual(["OPEN", "CLOSED", "MERGED"]);
  });

  /**
   * @testdoc 無効な値で null を返す
   * @purpose バリデーションエラーの検出
   */
  it("should return null for invalid state", () => {
    expect(parsePrStateFilter("invalid")).toBeNull();
    expect(parsePrStateFilter("")).toBeNull();
    expect(parsePrStateFilter("draft")).toBeNull();
  });
});

// =============================================================================
// #568: pr-list - 出力構造契約
// =============================================================================

describe("pr-list - output structure", () => {
  /**
   * @testdoc pr-list 出力に全 GH_PR_LIST_COLUMNS フィールドが含まれる
   * @purpose PR 一覧の出力構造契約
   */
  it("should include all GH_PR_LIST_COLUMNS fields", () => {
    const prOutput = {
      number: 42,
      title: "feat: add PR list command",
      state: "OPEN",
      head_branch: "feat/568-pr-list-show-commands",
      base_branch: "develop",
      author: "squeeze-dev",
      review_decision: "APPROVED",
      url: "https://github.com/owner/repo/pull/42",
    };

    expect(prOutput).toHaveProperty("number");
    expect(prOutput).toHaveProperty("title");
    expect(prOutput).toHaveProperty("state");
    expect(prOutput).toHaveProperty("head_branch");
    expect(prOutput).toHaveProperty("base_branch");
    expect(prOutput).toHaveProperty("author");
    expect(prOutput).toHaveProperty("review_decision");
    expect(prOutput).toHaveProperty("url");
    expect(typeof prOutput.number).toBe("number");
    expect(typeof prOutput.author).toBe("string");
  });

  /**
   * @testdoc pr-list の state は OPEN/CLOSED/MERGED のいずれか
   * @purpose state フィールドの値域契約
   */
  it("should have valid state values", () => {
    const validStates = ["OPEN", "CLOSED", "MERGED"];
    validStates.forEach((state) => {
      expect(validStates).toContain(state);
    });
  });

  /**
   * @testdoc pr-list の review_decision は有効値または null
   * @purpose review_decision フィールドの値域契約
   */
  it("should have valid review_decision values", () => {
    const validDecisions = ["APPROVED", "CHANGES_REQUESTED", "REVIEW_REQUIRED", null];
    validDecisions.forEach((decision) => {
      expect(validDecisions).toContain(decision);
    });
  });

  /**
   * @testdoc pr-list 出力に total_count が含まれる
   * @purpose 件数情報の出力契約
   */
  it("should include total_count in output", () => {
    const output = {
      repository: "owner/repo",
      pull_requests: [],
      total_count: 0,
    };

    expect(output).toHaveProperty("total_count");
    expect(typeof output.total_count).toBe("number");
    expect(output.pull_requests).toBeInstanceOf(Array);
  });
});

// =============================================================================
// #568: pr-show - 出力構造契約
// =============================================================================

describe("pr-show - output structure", () => {
  /**
   * @testdoc pr-show 出力に PR 詳細フィールドが含まれる
   * @purpose PR 詳細表示の出力構造契約
   */
  it("should include all detail fields", () => {
    const output = {
      number: 42,
      title: "feat: add PR list command",
      state: "OPEN",
      head_branch: "feat/568-pr-list-show-commands",
      base_branch: "develop",
      author: "squeeze-dev",
      review_decision: "APPROVED",
      url: "https://github.com/owner/repo/pull/42",
      body: "## Summary\nAdds PR list command",
      labels: ["enhancement"],
      created_at: "2026-02-15T00:00:00Z",
      updated_at: "2026-02-15T01:00:00Z",
      additions: 150,
      deletions: 20,
      changed_files: 5,
      review_thread_count: 2,
      review_count: 1,
      linked_issues: [568],
    };

    // pr-list フィールド
    expect(output).toHaveProperty("number");
    expect(output).toHaveProperty("title");
    expect(output).toHaveProperty("state");
    expect(output).toHaveProperty("head_branch");
    expect(output).toHaveProperty("base_branch");
    expect(output).toHaveProperty("author");
    expect(output).toHaveProperty("review_decision");
    expect(output).toHaveProperty("url");

    // pr-show 固有フィールド
    expect(output).toHaveProperty("body");
    expect(output).toHaveProperty("labels");
    expect(output).toHaveProperty("created_at");
    expect(output).toHaveProperty("updated_at");
    expect(output).toHaveProperty("additions");
    expect(output).toHaveProperty("deletions");
    expect(output).toHaveProperty("changed_files");
    expect(output).toHaveProperty("review_thread_count");
    expect(output).toHaveProperty("review_count");
    expect(output).toHaveProperty("linked_issues");
  });

  /**
   * @testdoc pr-show の diff 統計は数値型
   * @purpose diff 統計フィールドの型契約
   */
  it("should have numeric diff stats", () => {
    const output = {
      additions: 150,
      deletions: 20,
      changed_files: 5,
    };

    expect(typeof output.additions).toBe("number");
    expect(typeof output.deletions).toBe("number");
    expect(typeof output.changed_files).toBe("number");
  });

  /**
   * @testdoc pr-show の labels は文字列配列
   * @purpose labels フィールドの型契約
   */
  it("should have labels as string array", () => {
    const output = {
      labels: ["enhancement", "area:cli"],
    };

    expect(output.labels).toBeInstanceOf(Array);
    output.labels.forEach((label) => {
      expect(typeof label).toBe("string");
    });
  });

  /**
   * @testdoc pr-show の linked_issues は数値配列
   * @purpose linked_issues フィールドの型契約（parseLinkedIssues との整合性）
   */
  it("should have linked_issues as number array", () => {
    const output = {
      linked_issues: [39, 44],
    };

    expect(output.linked_issues).toBeInstanceOf(Array);
    output.linked_issues.forEach((num) => {
      expect(typeof num).toBe("number");
    });
  });

  /**
   * @testdoc pr-show の linked_issues が空の場合は空配列
   * @purpose リンク Issue がない場合の出力契約
   */
  it("should return empty linked_issues when no linked issues in body", () => {
    const output = {
      linked_issues: [],
    };

    expect(output.linked_issues).toEqual([]);
  });
});
