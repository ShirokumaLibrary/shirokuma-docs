/**
 * Bundled plugin utilities for shirokuma-skills-en
 *
 * @description Constants, validators, and helpers for installing/updating
 * the bundled shirokuma-skills-en plugin. Skills and rules are bundled in
 * the plugin/ directory within the shirokuma-docs npm package.
 */

import { join, dirname } from "node:path";
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import { createLogger } from "./logger.js";

// ========================================
// Constants
// ========================================

/**
 * Plugin name for the bundled skills/rules package
 */
export const PLUGIN_NAME = "shirokuma-skills-en";

/**
 * Japanese language plugin name (parallel plugin for i18n)
 */
export const PLUGIN_NAME_JA = "shirokuma-skills-ja";

/**
 * Hooks-only plugin name (language-independent safety hooks)
 */
export const PLUGIN_NAME_HOOKS = "shirokuma-hooks";

/**
 * Available skills list (matches actual plugin/skills/ directory names)
 */
export const AVAILABLE_SKILLS = [
  // Meta skills (managing Claude Code configuration)
  "managing-agents",
  "managing-skills",
  "managing-plugins",
  "managing-output-styles",
  "managing-rules",
  // Development skills
  "coding-nextjs",
  "designing-shadcn-ui",
  "reviewing-on-issue",
  "discovering-codebase-rules",
  // Fork skills (formerly agents, merged in #182)
  "researching-best-practices",
  "reviewing-claude-config",
  // Workflow skills
  "planning-on-issue",
  "working-on-issue",
  "committing-on-issue",
  "creating-pr-on-issue",
  "creating-item",
  // GitHub integration skills
  "github-project-setup",
  "setting-up-project",
  "starting-session",
  "ending-session",
  "showing-github",
  "managing-github-items",
  "project-config-generator",
  // Release management
  "publishing",
] as const;

/**
 * Available rules list
 */
export const AVAILABLE_RULES = [
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
] as const;

/**
 * Deploy target directory for rules (relative to project root)
 */
export const DEPLOYED_RULES_DIR = ".claude/rules/shirokuma";

/**
 * Deploy target directory for Japanese rules (relative to project root)
 */
export const DEPLOYED_RULES_DIR_JA = ".claude/rules/shirokuma-ja";

/**
 * Gitignore entries managed by shirokuma-docs init
 */
export const GITIGNORE_ENTRIES = [
  ".claude/rules/shirokuma/",
  ".claude/plans/",
];

// ========================================
// Types
// ========================================

/**
 * Result of registering the plugin in Claude Code's global cache
 */
export interface CacheRegistrationResult {
  success: boolean;
  method: "install" | "reinstall" | "skipped";
  message?: string;
}

/**
 * Deploy options for deployRules()
 */
export interface DeployRulesOptions {
  /** Preview mode - report what would change without writing */
  dryRun?: boolean;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Override bundled plugin path (for JA plugin support) */
  bundledPluginPath?: string;
  /** Override deploy target directory (for JA plugin support) */
  targetDir?: string;
}

/**
 * Result for a single deployed rule
 */
export interface DeployedRuleItem {
  name: string;
  status: "deployed" | "updated" | "unchanged" | "removed" | "error";
  reason?: string;
}

/**
 * Full deploy result
 */
export interface DeployResult {
  deployed: DeployedRuleItem[];
  targetDir: string;
  /** デプロイ対象に含まれないファイル（管理外） */
  unmanagedFiles: string[];
}

// ========================================
// Path Resolution
// ========================================

/**
 * Get path to a bundled plugin directory by name
 *
 * Resolves the plugin directory relative to this module's location.
 * In development: {repo-root}/plugin/{pluginName}/
 * When installed: {node_modules/shirokuma-docs}/plugin/{pluginName}/
 *
 * @param pluginName - Plugin directory name
 * @returns Absolute path to the bundled plugin directory
 */
export function getBundledPluginPathFor(pluginName: string): string {
  const thisFile = fileURLToPath(import.meta.url);
  // From src/utils/skills-repo.ts → go up 2 levels to package root
  // From dist/utils/skills-repo.js → go up 2 levels to package root
  const packageRoot = join(dirname(thisFile), "..", "..");
  return join(packageRoot, "plugin", pluginName);
}

/**
 * Get path to the bundled plugin directory (EN)
 *
 * @returns Absolute path to the bundled plugin directory
 */
