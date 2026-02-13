/**
 * lint-workflow Command Tests
 *
 * Tests for workflow convention validation rules.
 * Tests the pure validation functions (no subprocess mocking needed).
 *
 * @testdoc ワークフロー検証コマンドのテスト
 */

import type {
  LintWorkflowReport,
  LintWorkflowConfig,
  WorkflowIssue,
  WorkflowRuleResult,
} from "../../src/lint/workflow-types.js";
import {
  validateIssueFields,
  type TableJsonResponse,
} from "../../src/lint/rules/workflow-issue-fields.js";
import { validateBranchName } from "../../src/lint/rules/workflow-branch-naming.js";
import {
  validateMainProtection,
  type GitProtectionState,
} from "../../src/lint/rules/workflow-main-protection.js";
import {
  validateCommitFormat,
  type CommitEntry,
} from "../../src/lint/rules/workflow-commit-format.js";

// =============================================================================
// Type contracts
// =============================================================================

describe("lint-workflow - type contracts", () => {
  /**
   * @testdoc LintWorkflowReportがpassed, summary, ruleResultsフィールドを持つ
   * @purpose レポート型の構造契約
   */
  it("should define report structure with passed, summary, and ruleResults", () => {
    const report: LintWorkflowReport = {
      ruleResults: [],
      summary: { totalChecks: 0, errorCount: 0, warningCount: 0, infoCount: 0 },
      passed: true,
    };

    expect(report).toHaveProperty("passed");
    expect(report).toHaveProperty("summary");
    expect(report).toHaveProperty("ruleResults");
    expect(report.summary).toHaveProperty("totalChecks");
    expect(report.summary).toHaveProperty("errorCount");
    expect(report.summary).toHaveProperty("warningCount");
    expect(report.summary).toHaveProperty("infoCount");
  });

  /**
   * @testdoc WorkflowRuleResultがrule, description, issues, passedを持つ
   * @purpose ルール結果型の構造契約
   */
  it("should define rule result with rule, description, issues, passed", () => {
    const result: WorkflowRuleResult = {
      rule: "test-rule",
      description: "Test rule",
      issues: [],
      passed: true,
    };

    expect(result).toHaveProperty("rule");
    expect(result).toHaveProperty("description");
    expect(result).toHaveProperty("issues");
    expect(result).toHaveProperty("passed");
  });

  /**
   * @testdoc WorkflowIssueがtype, message, ruleフィールドを持つ
   * @purpose Issue型の構造契約
   */
  it("should define workflow issue with type, message, and rule", () => {
    const issue: WorkflowIssue = {
      type: "warning",
      message: "Test issue",
      rule: "test-rule",
    };

    expect(issue).toHaveProperty("type");
    expect(issue).toHaveProperty("message");
    expect(issue).toHaveProperty("rule");
    expect(["error", "warning", "info"]).toContain(issue.type);
  });

  /**
   * @testdoc LintWorkflowConfigがenabled, strict, rulesを持つ
   * @purpose 設定型の構造契約
   */
  it("should define config with enabled, strict, and rules", () => {
    const config: LintWorkflowConfig = {
      enabled: true,
      strict: false,
      rules: {
        "issue-fields": { severity: "warning", enabled: true },
        "branch-naming": { severity: "warning", enabled: true },
        "main-protection": { severity: "error", enabled: true },
      },
    };

    expect(config.enabled).toBe(true);
    expect(config.strict).toBe(false);
    expect(config.rules?.["issue-fields"]?.severity).toBe("warning");
    expect(config.rules?.["branch-naming"]?.severity).toBe("warning");
    expect(config.rules?.["main-protection"]?.severity).toBe("error");
  });
});

// =============================================================================
// issue-fields rule (validateIssueFields)
// =============================================================================

