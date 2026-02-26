/**
 * test-cases-styles ジェネレーターテスト
 *
 * テストケース HTML ページ用のユーティリティ関数、CSS、
 * JavaScript 生成をテストする。
 *
 * @testdoc テストケーススタイル・ユーティリティの回帰テスト
 */

import {
  fileToId,
  groupBy,
  categoryToSlug,
  fileToSlug,
  getCategoryIcon,
  getCategoryColor,
  getCategoryBadgeHtml,
  getGlobalNavElements,
  getSidebarStyles,
  getSearchScript,
  getCategoryListStyles,
  getFileListStyles,
  getTestDetailStyles,
} from "../../src/generators/test-cases-styles.js";
import type { TestCategory } from "../../src/commands/test-cases-types.js";

// =============================================================================
// fileToId
// =============================================================================

describe("fileToId", () => {
  /**
   * @testdoc ファイルパスの英数字以外をハイフンに置換する
   */
  it("should replace non-alphanumeric characters with hyphens", () => {
    expect(fileToId("__tests__/example.test.ts")).toBe("--tests---example-test-ts");
  });

  /**
   * @testdoc スラッシュやドットをハイフンに変換する
   */
  it("should convert slashes and dots to hyphens", () => {
    expect(fileToId("src/lib/actions/create-user.test.ts")).toBe("src-lib-actions-create-user-test-ts");
  });

  /**
   * @testdoc 英数字のみのファイル名はそのまま返す
   */
  it("should keep alphanumeric-only names unchanged", () => {
    expect(fileToId("test123")).toBe("test123");
  });
});

// =============================================================================
// groupBy
// =============================================================================

describe("groupBy", () => {
  /**
   * @testdoc 配列をキー関数でグループ化して Map を返す
   */
  it("should group array items by key function", () => {
    const items = [
      { name: "a", type: "x" },
      { name: "b", type: "y" },
      { name: "c", type: "x" },
    ];
    const result = groupBy(items, (item) => item.type);
    expect(result.get("x")).toHaveLength(2);
    expect(result.get("y")).toHaveLength(1);
  });

  /**
   * @testdoc 空配列の場合は空の Map を返す
   */
  it("should return empty Map for empty array", () => {
    const result = groupBy([], () => "key");
    expect(result.size).toBe(0);
  });

  /**
   * @testdoc 全要素が同一キーの場合は1グループにまとまる
   */
  it("should put all items in one group when key is same", () => {
    const items = [1, 2, 3];
    const result = groupBy(items, () => "all");
    expect(result.get("all")).toHaveLength(3);
  });

  /**
   * @testdoc グループ内の順序が挿入順を保持する
   */
  it("should maintain insertion order within groups", () => {
    const items = ["a1", "b1", "a2", "b2"];
    const result = groupBy(items, (s) => s[0]);
    expect(result.get("a")).toEqual(["a1", "a2"]);
    expect(result.get("b")).toEqual(["b1", "b2"]);
  });
});

// =============================================================================
// categoryToSlug
// =============================================================================

describe("categoryToSlug", () => {
  /**
   * @testdoc カテゴリ名を小文字のケバブケースに変換する
   */
  it("should convert category to lowercase kebab-case", () => {
    expect(categoryToSlug("Server Actions")).toBe("server-actions");
    expect(categoryToSlug("E2E")).toBe("e2e");
    expect(categoryToSlug("Components")).toBe("components");
    expect(categoryToSlug("Other")).toBe("other");
  });
});

// =============================================================================
// fileToSlug
// =============================================================================

describe("fileToSlug", () => {
  /**
   * @testdoc .test.ts 拡張子を除去してスラッグを生成する
   */
  it("should remove .test.ts extension", () => {
    expect(fileToSlug("__tests__/example.test.ts")).toBe("example");
  });

  /**
   * @testdoc .test.tsx 拡張子を除去してスラッグを生成する
   */
  it("should remove .test.tsx extension", () => {
    expect(fileToSlug("src/Button.test.tsx")).toBe("Button");
  });

  /**
   * @testdoc .spec.ts 拡張子を除去してスラッグを生成する
   */
  it("should remove .spec.ts extension", () => {
    expect(fileToSlug("e2e/login.spec.ts")).toBe("login");
  });

  /**
   * @testdoc .spec.js 拡張子を除去してスラッグを生成する
   */
  it("should remove .spec.js extension", () => {
    expect(fileToSlug("tests/helper.spec.js")).toBe("helper");
  });

  /**
   * @testdoc 特殊文字をハイフンに変換する
   */
  it("should replace special characters with hyphens", () => {
    expect(fileToSlug("create user.test.ts")).toBe("create-user");
  });
});

