/**
 * skills-repo rule deployment tests
 *
 * Tests for deployRules(), cleanDeployedRules(), and getBundledRuleNames().
 * The shirokuma/ directory is fully owned by shirokuma-docs, so files are
 * always overwritten without conflict detection or managed-by headers.
 *
 * @testdoc ルールデプロイ機能のテスト
 */

import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getBundledRuleNames,
  deployRules,
  cleanDeployedRules,
  DEPLOYED_RULES_DIR,
} from "../../src/utils/skills-repo.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DIR = join(
  __dirname,
  "..",
  "..",
  ".test-output",
  "skills-repo-deploy",
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
// Bundled Rule Names
// ========================================

describe("getBundledRuleNames", () => {
  /**
   * @testdoc バンドルされた全ルールファイルを返す
   */
  it("should return all bundled rule files", () => {
    const rules = getBundledRuleNames();
    expect(rules.length).toBeGreaterThanOrEqual(18);
  });

  /**
   * @testdoc サブディレクトリのルールがプレフィックス付きで返される
   */
  it("should return rules with subdirectory prefixes", () => {
    const rules = getBundledRuleNames();
    expect(rules).toContain("github/project-items.md");
    expect(rules).toContain("nextjs/tech-stack.md");
    expect(rules).toContain("shirokuma-docs/shirokuma-annotations.md");
  });

  /**
   * @testdoc ルートレベルのルールを含む
   */
  it("should include root-level rules", () => {
    const rules = getBundledRuleNames();
    expect(rules).toContain("best-practices-first.md");
    expect(rules).toContain("git-commit-style.md");
    expect(rules).toContain("config-authoring-flow.md");
  });

  /**
   * @testdoc .gitkeep ファイルを含まない
   */
  it("should not include non-markdown files", () => {
    const rules = getBundledRuleNames();
    for (const rule of rules) {
      expect(rule).toMatch(/\.md$/);
    }
  });

  /**
   * @testdoc ソート済みの配列を返す
   */
  it("should return sorted array", () => {
    const rules = getBundledRuleNames();
    const sorted = [...rules].sort();
    expect(rules).toEqual(sorted);
  });
});

// ========================================
// Deploy Rules
// ========================================

describe("deployRules", () => {
  /**
   * @testdoc 全ルールを .claude/rules/shirokuma/ にデプロイする
   */
  it("should deploy all rules to .claude/rules/shirokuma/", async () => {
    const projectPath = join(TEST_DIR, "deploy-all");
    mkdirSync(projectPath, { recursive: true });

    const result = await deployRules(projectPath);

    expect(result.deployed.length).toBeGreaterThanOrEqual(18);
    const deployed = result.deployed.filter(r => r.status === "deployed");
    expect(deployed.length).toBeGreaterThanOrEqual(18);

    // Check files exist
    const targetDir = join(projectPath, DEPLOYED_RULES_DIR);
    expect(existsSync(join(targetDir, "best-practices-first.md"))).toBe(true);
    expect(existsSync(join(targetDir, "github", "project-items.md"))).toBe(true);
    expect(existsSync(join(targetDir, "nextjs", "tech-stack.md"))).toBe(true);
  });

  /**
   * @testdoc デプロイしたファイルがソースと同一内容（ヘッダーなし）
   */
  it("should deploy files without managed-by header", async () => {
    const projectPath = join(TEST_DIR, "deploy-no-header");
    mkdirSync(projectPath, { recursive: true });

    await deployRules(projectPath);

    const content = readFileSync(
      join(projectPath, DEPLOYED_RULES_DIR, "best-practices-first.md"),
      "utf-8",
    );
    // Should NOT start with managed-by header
    expect(content.startsWith("<!--")).toBe(false);
    // Should start with actual rule content
    expect(content.startsWith("#")).toBe(true);
  });

  /**
   * @testdoc 再デプロイ時にunchangedを返す（冪等性）
   */
  it("should be idempotent (re-deploy returns unchanged)", async () => {
    const projectPath = join(TEST_DIR, "deploy-idempotent");
    mkdirSync(projectPath, { recursive: true });

    // First deploy
    await deployRules(projectPath);

    // Second deploy
    const result = await deployRules(projectPath);
    const unchanged = result.deployed.filter(r => r.status === "unchanged");
    expect(unchanged.length).toBeGreaterThanOrEqual(18);
  });

  /**
   * @testdoc 既存ファイルを常に上書きする（conflict detectionなし）
   */
  it("should always overwrite existing files", async () => {
    const projectPath = join(TEST_DIR, "deploy-overwrite");
    mkdirSync(projectPath, { recursive: true });

    // First deploy
    await deployRules(projectPath);

    // Modify a deployed file
    const filePath = join(projectPath, DEPLOYED_RULES_DIR, "best-practices-first.md");
    writeFileSync(filePath, "# User Modified\nCustom content", "utf-8");

    // Re-deploy should overwrite
    const result = await deployRules(projectPath);
    const updated = result.deployed.find(r => r.name === "best-practices-first.md");
    expect(updated?.status).toBe("updated");

    // File should have original source content
    const content = readFileSync(filePath, "utf-8");
    expect(content).not.toBe("# User Modified\nCustom content");
    expect(content.startsWith("#")).toBe(true);
  });

  /**
   * @testdoc dry-runモードでファイルを書き込まない
   */
  it("should not write files in dry-run mode", async () => {
    const projectPath = join(TEST_DIR, "deploy-dryrun");
    mkdirSync(projectPath, { recursive: true });

    const result = await deployRules(projectPath, { dryRun: true });

    expect(result.deployed.length).toBeGreaterThanOrEqual(18);
    const deployed = result.deployed.filter(r => r.status === "deployed");
    expect(deployed.length).toBeGreaterThanOrEqual(18);

    // No files should be written
    expect(existsSync(join(projectPath, DEPLOYED_RULES_DIR))).toBe(false);
  });

  /**
   * @testdoc サブディレクトリ構造を正しく作成する
   */
  it("should create subdirectory structure", async () => {
    const projectPath = join(TEST_DIR, "deploy-dirs");
    mkdirSync(projectPath, { recursive: true });

    await deployRules(projectPath);

    const targetDir = join(projectPath, DEPLOYED_RULES_DIR);
    expect(existsSync(join(targetDir, "github"))).toBe(true);
    expect(existsSync(join(targetDir, "nextjs"))).toBe(true);
    expect(existsSync(join(targetDir, "shirokuma-docs"))).toBe(true);
  });
});

