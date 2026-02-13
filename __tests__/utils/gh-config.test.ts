/**
 * GitHub CLI Configuration Utilities Tests
 *
 * Tests for gh-config utility functions with explicit config parameter.
 * Focus on pure function behavior without filesystem mocking.
 *
 * @testdoc GitHub CLI設定ユーティリティ関数のテスト
 */

import {
  getDefaultCategory,
  getDefaultLimit,
  getDefaultStatus,
  getTypeLabel,
  getMetricsConfig,
  clearConfigCache,
  type GhConfig,
  type MetricsConfig,
} from "../../src/utils/gh-config.js";

describe("getDefaultCategory", () => {
  /**
   * @testdoc 設定のdiscussionsCategoryを返す
   * @purpose 明示的config指定時に正しいカテゴリを返すことを確認
   */
  it("should return discussionsCategory from config", () => {
    const config: GhConfig = {
      discussionsCategory: "CustomCategory",
    };
    const result = getDefaultCategory(config);
    expect(result).toBe("CustomCategory");
  });

  /**
   * @testdoc discussionsCategoryがundefinedの場合、"Handovers"を返す
   * @purpose デフォルト値へのフォールバック確認
   */
  it("should return 'Handovers' when discussionsCategory is undefined", () => {
    const config: GhConfig = {};
    const result = getDefaultCategory(config);
    expect(result).toBe("Handovers");
  });

  /**
   * @testdoc discussionsCategoryが空文字列の場合、"Handovers"を返す
   * @purpose falsy値のフォールバック処理確認
   */
  it("should return 'Handovers' when discussionsCategory is empty string", () => {
    const config: GhConfig = {
      discussionsCategory: "",
    };
    const result = getDefaultCategory(config);
    expect(result).toBe("Handovers");
  });

  /**
   * @testdoc 日本語カテゴリ名を正しく返す
   * @purpose 多言語カテゴリ名のサポート確認
   */
  it("should return Japanese category name", () => {
    const config: GhConfig = {
      discussionsCategory: "引き継ぎ",
    };
    const result = getDefaultCategory(config);
    expect(result).toBe("引き継ぎ");
  });

  /**
   * @testdoc 特殊文字を含むカテゴリ名を正しく返す
   * @purpose 特殊文字のサポート確認
   */
  it("should return category name with special characters", () => {
    const config: GhConfig = {
      discussionsCategory: "Handovers & Notes",
    };
    const result = getDefaultCategory(config);
    expect(result).toBe("Handovers & Notes");
  });
});

describe("getDefaultLimit", () => {
  /**
   * @testdoc 設定のlistLimitを返す
   * @purpose 明示的config指定時に正しいリミット値を返すことを確認
   */
  it("should return listLimit from config", () => {
    const config: GhConfig = {
      listLimit: 50,
    };
    const result = getDefaultLimit(config);
    expect(result).toBe(50);
  });

  /**
   * @testdoc listLimitがundefinedの場合、20を返す
   * @purpose デフォルト値へのフォールバック確認
   */
  it("should return 20 when listLimit is undefined", () => {
    const config: GhConfig = {};
    const result = getDefaultLimit(config);
    expect(result).toBe(20);
  });

  /**
   * @testdoc listLimitが0の場合、20を返す
   * @purpose falsy値(0)のフォールバック処理確認
   */
  it("should return 20 when listLimit is 0", () => {
    const config: GhConfig = {
      listLimit: 0,
    };
    const result = getDefaultLimit(config);
    expect(result).toBe(20);
  });

  /**
   * @testdoc listLimitが1の場合、1を返す
   * @purpose 最小有効値のサポート確認
   */
  it("should return 1 when listLimit is 1", () => {
    const config: GhConfig = {
      listLimit: 1,
    };
    const result = getDefaultLimit(config);
    expect(result).toBe(1);
  });

  /**
   * @testdoc 大きなlistLimit値を正しく返す
   * @purpose 大きな数値のサポート確認
   */
  it("should return large listLimit value", () => {
    const config: GhConfig = {
      listLimit: 1000,
    };
    const result = getDefaultLimit(config);
    expect(result).toBe(1000);
  });
});

describe("getDefaultStatus", () => {
  /**
   * @testdoc 設定のdefaultStatusを返す
   * @purpose 明示的config指定時に正しいステータスを返すことを確認
   */
  it("should return defaultStatus from config", () => {
    const config: GhConfig = {
      defaultStatus: "Ready",
    };
    const result = getDefaultStatus(config);
    expect(result).toBe("Ready");
  });

  /**
   * @testdoc defaultStatusがundefinedの場合、Backlogを返す
   * @purpose デフォルト値へのフォールバック確認
   */
  it("should return Backlog when defaultStatus is undefined", () => {
    const config: GhConfig = {};
    const result = getDefaultStatus(config);
    expect(result).toBe("Backlog");
  });

  /**
   * @testdoc defaultStatusが空文字の場合、Backlogを返す
   * @purpose falsy値のフォールバック処理確認
   */
  it("should return Backlog when defaultStatus is empty string", () => {
    const config: GhConfig = {
      defaultStatus: "",
    };
    const result = getDefaultStatus(config);
    expect(result).toBe("Backlog");
  });
});

