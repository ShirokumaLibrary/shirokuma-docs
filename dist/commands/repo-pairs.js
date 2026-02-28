/**
 * repo-pairs command - Public/Private repository pair management
 *
 * Subcommands:
 * - list: Show all configured repo pairs
 * - init <alias>: Initialize a repo pair in config
 * - status [alias]: Show sync status between repos
 * - release <alias> --tag <version>: Release to public repo
 */
import chalk from "chalk";
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { minimatch } from "minimatch";
import { getAllRepoPairs, getRepoPair, parseRepoFullName, getMergedExcludePatterns, DEFAULT_EXCLUDE_PATTERNS, } from "../utils/repo-pairs.js";
import { getRepoInfo } from "../utils/github.js";
import { loadGhConfig } from "../utils/gh-config.js";
import { getOctokit } from "../utils/octokit-client.js";
// ========================================
// Helpers
// ========================================
function createLogger(isVerbose) {
    return {
        info: (msg) => console.log(msg),
        error: (msg) => console.error(chalk.red(`Error: ${msg}`)),
        verbose: (msg) => {
            if (isVerbose)
                console.log(chalk.gray(msg));
        },
        success: (msg) => console.log(chalk.green(`✓ ${msg}`)),
    };
}
// ========================================
// Subcommands
// ========================================
/**
 * List all configured repo pairs
 */
function cmdList(logger) {
    const pairs = getAllRepoPairs();
    if (pairs.length === 0) {
        logger.info("No repo pairs configured.");
        logger.info("");
        logger.info("Add to shirokuma-docs.config.yaml:");
        logger.info(chalk.gray("  repoPairs:"));
        logger.info(chalk.gray("    myproject:"));
        logger.info(chalk.gray('      private: "owner/repo"'));
        logger.info(chalk.gray('      public: "owner/repo-public"'));
        return 0;
    }
    logger.info(chalk.bold("Configured Repo Pairs"));
    logger.info(chalk.gray("─".repeat(60)));
    for (const pair of pairs) {
        logger.info("");
        logger.info(chalk.cyan(`  ${pair.alias}`));
        logger.info(`    Private: ${pair.private}`);
        logger.info(`    Public:  ${pair.public}`);
        logger.info(`    Branch:  ${pair.defaultBranch}`);
        if (pair.sourceDir) {
            logger.info(`    Source:  ${pair.sourceDir}`);
        }
        if (pair.exclude.length > 0) {
            logger.info(`    Exclude: ${pair.exclude.join(", ")}`);
        }
    }
    logger.info("");
    return 0;
}
/**
 * Initialize a new repo pair
 */
async function cmdInit(alias, options, logger) {
    if (!alias) {
        logger.error("Alias is required. Usage: repo-pairs init <alias>");
        return 1;
    }
    // Determine private/public repos
    let privateRepo = options.private;
    let publicRepo = options.public;
    // If not specified, derive from current repo
    if (!privateRepo) {
        const repoInfo = getRepoInfo();
        if (repoInfo) {
            privateRepo = `${repoInfo.owner}/${repoInfo.name}`;
        }
    }
    if (!publicRepo && privateRepo) {
        publicRepo = `${privateRepo}-public`;
    }
    if (!privateRepo || !publicRepo) {
        logger.error("Could not determine repositories. Use --private and --public flags.");
        return 1;
    }
    // Validate repos exist
    const octokit = getOctokit();
    const privateParsed = parseRepoFullName(privateRepo);
    if (!privateParsed) {
        logger.error(`Invalid repo format: ${privateRepo}`);
        return 1;
    }
    const publicParsed = parseRepoFullName(publicRepo);
    if (!publicParsed) {
        logger.error(`Invalid repo format: ${publicRepo}`);
        return 1;
    }
    logger.verbose(`Validating private repo: ${privateRepo}`);
    try {
        await octokit.rest.repos.get({
            owner: privateParsed.owner,
            repo: privateParsed.name,
        });
    }
    catch {
        logger.error(`Private repo not found: ${privateRepo}`);
        return 1;
    }
    logger.verbose(`Validating public repo: ${publicRepo}`);
    try {
        await octokit.rest.repos.get({
            owner: publicParsed.owner,
            repo: publicParsed.name,
        });
    }
    catch {
        logger.info(`Public repo not found: ${publicRepo}`);
        logger.info("Create it? Run:");
        logger.info(chalk.gray(`  gh repo create ${publicRepo} --public`));
        // Continue anyway - user can create it later
    }
    // Read existing config
    const configPath = findConfigFile();
    if (!configPath) {
        logger.error("No shirokuma-docs.config.yaml found. Run: shirokuma-docs init");
        return 1;
    }
    const content = readFileSync(configPath, "utf-8");
    const config = parseYaml(content) || {};
    // Add/update repoPairs section
    const repoPairs = config.repoPairs || {};
    repoPairs[alias] = {
        private: privateRepo,
        public: publicRepo,
        exclude: options.exclude ?? DEFAULT_EXCLUDE_PATTERNS,
        ...(options.sourceDir && { sourceDir: options.sourceDir }),
    };
    config.repoPairs = repoPairs;
    // Write back
    writeFileSync(configPath, stringifyYaml(config, { lineWidth: 120 }));
    logger.success(`Repo pair "${alias}" added to ${configPath}`);
    logger.info(`  Private: ${privateRepo}`);
    logger.info(`  Public:  ${publicRepo}`);
    if (options.sourceDir) {
        logger.info(`  Source:  ${options.sourceDir}`);
    }
    return 0;
}
/**
 * Show sync status between repo pairs
 */
