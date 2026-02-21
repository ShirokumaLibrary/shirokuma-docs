/**
 * init command - Initialize configuration file
 *
 * @description Initializes shirokuma-docs configuration for a project and
 * optionally installs the bundled shirokuma-skills-en plugin.
 *
 * @example
 * ```bash
 * # Create config file only
 * shirokuma-docs init
 *
 * # Install plugin (skills + rules)
 * shirokuma-docs init --with-skills
 *
 * # Install specific skills only
 * shirokuma-docs init --with-skills=coding-nextjs,reviewing-on-issue
 * ```
 */

import { resolve, dirname } from "node:path";
import { existsSync, writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { Document as YamlDocument, type YAMLMap, type Scalar } from "yaml";
import { createLogger, type Logger } from "../utils/logger.js";
import { t } from "../utils/i18n.js";
import { validateGitHubSetup, printSetupCheckResults, type SetupCheckResult } from "../utils/setup-check.js";
import { type ShirokumaConfig } from "../utils/config.js";
import {
  deployRules,
  registerPluginCache,
  ensureMarketplace,
  getGlobalCachePath,
  getInstalledSkills,
  getInstalledRules,
  updateGitignore,
  isClaudeCliAvailable,
  getLanguageSetting,
  getBundledPluginPath,
  getBundledPluginPathJa,
  DEPLOYED_RULES_DIR,
  PLUGIN_NAME,
  PLUGIN_NAME_JA,
  PLUGIN_REGISTRY_ID_JA,
  PLUGIN_REGISTRY_ID_HOOKS,
  cleanDeployedRules,
  ensureSingleLanguagePlugin,
} from "../utils/skills-repo.js";

/**
 * init command options
 */
interface InitOptions {
  /** Project path */
  project: string;
  /** Overwrite existing files */
  force?: boolean;
  /** Install skills (true=all, string=comma-separated) */
  withSkills?: boolean | string;
  /** Install rules */
  withRules?: boolean;
  /** Verbose logging */
  verbose?: boolean;
  /** Language setting (en|ja) */
  lang?: string;
  /** Manage .gitignore (default: true, set false by --no-gitignore) */
  gitignore?: boolean;
  /** Scaffold Next.js monorepo structure */
  nextjs?: boolean;
}

/**
 * init command result
 */
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

/** 言語コードから settings.json の language 値へのマッピング */
const LANG_MAP: Record<string, string> = {
  en: "english",
  ja: "japanese",
};

/**
 * init command error
 */
class InitError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "InitError";
  }
}

/**
 * Default config template
 */
const defaultConfigTemplate: ShirokumaConfig = {
  project: {
    name: "Project Name",
    description: "プロジェクト説明",
    url: "",
  },
  output: {
    dir: "./docs",
    portal: "./docs/portal",
    generated: "./docs/generated",
  },
  typedoc: {
    entryPoints: [
      "./apps/web/lib/actions",
      "./packages/database/src/schema",
    ],
    tsconfig: "./tsconfig.json",
    exclude: ["**/node_modules/**", "**/*.test.ts", "**/*.spec.ts"],
  },
  schema: {
    sources: [
      { path: "./packages/database/src/schema" },
    ],
    pattern: "*.ts",
  },
  deps: {
    include: [
      "apps/web/lib/actions",
      "apps/web/components",
    ],
    exclude: ["node_modules", ".next", "dist"],
    output: "./docs/generated/architecture",
    formats: ["svg", "json"],
  },
  testCases: {
    jest: {
      config: "./jest.config.ts",
      testMatch: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
    },
    playwright: {
      config: "./playwright.config.ts",
      testDir: "./tests/e2e",
    },
  },
  portal: {
    title: "ドキュメントポータル",
    links: [],
    devTools: [],
  },
  lintDocs: {
    enabled: false,
  },
  lintCode: {
    enabled: false,
  },
  lintStructure: {
    enabled: false,
  },
  lintAnnotations: {
    enabled: false,
  },
  adr: {
    enabled: true,
    directory: "docs/adr",
    template: "madr",
    language: "ja",
  },
  hooks: {
    enabled: [
      "pr-merge",
      "force-push",
      "hard-reset",
      "discard-worktree",
      "clean-untracked",
      "force-delete-branch",
    ],
  },
};

/**
 * Next.js monorepo config template
 */
