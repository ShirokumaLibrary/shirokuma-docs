/**
 * git-local.ts ユニットテスト
 *
 * .git ファイル直接読み取りユーティリティのテスト。
 * 一時ディレクトリで実際の .git 構造を作成してテストする。
 *
 * @testdoc ローカル .git ファイル読み取りユーティリティのテスト
 */

import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  getCurrentBranch,
  getGitRemoteUrl,
  isInsideGitRepo,
  getGitRemotes,
} from "../../src/utils/git-local.js";

/** テスト用一時ディレクトリを作成 */
function createTempDir(prefix: string): string {
  const dir = join(tmpdir(), `git-local-test-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** .git ディレクトリ構造を模倣して作成 */
function createFakeGitDir(repoPath: string, options: {
  head?: string;
  remotes?: Array<{ name: string; url: string; fetch?: string }>;
} = {}): void {
  const gitDir = join(repoPath, ".git");
  mkdirSync(gitDir, { recursive: true });
  mkdirSync(join(gitDir, "refs", "heads"), { recursive: true });

  // HEAD ファイル
  const headContent = options.head ?? "ref: refs/heads/main";
  writeFileSync(join(gitDir, "HEAD"), headContent + "\n");

  // config ファイル
  let config = "[core]\n\trepositoryformatversion = 0\n\tfilemode = true\n\tbare = false\n";
  for (const remote of options.remotes ?? []) {
    config += `[remote "${remote.name}"]\n`;
    config += `\turl = ${remote.url}\n`;
    config += `\tfetch = ${remote.fetch ?? `+refs/heads/*:refs/remotes/${remote.name}/*`}\n`;
  }
  writeFileSync(join(gitDir, "config"), config);
}

/** worktree 構造を模倣して作成 */
function createFakeWorktree(mainRepoPath: string, worktreeName: string, options: {
  head?: string;
} = {}): string {
  const mainGitDir = join(mainRepoPath, ".git");
  const worktreesDir = join(mainGitDir, "worktrees", worktreeName);
  mkdirSync(worktreesDir, { recursive: true });

  // worktree 固有の HEAD
  const headContent = options.head ?? "ref: refs/heads/feature-branch";
  writeFileSync(join(worktreesDir, "HEAD"), headContent + "\n");

  // commondir ファイル（メインリポジトリの .git への相対パス）
  writeFileSync(join(worktreesDir, "commondir"), "../..");

  // worktree ディレクトリを作成し .git ファイルを配置
  const worktreePath = join(mainRepoPath, "..", `worktree-${worktreeName}`);
  mkdirSync(worktreePath, { recursive: true });
  writeFileSync(join(worktreePath, ".git"), `gitdir: ${worktreesDir}\n`);

  return worktreePath;
}

let tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  tempDirs = [];
});

function trackDir(dir: string): string {
  tempDirs.push(dir);
  return dir;
}

describe("getCurrentBranch", () => {
  /**
   * @testdoc 通常のブランチ名を取得できる
   * @purpose HEAD が ref を指している場合にブランチ名を返すことを確認
   */
  it("should return branch name from HEAD ref", () => {
    const repoPath = trackDir(createTempDir("branch"));
    createFakeGitDir(repoPath, { head: "ref: refs/heads/develop" });

    expect(getCurrentBranch(repoPath)).toBe("develop");
  });

  /**
   * @testdoc main ブランチを取得できる
   */
  it("should return 'main' for main branch", () => {
    const repoPath = trackDir(createTempDir("main"));
    createFakeGitDir(repoPath, { head: "ref: refs/heads/main" });

    expect(getCurrentBranch(repoPath)).toBe("main");
  });

  /**
   * @testdoc スラッシュを含むブランチ名を取得できる
   */
  it("should handle branch names with slashes", () => {
    const repoPath = trackDir(createTempDir("slash"));
    createFakeGitDir(repoPath, { head: "ref: refs/heads/feat/42-branch-workflow" });

    expect(getCurrentBranch(repoPath)).toBe("feat/42-branch-workflow");
  });

  /**
   * @testdoc detached HEAD の場合は null を返す
   * @purpose コミットハッシュ直接の場合にブランチ名がないことを確認
   */
  it("should return null for detached HEAD", () => {
    const repoPath = trackDir(createTempDir("detached"));
    createFakeGitDir(repoPath, { head: "abc1234567890def1234567890abc1234567890de" });

    expect(getCurrentBranch(repoPath)).toBeNull();
  });

  /**
   * @testdoc git リポジトリでない場合は null を返す
   */
  it("should return null for non-git directory", () => {
    const nonRepoPath = trackDir(createTempDir("no-git"));
    expect(getCurrentBranch(nonRepoPath)).toBeNull();
  });

  /**
   * @testdoc worktree のブランチ名を取得できる
   */
  it("should return worktree-specific branch name", () => {
    const mainPath = trackDir(createTempDir("wt-main"));
    createFakeGitDir(mainPath, {
      head: "ref: refs/heads/main",
      remotes: [{ name: "origin", url: "https://github.com/owner/repo.git" }],
    });

    const wtPath = createFakeWorktree(mainPath, "feature", {
      head: "ref: refs/heads/feat/123-new-feature",
    });
    trackDir(wtPath);

    expect(getCurrentBranch(wtPath)).toBe("feat/123-new-feature");
    // メインリポジトリは影響なし
    expect(getCurrentBranch(mainPath)).toBe("main");
  });

  /**
   * @testdoc サブディレクトリからもブランチ名を取得できる
   */
  it("should find .git from subdirectory", () => {
    const repoPath = trackDir(createTempDir("subdir"));
    createFakeGitDir(repoPath, { head: "ref: refs/heads/develop" });

    const subDir = join(repoPath, "src", "utils");
    mkdirSync(subDir, { recursive: true });

    expect(getCurrentBranch(subDir)).toBe("develop");
  });
});

describe("getGitRemoteUrl", () => {
  /**
   * @testdoc HTTPS リモート URL を取得できる
   */
  it("should return HTTPS remote URL", () => {
    const repoPath = trackDir(createTempDir("https"));
    createFakeGitDir(repoPath, {
      remotes: [{ name: "origin", url: "https://github.com/owner/repo.git" }],
    });

    expect(getGitRemoteUrl("origin", repoPath)).toBe("https://github.com/owner/repo.git");
  });

  /**
   * @testdoc SSH リモート URL を取得できる
   */
  it("should return SSH remote URL", () => {
    const repoPath = trackDir(createTempDir("ssh"));
    createFakeGitDir(repoPath, {
      remotes: [{ name: "origin", url: "git@github.com:owner/repo.git" }],
    });

    expect(getGitRemoteUrl("origin", repoPath)).toBe("git@github.com:owner/repo.git");
  });

  /**
   * @testdoc デフォルトは origin リモートを取得する
   */
  it("should default to 'origin'", () => {
    const repoPath = trackDir(createTempDir("default"));
    createFakeGitDir(repoPath, {
      remotes: [{ name: "origin", url: "https://github.com/owner/repo.git" }],
    });

    expect(getGitRemoteUrl(undefined, repoPath)).toBe("https://github.com/owner/repo.git");
  });

  /**
   * @testdoc 指定したリモート名で取得できる
   */
  it("should return URL for specified remote name", () => {
    const repoPath = trackDir(createTempDir("multi"));
    createFakeGitDir(repoPath, {
      remotes: [
        { name: "origin", url: "https://github.com/fork/repo.git" },
        { name: "upstream", url: "https://github.com/original/repo.git" },
      ],
    });

    expect(getGitRemoteUrl("upstream", repoPath)).toBe("https://github.com/original/repo.git");
  });

  /**
   * @testdoc 存在しないリモート名は null を返す
   */
  it("should return null for non-existent remote", () => {
    const repoPath = trackDir(createTempDir("no-remote"));
    createFakeGitDir(repoPath, {
      remotes: [{ name: "origin", url: "https://github.com/owner/repo.git" }],
    });

    expect(getGitRemoteUrl("upstream", repoPath)).toBeNull();
  });

  /**
   * @testdoc リモートが未設定の場合は null を返す
   */
  it("should return null when no remotes configured", () => {
    const repoPath = trackDir(createTempDir("no-remotes"));
    createFakeGitDir(repoPath, { remotes: [] });

    expect(getGitRemoteUrl("origin", repoPath)).toBeNull();
  });

  /**
   * @testdoc worktree から共有 config のリモートを取得できる
   */
  it("should read remote from shared config in worktree", () => {
    const mainPath = trackDir(createTempDir("wt-remote"));
    createFakeGitDir(mainPath, {
      remotes: [{ name: "origin", url: "https://github.com/owner/repo.git" }],
    });

    const wtPath = createFakeWorktree(mainPath, "branch");
    trackDir(wtPath);

    expect(getGitRemoteUrl("origin", wtPath)).toBe("https://github.com/owner/repo.git");
  });
});

describe("isInsideGitRepo", () => {
  /**
   * @testdoc git リポジトリ内では true を返す
   */
  it("should return true inside git repo", () => {
    const repoPath = trackDir(createTempDir("inside"));
    createFakeGitDir(repoPath);

    expect(isInsideGitRepo(repoPath)).toBe(true);
  });

  /**
   * @testdoc git リポジトリ外では false を返す
   */
  it("should return false outside git repo", () => {
    const nonRepoPath = trackDir(createTempDir("outside"));
    expect(isInsideGitRepo(nonRepoPath)).toBe(false);
  });

  /**
   * @testdoc サブディレクトリでも true を返す
   */
  it("should return true in subdirectory of git repo", () => {
    const repoPath = trackDir(createTempDir("sub-inside"));
    createFakeGitDir(repoPath);

    const subDir = join(repoPath, "src", "components");
    mkdirSync(subDir, { recursive: true });

    expect(isInsideGitRepo(subDir)).toBe(true);
  });

  /**
   * @testdoc worktree 内でも true を返す
   */
  it("should return true inside worktree", () => {
    const mainPath = trackDir(createTempDir("wt-inside"));
    createFakeGitDir(mainPath);

    const wtPath = createFakeWorktree(mainPath, "wt");
    trackDir(wtPath);

    expect(isInsideGitRepo(wtPath)).toBe(true);
  });
});

describe("getGitRemotes", () => {
  /**
   * @testdoc 全リモート情報を取得できる
   */
  it("should return all remotes", () => {
    const repoPath = trackDir(createTempDir("all-remotes"));
    createFakeGitDir(repoPath, {
      remotes: [
        { name: "origin", url: "https://github.com/owner/repo.git" },
        { name: "upstream", url: "git@github.com:original/repo.git" },
      ],
    });

    const remotes = getGitRemotes(repoPath);
    expect(remotes).toHaveLength(2);
    expect(remotes[0]).toEqual({ name: "origin", url: "https://github.com/owner/repo.git" });
    expect(remotes[1]).toEqual({ name: "upstream", url: "git@github.com:original/repo.git" });
  });

  /**
   * @testdoc リモートがない場合は空配列を返す
   */
  it("should return empty array when no remotes", () => {
    const repoPath = trackDir(createTempDir("empty-remotes"));
    createFakeGitDir(repoPath, { remotes: [] });

    expect(getGitRemotes(repoPath)).toEqual([]);
  });

  /**
   * @testdoc git リポジトリ外では空配列を返す
   */
  it("should return empty array outside git repo", () => {
    const nonRepoPath = trackDir(createTempDir("no-repo"));
    expect(getGitRemotes(nonRepoPath)).toEqual([]);
  });

  /**
   * @testdoc worktree から共有 config のリモート一覧を取得できる
   */
  it("should read remotes from shared config in worktree", () => {
    const mainPath = trackDir(createTempDir("wt-remotes"));
    createFakeGitDir(mainPath, {
      remotes: [
        { name: "origin", url: "https://github.com/owner/repo.git" },
      ],
    });

    const wtPath = createFakeWorktree(mainPath, "wt-r");
    trackDir(wtPath);

    const remotes = getGitRemotes(wtPath);
    expect(remotes).toHaveLength(1);
    expect(remotes[0]).toEqual({ name: "origin", url: "https://github.com/owner/repo.git" });
  });
});