describe("getTypeLabel", () => {
  /**
   * @testdoc featureタイプのラベルを返す
   * @purpose featureラベルの取得確認
   */
  it("should return feature label from config", () => {
    const config: GhConfig = {
      labels: {
        feature: "enhancement",
      },
    };
    const result = getTypeLabel("feature", config);
    expect(result).toBe("enhancement");
  });

  /**
   * @testdoc bugタイプのラベルを返す
   * @purpose bugラベルの取得確認
   */
  it("should return bug label from config", () => {
    const config: GhConfig = {
      labels: {
        bug: "defect",
      },
    };
    const result = getTypeLabel("bug", config);
    expect(result).toBe("defect");
  });

  /**
   * @testdoc choreタイプのラベルを返す
   * @purpose choreラベルの取得確認
   */
  it("should return chore label from config", () => {
    const config: GhConfig = {
      labels: {
        chore: "maintenance",
      },
    };
    const result = getTypeLabel("chore", config);
    expect(result).toBe("maintenance");
  });

  /**
   * @testdoc docsタイプのラベルを返す
   * @purpose docsラベルの取得確認
   */
  it("should return docs label from config", () => {
    const config: GhConfig = {
      labels: {
        docs: "documentation",
      },
    };
    const result = getTypeLabel("docs", config);
    expect(result).toBe("documentation");
  });

  /**
   * @testdoc researchタイプのラベルを返す
   * @purpose researchラベルの取得確認
   */
  it("should return research label from config", () => {
    const config: GhConfig = {
      labels: {
        research: "spike",
      },
    };
    const result = getTypeLabel("research", config);
    expect(result).toBe("spike");
  });

  /**
   * @testdoc labelsがundefinedの場合、タイプ名自体を返す
   * @purpose labelsオブジェクト未設定時のフォールバック確認
   */
  it("should return type name when labels is undefined", () => {
    const config: GhConfig = {};
    expect(getTypeLabel("feature", config)).toBe("feature");
    expect(getTypeLabel("bug", config)).toBe("bug");
    expect(getTypeLabel("chore", config)).toBe("chore");
    expect(getTypeLabel("docs", config)).toBe("docs");
    expect(getTypeLabel("research", config)).toBe("research");
  });

  /**
   * @testdoc 特定のラベルがundefinedの場合、タイプ名自体を返す
   * @purpose 部分的なlabels設定時のフォールバック確認
   */
  it("should return type name when specific label is undefined", () => {
    const config: GhConfig = {
      labels: {
        feature: "enhancement",
        // bug is not set
      },
    };
    expect(getTypeLabel("feature", config)).toBe("enhancement");
    expect(getTypeLabel("bug", config)).toBe("bug");
  });

  /**
   * @testdoc 日本語ラベルを正しく返す
   * @purpose 多言語ラベルのサポート確認
   */
  it("should return Japanese label", () => {
    const config: GhConfig = {
      labels: {
        feature: "機能追加",
        bug: "バグ",
      },
    };
    expect(getTypeLabel("feature", config)).toBe("機能追加");
    expect(getTypeLabel("bug", config)).toBe("バグ");
  });

  /**
   * @testdoc 絵文字を含むラベルを正しく返す
   * @purpose 絵文字ラベルのサポート確認
   */
  it("should return label with emoji", () => {
    const config: GhConfig = {
      labels: {
        bug: ":bug: bug",
      },
    };
    const result = getTypeLabel("bug", config);
    expect(result).toBe(":bug: bug");
  });

  /**
   * @testdoc 全てのラベルを設定した場合、各ラベルを正しく返す
   * @purpose 完全なlabels設定の動作確認
   */
  it("should return all labels when fully configured", () => {
    const config: GhConfig = {
      labels: {
        feature: "feat",
        bug: "fix",
        chore: "maint",
        docs: "doc",
        research: "research",
      },
    };
    expect(getTypeLabel("feature", config)).toBe("feat");
    expect(getTypeLabel("bug", config)).toBe("fix");
    expect(getTypeLabel("chore", config)).toBe("maint");
    expect(getTypeLabel("docs", config)).toBe("doc");
    expect(getTypeLabel("research", config)).toBe("research");
  });
});

describe("clearConfigCache", () => {
  /**
   * @testdoc clearConfigCacheがエラーなく実行される
   * @purpose キャッシュクリア関数の基本動作確認
   */
  it("should execute without error", () => {
    expect(() => clearConfigCache()).not.toThrow();
  });

  /**
   * @testdoc clearConfigCacheが複数回呼び出し可能
   * @purpose 複数回のキャッシュクリアが安全に実行できることを確認
   */
  it("should be callable multiple times", () => {
    expect(() => {
      clearConfigCache();
      clearConfigCache();
      clearConfigCache();
    }).not.toThrow();
  });
});