// =============================================================================
// getCategoryIcon
// =============================================================================

describe("getCategoryIcon", () => {
  /**
   * @testdoc Server Actions カテゴリで ⚡ アイコンを返す
   */
  it("should return lightning icon for Server Actions", () => {
    expect(getCategoryIcon("Server Actions")).toBe("⚡");
  });

  /**
   * @testdoc Components カテゴリで 🧩 アイコンを返す
   */
  it("should return puzzle icon for Components", () => {
    expect(getCategoryIcon("Components")).toBe("🧩");
  });

  /**
   * @testdoc E2E カテゴリで 🎭 アイコンを返す
   */
  it("should return theatre icon for E2E", () => {
    expect(getCategoryIcon("E2E")).toBe("🎭");
  });

  /**
   * @testdoc 未知のカテゴリでデフォルトの 📄 アイコンを返す
   */
  it("should return document icon for unknown category", () => {
    expect(getCategoryIcon("Unknown")).toBe("📄");
  });
});

// =============================================================================
// getCategoryColor
// =============================================================================

describe("getCategoryColor", () => {
  /**
   * @testdoc 各カテゴリに正しい色クラスを返す
   */
  it("should return correct color class for each category", () => {
    expect(getCategoryColor("Server Actions")).toBe("orange");
    expect(getCategoryColor("Components")).toBe("purple");
    expect(getCategoryColor("E2E")).toBe("green");
    expect(getCategoryColor("Unknown")).toBe("gray");
  });
});

// =============================================================================
// getCategoryBadgeHtml
// =============================================================================

describe("getCategoryBadgeHtml", () => {
  /**
   * @testdoc count=0 の場合は空文字を返す
   */
  it("should return empty string when count is 0", () => {
    expect(getCategoryBadgeHtml("happy-path", 0)).toBe("");
  });

  /**
   * @testdoc happy-path カテゴリのバッジにアイコンとカウントを含む
   */
  it("should include icon and count for happy-path badge", () => {
    const result = getCategoryBadgeHtml("happy-path", 5);
    expect(result).toContain("✅");
    expect(result).toContain("5");
    expect(result).toContain("#22c55e");
    expect(result).toContain("正常系");
  });

  /**
   * @testdoc error-handling カテゴリのバッジに赤色を使用する
   */
  it("should use red color for error-handling badge", () => {
    const result = getCategoryBadgeHtml("error-handling", 3);
    expect(result).toContain("❌");
    expect(result).toContain("#ef4444");
    expect(result).toContain("エラー処理");
  });

  /**
   * @testdoc バッジが test-category-badge クラスを持つ span タグを返す
   */
  it("should return span with test-category-badge class", () => {
    const result = getCategoryBadgeHtml("auth", 2);
    expect(result).toContain("test-category-badge");
    expect(result).toContain("<span");
  });
});

// =============================================================================
// getGlobalNavElements
// =============================================================================

describe("getGlobalNavElements", () => {
  /**
   * @testdoc depth=1 で ../ プレフィックス付きの CSS と JS パスを返す
   */
  it("should return paths with ../ prefix at depth 1", () => {
    const result = getGlobalNavElements(1);
    expect(result.headElements).toContain("../global-nav.css");
    expect(result.bodyEndScripts).toContain("../global-nav.js");
  });

  /**
   * @testdoc depth=2 で ../../ プレフィックス付きのパスを返す
   */
  it("should return paths with ../../ prefix at depth 2", () => {
    const result = getGlobalNavElements(2);
    expect(result.headElements).toContain("../../global-nav.css");
    expect(result.bodyEndScripts).toContain("../../global-nav.js");
  });

  /**
   * @testdoc depth=0 でプレフィックスなしのパスを返す
   */
  it("should return paths without prefix at depth 0", () => {
    const result = getGlobalNavElements(0);
    expect(result.headElements).toContain("global-nav.css");
    expect(result.bodyEndScripts).toContain("global-nav.js");
    expect(result.headElements).not.toContain("../");
  });
});

// =============================================================================
// getSidebarStyles
// =============================================================================