const nextjsMonorepoTemplate: ShirokumaConfig = {
  project: {
    name: "my-nextjs-app",
    description: "Next.js モノレポプロジェクト",
    url: "",
  },
  output: {
    dir: "./docs",
    portal: "./docs/portal",
    generated: "./docs/generated",
  },
  typedoc: {
    entryPoints: [
      "./apps/web/src/app",
      "./apps/web/lib",
    ],
    tsconfig: "./tsconfig.json",
    exclude: ["**/node_modules/**", "**/*.test.ts", "**/*.spec.ts"],
  },
  schema: {
    sources: [
      { path: "./packages/database/src/schema" },
    ],
    pattern: "*.ts",
  },
  deps: {
    include: [
      "apps/web/**/*.ts",
      "packages/**/*.ts",
    ],
    exclude: ["node_modules", ".next", "dist"],
    output: "./docs/generated/architecture",
    formats: ["svg", "json"],
  },
  testCases: {
    jest: {
      config: "./jest.config.ts",
      testMatch: ["**/apps/web/__tests__/**/*.test.{ts,tsx}", "**/apps/web/**/*.test.{ts,tsx}"],
    },
    playwright: {
      config: "./playwright.config.ts",
      testDir: "./apps/web/e2e",
    },
  },
  portal: {
    title: "ドキュメントポータル",
    links: [],
    devTools: [],
  },
  lintDocs: {
    enabled: false,
  },
  lintCode: {
    enabled: false,
  },
  lintStructure: {
    enabled: false,
  },
  lintAnnotations: {
    enabled: false,
  },
  adr: {
    enabled: true,
    directory: "docs/adr",
    template: "madr",
    language: "ja",
  },
  hooks: {
    enabled: [
      "pr-merge",
      "force-push",
      "hard-reset",
      "discard-worktree",
      "clean-untracked",
      "force-delete-branch",
    ],
  },
};

/** Next.js monorepo scaffold result */
interface ScaffoldResult {
  directories_created: string[];
  files_created: string[];
  git_initialized: boolean;
}

/**
 * Scaffold Next.js monorepo directory structure and base files.
 * Skips existing directories and files to avoid overwriting user data.
 */
function scaffoldNextjsMonorepo(projectPath: string): ScaffoldResult {
  const result: ScaffoldResult = {
    directories_created: [],
    files_created: [],
    git_initialized: false,
  };

  // モノレポディレクトリ構造を生成
  const directories = [
    "apps/web/src/app/(dashboard)",
    "apps/web/lib/actions",
    "apps/web/__tests__",
    "apps/web/e2e",
    "packages/database/src/schema",
    "packages/shared/src",
  ];

  for (const dir of directories) {
    const fullPath = resolve(projectPath, dir);
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
      result.directories_created.push(dir);
    }
  }

  // Root package.json（存在しない場合のみ生成）
  const rootPkgPath = resolve(projectPath, "package.json");
  if (!existsSync(rootPkgPath)) {
    const rootPkg = {
      name: "my-nextjs-app",
      version: "0.1.0",
      private: true,
      workspaces: ["apps/*", "packages/*"],
      scripts: {
        dev: "pnpm --filter web dev",
        build: "pnpm --filter web build",
        test: "pnpm --filter web test",
        "test:e2e": "pnpm --filter web test:e2e",
        lint: "pnpm --filter web lint",
      },
      packageManager: "pnpm@10.30.0",
    };
    writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + "\n", "utf-8");
    result.files_created.push("package.json");
  }

  // apps/web/package.json（存在しない場合のみ生成）
  const webPkgPath = resolve(projectPath, "apps/web/package.json");
  if (!existsSync(webPkgPath)) {
    const webPkg = {
      name: "web",
      version: "0.1.0",
      private: true,
      scripts: {
        dev: "next dev",
        build: "next build",
        start: "next start",
        lint: "next lint",
        test: "jest",
        "test:e2e": "playwright test",
      },
      dependencies: {
        "next": "^16.0.0",
        "react": "^19.0.0",
        "react-dom": "^19.0.0",
        "better-auth": "^1.0.0",
        "next-intl": "^3.0.0",
        "@workspace/database": "workspace:*",
        "@workspace/shared": "workspace:*",
      },
      devDependencies: {
        "@types/node": "^22.0.0",
        "@types/react": "^19.0.0",
        "typescript": "^5.0.0",
        "tailwindcss": "^4.0.0",
        "jest": "^29.0.0",
        "@playwright/test": "^1.40.0",
      },
    };
    writeFileSync(webPkgPath, JSON.stringify(webPkg, null, 2) + "\n", "utf-8");
    result.files_created.push("apps/web/package.json");
  }

  // packages/database/package.json（存在しない場合のみ生成）
  const dbPkgPath = resolve(projectPath, "packages/database/package.json");
  if (!existsSync(dbPkgPath)) {
    const dbPkg = {
      name: "@workspace/database",
      version: "0.1.0",
      private: true,
      exports: {
        ".": "./src/index.ts",
        "./schema": "./src/schema/index.ts",
      },
      dependencies: {
        "drizzle-orm": "^0.30.0",
      },
      devDependencies: {
        "@types/node": "^22.0.0",
        "typescript": "^5.0.0",
        "drizzle-kit": "^0.20.0",
      },
    };
    writeFileSync(dbPkgPath, JSON.stringify(dbPkg, null, 2) + "\n", "utf-8");
    result.files_created.push("packages/database/package.json");
  }

  // packages/shared/package.json（存在しない場合のみ生成）
  const sharedPkgPath = resolve(projectPath, "packages/shared/package.json");
  if (!existsSync(sharedPkgPath)) {
    const sharedPkg = {
      name: "@workspace/shared",
      version: "0.1.0",
      private: true,
      exports: {
        ".": "./src/index.ts",
      },
      devDependencies: {
        "@types/node": "^22.0.0",
        "typescript": "^5.0.0",
      },
    };
    writeFileSync(sharedPkgPath, JSON.stringify(sharedPkg, null, 2) + "\n", "utf-8");
    result.files_created.push("packages/shared/package.json");
  }

  // git init（.git が存在しない場合のみ実行）
  const gitDir = resolve(projectPath, ".git");
  if (!existsSync(gitDir)) {
    try {
      const gitResult = spawnSync("git", ["init"], {
        cwd: projectPath,
        encoding: "utf-8",
      });
      if (gitResult.status === 0) {
        result.git_initialized = true;
      }
    } catch {
      // git init 失敗は無視
    }
  }

  return result;
}

