/**
 * update-skills command - Update installed skills/rules from bundled plugin
 *
 * @description Updates installed skills and rules to the version bundled
 * in the shirokuma-docs package, preserving project/ directories.
 *
 * @example
 * ```bash
 * # Update all installed skills
 * shirokuma-docs update-skills
 *
 * # Update specific skills only
 * shirokuma-docs update-skills --skills managing-agents,reviewing-on-issue
 *
 * # Update with rules
 * shirokuma-docs update-skills --with-rules
 *
 * # Preview changes without updating
 * shirokuma-docs update-skills --dry-run
 *
 * # Force update (ignore local changes)
 * shirokuma-docs update-skills --force
 *
 * # Sync mode: detect new/removed skills
 * shirokuma-docs update-skills --sync
 * ```
 */

import { resolve, join } from "node:path";
import { existsSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createLogger } from "../utils/logger.js";
import { t } from "../utils/i18n.js";
import {
  AVAILABLE_SKILLS,
  AVAILABLE_RULES,
  PLUGIN_NAME,
  PLUGIN_NAME_JA,
  PLUGIN_NAME_HOOKS,
  PLUGIN_REGISTRY_ID,
  PLUGIN_REGISTRY_ID_JA,
  PLUGIN_REGISTRY_ID_HOOKS,
  DEPLOYED_RULES_DIR_JA,
  isValidSkill,
  isValidSkillName,
  getBundledPluginPath,
  getBundledPluginPathJa,
  getBundledSkillNames,
  getPackageVersion,
  getPluginVersion,
  getInstalledSkills,
  getInstalledRules,
  getEffectivePluginDir,
  deployRules,
  registerPluginCache,
  ensureMarketplace,
  getGlobalCachePath,
  cleanupLegacyPluginDir,
  isSelfRepo,
  isClaudeCliAvailable,
  hasJaPlugin,
  hasHooksPlugin,
  getLanguageSetting,
  type DeployedRuleItem,
} from "../utils/skills-repo.js";

/**
 * update-skills command options
 */
interface UpdateSkillsOptions {
  /** Project path */
  project: string;
  /** Specific skills to update (comma-separated) */
  skills?: string;
  /** Update rules as well */
  withRules?: boolean;
  /** Sync mode: detect and add new skills, detect removed skills */
  sync?: boolean;
  /** Auto-confirm destructive operations (removals) */
  yes?: boolean;
  /** Preview mode (no actual changes) */
  dryRun?: boolean;
  /** Force update (ignore local changes) */
  force?: boolean;
  /** Force global cache sync (claude plugin uninstall + install) */
  installCache?: boolean;
  /** Verbose logging */
  verbose?: boolean;
}

/**
 * Update result for a single item
 */
interface UpdateItem {
  name: string;
  status: "updated" | "skipped" | "added" | "unchanged" | "error" | "removed";
  reason?: string;
}

/**
 * update-skills command result
 */
interface UpdateResult {
  skills: UpdateItem[];
  rules: UpdateItem[];
  deployedRules: DeployedRuleItem[];
  version: string;
  pluginVersion: string;
  dryRun: boolean;
  hooksStatus: "updated" | "skipped" | "error" | "not-applicable";
}

/**
 * Check if a directory has local modifications compared to bundled version
 *
 * @param localPath - Local skill/rule path
 * @param bundledPath - Bundled skill/rule path
 * @returns true if local has modifications
 */
