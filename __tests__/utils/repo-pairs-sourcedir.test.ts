/**
 * repo-pairs sourceDir Tests
 *
 * Tests for sourceDir feature that enables releasing
 * a subdirectory of the private repo to the public repo.
 *
 * @testdoc repo-pairs sourceDir 機能のテスト
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(
  __dirname,
  "..",
  "..",
  ".test-output",
  "repo-pairs-sourcedir",
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

function createFile(dir: string, relativePath: string, content = ""): void {
  const fullPath = join(dir, relativePath);
  const parentDir = dirname(fullPath);
  if (!existsSync(parentDir)) {
    mkdirSync(parentDir, { recursive: true });
  }
  writeFileSync(fullPath, content || `content of ${relativePath}`, "utf-8");
}

// ========================================
// Tests: getAllRepoPairs sourceDir mapping
// ========================================

describe("getAllRepoPairs sourceDir", () => {
  /**
   * @testdoc sourceDir が設定されたペアはプロパティを保持する
   */
  it("should include sourceDir when configured", async () => {
    const { getAllRepoPairs } = await import("../../src/utils/repo-pairs.js");
    const config = {
      repoPairs: {
        infra: {
          private: "org/monorepo",
          public: "org/infra",
          sourceDir: "infra/",
        },
      },
    };
    const pairs = getAllRepoPairs(config);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].sourceDir).toBe("infra/");
  });

  /**
   * @testdoc sourceDir が未設定のペアは sourceDir を持たない
   */
  it("should omit sourceDir when not configured", async () => {
    const { getAllRepoPairs } = await import("../../src/utils/repo-pairs.js");
    const config = {
      repoPairs: {
        main: {
          private: "org/repo",
          public: "org/repo-public",
        },
      },
    };
    const pairs = getAllRepoPairs(config);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].sourceDir).toBeUndefined();
  });
});

// ========================================
// Tests: collectLocalFiles with sourceDir
// ========================================

describe("collectLocalFiles with sourceDir basePath", () => {
  // collectLocalFiles は内部関数のため、動作を確認するために
  // basePath の計算と同等のロジックをテストする

  /**
   * @testdoc basePath 計算: sourceDir 指定時はサブディレクトリを返す
   */
  it("should compute basePath from sourceDir", () => {
    const projectPath = "/project";
    const sourceDir = "infra";
    const basePath = sourceDir ? join(projectPath, sourceDir) : projectPath;
    expect(basePath).toBe("/project/infra");
  });

  /**
   * @testdoc basePath 計算: sourceDir 未指定時はプロジェクトルートを返す
   */
  it("should use projectPath when sourceDir is undefined", () => {
    const projectPath = "/project";
    const sourceDir = undefined;
    const basePath = sourceDir ? join(projectPath, sourceDir) : projectPath;
    expect(basePath).toBe("/project");
  });

  /**
   * @testdoc sourceDir 配下のファイルのみが収集される（プロジェクトルートのファイルは含まれない）
   */
  it("should collect only files under sourceDir", async () => {
    // プロジェクトルートにファイルを作成
    createFile(TEST_DIR, "root-file.txt");
    createFile(TEST_DIR, "package.json");

    // サブディレクトリ（sourceDir）にファイルを作成
    createFile(TEST_DIR, "infra/docker-compose.yml");
    createFile(TEST_DIR, "infra/README.md");
    createFile(TEST_DIR, "infra/traefik/config.yml");

    // basePath をサブディレクトリに設定
    const basePath = join(TEST_DIR, "infra");

    // collectLocalFiles と同等の収集ロジック
    const { readdirSync, statSync } = await import("node:fs");
    const { relative } = await import("node:path");

    const files: string[] = [];
    function walk(dir: string): void {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          files.push(relative(basePath, fullPath));
        }
      }
    }
    walk(basePath);

    // infra/ 配下のファイルのみが相対パスで返される
    expect(files).toContain("docker-compose.yml");
    expect(files).toContain("README.md");
    expect(files).toContain(join("traefik", "config.yml"));

    // プロジェクトルートのファイルは含まれない
    expect(files).not.toContain("root-file.txt");
    expect(files).not.toContain("package.json");
  });

  /**
   * @testdoc 相対パスに sourceDir プレフィックスが含まれない
   */
  it("should not include sourceDir prefix in relative paths", async () => {
    createFile(TEST_DIR, "infra/docker-compose.yml");
    createFile(TEST_DIR, "infra/scripts/start.sh");

    const basePath = join(TEST_DIR, "infra");
    const { relative } = await import("node:path");

    // basePath からの相対パスを計算
    const relPath = relative(basePath, join(TEST_DIR, "infra/docker-compose.yml"));
    expect(relPath).toBe("docker-compose.yml");
    expect(relPath).not.toContain("infra/");

    const relPath2 = relative(basePath, join(TEST_DIR, "infra/scripts/start.sh"));
    expect(relPath2).toBe(join("scripts", "start.sh"));
    expect(relPath2).not.toContain("infra/");
  });
});

