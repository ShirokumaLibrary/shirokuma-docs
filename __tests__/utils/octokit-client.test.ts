/**
 * Octokit クライアント認証チェーンのテスト
 *
 * resolveAuthToken() のトークン解決優先順位と hosts.yml 読み取りを検証する。
 *
 * @testdoc Octokit クライアント認証トークン解決のユニットテスト
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveAuthToken, resetOctokit } from "../../src/utils/octokit-client.js";

/** テスト用の一時ディレクトリを作成する */
function createTmpDir(): string {
  const dir = join(tmpdir(), `octokit-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** hosts.yml を一時ディレクトリに書き込む */
function writeHostsYml(dir: string, content: string): void {
  writeFileSync(join(dir, "hosts.yml"), content, "utf-8");
}

describe("resolveAuthToken", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // 認証関連の環境変数をクリア
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
    delete process.env.GH_CONFIG_DIR;
    delete process.env.XDG_CONFIG_HOME;
    resetOctokit();
  });

  afterEach(() => {
    // 環境変数を復元
    process.env = { ...originalEnv };
  });

  /**
   * @testdoc GH_TOKEN が最優先で返される
   * @purpose gh CLI 互換の優先順位を確認
   */
  it("GH_TOKEN が最優先で返される", () => {
    process.env.GH_TOKEN = "gh-token-value";
    process.env.GITHUB_TOKEN = "github-token-value";

    expect(resolveAuthToken()).toBe("gh-token-value");
  });

  /**
   * @testdoc GITHUB_TOKEN が 2 番目に返される
   * @purpose GH_TOKEN がない場合の GITHUB_TOKEN フォールバックを確認
   */
  it("GITHUB_TOKEN が 2 番目に返される", () => {
    process.env.GITHUB_TOKEN = "github-token-value";

    expect(resolveAuthToken()).toBe("github-token-value");
  });

  /**
   * @testdoc 環境変数なしで hosts.yml からトークンを読む
   * @purpose hosts.yml フォールバックの基本動作を確認
   */
  it("環境変数なしで hosts.yml からトークンを読む", () => {
    const tmpDir = createTmpDir();
    try {
      writeHostsYml(tmpDir, [
        "github.com:",
        "  oauth_token: gho_test_token_12345",
        "  user: testuser",
        "  git_protocol: https",
      ].join("\n"));
      process.env.GH_CONFIG_DIR = tmpDir;

      expect(resolveAuthToken()).toBe("gho_test_token_12345");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  /**
   * @testdoc hosts.yml が存在しない場合に null を返す
   * @purpose ファイル不在時の安全なフォールバックを確認
   */
  it("hosts.yml が存在しない場合に null を返す", () => {
    const tmpDir = createTmpDir();
    try {
      process.env.GH_CONFIG_DIR = tmpDir;
      // hosts.yml を作成しない

      expect(resolveAuthToken()).toBeNull();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  /**
   * @testdoc hosts.yml が不正な YAML の場合に null を返す
   * @purpose パースエラー時の安全なフォールバックを確認
   */
  it("hosts.yml が不正な YAML の場合に null を返す", () => {
    const tmpDir = createTmpDir();
    try {
      writeHostsYml(tmpDir, "{{{{ invalid yaml ::::}}}}");
      process.env.GH_CONFIG_DIR = tmpDir;

      expect(resolveAuthToken()).toBeNull();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  /**
   * @testdoc hosts.yml に github.com エントリがない場合に null を返す
   * @purpose GHES のみの設定など、github.com 不在パターンを確認
   */
  it("hosts.yml に github.com エントリがない場合に null を返す", () => {
    const tmpDir = createTmpDir();
    try {
      writeHostsYml(tmpDir, [
        "enterprise.example.com:",
        "  oauth_token: gho_enterprise_token",
        "  user: admin",
      ].join("\n"));
      process.env.GH_CONFIG_DIR = tmpDir;

      expect(resolveAuthToken()).toBeNull();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  /**
   * @testdoc GH_CONFIG_DIR でカスタムディレクトリを指定できる
   * @purpose カスタム設定ディレクトリのサポートを確認
   */
  it("GH_CONFIG_DIR でカスタムディレクトリを指定できる", () => {
    const tmpDir = createTmpDir();
    try {
      writeHostsYml(tmpDir, [
        "github.com:",
        "  oauth_token: gho_custom_dir_token",
      ].join("\n"));
      process.env.GH_CONFIG_DIR = tmpDir;

      expect(resolveAuthToken()).toBe("gho_custom_dir_token");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  /**
   * @testdoc oauth_token がトップレベルにない場合に null を返す
   * @purpose users 配下にトークンがある gh CLI 新形式では読み取れないことを確認
   */
  it("oauth_token がトップレベルにない場合に null を返す", () => {
    const tmpDir = createTmpDir();
    try {
      writeHostsYml(tmpDir, [
        "github.com:",
        "  user: testuser",
        "  git_protocol: https",
        "  users:",
        "    testuser:",
        "      oauth_token: gho_nested_token",
      ].join("\n"));
      process.env.GH_CONFIG_DIR = tmpDir;

      expect(resolveAuthToken()).toBeNull();
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  /**
   * @testdoc XDG_CONFIG_HOME 経由で hosts.yml を解決できる
   * @purpose XDG Base Directory 仕様のサポートを確認
   */
  it("XDG_CONFIG_HOME 経由で hosts.yml を解決できる", () => {
    const tmpDir = createTmpDir();
    const ghDir = join(tmpDir, "gh");
    mkdirSync(ghDir, { recursive: true });
    try {
      writeHostsYml(ghDir, [
        "github.com:",
        "  oauth_token: gho_xdg_token",
      ].join("\n"));
      process.env.XDG_CONFIG_HOME = tmpDir;

      expect(resolveAuthToken()).toBe("gho_xdg_token");
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
