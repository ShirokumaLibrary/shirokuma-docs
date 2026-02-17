/**
 * Cache Cleanup & Semver Tests
 *
 * compareSemver() と cleanupOldCacheVersions() のユニットテスト
 *
 * @testdoc キャッシュクリーンアップと semver ソートのテスト (#679)
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Dynamic import for ESM module
// =============================================================================

let compareSemver: typeof import("../../src/utils/skills-repo.js").compareSemver;
let cleanupOldCacheVersions: typeof import("../../src/utils/skills-repo.js").cleanupOldCacheVersions;
let getGlobalCachePath: typeof import("../../src/utils/skills-repo.js").getGlobalCachePath;
let MARKETPLACE_NAME: string;

beforeAll(async () => {
  const mod = await import("../../dist/utils/skills-repo.js");
  compareSemver = mod.compareSemver;
  cleanupOldCacheVersions = mod.cleanupOldCacheVersions;
  getGlobalCachePath = mod.getGlobalCachePath;
  MARKETPLACE_NAME = mod.MARKETPLACE_NAME;
});

// =============================================================================
// compareSemver Tests
// =============================================================================

describe("compareSemver", () => {
  /**
   * @testdoc 同じバージョン同士は 0 を返す
   */
  it("should return 0 for identical versions", () => {
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
    expect(compareSemver("0.1.0-alpha.22", "0.1.0-alpha.22")).toBe(0);
  });

  /**
   * @testdoc major バージョンで正しく比較する
   */
  it("should compare major versions", () => {
    expect(compareSemver("2.0.0", "1.0.0")).toBeGreaterThan(0);
    expect(compareSemver("1.0.0", "2.0.0")).toBeLessThan(0);
  });

  /**
   * @testdoc minor バージョンで正しく比較する
   */
  it("should compare minor versions", () => {
    expect(compareSemver("0.2.0", "0.1.0")).toBeGreaterThan(0);
    expect(compareSemver("0.1.0", "0.2.0")).toBeLessThan(0);
  });

  /**
   * @testdoc patch バージョンで正しく比較する
   */
  it("should compare patch versions", () => {
    expect(compareSemver("0.1.1", "0.1.0")).toBeGreaterThan(0);
    expect(compareSemver("0.1.0", "0.1.1")).toBeLessThan(0);
  });

  /**
   * @testdoc リリース版はプレリリース版より大きい
   */
  it("should rank release higher than prerelease", () => {
    expect(compareSemver("0.1.0", "0.1.0-alpha.1")).toBeGreaterThan(0);
    expect(compareSemver("0.1.0-alpha.1", "0.1.0")).toBeLessThan(0);
  });

  /**
   * @testdoc プレリリースの数値セグメントで正しく比較する
   */
  it("should compare prerelease numeric segments", () => {
    expect(compareSemver("0.1.0-alpha.22", "0.1.0-alpha.3")).toBeGreaterThan(0);
    expect(compareSemver("0.1.0-alpha.3", "0.1.0-alpha.22")).toBeLessThan(0);
  });

  /**
   * @testdoc プレリリースの文字列セグメントで正しく比較する
   */
  it("should compare prerelease string segments", () => {
    expect(compareSemver("0.1.0-beta.1", "0.1.0-alpha.1")).toBeGreaterThan(0);
    expect(compareSemver("0.1.0-alpha.1", "0.1.0-beta.1")).toBeLessThan(0);
  });

  /**
   * @testdoc 旧体系（0.7.7）と新体系（0.1.0-alpha.22）を正しく比較する
   * これが辞書順ソートバグの再現ケース
   */
  it("should correctly compare old scheme (0.7.7) vs new scheme (0.1.0-alpha.22)", () => {
    // 0.7.7 > 0.1.0-alpha.22（minor が大きい）
    expect(compareSemver("0.7.7", "0.1.0-alpha.22")).toBeGreaterThan(0);
    expect(compareSemver("0.1.0-alpha.22", "0.7.7")).toBeLessThan(0);
  });

  /**
   * @testdoc バージョン配列を正しくソートする
   */
  it("should sort version arrays correctly", () => {
    const versions = [
      "0.1.0-alpha.3",
      "0.7.7",
      "0.1.0-alpha.22",
      "0.1.0-alpha.13",
      "0.1.0",
      "0.1.0-beta.1",
    ];

    const sorted = [...versions].sort((a, b) => compareSemver(b, a));
    expect(sorted).toEqual([
      "0.7.7",
      "0.1.0",
      "0.1.0-beta.1",
      "0.1.0-alpha.22",
      "0.1.0-alpha.13",
      "0.1.0-alpha.3",
    ]);
  });
});

// =============================================================================
// cleanupOldCacheVersions Tests
// =============================================================================

