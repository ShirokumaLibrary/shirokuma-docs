/**
 * registerPluginCache Tests
 *
 * Tests for the global cache registration utility.
 *
 * @testdoc registerPluginCache のテスト（グローバルキャッシュ登録ユーティリティ）
 */

import { existsSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Test Constants
// =============================================================================

const TEST_OUTPUT_DIR = join(__dirname, "..", "..", ".test-output", "cache");

// =============================================================================
// Dynamic import for ESM module
// =============================================================================

let registerPluginCache: typeof import("../../src/utils/skills-repo.js").registerPluginCache;
let isClaudeCliAvailable: typeof import("../../src/utils/skills-repo.js").isClaudeCliAvailable;

beforeAll(async () => {
  const mod = await import("../../dist/utils/skills-repo.js");
  registerPluginCache = mod.registerPluginCache;
  isClaudeCliAvailable = mod.isClaudeCliAvailable;
});

// =============================================================================
// Test Helpers
// =============================================================================

function isClaudeAvailable(): boolean {
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

// =============================================================================
// Tests
// =============================================================================

describe("isClaudeCliAvailable", () => {
  /**
   * @testdoc エクスポートされた関数がローカルヘルパーと同じ結果を返す
   * @purpose isClaudeCliAvailable がエクスポートされ正しく動作することを確認
   */
  it("should return boolean indicating claude CLI availability", () => {
    const result = isClaudeCliAvailable();
    expect(typeof result).toBe("boolean");
    // Should match local helper result
    expect(result).toBe(isClaudeAvailable());
  });
});

describe("registerPluginCache", () => {
  beforeEach(() => {
    setupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  /**
   * @testdoc 結果オブジェクトが正しい構造を持つ
   * @purpose registerPluginCache が success, method, message を含む結果を返すことを確認
   */
  it("should return a result with success, method fields", () => {
    const result = registerPluginCache(TEST_OUTPUT_DIR);

    expect(typeof result.success).toBe("boolean");
    expect(["install", "reinstall", "skipped"]).toContain(result.method);
  });

  /**
   * @testdoc reinstall オプションが method に反映される
   * @purpose reinstall: true を指定した場合、結果の method が適切に設定されることを確認
   */
  it("should reflect reinstall option in result method", () => {
    const result = registerPluginCache(TEST_OUTPUT_DIR, { reinstall: true });

    if (result.success) {
      expect(result.method).toBe("reinstall");
    } else {
      // If claude is not available, method is "skipped"
      // If claude failed, method is "reinstall"
      expect(["reinstall", "skipped"]).toContain(result.method);
    }
  });

  if (!isClaudeAvailable()) {
    /**
     * @testdoc claude CLI が利用不可の場合はスキップされる
     * @purpose claude CLI がない環境で適切にスキップされることを確認
     */
    it("should return skipped when claude CLI is not available", () => {
      const result = registerPluginCache(TEST_OUTPUT_DIR);

      expect(result.success).toBe(false);
      expect(result.method).toBe("skipped");
      expect(result.message).toContain("claude CLI not found");
    });
  } else {
    /**
     * @testdoc claude CLI が利用可能な場合はインストールを試みる
     * @purpose claude CLI がある環境でインストールが試行されることを確認
     */
    it("should attempt install when claude CLI is available", () => {
      const result = registerPluginCache(TEST_OUTPUT_DIR);

      // Method should be "install", not "skipped"
      expect(result.method).toBe("install");
    });
  }
});