describe("validateIssueFields", () => {
  const makeData = (
    rows: Array<Array<string | number | string[] | null>>
  ): TableJsonResponse => ({
    columns: ["number", "title", "status", "priority", "type", "size", "labels"],
    rows,
  });

  /**
   * @testdoc 全フィールドが設定済みのIssueに対して問題を報告しない
   * @purpose 完全なIssueが合格する契約
   */
  it("should report no issues when all fields are set", () => {
    const data = makeData([[1, "Test Issue", "In Progress", "High", "Feature", "M", []]]);
    const issues = validateIssueFields(data, "warning");
    const fieldIssues = issues.filter((i) => i.message.includes("missing"));
    expect(fieldIssues).toHaveLength(0);
  });

  /**
   * @testdoc Priority未設定のIssueに対してwarningを報告する
   * @purpose 必須フィールド欠損検出の契約
   */
  it("should report warning for missing priority", () => {
    const data = makeData([[1, "Test Issue", "Backlog", null, "Feature", "M", []]]);
    const issues = validateIssueFields(data, "warning");
    const priorityIssues = issues.filter((i) => i.message.includes("priority"));
    expect(priorityIssues).toHaveLength(1);
    expect(priorityIssues[0].type).toBe("warning");
    expect(priorityIssues[0].rule).toBe("issue-fields");
  });

  /**
   * @testdoc 複数フィールドが欠損している場合にそれぞれ報告する
   * @purpose 個別フィールドごとの検出
   */
  it("should report separate issues for each missing field", () => {
    const data = makeData([[1, "Test Issue", "Backlog", null, null, null, []]]);
    const issues = validateIssueFields(data, "warning");
    const fieldIssues = issues.filter((i) => i.message.includes("missing"));
    expect(fieldIssues).toHaveLength(3);
    expect(fieldIssues.map((i) => i.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("priority"),
        expect.stringContaining("type"),
        expect.stringContaining("size"),
      ])
    );
  });

  /**
   * @testdoc Done/ReleasedのIssueはスキップする
   * @purpose 完了済みIssueの除外契約
   */
  it("should skip Done/Released issues", () => {
    const data = makeData([
      [1, "Done Issue", "Done", null, null, null, []],
      [2, "Released Issue", "Released", null, null, null, []],
    ]);
    const issues = validateIssueFields(data, "warning");
    const fieldIssues = issues.filter((i) => i.message.includes("missing"));
    expect(fieldIssues).toHaveLength(0);
  });

  /**
   * @testdoc 複数Issueを個別にチェックする
   * @purpose 複数Issue処理
   */
  it("should check multiple issues independently", () => {
    const data = makeData([
      [1, "Complete", "Backlog", "High", "Feature", "M", []],
      [2, "Incomplete", "Backlog", null, null, null, []],
    ]);
    const issues = validateIssueFields(data, "warning");
    const fieldIssues = issues.filter((i) => i.message.includes("missing"));
    expect(fieldIssues).toHaveLength(3);
    expect(fieldIssues.every((i) => i.context === "#2")).toBe(true);
  });

  /**
   * @testdoc severity引数が反映される
   * @purpose severity設定の正確な伝播
   */
  it("should use specified severity", () => {
    const data = makeData([[1, "Test", "Backlog", null, "Feature", "M", []]]);
    const issues = validateIssueFields(data, "error");
    expect(issues[0].type).toBe("error");
  });
});

// =============================================================================
// branch-naming rule (validateBranchName)
// =============================================================================

describe("validateBranchName", () => {
  /**
   * @testdoc 正しい命名規則のブランチに対して問題を報告しない
   * @purpose 規約準拠ブランチの合格
   */
  it("should pass for correctly named branches", () => {
    const issues = validateBranchName("feat/42-add-user-auth");
    expect(issues).toHaveLength(0);
  });

  /**
   * @testdoc 各許可prefixが合格する
   * @purpose prefix検証の網羅
   */
  it.each(["feat", "fix", "chore", "docs", "hotfix"])(
    "should pass for prefix: %s",
    (prefix) => {
      const issues = validateBranchName(`${prefix}/1-test`);
      expect(issues).toHaveLength(0);
    }
  );

  /**
   * @testdoc develop/mainブランチは常に合格する
   * @purpose 永続ブランチの除外契約
   */
  it.each(["develop", "main", "master"])(
    "should pass for persistent branch: %s",
    (branch) => {
      const issues = validateBranchName(branch);
      expect(issues).toHaveLength(0);
    }
  );

  /**
   * @testdoc release/X.xパターンが合格する
   * @purpose リリースブランチの除外契約
   */
  it("should pass for release branches", () => {
    const issues = validateBranchName("release/1.x");
    expect(issues).toHaveLength(0);
  });

  /**
   * @testdoc 規約に反するブランチ名に対してwarningを報告する
   * @purpose 非準拠ブランチの検出
   */
  it("should report warning for non-compliant branch names", () => {
    const issues = validateBranchName("my-feature-branch", "warning");
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe("warning");
    expect(issues[0].rule).toBe("branch-naming");
    expect(issues[0].message).toContain("does not match convention");
  });

  /**
   * @testdoc 許可されていないprefixのブランチに対して報告する
   * @purpose prefix検証
   */
  it("should report warning for non-allowed prefix", () => {
    const issues = validateBranchName("feature/42-something", "warning");
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("not in allowed list");
  });

  /**
   * @testdoc カスタムprefix許可リストを使用できる
   * @purpose prefix設定のカスタマイズ
   */
  it("should accept custom allowed prefixes", () => {
    const issues = validateBranchName("feature/42-something", "warning", [
      "feature",
      "bugfix",
    ]);
    expect(issues).toHaveLength(0);
  });

  /**
   * @testdoc 40文字超のslugに対してinfoを報告する
   * @purpose slug長制限
   */
  it("should report info for slug exceeding 40 characters", () => {
    const longSlug = "a".repeat(41);
    const issues = validateBranchName(`feat/42-${longSlug}`, "warning");
    const infoIssues = issues.filter((i) => i.type === "info");
    expect(infoIssues).toHaveLength(1);
    expect(infoIssues[0].message).toContain("exceeds 40 characters");
  });

  /**
   * @testdoc Issue番号なしのブランチ名は不合格
   * @purpose 必須Issue番号の検証
   */
  it("should fail for branch without issue number", () => {
    const issues = validateBranchName("feat/add-feature");
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("does not match convention");
  });
});

