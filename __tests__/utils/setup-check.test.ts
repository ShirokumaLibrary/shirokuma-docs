/**
 * setup-check Utility Tests (#345)
 *
 * Tests for GitHub setup validation utility.
 * Since the utility relies on external API calls (gh CLI / GraphQL),
 * these tests focus on type validation and output structure.
 *
 * @testdoc GitHub手動設定の検証ユーティリティテスト
 */

import type { SetupCheckItem, SetupCheckResult } from "../../src/utils/setup-check.js";

describe("setup-check types (#345)", () => {
  describe("SetupCheckItem structure", () => {
    /**
     * @testdoc SetupCheckItem の正常系構造
     * @purpose 設定済みアイテムの出力形式を文書化
     */
    it("should document ok item structure", () => {
      const item: SetupCheckItem = {
        category: "discussions",
        name: "Handovers",
        ok: true,
      };

      expect(item.category).toBe("discussions");
      expect(item.name).toBe("Handovers");
      expect(item.ok).toBe(true);
      expect(item.hint).toBeUndefined();
      expect(item.url).toBeUndefined();
    });

    /**
     * @testdoc SetupCheckItem の未設定構造
     * @purpose 未設定アイテムにhintとurlが含まれることを文書化
     */
    it("should document missing item structure with hint and url", () => {
      const item: SetupCheckItem = {
        category: "discussions",
        name: "Research",
        ok: false,
        hint: 'Create "Research" category in GitHub UI',
        url: "https://github.com/owner/repo/discussions/categories",
      };

      expect(item.ok).toBe(false);
      expect(item.hint).toContain("Research");
      expect(item.url).toContain("discussions/categories");
    });

    /**
     * @testdoc SetupCheckItem のカテゴリ種別
     * @purpose 3種のカテゴリが利用可能であることを文書化
     */
    it("should support all category types", () => {
      const categories: SetupCheckItem["category"][] = [
        "discussions",
        "workflows",
        "metrics",
      ];

      categories.forEach((cat) => {
        expect(typeof cat).toBe("string");
      });
    });
  });

  describe("SetupCheckResult structure", () => {
    /**
     * @testdoc SetupCheckResult の出力構造
     * @purpose session check --setup の出力形式を文書化
     */
    it("should document result structure", () => {
      const result: SetupCheckResult = {
        repository: "owner/repo",
        items: [
          { category: "discussions", name: "Handovers", ok: true },
          { category: "discussions", name: "ADR", ok: true },
          { category: "discussions", name: "Knowledge", ok: true },
          {
            category: "discussions",
            name: "Research",
            ok: false,
            hint: 'Create "Research" category in GitHub UI',
            url: "https://github.com/owner/repo/discussions/categories",
          },
          { category: "workflows", name: "Item closed", ok: true },
          { category: "workflows", name: "Pull request merged", ok: false },
        ],
        summary: {
          total: 6,
          ok: 4,
          missing: 2,
        },
      };

      expect(result.repository).toBe("owner/repo");
      expect(result.items).toHaveLength(6);
      expect(result.summary.total).toBe(6);
      expect(result.summary.ok).toBe(4);
      expect(result.summary.missing).toBe(2);
    });

    /**
     * @testdoc 全設定完了時のサマリー
     * @purpose missing=0 で exit code 0 を文書化
     */
    it("should document all-ok result", () => {
      const result: SetupCheckResult = {
        repository: "owner/repo",
        items: [
          { category: "discussions", name: "Handovers", ok: true },
          { category: "discussions", name: "ADR", ok: true },
          { category: "discussions", name: "Knowledge", ok: true },
          { category: "discussions", name: "Research", ok: true },
        ],
        summary: {
          total: 4,
          ok: 4,
          missing: 0,
        },
      };

      // Exit code logic: missing > 0 ? 1 : 0
      expect(result.summary.missing > 0 ? 1 : 0).toBe(0);
    });

    /**
     * @testdoc 未設定ありのサマリー
     * @purpose missing>0 で exit code 1 を文書化
     */
    it("should document incomplete result", () => {
      const result: SetupCheckResult = {
        repository: "owner/repo",
        items: [
          { category: "discussions", name: "Research", ok: false },
        ],
        summary: {
          total: 1,
          ok: 0,
          missing: 1,
        },
      };

      expect(result.summary.missing > 0 ? 1 : 0).toBe(1);
    });
  });

  describe("Required Discussion categories", () => {
    /**
     * @testdoc 必須Discussionカテゴリ一覧
     * @purpose チェック対象カテゴリを文書化
     */
    it("should check these categories", () => {
      const requiredCategories = ["Handovers", "ADR", "Knowledge", "Research"];

      expect(requiredCategories).toHaveLength(4);
      expect(requiredCategories).toContain("Handovers");
      expect(requiredCategories).toContain("ADR");
      expect(requiredCategories).toContain("Knowledge");
      expect(requiredCategories).toContain("Research");
    });
  });

  describe("Recommended Project workflows", () => {
    /**
     * @testdoc 推奨ワークフロー一覧
     * @purpose チェック対象ワークフローを文書化
     */
    it("should check these workflows", () => {
      const recommendedWorkflows = ["Item closed", "Pull request merged"];

      expect(recommendedWorkflows).toHaveLength(2);
      expect(recommendedWorkflows).toContain("Item closed");
      expect(recommendedWorkflows).toContain("Pull request merged");
    });
  });
});
