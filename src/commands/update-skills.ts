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
import { existsSync } from "node:fs";
import { createLogger } from "../utils/logger.js";
import { t } from "../utils/i18n.js";
import {
  PLUGIN_NAME,
  PLUGIN_NAME_JA,
  PLUGIN_NAME_HOOKS,
  PLUGIN_REGISTRY_ID,
  PLUGIN_REGISTRY_ID_JA,
  PLUGIN_REGISTRY_ID_HOOKS,
  getBundledPluginPath,
  getBundledPluginPathJa,
  getPackageVersion,
  getPluginVersion,
  deployRules,
  registerPluginCache,
  ensureMarketplace,
  getGlobalCachePath,
  cleanupOldCacheVersions,
  cleanDeployedRules,
  isClaudeCliAvailable,
  getLanguageSetting,
  ensureSingleLanguagePlugin,
  type DeployedRuleItem,
} from "../utils/skills-repo.js";

/**
 * update-skills command options
 */
interface UpdateSkillsOptions {
  /** Project path */
  project: string;
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

  const newVersion = getPackageVersion();

  if (options.dryRun) {
    logger.info(T("dryRunBanner"));
  }

  logger.info(T("cliVersion", { version: newVersion }));

  // marketplace からキャッシュ経由で更新（#486, #674, #801）
  // バンドルプラグインが存在しなくても動作する
  const newPluginVersion = getPluginVersion();
  logger.info(T("pluginVersion", { version: newPluginVersion }));
  return updateExternalProject(projectPath, options, logger, T, newVersion, newPluginVersion, verbose);
}

/**
 * update-skills 本体: marketplace キャッシュ経由で更新（#486, #801）
 *
 * claude plugin update でリモートから最新を取得し、
 * ルールを .claude/rules/shirokuma/ に展開する。
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

  // 言語設定を確認（#495: キャッシュ登録とルール展開の両方で使用）
  const languageSetting = getLanguageSetting(projectPath);

  // claude CLI が利用可能な場合のみキャッシュ更新を実行 (#632: graceful degradation)
  if (isClaudeCliAvailable()) {
    // Marketplace 登録確認
    const marketplaceOk = ensureMarketplace();
    if (!marketplaceOk) {
      logger.warn("Marketplace registration failed, proceeding with bundled fallback");
    }

    // claude plugin update でキャッシュ更新
    if (!options.dryRun && marketplaceOk) {
      logger.info(T("updatingGlobalCache"));

      // #636: 外部プロジェクトでは marketplace からインストールするため hasJaPlugin()/hasHooksPlugin() 不要
      const registryIds = [
        ...(languageSetting === "japanese"
          ? [PLUGIN_REGISTRY_ID_JA]
          : [PLUGIN_REGISTRY_ID]),
        PLUGIN_REGISTRY_ID_HOOKS,
      ];

      for (const registryId of registryIds) {
        const cacheResult = registerPluginCache(projectPath, { reinstall: true, registryId });
        if (cacheResult.success) {
          logger.success(`${registryId}: ${T("globalCacheUpdated")}`);
        } else {
          logger.warn(`${registryId}: ${cacheResult.message ?? "update failed"}`);
        }
      }

      // 古いキャッシュバージョンをクリーンアップ (#679)
      const pluginNames = languageSetting === "japanese"
        ? [PLUGIN_NAME_JA, PLUGIN_NAME_HOOKS]
        : [PLUGIN_NAME, PLUGIN_NAME_HOOKS];
      for (const pn of pluginNames) {
        const removed = cleanupOldCacheVersions(pn);
        if (removed.length > 0) {
          logger.info(`${pn}: ${removed.length} old cache version(s) removed`);
        }
      }

      // 逆言語プラグインを削除 (#812)
      const singleLangResult = ensureSingleLanguagePlugin(projectPath, languageSetting, { verbose });
      if (singleLangResult.attempted) {
        logger.info(`${singleLangResult.oppositePlugin}: opposite language plugin removed`);
        // 逆言語のルールが残っている可能性があるため、デプロイ前にクリーン
        await cleanDeployedRules(projectPath, { verbose });
      }
    }
  } else {
    logger.warn(T("errorNoClaudeCli"));
    logger.info("Proceeding with bundled fallback for rule deployment");
  }

  // ルール展開（キャッシュ → bundled フォールバック）
  // #636: 外部プロジェクトではキャッシュからデプロイするため hasJaPlugin() 不要
  const useJaRules = languageSetting === "japanese";

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

  // Summary
  const result: UpdateResult = {
    skills: [],
    rules: [],
    deployedRules: deployedRuleResults,
    version: newVersion,
    pluginVersion: newPluginVersion,
    dryRun: options.dryRun ?? false,
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

  // 全体の OK/NG インジケーター
  if (totalErrors > 0) {
    logger.error(`✗ ${T("completedError", { count: totalErrors })}`);
  } else {
    logger.success(`✓ ${T("completedOk")}`);
  }

  // セッション再起動案内（#589）
  if (!result.dryRun) {
    logger.info("");
    logger.warn(T("restartSessionNotice"));
    logger.info(T("restartSessionHint"));
  }
}
