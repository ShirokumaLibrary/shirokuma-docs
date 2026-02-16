/**
 * update-skills Command Tests
 *
 * Tests for the skill/rule update command with bundled plugin.
 * #486: 外部プロジェクトでは updateExternalProject() に委譲され、
 * claude plugin update でグローバルキャッシュを更新 + ルール展開する。
 *
 * @testdoc update-skills コマンドのテスト（外部プロジェクト向け marketplace + cache 方式）
 */

import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Types
// =============================================================================

interface UpdateItem {
  name: string;
  status: "updated" | "skipped" | "added" | "unchanged" | "error" | "removed";
  reason?: string;
}

interface DeployedRuleItem {
  name: string;
  status: "deployed" | "updated" | "unchanged" | "error" | "removed";
}

interface UpdateResult {
  skills: UpdateItem[];
  rules: UpdateItem[];
  deployedRules: DeployedRuleItem[];
  version: string;
  pluginVersion: string;
  dryRun: boolean;
  hooksStatus: "updated" | "skipped" | "error" | "not-applicable";
}

// =============================================================================
// Test Constants
// =============================================================================

const CLI_PATH = join(__dirname, "..", "..", "dist", "index.js");
const TEST_OUTPUT_DIR = join(__dirname, "..", "..", ".test-output", "update-skills");

// =============================================================================
// Test Helpers
// =============================================================================

function runCli(args: string[]): { stdout: string; stderr: string; status: number } {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    encoding: "utf-8",
    cwd: join(__dirname, "..", ".."),
    timeout: 30000,
    // 並列テスト実行時の claude CLI グローバルキャッシュ競合を防止 (#632)
    env: { ...process.env, SHIROKUMA_NO_CLAUDE_CLI: "1" },
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    status: result.status ?? 1,
  };
}

/**
 * Extract JSON from stdout that may contain log messages
 */
function extractJson<T>(stdout: string): T {
  const firstBrace = stdout.indexOf("{");
  const lastBrace = stdout.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error(`No JSON found in output: ${stdout}`);
  }
  return JSON.parse(stdout.slice(firstBrace, lastBrace + 1)) as T;
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
 * Setup test project with initial plugin installed via init --with-skills
 */
function setupWithInit(): void {
  setupTestDir();
  const result = runCli([
    "init",
    "--project", TEST_OUTPUT_DIR,
    "--with-skills",
    "--verbose",
  ]);
  if (result.status !== 0) {
    throw new Error(`init failed: ${result.stdout}\n${result.stderr}`);
  }
}

// =============================================================================
// Tests
// =============================================================================

