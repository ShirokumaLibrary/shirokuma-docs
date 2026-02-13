/**
 * lint-docs コマンド - ドキュメント構造検証
 *
 * 手動ドキュメント（OVERVIEW.md, ADR等）の存在・構造を機械的にチェック
 * 内容の品質チェックは行わない（それはAIの仕事）
 */

import { resolve, dirname, join, basename } from "node:path";
import { globSync } from "glob";
import { loadConfig, resolvePath } from "../utils/config.js";
import { readFile, writeFile, fileExists } from "../utils/file.js";
import { createLogger } from "../utils/logger.js";
import {
  checkFileExists,
  checkSections,
  checkDocumentLength,
  checkFrontmatter,
  checkInternalLinks,
  checkFilePattern,
  mergeResults,
  readFileContent,
} from "../validators/markdown-structure.js";
import type {
  LintDocsConfig,
  FileValidationConfig,
  FilePatternValidationConfig,
  FileValidationReport,
  PatternValidationReport,
  LintDocsReport,
  DocValidationResult,
  isFileConfig,
  isPatternConfig,
} from "../lint/docs-types.js";

/**
 * コマンドオプション
 */
interface LintDocsOptions {
  project: string;
  config: string;
  format?: "terminal" | "json" | "summary";
  output?: string;
  strict?: boolean;
  verbose?: boolean;
}

/**
 * lint-docs コマンドハンドラ
 */
export async function lintDocsCommand(options: LintDocsOptions): Promise<void> {
  const logger = createLogger(options.verbose);
  const projectPath = resolve(options.project);

  logger.info("ドキュメント構造を検証中");

  // 設定読み込み
  const config = loadConfig(projectPath, options.config);
  const lintDocsConfig = config.lintDocs as LintDocsConfig | undefined;

  if (!lintDocsConfig?.enabled) {
    logger.warn("lint-docs is not enabled in config. Add 'lintDocs: { enabled: true }' to shirokuma-docs.config.yaml");
    return;
  }

  const strict = options.strict ?? lintDocsConfig.strict ?? false;

  // 検証実行
  const report = await runLintDocs(projectPath, lintDocsConfig, logger);

  // 出力フォーマット
  const outputFormat = options.format || "terminal";
  const output = formatReport(report, outputFormat);

  // 出力先
  if (options.output) {
    writeFile(options.output, output);
    logger.success(`レポートを出力: ${options.output}`);
  } else {
    console.log(output);
  }

  // 終了コード
  if (report.passed) {
    logger.success("ドキュメント検証完了 - 全チェック合格");
    process.exit(0);
  } else {
    if (strict) {
      logger.error(`ドキュメント検証失敗 - ${report.summary.errorCount}件のエラー`);
      process.exit(1);
    } else {
      logger.warn(`ドキュメント検証完了 - ${report.summary.errorCount}件のエラー（non-strictモード）`);
      process.exit(0);
    }
  }
}

/**
 * lint-docs を実行
 */
async function runLintDocs(
  projectPath: string,
  config: LintDocsConfig,
  logger: ReturnType<typeof createLogger>
): Promise<LintDocsReport> {
  const fileResults: FileValidationReport[] = [];
  const patternResults: PatternValidationReport[] = [];

  for (const reqConfig of config.required) {
    if ("file" in reqConfig) {
      // 単一ファイル検証
      const result = await validateSingleFile(
        projectPath,
        reqConfig as FileValidationConfig,
        config,
        logger
      );
      fileResults.push(result);
    } else if ("filePattern" in reqConfig) {
      // パターン検証
      const result = await validateFilePattern(
        projectPath,
        reqConfig as FilePatternValidationConfig,
        config,
        logger
      );
      patternResults.push(result);
    }
  }

  // サマリー計算
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalInfos = 0;
  let totalFiles = 0;

  for (const fr of fileResults) {
    totalErrors += fr.result.errors.length;
    totalWarnings += fr.result.warnings.length;
    totalInfos += fr.result.infos.length;
    totalFiles += 1;
  }

  for (const pr of patternResults) {
    totalErrors += pr.result.errors.length;
    totalWarnings += pr.result.warnings.length;
    totalInfos += pr.result.infos.length;
    totalFiles += pr.matchedFiles.length;
  }

  return {
    fileResults,
    patternResults,
    summary: {
      totalFiles,
      validatedFiles: totalFiles,
      errorCount: totalErrors,
      warningCount: totalWarnings,
      infoCount: totalInfos,
    },
    passed: totalErrors === 0,
  };
}

