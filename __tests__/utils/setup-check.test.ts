/**
 * setup-check Utility Tests (#345, #527)
 *
 * Tests for GitHub setup validation utility.
 * Since the utility relies on external API calls (octokit GraphQL/REST),
 * these tests focus on type validation and output structure.
 *
 * @testdoc GitHub手動設定の検証ユーティリティテスト
 */

import type {
  SetupCheckItem,
  SetupCheckResult,
  RecommendedCategorySetting,
} from "../../src/utils/setup-check.js";
import { RECOMMENDED_CATEGORY_SETTINGS } from "../../src/utils/setup-check.js";

describe("setup-check types (#345, #527)", () => {
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
        recommended: RECOMMENDED_CATEGORY_SETTINGS["Handovers"],
      };

      expect(item.category).toBe("discussions");
      expect(item.name).toBe("Handovers");
      expect(item.ok).toBe(true);
      expect(item.hint).toBeUndefined();
      expect(item.url).toBeUndefined();
      expect(item.recommended).toBeDefined();
    });

    /**
     * @testdoc SetupCheckItem の未設定構造（推奨設定付き）
     * @purpose 未設定アイテムにhint, url, recommendedが含まれることを文書化
     */
    it("should document missing item structure with hint, url, and recommended", () => {
      const item: SetupCheckItem = {
        category: "discussions",
        name: "Research",
        ok: false,
        hint: 'Create "Research" category: Repository → Settings → Features → Discussions → Set up discussions → New category',
        url: "https://github.com/owner/repo/discussions/categories",
        recommended: RECOMMENDED_CATEGORY_SETTINGS["Research"],
      };

      expect(item.ok).toBe(false);
      expect(item.hint).toContain("Research");
      expect(item.hint).toContain("Repository → Settings");
      expect(item.url).toContain("discussions/categories");
      expect(item.recommended).toBeDefined();
      expect(item.recommended!.description).toContain("調査");
      expect(item.recommended!.emoji).toBe("🔬");
      expect(item.recommended!.format).toBe("Open-ended discussion");
    });

    /**
     * @testdoc SetupCheckItem のカテゴリ種別（#527 で project 追加）
     * @purpose 4種のカテゴリが利用可能であることを文書化
     */
    it("should support all category types including project", () => {
      const categories: SetupCheckItem["category"][] = [
        "discussions",
        "workflows",
        "metrics",
        "project",
      ];

      expect(categories).toHaveLength(4);
      categories.forEach((cat) => {
        expect(typeof cat).toBe("string");
      });
    });

    /**
     * @testdoc Project カテゴリアイテムの構造
     * @purpose Project 存在チェックの出力形式を文書化
     */
    it("should document project category item structure", () => {
      const item: SetupCheckItem = {
        category: "project",
        name: "Project",
        ok: false,
        hint: "Create a GitHub Project with the same name as the repository",
      };

      expect(item.category).toBe("project");
      expect(item.ok).toBe(false);
      expect(item.recommended).toBeUndefined();
    });

    /**
     * @testdoc Project フィールドチェックアイテムの構造
     * @purpose 必須フィールドのチェック出力形式を文書化
     */
    it("should document project field check item structure", () => {
      const item: SetupCheckItem = {
        category: "project",
        name: "Priority",
        ok: false,
        hint: 'Create "Priority" field: Run \'shirokuma-docs projects setup --lang ja\' or Project → Settings → Custom fields → New field (Single Select).',
      };

      expect(item.category).toBe("project");
      expect(item.name).toBe("Priority");
      expect(item.ok).toBe(false);
      expect(item.hint).toContain("shirokuma-docs projects setup");
    });
  });

  describe("SetupCheckResult structure", () => {
    /**
     * @testdoc SetupCheckResult の出力構造（#527 拡張版）
     * @purpose session check --setup の出力形式を文書化
     */
    it("should document result structure with project items", () => {
      const result: SetupCheckResult = {
        repository: "owner/repo",
        items: [
          {
            category: "discussions",
            name: "Handovers",
            ok: true,
            recommended: RECOMMENDED_CATEGORY_SETTINGS["Handovers"],
          },
          {
            category: "discussions",
            name: "ADR",
            ok: true,
            recommended: RECOMMENDED_CATEGORY_SETTINGS["ADR"],
          },
          {
            category: "discussions",
            name: "Knowledge",
            ok: true,
            recommended: RECOMMENDED_CATEGORY_SETTINGS["Knowledge"],
          },
          {
            category: "discussions",
            name: "Research",
            ok: false,
            hint: 'Create "Research" category: Repository → Settings → Features → Discussions → Set up discussions → New category',
            url: "https://github.com/owner/repo/discussions/categories",
            recommended: RECOMMENDED_CATEGORY_SETTINGS["Research"],
          },
          { category: "project", name: "Project", ok: true },
          { category: "project", name: "Status", ok: true },
          { category: "project", name: "Priority", ok: true },
          { category: "project", name: "Size", ok: false, hint: 'Create "Size" field: Run \'shirokuma-docs projects setup --lang ja\' or Project → Settings → Custom fields → New field (Single Select).' },
          { category: "workflows", name: "Item closed", ok: true },
          { category: "workflows", name: "Pull request merged", ok: false },
        ],
        summary: {
          total: 10,
          ok: 7,
          missing: 3,
        },
      };

      expect(result.repository).toBe("owner/repo");
      expect(result.items).toHaveLength(10);
      expect(result.summary.total).toBe(10);
      expect(result.summary.ok).toBe(7);
      expect(result.summary.missing).toBe(3);

      // Discussion アイテムには recommended が付与される
      const discussionItems = result.items.filter((i) => i.category === "discussions");
      expect(discussionItems.every((i) => i.recommended !== undefined)).toBe(true);

      // Project アイテムには recommended が付与されない
      const projectItems = result.items.filter((i) => i.category === "project");
      expect(projectItems.every((i) => i.recommended === undefined)).toBe(true);
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
          { category: "project", name: "Project", ok: true },
        ],
        summary: {
          total: 5,
          ok: 5,
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
          { category: "project", name: "Project", ok: false },
        ],
        summary: {
          total: 2,
          ok: 0,
          missing: 2,
        },
      };

      expect(result.summary.missing > 0 ? 1 : 0).toBe(1);
    });

    /**
     * @testdoc Project 未発見時はフィールド/ワークフローチェックなし
     * @purpose projectId=null の場合の出力構造を文書化
     */
    it("should document result when project not found", () => {
      const result: SetupCheckResult = {
        repository: "owner/repo",
        items: [
          { category: "discussions", name: "Handovers", ok: true },
          { category: "discussions", name: "ADR", ok: true },
          { category: "discussions", name: "Knowledge", ok: true },
          { category: "discussions", name: "Research", ok: true },
          {
            category: "project",
            name: "Project",
            ok: false,
            hint: "Create a GitHub Project with the same name as the repository",
          },
          // Project 依存のチェック（fields, workflows, metrics）は含まれない
        ],
        summary: {
          total: 5,
          ok: 4,
          missing: 1,
        },
      };

      const projectItem = result.items.find((i) => i.name === "Project");
      expect(projectItem?.ok).toBe(false);
      expect(projectItem?.hint).toContain("GitHub Project");

      // Project 依存のチェックは含まれない
      expect(result.items.filter((i) => i.category === "workflows")).toHaveLength(0);
      expect(result.items.filter((i) => i.category === "metrics")).toHaveLength(0);
      expect(result.items.filter((i) => i.category === "project" && i.name !== "Project")).toHaveLength(0);
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

  describe("RECOMMENDED_CATEGORY_SETTINGS (#527)", () => {
    /**
     * @testdoc 全必須カテゴリに推奨設定が定義されていること
     * @purpose RECOMMENDED_CATEGORY_SETTINGS の網羅性を文書化
     */
    it("should have settings for all required categories", () => {
      const requiredCategories = ["Handovers", "ADR", "Knowledge", "Research"];

      for (const cat of requiredCategories) {
        expect(RECOMMENDED_CATEGORY_SETTINGS[cat]).toBeDefined();
      }
    });

    /**
     * @testdoc 推奨設定の構造（description, emoji, format）
     * @purpose 各設定が必要な全フィールドを持つことを文書化
     */
    it("should have description, emoji, and format for each category", () => {
      for (const [name, setting] of Object.entries(RECOMMENDED_CATEGORY_SETTINGS)) {
        expect(setting.description).toBeTruthy();
        expect(setting.emoji).toBeTruthy();
        expect(["Open-ended discussion", "Question / Answer"]).toContain(setting.format);
        // 全カテゴリが Open-ended
        expect(setting.format).toBe("Open-ended discussion");
      }
    });

    /**
     * @testdoc RecommendedCategorySetting 型の構造
     * @purpose JSON 出力時の recommended フィールド形式を文書化
     */
    it("should document RecommendedCategorySetting structure", () => {
      const setting: RecommendedCategorySetting = {
        description: "Test description",
        emoji: "🔬",
        format: "Open-ended discussion",
      };

      expect(setting.description).toBe("Test description");
      expect(setting.emoji).toBe("🔬");
      expect(setting.format).toBe("Open-ended discussion");
    });
  });

  describe("Required Project fields (#527)", () => {
    /**
     * @testdoc 必須Projectフィールド一覧
     * @purpose チェック対象フィールドを文書化
     */
    it("should check these project fields", () => {
      const requiredFields = ["Status", "Priority", "Size"];

      expect(requiredFields).toHaveLength(3);
      expect(requiredFields).toContain("Status");
      expect(requiredFields).toContain("Priority");
      expect(requiredFields).toContain("Size");
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
