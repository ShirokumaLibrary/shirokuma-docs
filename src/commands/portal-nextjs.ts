/**
 * Next.js ベースのポータルビルダー
 *
 * 既存のJSON生成コマンドと連携し、Next.js + shadcn/ui で
 * 静的HTMLポータルを生成する
 */

import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { existsSync, cpSync, rmSync, mkdirSync, copyFileSync, readdirSync, statSync, writeFileSync, readFileSync } from "node:fs";
import { loadConfig, getOutputPath } from "../utils/config.js";
import { createLogger } from "../utils/logger.js";
import { runApiTools } from "./api-tools.js";
import { runLintCoverage } from "./lint-coverage.js";

// __dirname equivalent for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * ポータル出力形式
 */
type PortalFormat = "card" | "document";

interface NextjsPortalOptions {
  project: string;
  config: string;
  output?: string;
  format?: PortalFormat;
  verbose?: boolean;
}

/**
 * shirokuma-docs パッケージ内の portal ディレクトリを取得
 */
function getPortalSourceDir(): string {
  // dist/commands/portal-nextjs.js から見て ../../portal
  return resolve(__dirname, "..", "..", "portal");
}

/**
 * 再帰的にディレクトリをコピー
 */
function copyDirRecursive(src: string, dest: string): void {
  if (!existsSync(src)) return;

  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }

  const entries = readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      // node_modules, .next, out はスキップ
      if (["node_modules", ".next", "out"].includes(entry.name)) {
        continue;
      }
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Next.js ポータルをビルド
 */
