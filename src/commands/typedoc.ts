/**
 * typedoc コマンド - TypeDoc API ドキュメント生成
 *
 * TypeDoc API を使用して、Server Actions や DB スキーマの
 * API ドキュメントを生成する。
 *
 * - typedoc-plugin-markdown がある場合: Markdown 出力
 * - ない場合: HTML 出力
 */

import { resolve } from "node:path";
import { loadConfig, getOutputPath, resolvePath } from "../utils/config.js";
import { ensureDir, fileExists, dirExists } from "../utils/file.js";
import { createLogger, type Logger } from "../utils/logger.js";

interface TypedocOptions {
  project: string;
  config: string;
  output?: string;
  verbose?: boolean;
}

import { spawnSync } from "node:child_process";

/**
 * TypeDoc がインストールされているか確認 (npx経由)
 */
function isTypedocInstalled(projectPath: string): boolean {
  const result = spawnSync("npx", ["typedoc", "--version"], {
    cwd: projectPath,
    stdio: "pipe",
    encoding: "utf-8",
  });
  return result.status === 0;
}

/**
 * typedoc-plugin-markdown がインストールされているか確認
 */
function checkMarkdownPluginInstalled(
  projectPath: string,
  logger: Logger
): boolean {
  // pnpm の node_modules 構造に対応
  const result = spawnSync("npm", ["ls", "typedoc-plugin-markdown", "--json"], {
    cwd: projectPath,
    encoding: "utf-8",
    stdio: "pipe",
  });

  if (result.status !== 0 || !result.stdout) {
    logger.debug("typedoc-plugin-markdown がインストールされていません");
    return false;
  }

  try {
    const json = JSON.parse(result.stdout);
    const found = json.dependencies?.["typedoc-plugin-markdown"] !== undefined;
    if (found) {
      logger.debug("typedoc-plugin-markdown が見つかりました");
    } else {
      logger.debug("typedoc-plugin-markdown がインストールされていません");
    }
    return found;
  } catch {
    logger.debug("typedoc-plugin-markdown がインストールされていません");
    return false;
  }
}

/**
 * TypeDoc を使用してドキュメントを生成 (npx経由)
 */
function generateDocs(
  projectPath: string,
  entryPoints: string[],
  outputDir: string,
  tsconfigPath: string,
  plugins: string[],
  exclude: string[],
  logger: Logger
): boolean {
  logger.debug(`エントリーポイント: ${entryPoints.join(", ")}`);
  logger.debug(`出力先: ${outputDir}`);
  logger.debug(
    `プラグイン: ${plugins.length > 0 ? plugins.join(", ") : "なし"}`
  );

  // spawnSync 用の引数配列を構築
  const args = [
    "typedoc",
    ...entryPoints,
    "--out", outputDir,
    "--tsconfig", tsconfigPath,
    "--excludePrivate",
    "--excludeProtected",
    "--excludeInternal",
    "--hideGenerator",
    "--entryPointStrategy", "expand",
  ];

  // プラグインを追加
  for (const plugin of plugins) {
    args.push("--plugin", plugin);
  }

  // 除外パターンを追加
  for (const pattern of exclude) {
    args.push("--exclude", pattern);
  }

  logger.debug(`実行: npx ${args.join(" ")}`);

  const result = spawnSync("npx", args, {
    cwd: projectPath,
    stdio: "pipe",
    encoding: "utf-8",
  });

  if (result.status === 0) {
    logger.success(`ドキュメント生成完了: ${outputDir}`);
    return true;
  }

  logger.error(`TypeDoc 生成エラー: ${result.stderr || result.error}`);
  return false;
}

/**
 * typedoc コマンドハンドラ
 */
export async function typedocCommand(options: TypedocOptions): Promise<void> {
  const logger = createLogger(options.verbose);
  const projectPath = resolve(options.project);

  logger.info("TypeDoc API ドキュメントを生成");

  // TypeDoc インストール確認
  if (!isTypedocInstalled(projectPath)) {
    logger.error("TypeDoc がインストールされていません");
    logger.info("インストール: pnpm add -D typedoc typedoc-plugin-markdown");
    throw new Error("TypeDoc not installed");
  }
  logger.debug("TypeDoc: インストール確認済み");

  // 設定読み込み
  const config = loadConfig(projectPath, options.config);
  const typedocConfig = config.typedoc;

  if (!typedocConfig?.entryPoints?.length) {
    logger.warn("TypeDoc エントリーポイントが設定されていません");
    logger.info("設定例:");
    logger.info("  typedoc:");
    logger.info(
      '    entryPoints: ["./apps/web/lib/actions", "./packages/database/src/schema"]'
    );
    return;
  }

  // エントリーポイントを解決・検証
  const entryPoints: string[] = [];
  for (const ep of typedocConfig.entryPoints) {
    const resolvedPath = resolvePath(projectPath, ep);

    if (fileExists(resolvedPath) || dirExists(resolvedPath)) {
      entryPoints.push(resolvedPath);
      logger.debug(`エントリーポイント追加: ${resolvedPath}`);
    } else {
      logger.warn(`エントリーポイントが見つかりません: ${resolvedPath}`);
    }
  }

  if (entryPoints.length === 0) {
    logger.error("有効なエントリーポイントがありません");
    throw new Error("No valid entry points found");
  }

  // 出力ディレクトリを決定
  // 優先順位: CLI引数 > typedoc.out > output.generated/api
  let outputDir: string;
  if (options.output) {
    outputDir = resolve(options.output, "api");
  } else if (typedocConfig.out) {
    outputDir = resolvePath(projectPath, typedocConfig.out);
  } else {
    const generatedDir = getOutputPath(config, projectPath, "generated");
    outputDir = resolve(generatedDir, "api");
  }

  ensureDir(outputDir);

  // tsconfig パス
  const tsconfigPath = typedocConfig.tsconfig
    ? resolvePath(projectPath, typedocConfig.tsconfig)
    : resolve(projectPath, "tsconfig.json");

  if (!fileExists(tsconfigPath)) {
    logger.warn(`tsconfig が見つかりません: ${tsconfigPath}`);
    logger.info("TypeScript 設定なしで続行します");
  }

  // 除外パターン
  const exclude = typedocConfig.exclude || [
    "**/node_modules/**",
    "**/*.test.ts",
    "**/*.test.tsx",
    "**/*.spec.ts",
    "**/*.spec.tsx",
  ];

  // プラグインを決定
  // 設定ファイルで指定されている場合はそれを使用
  // 指定がない場合は typedoc-plugin-markdown の存在を確認
  let plugins: string[] = [];

  if (typedocConfig.plugin && typedocConfig.plugin.length > 0) {
    plugins = typedocConfig.plugin;
    logger.debug("設定ファイルからプラグインを使用");
  } else {
    // typedoc-plugin-markdown が利用可能か確認
    const hasMarkdownPlugin = checkMarkdownPluginInstalled(projectPath, logger);
    if (hasMarkdownPlugin) {
      plugins = ["typedoc-plugin-markdown"];
      logger.info("Markdown 形式で出力 (typedoc-plugin-markdown)");
    } else {
      logger.info("HTML 形式で出力");
    }
  }

  // ドキュメント生成
  const success = generateDocs(
    projectPath,
    entryPoints,
    outputDir,
    tsconfigPath,
    plugins,
    exclude,
    logger
  );

  if (!success) {
    throw new Error("TypeDoc generation failed");
  }

  logger.success("TypeDoc 生成完了");
}