async function cmdStatus(alias, options, logger) {
    const config = loadGhConfig();
    if (alias) {
        const pair = getRepoPair(alias, config);
        if (!pair) {
            logger.error(`Unknown alias: ${alias}`);
            return 1;
        }
        return await showPairStatus(pair, logger);
    }
    // Show all pairs
    const pairs = getAllRepoPairs(config);
    if (pairs.length === 0) {
        logger.info("No repo pairs configured.");
        return 0;
    }
    for (const pair of pairs) {
        await showPairStatus(pair, logger);
        logger.info("");
    }
    return 0;
}
async function showPairStatus(pair, logger) {
    logger.info(chalk.bold(`Status: ${pair.alias}`));
    logger.info(chalk.gray("─".repeat(40)));
    // Get latest tags from both repos
    const privateTag = await getLatestTag(pair.private);
    const publicTag = await getLatestTag(pair.public);
    logger.info(`  Private: ${pair.private}`);
    logger.info(`    Latest tag: ${privateTag || "(none)"}`);
    logger.info(`  Public:  ${pair.public}`);
    logger.info(`    Latest tag: ${publicTag || "(none)"}`);
    if (privateTag && publicTag) {
        if (privateTag === publicTag) {
            logger.success("  Tags are in sync");
        }
        else {
            logger.info(chalk.yellow(`  ⚠ Tags differ: private=${privateTag} public=${publicTag}`));
        }
    }
    return 0;
}
async function getLatestTag(repo) {
    const parsed = parseRepoFullName(repo);
    if (!parsed)
        return null;
    try {
        const octokit = getOctokit();
        const { data } = await octokit.rest.repos.listTags({
            owner: parsed.owner,
            repo: parsed.name,
            per_page: 1,
        });
        return data.length > 0 ? data[0].name : null;
    }
    catch {
        return null;
    }
}
/**
 * Release: copy code from private to public repo
 */