export function getBundledPluginPath(): string {
  return getBundledPluginPathFor(PLUGIN_NAME);
}

/**
 * Get path to the bundled Japanese plugin directory
 *
 * @returns Absolute path to the bundled Japanese plugin directory
 */
export function getBundledPluginPathJa(): string {
  return getBundledPluginPathFor(PLUGIN_NAME_JA);
}

/**
 * Get version from package.json
 *
 * @returns Package version string or "unknown"
 */
export function getPackageVersion(): string {
  try {
    const thisFile = fileURLToPath(import.meta.url);
    const packageRoot = join(dirname(thisFile), "..", "..");
    const packageJsonPath = join(packageRoot, "package.json");
    const content = readFileSync(packageJsonPath, "utf-8");
    const pkg = JSON.parse(content) as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Get version from the bundled plugin's plugin.json
 *
 * バンドル → グローバルキャッシュ → "unknown" の順でフォールバック (#674)
 *
 * @returns Plugin version string or "unknown"
 */
export function getPluginVersion(): string {
  // バンドルプラグインから取得
  try {
    const pluginJsonPath = join(getBundledPluginPath(), ".claude-plugin", "plugin.json");
    const content = readFileSync(pluginJsonPath, "utf-8");
    const pluginJson = JSON.parse(content) as { version?: string };
    if (pluginJson.version) return pluginJson.version;
  } catch {
    // バンドルなし — キャッシュにフォールバック
  }

  // グローバルキャッシュから取得（外部プロジェクト向け）
  for (const pluginName of [PLUGIN_NAME, PLUGIN_NAME_JA]) {
    const cachePath = getGlobalCachePath(pluginName);
    if (cachePath) {
      try {
        const cachePluginJsonPath = join(cachePath, ".claude-plugin", "plugin.json");
        const content = readFileSync(cachePluginJsonPath, "utf-8");
        const pluginJson = JSON.parse(content) as { version?: string };
        if (pluginJson.version) return pluginJson.version;
      } catch {
        // キャッシュ読み取り失敗 — 続行
      }
    }
  }

  return "unknown";
}

// ========================================
// Validation
// ========================================

/**
 * Validate skill name against AVAILABLE_SKILLS list
 *
 * @param skill - Skill name to validate
 * @returns true if skill is in the available list
 */
export function isValidSkill(skill: string): skill is typeof AVAILABLE_SKILLS[number] {
  return (AVAILABLE_SKILLS as readonly string[]).includes(skill);
}

/**
 * Validate skill name format (prevents path traversal)
 *
 * Accepts: lowercase alphanumeric + hyphens (e.g., "managing-agents", "reviewing-on-issue")
 * Rejects: dots, slashes, underscores, spaces, uppercase, empty strings
 *
 * @param name - Skill name to validate
 * @returns true if the name is a safe, valid format
 */
export function isValidSkillName(name: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(name);
}

// ========================================
// Bundled Rules Discovery
// ========================================

/**
 * Get list of rule file paths from the bundled plugin directory
 *
 * Scans plugin/rules/ up to 2 levels deep (root + 1 subdirectory),
 * returning relative paths like "best-practices-first.md",
 * "github/project-items.md", etc.
 *
 * Note: Matches the depth of getInstalledRules(). If deeper nesting
 * is needed in the future, both functions should be updated together.
 *
 * @returns Array of relative rule file paths
 */
export function getBundledRuleNames(): string[] {
  return getBundledRuleNamesFrom(join(getBundledPluginPath(), "rules"));
}

/**
 * Get list of rule file paths from a given rules directory
 *
 * Scans up to 2 levels deep (root + 1 subdirectory).
 *
 * @param rulesDir - Absolute path to rules directory
 * @returns Array of relative rule file paths
 */
export function getBundledRuleNamesFrom(rulesDir: string): string[] {
  if (!existsSync(rulesDir)) {
    return [];
  }

  const rules: string[] = [];
  const entries = readdirSync(rulesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      rules.push(entry.name);
    } else if (entry.isDirectory()) {
      const subDir = join(rulesDir, entry.name);
      const subEntries = readdirSync(subDir, { withFileTypes: true });
      for (const subEntry of subEntries) {
        if (subEntry.isFile() && subEntry.name.endsWith(".md")) {
          rules.push(`${entry.name}/${subEntry.name}`);
        }
      }
    }
  }

  return rules.sort();
}

// ========================================
// Effective Plugin Directory
// ========================================

/**
 * Get the effective plugin directory for a project
 *
 * Global cache → bundled fallback
 *
 * @param projectPath - Project root path (unused, kept for API compatibility)
 * @returns Absolute path to the effective plugin directory
 */
export function getEffectivePluginDir(_projectPath: string): string {
  // Claude CLI 無効時はキャッシュが未インストール/古い可能性があるためバンドル版を使用
  if (process.env.SHIROKUMA_NO_CLAUDE_CLI) {
    return getBundledPluginPath();
  }
  // キャッシュ → bundled フォールバック
  return getGlobalCachePath(PLUGIN_NAME) ?? getBundledPluginPath();
}

// ========================================
// Plugin Installation
// ========================================

/**
 * Install the bundled plugin to a project
 *
 * ローカルコピーは不要（marketplace + cache 方式）。
 * この関数は後方互換性のために残している。
 *
 * @param projectPath - Target project root path
 * @param verbose - Enable verbose logging
 * @returns true on success, false on failure
 */
export async function installPlugin(
  _projectPath: string,
  verbose: boolean,
  pluginName: string = PLUGIN_NAME,
): Promise<boolean> {
  const logger = createLogger(verbose);
  const srcPath = getBundledPluginPathFor(pluginName);

  if (!existsSync(srcPath)) {
    logger.error(`Bundled plugin not found: ${srcPath}`);
    return false;
  }

  logger.info("Skipping local copy (using marketplace + cache)");
  return true;
}

// ========================================
// Installed Skills/Rules Discovery
// ========================================

/**
 * Get list of installed skill names from a project
 *
 * Scans the effective plugin directory for installed skills.
 * For self-repo, reads from bundled source; otherwise from .claude/plugins/.
 *
 * @param projectPath - Project root path
 * @returns Array of installed skill names
 */
export function getInstalledSkills(projectPath: string): string[] {
  const skillsDir = join(getEffectivePluginDir(projectPath), "skills");
  if (!existsSync(skillsDir)) {
    return [];
  }

  return readdirSync(skillsDir).filter(name => {
    const fullPath = join(skillsDir, name);
    return statSync(fullPath).isDirectory() && isValidSkillName(name);
  });
}

/**
 * Get list of installed rule names from a project
 *
 * Scans the effective plugin directory for installed rules.
 * For self-repo, reads from bundled source; otherwise from .claude/plugins/.
 *
 * @param projectPath - Project root path
 * @returns Array of installed rule file paths
 */
export function getInstalledRules(projectPath: string): string[] {
  const rulesDir = join(getEffectivePluginDir(projectPath), "rules");
  if (!existsSync(rulesDir)) {
    return [];
  }

  const rules: string[] = [];
  const entries = readdirSync(rulesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      rules.push(entry.name);
    } else if (entry.isDirectory()) {
      // Scan subdirectories (e.g., github/, nextjs/)
      const subDir = join(rulesDir, entry.name);
      const subEntries = readdirSync(subDir, { withFileTypes: true });
      for (const subEntry of subEntries) {
        if (subEntry.isFile() && subEntry.name.endsWith(".md")) {
          rules.push(`${entry.name}/${subEntry.name}`);
        }
      }
    }
  }

  return rules;
}

// ========================================
// Gitignore Management
// ========================================

/**
 * .gitignore にエントリを追加する（重複チェック付き）
 *
 * @param projectPath - プロジェクトルートパス
 * @param options - オプション（dryRun, verbose）
 * @returns 追加されたエントリ数
 */
export function updateGitignore(
  projectPath: string,
  options: { dryRun?: boolean; verbose?: boolean } = {},
): { added: string[]; alreadyPresent: string[] } {
  const logger = createLogger(options.verbose ?? false);
  const gitignorePath = join(projectPath, ".gitignore");
  const added: string[] = [];
  const alreadyPresent: string[] = [];

  // 既存の .gitignore を読み込む（なければ空）
  let content = "";
  if (existsSync(gitignorePath)) {
    content = readFileSync(gitignorePath, "utf-8");
  }

  // 各行をパースして既存エントリを収集
  const existingEntries = new Set(
    content.split("\n")
      .map(line => line.trim())
      .filter(line => line && !line.startsWith("#")),
  );

  // 追加が必要なエントリを判定
  const toAdd: string[] = [];
  for (const entry of GITIGNORE_ENTRIES) {
    if (existingEntries.has(entry)) {
      alreadyPresent.push(entry);
    } else {
      toAdd.push(entry);
    }
  }

  if (toAdd.length === 0) {
    logger.info("  .gitignore: 全エントリが既に存在します");
    return { added, alreadyPresent };
  }

  // セクションコメント付きで追加
  const section = [
    "",
    "# shirokuma-docs (managed by shirokuma-docs init)",
    ...toAdd,
    "",
  ].join("\n");

  const newContent = content.endsWith("\n") ? content + section : content + "\n" + section;

  if (!options.dryRun) {
    writeFileSync(gitignorePath, newContent, "utf-8");
  }

  for (const entry of toAdd) {
    added.push(entry);
    logger.info(`  + ${entry}`);
  }

  return { added, alreadyPresent };
}

/**
 * .gitignore から特定のエントリを削除する
 *
 * @param projectPath - プロジェクトルートパス
 * @param entry - 削除するエントリ（例: ".claude/plugins/"）
 * @returns true: 削除成功、false: エントリが見つからないまたはファイルなし
 */
export function removeGitignoreEntry(projectPath: string, entry: string): boolean {
  const gitignorePath = join(projectPath, ".gitignore");
  if (!existsSync(gitignorePath)) return false;

  const content = readFileSync(gitignorePath, "utf-8");
  const lines = content.split("\n");
  const filtered = lines.filter(line => line.trim() !== entry);
  if (filtered.length === lines.length) return false;

  writeFileSync(gitignorePath, filtered.join("\n"), "utf-8");
  return true;
}

/**
 * レガシー .claude/plugins/ ディレクトリを削除する（マイグレーション用）
 *
 * 旧バージョンの init で作成された .claude/plugins/ ディレクトリと
 * 対応する .gitignore エントリを削除する。
 *
 * @param projectPath - プロジェクトルートパス
 */
export function cleanupLegacyPluginDir(projectPath: string): void {
  const legacyDir = join(projectPath, ".claude", "plugins");
  if (existsSync(legacyDir)) {
    rmSync(legacyDir, { recursive: true, force: true });
  }
  removeGitignoreEntry(projectPath, ".claude/plugins/");
}

// ========================================
// Rule Deployment
// ========================================

/**
 * Deploy plugin rules to .claude/rules/shirokuma/ for Claude Code auto-loading
 *
 * Copies rule files from the bundled plugin directly to the target directory.
 * The shirokuma/ directory is fully owned by shirokuma-docs, so files are
 * always overwritten without conflict detection.
 *
 * @param projectPath - Target project root path
 * @param options - Deploy options (dryRun, verbose)
 * @returns Deploy result with per-file status
 */
export async function deployRules(
  projectPath: string,
  options: DeployRulesOptions = {},
): Promise<DeployResult> {
  const logger = createLogger(options.verbose ?? false);
  const pluginPath = options.bundledPluginPath ?? getBundledPluginPath();
  const bundledRulesDir = join(pluginPath, "rules");
  const targetDir = options.targetDir ?? join(projectPath, DEPLOYED_RULES_DIR);
  const ruleNames = getBundledRuleNamesFrom(bundledRulesDir);
  const results: DeployedRuleItem[] = [];

  if (!existsSync(bundledRulesDir)) {
    logger.warn("Bundled rules directory not found");
    return { deployed: results, targetDir, unmanagedFiles: [] };
  }

  // Ensure target directory exists once before processing files
  if (!options.dryRun) {
    mkdirSync(targetDir, { recursive: true });
  }

  for (const ruleName of ruleNames) {
    const srcPath = join(bundledRulesDir, ruleName);
    const destPath = join(targetDir, ruleName);

    try {
      const sourceContent = readFileSync(srcPath, "utf-8");
      const isNew = !existsSync(destPath);

      // Check if content is identical (for reporting)
      if (!isNew) {
        const existingContent = readFileSync(destPath, "utf-8");
        if (existingContent === sourceContent) {
          results.push({ name: ruleName, status: "unchanged" });
          continue;
        }
      }

      // Deploy or overwrite
      if (!options.dryRun) {
        if (ruleName.includes("/")) {
          mkdirSync(dirname(destPath), { recursive: true });
        }
        writeFileSync(destPath, sourceContent, "utf-8");
      }
      results.push({ name: ruleName, status: isNew ? "deployed" : "updated" });
      logger.info(`  ${isNew ? "+" : "↑"} ${ruleName} (${isNew ? "deployed" : "updated"})`);
    } catch (error) {
      results.push({
        name: ruleName,
        status: "error",
        reason: error instanceof Error ? error.message : String(error),
      });
      logger.warn(`  ✗ ${ruleName} (error: ${error instanceof Error ? error.message : String(error)})`);
    }
  }

  // 管理外ファイル検出（targetDir にあるが bundled にないファイル）
  const unmanagedFiles: string[] = [];
  if (existsSync(targetDir)) {
    const scanForUnmanaged = (dir: string, prefix: string): void => {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".md")) {
          const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (!ruleNames.includes(relativePath)) {
            unmanagedFiles.push(relativePath);
          }
        } else if (entry.isDirectory()) {
          scanForUnmanaged(join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name);
        }
      }
    };
    scanForUnmanaged(targetDir, "");
  }

  if (unmanagedFiles.length > 0) {
    logger.warn(`管理外ファイル検出: ${unmanagedFiles.length}件`);
    for (const file of unmanagedFiles) {
      logger.warn(`  ? ${file} (管理外)`);
    }
  }

  return { deployed: results, targetDir, unmanagedFiles };
}