// =============================================================================
// main-protection rule (validateMainProtection)
// =============================================================================

describe("validateMainProtection", () => {
  const makeState = (overrides: Partial<GitProtectionState>): GitProtectionState => ({
    currentBranch: "feat/42-new-feature",
    hasUncommittedChanges: false,
    directCommitCount: 0,
    recentCommits: [],
    ...overrides,
  });

  /**
   * @testdoc フィーチャーブランチ上で変更なしの場合に問題を報告しない
   * @purpose フィーチャーブランチでの通常作業パターン
   */
  it("should pass when on a feature branch with no issues", () => {
    const state = makeState({});
    const issues = validateMainProtection(state, "error");
    expect(issues).toHaveLength(0);
  });

  /**
   * @testdoc 保護ブランチ上に未コミット変更がある場合にerrorを報告する
   * @purpose 保護ブランチでの作業検出
   */
  it("should report error when uncommitted changes on protected branch", () => {
    const state = makeState({
      currentBranch: "develop",
      hasUncommittedChanges: true,
    });
    const issues = validateMainProtection(state, "error");
    const errors = issues.filter((i) => i.type === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("Uncommitted changes");
    expect(errors[0].message).toContain("develop");
  });

  /**
   * @testdoc 保護ブランチに直接コミットがある場合にerrorを報告する
   * @purpose 直接コミット検出
   */
  it("should report error for direct commits on protected branch", () => {
    const state = makeState({
      currentBranch: "main",
      directCommitCount: 2,
    });
    const issues = validateMainProtection(state, "error");
    const errors = issues.filter((i) => i.type === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("2 direct (non-merge) commit(s)");
    expect(errors[0].message).toContain("main");
  });

  /**
   * @testdoc 保護ブランチで未コミット変更と直接コミットの両方を報告する
   * @purpose 複合問題の個別報告
   */
  it("should report both uncommitted changes and direct commits", () => {
    const state = makeState({
      currentBranch: "develop",
      hasUncommittedChanges: true,
      directCommitCount: 3,
    });
    const issues = validateMainProtection(state, "error");
    const errors = issues.filter((i) => i.type === "error");
    expect(errors).toHaveLength(2);
  });

  /**
   * @testdoc Co-Authored-By署名のあるコミットに対してwarningを報告する
   * @purpose Co-Authored-By検出
   */
  it("should report warning for commits with Co-Authored-By in body", () => {
    const state = makeState({
      recentCommits: [
        {
          hash: "abc1234",
          subject: "feat: add feature",
          body: "Co-Authored-By: Claude <noreply@anthropic.com>",
        },
      ],
    });
    const issues = validateMainProtection(state, "error");
    const coAuthoredIssues = issues.filter((i) => i.rule === "co-authored-by");
    expect(coAuthoredIssues).toHaveLength(1);
    expect(coAuthoredIssues[0].type).toBe("warning");
  });

  /**
   * @testdoc Co-Authored-Byが件名にある場合も検出する
   * @purpose subject行のCo-Authored-By検出
   */
  it("should detect Co-Authored-By in subject line", () => {
    const state = makeState({
      recentCommits: [
        {
          hash: "def5678",
          subject: "Co-Authored-By: test fix",
          body: "",
        },
      ],
    });
    const issues = validateMainProtection(state, "error");
    const coAuthoredIssues = issues.filter((i) => i.rule === "co-authored-by");
    expect(coAuthoredIssues).toHaveLength(1);
  });

  /**
   * @testdoc Co-Authored-Byのない通常コミットでは警告しない
   * @purpose 正常コミットの合格
   */
  it("should not warn for commits without Co-Authored-By", () => {
    const state = makeState({
      recentCommits: [
        { hash: "abc1234", subject: "feat: normal commit", body: "Just a body" },
      ],
    });
    const issues = validateMainProtection(state, "error");
    expect(issues).toHaveLength(0);
  });

  /**
   * @testdoc カスタム保護ブランチリストを使用できる
   * @purpose 保護ブランチ設定のカスタマイズ
   */
  it("should accept custom protected branches", () => {
    const state = makeState({
      currentBranch: "staging",
      hasUncommittedChanges: true,
    });
    const issues = validateMainProtection(state, "error", ["staging", "production"]);
    const errors = issues.filter((i) => i.type === "error");
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain("staging");
  });

  /**
   * @testdoc フィーチャーブランチでは保護ブランチチェックをスキップする
   * @purpose フィーチャーブランチの除外
   */
  it("should not check protection on feature branches", () => {
    const state = makeState({
      currentBranch: "feat/42-test",
      hasUncommittedChanges: true,
      directCommitCount: 5,
    });
    const issues = validateMainProtection(state, "error");
    const errors = issues.filter((i) => i.type === "error");
    expect(errors).toHaveLength(0);
  });
});

// =============================================================================
// commit-format rule (validateCommitFormat)
// =============================================================================

describe("validateCommitFormat", () => {
  const makeCommits = (subjects: string[]): CommitEntry[] =>
    subjects.map((s, i) => ({ hash: `abc${i}000`, subject: s }));

  /**
   * @testdoc Conventional Commits形式のコミットに対して問題を報告しない
   * @purpose 正しい形式のコミットが合格する契約
   */
  it("should pass for valid Conventional Commits", () => {
    const commits = makeCommits([
      "feat: add new feature (#42)",
      "fix: resolve bug in parser",
      "chore: update dependencies",
      "docs: update README",
      "test: add unit tests",
      "refactor: simplify validation logic",
    ]);
    const issues = validateCommitFormat(commits, "warning");
    expect(issues).toHaveLength(0);
  });

  /**
   * @testdoc スコープ付きのConventional Commitsが合格する
   * @purpose スコープ形式のサポート
   */
  it("should pass for scoped Conventional Commits", () => {
    const commits = makeCommits([
      "feat(auth): add login flow",
      "fix(parser): handle edge case",
    ]);
    const issues = validateCommitFormat(commits, "warning");
    expect(issues).toHaveLength(0);
  });

  /**
   * @testdoc 非Conventional Commits形式のコミットに対してwarningを報告する
   * @purpose 形式違反の検出
   */
  it("should report warning for non-conventional commits", () => {
    const commits = makeCommits(["Update the readme file"]);
    const issues = validateCommitFormat(commits, "warning");
    expect(issues).toHaveLength(1);
    expect(issues[0].type).toBe("warning");
    expect(issues[0].rule).toBe("commit-format");
    expect(issues[0].message).toContain("does not follow Conventional Commits");
  });

  /**
   * @testdoc Mergeコミットはスキップする
   * @purpose Mergeコミットの除外契約
   */
  it("should skip merge commits", () => {
    const commits = makeCommits([
      "Merge pull request #42 from feat/42-add-feature",
      "Merge branch 'develop' into feat/43",
    ]);
    const issues = validateCommitFormat(commits, "warning");
    expect(issues).toHaveLength(0);
  });

  /**
   * @testdoc 許可されていないtypeに対してwarningを報告する
   * @purpose type検証
   */
  it("should report warning for unknown commit type", () => {
    const commits = makeCommits(["feature: add something"]);
    const issues = validateCommitFormat(commits, "warning");
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('unknown type "feature"');
  });

  /**
   * @testdoc カスタムtype許可リストを使用できる
   * @purpose typeカスタマイズ
   */
  it("should accept custom allowed types", () => {
    const commits = makeCommits(["feature: add something"]);
    const issues = validateCommitFormat(commits, "warning", ["feature", "bugfix"]);
    expect(issues).toHaveLength(0);
  });

  /**
   * @testdoc 72文字超のsubjectに対してinfoを報告する
   * @purpose subject長制限
   */
  it("should report info for subject exceeding 72 characters", () => {
    const longSubject = `feat: ${"a".repeat(70)}`;
    const commits = makeCommits([longSubject]);
    const infoIssues = validateCommitFormat(commits, "warning").filter(
      (i) => i.type === "info"
    );
    expect(infoIssues).toHaveLength(1);
    expect(infoIssues[0].message).toContain("exceeds 72 characters");
  });

  /**
   * @testdoc severity引数が反映される
   * @purpose severity設定の正確な伝播
   */
  it("should use specified severity", () => {
    const commits = makeCommits(["bad commit message"]);
    const issues = validateCommitFormat(commits, "error");
    expect(issues[0].type).toBe("error");
  });

  /**
   * @testdoc 複数の違反コミットをそれぞれ個別に報告する
   * @purpose 複数コミット処理
   */
  it("should report issues for each non-compliant commit", () => {
    const commits = makeCommits([
      "feat: valid commit",
      "bad commit one",
      "another bad commit",
    ]);
    const formatIssues = validateCommitFormat(commits, "warning").filter(
      (i) => i.message.includes("does not follow")
    );
    expect(formatIssues).toHaveLength(2);
  });
});