// ========================================
// Clean Deployed Rules
// ========================================

describe("cleanDeployedRules", () => {
  /**
   * @testdoc ディレクトリ全体を削除する
   */
  it("should remove entire shirokuma/ directory", async () => {
    const projectPath = join(TEST_DIR, "clean-all");
    mkdirSync(projectPath, { recursive: true });

    // Deploy first
    await deployRules(projectPath);

    // Clean
    const results = await cleanDeployedRules(projectPath);
    const removed = results.filter(r => r.status === "removed");
    expect(removed.length).toBeGreaterThanOrEqual(18);

    // Directory should be completely gone
    expect(existsSync(join(projectPath, DEPLOYED_RULES_DIR))).toBe(false);
  });

  /**
   * @testdoc ユーザーファイルも含めて全て削除する（ディレクトリ所有権）
   */
  it("should remove user files within shirokuma/ directory", async () => {
    const projectPath = join(TEST_DIR, "clean-with-user-files");
    mkdirSync(projectPath, { recursive: true });

    // Deploy first
    await deployRules(projectPath);

    // Add a user file inside shirokuma/
    const userFile = join(projectPath, DEPLOYED_RULES_DIR, "user-rule.md");
    writeFileSync(userFile, "# User Rule\nCustom content", "utf-8");

    // Clean should remove everything including user files
    const results = await cleanDeployedRules(projectPath);
    const removed = results.filter(r => r.status === "removed");
    expect(removed.some(r => r.name === "user-rule.md")).toBe(true);

    // Directory should be completely gone
    expect(existsSync(join(projectPath, DEPLOYED_RULES_DIR))).toBe(false);
  });

  /**
   * @testdoc ターゲットディレクトリが存在しない場合は空配列を返す
   */
  it("should return empty array when target directory does not exist", async () => {
    const projectPath = join(TEST_DIR, "clean-nonexistent");
    mkdirSync(projectPath, { recursive: true });

    const results = await cleanDeployedRules(projectPath);
    expect(results).toEqual([]);
  });

  /**
   * @testdoc dry-runモードでファイルを削除しない
   */
  it("should not delete files in dry-run mode", async () => {
    const projectPath = join(TEST_DIR, "clean-dryrun");
    mkdirSync(projectPath, { recursive: true });

    // Deploy first
    await deployRules(projectPath);

    // Clean (dry-run)
    const results = await cleanDeployedRules(projectPath, { dryRun: true });
    const removed = results.filter(r => r.status === "removed");
    expect(removed.length).toBeGreaterThanOrEqual(18);

    // Files should still exist
    expect(existsSync(join(projectPath, DEPLOYED_RULES_DIR, "best-practices-first.md"))).toBe(true);
  });
});