describe("GhConfig type integration", () => {
  /**
   * @testdoc 全てのフィールドを持つ完全なconfigオブジェクトが動作する
   * @purpose 完全な設定オブジェクトの統合テスト
   */
  it("should work with fully populated config", () => {
    const config: GhConfig = {
      discussionsCategory: "Discussions",
      listLimit: 100,
      labels: {
        feature: "type: feature",
        bug: "type: bug",
        chore: "type: chore",
        docs: "type: docs",
        research: "type: research",
      },
    };

    expect(getDefaultCategory(config)).toBe("Discussions");
    expect(getDefaultLimit(config)).toBe(100);
    expect(getTypeLabel("feature", config)).toBe("type: feature");
    expect(getTypeLabel("bug", config)).toBe("type: bug");
    expect(getTypeLabel("chore", config)).toBe("type: chore");
    expect(getTypeLabel("docs", config)).toBe("type: docs");
    expect(getTypeLabel("research", config)).toBe("type: research");
  });

  /**
   * @testdoc 空のconfigオブジェクトで全てのデフォルト値が返る
   * @purpose 空設定時のフォールバック統合テスト
   */
  it("should return defaults for empty config", () => {
    const config: GhConfig = {};

    expect(getDefaultCategory(config)).toBe("Handovers");
    expect(getDefaultLimit(config)).toBe(20);
    expect(getTypeLabel("feature", config)).toBe("feature");
    expect(getTypeLabel("bug", config)).toBe("bug");
    expect(getTypeLabel("chore", config)).toBe("chore");
    expect(getTypeLabel("docs", config)).toBe("docs");
    expect(getTypeLabel("research", config)).toBe("research");
  });
});

describe("getMetricsConfig", () => {
  /**
   * @testdoc metrics未設定時にデフォルト値が返る
   * @purpose metrics セクションがない config のフォールバック
   */
  it("should return defaults when metrics is not configured", () => {
    const config: GhConfig = {};
    const result = getMetricsConfig(config);

    expect(result.enabled).toBe(false);
    expect(result.dateFields?.planningAt).toBe("Planning At");
    expect(result.dateFields?.specReviewAt).toBe("Spec Review At");
    expect(result.dateFields?.startedAt).toBe("Started At");
    expect(result.dateFields?.reviewAt).toBe("Review At");
    expect(result.dateFields?.completedAt).toBe("Completed At");
    expect(result.staleThresholdDays).toBe(14);
  });

  /**
   * @testdoc metrics.enabled: true が正しく反映される
   * @purpose ユーザーが metrics を有効化した場合
   */
  it("should reflect metrics.enabled setting", () => {
    const config: GhConfig = {
      metrics: { enabled: true },
    };
    const result = getMetricsConfig(config);

    expect(result.enabled).toBe(true);
    expect(result.dateFields?.planningAt).toBe("Planning At");
    expect(result.dateFields?.specReviewAt).toBe("Spec Review At");
    expect(result.dateFields?.startedAt).toBe("Started At");
    expect(result.statusToDateMapping?.["Planning"]).toBe("Planning At");
    expect(result.statusToDateMapping?.["Spec Review"]).toBe("Spec Review At");
    expect(result.statusToDateMapping?.["In Progress"]).toBe("Started At");
  });

  /**
   * @testdoc カスタム dateFields が正しくマージされる
   * @purpose フィールド名のカスタマイズ
   */
  it("should merge custom dateFields with defaults", () => {
    const config: GhConfig = {
      metrics: {
        enabled: true,
        dateFields: { startedAt: "開始日" },
      },
    };
    const result = getMetricsConfig(config);

    expect(result.dateFields?.startedAt).toBe("開始日");
    expect(result.dateFields?.reviewAt).toBe("Review At");
    expect(result.dateFields?.completedAt).toBe("Completed At");
  });

  /**
   * @testdoc カスタム statusToDateMapping がマージされる
   * @purpose ステータス→フィールドのマッピングカスタマイズ
   */
  it("should merge custom statusToDateMapping with defaults", () => {
    const config: GhConfig = {
      metrics: {
        enabled: true,
        statusToDateMapping: { "In Progress": "開始日" },
      },
    };
    const result = getMetricsConfig(config);

    expect(result.statusToDateMapping?.["In Progress"]).toBe("開始日");
    expect(result.statusToDateMapping?.["Done"]).toBe("Completed At");
  });

  /**
   * @testdoc staleThresholdDays のカスタム値
   * @purpose stale 閾値のカスタマイズ
   */
  it("should accept custom staleThresholdDays", () => {
    const config: GhConfig = {
      metrics: { staleThresholdDays: 7 },
    };
    const result = getMetricsConfig(config);

    expect(result.staleThresholdDays).toBe(7);
  });
});