describe("cleanupOldCacheVersions", () => {
  const TEST_PLUGIN_NAME = "__test-cleanup-plugin__";
  const cacheBase = join(
    homedir(), ".claude", "plugins", "cache", "shirokuma-library", TEST_PLUGIN_NAME,
  );

  function createFakeVersionDirs(versions: string[]): void {
    for (const ver of versions) {
      const dir = join(cacheBase, ver);
      mkdirSync(dir, { recursive: true });
      // plugin.json を置いてディレクトリとして認識させる
      writeFileSync(join(dir, "marker.txt"), ver, "utf-8");
    }
  }

  beforeEach(() => {
    if (existsSync(cacheBase)) {
      rmSync(cacheBase, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(cacheBase)) {
      rmSync(cacheBase, { recursive: true, force: true });
    }
  });

  /**
   * @testdoc 存在しないプラグインに対して空配列を返す
   */
  it("should return empty array for non-existent plugin", () => {
    const removed = cleanupOldCacheVersions("__non_existent_plugin__");
    expect(removed).toEqual([]);
  });

  /**
   * @testdoc keepCount 以下ならクリーンアップしない
   */
  it("should not remove anything when versions <= keepCount", () => {
    createFakeVersionDirs(["0.1.0-alpha.20", "0.1.0-alpha.21", "0.1.0-alpha.22"]);

    const removed = cleanupOldCacheVersions(TEST_PLUGIN_NAME, 3);
    expect(removed).toEqual([]);
    // 全バージョンが残っている
    expect(existsSync(join(cacheBase, "0.1.0-alpha.20"))).toBe(true);
    expect(existsSync(join(cacheBase, "0.1.0-alpha.21"))).toBe(true);
    expect(existsSync(join(cacheBase, "0.1.0-alpha.22"))).toBe(true);
  });

  /**
   * @testdoc 古いバージョンを削除し最新 keepCount 個を保持する
   */
  it("should remove old versions and keep newest keepCount", () => {
    createFakeVersionDirs([
      "0.1.0-alpha.3",
      "0.1.0-alpha.13",
      "0.1.0-alpha.20",
      "0.1.0-alpha.21",
      "0.1.0-alpha.22",
    ]);

    const removed = cleanupOldCacheVersions(TEST_PLUGIN_NAME, 3);
    expect(removed.sort()).toEqual(["0.1.0-alpha.13", "0.1.0-alpha.3"]);

    // 最新3つが残っている
    expect(existsSync(join(cacheBase, "0.1.0-alpha.22"))).toBe(true);
    expect(existsSync(join(cacheBase, "0.1.0-alpha.21"))).toBe(true);
    expect(existsSync(join(cacheBase, "0.1.0-alpha.20"))).toBe(true);

    // 古い2つが削除されている
    expect(existsSync(join(cacheBase, "0.1.0-alpha.3"))).toBe(false);
    expect(existsSync(join(cacheBase, "0.1.0-alpha.13"))).toBe(false);
  });

  /**
   * @testdoc 旧体系と新体系が混在する場合に semver で正しくソートして削除する
   */
  it("should handle mixed version schemes correctly", () => {
    createFakeVersionDirs([
      "0.7.7",
      "0.1.0-alpha.3",
      "0.1.0-alpha.22",
      "0.1.0",
    ]);

    const removed = cleanupOldCacheVersions(TEST_PLUGIN_NAME, 3);
    // 0.7.7 > 0.1.0 > 0.1.0-alpha.22 > 0.1.0-alpha.3
    // keepCount=3 なので 0.1.0-alpha.3 のみ削除
    expect(removed).toEqual(["0.1.0-alpha.3"]);

    expect(existsSync(join(cacheBase, "0.7.7"))).toBe(true);
    expect(existsSync(join(cacheBase, "0.1.0"))).toBe(true);
    expect(existsSync(join(cacheBase, "0.1.0-alpha.22"))).toBe(true);
    expect(existsSync(join(cacheBase, "0.1.0-alpha.3"))).toBe(false);
  });
});

// =============================================================================
// getGlobalCachePath semver sort Tests
// =============================================================================

describe("getGlobalCachePath semver sort", () => {
  const TEST_PLUGIN_NAME = "__test-cache-sort__";
  const cacheBase = join(
    homedir(), ".claude", "plugins", "cache", "shirokuma-library", TEST_PLUGIN_NAME,
  );

  function createFakeVersionDirs(versions: string[]): void {
    for (const ver of versions) {
      mkdirSync(join(cacheBase, ver), { recursive: true });
    }
  }

  beforeEach(() => {
    if (existsSync(cacheBase)) {
      rmSync(cacheBase, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (existsSync(cacheBase)) {
      rmSync(cacheBase, { recursive: true, force: true });
    }
  });

  /**
   * @testdoc 旧体系（0.7.7）と新体系が混在する場合に最新版を返す
   * 辞書順バグの回帰テスト: 0.7.7 が 0.1.0-alpha.22 より「最新」と判定される
   */
  it("should return the semantically latest version, not lexicographically", () => {
    createFakeVersionDirs(["0.1.0-alpha.22", "0.7.7", "0.1.0-alpha.3"]);

    const result = getGlobalCachePath(TEST_PLUGIN_NAME);
    expect(result).toBe(join(cacheBase, "0.7.7"));
  });

  /**
   * @testdoc alpha バージョン間で数値的に最新を返す
   */
  it("should return numerically latest alpha version", () => {
    createFakeVersionDirs(["0.1.0-alpha.3", "0.1.0-alpha.22", "0.1.0-alpha.13"]);

    const result = getGlobalCachePath(TEST_PLUGIN_NAME);
    expect(result).toBe(join(cacheBase, "0.1.0-alpha.22"));
  });
});
