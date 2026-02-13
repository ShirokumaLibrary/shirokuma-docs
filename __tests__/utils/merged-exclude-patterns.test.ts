/**
 * getMergedExcludePatterns Tests
 *
 * Tests for exclude pattern merging from three sources:
 * defaults, config YAML, and .shirokumaignore file.
 *
 * @testdoc 除外パターンマージロジックのテスト
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getMergedExcludePatterns,
  DEFAULT_EXCLUDE_PATTERNS,
} from "../../src/utils/repo-pairs.js";
import type { GhConfig } from "../../src/utils/gh-config.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(
  __dirname,
  "..",
  "..",
  ".test-output",
  "merged-exclude-patterns",
);

// ========================================
// Setup / Teardown
// ========================================

beforeEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

// ========================================
// Helpers
// ========================================

function createConfig(repoPairs?: GhConfig["repoPairs"]): GhConfig {
  return { repoPairs };
}

function writeIgnoreFile(dir: string, content: string): void {
  writeFileSync(join(dir, ".shirokumaignore"), content, "utf-8");
}

// ========================================
// Tests
// ========================================

describe("getMergedExcludePatterns", () => {
  describe("DEFAULT_EXCLUDE_PATTERNS", () => {
    /**
     * @testdoc .shirokumaignore がデフォルト除外パターンに含まれる
     */
    it("should include .shirokumaignore in defaults", () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain(".shirokumaignore");
    });

    /**
     * @testdoc .claude/ がデフォルト除外パターンに含まれる
     */
    it("should include .claude/ in defaults", () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain(".claude/");
    });
  });

  describe("no config pair (alias not found)", () => {
    /**
     * @testdoc エイリアスが存在しない場合はデフォルトを返す
     */
    it("should return defaults when alias does not exist", () => {
      const config = createConfig({});
      const result = getMergedExcludePatterns("unknown", TEST_DIR, config);
      expect(result).toEqual(DEFAULT_EXCLUDE_PATTERNS);
    });

    /**
     * @testdoc エイリアス不在で .shirokumaignore がある場合はデフォルト＋ファイルパターンを返す
     */
    it("should return defaults + file patterns when .shirokumaignore exists", () => {
      writeIgnoreFile(TEST_DIR, "secret.txt\nlogs/");
      const config = createConfig({});
      const result = getMergedExcludePatterns("unknown", TEST_DIR, config);
      expect(result).toEqual([
        ...DEFAULT_EXCLUDE_PATTERNS,
        "secret.txt",
        "logs/",
      ]);
    });
  });

  describe("config pair without explicit exclude (isDefaultConfig = true)", () => {
    /**
     * @testdoc 設定ペアに exclude フィールドがない場合はデフォルトのみを使用する
     */
    it("should use only defaults when config pair has no exclude", () => {
      const config = createConfig({
        myalias: {
          private: "org/private-repo",
          public: "org/public-repo",
        },
      });
      const result = getMergedExcludePatterns("myalias", TEST_DIR, config);
      expect(result).toEqual(DEFAULT_EXCLUDE_PATTERNS);
    });

    /**
     * @testdoc exclude 未設定の設定ペアでデフォルト＋ファイルパターンをマージする
     */
    it("should merge defaults + file patterns (no config patterns)", () => {
      writeIgnoreFile(TEST_DIR, "custom-pattern/");
      const config = createConfig({
        myalias: {
          private: "org/private-repo",
          public: "org/public-repo",
        },
      });
      const result = getMergedExcludePatterns("myalias", TEST_DIR, config);
      expect(result).toEqual([...DEFAULT_EXCLUDE_PATTERNS, "custom-pattern/"]);
    });
  });

  describe("config pair with explicit exclude (isDefaultConfig = false)", () => {
    /**
     * @testdoc デフォルト＋設定＋ファイルの三つのソースをマージする
     */
    it("should merge defaults + config + file patterns", () => {
      writeIgnoreFile(TEST_DIR, "from-file/");
      const config = createConfig({
        myalias: {
          private: "org/private-repo",
          public: "org/public-repo",
          exclude: ["from-config/"],
        },
      });
      const result = getMergedExcludePatterns("myalias", TEST_DIR, config);
      expect(result).toEqual([
        ...DEFAULT_EXCLUDE_PATTERNS,
        "from-config/",
        "from-file/",
      ]);
    });

    /**
     * @testdoc デフォルトと重複する設定パターンを重複排除する
     */
    it("should deduplicate config patterns overlapping with defaults", () => {
      const config = createConfig({
        myalias: {
          private: "org/private-repo",
          public: "org/public-repo",
          exclude: [".claude/", "extra/"],
        },
      });
      const result = getMergedExcludePatterns("myalias", TEST_DIR, config);
      // .claude/ is deduplicated (exists in both defaults and config)
      expect(result).toEqual([...DEFAULT_EXCLUDE_PATTERNS, "extra/"]);
    });

    /**
     * @testdoc 空の exclude 配列を明示的設定として扱う（デフォルト扱いしない）
     */
    it("should handle empty exclude array as explicit config", () => {
      const config = createConfig({
        myalias: {
          private: "org/private-repo",
          public: "org/public-repo",
          exclude: [],
        },
      });
      const result = getMergedExcludePatterns("myalias", TEST_DIR, config);
      // Empty explicit config = only defaults (no extra config patterns)
      expect(result).toEqual(DEFAULT_EXCLUDE_PATTERNS);
    });
  });

  describe("deduplication across all sources", () => {
    /**
     * @testdoc デフォルト・設定・ファイルの全ソースで重複パターンを排除する
     */
    it("should deduplicate patterns across all three sources", () => {
      writeIgnoreFile(TEST_DIR, ".claude/\ncustom/");
      const config = createConfig({
        myalias: {
          private: "org/private-repo",
          public: "org/public-repo",
          exclude: [".claude/", "config-only/"],
        },
      });
      const result = getMergedExcludePatterns("myalias", TEST_DIR, config);
      const claudeCount = result.filter((p) => p === ".claude/").length;
      expect(claudeCount).toBe(1);
      expect(result).toContain("custom/");
      expect(result).toContain("config-only/");
    });

    /**
     * @testdoc デフォルトとファイルの .shirokumaignore を重複させない
     */
    it("should not duplicate .shirokumaignore from defaults and file", () => {
      writeIgnoreFile(TEST_DIR, ".shirokumaignore\ncustom/");
      const config = createConfig({
        myalias: {
          private: "org/private-repo",
          public: "org/public-repo",
        },
      });
      const result = getMergedExcludePatterns("myalias", TEST_DIR, config);
      const ignoreCount = result.filter(
        (p) => p === ".shirokumaignore",
      ).length;
      expect(ignoreCount).toBe(1);
    });
  });

  describe("no .shirokumaignore file", () => {
    /**
     * @testdoc ファイルも設定 exclude もない場合はデフォルトのみを返す
     */
    it("should return only defaults when no file and no config exclude", () => {
      const config = createConfig({
        myalias: {
          private: "org/private-repo",
          public: "org/public-repo",
        },
      });
      const result = getMergedExcludePatterns("myalias", TEST_DIR, config);
      expect(result).toEqual(DEFAULT_EXCLUDE_PATTERNS);
    });

    /**
     * @testdoc ファイルなしで設定に exclude がある場合はデフォルト＋設定を返す
     */
    it("should return defaults + config when no file but config has exclude", () => {
      const config = createConfig({
        myalias: {
          private: "org/private-repo",
          public: "org/public-repo",
          exclude: ["config-pattern/"],
        },
      });
      const result = getMergedExcludePatterns("myalias", TEST_DIR, config);
      expect(result).toEqual([
        ...DEFAULT_EXCLUDE_PATTERNS,
        "config-pattern/",
      ]);
    });
  });

  describe("no repoPairs in config", () => {
    /**
     * @testdoc 設定に repoPairs セクションがない場合はデフォルトを返す
     */
    it("should return defaults when config has no repoPairs", () => {
      const config: GhConfig = {};
      const result = getMergedExcludePatterns("any", TEST_DIR, config);
      expect(result).toEqual(DEFAULT_EXCLUDE_PATTERNS);
    });
  });
});