/** セクションコメント定義 */
const sectionComments: Record<string, string> = {
  typedoc: "TypeDoc API ドキュメント生成対象。自分のプロジェクトのソースパスに変更してください。",
  schema: "Drizzle ORM スキーマの ER 図生成。Drizzle を使わない場合はセクションごと削除してください。",
  deps: "依存関係グラフ生成。include に分析対象のパスを指定してください。",
  testCases: "テストケース抽出設定。Jest / Playwright の設定パスを指定してください。",
  portal: "ドキュメントポータル設定。devTools にローカル開発ツールの URL を追加できます。",
  lintDocs: "ドキュメント構造検証。有効にするには enabled: true に変更してください。",
  lintCode: "コードアノテーション検証。有効にするには enabled: true に変更してください。",
  lintStructure: "プロジェクト構造検証。有効にするには enabled: true に変更してください。",
  lintAnnotations: "アノテーション整合性検証。有効にするには enabled: true に変更してください。",
  adr: "ADR (Architecture Decision Records) 設定。GitHub Discussions 連携。",
  hooks: "破壊的コマンド保護設定。不要なルールはコメントアウトまたは削除してください。",
};

/**
 * YAML Document API を使い、セクションコメント付きの config を生成する
 */
function buildConfigYaml(config: ShirokumaConfig): string {
  const doc = new YamlDocument(config);

  doc.commentBefore = " shirokuma-docs 設定ファイル\n 詳細: https://github.com/ShirokumaLibrary/shirokuma-docs";

  // 各セクションにコメントを付与
  const contents = doc.contents as YAMLMap | null;
  if (contents?.items) {
    for (const item of contents.items) {
      const keyNode = item.key as Scalar;
      const key = String(keyNode.value);
      if (sectionComments[key]) {
        keyNode.commentBefore = ` ${sectionComments[key]}`;
      }
    }
  }

  return doc.toString({ indent: 2, lineWidth: 0 }) + "\n";
}

/**
 * init command handler
 *
 * @param options - Command options
 * @throws {InitError} On fatal error
 */
