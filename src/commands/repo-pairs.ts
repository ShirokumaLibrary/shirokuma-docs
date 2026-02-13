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
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import {
  getAllRepoPairs,
  getRepoPair,
  parseRepoFullName,
  getMergedExcludePatterns,
  DEFAULT_EXCLUDE_PATTERNS,
} from "../utils/repo-pairs.js";
import { runGhCommand, getRepoInfo } from "../utils/github.js";
import { loadGhConfig } from "../utils/gh-config.js";

// ========================================
// Types
// ========================================

export interface RepoPairsOptions {
  verbose?: boolean;
  private?: string;
  public?: string;
  exclude?: string[];
  tag?: string;
  dryRun?: boolean;
}

interface Logger {
  info: (msg: string) => void;
  error: (msg: string) => void;
  verbose: (msg: string) => void;
  success: (msg: string) => void;
}

// ========================================
// Helpers
// ========================================

function createLogger(isVerbose?: boolean): Logger {
  return {
    info: (msg: string) => console.log(msg),
    error: (msg: string) => console.error(chalk.red(`Error: ${msg}`)),
    verbose: (msg: string) => {
      if (isVerbose) console.log(chalk.gray(msg));
    },
    success: (msg: string) => console.log(chalk.green(`✓ ${msg}`)),
  };
}

// ========================================
// Subcommands
// ========================================

/**
 * List all configured repo pairs
 */
