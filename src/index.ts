#!/usr/bin/env node
/**
 * shirokuma-docs - Next.js プロジェクト用ドキュメント自動生成 CLI
 *
 * 機能:
 * - TypeDoc API ドキュメント生成
 * - Drizzle ORM スキーマから DBML/SVG 生成
 * - dependency-cruiser による依存関係グラフ
 * - Jest/Playwright テストケース一覧
 * - ポータル HTML 生成
 */

import { Command } from "commander";
import { generateCommand } from "./commands/generate.js";
import { typedocCommand } from "./commands/typedoc.js";
import { schemaCommand } from "./commands/schema.js";
import { depsCommand } from "./commands/deps.js";
import { testCasesCommand } from "./commands/test-cases.js";
import { portalCommand } from "./commands/portal.js";
import { initCommand, InitError } from "./commands/init.js";
import { lintTestsCommand } from "./commands/lint-tests.js";
import { lintCoverageCommand } from "./commands/lint-coverage.js";
import { lintDocsCommand } from "./commands/lint-docs.js";
import { lintCodeCommand } from "./commands/lint-code.js";
import { lintAnnotationsCommand } from "./commands/lint-annotations.js";
import { lintStructureCommand } from "./commands/lint-structure.js";
import { adrCommand } from "./commands/adr.js";
import { coverageCommand } from "./commands/coverage.js";
import { searchIndexCommand } from "./commands/search-index.js";
import { linkDocsCommand } from "./commands/link-docs.js";
import { featureMapCommand } from "./commands/feature-map.js";
import { overviewCommand } from "./commands/overview.js";
import { screenshotsCommand } from "./commands/screenshots.js";
import { detailsCommand } from "./commands/details.js";
import { runApiTools } from "./commands/api-tools.js";
import { i18nCommand } from "./commands/i18n.js";
import { impactCommand } from "./commands/impact.js";
import { packagesCommand } from "./commands/packages.js";
import { projectsCommand } from "./commands/projects.js";
import { issuesCommand } from "./commands/issues.js";
import { discussionsCommand } from "./commands/discussions.js";
import { repoCommand } from "./commands/repo.js";
import { githubDataCommand } from "./commands/github-data.js";
import { discussionTemplatesCommand } from "./commands/discussion-templates.js";
// shirokuma-md is optional - loaded dynamically below
import { lintWorkflowCommand } from "./commands/lint-workflow.js";
import { repoPairsCommand } from "./commands/repo-pairs.js";
import { updateSkillsCommand } from "./commands/update-skills.js";
import { sessionCommand } from "./commands/session.js";
import { searchCommand } from "./commands/search.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { initI18n } from "./utils/i18n.js";
import { readBodyFile, validateBody } from "./utils/github.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, "..", "package.json"), "utf-8")
);

/**
 * --body オプションをファイルパスまたは stdin から解決し、内容に置換する。
 * `--body -` の場合は stdin から読み取る。
 * 失敗時は process.exitCode を設定して false を返す。
 */
