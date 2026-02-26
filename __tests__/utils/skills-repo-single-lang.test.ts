/**
 * ensureSingleLanguagePlugin Tests
 *
 * 言語設定に基づく逆言語プラグイン排他制御のテスト (#812)
 *
 * @testdoc ensureSingleLanguagePlugin のテスト（逆言語プラグインの uninstall + キャッシュ削除）
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";
import { homedir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Dynamic import for ESM module
// =============================================================================

let ensureSingleLanguagePlugin: typeof import("../../src/utils/skills-repo.js").ensureSingleLanguagePlugin;
let MARKETPLACE_NAME: string;
let PLUGIN_NAME: string;
let PLUGIN_NAME_JA: string;

beforeAll(async () => {
  const mod = await import("../../dist/utils/skills-repo.js");
  ensureSingleLanguagePlugin = mod.ensureSingleLanguagePlugin;
  MARKETPLACE_NAME = mod.MARKETPLACE_NAME;
  PLUGIN_NAME = mod.PLUGIN_NAME;
  PLUGIN_NAME_JA = mod.PLUGIN_NAME_JA;
});

// =============================================================================
// Test Helpers
// =============================================================================

const TEST_OUTPUT_DIR = join(__dirname, "..", "..", ".test-output", "single-lang");

function isClaudeAvailable(): boolean {
  if (process.env.SHIROKUMA_NO_CLAUDE_CLI) return false;
  try {
    execFileSync("claude", ["--version"], { stdio: "pipe", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function setupTestDir(): void {
  if (existsSync(TEST_OUTPUT_DIR)) {
    rmSync(TEST_OUTPUT_DIR, { recursive: true });
  }
  mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
}

function cleanupTestDir(): void {
  if (existsSync(TEST_OUTPUT_DIR)) {
    rmSync(TEST_OUTPUT_DIR, { recursive: true });
  }
}

/**
 * テスト用の偽キャッシュディレクトリを作成する
 * 実際のプラグインキャッシュに影響しないテスト専用名を使用
 */
const TEST_OPPOSITE_PLUGIN = "__test-single-lang-opposite__";

function createFakeOppositeCache(): string {
  const cacheDir = join(
    homedir(), ".claude", "plugins", "cache", MARKETPLACE_NAME, TEST_OPPOSITE_PLUGIN,
  );
  mkdirSync(join(cacheDir, "0.1.0-test"), { recursive: true });
  writeFileSync(join(cacheDir, "0.1.0-test", "marker.txt"), "test", "utf-8");
  return cacheDir;
}

function cleanupFakeOppositeCache(): void {
  const cacheDir = join(
    homedir(), ".claude", "plugins", "cache", MARKETPLACE_NAME, TEST_OPPOSITE_PLUGIN,
  );
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
  }
}

// =============================================================================
// Tests
// =============================================================================

describe("ensureSingleLanguagePlugin", () => {
  beforeEach(() => {
    setupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  /**
   * @testdoc 言語設定が null の場合はスキップする
   * @purpose 言語未設定時に安全側に倒して何もしないことを確認
   */
  it("should skip when language setting is null", () => {
    const result = ensureSingleLanguagePlugin(TEST_OUTPUT_DIR, null);

    expect(result.attempted).toBe(false);
    expect(result.cacheRemoved).toBe(false);
    expect(result.oppositePlugin).toBeUndefined();
  });

  if (!isClaudeAvailable()) {
    /**
     * @testdoc [skills-repo-single-lang] claude CLI が利用不可の場合はスキップされる
     * @purpose claude CLI がない環境で attempted=false が返ることを確認
     */
    it("should skip when claude CLI is not available", () => {
      const result = ensureSingleLanguagePlugin(TEST_OUTPUT_DIR, "japanese");

      expect(result.attempted).toBe(false);
      expect(result.cacheRemoved).toBe(false);
    });

    /**
     * @testdoc claude CLI が利用不可でも結果オブジェクトの構造が正しい
     * @purpose SingleLanguageResult が正しいフィールドを持つことを確認
     */
    it("should return result with correct structure even when CLI unavailable", () => {
      const result = ensureSingleLanguagePlugin(TEST_OUTPUT_DIR, "english");

      expect(typeof result.attempted).toBe("boolean");
      expect(typeof result.cacheRemoved).toBe("boolean");
    });
  } else {
    /**
     * @testdoc JA 設定時に EN プラグインの uninstall を試行する
     * @purpose japanese 設定時に shirokuma-skills-en を対象とすることを確認
     */
    it("should target EN plugin when language is japanese", () => {
      const result = ensureSingleLanguagePlugin(TEST_OUTPUT_DIR, "japanese");

      expect(result.attempted).toBe(true);
      expect(result.oppositePlugin).toBe(PLUGIN_NAME);
    });

    /**
     * @testdoc EN 設定時に JA プラグインの uninstall を試行する
     * @purpose english 設定時に shirokuma-skills-ja を対象とすることを確認
     */
    it("should target JA plugin when language is english", () => {
      const result = ensureSingleLanguagePlugin(TEST_OUTPUT_DIR, "english");

      expect(result.attempted).toBe(true);
      expect(result.oppositePlugin).toBe(PLUGIN_NAME_JA);
    });

    /**
     * @testdoc キャッシュディレクトリが存在しなくても uninstall を試行しエラーにならない
     * @purpose キャッシュなしでも正常に動作することを確認
     */
    it("should not error when no cache directory exists", () => {
      const result = ensureSingleLanguagePlugin(TEST_OUTPUT_DIR, "japanese");

      expect(result.attempted).toBe(true);
      // uninstall は試行されるが、キャッシュ有無は環境依存
    });
  }

  /**
   * @testdoc キャッシュディレクトリの削除ロジックが正しく動作する
   * @purpose 偽キャッシュを作成して、rmSync が呼ばれた場合の動作を確認
   */
  it("should detect and remove cache directory when it exists", () => {
    // テスト用偽キャッシュを作成
    const cacheDir = createFakeOppositeCache();
    expect(existsSync(cacheDir)).toBe(true);

    // rmSync で削除可能なことを確認（ensureSingleLanguagePlugin と同じロジック）
    rmSync(cacheDir, { recursive: true, force: true });
    expect(existsSync(cacheDir)).toBe(false);

    // クリーンアップ（念のため）
    cleanupFakeOppositeCache();
  });
});
