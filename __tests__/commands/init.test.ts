/**
 * init Command Tests
 *
 * Tests for the project initialization command with bundled plugin installation.
 *
 * @testdoc init コマンドのテスト（バンドルプラグインインストール含む）
 */

import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Types
// =============================================================================

interface InitResult {
  config_created: boolean;
  plugin_installed: boolean;
  cache_registered: boolean;
  language_set: boolean;
  gitignore_updated: boolean;
  gitignore_entries_added: number;
  skills_installed: string[];
  rules_installed: string[];
  rules_deployed: number;
  nextjs_scaffolded: boolean;
  nextjs_directories_created: number;
}

// =============================================================================
// Test Constants
// =============================================================================

const CLI_PATH = join(__dirname, "..", "..", "dist", "index.js");
const TEST_OUTPUT_DIR = join(__dirname, "..", "..", ".test-output", "init");

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

// =============================================================================
// Tests
// =============================================================================

describe("init command", () => {
  beforeEach(() => {
    setupTestDir();
  });

  afterEach(() => {
    cleanupTestDir();
  });

  describe("basic functionality", () => {
    /**
     * @testdoc 設定ファイルを作成する
     * @purpose init コマンドが設定ファイルを正しく作成することを確認
     */
    it("should create config file", () => {
      const result = runCli(["init", "--project", TEST_OUTPUT_DIR]);

      expect(result.status).toBe(0);
      expect(existsSync(join(TEST_OUTPUT_DIR, "shirokuma-docs.config.yaml"))).toBe(true);
    });

    /**
     * @testdoc 既存ファイルがある場合はスキップする
     * @purpose --force なしで既存ファイルを上書きしないことを確認
     */
    it("should skip if config already exists without --force", () => {
      // First run
      runCli(["init", "--project", TEST_OUTPUT_DIR]);

      // Second run without --force
      const result = runCli(["init", "--project", TEST_OUTPUT_DIR]);

      expect(result.stdout).toContain("既に存在します");
    });

    /**
     * @testdoc --force はスキル/ルールの再デプロイにのみ適用され、config は上書きしない
     * @purpose --force オプションが config 上書きに使われないことを確認
     */
    it("should NOT overwrite config with --force (force applies to skills/rules only)", () => {
      // First run - create config
      runCli(["init", "--project", TEST_OUTPUT_DIR]);

      // Modify config to verify it's preserved
      const configPath = join(TEST_OUTPUT_DIR, "shirokuma-docs.config.yaml");
      const originalContent = readFileSync(configPath, "utf-8");
      writeFileSync(configPath, originalContent + "\n# Custom comment\n", "utf-8");

      // Second run with --force and --with-skills
      const result = runCli(["init", "--project", TEST_OUTPUT_DIR, "--force", "--with-skills"]);

      expect(result.status).toBe(0);
      // Config should NOT be overwritten
      const newContent = readFileSync(configPath, "utf-8");
      expect(newContent).toContain("# Custom comment");
    });
  });

  describe("--with-skills option (plugin installation)", () => {
    /**
     * @testdoc --with-skills でプラグインがインストール済みとしてマークされる
     * @purpose #486: marketplace + cache 方式のため .claude/plugins/ にはコピーしない
     */
    it("should mark plugin as installed without local copy", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(output.plugin_installed).toBe(true);
      expect(output.skills_installed.length).toBeGreaterThan(0);

      // .claude/plugins/ にはローカルコピーされない（marketplace + cache 方式）
      const pluginDir = join(TEST_OUTPUT_DIR, ".claude", "plugins", "shirokuma-skills-en");
      expect(existsSync(pluginDir)).toBe(false);
    });

    /**
     * @testdoc インストール済みスキルが24個含まれる
     * @purpose 全バンドルスキルがインストールされることを確認
     */
    it("should install all 24 bundled skills", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(output.skills_installed).toHaveLength(24);

      // スキル名リストで検証（ファイルは marketplace + cache にあるためローカルには存在しない）
      expect(output.skills_installed).toContain("managing-agents");
      expect(output.skills_installed).toContain("coding-nextjs");
      expect(output.skills_installed).toContain("reviewing-on-issue");
      expect(output.skills_installed).toContain("publishing");
    });

    /**
     * @testdoc --with-skills=skill1,skill2 でもプラグイン全体がインストールされる
     * @purpose 個別指定でもプラグイン丸ごとインストール（後方互換）
     */
    it("should install full plugin even with specific skill names", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills=coding-nextjs,reviewing-on-issue",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(output.plugin_installed).toBe(true);
      // All skills are installed (plugin is copied as a whole)
      expect(output.skills_installed.length).toBeGreaterThan(2);
    });
  });

  describe("--with-rules option", () => {
    /**
     * @testdoc ルールが .claude/plugins/shirokuma-skills-en/rules/ にインストールされる
     * @purpose --with-rules でルールが正しくインストールされることを確認
     */
    it("should install rules and report them in result", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-rules",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(output.rules_installed.length).toBeGreaterThan(0);

      // ルール名リストで検証（ファイルは bundled/cache から参照）
      expect(output.rules_installed).toContain("skill-authoring.md");
      expect(output.rules_installed).toContain("github/project-items.md");
    });
  });

  describe("no metadata file", () => {
    /**
     * @testdoc .shirokuma-meta.json が作成されない
     * @purpose メタデータファイルが廃止されたことを確認（#401）
     */
    it("should not create .shirokuma-meta.json", () => {
      runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--verbose",
      ]);

      const metaPath = join(TEST_OUTPUT_DIR, ".claude", ".shirokuma-meta.json");
      expect(existsSync(metaPath)).toBe(false);
    });
  });

  describe("gitignore management", () => {
    /**
     * @testdoc .gitignore が作成され、必要なエントリが追加される
     * @purpose init --with-skills で .gitignore が自動管理されることを確認（#402）
     */
    it("should create .gitignore with shirokuma-docs entries", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(output.gitignore_updated).toBe(true);
      expect(output.gitignore_entries_added).toBeGreaterThan(0);

      const gitignorePath = join(TEST_OUTPUT_DIR, ".gitignore");
      expect(existsSync(gitignorePath)).toBe(true);

      const content = readFileSync(gitignorePath, "utf-8");
      expect(content).toContain(".claude/rules/shirokuma/");
    });

    /**
     * @testdoc 既存の .gitignore に重複なくエントリを追加する
     * @purpose 既存エントリと重複しないことを確認
     */
    it("should not duplicate entries in existing .gitignore", () => {
      // Create existing .gitignore with all managed entries already present
      writeFileSync(
        join(TEST_OUTPUT_DIR, ".gitignore"),
        "node_modules/\n.claude/plugins/\n.claude/rules/shirokuma/\n.claude/plans/\n",
        "utf-8",
      );

      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      // All entries already exist, so nothing should be added
      expect(output.gitignore_entries_added).toBe(0);

      const content = readFileSync(join(TEST_OUTPUT_DIR, ".gitignore"), "utf-8");
      // .claude/rules/shirokuma/ should appear exactly once
      const rulesCount = (content.match(/\.claude\/rules\/shirokuma\//g) || []).length;
      expect(rulesCount).toBe(1);
    });

    /**
     * @testdoc --no-gitignore で .gitignore 更新をスキップする
     * @purpose オプトアウトが機能することを確認
     */
    it("should skip .gitignore update with --no-gitignore", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--no-gitignore",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(output.gitignore_updated).toBe(false);

      const gitignorePath = join(TEST_OUTPUT_DIR, ".gitignore");
      expect(existsSync(gitignorePath)).toBe(false);
    });
  });

  describe("plugin structure", () => {
    /**
     * @testdoc 旧エージェントがスキルとして含まれる（#182 でスキルに統合済み）
     * @purpose agents/ は廃止され、fork スキルとして skills/ に統合されたことを確認
     */
    it("should include former agents as fork skills in installed list", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--verbose",
      ]);

      expect(result.status).toBe(0);

      // スキル名リストで検証（#486: ローカルコピーなし、marketplace + cache 方式）
      const output = extractJson<InitResult>(result.stdout);
      expect(output.skills_installed).toContain("researching-best-practices");
      expect(output.skills_installed).toContain("reviewing-on-issue");
      expect(output.skills_installed).toContain("reviewing-claude-config");
    });

    /**
     * @testdoc 標準パスにはコピーしない（--plugin-dir でロード）
     * @purpose プラグインのコンテンツが標準パスに散らばらないことを確認
     */
    it("should not copy to standard .claude/ paths", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--verbose",
      ]);

      expect(result.status).toBe(0);

      // Standard paths should not exist (plugin is loaded via --plugin-dir)
      expect(existsSync(join(TEST_OUTPUT_DIR, ".claude", "skills"))).toBe(false);
      expect(existsSync(join(TEST_OUTPUT_DIR, ".claude", "agents"))).toBe(false);
    });
  });

  describe("combined options", () => {
    /**
     * @testdoc 全オプションを組み合わせて使用する
     * @purpose --with-skills --with-rules を同時に使用できることを確認
     */
    it("should work with all options combined", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--with-rules",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(output.config_created).toBe(true);
      expect(output.plugin_installed).toBe(true);
      expect(output.skills_installed.length).toBeGreaterThan(0);
      expect(output.rules_installed.length).toBeGreaterThan(0);
    });
  });

  describe("--lang option", () => {
    /**
     * @testdoc --lang ja で .claude/settings.json に japanese が設定される
     * @purpose --lang ja が settings.json に正しく書き込まれることを確認
     */
    it("should set language to japanese in settings.json with --lang ja", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--lang", "ja",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(output.language_set).toBe(true);

      const settingsPath = join(TEST_OUTPUT_DIR, ".claude", "settings.json");
      expect(existsSync(settingsPath)).toBe(true);
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      expect(settings.language).toBe("japanese");
    });

    /**
     * @testdoc --lang en で .claude/settings.json に english が設定される
     * @purpose --lang en が settings.json に正しく書き込まれることを確認
     */
    it("should set language to english in settings.json with --lang en", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--lang", "en",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(output.language_set).toBe(true);

      const settingsPath = join(TEST_OUTPUT_DIR, ".claude", "settings.json");
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      expect(settings.language).toBe("english");
    });

    /**
     * @testdoc --lang なしでは settings.json を作成しない
     * @purpose --lang 未指定時に settings.json に言語設定が追加されないことを確認
     */
    it("should not create settings.json without --lang", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(output.language_set).toBe(false);

      // settings.json should not exist (or not have language key)
      const settingsPath = join(TEST_OUTPUT_DIR, ".claude", "settings.json");
      if (existsSync(settingsPath)) {
        const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
        expect(settings.language).toBeUndefined();
      }
    });

    /**
     * @testdoc 既存の settings.json にマージする
     * @purpose 既存設定を壊さずに language を追加できることを確認
     */
    it("should merge language into existing settings.json", () => {
      // Create existing settings.json
      const claudeDir = join(TEST_OUTPUT_DIR, ".claude");
      mkdirSync(claudeDir, { recursive: true });
      const settingsPath = join(claudeDir, "settings.json");
      writeFileSync(settingsPath, JSON.stringify({
        enabledPlugins: { "test-plugin": true },
      }, null, 2) + "\n", "utf-8");

      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--lang", "ja",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      expect(settings.language).toBe("japanese");
      expect(settings.enabledPlugins["test-plugin"]).toBe(true);
    });

    /**
     * @testdoc 無効な --lang 値はエラーになる
     * @purpose 不正な言語コードが拒否されることを確認
     */
    it("should reject invalid --lang value", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--lang", "fr",
      ]);

      expect(result.status).not.toBe(0);
    });

    /**
     * @testdoc --lang のみで --with-skills なしでも settings.json に書き込む
     * @purpose 既存プロジェクトで --lang だけ指定しても動作することを確認
     */
    it("should write settings.json with --lang only (no --with-skills)", () => {
      // First create a project with config
      runCli(["init", "--project", TEST_OUTPUT_DIR]);

      // Then set language only
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--lang", "ja",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(output.language_set).toBe(true);

      const settingsPath = join(TEST_OUTPUT_DIR, ".claude", "settings.json");
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
      expect(settings.language).toBe("japanese");
    });
  });

  describe("cache registration", () => {
    /**
     * @testdoc cache_registered フィールドが結果に含まれる
     * @purpose init 結果に cache_registered フィールドが存在することを確認
     */
    it("should include cache_registered field in result", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(typeof output.cache_registered).toBe("boolean");
    });

    /**
     * @testdoc claude CLI が利用可能な場合はキャッシュ登録を試みる
     * @purpose init --with-skills がキャッシュ登録メッセージを出力することを確認
     */
    it("should attempt cache registration when plugin is installed", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
      ]);

      expect(result.status).toBe(0);
      // Should show either:
      // - Success message (claude plugin install succeeded)
      // - Skip/failure message (claude CLI not found or install failed)
      const hasRegistrationAttempt =
        result.stdout.includes("グローバルキャッシュに登録") ||
        result.stdout.includes("キャッシュ登録に失敗") ||
        result.stdout.includes("claude CLI が見つかりません");
      expect(hasRegistrationAttempt).toBe(true);
    });

    /**
     * @testdoc 次のステップのガイダンスにプラグイン登録コマンドが表示される
     * @purpose キャッシュ未登録時に手動コマンドがガイダンスに含まれることを確認
     */
    it("should show next steps guidance with plugin registration command", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
      ]);

      expect(result.status).toBe(0);
      // Next steps should include plugin registration command
      expect(result.stdout).toContain("次のステップ");
      expect(result.stdout).toContain("shirokuma-docs.config.yaml");
    });
  });

  describe("setup check integration", () => {
    /**
     * @testdoc init --with-skills が GitHub セットアップ検証を実行する
     * @purpose init 完了時に session check --setup 相当の検証が動的に表示されることを確認
     */
    it("should run GitHub setup validation in next steps", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
      ]);

      expect(result.status).toBe(0);
      // 動的検証が成功した場合: カテゴリ別の結果が表示される
      // フォールバックの場合: テキストベースの案内が表示される
      const hasDynamicResults =
        result.stdout.includes("Discussion Categories") ||
        result.stdout.includes("Project Setup");
      const hasFallback = result.stdout.includes("Discussion カテゴリ作成");
      expect(hasDynamicResults || hasFallback).toBe(true);
    });

    /**
     * @testdoc init --with-skills が discussion-templates の案内を表示する
     * @purpose Discussion テンプレート生成の推奨タイミングが案内に含まれることを確認
     */
    it("should show discussion-templates guidance in next steps", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
      ]);

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("discussion-templates generate");
    });
  });

  describe("--nextjs option", () => {
    /**
     * @testdoc --nextjs でモノレポ設定テンプレートが生成される
     * @purpose --nextjs 指定時に Next.js モノレポ向け設定ファイルが作成されることを確認
     * @precondition テスト用ディレクトリが空の状態
     * @expected 設定ファイルに apps/web と packages/database のパスが含まれる
     */
    it("should create config with nextjs monorepo template", () => {
      const result = runCli(["init", "--nextjs", "--project", TEST_OUTPUT_DIR]);

      expect(result.status).toBe(0);
      const configPath = join(TEST_OUTPUT_DIR, "shirokuma-docs.config.yaml");
      expect(existsSync(configPath)).toBe(true);
      const config = readFileSync(configPath, "utf-8");
      expect(config).toContain("apps/web");
      expect(config).toContain("packages/database");
    });

    /**
     * @testdoc --nextjs でモノレポディレクトリ構造が生成される
     * @purpose apps/ と packages/ のディレクトリ構造が正しく作成されることを確認
     * @precondition テスト用ディレクトリが空の状態
     * @expected apps/web, packages/database, packages/shared が作成される
     */
    it("should scaffold monorepo directory structure", () => {
      const result = runCli(["init", "--nextjs", "--project", TEST_OUTPUT_DIR]);

      expect(result.status).toBe(0);
      expect(existsSync(join(TEST_OUTPUT_DIR, "apps", "web"))).toBe(true);
      expect(existsSync(join(TEST_OUTPUT_DIR, "packages", "database"))).toBe(true);
      expect(existsSync(join(TEST_OUTPUT_DIR, "packages", "shared"))).toBe(true);
    });

    /**
     * @testdoc --nextjs で git init が実行される
     * @purpose --nextjs 指定時に git リポジトリが初期化されることを確認
     * @precondition テスト用ディレクトリに .git が存在しない
     * @expected .git ディレクトリが生成される
     */
    it("should initialize git repository", () => {
      const result = runCli(["init", "--nextjs", "--project", TEST_OUTPUT_DIR]);

      expect(result.status).toBe(0);
      expect(existsSync(join(TEST_OUTPUT_DIR, ".git"))).toBe(true);
    });

    /**
     * @testdoc --nextjs --lang ja で設定ファイルが生成される
     * @purpose --nextjs と --lang ja の組み合わせが機能することを確認
     * @precondition テスト用ディレクトリが空の状態
     * @expected settings.json に japanese が設定される
     */
    it("should work with --lang ja", () => {
      const result = runCli([
        "init",
        "--nextjs",
        "--lang", "ja",
        "--project", TEST_OUTPUT_DIR,
      ]);

      expect(result.status).toBe(0);
      expect(existsSync(join(TEST_OUTPUT_DIR, "shirokuma-docs.config.yaml"))).toBe(true);
      const settingsPath = join(TEST_OUTPUT_DIR, ".claude", "settings.json");
      expect(existsSync(settingsPath)).toBe(true);
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as Record<string, unknown>;
      expect(settings.language).toBe("japanese");
    });

    /**
     * @testdoc --nextjs --with-skills が組み合わせて使用できる
     * @purpose --nextjs と --with-skills の組み合わせが機能することを確認
     * @precondition テスト用ディレクトリが空の状態
     * @expected config_created と plugin_installed が true
     */
    it("should work with --with-skills", () => {
      const result = runCli([
        "init",
        "--nextjs",
        "--with-skills",
        "--verbose",
        "--project", TEST_OUTPUT_DIR,
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(output.config_created).toBe(true);
      expect(output.plugin_installed).toBe(true);
      expect(existsSync(join(TEST_OUTPUT_DIR, "apps", "web"))).toBe(true);
    });

    /**
     * @testdoc --nextjs は既存ディレクトリをスキップする
     * @purpose 既存のディレクトリ内容が上書きされないことを確認
     * @precondition apps/web に既存ファイルが存在する
     * @expected 既存ファイルが保持される
     */
    it("should skip existing directories without overwriting files", () => {
      mkdirSync(join(TEST_OUTPUT_DIR, "apps", "web"), { recursive: true });
      const testFile = join(TEST_OUTPUT_DIR, "apps", "web", "existing.txt");
      writeFileSync(testFile, "existing content", "utf-8");

      const result = runCli(["init", "--nextjs", "--project", TEST_OUTPUT_DIR]);

      expect(result.status).toBe(0);
      expect(existsSync(testFile)).toBe(true);
      expect(readFileSync(testFile, "utf-8")).toBe("existing content");
    });

    /**
     * @testdoc --nextjs でモノレポ root package.json が生成される
     * @purpose ワークスペース設定を含む root package.json が作成されることを確認
     * @precondition テスト用ディレクトリに package.json が存在しない
     * @expected package.json に workspaces フィールドが含まれる
     */
    it("should create root package.json with workspaces", () => {
      const result = runCli(["init", "--nextjs", "--project", TEST_OUTPUT_DIR]);

      expect(result.status).toBe(0);
      const pkgPath = join(TEST_OUTPUT_DIR, "package.json");
      expect(existsSync(pkgPath)).toBe(true);
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as Record<string, unknown>;
      expect(pkg.workspaces).toBeDefined();
    });

    /**
     * @testdoc --nextjs --verbose で nextjs_scaffolded が true になる
     * @purpose verbose 出力に nextjs_scaffolded フィールドが含まれることを確認
     * @precondition テスト用ディレクトリが空の状態
     * @expected verbose JSON 出力に nextjs_scaffolded: true が含まれる
     */
    it("should report nextjs_scaffolded in verbose output", () => {
      const result = runCli([
        "init",
        "--nextjs",
        "--verbose",
        "--project", TEST_OUTPUT_DIR,
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(output.nextjs_scaffolded).toBe(true);
      expect(output.nextjs_directories_created).toBeGreaterThan(0);
    });
  });

  describe("language-based rule deployment (#636)", () => {
    /**
     * @testdoc --lang ja でルールが日本語プラグインからデプロイされる
     * @purpose --lang ja 指定時に JA プラグインのルールがデプロイされることを確認
     */
    it("should deploy JA rules when --lang ja is specified", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--with-rules",
        "--lang", "ja",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(output.rules_installed.length).toBeGreaterThan(0);

      // デプロイされたルールに日本語コンテンツが含まれることを確認
      const rulesDir = join(TEST_OUTPUT_DIR, ".claude", "rules", "shirokuma");
      expect(existsSync(rulesDir)).toBe(true);

      // best-practices-first.md は JA/EN 共通で存在するルール
      const bestPracticesPath = join(rulesDir, "best-practices-first.md");
      if (existsSync(bestPracticesPath)) {
        const content = readFileSync(bestPracticesPath, "utf-8");
        // JA ルールには日本語が含まれる
        expect(content).toMatch(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/);
      }
    });

    /**
     * @testdoc --lang en でルールが英語プラグインからデプロイされる
     * @purpose --lang en 指定時に EN プラグインのルールがデプロイされることを確認
     */
    it("should deploy EN rules when --lang en is specified", () => {
      const result = runCli([
        "init",
        "--project", TEST_OUTPUT_DIR,
        "--with-skills",
        "--with-rules",
        "--lang", "en",
        "--verbose",
      ]);

      expect(result.status).toBe(0);
      const output = extractJson<InitResult>(result.stdout);
      expect(output.rules_installed.length).toBeGreaterThan(0);

      // デプロイされたルールが英語であることを確認
      const rulesDir = join(TEST_OUTPUT_DIR, ".claude", "rules", "shirokuma");
      expect(existsSync(rulesDir)).toBe(true);

      const bestPracticesPath = join(rulesDir, "best-practices-first.md");
      if (existsSync(bestPracticesPath)) {
        const content = readFileSync(bestPracticesPath, "utf-8");
        // EN ルールのタイトルは英語
        expect(content).toContain("Best Practices");
      }
    });
  });
});