// ========================================
// Semver Utilities
// ========================================

/**
 * semver 簡易比較関数（外部依存なし）
 *
 * shirokuma-docs の既知バージョン体系に限定対応:
 * major.minor.patch[-prerelease.N]
 *
 * @param a - バージョン文字列
 * @param b - バージョン文字列
 * @returns 負数: a < b、0: a === b、正数: a > b
 */
export function compareSemver(a: string, b: string): number {
  const parse = (v: string) => {
    const [core, ...preParts] = v.split("-");
    const pre = preParts.length > 0 ? preParts.join("-") : null;
    const [rawMajor, rawMinor, rawPatch] = (core ?? "").split(".").map(Number);
    return {
      major: Number.isNaN(rawMajor) ? 0 : (rawMajor ?? 0),
      minor: Number.isNaN(rawMinor) ? 0 : (rawMinor ?? 0),
      patch: Number.isNaN(rawPatch) ? 0 : (rawPatch ?? 0),
      pre,
    };
  };

  const pa = parse(a);
  const pb = parse(b);

  // major.minor.patch を比較
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  if (pa.patch !== pb.patch) return pa.patch - pb.patch;

  // prerelease: リリース版 > プレリリース版
  if (!pa.pre && !pb.pre) return 0;
  if (!pa.pre) return 1;
  if (!pb.pre) return -1;

  // 両方 prerelease: セグメント比較
  const aSegs = pa.pre.split(".");
  const bSegs = pb.pre.split(".");

  for (let i = 0; i < Math.max(aSegs.length, bSegs.length); i++) {
    const aS = aSegs[i];
    const bS = bSegs[i];
    if (aS === undefined) return -1;
    if (bS === undefined) return 1;

    const aNum = Number(aS);
    const bNum = Number(bS);

    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum;
    } else {
      if (aS < bS) return -1;
      if (aS > bS) return 1;
    }
  }

  return 0;
}