/**
 * 単一ファイルを検証
 */
async function validateSingleFile(
  projectPath: string,
  config: FileValidationConfig,
  lintConfig: LintDocsConfig,
  logger: ReturnType<typeof createLogger>
): Promise<FileValidationReport> {
  const filePath = resolvePath(projectPath, config.file);
  logger.debug(`検証中: ${config.file}`);

  const results: DocValidationResult[] = [];

  // ファイル存在チェック
  const existsResult = checkFileExists(filePath);
  results.push(existsResult);

  if (!existsResult.valid) {
    // ファイルが存在しない場合は他のチェックをスキップ
    return {
      file: config.file,
      description: config.description,
      result: mergeResults(...results),
    };
  }

  // ファイル内容を読み込み
  const content = readFileContent(filePath);
  if (!content) {
    return {
      file: config.file,
      description: config.description,
      result: {
        valid: false,
        errors: [
          {
            type: "error",
            message: "Failed to read file content",
            file: filePath,
            rule: "file-read",
          },
        ],
        warnings: [],
        infos: [],
      },
    };
  }

  // セクションチェック
  if (config.sections && config.sections.length > 0) {
    results.push(checkSections(content, config.sections, filePath));
  }

  // 長さチェック
  if (config.minLength !== undefined || config.maxLength !== undefined) {
    results.push(
      checkDocumentLength(
        content,
        { minLength: config.minLength, maxLength: config.maxLength },
        filePath
      )
    );
  }

  // フロントマターチェック
  if (config.frontmatter) {
    results.push(checkFrontmatter(content, config.frontmatter, filePath));
  }

  // 内部リンクチェック
  if (lintConfig.validateLinks?.enabled && lintConfig.validateLinks.checkInternal) {
    results.push(checkInternalLinks(content, projectPath, filePath));
  }

  return {
    file: config.file,
    description: config.description,
    result: mergeResults(...results),
  };
}

/**
 * ファイルパターンを検証
 */
async function validateFilePattern(
  projectPath: string,
  config: FilePatternValidationConfig,
  lintConfig: LintDocsConfig,
  logger: ReturnType<typeof createLogger>
): Promise<PatternValidationReport> {
  logger.debug(`パターン検証中: ${config.filePattern}`);

  // glob パターンでファイルを収集
  const fullPattern = resolvePath(projectPath, config.filePattern);
  const matchedFiles = globSync(fullPattern, { nodir: true });

  const results: DocValidationResult[] = [];
  const fileReports: FileValidationReport[] = [];

  // 最小ファイル数チェック
  if (config.minCount !== undefined && matchedFiles.length < config.minCount) {
    results.push({
      valid: false,
      errors: [
        {
          type: "error",
          message: `${config.description}: Found ${matchedFiles.length} files, minimum required: ${config.minCount}`,
          file: config.filePattern,
          rule: "min-file-count",
        },
      ],
      warnings: [],
      infos: [],
    });
  }

  // 各ファイルを検証
  for (const filePath of matchedFiles) {
    const fileResults: DocValidationResult[] = [];
    const content = readFileContent(filePath);

    if (!content) {
      fileResults.push({
        valid: false,
        errors: [
          {
            type: "error",
            message: "Failed to read file content",
            file: filePath,
            rule: "file-read",
          },
        ],
        warnings: [],
        infos: [],
      });
    } else {
      // セクションチェック
      if (config.sections && config.sections.length > 0) {
        fileResults.push(checkSections(content, config.sections, filePath));
      }

      // フロントマターチェック
      if (config.frontmatter) {
        fileResults.push(checkFrontmatter(content, config.frontmatter, filePath));
      }

      // 内部リンクチェック
      if (lintConfig.validateLinks?.enabled && lintConfig.validateLinks.checkInternal) {
        fileResults.push(checkInternalLinks(content, projectPath, filePath));
      }
    }

    const mergedFileResult = mergeResults(...fileResults);
    results.push(mergedFileResult);

    fileReports.push({
      file: filePath,
      description: config.description,
      result: mergedFileResult,
    });
  }

  return {
    pattern: config.filePattern,
    description: config.description,
    matchedFiles,
    fileResults: fileReports,
    result: mergeResults(...results),
  };
}

