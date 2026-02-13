/**
 * Schema Command - Multi-Database Support Tests
 *
 * Tests for schema configuration with path-based DB name extraction.
 *
 * @module __tests__/commands/schema-multi-db
 */

import type { ShirokumaConfig, SchemaSourceConfig } from "../../src/utils/config.js";
import {
  normalizeSchemaConfigs,
  getDbNameFromPath,
  type NormalizedSchemaConfig,
} from "../../src/commands/schema.js";

describe("Schema Command - Multi-Database Support", () => {
  describe("getDbNameFromPath", () => {
    /**
     * @testdoc packages/database/src/schema から "database" を取得できる
     * @purpose パスからDB名を自動抽出する
     * @expected "database"
     */
    it("should extract 'database' from packages/database/src/schema", () => {
      expect(getDbNameFromPath("packages/database/src/schema")).toBe("database");
    });

    /**
     * @testdoc packages/analytics-db/src/schema から "analytics-db" を取得できる
     * @purpose ハイフン付きのDB名も正しく抽出する
     * @expected "analytics-db"
     */
    it("should extract 'analytics-db' from packages/analytics-db/src/schema", () => {
      expect(getDbNameFromPath("packages/analytics-db/src/schema")).toBe("analytics-db");
    });

    /**
     * @testdoc ./packages/database/src/schema から "database" を取得できる
     * @purpose 先頭の ./ を正しく処理する
     * @expected "database"
     */
    it("should handle leading ./ in path", () => {
      expect(getDbNameFromPath("./packages/database/src/schema")).toBe("database");
    });

    /**
     * @testdoc src/schema から "default" を取得できる
     * @purpose packages がない場合のフォールバック
     * @expected "default"
     */
    it("should fallback to 'default' when no meaningful name found", () => {
      expect(getDbNameFromPath("src/schema")).toBe("default");
    });

    /**
     * @testdoc ./my-db/schema から "my-db" を取得できる
     * @purpose packages 以外のディレクトリ構造でも動作する
     * @expected "my-db"
     */
    it("should extract first meaningful directory when packages not present", () => {
      expect(getDbNameFromPath("./my-db/schema")).toBe("my-db");
    });
  });

  describe("normalizeSchemaConfigs", () => {
    /**
     * @testdoc sources から正規化された設定を生成できる
     * @purpose 新設計に基づく設定の正規化
     * @expected 正しいname, source, outputを持つ設定が返される
     */
    it("should normalize sources with auto-extracted DB names", () => {
      const config: ShirokumaConfig = {
        project: { name: "test" },
        output: { dir: "./docs" },
        schema: {
          sources: [
            { path: "./packages/database/src/schema" },
            { path: "./packages/analytics-db/src/schema", description: "Analytics DB" },
          ],
        },
      };

      const result = normalizeSchemaConfigs(config, "/project");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("database");
      expect(result[0].source).toContain("packages/database/src/schema");
      expect(result[0].output).toContain("schema/database");
      expect(result[0].description).toBeUndefined();

      expect(result[1].name).toBe("analytics-db");
      expect(result[1].description).toBe("Analytics DB");
      expect(result[1].output).toContain("schema/analytics-db");
    });

    /**
     * @testdoc sources が空配列の場合は空配列を返す
     * @purpose 空設定時の挙動確認
     * @expected 空配列が返される
     */
    it("should return empty array when sources is empty", () => {
      const config: ShirokumaConfig = {
        project: { name: "test" },
        output: { dir: "./docs" },
        schema: {
          sources: [],
        },
      };

      const result = normalizeSchemaConfigs(config, "/project");
      expect(result).toHaveLength(0);
    });

    /**
     * @testdoc schema 設定がない場合は空配列を返す
     * @purpose 未設定時の挙動確認
     * @expected 空配列が返される
     */
    it("should return empty array when schema is not configured", () => {
      const config: ShirokumaConfig = {
        project: { name: "test" },
        output: { dir: "./docs" },
      };

      const result = normalizeSchemaConfigs(config, "/project");
      expect(result).toHaveLength(0);
    });

    /**
     * @testdoc pattern 設定が正しく適用される
     * @purpose カスタムパターンの確認
     * @expected カスタムパターンが設定される
     */
    it("should apply custom pattern from config", () => {
      const config: ShirokumaConfig = {
        project: { name: "test" },
        output: { dir: "./docs" },
        schema: {
          sources: [{ path: "./packages/database/src/schema" }],
          pattern: "*.schema.ts",
        },
      };

      const result = normalizeSchemaConfigs(config, "/project");

      expect(result[0].pattern).toBe("*.schema.ts");
    });

    /**
     * @testdoc デフォルトパターンが適用される
     * @purpose パターン未指定時のデフォルト
     * @expected "*.ts" が設定される
     */
    it("should use default pattern when not specified", () => {
      const config: ShirokumaConfig = {
        project: { name: "test" },
        output: { dir: "./docs" },
        schema: {
          sources: [{ path: "./packages/database/src/schema" }],
        },
      };

      const result = normalizeSchemaConfigs(config, "/project");

      expect(result[0].pattern).toBe("*.ts");
    });
  });

  describe("SchemaSourceConfig interface", () => {
    /**
     * @testdoc SchemaSourceConfig は path のみで動作する
     * @purpose 最小構成の確認
     * @expected path のみで有効な設定となる
     */
    it("should allow minimal config with path only", () => {
      const config: SchemaSourceConfig = {
        path: "./packages/database/src/schema",
      };

      expect(config.path).toBeDefined();
      expect(config.description).toBeUndefined();
    });

    /**
     * @testdoc SchemaSourceConfig の description はオプション
     * @purpose オプションフィールドの確認
     * @expected description を含む設定も有効
     */
    it("should allow config with optional description", () => {
      const config: SchemaSourceConfig = {
        path: "./packages/analytics-db/src/schema",
        description: "Analytics database for metrics",
      };

      expect(config.path).toBeDefined();
      expect(config.description).toBe("Analytics database for metrics");
    });
  });

  describe("NormalizedSchemaConfig interface", () => {
    /**
     * @testdoc NormalizedSchemaConfig の構造が正しい
     * @purpose 型定義の確認
     * @expected 必須フィールドが存在する
     */
    it("should have correct NormalizedSchemaConfig structure", () => {
      const config: NormalizedSchemaConfig = {
        name: "database",
        description: "Main DB",
        source: "/project/packages/database/src/schema",
        output: "/project/docs/generated/schema/database",
        pattern: "*.ts",
      };

      expect(config.name).toBe("database");
      expect(config.description).toBe("Main DB");
      expect(config.source).toBeDefined();
      expect(config.output).toBeDefined();
      expect(config.pattern).toBe("*.ts");
    });
  });
});
