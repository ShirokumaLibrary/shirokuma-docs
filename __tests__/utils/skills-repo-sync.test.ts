/**
 * skills-repo bundled plugin utility tests
 *
 * Tests for getBundledPluginPath(),
 * getPackageVersion(), and validation functions.
 *
 * @testdoc バンドルプラグインユーティリティのテスト
 */

import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getBundledPluginPath,
  getPackageVersion,
  isValidSkillName,
  isValidSkill,
  getEffectivePluginDir,
  updateGitignore,
  AVAILABLE_SKILLS,
  AVAILABLE_RULES,
  PLUGIN_NAME,
  GITIGNORE_ENTRIES,
} from "../../src/utils/skills-repo.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(
  __dirname,
  "..",
  "..",
  ".test-output",
  "skills-repo-sync",
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

function createSkillDir(baseDir: string, skillName: string): void {
  const skillsDir = join(baseDir, "skills", skillName);
  mkdirSync(skillsDir, { recursive: true });
  writeFileSync(join(skillsDir, "SKILL.md"), `# ${skillName}\n`, "utf-8");
}

function createPluginStructure(baseDir: string, skillNames: string[]): void {
  mkdirSync(join(baseDir, "skills"), { recursive: true });
  mkdirSync(join(baseDir, "rules"), { recursive: true });
  mkdirSync(join(baseDir, ".claude-plugin"), { recursive: true });
  writeFileSync(
    join(baseDir, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name: "shirokuma-skills-en", version: "0.1.0" }),
    "utf-8",
  );
  for (const name of skillNames) {
    createSkillDir(baseDir, name);
  }
}

// ========================================
// Constants
// ========================================

describe("PLUGIN_NAME", () => {
  /**
   * @testdoc プラグイン名が "shirokuma-skills-en" であること
   */
  it("should be 'shirokuma-skills-en'", () => {
    expect(PLUGIN_NAME).toBe("shirokuma-skills-en");
  });
});

describe("AVAILABLE_SKILLS", () => {
  /**
   * @testdoc 23個のスキルが定義されている
   */
  it("should contain 23 skills", () => {
    expect(AVAILABLE_SKILLS).toHaveLength(23);
  });

  /**
   * @testdoc 実際のスキルディレクトリ名と一致する
   */
  it("should contain all actual skill directory names", () => {
    const expected = [
      "managing-agents",
      "managing-skills",
      "managing-plugins",
      "managing-output-styles",
      "managing-rules",
      "coding-nextjs",
      "designing-shadcn-ui",
      "reviewing-on-issue",
      "discovering-codebase-rules",
      "working-on-issue",
      "committing-on-issue",
      "creating-pr-on-issue",
      "starting-session",
      "ending-session",
      "showing-github",
      "managing-github-items",
      "project-config-generator",
      "publishing",
      "researching-best-practices",
      "reviewing-claude-config",
      "planning-on-issue",
      "creating-item",
      "setting-up-project",
    ];
    for (const skill of expected) {
      expect(AVAILABLE_SKILLS).toContain(skill);
    }
  });

  /**
   * @testdoc 旧名のスキル名が含まれていない
   */
  it("should not contain old skill names", () => {
    const oldNames = [
      "session-management",
      "start-session",
      "end-session",
      "show-dashboard",
      "show-handovers",
      "show-issues",
      "show-project-items",
      "show-specs",
      "create-item",
      "create-spec",
      "add-issue-comment",
      "manage-labels",
      "committing",
      "creating-pull-request",
      "nextjs-vibe-coding",
      "frontend-designing",
    ];
    for (const name of oldNames) {
      expect(AVAILABLE_SKILLS).not.toContain(name);
    }
  });
});