// ========================================
// Marketplace Management
// ========================================

/**
 * マーケットプレース名（marketplace.json の name フィールドで解決）
 */
export const MARKETPLACE_NAME = "shirokuma-library";

/**
 * マーケットプレースリポジトリ
 */
export const MARKETPLACE_REPO = "ShirokumaLibrary/shirokuma-plugins";

/**
 * マーケットプレースが登録済みか確認し、未登録なら追加する
 *
 * `claude plugin marketplace list` で確認し、MARKETPLACE_NAME が
 * 含まれていなければ `claude plugin marketplace add` で登録する。
 *
 * Directory ソース（ローカル参照）が検出された場合は再登録して
 * GitHub ソース（fresh clone）に切り替える (#679)。
 *
 * @returns true: 登録済みまたは登録成功、false: 登録失敗
 */
export function ensureMarketplace(): boolean {
  let needsReRegister = false;

  try {
    const output = execFileSync(
      "claude",
      ["plugin", "marketplace", "list"],
      { encoding: "utf-8", timeout: 15000, stdio: "pipe" },
    );
    if (output.includes(MARKETPLACE_NAME)) {
      // Directory ソースの検出: キャッシュが陳腐化する原因 (#679)
      // marketplace list の各行を解析し、該当エントリのソースを確認
      const lines = output.split("\n");
      for (const line of lines) {
        if (line.includes(MARKETPLACE_NAME) && line.toLowerCase().includes("directory")) {
          needsReRegister = true;
          break;
        }
      }
      if (!needsReRegister) {
        return true;
      }
    }
  } catch {
    // CLI エラー: 登録を試みる
  }

  // Directory ソースの場合は remove してから再登録
  if (needsReRegister) {
    try {
      execFileSync(
        "claude",
        ["plugin", "marketplace", "remove", MARKETPLACE_NAME],
        { encoding: "utf-8", timeout: 15000, stdio: "pipe" },
      );
    } catch {
      // remove 失敗は無視して add を試みる
    }
  }

  try {
    execFileSync(
      "claude",
      ["plugin", "marketplace", "add", MARKETPLACE_REPO],
      { encoding: "utf-8", timeout: 30000, stdio: "pipe" },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * グローバルキャッシュ内のプラグインディレクトリパスを解決する
 *
 * キャッシュパス: ~/.claude/plugins/cache/{marketplace}/{pluginName}/{version}/
 *
 * @param pluginName - プラグイン名
 * @param version - 特定バージョン（省略時は最新を自動検出）
 * @returns キャッシュパス、見つからない場合は null
 */
export function getGlobalCachePath(pluginName: string, version?: string): string | null {
  const cacheBase = join(homedir(), ".claude", "plugins", "cache", MARKETPLACE_NAME, pluginName);
  if (!existsSync(cacheBase)) return null;

  if (version) {
    const versionDir = join(cacheBase, version);
    return existsSync(versionDir) ? versionDir : null;
  }

  // version 未指定: ディレクトリをスキャンし最新を返す（semver ソート #679）
  // TOCTOU 防御: existsSync と readdirSync の間にディレクトリが削除される可能性 (#632)
  try {
    const versions = readdirSync(cacheBase)
      .filter(name => {
        try { return statSync(join(cacheBase, name)).isDirectory(); }
        catch { return false; }
      })
      .sort((a, b) => compareSemver(b, a));
    return versions.length > 0 ? join(cacheBase, versions[0]) : null;
  } catch {
    return null;
  }
}

// ========================================
// Cache Registration
// ========================================

/**
 * Plugin identifier for Claude Code's plugin registry
 */
export const PLUGIN_REGISTRY_ID = "shirokuma-skills-en@shirokuma-library";

/**
 * Japanese plugin identifier for Claude Code's plugin registry
 */
export const PLUGIN_REGISTRY_ID_JA = "shirokuma-skills-ja@shirokuma-library";

/**
 * Hooks plugin identifier for Claude Code's plugin registry
 */
export const PLUGIN_REGISTRY_ID_HOOKS = "shirokuma-hooks@shirokuma-library";

/**
 * Register the plugin in Claude Code's global cache
 *
 * Runs `claude plugin install` to copy from .claude/plugins/ to the global
 * cache (~/.claude/plugins/cache/). Claude Code only reads skills from the
 * global cache, not the project-local directory.
 *
 * @param projectPath - Project root path
 * @param options - Registration options
 * @returns Registration result
 */
export function registerPluginCache(
  projectPath: string,
  options: { reinstall?: boolean; registryId?: string } = {},
): CacheRegistrationResult {
  // Check if claude CLI is available
  if (!isClaudeCliAvailable()) {
    return {
      success: false,
      method: "skipped",
      message: "claude CLI not found in PATH",
    };
  }

  const id = options.registryId ?? PLUGIN_REGISTRY_ID;

  // In reinstall mode (e.g., same-version update), uninstall first
  if (options.reinstall) {
    try {
      execFileSync(
        "claude",
        ["plugin", "uninstall", id, "--scope", "project"],
        { cwd: projectPath, stdio: "pipe", timeout: 30000 },
      );
    } catch {
      // Ignore uninstall errors (plugin might not be installed yet)
    }
  }

  // Install plugin to global cache
  try {
    execFileSync(
      "claude",
      ["plugin", "install", id, "--scope", "project"],
      { cwd: projectPath, stdio: "pipe", timeout: 30000 },
    );
    return {
      success: true,
      method: options.reinstall ? "reinstall" : "install",
    };
  } catch (error: unknown) {
    const stderr = isSpawnError(error) ? String(error.stderr) : "";
    return {
      success: false,
      method: options.reinstall ? "reinstall" : "install",
      message: stderr || (error instanceof Error ? error.message : String(error)),
    };
  }
}

/**
 * Check if the `claude` CLI is available in PATH
 *
 * @returns true if claude CLI is installed and accessible
 */
export function isClaudeCliAvailable(): boolean {
  // テスト並列実行時のグローバルキャッシュ競合を防ぐため、
  // 環境変数で claude CLI 呼び出しを無効化できる (#632)
  if (process.env.SHIROKUMA_NO_CLAUDE_CLI) return false;
  try {
    execFileSync("claude", ["--version"], { stdio: "pipe", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard for child_process spawn errors with stderr
 */
function isSpawnError(error: unknown): error is Error & { stderr: Buffer | string } {
  return error instanceof Error && "stderr" in error;
}

// ========================================
// Language Detection
// ========================================

/**
 * プロジェクトの .claude/settings.json から language 設定を読み取る
 *
 * @param projectPath - プロジェクトルートパス
 * @returns "english" | "japanese" | null（未設定時）
 */
export function getLanguageSetting(projectPath: string): string | null {
  const settingsPath = join(projectPath, ".claude", "settings.json");
  if (!existsSync(settingsPath)) {
    return null;
  }
  try {
    const content = readFileSync(settingsPath, "utf-8");
    const settings = JSON.parse(content) as { language?: string };
    return settings.language ?? null;
  } catch {
    return null;
  }
}

// ========================================
// Rule Cleanup
// ========================================

/**
 * Remove all deployed rules by deleting .claude/rules/shirokuma/ directory
 *
 * The shirokuma/ directory is fully owned by shirokuma-docs, so the entire
 * directory is removed without per-file checks.
 *
 * @param projectPath - Project root path
 * @param options - Clean options (dryRun, verbose)
 * @returns Array of removed items (for reporting)
 */
export async function cleanDeployedRules(
  projectPath: string,
  options: { dryRun?: boolean; verbose?: boolean } = {},
): Promise<DeployedRuleItem[]> {
  const logger = createLogger(options.verbose ?? false);
  const targetDir = join(projectPath, DEPLOYED_RULES_DIR);
  const results: DeployedRuleItem[] = [];

  if (!existsSync(targetDir)) {
    return results;
  }

  // Collect all files for reporting
  const scanDir = (dir: string, prefix: string): void => {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        results.push({ name: relativePath, status: "removed" });
        logger.info(`  - ${relativePath} (removed)`);
      } else if (entry.isDirectory()) {
        scanDir(join(dir, entry.name), prefix ? `${prefix}/${entry.name}` : entry.name);
      }
    }
  };

  scanDir(targetDir, "");

  // Remove entire directory
  if (!options.dryRun) {
    rmSync(targetDir, { recursive: true, force: true });
  }

  return results;
}

// ========================================
// Cache Version Cleanup
// ========================================

/**
 * グローバルキャッシュの古いバージョンディレクトリを削除する (#679)
 *
 * uninstall + install を繰り返すとキャッシュディレクトリが肥大化する。
 * semver ソートで最新 keepCount 個を残し、古いバージョンを削除する。
 *
 * installed_plugins.json は操作しない（Claude Code 管理ファイル）。
 *
 * @param pluginName - プラグイン名
 * @param keepCount - 残すバージョン数（デフォルト: 3）
 * @returns 削除されたバージョンの配列
 */
export function cleanupOldCacheVersions(pluginName: string, keepCount = 3): string[] {
  const cacheBase = join(homedir(), ".claude", "plugins", "cache", MARKETPLACE_NAME, pluginName);
  if (!existsSync(cacheBase)) return [];

  try {
    const versions = readdirSync(cacheBase)
      .filter(name => {
        try { return statSync(join(cacheBase, name)).isDirectory(); }
        catch { return false; }
      })
      .sort((a, b) => compareSemver(b, a)); // 最新が先頭

    if (versions.length <= keepCount) return [];

    const toRemove = versions.slice(keepCount);
    const removed: string[] = [];

    for (const ver of toRemove) {
      try {
        rmSync(join(cacheBase, ver), { recursive: true, force: true });
        removed.push(ver);
      } catch {
        // 他プロセスが参照中の可能性 — 無視
      }
    }

    return removed;
  } catch {
    return [];
  }
}