export async function initCommand(options: InitOptions): Promise<void> {
  const logger = createLogger(options.verbose ?? true);
  const projectPath = resolve(options.project);
  const configPath = resolve(projectPath, "shirokuma-docs.config.yaml");

  const result: InitResult = {
    config_created: false,
    plugin_installed: false,
    cache_registered: false,
    language_set: false,
    gitignore_updated: false,
    gitignore_entries_added: 0,
    skills_installed: [],
    rules_installed: [],
    rules_deployed: 0,
    nextjs_scaffolded: false,
    nextjs_directories_created: 0,
  };

  // Validate --lang option
  if (options.lang && !LANG_MAP[options.lang]) {
    logger.error(`Invalid --lang value: ${options.lang}. Use 'en' or 'ja'.`);
    throw new InitError(`Invalid --lang value: ${options.lang}`);
  }

  // Initialize config file
  // Note: --force only applies to skill/rule redeployment, not config overwrite
  const shouldCreateConfig = !existsSync(configPath);

  if (shouldCreateConfig) {
    logger.info(t("commands.init.initializingConfig", { path: configPath }));

    const template = options.nextjs ? nextjsMonorepoTemplate : defaultConfigTemplate;
    const yamlContent = buildConfigYaml(template);

    try {
      writeFileSync(configPath, yamlContent, "utf-8");
      logger.success(t("commands.init.success", { path: configPath }));
      result.config_created = true;
    } catch (error) {
      const message = t("commands.init.configCreateFailed", {
        error: error instanceof Error ? error.message : String(error),
      });
      logger.error(message);
      throw new InitError(message, error);
    }
  } else if (!options.withSkills && !options.withRules && !options.lang) {
    logger.warn(t("commands.init.exists"));
    logger.info(t("commands.init.existsHint"));
    logger.info(t("commands.init.existsRegenHint"));
    return;
  }

  // Install plugin (skills + rules)
  if (options.withSkills || options.withRules) {
    try {
      logger.info("\n" + t("commands.init.installingPlugin"));

      // 言語設定を確認（--lang オプション優先、なければ既存 settings.json）
      const effectiveLang = options.lang ? LANG_MAP[options.lang] : getLanguageSetting(projectPath);

      // marketplace 登録 + キャッシュインストール (#801: 常に external フロー)
      if (isClaudeCliAvailable()) {
        logger.info("\n" + t("commands.init.registeringCache"));
        const marketplaceOk = ensureMarketplace();
        if (marketplaceOk) {
          // 言語に応じたスキルプラグインを登録（#495, #636: marketplace パスでは hasJaPlugin() 不要）
          if (effectiveLang === "japanese") {
            const jaCacheResult = registerPluginCache(projectPath, { registryId: PLUGIN_REGISTRY_ID_JA });
            if (jaCacheResult.success) {
              logger.success(t("commands.init.jaCacheRegistered"));
              result.cache_registered = true;
            } else {
              logger.warn(t("commands.init.cacheFailed", { message: jaCacheResult.message ?? "" }));
            }
          } else {
            const cacheResult = registerPluginCache(projectPath);
            if (cacheResult.success) {
              logger.success(t("commands.init.cacheRegistered"));
              result.cache_registered = true;
            } else {
              logger.warn(t("commands.init.cacheFailed", { message: cacheResult.message ?? "" }));
            }
          }

          // Hooks プラグイン: 言語に関わらず常に登録（#636: marketplace パスでは hasHooksPlugin() 不要）
          const hooksCacheResult = registerPluginCache(projectPath, { registryId: PLUGIN_REGISTRY_ID_HOOKS });
          if (hooksCacheResult.success) {
            logger.success(t("commands.init.hooksCacheRegistered"));
          }

          // 逆言語プラグインを削除 (#812)
          const singleLangResult = ensureSingleLanguagePlugin(projectPath, effectiveLang, { verbose: options.verbose ?? false });
          if (singleLangResult.attempted) {
            logger.info(`${singleLangResult.oppositePlugin}: opposite language plugin removed`);
            // 逆言語のルールが残っている可能性があるため、デプロイ前にクリーン
            await cleanDeployedRules(projectPath, { verbose: options.verbose ?? false });
          }
        } else {
          logger.warn("Marketplace registration failed");
        }
      } else {
        logger.warn("\n" + t("commands.init.claudeNotFound"));
        logger.info(t("commands.init.claudeInstallHint"));
      }

      result.plugin_installed = true;
      result.skills_installed = getInstalledSkills(projectPath);
      result.rules_installed = getInstalledRules(projectPath);

      // Deploy rules to .claude/rules/shirokuma/ (#254: 言語設定に基づき単一ディレクトリに統一)
      logger.info("\n" + t("commands.init.deployingRules"));

      // #801: 常に marketplace キャッシュからデプロイするため hasJaPlugin() 不要
      const useJaRules = effectiveLang === "japanese";

      let deployedNames: string[];

      if (useJaRules) {
        // 日本語ルールをデプロイ（キャッシュ → bundled フォールバック）
        const jaRulesSource = getGlobalCachePath(PLUGIN_NAME_JA)
          ?? getBundledPluginPathJa();
        const deployResult = await deployRules(projectPath, {
          verbose: options.verbose ?? false,
          bundledPluginPath: jaRulesSource,
        });
        deployedNames = deployResult.deployed
          .filter(r => r.status === "deployed" || r.status === "updated" || r.status === "unchanged")
          .map(r => r.name);
        result.rules_deployed = deployedNames.length;
      } else {
        // 英語ルールをデプロイ（キャッシュ → bundled フォールバック）
        const enRulesSource = getGlobalCachePath(PLUGIN_NAME)
          ?? getBundledPluginPath();
        const deployResult = await deployRules(projectPath, {
          verbose: options.verbose ?? false,
          bundledPluginPath: enRulesSource,
        });
        deployedNames = deployResult.deployed
          .filter(r => r.status === "deployed" || r.status === "updated" || r.status === "unchanged")
          .map(r => r.name);
        result.rules_deployed = deployedNames.length;
      }

    } catch (error) {
      if (error instanceof InitError) {
        logger.error(error.message);
        throw error;
      }
      const message = t("errors.errorOccurred", {
        error: error instanceof Error ? error.message : String(error),
      });
      logger.error(message);
      throw new InitError(message, error);
    }
  }

  // Write language to .claude/settings.json
  if (options.lang) {
    const settingsPath = resolve(projectPath, ".claude", "settings.json");
    const settingsDir = dirname(settingsPath);
    try {
      mkdirSync(settingsDir, { recursive: true });

      // 既存の settings.json があればマージ、なければ新規作成
      let settings: Record<string, unknown> = {};
      if (existsSync(settingsPath)) {
        try {
          const raw = readFileSync(settingsPath, "utf-8");
          const parsed: unknown = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            settings = parsed as Record<string, unknown>;
          } else {
            logger.warn(`${settingsPath} is not a JSON object, overwriting`);
          }
        } catch {
          logger.warn(`${settingsPath} contains invalid JSON, overwriting`);
        }
      }

      settings.language = LANG_MAP[options.lang];
      writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
      result.language_set = true;
      logger.success(t("commands.init.languageSet", { lang: LANG_MAP[options.lang] }));
    } catch (error) {
      logger.warn(`Failed to write ${settingsPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Scaffold Next.js monorepo structure
  if (options.nextjs) {
    logger.info("\n" + t("commands.init.nextjsScaffolding"));
    const scaffoldResult = scaffoldNextjsMonorepo(projectPath);
    result.nextjs_scaffolded = true;
    result.nextjs_directories_created = scaffoldResult.directories_created.length;
    if (scaffoldResult.git_initialized) {
      logger.success(t("commands.init.nextjsGitInitDone"));
    }
    logger.success(t("commands.init.nextjsScaffoldDone"));
  }

  // Update .gitignore (unless --no-gitignore)
  if (options.gitignore !== false) {
    logger.info("\n" + t("commands.init.updatingGitignore"));
    const gitignoreResult = updateGitignore(projectPath, {
      verbose: options.verbose,
    });
    if (gitignoreResult.added.length > 0) {
      result.gitignore_updated = true;
      result.gitignore_entries_added = gitignoreResult.added.length;
      logger.success(t("commands.init.gitignoreUpdated", {
        count: gitignoreResult.added.length,
      }));
    }
  }

  // Summary
  logger.info("\n" + t("commands.init.setupComplete"));
  if (result.config_created) {
    logger.info(t("commands.init.summaryConfig"));
  }
  if (result.plugin_installed) {
    logger.info(t("commands.init.summaryPlugin", {
      skillCount: result.skills_installed.length,
      ruleCount: result.rules_installed.length,
    }));
    if (result.rules_deployed > 0) {
      logger.info(t("commands.init.summaryRules", {
        count: result.rules_deployed,
        dir: DEPLOYED_RULES_DIR,
      }));
    }
    if (result.cache_registered) {
      logger.info(t("commands.init.summaryCache"));
    }
  }
  if (result.language_set) {
    logger.info(t("commands.init.summaryLanguage", { lang: LANG_MAP[options.lang!] }));
  }
  if (result.gitignore_updated) {
    logger.info(t("commands.init.summaryGitignore", { count: result.gitignore_entries_added }));
  }
  if (result.nextjs_scaffolded) {
    logger.info(t("commands.init.summaryNextjs"));
  }

  // セッション再起動案内（#589: プラグインインストール後に必須）
  if (result.plugin_installed && result.cache_registered) {
    logger.info("");
    logger.warn(t("commands.init.restartSessionNotice"));
    logger.info(t("commands.init.restartSessionHint"));
  }

  if (options.verbose) {
    console.log(JSON.stringify(result, null, 2));
  }

  // Next steps guidance (#801: 常に external フロー)
  if (result.plugin_installed) {
    const claudeCliFound = isClaudeCliAvailable();
    printNextSteps(logger, result.cache_registered, claudeCliFound);
  } else {
    logger.info("\n" + t("commands.init.editConfigHint"));
    logger.info(t("commands.init.editConfigCmd"));
  }
}

/**
 * gh CLI を使った GitHub セットアップ検証を試みる。
 * gh 未インストール、未認証、オフライン、GitHub remote 未設定の場合は null を返す。
 */
function tryValidateGitHubSetup(logger: Logger): SetupCheckResult | null {
  // テスト時は GitHub API 呼び出しをスキップ（タイムアウト防止 #703）
  if (process.env.SHIROKUMA_NO_CLAUDE_CLI) return null;
  try {
    return validateGitHubSetup(logger);
  } catch {
    return null;
  }
}

/**
 * Print next-steps guidance for external projects after plugin installation
 *
 * @param logger - Logger instance
 * @param cacheRegistered - Whether cache registration succeeded (skip manual step if true)
 * @param claudeCliFound - Whether claude CLI was found in PATH
 */
function printNextSteps(logger: Logger, cacheRegistered: boolean, claudeCliFound: boolean): void {
  logger.info("\n" + t("commands.init.nextSteps") + "\n");

  let step = 1;

  if (!cacheRegistered) {
    if (!claudeCliFound) {
      logger.info(t("commands.init.stepInstallClaude", { step }));
      logger.info(t("commands.init.stepInstallClaudeUrl") + "\n");
      step++;
      logger.info(t("commands.init.stepRegisterCache", { step }));
    } else {
      logger.info(t("commands.init.stepRegisterCacheFallback", { step }));
    }
    logger.info(t("commands.init.stepRegisterCacheCmd") + "\n");
    step++;
  }

  logger.info(t("commands.init.stepEditConfig", { step }));
  logger.info(t("commands.init.stepEditConfigFile") + "\n");
  step++;

  logger.info(t("commands.init.stepGenerate", { step }));
  logger.info(t("commands.init.stepGenerateCmd") + "\n");
  step++;

  // GitHub 手動設定: 動的検証 or テキストベースフォールバック
  logger.info(t("commands.init.stepManualSetup", { step }));
  const setupResult = tryValidateGitHubSetup(logger);
  if (setupResult) {
    printSetupCheckResults(setupResult, logger);
    if (setupResult.summary.missing > 0) {
      logger.info("\n" + t("commands.init.stepManualSetupFixHint"));
    } else {
      logger.info("\n" + t("commands.init.stepManualSetupAllOk"));
    }
  } else {
    // フォールバック: gh CLI が使えない場合はテキスト案内
    logger.info(t("commands.init.stepManualSetupCategories"));
    logger.info(t("commands.init.stepManualSetupWorkflows"));
    logger.info(t("commands.init.stepManualSetupVerify") + "\n");
  }
  step++;

  // Discussion テンプレート生成の推奨タイミング
  logger.info(t("commands.init.stepDiscussionTemplates", { step }));
  logger.info(t("commands.init.stepDiscussionTemplatesHint"));
  logger.info(t("commands.init.stepDiscussionTemplatesCmd") + "\n");
  step++;

  logger.info(t("commands.init.skillsHeader") + "\n");
  logger.info(t("commands.init.skillWorkingOnIssue"));
  logger.info(t("commands.init.skillStartingSession"));
  logger.info(t("commands.init.skillCommitting"));
  logger.info(t("commands.init.skillCreatingPr") + "\n");

  logger.info(t("commands.init.skillUpdate"));
  if (cacheRegistered) {
    logger.info(t("commands.init.skillUpdateNote"));
  }
}

// Export error class
export { InitError };
