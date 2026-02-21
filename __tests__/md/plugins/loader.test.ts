/**
 * loader plugin tests
 *
 * プラグイン動的ロード・解決のテスト（ESM モック使用）
 *
 * @testdoc pluginLoader: プラグインローダーの動的読み込みを検証する
 */

import { jest } from "@jest/globals";
import type { Config } from "../../../src/md/types/config.js";

describe("loadPlugins", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * @testdoc pluginLoader: プラグインが空の場合は空の結果を返す
   */
  it("should return empty results when no plugins configured", async () => {
    const { loadPlugins } = await import(
      "../../../src/md/plugins/loader.js"
    );

    const config = { plugins: [] } as unknown as Config;
    const result = await loadPlugins(config);

    expect(result.validators).toEqual([]);
    expect(result.linters).toEqual([]);
    expect(result.analyzers).toEqual([]);
  });

  /**
   * @testdoc pluginLoader: plugins が undefined の場合は空の結果を返す
   */
  it("should return empty results when plugins is undefined", async () => {
    const { loadPlugins } = await import(
      "../../../src/md/plugins/loader.js"
    );

    const config = {} as unknown as Config;
    const result = await loadPlugins(config);

    expect(result.validators).toEqual([]);
    expect(result.linters).toEqual([]);
    expect(result.analyzers).toEqual([]);
  });

  /**
   * @testdoc pluginLoader: 無効化されたプラグインをスキップする
   */
  it("should skip disabled plugins", async () => {
    const { loadPlugins } = await import(
      "../../../src/md/plugins/loader.js"
    );

    const config = {
      plugins: [{ module: "./non-existent.js", enabled: false }],
    } as unknown as Config;
    const result = await loadPlugins(config);

    expect(result.validators).toEqual([]);
  });

  /**
   * @testdoc pluginLoader: 不正なパスを拒否する
   */
  it("should reject absolute paths that are not npm packages", async () => {
    const { loadPlugins } = await import(
      "../../../src/md/plugins/loader.js"
    );

    const config = {
      plugins: [{ module: "/etc/passwd" }],
    } as unknown as Config;

    await expect(loadPlugins(config)).rejects.toThrow("not allowed");
  });

  /**
   * @testdoc pluginLoader: 存在しないモジュールでエラーをスローする
   */
  it("should throw error for non-existent module", async () => {
    const { loadPlugins } = await import(
      "../../../src/md/plugins/loader.js"
    );

    const config = {
      plugins: [{ module: "./non-existent-plugin-xyz.js" }],
    } as unknown as Config;

    await expect(loadPlugins(config)).rejects.toThrow("Failed to load plugin");
  });

  /**
   * @testdoc pluginLoader: validators 指定のある存在しない npm パッケージでエラーをスローする
   */
  it("should throw for non-existent npm package with validators", async () => {
    const { loadPlugins } = await import(
      "../../../src/md/plugins/loader.js"
    );

    const config = {
      plugins: [
        {
          module: "non-existent-test-package",
          validators: ["BadValidator"],
        },
      ],
    } as unknown as Config;

    await expect(loadPlugins(config)).rejects.toThrow("Failed to load plugin");
  });
});
