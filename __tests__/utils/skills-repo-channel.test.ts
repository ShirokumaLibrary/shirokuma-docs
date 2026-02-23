/**
 * Channel-Based Version Resolution Tests
 *
 * resolveVersionByChannel() と withMarketplaceVersion() のユニットテスト
 *
 * @testdoc プラグインチャンネルベースのバージョン解決テスト (#961)
 */

import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";
import { tmpdir } from "os";

// =============================================================================
// Dynamic import for ESM module
// =============================================================================

let resolveVersionByChannel: typeof import("../../src/utils/skills-repo.js").resolveVersionByChannel;
let withMarketplaceVersion: typeof import("../../src/utils/skills-repo.js").withMarketplaceVersion;

beforeAll(async () => {
  const mod = await import("../../dist/utils/skills-repo.js");
  resolveVersionByChannel = mod.resolveVersionByChannel;
  withMarketplaceVersion = mod.withMarketplaceVersion;
});

// =============================================================================
// Helper: tmpdir に git リポジトリを作成してタグを付与する
// =============================================================================

const TEST_DIR = join(tmpdir(), "shirokuma-docs", "channel-test");

function createGitRepoWithTags(tags: string[]): string {
  const repoDir = join(TEST_DIR, `repo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(repoDir, { recursive: true });

  execFileSync("git", ["init", "-b", "main"], { cwd: repoDir, stdio: "pipe" });
  execFileSync("git", ["config", "user.email", "test@test.com"], { cwd: repoDir, stdio: "pipe" });
  execFileSync("git", ["config", "user.name", "Test"], { cwd: repoDir, stdio: "pipe" });

  // 初期コミット
  execFileSync("git", ["commit", "--allow-empty", "-m", "init"], { cwd: repoDir, stdio: "pipe" });

  // タグを追加
  for (const tag of tags) {
    execFileSync("git", ["tag", tag], { cwd: repoDir, stdio: "pipe" });
  }

  return repoDir;
}

beforeAll(() => {
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

// =============================================================================
// resolveVersionByChannel Tests
// =============================================================================

describe("resolveVersionByChannel", () => {
  /**
   * @testdoc alpha チャンネルは全てのバージョン（alpha, beta, rc, stable）から最新を返す
   */
  it("should return latest version from all tags for alpha channel", async () => {
    const repoDir = createGitRepoWithTags([
      "v0.2.0-alpha.15",
      "v0.2.0-alpha.16",
      "v0.1.0",
      "v0.1.0-beta.1",
      "v0.1.0-rc.1",
    ]);

    const result = await resolveVersionByChannel("alpha", repoDir);
    expect(result).toBe("v0.2.0-alpha.16");
  });

  /**
   * @testdoc stable チャンネルはプレリリース識別子なしのバージョンのみ返す
   */
  it("should return only stable versions for stable channel", async () => {
    const repoDir = createGitRepoWithTags([
      "v0.2.0-alpha.16",
      "v0.1.0",
      "v0.1.0-beta.1",
      "v1.0.0",
    ]);

    const result = await resolveVersionByChannel("stable", repoDir);
    expect(result).toBe("v1.0.0");
  });

  /**
   * @testdoc beta チャンネルは beta, rc, stable を含み alpha を除外する
   */
  it("should include beta, rc, and stable for beta channel", async () => {
    const repoDir = createGitRepoWithTags([
      "v0.2.0-alpha.16",
      "v0.2.0-beta.1",
      "v0.1.0-rc.1",
      "v0.1.0",
    ]);

    const result = await resolveVersionByChannel("beta", repoDir);
    expect(result).toBe("v0.2.0-beta.1");
  });

  /**
   * @testdoc rc チャンネルは rc と stable のみ含む
   */
  it("should include only rc and stable for rc channel", async () => {
    const repoDir = createGitRepoWithTags([
      "v0.2.0-alpha.16",
      "v0.2.0-beta.1",
      "v0.2.0-rc.1",
      "v0.1.0",
    ]);

    const result = await resolveVersionByChannel("rc", repoDir);
    expect(result).toBe("v0.2.0-rc.1");
  });

  /**
   * @testdoc タグがない場合は null を返す
   */
  it("should return null when no tags exist", async () => {
    const repoDir = createGitRepoWithTags([]);

    const result = await resolveVersionByChannel("alpha", repoDir);
    expect(result).toBeNull();
  });

  /**
   * @testdoc 合致するタグがない場合は null を返す
   */
  it("should return null when no matching tags exist", async () => {
    const repoDir = createGitRepoWithTags([
      "v0.2.0-alpha.16",
      "v0.2.0-alpha.17",
    ]);

    const result = await resolveVersionByChannel("stable", repoDir);
    expect(result).toBeNull();
  });

  /**
   * @testdoc プレリリースのみ存在する場合に alpha チャンネルで解決する
   */
  it("should resolve when only prerelease tags exist with alpha channel", async () => {
    const repoDir = createGitRepoWithTags([
      "v0.2.0-alpha.14",
      "v0.2.0-alpha.15",
      "v0.2.0-alpha.16",
    ]);

    const result = await resolveVersionByChannel("alpha", repoDir);
    expect(result).toBe("v0.2.0-alpha.16");
  });

  /**
   * @testdoc v プレフィックスなしのタグも処理する
   */
  it("should handle tags without v prefix", async () => {
    const repoDir = createGitRepoWithTags([
      "0.2.0-alpha.16",
      "0.1.0",
    ]);

    const result = await resolveVersionByChannel("alpha", repoDir);
    expect(result).toBe("0.2.0-alpha.16");
  });

  /**
   * @testdoc バージョンタグでないタグは無視する
   */
  it("should ignore non-version tags", async () => {
    const repoDir = createGitRepoWithTags([
      "v0.1.0",
      "release-notes",
      "latest",
    ]);

    const result = await resolveVersionByChannel("stable", repoDir);
    expect(result).toBe("v0.1.0");
  });
});

// =============================================================================
// withMarketplaceVersion Tests
// =============================================================================

describe("withMarketplaceVersion", () => {
  /**
   * @testdoc 指定タグにチェックアウトして関数を実行し、main に復帰する
   */
  it("should checkout tag, execute fn, and restore to main", async () => {
    const repoDir = createGitRepoWithTags(["v0.1.0"]);

    // main ブランチにいることを確認
    const beforeBranch = execFileSync("git", ["-C", repoDir, "rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf-8",
    }).trim();

    let tagDuringExec = "";
    await withMarketplaceVersion(repoDir, "v0.1.0", () => {
      // タグにチェックアウトされているか確認（detached HEAD）
      const describe = execFileSync("git", ["-C", repoDir, "describe", "--tags", "--exact-match"], {
        encoding: "utf-8",
      }).trim();
      tagDuringExec = describe;
    });

    expect(tagDuringExec).toBe("v0.1.0");

    // main に復帰しているか確認
    const afterBranch = execFileSync("git", ["-C", repoDir, "rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf-8",
    }).trim();
    expect(afterBranch).toBe(beforeBranch);
  });

  /**
   * @testdoc 関数の戻り値を返す
   */
  it("should return the value from fn", async () => {
    const repoDir = createGitRepoWithTags(["v0.1.0"]);

    const result = await withMarketplaceVersion(repoDir, "v0.1.0", () => {
      return 42;
    });

    expect(result).toBe(42);
  });

  /**
   * @testdoc 関数がエラーをスローしても main に復帰する
   */
  it("should restore to main even if fn throws", async () => {
    const repoDir = createGitRepoWithTags(["v0.1.0"]);

    await expect(async () => {
      await withMarketplaceVersion(repoDir, "v0.1.0", () => {
        throw new Error("test error");
      });
    }).rejects.toThrow("test error");

    // main に復帰しているか確認
    const afterBranch = execFileSync("git", ["-C", repoDir, "rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf-8",
    }).trim();
    expect(afterBranch).toBe("main");
  });

  /**
   * @testdoc 存在しないタグを指定するとエラーをスローする
   */
  it("should throw when tag does not exist", async () => {
    const repoDir = createGitRepoWithTags(["v0.1.0"]);

    await expect(async () => {
      await withMarketplaceVersion(repoDir, "v99.99.99", () => {
        return "should not reach";
      });
    }).rejects.toThrow();
  });
});