function cmdList(logger: Logger): number {
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
function cmdInit(alias: string, options: RepoPairsOptions, logger: Logger): number {
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
  logger.verbose(`Validating private repo: ${privateRepo}`);
  const privateResult = runGhCommand(
    ["repo", "view", privateRepo, "--json", "name"],
    { silent: true }
  );
  if (!privateResult.success) {
    logger.error(`Private repo not found: ${privateRepo}`);
    return 1;
  }

  logger.verbose(`Validating public repo: ${publicRepo}`);
  const publicResult = runGhCommand(
    ["repo", "view", publicRepo, "--json", "name"],
    { silent: true }
  );
  if (!publicResult.success) {
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
  const config = parseYaml(content) as Record<string, unknown> || {};

  // Add/update repoPairs section
  const repoPairs = (config.repoPairs as Record<string, unknown>) || {};
  repoPairs[alias] = {
    private: privateRepo,
    public: publicRepo,
    exclude: options.exclude ?? DEFAULT_EXCLUDE_PATTERNS,
  };
  config.repoPairs = repoPairs;

  // Write back
  writeFileSync(configPath, stringifyYaml(config, { lineWidth: 120 }));

  logger.success(`Repo pair "${alias}" added to ${configPath}`);
  logger.info(`  Private: ${privateRepo}`);
  logger.info(`  Public:  ${publicRepo}`);

  return 0;
}

/**
 * Show sync status between repo pairs
 */
function cmdStatus(alias: string | undefined, options: RepoPairsOptions, logger: Logger): number {
  const config = loadGhConfig();

  if (alias) {
    const pair = getRepoPair(alias, config);
    if (!pair) {
      logger.error(`Unknown alias: ${alias}`);
      return 1;
    }
    return showPairStatus(pair, logger);
  }

  // Show all pairs
  const pairs = getAllRepoPairs(config);
  if (pairs.length === 0) {
    logger.info("No repo pairs configured.");
    return 0;
  }

  for (const pair of pairs) {
    showPairStatus(pair, logger);
    logger.info("");
  }

  return 0;
}

function showPairStatus(pair: { alias: string; private: string; public: string }, logger: Logger): number {
  logger.info(chalk.bold(`Status: ${pair.alias}`));
  logger.info(chalk.gray("─".repeat(40)));

  // Get latest tags from both repos
  const privateTag = getLatestTag(pair.private);
  const publicTag = getLatestTag(pair.public);

  logger.info(`  Private: ${pair.private}`);
  logger.info(`    Latest tag: ${privateTag || "(none)"}`);
  logger.info(`  Public:  ${pair.public}`);
  logger.info(`    Latest tag: ${publicTag || "(none)"}`);

  if (privateTag && publicTag) {
    if (privateTag === publicTag) {
      logger.success("  Tags are in sync");
    } else {
      logger.info(chalk.yellow(`  ⚠ Tags differ: private=${privateTag} public=${publicTag}`));
    }
  }

  return 0;
}

function getLatestTag(repo: string): string | null {
  const result = runGhCommand<Array<{ name: string }>>(
    ["api", `repos/${repo}/tags`],
    { silent: true }
  );

  if (!result.success) return null;
  if (Array.isArray(result.data) && result.data.length > 0) {
    return result.data[0].name || null;
  }
  return null;
}

/**
 * Release: copy code from private to public repo
 */
function cmdRelease(alias: string, options: RepoPairsOptions, logger: Logger): number {
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
  const excludePatterns = getMergedExcludePatterns(alias, projectPath);

  logger.info(chalk.bold(`Release: ${pair.alias} → ${tag}`));
  logger.info(`  From: ${pair.private}`);
  logger.info(`  To:   ${pair.public}`);
  logger.info(`  Exclude: ${excludePatterns.join(", ")}`);

  if (options.dryRun) {
    logger.info(chalk.yellow("\n[DRY RUN] No changes will be made."));
    return 0;
  }

  // 1. Clone public repo to temp dir
  const tmpDir = join("/tmp", `shirokuma-release-${Date.now()}`);
  logger.verbose(`Cloning public repo to ${tmpDir}`);

  const cloneResult = spawnSync("gh", ["repo", "clone", pair.public, tmpDir], {
    encoding: "utf-8",
    timeout: 60_000,
  });

  if (cloneResult.status !== 0) {
    logger.error(`Failed to clone ${pair.public}: ${cloneResult.stderr}`);
    return 1;
  }

  // 2. Clear public repo contents (except .git)
  const gitDir = join(tmpDir, ".git");
  const entries = spawnSync("ls", ["-A", tmpDir], { encoding: "utf-8" });
  for (const entry of (entries.stdout || "").trim().split("\n")) {
    if (entry && entry !== ".git") {
      rmSync(join(tmpDir, entry), { recursive: true, force: true });
    }
  }

  // 3. Copy from private repo, excluding patterns
  logger.verbose(`Copying from ${projectPath} to ${tmpDir}`);
  logger.verbose(`Exclude patterns (${excludePatterns.length}): ${excludePatterns.join(", ")}`);

  const rsyncResult = spawnSync("rsync", [
    "-a", "--delete",
    ...excludePatterns.map(p => `--exclude=${p}`),
    "--exclude=.git/",
    "--exclude=node_modules/",
    `${projectPath}/`,
    `${tmpDir}/`,
  ], {
    encoding: "utf-8",
    timeout: 120_000,
  });

  if (rsyncResult.status !== 0) {
    logger.error(`File sync failed: ${rsyncResult.stderr}`);
    // Cleanup
    rmSync(tmpDir, { recursive: true, force: true });
    return 1;
  }

  // 4. Generate changelog
  const changelog = generateChangelog(projectPath, tag);

  // 5. Commit and push
  const gitOpts = { cwd: tmpDir, encoding: "utf-8" as const, timeout: 30_000 };

  spawnSync("git", ["add", "-A"], gitOpts);

  const commitMsg = `release: ${tag}\n\n${changelog}`;
  const commitResult = spawnSync("git", ["commit", "-m", commitMsg, "--allow-empty"], gitOpts);

  if (commitResult.status !== 0) {
    logger.verbose(`Commit output: ${commitResult.stderr}`);
  }

  // Tag
  spawnSync("git", ["tag", tag, "-m", `Release ${tag}`], gitOpts);

  // Push
  const pushResult = spawnSync("git", ["push", "origin", pair.defaultBranch, "--tags"], gitOpts);

  if (pushResult.status !== 0) {
    logger.error(`Push failed: ${pushResult.stderr}`);
    rmSync(tmpDir, { recursive: true, force: true });
    return 1;
  }

  // 6. Create GitHub release with changelog
  runGhCommand([
    "release", "create", tag,
    "--repo", pair.public,
    "--title", `Release ${tag}`,
    "--notes", changelog,
  ]);

  // Cleanup
  rmSync(tmpDir, { recursive: true, force: true });

  logger.success(`Released ${tag} to ${pair.public}`);
  return 0;
}

/**
 * Generate changelog from git log
 */
function generateChangelog(repoPath: string, tag: string): string {
  // Find previous tag
  const prevTagResult = spawnSync("git", ["describe", "--tags", "--abbrev=0", "HEAD^"], {
    cwd: repoPath,
    encoding: "utf-8",
    timeout: 10_000,
  });

  const prevTag = prevTagResult.status === 0 ? prevTagResult.stdout.trim() : null;
  const range = prevTag ? `${prevTag}..HEAD` : "HEAD";

  const logResult = spawnSync("git", [
    "log", range, "--oneline", "--no-merges",
    "--format=%s",
  ], {
    cwd: repoPath,
    encoding: "utf-8",
    timeout: 10_000,
  });

  if (logResult.status !== 0 || !logResult.stdout.trim()) {
    return `Release ${tag}`;
  }

  const commits = logResult.stdout.trim().split("\n");

  // Categorize commits
  const features: string[] = [];
  const fixes: string[] = [];
  const others: string[] = [];

  for (const commit of commits) {
    if (commit.startsWith("feat:") || commit.startsWith("feat(")) {
      features.push(commit.replace(/^feat(\([^)]*\))?:\s*/, ""));
    } else if (commit.startsWith("fix:") || commit.startsWith("fix(")) {
      fixes.push(commit.replace(/^fix(\([^)]*\))?:\s*/, ""));
    } else if (!commit.startsWith("chore:") && !commit.startsWith("ci:")) {
      others.push(commit);
    }
  }

  const sections: string[] = [];

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

/**
 * Generate public repo Issue templates
 */
function cmdTemplates(alias: string, options: RepoPairsOptions, logger: Logger): number {
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

function findConfigFile(): string | null {
  const candidates = [
    "shirokuma-docs.config.yaml",
    "shirokuma-docs.config.yml",
  ];

  for (const name of candidates) {
    const path = resolve(process.cwd(), name);
    if (existsSync(path)) return path;
  }

  return null;
}

// ========================================
// Main Handler
// ========================================

export async function repoPairsCommand(
  action: string,
  alias: string | undefined,
  options: RepoPairsOptions
): Promise<void> {
  const logger = createLogger(options.verbose);

  let exitCode: number;

  switch (action) {
    case "list":
      exitCode = cmdList(logger);
      break;

    case "init":
      exitCode = cmdInit(alias || "", options, logger);
      break;

    case "status":
      exitCode = cmdStatus(alias, options, logger);
      break;

    case "release":
      exitCode = cmdRelease(alias || "", options, logger);
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