function hasLocalChanges(localPath: string, bundledPath: string): boolean {
  try {
    const result = execFileSync("diff", [
      "-rq",
      "--exclude=project",
      localPath,
      bundledPath,
    ], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return result.trim().length > 0;
  } catch {
    // diff returns exit code 1 when files differ
    return true;
  }
}

/**
 * Backup project/ directory from a skill
 */
function backupProjectDir(skillPath: string, backupDir: string, skillName: string): boolean {
  const projectDir = join(skillPath, "project");
  if (!existsSync(projectDir)) {
    return false;
  }

  const backupPath = join(backupDir, skillName, "project");
  mkdirSync(join(backupDir, skillName), { recursive: true });
  cpSync(projectDir, backupPath, { recursive: true });
  return true;
}

/**
 * Restore project/ directory to a skill
 */
function restoreProjectDir(skillPath: string, backupDir: string, skillName: string): boolean {
  const backupPath = join(backupDir, skillName, "project");
  if (!existsSync(backupPath)) {
    return false;
  }

  const projectDir = join(skillPath, "project");
  cpSync(backupPath, projectDir, { recursive: true });
  return true;
}

/**
 * Update skills from bundled plugin
 */
async function updateSkills(
  projectPath: string,
  targetSkills: string[],
  options: UpdateSkillsOptions
): Promise<UpdateItem[]> {
  const logger = createLogger(options.verbose ?? false);
  const T = (key: string, params?: Record<string, string | number>) =>
    t(`commands.updateSkills.${key}`, params);
  const results: UpdateItem[] = [];
  const bundledSkillsDir = join(getBundledPluginPath(), "skills");
  const installedSkillsDir = join(getEffectivePluginDir(projectPath), "skills");
  const backupDir = join("/tmp", `shirokuma-skills-backup-${Date.now()}`);

  for (const skill of targetSkills) {
    if (!isValidSkill(skill) && !isValidSkillName(skill)) {
      results.push({ name: skill, status: "error", reason: "Invalid skill name" });
      continue;
    }

    const srcPath = join(bundledSkillsDir, skill);
    const destPath = join(installedSkillsDir, skill);

    if (!existsSync(srcPath)) {
      results.push({ name: skill, status: "error", reason: "Not found in bundled plugin" });
      continue;
    }

    const isNewInstall = !existsSync(destPath);

    if (isNewInstall) {
      if (options.dryRun) {
        results.push({ name: skill, status: "added", reason: "Would be added (new)" });
        logger.info(T("logItemNew", { name: skill }));
      } else {
        mkdirSync(installedSkillsDir, { recursive: true });
        cpSync(srcPath, destPath, { recursive: true });
        results.push({ name: skill, status: "added" });
        logger.info(T("logItemNew", { name: skill }));
      }
      continue;
    }

    // Check for local changes
    if (!options.force && hasLocalChanges(destPath, srcPath)) {
      results.push({
        name: skill,
        status: "skipped",
        reason: "Local changes detected (use --force to override)",
      });
      logger.warn(T("logItemLocalChangesSkipped", { name: skill }));
      continue;
    }

    // Check if actually different from bundled (excluding project/)
    if (!hasLocalChanges(destPath, srcPath)) {
      results.push({ name: skill, status: "unchanged" });
      logger.debug(T("logItemUnchanged", { name: skill }));
      continue;
    }

    if (options.dryRun) {
      results.push({ name: skill, status: "updated", reason: "Would be updated" });
      logger.info(T("logItemWouldUpdate", { name: skill }));
      continue;
    }

    // Backup project/ directory
    const hadProjectDir = backupProjectDir(destPath, backupDir, skill);

    // Replace skill with bundled version
    try {
      rmSync(destPath, { recursive: true, force: true });
      cpSync(srcPath, destPath, { recursive: true });

      // Restore project/ directory
      if (hadProjectDir) {
        restoreProjectDir(destPath, backupDir, skill);
      }

      results.push({ name: skill, status: "updated" });
      logger.info(hadProjectDir
        ? T("logItemUpdatedProjectPreserved", { name: skill })
        : T("logItemUpdated", { name: skill }));
    } catch (error) {
      results.push({
        name: skill,
        status: "error",
        reason: error instanceof Error ? error.message : String(error),
      });
      logger.warn(T("logItemError", { name: skill, reason: error instanceof Error ? error.message : String(error) }));
    }
  }

  // Cleanup backup dir
  if (existsSync(backupDir)) {
    rmSync(backupDir, { recursive: true, force: true });
  }

  return results;
}

/**
 * Update rules from bundled plugin
 */
async function updateRules(
  projectPath: string,
  options: UpdateSkillsOptions
): Promise<UpdateItem[]> {
  const logger = createLogger(options.verbose ?? false);
  const T = (key: string, params?: Record<string, string | number>) =>
    t(`commands.updateSkills.${key}`, params);
  const results: UpdateItem[] = [];
  const bundledRulesDir = join(getBundledPluginPath(), "rules");
  const installedRulesDir = join(getEffectivePluginDir(projectPath), "rules");

  for (const rule of AVAILABLE_RULES) {
    const srcPath = join(bundledRulesDir, rule);
    const destPath = join(installedRulesDir, rule);

    if (!existsSync(srcPath)) {
      results.push({ name: rule, status: "error", reason: "Not found in bundled plugin" });
      continue;
    }

    const isNewInstall = !existsSync(destPath);

    if (isNewInstall) {
      if (options.dryRun) {
        results.push({ name: rule, status: "added", reason: "Would be added (new)" });
        logger.info(T("logItemNew", { name: rule }));
      } else {
        const destDir = join(installedRulesDir, rule.includes("/") ? rule.split("/")[0] : "");
        if (destDir !== installedRulesDir) {
          mkdirSync(destDir, { recursive: true });
        }
        cpSync(srcPath, destPath, { recursive: true });
        results.push({ name: rule, status: "added" });
        logger.info(T("logItemNew", { name: rule }));
      }
      continue;
    }

    // For rules, check diff at file level
    try {
      execFileSync("diff", ["-q", destPath, srcPath], {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      results.push({ name: rule, status: "unchanged" });
      logger.debug(T("logItemUnchanged", { name: rule }));
    } catch {
      if (!options.force) {
        results.push({
          name: rule,
          status: "skipped",
          reason: "Local changes detected (use --force to override)",
        });
        logger.warn(T("logItemLocalChangesSkipped", { name: rule }));
      } else if (options.dryRun) {
        results.push({ name: rule, status: "updated", reason: "Would be updated" });
        logger.info(T("logItemWouldUpdate", { name: rule }));
      } else {
        cpSync(srcPath, destPath, { recursive: true });
        results.push({ name: rule, status: "updated" });
        logger.info(T("logItemUpdated", { name: rule }));
      }
    }
  }

  return results;
}

/**
 * Detect skills that exist locally (in metadata) but no longer in bundled plugin
 */
function detectObsoleteSkills(metaSkills: string[], bundledSkills: string[]): string[] {
  const bundledSet = new Set(bundledSkills);
  return metaSkills.filter(skill => !bundledSet.has(skill));
}

/**
 * Detect skills that exist in bundled plugin but not installed locally
 */
function detectNewBundledSkills(localSkills: string[], bundledSkills: string[]): string[] {
  const localSet = new Set(localSkills);
  return bundledSkills.filter(skill => !localSet.has(skill));
}

/**
 * Remove obsolete skills from local installation
 */
function removeObsoleteSkills(
  projectPath: string,
  obsoleteSkills: string[],
  options: UpdateSkillsOptions,
): UpdateItem[] {
  const logger = createLogger(options.verbose ?? false);
  const T = (key: string, params?: Record<string, string | number>) =>
    t(`commands.updateSkills.${key}`, params);
  const results: UpdateItem[] = [];
  const skillsDir = join(getEffectivePluginDir(projectPath), "skills");

  for (const skill of obsoleteSkills) {
    const destPath = join(skillsDir, skill);

    if (!existsSync(destPath)) {
      continue;
    }

    if (!options.yes) {
      results.push({
        name: skill,
        status: "skipped",
        reason: "Removed from bundled plugin (use --yes to delete)",
      });
      logger.warn(T("logItemRemovedFromBundled", { name: skill }));
      continue;
    }

    if (options.dryRun) {
      results.push({ name: skill, status: "removed", reason: "Would be removed" });
      logger.info(T("logItemWouldRemove", { name: skill }));
      continue;
    }

    try {
      rmSync(destPath, { recursive: true, force: true });
      results.push({ name: skill, status: "removed" });
      logger.info(T("logItemRemoved", { name: skill }));
    } catch (error) {
      results.push({
        name: skill,
        status: "error",
        reason: error instanceof Error ? error.message : String(error),
      });
      logger.warn(T("logItemRemovalFailed", { name: skill, reason: error instanceof Error ? error.message : String(error) }));
    }
  }

  return results;
}

/**
 * update-skills command handler
 */
export async function updateSkillsCommand(options: UpdateSkillsOptions): Promise<void> {
  const logger = createLogger(options.verbose ?? true);
  const T = (key: string, params?: Record<string, string | number>) =>
    t(`commands.updateSkills.${key}`, params);
  const projectPath = resolve(options.project);
  const verbose = options.verbose ?? false;

  // Check if project has .claude directory
  if (!existsSync(join(projectPath, ".claude"))) {
    logger.error(T("errorNoClaudeDir"));
    process.exit(1);
  }

  // Verify bundled plugin exists
  const bundledPath = getBundledPluginPath();
  if (!existsSync(bundledPath)) {
    logger.error(T("errorNoBundledPlugin"));
    process.exit(1);
  }

  const newVersion = getPackageVersion();
  const newPluginVersion = getPluginVersion();

  if (options.dryRun) {
    logger.info(T("dryRunBanner"));
  }

  logger.info(T("cliVersion", { version: newVersion }));
  logger.info(T("pluginVersion", { version: newPluginVersion }));

  // Version mismatch detection (CLI vs plugin)
  // Strip prerelease suffixes (e.g., "0.1.0-beta.1" → "0.1.0") before comparing
  if (newVersion !== "unknown" && newPluginVersion !== "unknown") {
    const [pkgMajor, pkgMinor] = newVersion.split("-")[0].split(".").map(Number);
    const [plgMajor, plgMinor] = newPluginVersion.split("-")[0].split(".").map(Number);

    if (pkgMajor !== plgMajor || pkgMinor !== plgMinor) {
      logger.warn(T("warnVersionMismatch", { cliVersion: newVersion, pluginVersion: newPluginVersion }));
    }
  }

  // 外部プロジェクト: claude plugin update に完全委譲（#486）
  if (!isSelfRepo(projectPath)) {
    return updateExternalProject(projectPath, options, logger, T, newVersion, newPluginVersion, verbose);
  }

  // === 以下は self-repo（shirokuma-docs 自身）専用 ===

  // Determine which skills to update
  let targetSkills: string[];
  if (options.skills) {
    targetSkills = options.skills.split(",").map(s => s.trim()).filter(s => s.length > 0);
  } else {
    targetSkills = getInstalledSkills(projectPath);
    if (targetSkills.length === 0 && !options.sync) {
      logger.warn(T("noInstalledSkills"));
      logger.info(T("installSkillsHint"));
      return;
    }
  }

  // In --sync mode, detect new and obsolete skills
  let syncNewSkills: string[] = [];
  let syncObsoleteSkills: string[] = [];

  if (options.sync) {
    const bundledSkills = getBundledSkillNames();
    const localSkills = getInstalledSkills(projectPath);

    syncNewSkills = detectNewBundledSkills(localSkills, bundledSkills);
    syncObsoleteSkills = detectObsoleteSkills(localSkills, bundledSkills);

    if (syncNewSkills.length > 0) {
      logger.info(T("newSkillsDetected", { count: syncNewSkills.length }));
      targetSkills = [...new Set([...targetSkills, ...syncNewSkills])];
    }

    if (syncObsoleteSkills.length > 0) {
      logger.info(T("obsoleteSkillsDetected", { count: syncObsoleteSkills.length }));
    }

    // Filter out obsolete/custom skills from update targets
    // They are handled separately by removeObsoleteSkills()
    const bundledSet = new Set(bundledSkills);
    targetSkills = targetSkills.filter(skill => bundledSet.has(skill));
  }

  // Update skills
  logger.info(T("updatingSkills"));
  const skillResults = await updateSkills(projectPath, targetSkills, options);

  // Remove obsolete skills in sync mode
  if (options.sync && syncObsoleteSkills.length > 0) {
    logger.info(T("processingObsoleteSkills"));
    const removeResults = removeObsoleteSkills(projectPath, syncObsoleteSkills, options);
    skillResults.push(...removeResults);
  }

  // Update rules if requested (--sync automatically includes rules)
  let ruleResults: UpdateItem[] = [];
  let deployedRuleResults: DeployedRuleItem[] = [];
  const shouldUpdateRules = options.withRules || options.sync;
  if (shouldUpdateRules) {
    if (options.sync && !options.withRules) {
      logger.info(T("syncModeIncludesRules"));
    }
    logger.info(T("updatingRules"));
    ruleResults = await updateRules(projectPath, options);

    // Deploy rules to .claude/rules/shirokuma/ (#254: 言語設定に基づき単一ディレクトリに統一)
    const languageSetting = getLanguageSetting(projectPath);
    const useJaRules = languageSetting === "japanese" && hasJaPlugin();

    if (useJaRules) {
      logger.info(T("deployingRulesJa"));
      const deployResult = await deployRules(projectPath, {
        dryRun: options.dryRun,
        verbose: options.verbose ?? false,
        bundledPluginPath: getBundledPluginPathJa(),
      });
      deployedRuleResults = deployResult.deployed;
    } else {
      logger.info(T("deployingRules"));
      const deployResult = await deployRules(projectPath, {
        dryRun: options.dryRun,
        verbose: options.verbose ?? false,
      });
      deployedRuleResults = deployResult.deployed;
    }

    // Clean up legacy shirokuma-ja/ directory if it exists (#254)
    const legacyJaDir = resolve(projectPath, DEPLOYED_RULES_DIR_JA);
    if (existsSync(legacyJaDir) && !options.dryRun) {
      rmSync(legacyJaDir, { recursive: true, force: true });
      logger.info(T("legacyDirRemoved"));
    }
  }

  // Hooks (self-repo: always skip)
  const hooksStatus: "updated" | "skipped" | "error" | "not-applicable" = hasHooksPlugin() ? "skipped" : "not-applicable";

  // Summary
  const result: UpdateResult = {
    skills: skillResults,
    rules: ruleResults,
    deployedRules: deployedRuleResults,
    version: newVersion,
    pluginVersion: newPluginVersion,
    dryRun: options.dryRun ?? false,
    hooksStatus,
  };

  printSummary(result, logger);

  if (verbose) {
    console.log(JSON.stringify(result, null, 2));
  }
}

/**
 * 外部プロジェクト向け update-skills: claude plugin update に委譲（#486）
 *
 * updateSkills()/updateRules()/removeObsoleteSkills() はキャッシュ内に
 * 書き込んでしまうため、外部プロジェクトでは完全にスキップし、
 * claude plugin update でリモートから最新を取得する。
 */
async function updateExternalProject(
  projectPath: string,
  options: UpdateSkillsOptions,
  logger: ReturnType<typeof createLogger>,
  T: (key: string, params?: Record<string, string | number>) => string,
  newVersion: string,
  newPluginVersion: string,
  verbose: boolean,
): Promise<void> {
  const deployedRuleResults: DeployedRuleItem[] = [];

  if (!isClaudeCliAvailable()) {
    logger.warn(T("errorNoClaudeCli"));
    logger.info("Install: https://docs.anthropic.com/en/docs/claude-code/overview");
    return;
  }

  // Marketplace 登録確認
  const marketplaceOk = ensureMarketplace();
  if (!marketplaceOk) {
    logger.warn("Marketplace registration failed, proceeding with bundled fallback");
  }

  // 言語設定を確認（#495: キャッシュ登録とルール展開の両方で使用）
  const languageSetting = getLanguageSetting(projectPath);

  // claude plugin update でキャッシュ更新
  if (!options.dryRun && marketplaceOk) {
    logger.info(T("updatingGlobalCache"));

    const registryIds = [
      ...(languageSetting === "japanese" && hasJaPlugin()
        ? [PLUGIN_REGISTRY_ID_JA]
        : [PLUGIN_REGISTRY_ID]),
      ...(hasHooksPlugin() ? [PLUGIN_REGISTRY_ID_HOOKS] : []),
    ];

    for (const registryId of registryIds) {
      const cacheResult = registerPluginCache(projectPath, { reinstall: true, registryId });
      if (cacheResult.success) {
        logger.success(`${registryId}: ${T("globalCacheUpdated")}`);
      } else {
        logger.warn(`${registryId}: ${cacheResult.message ?? "update failed"}`);
      }
    }
  }

  // ルール展開（キャッシュ → bundled フォールバック）
  const useJaRules = languageSetting === "japanese" && hasJaPlugin();

  if (useJaRules) {
    logger.info(T("deployingRulesJa"));
    const jaRulesSource = getGlobalCachePath(PLUGIN_NAME_JA) ?? getBundledPluginPathJa();
    const deployResult = await deployRules(projectPath, {
      dryRun: options.dryRun,
      verbose: options.verbose ?? false,
      bundledPluginPath: jaRulesSource,
    });
    deployedRuleResults.push(...deployResult.deployed);
  } else {
    logger.info(T("deployingRules"));
    const enRulesSource = getGlobalCachePath(PLUGIN_NAME) ?? getBundledPluginPath();
    const deployResult = await deployRules(projectPath, {
      dryRun: options.dryRun,
      verbose: options.verbose ?? false,
      bundledPluginPath: enRulesSource,
    });
    deployedRuleResults.push(...deployResult.deployed);
  }

  // レガシー .claude/plugins/ 削除（マイグレーション）
  if (!options.dryRun) {
    cleanupLegacyPluginDir(projectPath);

    // レガシー shirokuma-ja/ 削除
    const legacyJaDir = resolve(projectPath, DEPLOYED_RULES_DIR_JA);
    if (existsSync(legacyJaDir)) {
      rmSync(legacyJaDir, { recursive: true, force: true });
    }
  }

  // Summary
  const result: UpdateResult = {
    skills: [],
    rules: [],
    deployedRules: deployedRuleResults,
    version: newVersion,
    pluginVersion: newPluginVersion,
    dryRun: options.dryRun ?? false,
    hooksStatus: hasHooksPlugin() ? "updated" : "not-applicable",
  };

  printSummary(result, logger);

  if (verbose) {
    console.log(JSON.stringify(result, null, 2));
  }
}

/**
 * Print update summary
 */
function printSummary(
  result: UpdateResult,
  logger: ReturnType<typeof createLogger>
): void {
  const T = (key: string, params?: Record<string, string | number>) =>
    t(`commands.updateSkills.${key}`, params);

  logger.info(`\n${T("summaryHeader")}`);

  const countByStatus = (items: UpdateItem[]) => {
    const counts = { updated: 0, added: 0, skipped: 0, unchanged: 0, error: 0, removed: 0 };
    for (const item of items) {
      counts[item.status]++;
    }
    return counts;
  };

  const formatCounts = (counts: Record<string, number>, keys: { key: string; field: string }[]) => {
    const parts: string[] = [];
    for (const { key, field } of keys) {
      if (counts[field] > 0) parts.push(T(key, { count: counts[field] }));
    }
    return parts;
  };

  const itemCountKeys = [
    { key: "countUpdated", field: "updated" },
    { key: "countAdded", field: "added" },
    { key: "countRemoved", field: "removed" },
    { key: "countSkipped", field: "skipped" },
    { key: "countUnchanged", field: "unchanged" },
    { key: "countError", field: "error" },
  ];

  const deployCountKeys = [
    { key: "countDeployed", field: "deployed" },
    { key: "countUpdated", field: "updated" },
    { key: "countUnchanged", field: "unchanged" },
    { key: "countError", field: "error" },
  ];

  const skillCounts = countByStatus(result.skills);
  const ruleCounts = countByStatus(result.rules);

  if (result.dryRun) {
    logger.info(T("dryRunNote"));
  }

  logger.info(T("cliVersion", { version: result.version }));
  logger.info(T("pluginVersion", { version: result.pluginVersion }));

  let totalErrors = 0;

  // スキル
  const skillParts = formatCounts(skillCounts, itemCountKeys);
  totalErrors += skillCounts.error;

  if (skillParts.length > 0) {
    const skillMsg = T("skillsSummary", { details: skillParts.join(", ") });
    if (skillCounts.error > 0) {
      logger.error(`✗ ${skillMsg}`);
    } else {
      logger.success(`✓ ${skillMsg}`);
    }
  }

  // ルール
  if (result.rules.length > 0) {
    const ruleParts = formatCounts(ruleCounts, itemCountKeys);
    totalErrors += ruleCounts.error;

    if (ruleParts.length > 0) {
      const ruleMsg = T("rulesSummary", { details: ruleParts.join(", ") });
      if (ruleCounts.error > 0) {
        logger.error(`✗ ${ruleMsg}`);
      } else {
        logger.success(`✓ ${ruleMsg}`);
      }
    }
  }

  // デプロイ済みルール
  if (result.deployedRules.length > 0) {
    const deployCounts = { deployed: 0, updated: 0, unchanged: 0, error: 0, removed: 0 };
    for (const item of result.deployedRules) {
      deployCounts[item.status]++;
    }

    const deployParts = formatCounts(deployCounts, deployCountKeys);
    totalErrors += deployCounts.error;

    if (deployParts.length > 0) {
      const deployMsg = T("deployedRulesSummary", { details: deployParts.join(", ") });
      if (deployCounts.error > 0) {
        logger.error(`✗ ${deployMsg}`);
      } else {
        logger.success(`✓ ${deployMsg}`);
      }
    }
  }

  // 安全フック
  if (result.hooksStatus !== "not-applicable") {
    const hooksLabel = T(`hooks${result.hooksStatus.charAt(0).toUpperCase()}${result.hooksStatus.slice(1)}`);
    const hooksMsg = T("hooksSummary", { status: hooksLabel });
    if (result.hooksStatus === "error") {
      logger.error(`✗ ${hooksMsg}`);
      totalErrors++;
    } else {
      logger.success(`✓ ${hooksMsg}`);
    }
  }

  // 全体の OK/NG インジケーター
  if (totalErrors > 0) {
    logger.error(`✗ ${T("completedError", { count: totalErrors })}`);
  } else {
    logger.success(`✓ ${T("completedOk")}`);
  }
}