/**
 * レポートをフォーマット
 */
function formatReport(
  report: LintDocsReport,
  format: "terminal" | "json" | "summary"
): string {
  if (format === "json") {
    return JSON.stringify(report, null, 2);
  }

  if (format === "summary") {
    return formatSummary(report);
  }

  return formatTerminal(report);
}

/**
 * サマリーフォーマット
 */
function formatSummary(report: LintDocsReport): string {
  const { summary } = report;
  const lines: string[] = [
    "",
    `Documentation Validation Summary`,
    `================================`,
    "",
    `Files Validated:  ${summary.validatedFiles}`,
    `Errors:           ${summary.errorCount}`,
    `Warnings:         ${summary.warningCount}`,
    `Info:             ${summary.infoCount}`,
    "",
    report.passed ? "PASSED" : "FAILED",
    "",
  ];

  return lines.join("\n");
}

/**
 * ターミナルフォーマット
 */
function formatTerminal(report: LintDocsReport): string {
  const lines: string[] = [];

  lines.push("");
  lines.push("Documentation Structure Validation");
  lines.push("=".repeat(60));
  lines.push("");

  // 単一ファイル結果
  if (report.fileResults.length > 0) {
    lines.push("Single Files:");
    lines.push("-".repeat(40));

    for (const fr of report.fileResults) {
      const icon = fr.result.valid ? "\u2705" : "\u274C";
      lines.push(`${icon} ${fr.file}`);
      lines.push(`   ${fr.description}`);

      for (const error of fr.result.errors) {
        lines.push(`   \u274C ERROR: ${error.message}`);
      }

      for (const warning of fr.result.warnings) {
        lines.push(`   \u26A0\uFE0F  WARNING: ${warning.message}`);
      }

      lines.push("");
    }
  }

  // パターン結果
  if (report.patternResults.length > 0) {
    lines.push("File Patterns:");
    lines.push("-".repeat(40));

    for (const pr of report.patternResults) {
      const icon = pr.result.valid ? "\u2705" : "\u274C";
      lines.push(`${icon} ${pr.pattern} (${pr.matchedFiles.length} files)`);
      lines.push(`   ${pr.description}`);

      for (const error of pr.result.errors) {
        lines.push(`   \u274C ERROR: ${error.message}`);
      }

      for (const warning of pr.result.warnings) {
        lines.push(`   \u26A0\uFE0F  WARNING: ${warning.message}`);
      }

      // 個別ファイルのエラー
      for (const fileResult of pr.fileResults) {
        if (!fileResult.result.valid) {
          lines.push(`   File: ${basename(fileResult.file)}`);
          for (const error of fileResult.result.errors) {
            lines.push(`     \u274C ${error.message}`);
          }
        }
      }

      lines.push("");
    }
  }

  // サマリー
  lines.push("=".repeat(60));
  lines.push("");
  lines.push("Summary:");
  lines.push(`  Files Validated:  ${report.summary.validatedFiles}`);
  lines.push(`  \u274C Errors:         ${report.summary.errorCount}`);
  lines.push(`  \u26A0\uFE0F  Warnings:       ${report.summary.warningCount}`);
  lines.push(`  \u2139\uFE0F  Info:           ${report.summary.infoCount}`);
  lines.push("");
  lines.push(report.passed ? "\u2705 PASSED" : "\u274C FAILED");
  lines.push("");

  return lines.join("\n");
}
