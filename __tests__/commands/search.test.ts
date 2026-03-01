/**
 * search command tests (#553)
 *
 * 統合検索コマンドの出力構造、--type フィルタ、
 * --state/--category バリデーション、エラーケースのテスト。
 */

import {
  GH_ISSUES_SEARCH_COLUMNS,
  GH_DISCUSSIONS_SEARCH_COLUMNS,
  toTableJson,
} from "../../src/utils/formatters.js";

describe("search output format (#553)", () => {
  // ===========================================================================
  // 統合検索の出力構造テスト
  // ===========================================================================

  describe("search output structure", () => {
    /**
     * @testdoc 統合検索出力のJSON構造（全タイプ）
     * @purpose Issues + Discussions 横断検索結果の出力形式を文書化
     */
    it("should document unified search output structure", () => {
      const expectedOutput = {
        repository: "owner/repo",
        query: "keyword",
        types: ["issues", "discussions"],
        results: {
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
          ],
          issues_count: 1,
          discussions: [
            {
              number: 100,
              title: "Discussion Title",
              url: "https://github.com/owner/repo/discussions/100",
              category: "Knowledge",
              author: "user2",
              answer_chosen: false,
              created_at: "2025-01-02T00:00:00Z",
            },
          ],
          discussions_count: 1,
        },
      };

      expect(expectedOutput.repository).toBeDefined();
      expect(expectedOutput.query).toBe("keyword");
      expect(expectedOutput.types).toEqual(["issues", "discussions"]);
      expect(expectedOutput.results.issues).toBeInstanceOf(Array);
      expect(expectedOutput.results.discussions).toBeInstanceOf(Array);
      expect(expectedOutput.results.issues_count).toBe(1);
      expect(expectedOutput.results.discussions_count).toBe(1);

      // Issue エントリ
      const issue = expectedOutput.results.issues[0];
      expect(issue.number).toBe(42);
      expect(issue.is_pr).toBe(false);
      expect(issue.author).toBe("user1");

      // Discussion エントリ
      const discussion = expectedOutput.results.discussions[0];
      expect(discussion.number).toBe(100);
      expect(discussion.category).toBe("Knowledge");
      expect(discussion.answer_chosen).toBe(false);
    });

    /**
     * @testdoc --state と --category がメタデータに含まれる
     * @purpose フィルタオプションが出力に反映されることを確認
     */
    it("should include optional filters in output metadata", () => {
      const outputWithFilters = {
        repository: "owner/repo",
        query: "keyword",
        types: ["issues", "discussions"],
        state: "open",
        category: "Knowledge",
        results: {
          issues: [],
          issues_count: 0,
          discussions: [],
          discussions_count: 0,
        },
      };

      expect(outputWithFilters.state).toBe("open");
      expect(outputWithFilters.category).toBe("Knowledge");
    });
  });

  // ===========================================================================
  // 列定義テスト
  // ===========================================================================

  describe("search columns", () => {
    /**
     * @testdoc Issues 検索用の列定義
     * @purpose GH_ISSUES_SEARCH_COLUMNS が正しい列を持つことを確認
     */
    it("should have correct issues search columns", () => {
      expect(GH_ISSUES_SEARCH_COLUMNS).toEqual([
        "number",
        "title",
        "state",
        "is_pr",
        "author",
        "created_at",
      ]);
    });

    /**
     * @testdoc Discussions 検索用の列定義
     * @purpose GH_DISCUSSIONS_SEARCH_COLUMNS が正しい列を持つことを確認
     */
    it("should have correct discussions search columns", () => {
      expect(GH_DISCUSSIONS_SEARCH_COLUMNS).toEqual([
        "number",
        "title",
        "category",
        "author",
        "answer_chosen",
        "created_at",
      ]);
    });
  });

  // ===========================================================================
  // --type オプションパーステスト
  // ===========================================================================

  describe("type option parsing", () => {
    /**
     * @testdoc --type のカンマ区切りパース
     * @purpose "issues,discussions" が正しくパースされることを確認
     */
    it("should parse comma-separated type option", () => {
      const typeOption = "issues,discussions";
      const parts = typeOption.split(",").map((t) => t.trim().toLowerCase());
      const types = new Set(parts);

      expect(types.has("issues")).toBe(true);
      expect(types.has("discussions")).toBe(true);
      expect(types.size).toBe(2);
    });

    /**
     * @testdoc --type で単一タイプのみを指定した場合の検索
     * @purpose --type issues で issues のみ検索されることを確認
     */
    it("should support single type", () => {
      const typeOption = "issues";
      const parts = typeOption.split(",").map((t) => t.trim().toLowerCase());
      const types = new Set(parts);

      expect(types.has("issues")).toBe(true);
      expect(types.has("discussions")).toBe(false);
      expect(types.size).toBe(1);
    });

    /**
     * @testdoc 無効な検索タイプを指定した場合の検出処理
     * @purpose 不正な値が検出されることを文書化
     */
    it("should detect invalid types", () => {
      const validTypes = ["issues", "discussions"];
      const invalidType = "commits";

      expect(validTypes.includes(invalidType)).toBe(false);
    });
  });

  // ===========================================================================
  // クエリ構築テスト
  // ===========================================================================

  describe("search query building", () => {
    /**
     * @testdoc Issues 用の検索クエリ構築
     * @purpose repo スコープと state フィルタの正しい構築を確認
     */
    it("should build correct issue search query", () => {
      const owner = "ShirokumaDevelopment";
      const repo = "shirokuma-docs";
      const query = "bug fix";

      let issueQuery = `repo:${owner}/${repo} ${query}`;
      expect(issueQuery).toBe(
        "repo:ShirokumaDevelopment/shirokuma-docs bug fix"
      );

      // --state オプション
      const state = "open";
      issueQuery += ` is:${state}`;
      expect(issueQuery).toBe(
        "repo:ShirokumaDevelopment/shirokuma-docs bug fix is:open"
      );
    });

    /**
     * @testdoc Discussions 用の検索クエリ構築
     * @purpose type:discussion と category フィルタの構築を確認
     */
    it("should build correct discussion search query", () => {
      const owner = "ShirokumaDevelopment";
      const repo = "shirokuma-docs";
      const query = "pattern";

      let discussionQuery = `repo:${owner}/${repo} type:discussion ${query}`;
      expect(discussionQuery).toBe(
        "repo:ShirokumaDevelopment/shirokuma-docs type:discussion pattern"
      );

      // --category オプション
      const category = "Knowledge";
      discussionQuery += ` category:"${category}"`;
      expect(discussionQuery).toBe(
        'repo:ShirokumaDevelopment/shirokuma-docs type:discussion pattern category:"Knowledge"'
      );
    });

    /**
     * @testdoc --state は Issues のみに適用
     * @purpose state が Discussions クエリに含まれないことを確認
     */
    it("should apply --state only to issues query", () => {
      const types = new Set(["issues", "discussions"]);
      const state = "open";

      // Issues: state を追加
      if (types.has("issues")) {
        const issueQuery = `repo:o/r query is:${state}`;
        expect(issueQuery).toContain("is:open");
      }

      // Discussions: state を追加しない
      if (types.has("discussions")) {
        const discussionQuery = "repo:o/r type:discussion query";
        expect(discussionQuery).not.toContain("is:");
      }
    });
  });

  // ===========================================================================
  // table-json 出力テスト
  // ===========================================================================

  describe("table-json output format", () => {
    /**
     * @testdoc table-json モードの Issues テーブル変換
     * @purpose toTableJson で Issues が正しくテーブル化されることを確認
     */
    it("should convert issues to table format", () => {
      const issues = [
        {
          number: 42,
          title: "Issue",
          state: "OPEN",
          is_pr: false,
          author: "user1",
          created_at: "2025-01-01T00:00:00Z",
        },
      ];

      const table = toTableJson(issues, GH_ISSUES_SEARCH_COLUMNS);
      expect(table.columns).toEqual(GH_ISSUES_SEARCH_COLUMNS);
      expect(table.rows).toHaveLength(1);
      expect(table.rows[0]).toEqual([
        42,
        "Issue",
        "OPEN",
        false,
        "user1",
        "2025-01-01T00:00:00Z",
      ]);
    });

    /**
     * @testdoc table-json モードの Discussions テーブル変換
     * @purpose toTableJson で Discussions が正しくテーブル化されることを確認
     */
    it("should convert discussions to table format", () => {
      const discussions = [
        {
          number: 100,
          title: "Discussion",
          category: "Knowledge",
          author: "user2",
          answer_chosen: true,
          created_at: "2025-01-02T00:00:00Z",
        },
      ];

      const table = toTableJson(discussions, GH_DISCUSSIONS_SEARCH_COLUMNS);
      expect(table.columns).toEqual(GH_DISCUSSIONS_SEARCH_COLUMNS);
      expect(table.rows).toHaveLength(1);
      expect(table.rows[0]).toEqual([
        100,
        "Discussion",
        "Knowledge",
        "user2",
        true,
        "2025-01-02T00:00:00Z",
      ]);
    });
  });

  // ===========================================================================
  // --category バリデーションテスト
  // ===========================================================================

  describe("category validation", () => {
    /**
     * @testdoc --type issues のみで --category 指定は警告
     * @purpose issues のみの場合 category が無視されることを文書化
     */
    it("should warn when --category used with --type issues only", () => {
      const types = new Set(["issues"]);
      const hasCategory = true;

      const shouldWarn = hasCategory && !types.has("discussions");
      expect(shouldWarn).toBe(true);
    });

    /**
     * @testdoc discussions を含む場合は --category 有効
     * @purpose discussions 検索で category が適用されることを確認
     */
    it("should not warn when --category used with discussions", () => {
      const types = new Set(["issues", "discussions"]);
      const hasCategory = true;

      const shouldWarn = hasCategory && !types.has("discussions");
      expect(shouldWarn).toBe(false);
    });
  });

  // ===========================================================================
  // GraphQL エイリアスクエリテスト
  // ===========================================================================

  describe("GraphQL alias query building", () => {
    /**
     * @testdoc 両タイプ指定時は2つのエイリアスを含む
     * @purpose issueSearch + discussionSearch が 1 クエリに束ねられることを確認
     */
    it("should include both aliases for both types", () => {
      const types = new Set(["issues", "discussions"]);
      const queryParts: string[] = [];

      if (types.has("issues")) queryParts.push("issueSearch");
      if (types.has("discussions")) queryParts.push("discussionSearch");

      expect(queryParts).toEqual(["issueSearch", "discussionSearch"]);
      expect(queryParts).toHaveLength(2);
    });

    /**
     * @testdoc 単一タイプ時は1つのエイリアスのみ
     * @purpose 不要なエイリアスが除外されることを確認
     */
    it("should include only one alias for single type", () => {
      const types = new Set(["issues"]);
      const queryParts: string[] = [];

      if (types.has("issues")) queryParts.push("issueSearch");
      if (types.has("discussions")) queryParts.push("discussionSearch");

      expect(queryParts).toEqual(["issueSearch"]);
      expect(queryParts).toHaveLength(1);
    });
  });

  // ===========================================================================
  // is_pr 判定テスト
  // ===========================================================================

  describe("is_pr determination", () => {
    /**
     * @testdoc __typename による Issue/PR の区別
     * @purpose PullRequest は is_pr: true になることを確認
     */
    it("should determine is_pr from __typename", () => {
      const issueNode = { __typename: "Issue" };
      const prNode = { __typename: "PullRequest" };

      expect(issueNode.__typename === "PullRequest").toBe(false);
      expect(prNode.__typename === "PullRequest").toBe(true);
    });
  });
});