function resolveBodyOption(options: Record<string, unknown>): boolean {
  if (options.body && typeof options.body === "string") {
    try {
      const content = readBodyFile(options.body);
      const bodyError = validateBody(content);
      if (bodyError) {
        console.error(`Error: ${bodyError}`);
        process.exitCode = 1;
        return false;
      }
      options.body = content;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Error: Failed to read body file: ${msg}`);
      process.exitCode = 1;
      return false;
    }
  }
  return true;
}

const program = new Command();

program
  .name("shirokuma-docs")
  .description("Next.js プロジェクト用ドキュメント自動生成 CLI")
  .version(packageJson.version)
  .option("--locale <locale>", "CLI 出力言語 (en, ja)");

// Initialize i18n before command execution
program.hook("preAction", () => {
  const opts = program.opts();
  initI18n(opts.locale);
});

// 全ドキュメント生成
program
  .command("generate")
  .description("全てのドキュメントを生成")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("--with-github", "GitHub Issues/Discussions データを含める")
  .option("-v, --verbose", "詳細ログ出力")
  .action(generateCommand);

// TypeDoc API ドキュメント生成
program
  .command("typedoc")
  .description("TypeDoc API ドキュメントを生成")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-v, --verbose", "詳細ログ出力")
  .action(typedocCommand);

// DB スキーマ生成
program
  .command("schema")
  .description("データベーススキーマドキュメント (DBML, SVG) を生成")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-v, --verbose", "詳細ログ出力")
  .action(schemaCommand);

// 依存関係グラフ生成
program
  .command("deps")
  .description("依存関係グラフを生成")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-v, --verbose", "詳細ログ出力")
  .action(depsCommand);

// テストケース一覧生成
program
  .command("test-cases")
  .description("テストケース一覧を生成")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-v, --verbose", "詳細ログ出力")
  .action(testCasesCommand);

// ポータル HTML 生成
program
  .command("portal")
  .description("ドキュメントポータル HTML を生成 (Next.js + shadcn/ui)")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-f, --format <format>", "出力形式 (card | document)", "card")
  .option("--with-github", "GitHub Issues/Discussions データを含める")
  .option("-v, --verbose", "詳細ログ出力")
  .action(portalCommand);

// 設定ファイル初期化
program
  .command("init")
  .description("設定ファイルを初期化（オプションでスキル/ルールをインストール）")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-f, --force", "スキル/ルールを強制再デプロイ")
  .option("--with-skills [skills]", "スキルをインストール（カンマ区切りで指定、または全スキル）")
  .option("--with-rules", "ルールをインストール")
  .option("--lang <lang>", "言語設定 (en|ja) - .claude/settings.json に書き込み")
  .option("--nextjs", "Next.js モノレポ構造をスキャフォールド")
  .option("--no-gitignore", ".gitignore の自動更新をスキップ")
  .option("-v, --verbose", "詳細ログを出力")
  .action(async (options) => {
    try {
      await initCommand(options);
    } catch (error) {
      if (error instanceof InitError) {
        process.exit(1);
      }
      throw error;
    }
  });

// スキル/ルール更新
program
  .command("update-skills")
  .description("インストール済みスキル/ルールを最新版に更新")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("--with-rules", "ルールも更新")
  .option("--sync", "新スキル追加・旧スキル削除を検出（ルール同期も含む）")
  .option("--yes", "削除操作を確認なしで実行")
  .option("--dry-run", "プレビュー（実際には更新しない）")
  .option("-f, --force", "ローカル変更を無視して強制更新")
  .option("--install-cache", "グローバルキャッシュを強制更新（claude plugin uninstall + install）")
  .option("-v, --verbose", "詳細ログを出力")
  .action(async (options) => {
    await updateSkillsCommand(options);
  });

// スキル/ルール更新（短縮コマンド）
program
  .command("update")
  .description("スキル/ルールを最新版に更新（update-skills --sync の短縮形）")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("--dry-run", "プレビュー（実際には更新しない）")
  .option("-f, --force", "ローカル変更を無視して強制更新")
  .option("--yes", "削除操作を確認なしで実行")
  .option("--install-cache", "グローバルキャッシュを強制更新（claude plugin uninstall + install）")
  .option("-v, --verbose", "詳細ログを出力")
  .action(async (options) => {
    await updateSkillsCommand({ ...options, sync: true });
  });

// テストドキュメント lint
program
  .command("lint-tests")
  .description("テストドキュメント (@testdoc) をチェック")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-f, --format <format>", "出力フォーマット (terminal, json, summary)", "terminal")
  .option("-o, --output <file>", "出力ファイルパス")
  .option("-s, --strict", "strictモード（warningもエラーとして扱う）")
  .option("--coverage-threshold <number>", "最小カバレッジ閾値 (%)", parseInt)
  .option("-i, --ignore <patterns...>", "無視するパターン")
  .option("-v, --verbose", "詳細ログ出力")
  .action(lintTestsCommand);

// 実装-テスト対応チェック
program
  .command("lint-coverage")
  .description("実装ファイルとテストファイルの対応をチェック")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-f, --format <format>", "出力フォーマット (terminal, json, summary)", "terminal")
  .option("-o, --output <file>", "出力ファイルパス")
  .option("-s, --strict", "strictモード（未テストファイルがあれば失敗）")
  .option("-v, --verbose", "詳細ログ出力")
  .action(lintCoverageCommand);

// ドキュメント構造検証
program
  .command("lint-docs")
  .description("ドキュメント構造（OVERVIEW.md, ADR等）を検証")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-f, --format <format>", "出力フォーマット (terminal, json, summary)", "terminal")
  .option("-o, --output <file>", "出力ファイルパス")
  .option("-s, --strict", "strictモード（エラーがあれば exit code 1）")
  .option("-v, --verbose", "詳細ログ出力")
  .action(lintDocsCommand);

// コード構造検証 (Server Actions)
program
  .command("lint-code")
  .description("コード構造（Server Actions の JSDoc タグ等）を検証")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-f, --format <format>", "出力フォーマット (terminal, json, summary)", "terminal")
  .option("-o, --output <file>", "出力ファイルパス")
  .option("-s, --strict", "strictモード（エラーがあれば exit code 1）")
  .option("-v, --verbose", "詳細ログ出力")
  .action(lintCodeCommand);

// アノテーション整合性検証
program
  .command("lint-annotations")
  .description("アノテーション整合性（@usedComponents, @screen, @component）を検証")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-f, --format <format>", "出力フォーマット (terminal, json, summary)", "terminal")
  .option("-o, --output <file>", "出力ファイルパス")
  .option("-s, --strict", "strictモード（エラーがあれば exit code 1）")
  .option("--fix", "アノテーションの問題を自動修正")
  .option("-v, --verbose", "詳細ログ出力")
  .action(lintAnnotationsCommand);

// プロジェクト構造検証
program
  .command("lint-structure")
  .description("プロジェクト構造（ディレクトリ構成、命名規則等）を検証")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-f, --format <format>", "出力フォーマット (yaml, json, terminal)", "yaml")
  .option("-o, --output <file>", "出力ファイルパス")
  .option("-s, --strict", "strictモード（エラーがあれば exit code 1）")
  .option("-v, --verbose", "詳細ログ出力")
  .action(lintStructureCommand);

// ワークフロー検証 (Issue fields, branch naming, main protection)
program
  .command("lint-workflow")
  .description("AI ワークフロー規約（Issue フィールド、ブランチ命名、保護ブランチ）を検証")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-f, --format <format>", "出力フォーマット (terminal, json, summary)", "terminal")
  .option("-o, --output <file>", "出力ファイルパス")
  .option("-s, --strict", "strictモード（エラーがあれば exit code 1）")
  .option("--issues", "Issue フィールドのみチェック")
  .option("--branches", "ブランチ命名のみチェック")
  .option("--commits", "コミット規約のみチェック")
  .option("-v, --verbose", "詳細ログ出力")
  .action(lintWorkflowCommand);

// ADR (Architecture Decision Records) 管理 - GitHub Discussions 連携
program
  .command("adr <action>")
  .description("ADR 管理 via GitHub Discussions (create, list, get)")
  .argument("[title]", "ADR title (for create) or Discussion number (for get)")
  .option("--limit <number>", "Max ADRs to fetch (for list)", parseInt)
  .option("--public", "Target the public repository (from repoPairs config)")
  .option("--repo <alias>", "Target a cross-repo by alias (from crossRepos config)")
  .option("-v, --verbose", "詳細ログ出力")
  .action(adrCommand);

// テストカバレッジレポート生成
program
  .command("coverage")
  .description("テストカバレッジレポートを生成")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-f, --format <format>", "出力フォーマット (html, json, summary)", "summary")
  .option("-o, --output <file>", "出力ファイルパス")
  .option("--fail-under <number>", "閾値未満で失敗 (%)", parseInt)
  .option("-v, --verbose", "詳細ログ出力")
  .action(coverageCommand);

// 検索インデックス生成
program
  .command("search-index")
  .description("全文検索用インデックスを生成")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-v, --verbose", "詳細ログ出力")
  .action(searchIndexCommand);

// API-テスト関連付けドキュメント生成
program
  .command("link-docs")
  .description("API-テスト関連付けドキュメントを生成")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-v, --verbose", "詳細ログ出力")
  .action(linkDocsCommand);

// 機能階層マップ生成
program
  .command("feature-map")
  .description("機能階層マップを生成 (Screen -> Component -> Action -> Table)")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-v, --verbose", "詳細ログ出力")
  .action(featureMapCommand);

// プロジェクト概要ページ生成
program
  .command("overview")
  .description("プロジェクト概要ページを生成")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-v, --verbose", "詳細ログ出力")
  .action(overviewCommand);

// スクリーンショット生成テスト作成
program
  .command("screenshots")
  .description("画面スクリーンショット撮影用 Playwright テストを生成")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-r, --run", "生成後にテストを実行")
  .option("-v, --verbose", "詳細ログ出力")
  .action(screenshotsCommand);

// 詳細ページ生成
program
  .command("details")
  .description("各要素（Screen, Component, Action, Table）の詳細ページを生成")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-v, --verbose", "詳細ログ出力")
  .action(detailsCommand);

// 変更影響分析
program
  .command("impact")
  .description("変更影響分析 - 指定アイテムを変更した場合に影響を受ける箇所を表示")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-t, --target <name>", "分析対象のアイテム名またはファイルパス")
  .option("-d, --max-depth <n>", "最大探索深度", "5")
  .option("-f, --format <type>", "出力形式 (json|html|table)", "table")
  .action((options) => {
    impactCommand({
      output: options.output,
      target: options.target,
      maxDepth: parseInt(options.maxDepth, 10),
      format: options.format,
    });
  });

// MCP ツールドキュメント生成
program
  .command("api-tools")
  .description("MCP (Model Context Protocol) ツールドキュメントを生成")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-v, --verbose", "詳細ログ出力")
  .action((options) => {
    runApiTools({
      projectPath: options.project,
      configPath: options.config,
      outputDir: options.output,
    });
  });

// i18n ドキュメント生成
program
  .command("i18n")
  .description("i18n 翻訳ファイルドキュメントを生成")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-v, --verbose", "詳細ログ出力")
  .action(i18nCommand);

// パッケージドキュメント生成
program
  .command("packages")
  .description("モノレポ共有パッケージのドキュメントを生成")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-c, --config <file>", "設定ファイルパス", "shirokuma-docs.config.yaml")
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-v, --verbose", "詳細ログ出力")
  .action(packagesCommand);

// GitHub Projects V2 管理 (低レベル API)
program
  .command("projects <action>")
  .description("GitHub Projects V2 管理 (list, get, fields, create, update, delete, add-issue, workflows, setup-metrics, setup, create-project)")
  .argument("[target]", "Item ID or Issue number (for get/update/delete/add-issue)")
  .option("--owner <owner>", "Repository owner (default: current repo)")
  .option("--all", "Include all items (Done/Released)")
  .option("--status <status...>", "Filter by status (for list)")
  .option("--format <format>", "Output format: json, table-json (for list)", "json")
  .option("-s, --field-status <status>", "Set Status field (for create/update/add-issue)")
  .option("--priority <priority>", "Set Priority field (Critical/High/Medium/Low)")
  .option("--field-priority <priority>", "(alias for --priority)")
  .option("--size <size>", "Set Size field (XS/S/M/L/XL)")
  .option("--field-size <size>", "(alias for --size)")
  .option("-t, --title <title>", "Item title (for create)")
  .option("-b, --body <file>", "Item body file path, or - for stdin (for create/update)")
  .option("-F, --force", "Skip confirmation (delete) / Force destructive update (setup)")
  .option("--lang <lang>", "Language for field descriptions (option names stay in English): en, ja (for setup/create-project)")
  .option("--field-id <fieldId>", "Status field ID (for setup)")
  .option("--project-id <projectId>", "Project ID (for setup)")
  .option("--status-only", "Only update Status field (for setup)")
  .option("--dry-run", "Preview changes without executing (for setup)")
  .option("-v, --verbose", "詳細ログ出力")
  .action((action, target, options) => {
    if (!resolveBodyOption(options)) return;
    // エイリアスオプションのマージ (#587)
    options.priority ??= options.fieldPriority;
    options.size ??= options.fieldSize;
    projectsCommand(action, target, options);
  });

// GitHub Issues 管理 (メインコマンド - Issues + Projects 統合)
program
  .command("issues <action>")
  .description(
    "GitHub Issues 管理 with Projects (list, show, create, update, comment, comment-edit, close, reopen, import, fields, remove, search, pr-comments, merge, pr-reply, resolve)"
  )
  .argument("[target]", "Issue/PR number, comment ID, or search query (for show/update/comment/comment-edit/close/reopen/search/pr-comments/merge/pr-reply/resolve)")
  .option("--owner <owner>", "Repository owner (default: current repo)")
  .option("--all", "Include all issues (open + closed)")
  .option("--state <state>", "Issue state: open, closed (filter for list / set for update)")
  .option("--status <status...>", "Filter by Projects Status (for list)")
  .option("-l, --labels <labels...>", "Filter by labels (for list) or add labels (for create)")
  .option("--limit <number>", "Max issues to fetch (for list)", parseInt)
  .option("--format <format>", "Output format: json, table-json (list), frontmatter (show, default)")
  .option("-s, --field-status <status>", "Set Projects Status field")
  .option("--priority <priority>", "Set Projects Priority field (Critical/High/Medium/Low)")
  .option("--field-priority <priority>", "(alias for --priority)")
  .option("--size <size>", "Set Projects Size field (XS/S/M/L/XL)")
  .option("--field-size <size>", "(alias for --size)")
  .option("-t, --title <title>", "Issue title (for create)")
  .option("-b, --body <file>", "Issue body file path, or - for stdin (for create/update/comment/close)")
  .option("--issue-type <type>", "Set Issue Type (e.g., Feature, Bug, Task) (for create/update)")
  .option(
    "--state-reason <reason>",
    "Close reason: COMPLETED, NOT_PLANNED (for close)",
    "COMPLETED"
  )
  .option("--add-label <labels...>", "Add labels to issue (for update)")
  .option("--remove-label <labels...>", "Remove labels from issue (for update)")
  .option("--label <labels...>", "(alias for --labels)")
  .option("--public", "Target the public repository (from repoPairs config)")
  .option("--repo <alias>", "Target a cross-repo by alias (from crossRepos config)")
  .option("--from-public <number>", "Import issue from public repo (for import action)")
  .option("--sync-public", "Sync status back to public repo when closing")
  .option("--squash", "Use squash merge (default, for merge)")
  .option("--merge", "Use merge commit (for merge)")
  .option("--rebase", "Use rebase merge (for merge)")
  .option("--delete-branch", "Delete branch after merge (default: true)", true)
  .option("--no-delete-branch", "Do not delete branch after merge")
  .option("--head <branch>", "Resolve PR from branch name (for merge)")
  .option("--reply-to <commentId>", "Reply to a review comment database ID (for pr-reply)")
  .option("--thread-id <threadId>", "Thread ID to resolve (for resolve)")
  .option("-v, --verbose", "詳細ログ出力")
  .action((action, target, options) => {
    if (!resolveBodyOption(options)) return;
    // エイリアスオプションのマージ (#587)
    options.priority ??= options.fieldPriority;
    options.size ??= options.fieldSize;
    options.labels ??= options.label;
    // search アクション: target を query にマッピング
    if (action === "search" && target) {
      options.query = target;
    }
    issuesCommand(action, target, options);
  });

// GitHub Discussions 管理
program
  .command("discussions <action>")
  .description("GitHub Discussions 管理 (categories, list, get, show, create, update, search, comment)")
  .argument("[target]", "Discussion ID/number (for get/update/comment) or search query (for search)")
  .option("--category <category>", "Category name (for list/create/search)")
  .option("--limit <number>", "Max discussions to fetch (for list/search)", parseInt)
  .option("--format <format>", "Output format: json, table-json (list/search), frontmatter (show, default)")
  .option("-t, --title <title>", "Discussion title (for create/update)")
  .option("-b, --body <file>", "Discussion body file path, or - for stdin (for create/update/comment)")
  .option("--public", "Target the public repository (from repoPairs config)")
  .option("--repo <alias>", "Target a cross-repo by alias (from crossRepos config)")
  .option("-v, --verbose", "詳細ログ出力")
  .action((action, target, options) => {
    if (!resolveBodyOption(options)) return;
    // For search action, treat target as query
    if (action === "search" && target) {
      options.query = target;
    }
    discussionsCommand(action, target, options);
  });

// 統合検索 (Issues + Discussions 横断)
program
  .command("search <query>")
  .description("Issues + Discussions 横断検索 (GraphQL エイリアスで 1 リクエスト)")
  .option("--type <types>", "検索対象: issues,discussions (カンマ区切り)", "issues,discussions")
  .option("--category <category>", "Discussions カテゴリフィルタ")
  .option("--state <state>", "Issues 状態フィルタ: open, closed, all")
  .option("--limit <number>", "最大取得件数 (デフォルト: 10)", parseInt)
  .option("--format <format>", "出力形式: json, table-json", "json")
  .option("--public", "公開リポジトリを対象")
  .option("--repo <alias>", "クロスリポジトリのエイリアス")
  .option("-v, --verbose", "詳細ログ出力")
  .action(async (query, options) => {
    const code = await searchCommand(query, options);
    if (code !== 0) process.exitCode = code;
  });

// GitHub Repository 情報
program
  .command("repo <action>")
  .description("GitHub リポジトリ情報 (info, labels)")
  .option("--create <name>", "Create a new label (for labels)")
  .option("--color <color>", "Label color in hex (e.g., 'ff0000', for labels --create)")
  .option("--description <desc>", "Label description (for labels --create)")
  .option("-v, --verbose", "詳細ログ出力")
  .action(repoCommand);

// GitHub データ生成 (ポータル統合用)
program
  .command("github-data")
  .description("GitHub Issues/Discussions データを JSON 形式で生成")
  .option("-p, --project <path>", "プロジェクトパス", process.cwd())
  .option("-o, --output <dir>", "出力ディレクトリ")
  .option("-v, --verbose", "詳細ログ出力")
  .action(async (options) => {
    await githubDataCommand(options);
  });

// セッション管理 (start/end/check)
program
  .command("session <action>")
  .description("セッション管理 (start, end, check)")
  .option("--owner <owner>", "リポジトリオーナー（デフォルト: 現在のリポジトリ）")
  .option("--format <format>", "出力形式: json, table-json (start用)", "json")
  .option("--user <name>", "GitHub ユーザー名で引き継ぎをフィルタ (start用)")
  .option("--all", "全ユーザーの引き継ぎを表示 (start用)")
  .option("--team", "チームダッシュボード: 全メンバーの引き継ぎと Issue を担当者別に表示 (start用)")
  .option("-t, --title <title>", "引き継ぎタイトル (end用)")
  .option("-b, --body <file>", "引き継ぎ本文ファイルパス、または - で stdin (end用)")
  .option("--done <numbers...>", "Done にする Issue 番号 (end用)")
  .option("--review <numbers...>", "Review にする Issue 番号 (end用)")
  .option("--fix", "不整合を自動修正 (check用)")
  .option("--setup", "GitHub手動設定の検証 (check用)")
  .option("-v, --verbose", "詳細ログ出力")
  .action((action, options) => {
    if (!resolveBodyOption(options)) return;
    sessionCommand(action, options);
  });

// Discussion テンプレート生成
program
  .command("discussion-templates <action>")
  .description("GitHub Discussion テンプレート生成 (generate, list-languages, add-language)")
  .argument("[target]", "Language code (for add-language)")
  .option("-l, --lang <lang>", "Language code (for generate)", "en")
  .option("-o, --output <dir>", "Output directory (for generate)", ".github/DISCUSSION_TEMPLATE")
  .option("-v, --verbose", "詳細ログ出力")
  .action(discussionTemplatesCommand);

// Public/Private リポジトリペア管理
program
  .command("repo-pairs <action>")
  .description("Public/Private リポジトリペア管理 (list, init, status, release)")
  .argument("[alias]", "リポジトリペアのエイリアス")
  .option("--private <repo>", "Private リポジトリ (owner/name, init用)")
  .option("--public <repo>", "Public リポジトリ (owner/name, init用)")
  .option("--exclude <patterns...>", "リリース時の除外パターン (init用)")
  .option("--tag <version>", "リリースタグ (release用)")
  .option("--dry-run", "変更せずにプレビュー (release用)")
  .option("-v, --verbose", "詳細ログ出力")
  .action(repoPairsCommand);

// LLM 最適化 Markdown 管理（shirokuma-md 統合済み）
import { createMdCommand } from "./md/cli/program.js";
program.addCommand(createMdCommand());

program.parse();