async function cmdRelease(alias, options, logger) {
    if (!alias) {
        logger.error("Alias is required. Usage: repo-pairs release <alias> --tag <version>");
        return 1;
    }
    if (!options.tag) {
        logger.error("Tag is required. Usage: repo-pairs release <alias> --tag v1.0.0");
        return 1;
    }
    const pair = getRepoPair(alias);
    if (!pair) {
        logger.error(`Unknown alias: ${alias}. Run: repo-pairs list`);
        return 1;
    }
    const tag = options.tag.startsWith("v") ? options.tag : `v${options.tag}`;
    const projectPath = process.cwd();
    // sourceDir が指定されている場合、basePath をサブディレクトリに設定
    const basePath = pair.sourceDir ? resolve(projectPath, pair.sourceDir) : projectPath;
    // sourceDir 指定時のバリデーション
    if (pair.sourceDir) {
        if (!basePath.startsWith(projectPath)) {
            logger.error(`sourceDir must be within project root: ${pair.sourceDir}`);
            return 1;
        }
        if (!existsSync(basePath)) {
            logger.error(`Source directory not found: ${pair.sourceDir} (resolved: ${basePath})`);
            return 1;
        }
    }
    const excludePatterns = getMergedExcludePatterns(alias, basePath);
    logger.info(chalk.bold(`Release: ${pair.alias} → ${tag}`));
    logger.info(`  From: ${pair.private}`);
    logger.info(`  To:   ${pair.public}`);
    if (pair.sourceDir) {
        logger.info(`  Source: ${pair.sourceDir}`);
    }
    logger.info(`  Exclude: ${excludePatterns.join(", ")}`);
    const publicParsedRepo = parseRepoFullName(pair.public);
    if (!publicParsedRepo) {
        logger.error(`Invalid public repo format: ${pair.public}`);
        return 1;
    }
    // 1. ローカルファイルを収集（除外パターン適用）
    logger.verbose(`Collecting files from ${basePath}`);
    const allExcludes = [...excludePatterns, ".git/", "node_modules/"];
    const localFiles = collectLocalFiles(basePath, allExcludes);
    logger.info(`  Files: ${localFiles.length}`);
    if (options.dryRun) {
        logger.info(chalk.yellow("\n[DRY RUN] No changes will be made."));
        logger.info(chalk.gray("\nFiles to be released:"));
        for (const file of localFiles) {
            logger.info(chalk.gray(`  ${file.path}`));
        }
        return 0;
    }
    const octokit = getOctokit();
    const { owner: pubOwner, name: pubRepo } = publicParsedRepo;
    // 2. octokit Git Data API で tree を作成
    // base_tree なし = 完全置換（rsync --delete と同等）
    const treeItems = [];
    for (const file of localFiles) {
        const fullPath = join(basePath, file.path);
        const isExecutable = (statSync(fullPath).mode & 0o111) !== 0;
        if (file.isBinary) {
            // バイナリファイルは createBlob (base64) で処理
            const content = readFileSync(fullPath).toString("base64");
            const { data: blob } = await octokit.rest.git.createBlob({
                owner: pubOwner,
                repo: pubRepo,
                content,
                encoding: "base64",
            });
            treeItems.push({
                path: file.path,
                mode: isExecutable ? "100755" : "100644",
                type: "blob",
                sha: blob.sha,
            });
        }
        else {
            // テキストファイルは content インライン
            treeItems.push({
                path: file.path,
                mode: isExecutable ? "100755" : "100644",
                type: "blob",
                content: readFileSync(fullPath, "utf-8"),
            });
        }
    }
    const { data: tree } = await octokit.rest.git.createTree({
        owner: pubOwner,
        repo: pubRepo,
        tree: treeItems,
    });
    // 3. 現在のブランチ HEAD コミットを取得
    let parentSha;
    try {
        const { data: ref } = await octokit.rest.git.getRef({
            owner: pubOwner,
            repo: pubRepo,
            ref: `heads/${pair.defaultBranch}`,
        });
        parentSha = ref.object.sha;
    }
    catch {
        // 空リポジトリの場合は parent なし
    }
    // 4. changelog を生成
    const changelog = await generateChangelog(pubOwner, pubRepo, tag, octokit, pair.defaultBranch);
    // 5. コミットを作成
    const commitMsg = `release: ${tag}\n\n${changelog}`;
    const { data: commit } = await octokit.rest.git.createCommit({
        owner: pubOwner,
        repo: pubRepo,
        message: commitMsg,
        tree: tree.sha,
        parents: parentSha ? [parentSha] : [],
    });
    // 6. ブランチ参照を更新
    try {
        await octokit.rest.git.updateRef({
            owner: pubOwner,
            repo: pubRepo,
            ref: `heads/${pair.defaultBranch}`,
            sha: commit.sha,
        });
    }
    catch {
        // ブランチが存在しない場合は作成
        await octokit.rest.git.createRef({
            owner: pubOwner,
            repo: pubRepo,
            ref: `refs/heads/${pair.defaultBranch}`,
            sha: commit.sha,
        });
    }
    // 7. タグを作成
    const { data: tagObj } = await octokit.rest.git.createTag({
        owner: pubOwner,
        repo: pubRepo,
        tag,
        message: `Release ${tag}`,
        object: commit.sha,
        type: "commit",
    });
    await octokit.rest.git.createRef({
        owner: pubOwner,
        repo: pubRepo,
        ref: `refs/tags/${tag}`,
        sha: tagObj.sha,
    });
    // 8. GitHub Release を作成
    try {
        await octokit.rest.repos.createRelease({
            owner: pubOwner,
            repo: pubRepo,
            tag_name: tag,
            name: `Release ${tag}`,
            body: changelog,
        });
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.verbose(`Release creation warning: ${message}`);
    }
    logger.success(`Released ${tag} to ${pair.public}`);
    return 0;
}
/**
 * ローカルファイルを再帰的に収集し、除外パターンでフィルタリングする。
 */