describe("getSidebarStyles", () => {
  /**
   * @testdoc サイドバー関連のCSSクラスを含む
   */
  it("should include sidebar CSS classes", () => {
    const result = getSidebarStyles();
    expect(result).toContain(".sidebar");
    expect(result).toContain(".nav-group");
    expect(result).toContain(".nav-link");
    expect(result).toContain(".main-container");
    expect(result).toContain(".content");
  });

  /**
   * @testdoc サマリーカードのスタイルを含む
   */
  it("should include summary card styles", () => {
    const result = getSidebarStyles();
    expect(result).toContain(".summary-card");
    expect(result).toContain(".summary-grid");
    expect(result).toContain(".summary-value");
  });

  /**
   * @testdoc テストアイテムのスタイルを含む
   */
  it("should include test item styles", () => {
    const result = getSidebarStyles();
    expect(result).toContain(".test-item");
    expect(result).toContain(".test-name");
    expect(result).toContain(".test-line");
  });

  /**
   * @testdoc BDD アノテーションスタイルを含む
   */
  it("should include BDD annotation styles", () => {
    const result = getSidebarStyles();
    expect(result).toContain(".bdd-details");
    expect(result).toContain(".bdd-label");
    expect(result).toContain(".bdd-given");
    expect(result).toContain(".bdd-when");
    expect(result).toContain(".bdd-then");
  });

  /**
   * @testdoc [test-cases-styles/getSidebarStyles] レスポンシブメディアクエリを含む
   */
  it("should include responsive media query", () => {
    const result = getSidebarStyles();
    expect(result).toContain("@media (max-width: 768px)");
  });
});

// =============================================================================
// getSearchScript
// =============================================================================

describe("getSearchScript", () => {
  /**
   * @testdoc searchInput イベントリスナーを含む
   */
  it("should include searchInput event listener", () => {
    const result = getSearchScript();
    expect(result).toContain("searchInput");
    expect(result).toContain("addEventListener");
  });

  /**
   * @testdoc ファイルセクションのフィルタリングロジックを含む
   */
  it("should include file section filtering logic", () => {
    const result = getSearchScript();
    expect(result).toContain("fileSections");
    expect(result).toContain("hidden");
  });

  /**
   * @testdoc スムーズスクロール機能を含む
   */
  it("should include smooth scroll functionality", () => {
    const result = getSearchScript();
    expect(result).toContain("scrollIntoView");
    expect(result).toContain("smooth");
  });
});

// =============================================================================
// getCategoryListStyles
// =============================================================================

describe("getCategoryListStyles", () => {
  /**
   * @testdoc カテゴリグリッドとカードのスタイルを含む
   */
  it("should include category grid and card styles", () => {
    const result = getCategoryListStyles();
    expect(result).toContain(".category-grid");
    expect(result).toContain(".category-card");
    expect(result).toContain(".category-name");
  });

  /**
   * @testdoc カテゴリ色のボーダースタイルを含む
   */
  it("should include category color border styles", () => {
    const result = getCategoryListStyles();
    expect(result).toContain(".category-orange");
    expect(result).toContain(".category-purple");
    expect(result).toContain(".category-green");
    expect(result).toContain(".category-gray");
  });

  /**
   * @testdoc [test-cases-styles/getCategoryListStyles] レスポンシブメディアクエリを含む
   */
  it("should include responsive media query", () => {
    const result = getCategoryListStyles();
    expect(result).toContain("@media (max-width: 768px)");
  });
});

// =============================================================================
// getFileListStyles
// =============================================================================

describe("getFileListStyles", () => {
  /**
   * @testdoc ファイルリストとカードのスタイルを含む
   */
  it("should include file list and card styles", () => {
    const result = getFileListStyles();
    expect(result).toContain(".file-list");
    expect(result).toContain(".file-card");
    expect(result).toContain(".file-name");
  });

  /**
   * @testdoc [test-cases-styles/getFileListStyles] パンくずナビゲーションのスタイルを含む
   */
  it("should include breadcrumb styles", () => {
    const result = getFileListStyles();
    expect(result).toContain(".breadcrumb");
    expect(result).toContain(".separator");
    expect(result).toContain(".current");
  });
});

// =============================================================================
// getTestDetailStyles
// =============================================================================

describe("getTestDetailStyles", () => {
  /**
   * @testdoc テストグループとアイテムのスタイルを含む
   */
  it("should include test group and item styles", () => {
    const result = getTestDetailStyles();
    expect(result).toContain(".test-group");
    expect(result).toContain(".test-item");
    expect(result).toContain(".test-name");
    expect(result).toContain(".group-header");
  });

  /**
   * @testdoc [test-cases-styles/getTestDetailStyles] パンくずナビゲーションのスタイルを含む
   */
  it("should include breadcrumb styles", () => {
    const result = getTestDetailStyles();
    expect(result).toContain(".breadcrumb");
  });

  /**
   * @testdoc テストカテゴリバッジのスタイルを含む
   */
  it("should include test category badge styles", () => {
    const result = getTestDetailStyles();
    expect(result).toContain(".test-category-badge");
  });
});
