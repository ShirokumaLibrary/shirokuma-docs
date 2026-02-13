/**
 * update-skills Command Tests
 *
 * Tests for the skill/rule update command with bundled plugin.
 *
 * @testdoc update-skills コマンドのテスト（バンドルプラグイン方式、スキル更新・ルール更新・ドライラン含む）
 */

import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from "fs";
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

interface UpdateResult {
  skills: UpdateItem[];
  rules: UpdateItem[];
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
const PLUGIN_DIR = "shirokuma-skills-en";

// =============================================================================
// Test Helpers
// =============================================================================

function runCli(args: string[]): { stdout: string; stderr: string; status: number } {
  const result = spawnSync("node", [CLI_PATH, ...args], {
    encoding: "utf-8",
    cwd: join(__dirname, "..", ".."),
    timeout: 30000,
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

/**
 * Get path to installed plugin skills directory
 */
function getPluginSkillsDir(): string {
  return join(TEST_OUTPUT_DIR, ".claude", "plugins", PLUGIN_DIR, "skills");
}

/**
 * Get path to installed plugin rules directory
 */
function getPluginRulesDir(): string {
  return join(TEST_OUTPUT_DIR, ".claude", "plugins", PLUGIN_DIR, "rules");
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
     * @testdoc インストール済みスキルがない場合は警告を表示する
     * @purpose スキル未インストール状態での動作確認
     */
    it("should warn when no skills are installed", () => {
      setupTestDir();
      // Create .claude directory but no plugins
      mkdirSync(join(TEST_OUTPUT_DIR, ".claude", "plugins", PLUGIN_DIR, "skills"), { recursive: true });

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
      ]);

      expect(result.stdout).toContain("インストール済みスキルが見つかりません");
    });

    /**
     * @testdoc インストール済みスキルを更新する
     * @purpose 基本的な更新フローが正しく動作することを確認
     */
    it("should update installed skills", () => {
      setupWithInit();

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--force",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<UpdateResult>(result.stdout);
      expect(output.skills.length).toBeGreaterThan(0);
      expect(output.version).toBeTruthy();

      // Skill should still exist after update
      expect(existsSync(join(getPluginSkillsDir(), "managing-agents"))).toBe(true);
    });
  });

  describe("--dry-run option", () => {
    /**
     * @testdoc ドライランで変更を適用しない
     * @purpose --dry-run が実際のファイル変更を行わないことを確認
     */
    it("should not make changes with --dry-run", () => {
      setupWithInit();

      // Modify a file to create a local change
      const skillDir = join(getPluginSkillsDir(), "managing-agents");
      const testFile = join(skillDir, "SKILL.md");
      if (existsSync(testFile)) {
        writeFileSync(testFile, "# Modified locally\n", "utf-8");
      }

      const contentBefore = existsSync(testFile)
        ? readFileSync(testFile, "utf-8")
        : null;

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--dry-run",
        "--force",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("ドライラン");

      // File should not have changed
      if (contentBefore !== null) {
        const contentAfter = readFileSync(testFile, "utf-8");
        expect(contentAfter).toBe(contentBefore);
      }
    });
  });

  describe("--skills option", () => {
    /**
     * @testdoc 特定スキルのみ更新する
     * @purpose --skills オプションでフィルタリングが正しく動作することを確認
     */
    it("should update only specified skills", () => {
      setupWithInit();

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--skills", "managing-agents",
        "--force",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<UpdateResult>(result.stdout);
      // Only managing-agents should be in results
      const skillNames = output.skills.map(s => s.name);
      expect(skillNames).toContain("managing-agents");
      expect(skillNames).not.toContain("managing-skills");
    });
  });