function collectLocalFiles(basePath, excludePatterns) {
    const result = [];
    function walk(dir) {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            const relPath = relative(basePath, fullPath);
            // ディレクトリの場合: relPath + "/" でマッチング
            if (entry.isDirectory()) {
                const dirRelPath = relPath + "/";
                const isExcluded = excludePatterns.some(p => minimatch(dirRelPath, p, { dot: true }));
                if (!isExcluded) {
                    walk(fullPath);
                }
                continue;
            }
            // ファイルの場合
            if (entry.isFile()) {
                const isExcluded = excludePatterns.some(p => minimatch(relPath, p, { dot: true }));
                if (!isExcluded) {
                    result.push({ path: relPath, isBinary: isBinaryFile(fullPath) });
                }
            }
        }
    }
    walk(basePath);
    return result;
}
/**
 * ファイルがバイナリかどうかを判定する。
 * 先頭 512 バイトに null バイトが含まれていればバイナリと判定。
 */
function isBinaryFile(filePath) {
    try {
        const buffer = readFileSync(filePath);
        const checkLength = Math.min(buffer.length, 512);
        for (let i = 0; i < checkLength; i++) {
            if (buffer[i] === 0)
                return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
/**
 * octokit を使用して changelog を生成する。
 * public リポジトリのタグとコミット情報を API で取得。
 */
async function generateChangelog(owner, repo, tag, octokit, defaultBranch = "main") {
    try {
        // 前回のタグを取得
        const { data: tags } = await octokit.rest.repos.listTags({
            owner,
            repo,
            per_page: 2,
        });
        const prevTag = tags.length > 0 ? tags[0].name : null;
        if (!prevTag) {
            return `Release ${tag}`;
        }
        // 前回タグから現在の default branch までのコミットを比較
        const { data: comparison } = await octokit.rest.repos.compareCommits({
            owner,
            repo,
            base: prevTag,
            head: defaultBranch,
        });
        const commitMessages = comparison.commits.map(c => c.commit.message.split("\n")[0]);
        if (commitMessages.length === 0) {
            return `Release ${tag}`;
        }
        // コミットをカテゴリ分類
        const features = [];
        const fixes = [];
        const others = [];
        for (const msg of commitMessages) {
            if (msg.startsWith("feat:") || msg.startsWith("feat(")) {
                features.push(msg.replace(/^feat(\([^)]*\))?:\s*/, ""));
            }
            else if (msg.startsWith("fix:") || msg.startsWith("fix(")) {
                fixes.push(msg.replace(/^fix(\([^)]*\))?:\s*/, ""));
            }
            else if (!msg.startsWith("chore:") && !msg.startsWith("ci:")) {
                others.push(msg);
            }
        }
        const sections = [];
        if (features.length > 0) {
            sections.push("## Features\n" + features.map(f => `- ${f}`).join("\n"));
        }
        if (fixes.length > 0) {
            sections.push("## Bug Fixes\n" + fixes.map(f => `- ${f}`).join("\n"));
        }
        if (others.length > 0) {
            sections.push("## Other Changes\n" + others.map(o => `- ${o}`).join("\n"));
        }
        return sections.join("\n\n") || `Release ${tag}`;
    }
    catch {
        return `Release ${tag}`;
    }
}
/**
 * Generate public repo Issue templates
 */
function cmdTemplates(alias, options, logger) {
    if (!alias) {
        logger.error("Alias is required. Usage: repo-pairs templates <alias>");
        return 1;
    }
    const pair = getRepoPair(alias);
    if (!pair) {
        logger.error(`Unknown alias: ${alias}. Run: repo-pairs list`);
        return 1;
    }
    const outputDir = options.dryRun
        ? null
        : join(process.cwd(), ".github", "ISSUE_TEMPLATE");
    if (outputDir && !existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
    }
    // Bug report template
    const bugReport = `name: Bug Report
description: Report a bug or unexpected behavior
title: "[Bug]: "
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: |
        Thank you for reporting a bug! Please fill in the details below.

  - type: textarea
    id: description
    attributes:
      label: Bug Description
      description: A clear description of what the bug is.
      placeholder: What happened?
    validations:
      required: true

  - type: textarea
    id: steps
    attributes:
      label: Steps to Reproduce
      description: Steps to reproduce the behavior.
      placeholder: |
        1. Go to '...'
        2. Click on '...'
        3. See error
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What did you expect to happen?
    validations:
      required: true

  - type: textarea
    id: environment
    attributes:
      label: Environment
      description: Please provide your environment details.
      placeholder: |
        - OS: [e.g., macOS 14.0]
        - Node.js: [e.g., 20.10.0]
        - Version: [e.g., 1.0.0]
    validations:
      required: false

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Any other context about the problem.
    validations:
      required: false
`;
    // Feature request template
    const featureRequest = `name: Feature Request
description: Suggest a new feature or improvement
title: "[Feature]: "
labels: ["enhancement"]
body:
  - type: markdown
    attributes:
      value: |
        Thank you for suggesting a feature! Please describe your idea below.

  - type: textarea
    id: problem
    attributes:
      label: Problem Description
      description: Is your feature request related to a problem?
      placeholder: I'm always frustrated when...
    validations:
      required: false

  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: Describe the solution you'd like.
      placeholder: I would like...
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: Have you considered any alternative solutions?
    validations:
      required: false

  - type: textarea
    id: additional
    attributes:
      label: Additional Context
      description: Any other context or screenshots about the feature request.
    validations:
      required: false
`;
    // Template chooser config
    const configYml = `blank_issues_enabled: false
contact_links:
  - name: Documentation
    url: https://github.com/${pair.public}
    about: Check the documentation before opening an issue
`;
    if (options.dryRun) {
        logger.info(chalk.yellow("[DRY RUN] Would generate:"));
        logger.info("  .github/ISSUE_TEMPLATE/bug_report.yml");
        logger.info("  .github/ISSUE_TEMPLATE/feature_request.yml");
        logger.info("  .github/ISSUE_TEMPLATE/config.yml");
        return 0;
    }
    if (outputDir) {
        writeFileSync(join(outputDir, "bug_report.yml"), bugReport);
        writeFileSync(join(outputDir, "feature_request.yml"), featureRequest);
        writeFileSync(join(outputDir, "config.yml"), configYml);
    }
    logger.success("Generated Issue templates:");
    logger.info("  .github/ISSUE_TEMPLATE/bug_report.yml");
    logger.info("  .github/ISSUE_TEMPLATE/feature_request.yml");
    logger.info("  .github/ISSUE_TEMPLATE/config.yml");
    logger.info("");
    logger.info("Copy these to your public repo, or use:");
    logger.info(chalk.gray(`  repo-pairs release ${alias} --tag <version>`));
    return 0;
}
// ========================================
// Config file helpers
// ========================================
function findConfigFile() {
    const candidates = [
        "shirokuma-docs.config.yaml",
        "shirokuma-docs.config.yml",
    ];
    for (const name of candidates) {
        const path = resolve(process.cwd(), name);
        if (existsSync(path))
            return path;
    }
    return null;
}
// ========================================
// Main Handler
// ========================================
export async function repoPairsCommand(action, alias, options) {
    const logger = createLogger(options.verbose);
    let exitCode;
    switch (action) {
        case "list":
            exitCode = cmdList(logger);
            break;
        case "init":
            exitCode = await cmdInit(alias || "", options, logger);
            break;
        case "status":
            exitCode = await cmdStatus(alias, options, logger);
            break;
        case "release":
            exitCode = await cmdRelease(alias || "", options, logger);
            break;
        case "templates":
            exitCode = cmdTemplates(alias || "", options, logger);
            break;
        default:
            logger.error(`Unknown action: ${action}`);
            logger.info("Available: list, init, status, release, templates");
            exitCode = 1;
    }
    if (exitCode !== 0) {
        process.exit(exitCode);
    }
}
//# sourceMappingURL=repo-pairs.js.map