export async function buildNextjsPortal(options: NextjsPortalOptions): Promise<void> {
  const logger = createLogger(options.verbose);
  const projectPath = resolve(options.project);

  logger.info("Next.js ポータルをビルド中...");

  // 設定読み込み
  const config = loadConfig(projectPath, options.config);

  // 出力ディレクトリ
  // --output で指定された場合はそのまま使用（追加の "portal" は付けない）
  const outputDir = options.output
    ? resolve(options.output)
    : getOutputPath(config, projectPath, "portal");

  // ポータルソースディレクトリ
  const portalSrcDir = getPortalSourceDir();

  if (!existsSync(portalSrcDir)) {
    logger.error(`ポータルソースディレクトリが見つかりません: ${portalSrcDir}`);
    logger.error("shirokuma-docs が正しくインストールされているか確認してください");
    throw new Error("Portal source not found");
  }

  logger.info(`ポータルソース: ${portalSrcDir}`);
  logger.info(`出力先: ${outputDir}`);

  // 一時ビルドディレクトリ
  const tmpBuildDir = resolve(projectPath, ".shirokuma-portal-build");

  try {
    // 1. 一時ディレクトリにポータルプロジェクトをコピー
    logger.info("ポータルプロジェクトを準備中...");
    if (existsSync(tmpBuildDir)) {
      rmSync(tmpBuildDir, { recursive: true, force: true });
    }
    copyDirRecursive(portalSrcDir, tmpBuildDir);

    // 2. データファイルをコピー
    logger.info("データファイルを配置中...");
    const dataDir = resolve(tmpBuildDir, "data");
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    // config から applications.json を生成
    const rawConfig = config as unknown as { applications?: { shared?: unknown; apps?: unknown[] } };
    if (rawConfig.applications) {
      const applicationsData = {
        shared: rawConfig.applications.shared || { sections: [] },
        apps: rawConfig.applications.apps || [],
      };
      const applicationsPath = resolve(outputDir, "applications.json");
      writeFileSync(applicationsPath, JSON.stringify(applicationsData, null, 2));
      logger.success("  applications.json を生成しました");
    }

    // MCP Tools JSON を生成（存在しない場合）
    const mcpToolsPath = resolve(outputDir, "api-tools.json");
    if (!existsSync(mcpToolsPath)) {
      logger.info("MCP Tools を生成中...");
      try {
        await runApiTools({
          projectPath,
          configPath: options.config,
          outputDir: outputDir,
        });
        logger.success("  MCP Tools 生成完了");
      } catch (e) {
        logger.warn(`  MCP Tools 生成スキップ: ${e}`);
      }
    }

    // MCP Tools がない場合は app/api-tools ディレクトリを削除
    let hasApiTools = false;
    if (existsSync(mcpToolsPath)) {
      try {
        const mcpData = JSON.parse(readFileSync(mcpToolsPath, "utf-8"));
        hasApiTools = mcpData?.tools?.length > 0;
      } catch {
        hasApiTools = false;
      }
    }

    if (!hasApiTools) {
      const mcpToolsAppDir = resolve(tmpBuildDir, "app/api-tools");
      if (existsSync(mcpToolsAppDir)) {
        rmSync(mcpToolsAppDir, { recursive: true, force: true });
        logger.info("  MCP Tools ページを除外（ツールなし）");
      }
    }

    // Check if there are any API applications
    const applicationsPath = resolve(outputDir, "applications.json");
    let hasApiApps = false;
    if (existsSync(applicationsPath)) {
      try {
        const appData = JSON.parse(readFileSync(applicationsPath, "utf-8"));
        hasApiApps = appData?.apps?.some((app: { type?: string }) => app.type === "api") ?? false;
      } catch {
        hasApiApps = false;
      }
    }

    // Remove /apps/[appId]/tools route if no API applications exist
    // Keep other app-specific routes like feature-map, test-cases, i18n, and [type]/[module]
    if (!hasApiApps) {
      const appsToolsDir = resolve(tmpBuildDir, "app/apps/[appId]/tools");
      if (existsSync(appsToolsDir)) {
        rmSync(appsToolsDir, { recursive: true, force: true });
        logger.info("  API Tools ページを除外（APIアプリなし）");
      }
    }

    // Coverage JSON を生成（存在しない場合）
    const coveragePath = resolve(outputDir, "coverage.json");
    if (!existsSync(coveragePath)) {
      logger.info("Coverage データを生成中...");
      try {
        const coverageReport = await runLintCoverage({
          projectPath,
          configPath: options.config,
        });
        writeFileSync(coveragePath, JSON.stringify(coverageReport, null, 2));
        logger.success(`  coverage.json を生成しました (${coverageReport.summary.coveragePercent}%)`);
      } catch (e) {
        logger.warn(`  Coverage 生成スキップ: ${e}`);
      }
    }

    // 既存のJSONファイルをコピー
    const existingPortalDir = resolve(outputDir);
    const jsonFiles = [
      "test-cases.json",
      "feature-map.json",
      "db-schema.json",
      "search-index.json",
      "details.json",
      "api-tools.json",
      "applications.json",
      "i18n.json",
      "coverage.json",
      "packages.json",
      "github-data.json",
    ];

    for (const jsonFile of jsonFiles) {
      const srcPath = resolve(existingPortalDir, jsonFile);
      const destPath = resolve(dataDir, jsonFile);
      if (existsSync(srcPath)) {
        copyFileSync(srcPath, destPath);
        logger.success(`  データ: ${jsonFile}`);
      }
    }

    // スクリーンショットマニフェストをコピー（マルチアプリ対応）
    const screenshotsSrcDir = resolve(existingPortalDir, "screenshots");
    const screenshotsDataDir = resolve(dataDir, "screenshots");

    // マルチアプリ形式 (index.json) をチェック
    const indexJsonSrc = resolve(screenshotsSrcDir, "index.json");
    // 旧形式 (screenshots.json) をチェック
    const legacyJsonSrc = resolve(screenshotsSrcDir, "screenshots.json");

    if (existsSync(indexJsonSrc) || existsSync(legacyJsonSrc)) {
      if (!existsSync(screenshotsDataDir)) {
        mkdirSync(screenshotsDataDir, { recursive: true });
      }

      // index.json (マルチアプリ形式) をコピー
      if (existsSync(indexJsonSrc)) {
        copyFileSync(indexJsonSrc, resolve(screenshotsDataDir, "index.json"));
        logger.success(`  データ: screenshots/index.json`);
      }

      // screenshots.json (レガシー形式) をコピー
      if (existsSync(legacyJsonSrc)) {
        copyFileSync(legacyJsonSrc, resolve(screenshotsDataDir, "screenshots.json"));
        logger.success(`  データ: screenshots/screenshots.json`);
      }

      // アプリ別ディレクトリをコピー (admin/, public/ など)
      const appDirs = ["admin", "public"];
      for (const appDir of appDirs) {
        const appSrcDir = resolve(screenshotsSrcDir, appDir);
        if (existsSync(appSrcDir)) {
          const appDataDir = resolve(screenshotsDataDir, appDir);
          if (!existsSync(appDataDir)) {
            mkdirSync(appDataDir, { recursive: true });
          }
          // screenshots.json をコピー
          const appJsonSrc = resolve(appSrcDir, "screenshots.json");
          if (existsSync(appJsonSrc)) {
            copyFileSync(appJsonSrc, resolve(appDataDir, "screenshots.json"));
            logger.success(`  データ: screenshots/${appDir}/screenshots.json`);
          }
          // PNG 画像ファイルをコピー
          const pngFiles = readdirSync(appSrcDir).filter(f => f.endsWith(".png"));
          for (const pngFile of pngFiles) {
            copyFileSync(resolve(appSrcDir, pngFile), resolve(appDataDir, pngFile));
          }
          if (pngFiles.length > 0) {
            logger.success(`  データ: screenshots/${appDir}/*.png (${pngFiles.length} files)`);
          }
        }
      }
    }

    // 3. 依存関係をインストール
    // 一時ディレクトリはワークスペース外なので --ignore-workspace でインストール
    logger.info("依存関係をインストール中...");
    const installResult = spawnSync("pnpm", ["install", "--ignore-workspace"], {
      cwd: tmpBuildDir,
      stdio: options.verbose ? "inherit" : "pipe",
      env: { ...process.env },
    });

    if (installResult.status !== 0) {
      // pnpm がない場合は npm で試す
      const npmResult = spawnSync("npm", ["install"], {
        cwd: tmpBuildDir,
        stdio: options.verbose ? "inherit" : "pipe",
        env: { ...process.env },
      });

      if (npmResult.status !== 0) {
        if (!options.verbose) {
          logger.error("依存関係のインストールに失敗しました");
          if (npmResult.stderr) {
            logger.error(npmResult.stderr.toString());
          }
        }
        throw new Error("依存関係のインストールに失敗しました");
      }
    }

    // 4. Next.js ビルドを実行
    const portalFormat = options.format || "card";
    logger.info(`Next.js ビルドを実行中... (format: ${portalFormat})`);
    const buildResult = spawnSync("npx", ["next", "build"], {
      cwd: tmpBuildDir,
      stdio: options.verbose ? "inherit" : "pipe",
      env: {
        ...process.env,
        PROJECT_NAME: config.project.name,
        PORTAL_DATA_DIR: dataDir,
        PROJECT_ROOT: projectPath,  // OVERVIEW.md を読み込むために必要
        PORTAL_FORMAT: portalFormat,  // 出力形式 ("card" | "document")
      },
    });

    if (buildResult.status !== 0) {
      if (!options.verbose && buildResult.stderr) {
        logger.error(buildResult.stderr.toString());
      }
      throw new Error("Next.js ビルドに失敗しました");
    }

    // 5. ビルド結果を出力ディレクトリにコピー
    logger.info("ビルド結果をコピー中...");
    const nextOutDir = resolve(tmpBuildDir, "out");

    if (!existsSync(nextOutDir)) {
      throw new Error("ビルド出力ディレクトリが見つかりません");
    }

    // 出力先を準備（既存のHTMLファイルは削除しないでJSONは保持）
    const oldHtmlFiles = existsSync(outputDir)
      ? readdirSync(outputDir).filter(f => f.endsWith(".html"))
      : [];

    // Next.js出力をコピー
    copyDirRecursive(nextOutDir, outputDir);

    logger.success(`ポータルを生成しました: ${outputDir}`);

    // 生成されたページ一覧
    const generatedFiles = getGeneratedFiles(outputDir);
    logger.info(`生成ファイル: ${generatedFiles.length}件`);
    if (options.verbose) {
      for (const file of generatedFiles.slice(0, 20)) {
        logger.info(`  ${file}`);
      }
      if (generatedFiles.length > 20) {
        logger.info(`  ... 他${generatedFiles.length - 20}件`);
      }
    }

  } finally {
    // 6. 一時ディレクトリをクリーンアップ
    if (existsSync(tmpBuildDir)) {
      rmSync(tmpBuildDir, { recursive: true, force: true });
    }
  }
}

/**
 * 生成されたファイル一覧を取得
 */
function getGeneratedFiles(dir: string, prefix = ""): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      files.push(...getGeneratedFiles(join(dir, entry.name), relativePath));
    } else if (entry.name.endsWith(".html")) {
      files.push(relativePath);
    }
  }

  return files;
}