  describe("project/ directory protection", () => {
    /**
     * @testdoc project/ ディレクトリを保護する
     * @purpose 更新時に project/ が上書きされないことを確認
     */
    it("should preserve project/ directory during update", () => {
      setupWithInit();

      // Create a project/ directory with custom content
      const projectDir = join(getPluginSkillsDir(), "managing-agents", "project");
      mkdirSync(projectDir, { recursive: true });
      writeFileSync(join(projectDir, "custom.md"), "# My custom project config\n", "utf-8");

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--force",
        "--verbose",
      ]);

      expect(result.status).toBe(0);

      // project/ directory and its contents should still exist
      expect(existsSync(join(projectDir, "custom.md"))).toBe(true);
      const content = readFileSync(join(projectDir, "custom.md"), "utf-8");
      expect(content).toBe("# My custom project config\n");
    });
  });

  describe("local changes detection", () => {
    /**
     * @testdoc ローカル変更があるスキルはスキップする
     * @purpose --force なしでローカル変更の保護が動作することを確認
     */
    it("should skip skills with local changes without --force", () => {
      setupWithInit();

      // Modify a file to create local change
      const testFile = join(getPluginSkillsDir(), "managing-agents", "SKILL.md");
      if (existsSync(testFile)) {
        writeFileSync(testFile, "# Modified locally\n", "utf-8");
      }

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<UpdateResult>(result.stdout);

      // Should be skipped due to local changes
      const agentResult = output.skills.find(s => s.name === "managing-agents");
      expect(agentResult).toBeDefined();
      expect(agentResult!.status).toBe("skipped");
    });
  });

  describe("--with-rules option", () => {
    /**
     * @testdoc ルールも更新する
     * @purpose --with-rules オプションがルールの更新も行うことを確認
     */
    it("should update rules with --with-rules", () => {
      setupWithInit();

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--with-rules",
        "--force",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<UpdateResult>(result.stdout);
      expect(output.rules.length).toBeGreaterThan(0);
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
        "--force",
        "--verbose",
      ]);

      const metaPath = join(TEST_OUTPUT_DIR, ".claude", ".shirokuma-meta.json");
      expect(existsSync(metaPath)).toBe(false);
    });
  });

  describe("output format", () => {
    /**
     * @testdoc --verbose なしで unchanged 行が非表示になる
     * @purpose 変更なしファイルのノイズが抑制されることを確認
     */
    it("should not show unchanged items without --verbose", () => {
      setupWithInit();

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--force",
      ]);

      expect(result.status).toBe(0);
      // unchanged 行が出力されないことを確認
      expect(result.stdout).not.toContain("(unchanged)");
      // サマリーの OK インジケーターが表示されることを確認
      expect(result.stdout).toContain("✓");
      expect(result.stdout).toContain("更新完了");
    });

    /**
     * @testdoc --verbose ありで unchanged 行が表示される
     * @purpose verbose モードで全ファイル一覧が表示されることを確認
     */
    it("should show unchanged items with --verbose", () => {
      setupWithInit();

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--force",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      // verbose 時は unchanged 行が出力される
      expect(result.stdout).toContain("(unchanged)");
    });

    /**
     * @testdoc サマリーに OK/NG インジケーターが表示される
     * @purpose 更新結果の成否が一目でわかることを確認
     */
    it("should show OK indicator in summary", () => {
      setupWithInit();

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--force",
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("✓ スキル:");
      expect(result.stdout).toContain("✓ 更新完了");
    });
  });

  describe("update shortcut command", () => {
    /**
     * @testdoc `update` コマンドが `update-skills --sync` と同等に動作する
     * @purpose 短縮コマンドが正しく --sync モードで実行されることを確認
     */
    it("should work as shortcut for update-skills --sync", () => {
      setupWithInit();

      const result = runCli([
        "update",
        "--project", TEST_OUTPUT_DIR,
        "--force",
        "--dry-run",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("ドライラン");
      // --sync モードのメッセージが含まれることを確認
      expect(result.stdout).toContain("--sync モード");
    });
  });

  describe("--sync option", () => {
    /**
     * @testdoc --sync で upstream の新スキルを検出して追加する
     * @purpose upstream にあるがローカルにないスキルを自動追加
     * @precondition 一部スキルのみインストール済み（手動で削除）
     * @expected upstream にある他のスキルが新規追加として検出される
     */
    it("should detect and add new upstream skills", () => {
      setupWithInit();

      // Remove some installed skills to simulate missing skills
      const skillsToRemove = ["reviewing-on-issue", "publishing", "frontend-designing"];
      for (const skill of skillsToRemove) {
        const skillPath = join(getPluginSkillsDir(), skill);
        if (existsSync(skillPath)) {
          rmSync(skillPath, { recursive: true });
        }
      }

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--sync",
        "--force",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<UpdateResult>(result.stdout);

      // Should have added skills that were removed
      const addedSkills = output.skills.filter(s => s.status === "added");
      expect(addedSkills.length).toBeGreaterThan(0);

      // managing-agents should be updated/unchanged, not added
      const agentResult = output.skills.find(s => s.name === "managing-agents");
      expect(agentResult).toBeDefined();
      expect(agentResult!.status).not.toBe("added");
    });

    /**
     * @testdoc --sync で upstream から削除されたスキルを検出する
     * @purpose ローカルに存在するが upstream にないスキルを報告
     * @precondition ローカルに偽スキル（upstream に存在しない）がある
     * @expected 削除対象として検出されるが --yes なしでは削除されない
     */
    it("should detect removed skills without deleting (no --yes)", () => {
      setupWithInit();

      // Create a fake skill that doesn't exist in bundled plugin
      const fakeSkillDir = join(getPluginSkillsDir(), "obsolete-skill");
      mkdirSync(fakeSkillDir, { recursive: true });
      writeFileSync(join(fakeSkillDir, "SKILL.md"), "# Obsolete\n", "utf-8");

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--sync",
        "--force",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<UpdateResult>(result.stdout);

      // Should detect obsolete-skill as removable
      const obsolete = output.skills.find(s => s.name === "obsolete-skill");
      expect(obsolete).toBeDefined();
      expect(obsolete!.status).toBe("skipped");
      expect(obsolete!.reason).toContain("--yes");

      // Skill directory should still exist (not deleted without --yes)
      expect(existsSync(fakeSkillDir)).toBe(true);
    });

    /**
     * @testdoc --sync --yes で obsolete スキルを実際に削除する
     * @purpose --yes フラグで削除を確認なしで実行
     * @precondition ローカルに偽スキル（upstream に存在しない）がある
     * @expected スキルディレクトリが削除され、status が "removed"
     */
    it("should remove obsolete skills with --sync --yes", () => {
      setupWithInit();

      // Create a fake skill that doesn't exist in bundled plugin
      const fakeSkillDir = join(getPluginSkillsDir(), "obsolete-skill");
      mkdirSync(fakeSkillDir, { recursive: true });
      writeFileSync(join(fakeSkillDir, "SKILL.md"), "# Obsolete\n", "utf-8");

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--sync",
        "--yes",
        "--force",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<UpdateResult>(result.stdout);

      // Should have removed obsolete-skill
      const obsolete = output.skills.find(s => s.name === "obsolete-skill");
      expect(obsolete).toBeDefined();
      expect(obsolete!.status).toBe("removed");

      // Skill directory should be deleted
      expect(existsSync(fakeSkillDir)).toBe(false);
    });

    /**
     * @testdoc --sync --dry-run で変更をプレビューのみ
     * @purpose ドライランでは追加も削除も実行されない
     */
    it("should preview sync changes with --dry-run", () => {
      setupWithInit();

      // Create a fake obsolete skill
      const fakeSkillDir = join(getPluginSkillsDir(), "obsolete-skill");
      mkdirSync(fakeSkillDir, { recursive: true });
      writeFileSync(join(fakeSkillDir, "SKILL.md"), "# Obsolete\n", "utf-8");

      const skillsBefore = readdirSync(getPluginSkillsDir());

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--sync",
        "--yes",
        "--dry-run",
        "--force",
        "--verbose",
      ]);

      expect(result.status).toBe(0);

      // No new directories should be created, no deletions
      const skillsAfter = readdirSync(getPluginSkillsDir());
      expect(skillsAfter).toEqual(skillsBefore);

      // Fake skill should still exist
      expect(existsSync(fakeSkillDir)).toBe(true);
    });

    /**
     * @testdoc --sync --yes でカスタムスキルも削除対象になる（メタ廃止後の動作変更）
     * @purpose メタファイル廃止後はローカルスキルと bundled の差分で検出するため、カスタムスキルも obsolete 扱い
     */
    it("should detect custom skills as obsolete (no metadata protection)", () => {
      setupWithInit();

      // Create a custom skill NOT in bundled plugin
      const customSkillDir = join(getPluginSkillsDir(), "my-custom-skill");
      mkdirSync(customSkillDir, { recursive: true });
      writeFileSync(join(customSkillDir, "SKILL.md"), "# Custom\n", "utf-8");

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--sync",
        "--force",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<UpdateResult>(result.stdout);

      // Without --yes, custom skill should be detected but not deleted
      const customResult = output.skills.find(s => s.name === "my-custom-skill");
      expect(customResult).toBeDefined();
      expect(customResult!.status).toBe("skipped");
      expect(customResult!.reason).toContain("--yes");

      // Custom skill should still exist
      expect(existsSync(customSkillDir)).toBe(true);
    });

    /**
     * @testdoc --sync 後に新規追加スキルがディスクに存在する
     * @purpose 同期後にスキルがディスクに正しく追加される
     */
    it("should restore missing skills after sync", () => {
      setupWithInit();

      // Remove a skill to simulate missing
      const skillPath = join(getPluginSkillsDir(), "reviewing-on-issue");
      if (existsSync(skillPath)) {
        rmSync(skillPath, { recursive: true });
      }

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--sync",
        "--force",
        "--verbose",
      ]);

      expect(result.status).toBe(0);

      // Skill should be restored
      expect(existsSync(skillPath)).toBe(true);
      expect(existsSync(join(skillPath, "SKILL.md"))).toBe(true);
    });

    /**
     * @testdoc --sync がルールも自動的に同期する
     * @purpose --sync モードでは --with-rules を指定しなくてもルールが同期されることを確認（#143 修正）
     */
    it("should automatically sync rules with --sync (no --with-rules needed)", () => {
      setupWithInit();

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--sync",
        "--force",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<UpdateResult>(result.stdout);

      // Rules should be in the result even without --with-rules
      expect(output.rules.length).toBeGreaterThan(0);
      // Should contain the message about sync mode including rules
      expect(result.stdout).toContain("--sync モード");
    });

    /**
     * @testdoc --sync + --with-rules は重複なく動作する
     * @purpose 両方指定しても問題なく動作することを確認
     */
    it("should work with both --sync and --with-rules", () => {
      setupWithInit();

      const result = runCli([
        "update-skills",
        "--project", TEST_OUTPUT_DIR,
        "--sync",
        "--with-rules",
        "--force",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<UpdateResult>(result.stdout);

      expect(output.rules.length).toBeGreaterThan(0);
      // Should NOT show the "sync mode includes rules" message when --with-rules is explicit
      expect(result.stdout).not.toContain("--sync モード: ルールも同期します");
    });
  });
});
