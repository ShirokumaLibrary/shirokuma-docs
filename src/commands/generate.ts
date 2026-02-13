/**
 * generate コマンド - 全ドキュメント生成
 */

import { resolve } from "node:path";
import { loadConfig, getOutputPath } from "../utils/config.js";
import { ensureDir } from "../utils/file.js";
import { createLogger } from "../utils/logger.js";
import { typedocCommand } from "./typedoc.js";
import { schemaCommand } from "./schema.js";
import { depsCommand } from "./deps.js";
import { testCasesCommand } from "./test-cases.js";
import { portalCommand } from "./portal.js";
import { searchIndexCommand } from "./search-index.js";
import { packagesCommand } from "./packages.js";
import { githubDataCommand } from "./github-data.js";

interface GenerateOptions {
  project: string;
  config: string;
  output?: string;
  withGithub?: boolean;
  verbose?: boolean;
}

/**
 * generate コマンドハンドラ
 */
export async function generateCommand(options: GenerateOptions): Promise<void> {
  const logger = createLogger(options.verbose);
  const projectPath = resolve(options.project);

  logger.info(`全ドキュメントを生成: ${projectPath}`);

  // 設定読み込み
  const config = loadConfig(projectPath, options.config);
  logger.debug(`プロジェクト名: ${config.project.name}`);

  // 出力ディレクトリ作成
  const outputDir = options.output || getOutputPath(config, projectPath, "base");
  const portalDir = getOutputPath(config, projectPath, "portal");
  const generatedDir = getOutputPath(config, projectPath, "generated");

  ensureDir(outputDir);
  ensureDir(portalDir);
  ensureDir(generatedDir);

  logger.info(`出力先: ${outputDir}`);

  const steps: Array<{ name: string; fn: (opts: GenerateOptions) => Promise<unknown> }> = [
    { name: "TypeDoc API ドキュメント", fn: typedocCommand },
    { name: "DB スキーマ", fn: schemaCommand },
    { name: "依存関係グラフ", fn: depsCommand },
    { name: "テストケース一覧", fn: testCasesCommand },
    { name: "パッケージドキュメント", fn: packagesCommand },
    { name: "検索インデックス", fn: searchIndexCommand },
  ];

  // Add GitHub data step if --with-github is specified
  if (options.withGithub) {
    steps.push({
      name: "GitHub データ",
      fn: async (opts: GenerateOptions) => {
        await githubDataCommand({
          project: opts.project,
          output: outputDir,
          verbose: opts.verbose,
        });
      },
    });
  }

  // Portal is always last
  steps.push({ name: "ポータル", fn: portalCommand });

  const total = steps.length;
  let completed = 0;
  let failed = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    logger.step(i + 1, total, `${step.name} を生成中...`);

    try {
      await step.fn({
        project: projectPath,
        config: options.config,
        output: options.output,
        verbose: options.verbose,
      });
      completed++;
      logger.success(`${step.name} 完了`);
    } catch (error) {
      failed++;
      logger.warn(`${step.name} スキップ: ${error}`);
    }
  }

  // サマリー
  console.log("");
  logger.info("=== 生成完了 ===");
  logger.info(`成功: ${completed}/${total}`);
  if (failed > 0) {
    logger.warn(`スキップ: ${failed}/${total}`);
  }
  logger.info(`出力先: ${outputDir}`);
  logger.info(`ポータル: ${portalDir}/index.html`);
}