describe("update-skills command", () => {
  afterEach(() => {
    cleanupTestDir();
  });

  describe("basic functionality", () => {
    /**
     * @testdoc .claude ディレクトリがない場合はエラーを返す
     * @purpose 未初期化プロジェクトでの実行を防止
     */
    it("should fail without .claude directory", () => {
      setupTestDir();
      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
      ]);

      expect(result.status).not.toBe(0);
      const output = result.stdout + result.stderr;
      expect(output).toContain(".claude");
    });

    /**
     * @testdoc 外部プロジェクトではグローバルキャッシュ更新を実行する
     * @purpose #486: marketplace + cache 方式での更新フロー
     */
    it("should update global cache for external projects", () => {
      setupWithInit();

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<UpdateResult>(result.stdout);
      expect(output.version).toBeTruthy();
      expect(output.pluginVersion).toBeTruthy();

      // 外部プロジェクトでは skills/rules は空（キャッシュ更新方式のため）
      expect(output.skills).toEqual([]);
      expect(output.rules).toEqual([]);
    });

    /**
     * @testdoc デプロイ済みルールが結果に含まれる
     * @purpose ルール展開（.claude/rules/shirokuma/）の動作確認
     */
    it("should deploy rules to .claude/rules/shirokuma/", () => {
      setupWithInit();

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<UpdateResult>(result.stdout);
      expect(output.deployedRules.length).toBeGreaterThan(0);

      // ルールファイルが .claude/rules/shirokuma/ に展開されている
      const rulesDir = join(TEST_OUTPUT_DIR, ".claude", "rules", "shirokuma");
      expect(existsSync(rulesDir)).toBe(true);
    });
  });

  describe("--dry-run option", () => {
    /**
     * @testdoc ドライランで変更を適用しない
     * @purpose --dry-run が実際のファイル変更を行わないことを確認
     */
    it("should not make changes with --dry-run", () => {
      setupWithInit();

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--dry-run",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("ドライラン");
    });
  });

  describe("no metadata file", () => {
    /**
     * @testdoc .shirokuma-meta.json が作成されない
     * @purpose メタデータファイルが廃止されたことを確認（#401）
     */
    it("should not create .shirokuma-meta.json", () => {
      setupWithInit();

      runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--verbose",
      ]);

      const metaPath = join(TEST_OUTPUT_DIR, ".claude", ".shirokuma-meta.json");
      expect(existsSync(metaPath)).toBe(false);
    });
  });

  describe("output format", () => {
    /**
     * @testdoc サマリーに OK インジケーターが表示される
     * @purpose 更新結果の成否が一目でわかることを確認
     */
    it("should show OK indicator in summary", () => {
      setupWithInit();

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("✓");
      expect(result.stdout).toContain("更新完了");
    });

    /**
     * @testdoc デプロイ済みルールのサマリーが表示される
     * @purpose ルール展開結果がユーザーに分かりやすく表示されること
     */
    it("should show deployed rules summary", () => {
      setupWithInit();

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("デプロイ済みルール");
    });
  });

  describe("update shortcut command", () => {
    /**
     * @testdoc `update` コマンドが正常に動作する
     * @purpose 短縮コマンドが正しく動作することを確認
     */
    it("should work as shortcut for update-skills --sync", () => {
      setupWithInit();

      const result = runCli([
        "update",
        "--project", TEST_OUTPUT_DIR,
        "--dry-run",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("ドライラン");
    });
  });

  describe("legacy cleanup", () => {
    /**
     * @testdoc レガシー .claude/plugins/ ディレクトリが削除される
     * @purpose #486: マイグレーション時のレガシーディレクトリ削除
     */
    it("should clean up legacy .claude/plugins/ directory", () => {
      setupWithInit();

      // レガシーディレクトリを手動作成
      const legacyDir = join(TEST_OUTPUT_DIR, ".claude", "plugins", "shirokuma-skills-en");
      mkdirSync(legacyDir, { recursive: true });
      writeFileSync(join(legacyDir, "marker.txt"), "legacy", "utf-8");

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      // レガシーディレクトリが削除されている
      expect(existsSync(join(TEST_OUTPUT_DIR, ".claude", "plugins"))).toBe(false);
    });

    /**
     * @testdoc .gitignore から .claude/plugins/ エントリが削除される
     * @purpose レガシー gitignore エントリのクリーンアップ
     */
    it("should remove .claude/plugins/ from .gitignore", () => {
      setupWithInit();

      // レガシーエントリを含む .gitignore を作成
      writeFileSync(
        join(TEST_OUTPUT_DIR, ".gitignore"),
        ".claude/rules/shirokuma/\n.claude/plugins/\n.claude/plans/\n",
        "utf-8",
      );

      // レガシーディレクトリも作成（cleanupLegacyPluginDir のトリガー）
      mkdirSync(join(TEST_OUTPUT_DIR, ".claude", "plugins"), { recursive: true });

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--verbose",
      ]);

      expect(result.status).toBe(0);

      const gitignoreContent = readFileSync(join(TEST_OUTPUT_DIR, ".gitignore"), "utf-8");
      expect(gitignoreContent).not.toContain(".claude/plugins/");
      expect(gitignoreContent).toContain(".claude/rules/shirokuma/");
    });
  });

  describe("hooks handling", () => {
    /**
     * @testdoc 安全フック状態が結果に含まれる
     * @purpose hooks プラグインの存在に応じた状態報告
     */
    it("should include hooks status in result", () => {
      setupWithInit();

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<UpdateResult>(result.stdout);
      expect(["updated", "skipped", "not-applicable"]).toContain(output.hooksStatus);
    });
  });
});