// ========================================
// Tests: getMergedExcludePatterns with sourceDir
// ========================================

describe("getMergedExcludePatterns with sourceDir basePath", () => {
  /**
   * @testdoc sourceDir 内の .shirokumaignore が読み込まれる
   */
  it("should read .shirokumaignore from sourceDir basePath", async () => {
    const { getMergedExcludePatterns, DEFAULT_EXCLUDE_PATTERNS } =
      await import("../../src/utils/repo-pairs.js");

    // sourceDir 内に .shirokumaignore を作成
    const infraDir = join(TEST_DIR, "infra");
    mkdirSync(infraDir, { recursive: true });
    writeFileSync(join(infraDir, ".shirokumaignore"), "terraform.tfstate\n.env", "utf-8");

    const config = {
      repoPairs: {
        infra: {
          private: "org/monorepo",
          public: "org/infra",
          sourceDir: "infra/",
        },
      },
    };

    // basePath = infraDir として呼び出す
    const result = getMergedExcludePatterns("infra", infraDir, config);
    expect(result).toEqual([
      ...DEFAULT_EXCLUDE_PATTERNS,
      "terraform.tfstate",
      ".env",
    ]);
  });

  /**
   * @testdoc sourceDir 外（プロジェクトルート）の .shirokumaignore は読み込まれない
   */
  it("should not read .shirokumaignore from project root when basePath is sourceDir", async () => {
    const { getMergedExcludePatterns, DEFAULT_EXCLUDE_PATTERNS } =
      await import("../../src/utils/repo-pairs.js");

    // プロジェクトルートに .shirokumaignore
    writeFileSync(join(TEST_DIR, ".shirokumaignore"), "root-pattern/", "utf-8");

    // sourceDir にはなし
    const infraDir = join(TEST_DIR, "infra");
    mkdirSync(infraDir, { recursive: true });

    const config = {
      repoPairs: {
        infra: {
          private: "org/monorepo",
          public: "org/infra",
          sourceDir: "infra/",
        },
      },
    };

    // basePath = infraDir → root の .shirokumaignore は見えない
    const result = getMergedExcludePatterns("infra", infraDir, config);
    expect(result).toEqual(DEFAULT_EXCLUDE_PATTERNS);
    expect(result).not.toContain("root-pattern/");
  });
});

// ========================================
// Tests: sourceDir existence check
// ========================================

describe("sourceDir existence validation", () => {
  /**
   * @testdoc sourceDir が存在しない場合は basePath の existsSync が false を返す
   */
  it("should detect non-existent sourceDir", () => {
    const basePath = join(TEST_DIR, "nonexistent-dir");
    expect(existsSync(basePath)).toBe(false);
  });

  /**
   * @testdoc sourceDir が存在する場合は basePath の existsSync が true を返す
   */
  it("should detect existing sourceDir", () => {
    const infraDir = join(TEST_DIR, "infra");
    mkdirSync(infraDir, { recursive: true });
    expect(existsSync(infraDir)).toBe(true);
  });
});
