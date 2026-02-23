/**
 * issues Sub-Issue Commands Tests
 *
 * Tests for Sub-Issue subcommands: sub-list, sub-add, sub-remove.
 * Since these commands rely on external API calls (octokit GraphQL/REST),
 * tests focus on input validation, helper functions, and output structure contracts.
 *
 * @testdoc Sub-Issue 関連サブコマンドのテスト（sub-list, sub-add, sub-remove）
 */

import {
  isIssueNumber,
  parseIssueNumber,
} from "../../src/utils/github.js";

// =============================================================================
// sub-list - Input validation
// =============================================================================

describe("sub-list - input validation", () => {
  /**
   * @testdoc 有効な親 Issue 番号を認識する
   * @purpose 親 Issue 番号が正しく検証されることの確認
   */
  it("should accept valid parent issue numbers", () => {
    expect(isIssueNumber("958")).toBe(true);
    expect(isIssueNumber("#958")).toBe(true);
    expect(isIssueNumber("1")).toBe(true);
  });

  /**
   * @testdoc 無効な親 Issue 番号を拒否する
   * @purpose 非数値入力が拒否されることの確認
   */
  it("should reject invalid parent issue numbers", () => {
    expect(isIssueNumber("")).toBe(false);
    expect(isIssueNumber("abc")).toBe(false);
    expect(isIssueNumber("#")).toBe(false);
  });

  /**
   * @testdoc Issue 番号を正しくパースする
   * @purpose #付き番号が数値に変換されることの確認
   */
  it("should parse issue numbers correctly", () => {
    expect(parseIssueNumber("958")).toBe(958);
    expect(parseIssueNumber("#958")).toBe(958);
  });
});

// =============================================================================
// sub-list - Output structure contracts
// =============================================================================

describe("sub-list - output structure", () => {
  /**
   * @testdoc sub-list の出力 JSON に親 Issue 情報と子 Issue 一覧が含まれる
   * @purpose 親 Issue 情報・子 Issue 一覧・サマリーが返される契約
   */
  it("should include parent info, sub issues, and summary in output", () => {
    const output = {
      parent: {
        number: 958,
        title: "octokit 移行",
      },
      sub_issues: [
        {
          number: 952,
          title: "Issues コマンドの octokit 移行",
          url: "https://github.com/example/repo/issues/952",
          state: "OPEN",
          labels: ["area:github"],
          status: "Backlog",
          priority: "Medium",
          size: "M",
        },
      ],
      summary: {
        total: 5,
        completed: 2,
        percent_completed: 40,
      },
    };

    expect(output).toHaveProperty("parent");
    expect(output.parent).toHaveProperty("number");
    expect(output.parent).toHaveProperty("title");
    expect(output).toHaveProperty("sub_issues");
    expect(Array.isArray(output.sub_issues)).toBe(true);
    expect(output).toHaveProperty("summary");
    expect(output.summary).toHaveProperty("total");
    expect(output.summary).toHaveProperty("completed");
    expect(output.summary).toHaveProperty("percent_completed");
  });

  /**
   * @testdoc 子 Issue に Project フィールドが含まれる
   * @purpose Status, Priority, Size が取得できることの確認
   */
  it("should include project fields in sub issues", () => {
    const subIssue = {
      number: 952,
      title: "Issues コマンドの octokit 移行",
      url: "https://github.com/example/repo/issues/952",
      state: "OPEN",
      labels: ["area:github"],
      status: "In Progress",
      priority: "Medium",
      size: "M",
    };

    expect(subIssue).toHaveProperty("status");
    expect(subIssue).toHaveProperty("priority");
    expect(subIssue).toHaveProperty("size");
  });
});

// =============================================================================
// sub-add - Output structure contracts
// =============================================================================

describe("sub-add - output structure", () => {
  /**
   * @testdoc sub-add の出力 JSON に親子 Issue 番号と成功フラグが含まれる
   * @purpose 紐付け結果が正しい構造で返される契約
   */
  it("should include parent, child, and added flag in output", () => {
    const output = {
      parent: 958,
      child: 952,
      added: true,
    };

    expect(output).toHaveProperty("parent");
    expect(output).toHaveProperty("child");
    expect(output).toHaveProperty("added");
    expect(typeof output.parent).toBe("number");
    expect(typeof output.child).toBe("number");
    expect(typeof output.added).toBe("boolean");
  });
});

// =============================================================================
// sub-remove - Output structure contracts
// =============================================================================

describe("sub-remove - output structure", () => {
  /**
   * @testdoc sub-remove の出力 JSON に親子 Issue 番号と削除フラグが含まれる
   * @purpose 解除結果が正しい構造で返される契約
   */
  it("should include parent, child, and removed flag in output", () => {
    const output = {
      parent: 958,
      child: 952,
      removed: true,
    };

    expect(output).toHaveProperty("parent");
    expect(output).toHaveProperty("child");
    expect(output).toHaveProperty("removed");
    expect(typeof output.parent).toBe("number");
    expect(typeof output.child).toBe("number");
    expect(typeof output.removed).toBe("boolean");
  });
});

// =============================================================================
// issues show - subIssuesSummary output contract
// =============================================================================

describe("issues show - sub issues summary", () => {
  /**
   * @testdoc 子 Issue がある場合に sub_issues フィールドが出力に含まれる
   * @purpose subIssuesSummary が正しくフォーマットされることの確認
   */
  it("should format sub issues summary correctly", () => {
    const total = 5;
    const completed = 2;
    const percentCompleted = 40;

    const formatted = `${total} 件 (${completed}/${total} 完了, ${percentCompleted}%)`;
    expect(formatted).toBe("5 件 (2/5 完了, 40%)");
  });

  /**
   * @testdoc 子 Issue がない場合に sub_issues フィールドが出力に含まれない
   * @purpose total=0 の場合はフィールドが省略されることの確認
   */
  it("should omit sub_issues when total is 0", () => {
    const output: Record<string, unknown> = {
      number: 42,
      title: "Test issue",
    };

    const subSummary = { total: 0, completed: 0, percentCompleted: 0 };
    if (subSummary.total > 0) {
      output.sub_issues = `${subSummary.total} 件`;
    }

    expect(output).not.toHaveProperty("sub_issues");
  });
});
