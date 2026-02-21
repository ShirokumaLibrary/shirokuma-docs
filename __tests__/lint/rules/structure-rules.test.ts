/**
 * structure-rules Rule Tests
 *
 * プロジェクト構造検証ルール群のテスト。
 * fs/glob に直接依存するため jest.unstable_mockModule + dynamic import を使用。
 *
 * @testdoc プロジェクト構造検証ルールのテスト
 */

import { jest } from "@jest/globals";

// =============================================================================
// Mocks (ESM: unstable_mockModule + dynamic import)
// =============================================================================

const mockExistsSync = jest.fn<(...args: any[]) => any>();
const mockStatSync = jest.fn<(...args: any[]) => any>();
const mockReaddirSync = jest.fn<(...args: any[]) => any>();
const mockReadFileSync = jest.fn<(...args: any[]) => any>();
const mockGlobSync = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule("node:fs", () => ({
  existsSync: mockExistsSync,
  statSync: mockStatSync,
  readdirSync: mockReaddirSync,
  readFileSync: mockReadFileSync,
}));

jest.unstable_mockModule("glob", () => ({
  globSync: mockGlobSync,
}));

const {
  checkDirRequired,
  checkFileRequired,
  checkDirRecommended,
  checkLibNoRootFiles,
  checkLibHasIndex,
  checkNamingConvention,
  checkNoCrossAppImport,
  checkActionsStructure,
  checkComponentsDomainGrouping,
  checkLibStructureCompliance,
  checkBarrelExportRequired,
  checkActionsSeparation,
} = await import("../../../src/lint/rules/structure-rules.js");

// =============================================================================
// Helpers
// =============================================================================

function mockDir() {
  return { isDirectory: () => true, isFile: () => false };
}

function mockFile() {
  return { isDirectory: () => false, isFile: () => true };
}

/** existsSync をパスごとに制御するヘルパー */
function setupExists(pathMap: Record<string, boolean>) {
  mockExistsSync.mockImplementation((p: any) => {
    const path = String(p);
    for (const [key, value] of Object.entries(pathMap)) {
      if (path.endsWith(key)) return value;
    }
    return false;
  });
}

/** statSync をパスごとに制御するヘルパー */
function setupStat(pathMap: Record<string, "dir" | "file">) {
  mockStatSync.mockImplementation((p: any) => {
    const path = String(p);
    for (const [key, value] of Object.entries(pathMap)) {
      if (path.endsWith(key)) {
        return value === "dir" ? mockDir() : mockFile();
      }
    }
    return mockFile();
  });
}

// =============================================================================
// Tests: 前半（単純なファイルシステムチェック関数）
// =============================================================================