describe("AVAILABLE_RULES", () => {
  /**
   * @testdoc 12個のルールが定義されている（nextjs/ 7件は knowledge-manager に移行済み）
   */
  it("should contain 12 rules", () => {
    expect(AVAILABLE_RULES).toHaveLength(12);
  });

  /**
   * @testdoc 全ルールファイル名を含む
   */
  it("should contain all rule file paths", () => {
    const expected = [
      "best-practices-first.md",
      "config-authoring-flow.md",
      "git-commit-style.md",
      "output-destinations.md",
      "skill-authoring.md",
      "github/branch-workflow.md",
      "github/discussions-usage.md",
      "github/pr-review-response.md",
      "github/project-items.md",
      "shirokuma-docs/cli-invocation.md",
      "shirokuma-docs/plugin-cache.md",
      "shirokuma-docs/shirokuma-annotations.md",
    ];
    for (const rule of expected) {
      expect(AVAILABLE_RULES).toContain(rule);
    }
  });
});

// ========================================
// Validation
// ========================================

describe("isValidSkillName", () => {
  /**
   * @testdoc 有効なスキル名（小文字英数字とハイフン）を受け入れる
   */
  it("should accept valid skill names", () => {
    expect(isValidSkillName("managing-agents")).toBe(true);
    expect(isValidSkillName("reviewing-on-issue")).toBe(true);
    expect(isValidSkillName("my-skill")).toBe(true);
    expect(isValidSkillName("skill123")).toBe(true);
    expect(isValidSkillName("a")).toBe(true);
  });

  /**
   * @testdoc パストラバーサル文字を含む名前を拒否する
   */
  it("should reject names with path traversal", () => {
    expect(isValidSkillName("../etc/passwd")).toBe(false);
    expect(isValidSkillName("./skill")).toBe(false);
    expect(isValidSkillName("skill/nested")).toBe(false);
    expect(isValidSkillName("..")).toBe(false);
  });

  /**
   * @testdoc 特殊文字を含む名前を拒否する
   */
  it("should reject names with special characters", () => {
    expect(isValidSkillName("skill name")).toBe(false);
    expect(isValidSkillName("skill_name")).toBe(false);
    expect(isValidSkillName("skill.name")).toBe(false);
    expect(isValidSkillName("UPPERCASE")).toBe(false);
    expect(isValidSkillName("")).toBe(false);
  });

  /**
   * @testdoc 隠しディレクトリ名を拒否する
   */
  it("should reject hidden directories", () => {
    expect(isValidSkillName(".hidden")).toBe(false);
    expect(isValidSkillName(".git")).toBe(false);
  });
});

describe("isValidSkill", () => {
  /**
   * @testdoc AVAILABLE_SKILLS に含まれるスキル名を受け入れる
   */
  it("should accept skills in AVAILABLE_SKILLS", () => {
    expect(isValidSkill("managing-agents")).toBe(true);
    expect(isValidSkill("starting-session")).toBe(true);
    expect(isValidSkill("publishing")).toBe(true);
  });

  /**
   * @testdoc AVAILABLE_SKILLS に含まれない名前を拒否する
   */
  it("should reject skills not in AVAILABLE_SKILLS", () => {
    expect(isValidSkill("nonexistent-skill")).toBe(false);
    expect(isValidSkill("start-session")).toBe(false);
    expect(isValidSkill("session-management")).toBe(false);
  });
});

// ========================================
// Bundled Plugin Path
// ========================================

describe("getBundledPluginPath", () => {
  /**
   * @testdoc バンドルプラグインディレクトリのパスを返す
   */
  it("should return path to bundled plugin directory", () => {
    const pluginPath = getBundledPluginPath();
    expect(pluginPath).toMatch(/plugin\/shirokuma-skills-en$/);
    expect(existsSync(pluginPath)).toBe(true);
  });

  /**
   * @testdoc バンドルパスに .claude-plugin/plugin.json が存在する
   */
  it("should contain .claude-plugin/plugin.json", () => {
    const pluginPath = getBundledPluginPath();
    expect(existsSync(join(pluginPath, ".claude-plugin", "plugin.json"))).toBe(true);
  });

  /**
   * @testdoc バンドルパスに skills/ ディレクトリが存在する
   */
  it("should contain skills/ directory", () => {
    const pluginPath = getBundledPluginPath();
    expect(existsSync(join(pluginPath, "skills"))).toBe(true);
  });

  /**
   * @testdoc バンドルパスに rules/ ディレクトリが存在する
   */
  it("should contain rules/ directory", () => {
    const pluginPath = getBundledPluginPath();
    expect(existsSync(join(pluginPath, "rules"))).toBe(true);
  });
});

