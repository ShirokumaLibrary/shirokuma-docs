/**
 * Config Packages Tests
 *
 * Tests for the packages configuration support in shirokuma-docs.
 * Validates parsing and handling of packages configuration.
 *
 * @testdoc packages 設定のサポートをテスト
 */

import { defaultConfig, type ShirokumaConfig, type PackageConfig } from "../../src/utils/config.js";

describe("Config Packages Support", () => {
  describe("PackageConfig type", () => {
    /**
     * @testdoc PackageConfigの基本構造が正しい
     */
    it("should have correct PackageConfig structure", () => {
      const pkg: PackageConfig = {
        name: "database",
        path: "packages/database",
        prefix: "@repo/database",
      };

      expect(pkg.name).toBe("database");
      expect(pkg.path).toBe("packages/database");
      expect(pkg.prefix).toBe("@repo/database");
    });

    /**
     * @testdoc PackageConfigのオプションフィールドが機能する
     */
    it("should support optional fields in PackageConfig", () => {
      const pkg: PackageConfig = {
        name: "shared",
        path: "packages/shared",
        prefix: "@repo/shared",
        description: "Shared utilities and types",
        entryPoints: ["src/index.ts", "src/utils/index.ts"],
      };

      expect(pkg.description).toBe("Shared utilities and types");
      expect(pkg.entryPoints).toEqual(["src/index.ts", "src/utils/index.ts"]);
    });
  });

  describe("ShirokumaConfig packages section", () => {
    /**
     * @testdoc デフォルト設定にpackagesセクションが存在する
     */
    it("should have packages section in default config", () => {
      expect(defaultConfig.packages).toBeDefined();
      expect(Array.isArray(defaultConfig.packages)).toBe(true);
    });

    /**
     * @testdoc 複数のpackagesを設定できる
     */
    it("should support multiple packages in config", () => {
      const config: ShirokumaConfig = {
        ...defaultConfig,
        packages: [
          {
            name: "database",
            path: "packages/database",
            prefix: "@repo/database",
          },
          {
            name: "shared",
            path: "packages/shared",
            prefix: "@repo/shared",
          },
        ],
      };

      expect(config.packages).toHaveLength(2);
      expect(config.packages?.[0].name).toBe("database");
      expect(config.packages?.[1].name).toBe("shared");
    });

    /**
     * @testdoc packages設定が空配列でも有効
     */
    it("should allow empty packages array", () => {
      const config: ShirokumaConfig = {
        ...defaultConfig,
        packages: [],
      };

      expect(config.packages).toEqual([]);
    });
  });

  describe("packages config validation", () => {
    /**
     * @testdoc 必須フィールドが存在することを確認できる
     */
    it("should require name, path, and prefix fields", () => {
      const validPkg: PackageConfig = {
        name: "test",
        path: "packages/test",
        prefix: "@repo/test",
      };

      expect(validPkg.name).toBeDefined();
      expect(validPkg.path).toBeDefined();
      expect(validPkg.prefix).toBeDefined();
    });

    /**
     * @testdoc prefixは@から始まるスコープ付きパッケージ名を想定
     */
    it("should support scoped package names as prefix", () => {
      const pkg: PackageConfig = {
        name: "ui",
        path: "packages/ui",
        prefix: "@acme/ui",
      };

      expect(pkg.prefix).toMatch(/^@[\w-]+\/[\w-]+$/);
    });
  });
});