describe("structure-rules", () => {
  beforeEach(() => {
    mockExistsSync.mockReset();
    mockStatSync.mockReset();
    mockReaddirSync.mockReset();
    mockReadFileSync.mockReset();
    mockGlobSync.mockReset();
  });

  // ===========================================================================
  // checkDirRequired
  // ===========================================================================

  describe("checkDirRequired", () => {
    /**
     * @testdoc 存在するディレクトリは pass
     */
    it("should return pass for existing directories", () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue(mockDir());

      const results = checkDirRequired("/project", ["src", "tests"], "error");
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe("pass");
      expect(results[0].target).toBe("src/");
      expect(results[1].status).toBe("pass");
    });

    /**
     * @testdoc 存在しないディレクトリは severity に応じたステータス
     */
    it("should return severity status for missing directories", () => {
      mockExistsSync.mockReturnValue(false);

      const results = checkDirRequired("/project", ["missing"], "error");
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("error");
      expect(results[0].message).toContain("必須ディレクトリ");
      expect(results[0].fix).toContain("mkdir");
    });

    /**
     * @testdoc ファイルがディレクトリ名と同じパスにある場合は失敗
     */
    it("should fail when path exists but is a file", () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue(mockFile());

      const results = checkDirRequired("/project", ["src"], "warning");
      expect(results[0].status).toBe("warning");
    });
  });

  // ===========================================================================
  // checkFileRequired
  // ===========================================================================

  describe("checkFileRequired", () => {
    /**
     * @testdoc 存在するファイルは pass
     */
    it("should return pass for existing files", () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue(mockFile());

      const results = checkFileRequired("/project", ["package.json"], "error");
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("pass");
      expect(results[0].target).toBe("package.json");
    });

    /**
     * @testdoc 存在しないファイルは severity に応じたステータス
     */
    it("should return severity status for missing files", () => {
      mockExistsSync.mockReturnValue(false);

      const results = checkFileRequired("/project", ["missing.ts"], "error");
      expect(results[0].status).toBe("error");
      expect(results[0].message).toContain("必須ファイル");
    });

    /**
     * @testdoc ディレクトリがファイル名と同じパスにある場合は失敗
     */
    it("should fail when path exists but is a directory", () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue(mockDir());

      const results = checkFileRequired("/project", ["src"], "warning");
      expect(results[0].status).toBe("warning");
    });
  });

  // ===========================================================================
  // checkDirRecommended
  // ===========================================================================

  describe("checkDirRecommended", () => {
    /**
     * @testdoc 存在する推奨ディレクトリは pass
     */
    it("should return pass for existing recommended directories", () => {
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue(mockDir());

      const results = checkDirRecommended("/project", ["hooks"], "info");
      expect(results[0].status).toBe("pass");
    });

    /**
     * @testdoc 存在しない推奨ディレクトリは severity に応じたステータス
     */
    it("should return severity status for missing recommended directories", () => {
      mockExistsSync.mockReturnValue(false);

      const results = checkDirRecommended("/project", ["hooks"], "info");
      expect(results[0].status).toBe("info");
      expect(results[0].message).toContain("推奨");
    });
  });

  // ===========================================================================
  // checkLibNoRootFiles
  // ===========================================================================

  describe("checkLibNoRootFiles", () => {
    /**
     * @testdoc checkLibNoRootFiles: config.enabled=false の場合は空配列を返す
     */
    it("should return empty array when disabled", () => {
      const results = checkLibNoRootFiles("/project", {
        enabled: false,
        severity: "error",
      });
      expect(results).toEqual([]);
    });

    /**
     * @testdoc checkLibNoRootFiles: lib/ が存在しない場合は空配列を返す
     */
    it("should return empty array when lib/ does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const results = checkLibNoRootFiles("/project", {
        enabled: true,
        severity: "error",
      });
      expect(results).toEqual([]);
    });

    /**
     * @testdoc lib/ 直下に .ts ファイルがない場合は pass
     */
    it("should return pass when lib/ has no root .ts files", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["utils", "auth"]);
      mockStatSync.mockReturnValue(mockDir());

      const results = checkLibNoRootFiles("/project", {
        enabled: true,
        severity: "error",
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("pass");
    });

    /**
     * @testdoc lib/ 直下に .ts ファイルがある場合は violation
     */
    it("should return violation when lib/ has root .ts files", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["helper.ts", "utils.ts", "auth"]);
      mockStatSync.mockImplementation((p: any) => {
        if (String(p).endsWith("auth")) return mockDir();
        return mockFile();
      });

      const results = checkLibNoRootFiles("/project", {
        enabled: true,
        severity: "error",
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("error");
      expect(results[0].found).toContain("lib/helper.ts");
      expect(results[0].found).toContain("lib/utils.ts");
    });

    /**
     * @testdoc .ts 以外のファイルは無視する
     */
    it("should ignore non-.ts files", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["README.md", ".gitkeep"]);
      mockStatSync.mockReturnValue(mockFile());

      const results = checkLibNoRootFiles("/project", {
        enabled: true,
        severity: "error",
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("pass");
    });
  });

  // ===========================================================================
  // checkLibHasIndex
  // ===========================================================================

  describe("checkLibHasIndex", () => {
    /**
     * @testdoc checkLibHasIndex: config.enabled=false の場合は空配列を返す
     */
    it("should return empty array when disabled", () => {
      const results = checkLibHasIndex("/project", {
        enabled: false,
        severity: "warning",
      });
      expect(results).toEqual([]);
    });

    /**
     * @testdoc checkLibHasIndex: lib/ が存在しない場合は空配列を返す
     */
    it("should return empty array when lib/ does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const results = checkLibHasIndex("/project", {
        enabled: true,
        severity: "warning",
      });
      expect(results).toEqual([]);
    });

    /**
     * @testdoc index.ts があるサブディレクトリは pass
     */
    it("should return pass for subdirectory with index.ts", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["utils"]);
      mockStatSync.mockReturnValue(mockDir());

      const results = checkLibHasIndex("/project", {
        enabled: true,
        severity: "warning",
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("pass");
      expect(results[0].target).toBe("lib/utils/");
    });

    /**
     * @testdoc index.ts がないサブディレクトリは violation
     */
    it("should return violation for subdirectory without index.ts", () => {
      // lib/ exists
      mockExistsSync.mockImplementation((p: any) => {
        const path = String(p);
        if (path.endsWith("index.ts")) return false;
        return true;
      });
      mockReaddirSync.mockReturnValue(["utils"]);
      mockStatSync.mockReturnValue(mockDir());

      const results = checkLibHasIndex("/project", {
        enabled: true,
        severity: "warning",
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("warning");
      expect(results[0].message).toContain("index.ts");
    });

    /**
     * @testdoc actions ディレクトリはスキップされる
     */
    it("should skip actions directory", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["actions"]);
      mockStatSync.mockReturnValue(mockDir());

      const results = checkLibHasIndex("/project", {
        enabled: true,
        severity: "warning",
      });
      expect(results).toEqual([]);
    });
  });

  // ===========================================================================
  // checkActionsStructure
  // ===========================================================================

  describe("checkActionsStructure", () => {
    /**
     * @testdoc lib/actions/ が存在しない場合は空配列を返す
     */
    it("should return empty array when lib/actions/ does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      expect(checkActionsStructure("/project", "warning")).toEqual([]);
    });

    /**
     * @testdoc crud/ と domain/ の両方がある場合は pass
     */
    it("should return pass when both crud/ and domain/ exist", () => {
      mockExistsSync.mockReturnValue(true);

      const results = checkActionsStructure("/project", "warning");
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("pass");
      expect(results[0].message).toContain("crud/, domain/");
    });

    /**
     * @testdoc crud/ のみの場合は pass
     */
    it("should return pass when only crud/ exists", () => {
      mockExistsSync.mockImplementation((p: any) => {
        const path = String(p);
        if (path.endsWith("domain")) return false;
        return true;
      });

      const results = checkActionsStructure("/project", "warning");
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("pass");
      expect(results[0].message).toContain("crud/");
    });

    /**
     * @testdoc crud/ も domain/ もないフラット構造は violation
     */
    it("should return violation for flat structure", () => {
      mockExistsSync.mockImplementation((p: any) => {
        const path = String(p);
        if (path.endsWith("actions")) return true;
        return false;
      });
      mockReaddirSync.mockReturnValue(["create.ts", "update.ts"]);
      mockStatSync.mockReturnValue(mockFile());

      const results = checkActionsStructure("/project", "warning");
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("warning");
      expect(results[0].message).toContain("フラット構造");
    });
  });

  // ===========================================================================
  // checkComponentsDomainGrouping
  // ===========================================================================

  describe("checkComponentsDomainGrouping", () => {
    /**
     * @testdoc checkComponentsDomainGrouping: config.enabled=false の場合は空配列を返す
     */
    it("should return empty array when disabled", () => {
      const results = checkComponentsDomainGrouping("/project", {
        enabled: false,
        severity: "warning",
      });
      expect(results).toEqual([]);
    });

    /**
     * @testdoc components/ が存在しない場合は空配列を返す
     */
    it("should return empty array when components/ does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      const results = checkComponentsDomainGrouping("/project", {
        enabled: true,
        severity: "warning",
      });
      expect(results).toEqual([]);
    });

    /**
     * @testdoc フラットな .tsx ファイルがない場合は pass
     */
    it("should return pass when no flat .tsx files exist", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["Post", "Category"]);
      mockStatSync.mockReturnValue(mockDir());

      const results = checkComponentsDomainGrouping("/project", {
        enabled: true,
        severity: "warning",
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("pass");
    });

    /**
     * @testdoc フラットな .tsx ファイルがある場合は violation
     */
    it("should return violation for flat .tsx files", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["Button.tsx", "Card.tsx", "Post"]);
      mockStatSync.mockImplementation((p: any) => {
        if (String(p).endsWith("Post")) return mockDir();
        return mockFile();
      });

      const results = checkComponentsDomainGrouping("/project", {
        enabled: true,
        severity: "warning",
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("warning");
      expect(results[0].found).toContain("components/Button.tsx");
      expect(results[0].found).toContain("components/Card.tsx");
    });

    /**
     * @testdoc index.tsx はスキップされる
     */
    it("should skip index.tsx files", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["index.tsx"]);
      mockStatSync.mockReturnValue(mockFile());

      const results = checkComponentsDomainGrouping("/project", {
        enabled: true,
        severity: "warning",
      });
      expect(results[0].status).toBe("pass");
    });

    /**
     * @testdoc .tsx 以外のファイルは無視される
     */
    it("should ignore non-.tsx files", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["utils.ts", "types.ts"]);
      mockStatSync.mockReturnValue(mockFile());

      const results = checkComponentsDomainGrouping("/project", {
        enabled: true,
        severity: "warning",
      });
      expect(results[0].status).toBe("pass");
    });
  });

  // ===========================================================================
  // checkLibStructureCompliance
  // ===========================================================================

  describe("checkLibStructureCompliance", () => {
    /**
     * @testdoc checkLibStructureCompliance: config.enabled=false の場合は空配列を返す
     */
    it("should return empty array when disabled", () => {
      const results = checkLibStructureCompliance("/project", {
        enabled: false,
        severity: "error",
      });
      expect(results).toEqual([]);
    });

    /**
     * @testdoc checkLibStructureCompliance: lib/ が存在しない場合は空配列を返す
     */
    it("should return empty array when lib/ does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      const results = checkLibStructureCompliance("/project", {
        enabled: true,
        severity: "error",
      });
      expect(results).toEqual([]);
    });

    /**
     * @testdoc 許可されたディレクトリのみの場合は pass
     */
    it("should return pass when only allowed directories exist", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["actions", "utils"]);
      mockStatSync.mockReturnValue(mockDir());

      const results = checkLibStructureCompliance("/project", {
        enabled: true,
        severity: "error",
        allowedDirs: ["actions", "utils"],
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("pass");
    });

    /**
     * @testdoc 許可されていないディレクトリがある場合は violation
     */
    it("should return violation for disallowed directories", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["actions", "random"]);
      mockStatSync.mockReturnValue(mockDir());

      const results = checkLibStructureCompliance("/project", {
        enabled: true,
        severity: "error",
        allowedDirs: ["actions", "utils"],
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("error");
      expect(results[0].violations).toHaveLength(1);
      expect(results[0].violations![0].path).toBe("lib/random/");
    });

    /**
     * @testdoc context/ と contexts/ の混在を検出する
     */
    it("should detect context/ and contexts/ mixing", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["context", "contexts"]);
      mockStatSync.mockReturnValue(mockDir());

      const results = checkLibStructureCompliance("/project", {
        enabled: true,
        severity: "error",
        allowedDirs: ["context", "contexts"],
        disallowContextMixing: true,
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("error");
      expect(results[0].violations!.some((v: any) => v.actual === "両方存在")).toBe(
        true
      );
    });

    /**
     * @testdoc disallowContextMixing が false の場合は混在を許可する
     */
    it("should allow mixing when disallowContextMixing is false", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(["context", "contexts"]);
      mockStatSync.mockReturnValue(mockDir());

      const results = checkLibStructureCompliance("/project", {
        enabled: true,
        severity: "error",
        allowedDirs: ["context", "contexts"],
        disallowContextMixing: false,
      });
      expect(results[0].status).toBe("pass");
    });
  });

  // ===========================================================================
  // checkNamingConvention
  // ===========================================================================

  describe("checkNamingConvention", () => {
    /**
     * @testdoc checkNamingConvention: config.enabled=false の場合は空配列を返す
     */
    it("should return empty array when disabled", () => {
      const results = checkNamingConvention("/project", {
        enabled: false,
        severity: "warning",
      });
      expect(results).toEqual([]);
    });

    /**
     * @testdoc PascalCase のドメインディレクトリは pass
     */
    it("should pass for PascalCase domain directories", () => {
      setupExists({ components: true });
      mockReaddirSync.mockReturnValue(["Post", "Category"]);
      mockStatSync.mockReturnValue(mockDir());
      mockGlobSync.mockReturnValue([]);

      const results = checkNamingConvention("/project", {
        enabled: true,
        severity: "warning",
        rules: { domainDirs: "PascalCase" },
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("pass");
    });

    /**
     * @testdoc 非 PascalCase のドメインディレクトリは violation
     */
    it("should return violation for non-PascalCase domain directories", () => {
      setupExists({ components: true });
      mockReaddirSync.mockReturnValue(["post", "category"]);
      mockStatSync.mockReturnValue(mockDir());
      mockGlobSync.mockReturnValue([]);

      const results = checkNamingConvention("/project", {
        enabled: true,
        severity: "warning",
        rules: { domainDirs: "PascalCase" },
      });
      expect(results[0].status).toBe("warning");
      expect(results[0].violations).toHaveLength(2);
    });

    /**
     * @testdoc ui, layout, common, __tests__ はスキップされる
     */
    it("should skip system directories", () => {
      setupExists({ components: true });
      mockReaddirSync.mockReturnValue(["ui", "layout", "common", "__tests__"]);
      mockStatSync.mockReturnValue(mockDir());
      mockGlobSync.mockReturnValue([]);

      const results = checkNamingConvention("/project", {
        enabled: true,
        severity: "warning",
        rules: { domainDirs: "PascalCase" },
      });
      expect(results[0].status).toBe("pass");
    });

    /**
     * @testdoc kebab-case ルールで検証できる
     */
    it("should validate kebab-case domain directories", () => {
      setupExists({ components: true });
      mockReaddirSync.mockReturnValue(["my-component"]);
      mockStatSync.mockReturnValue(mockDir());
      mockGlobSync.mockReturnValue([]);

      const results = checkNamingConvention("/project", {
        enabled: true,
        severity: "warning",
        rules: { domainDirs: "kebab-case" },
      });
      expect(results[0].status).toBe("pass");
    });

    /**
     * @testdoc camelCase ルールで検証できる
     */
    it("should validate camelCase domain directories", () => {
      setupExists({ components: true });
      mockReaddirSync.mockReturnValue(["myComponent"]);
      mockStatSync.mockReturnValue(mockDir());
      mockGlobSync.mockReturnValue([]);

      const results = checkNamingConvention("/project", {
        enabled: true,
        severity: "warning",
        rules: { domainDirs: "camelCase" },
      });
      expect(results[0].status).toBe("pass");
    });
  });

  // ===========================================================================
  // checkNoCrossAppImport
  // ===========================================================================

  describe("checkNoCrossAppImport", () => {
    /**
     * @testdoc checkNoCrossAppImport: config.enabled=false の場合は空配列を返す
     */
    it("should return empty array when disabled", () => {
      const results = checkNoCrossAppImport("/project", "web", {
        enabled: false,
        severity: "error",
      });
      expect(results).toEqual([]);
    });

    /**
     * @testdoc アプリディレクトリが存在しない場合は空配列を返す
     */
    it("should return empty array when app directory does not exist", () => {
      mockExistsSync.mockReturnValue(false);
      const results = checkNoCrossAppImport("/project", "web", {
        enabled: true,
        severity: "error",
      });
      expect(results).toEqual([]);
    });

    /**
     * @testdoc クロスアプリインポートがない場合は pass
     */
    it("should return pass when no cross-app imports exist", () => {
      mockExistsSync.mockReturnValue(true);
      mockGlobSync
        .mockReturnValueOnce(["page.ts"]) // **/*.ts
        .mockReturnValueOnce([]); // **/*.tsx
      mockReaddirSync.mockReturnValue(["admin"]);
      mockStatSync.mockReturnValue(mockDir());
      mockReadFileSync.mockReturnValue('import { foo } from "@/lib/utils"');

      const results = checkNoCrossAppImport("/project", "web", {
        enabled: true,
        severity: "error",
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("pass");
    });

    /**
     * @testdoc @otherApp からのインポートを検出する
     */
    it("should detect @otherApp imports", () => {
      mockExistsSync.mockReturnValue(true);
      mockGlobSync
        .mockReturnValueOnce(["page.ts"]) // **/*.ts
        .mockReturnValueOnce([]); // **/*.tsx
      mockReaddirSync.mockReturnValue(["admin"]);
      mockStatSync.mockReturnValue(mockDir());
      mockReadFileSync.mockReturnValue('import { foo } from "@admin/utils"');

      const results = checkNoCrossAppImport("/project", "web", {
        enabled: true,
        severity: "error",
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("error");
      expect(results[0].violations).toHaveLength(1);
    });

    /**
     * @testdoc apps/ 相対パスからのインポートを検出する
     */
    it("should detect relative apps/ imports", () => {
      mockExistsSync.mockReturnValue(true);
      mockGlobSync
        .mockReturnValueOnce(["page.ts"]) // **/*.ts
        .mockReturnValueOnce([]); // **/*.tsx
      mockReaddirSync.mockReturnValue(["admin"]);
      mockStatSync.mockReturnValue(mockDir());
      mockReadFileSync.mockReturnValue(
        'import { foo } from "../../../apps/admin/utils"'
      );

      const results = checkNoCrossAppImport("/project", "web", {
        enabled: true,
        severity: "error",
      });
      expect(results[0].status).toBe("error");
    });
  });

  // ===========================================================================
  // checkBarrelExportRequired
  // ===========================================================================

  describe("checkBarrelExportRequired", () => {
    /**
     * @testdoc checkBarrelExportRequired: config.enabled=false の場合は空配列を返す
     */
    it("should return empty array when disabled", () => {
      const results = checkBarrelExportRequired("/project", {
        enabled: false,
        severity: "warning",
      });
      expect(results).toEqual([]);
    });

    /**
     * @testdoc index.ts がある場合は pass
     */
    it("should return pass when directories have index.ts", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync
        .mockReturnValueOnce(["Post"]) // components/
        .mockReturnValueOnce(["index.ts", "Post.tsx", "PostCard.tsx"]); // components/Post/
      mockStatSync.mockReturnValue(mockDir());

      const results = checkBarrelExportRequired("/project", {
        enabled: true,
        severity: "warning",
        targetDirs: ["components"],
        excludeDirs: ["ui"],
        minFiles: 2,
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("pass");
    });

    /**
     * @testdoc minFiles 未満のディレクトリはスキップされる
     */
    it("should skip directories with fewer than minFiles", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync
        .mockReturnValueOnce(["Post"]) // components/
        .mockReturnValueOnce(["Post.tsx"]); // components/Post/ — 1ファイルのみ
      mockStatSync.mockReturnValue(mockDir());

      const results = checkBarrelExportRequired("/project", {
        enabled: true,
        severity: "warning",
        targetDirs: ["components"],
        excludeDirs: [],
        minFiles: 2,
      });
      expect(results[0].status).toBe("pass");
    });

    /**
     * @testdoc index.ts がなく minFiles 以上の場合は violation
     */
    it("should return violation when index.ts is missing and files >= minFiles", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync
        .mockReturnValueOnce(["Post"]) // components/
        .mockReturnValueOnce(["Post.tsx", "PostCard.tsx"]); // components/Post/
      mockStatSync.mockReturnValue(mockDir());

      const results = checkBarrelExportRequired("/project", {
        enabled: true,
        severity: "warning",
        targetDirs: ["components"],
        excludeDirs: [],
        minFiles: 2,
      });
      expect(results[0].status).toBe("warning");
      expect(results[0].found).toContain("components/Post/");
    });

    /**
     * @testdoc 除外ディレクトリはスキップされる
     */
    it("should skip excluded directories", () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValueOnce(["ui"]); // components/
      mockStatSync.mockReturnValue(mockDir());

      const results = checkBarrelExportRequired("/project", {
        enabled: true,
        severity: "warning",
        targetDirs: ["components"],
        excludeDirs: ["ui"],
        minFiles: 2,
      });
      expect(results[0].status).toBe("pass");
    });
  });

  // ===========================================================================
  // checkActionsSeparation
  // ===========================================================================

  describe("checkActionsSeparation", () => {
    /**
     * @testdoc checkActionsSeparation: config.enabled=false の場合は空配列を返す
     */
    it("should return empty array when disabled", () => {
      const results = checkActionsSeparation("/project", {
        enabled: false,
        severity: "error",
      });
      expect(results).toEqual([]);
    });

    /**
     * @testdoc crud/ と domain/ の両方がない場合は pass
     */
    it("should return pass when crud/ or domain/ does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const results = checkActionsSeparation("/project", {
        enabled: true,
        severity: "error",
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("pass");
    });

    /**
     * @testdoc crud/ から domain/ へのインポートがない場合は pass
     */
    it("should return pass when crud/ does not import from domain/", () => {
      mockExistsSync.mockReturnValue(true);
      mockGlobSync.mockReturnValue(["create.ts"]);
      mockReadFileSync.mockReturnValue(
        'import { db } from "@/lib/db";\nexport async function createPost() {}'
      );

      const results = checkActionsSeparation("/project", {
        enabled: true,
        severity: "error",
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("pass");
    });

    /**
     * @testdoc crud/ から domain/ への相対インポートを検出する
     */
    it("should detect relative domain/ imports from crud/", () => {
      mockExistsSync.mockReturnValue(true);
      mockGlobSync.mockReturnValue(["create.ts"]);
      mockReadFileSync.mockReturnValue(
        'import { validate } from "../domain/validate"'
      );

      const results = checkActionsSeparation("/project", {
        enabled: true,
        severity: "error",
      });
      expect(results).toHaveLength(1);
      expect(results[0].status).toBe("error");
      expect(results[0].violations).toHaveLength(1);
    });

    /**
     * @testdoc crud/ から domain/ への @/ パスインポートを検出する
     */
    it("should detect @/ path domain/ imports from crud/", () => {
      mockExistsSync.mockReturnValue(true);
      mockGlobSync.mockReturnValue(["create.ts"]);
      mockReadFileSync.mockReturnValue(
        'import { validate } from "@/lib/actions/domain/validate"'
      );

      const results = checkActionsSeparation("/project", {
        enabled: true,
        severity: "error",
      });
      expect(results[0].status).toBe("error");
    });
  });
});