// ========================================
// Package Version
// ========================================

describe("getPackageVersion", () => {
  /**
   * @testdoc package.json からバージョンを取得する
   */
  it("should return version from package.json", () => {
    const version = getPackageVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });

  /**
   * @testdoc バージョンが "unknown" でない
   */
  it("should not return 'unknown'", () => {
    expect(getPackageVersion()).not.toBe("unknown");
  });
});

describe("getEffectivePluginDir", () => {
  /**
   * @testdoc 外部プロジェクトではグローバルキャッシュまたは bundled フォールバックを返す
   * @purpose #486: marketplace + cache 方式でプラグインを配置
   */
  it("should return global cache or bundled fallback for external projects", () => {
    const externalPath = join(TEST_DIR, "external-project-dir");
    mkdirSync(externalPath, { recursive: true });
    const result = getEffectivePluginDir(externalPath);
    // グローバルキャッシュがあればキャッシュパス、なければ bundled パス
    expect(result).toMatch(/shirokuma-skills-en/);
    expect(existsSync(result)).toBe(true);
  });
});

// ========================================
// Gitignore Management
// ========================================

describe("updateGitignore", () => {
  /**
   * @testdoc .gitignore がない場合は新規作成してエントリを追加する
   */
  it("should create .gitignore with all entries when file does not exist", () => {
    const projectPath = join(TEST_DIR, "test-gitignore-new");
    mkdirSync(projectPath, { recursive: true });

    const result = updateGitignore(projectPath);

    expect(result.added).toEqual(GITIGNORE_ENTRIES);
    expect(result.alreadyPresent).toEqual([]);

    const content = readFileSync(join(projectPath, ".gitignore"), "utf-8");
    for (const entry of GITIGNORE_ENTRIES) {
      expect(content).toContain(entry);
    }
    expect(content).toContain("# shirokuma-docs");
  });

  /**
   * @testdoc 既存エントリと重複しないこと
   */
  it("should not add duplicate entries", () => {
    const projectPath = join(TEST_DIR, "test-gitignore-dup");
    mkdirSync(projectPath, { recursive: true });

    // 既に一部エントリがある .gitignore を作成
    writeFileSync(
      join(projectPath, ".gitignore"),
      "node_modules/\n.claude/rules/shirokuma/\n",
      "utf-8",
    );

    const result = updateGitignore(projectPath);

    expect(result.alreadyPresent).toContain(".claude/rules/shirokuma/");
    expect(result.added).not.toContain(".claude/rules/shirokuma/");
    // .claude/plans/ is not in existing .gitignore, so it should be added
    expect(result.added).toContain(".claude/plans/");
  });

  /**
   * @testdoc 全エントリが既に存在する場合は何も追加しない
   */
  it("should add nothing when all entries already present", () => {
    const projectPath = join(TEST_DIR, "test-gitignore-all");
    mkdirSync(projectPath, { recursive: true });

    writeFileSync(
      join(projectPath, ".gitignore"),
      GITIGNORE_ENTRIES.join("\n") + "\n",
      "utf-8",
    );

    const result = updateGitignore(projectPath);

    expect(result.added).toEqual([]);
    expect(result.alreadyPresent).toEqual(GITIGNORE_ENTRIES);
  });

  /**
   * @testdoc dryRun ではファイルを変更しない
   */
  it("should not write file in dryRun mode", () => {
    const projectPath = join(TEST_DIR, "test-gitignore-dry");
    mkdirSync(projectPath, { recursive: true });

    const result = updateGitignore(projectPath, { dryRun: true });

    expect(result.added.length).toBeGreaterThan(0);
    expect(existsSync(join(projectPath, ".gitignore"))).toBe(false);
  });

  /**
   * @testdoc セクションコメントが追加される
   */
  it("should add section comment", () => {
    const projectPath = join(TEST_DIR, "test-gitignore-comment");
    mkdirSync(projectPath, { recursive: true });

    updateGitignore(projectPath);

    const content = readFileSync(join(projectPath, ".gitignore"), "utf-8");
    expect(content).toContain("# shirokuma-docs (managed by shirokuma-docs init)");
  });
});
