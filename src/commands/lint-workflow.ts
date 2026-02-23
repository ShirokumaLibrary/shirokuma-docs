/**
 * lint-workflow command - AI workflow validation
 *
 * Validates that AI workflow conventions are followed:
 * - Issue field completeness (Priority, Size)
 * - Branch naming convention ({type}/{number}-{slug})
 * - Protected branch protection (no direct commits on main/develop)
 * - Co-Authored-By detection
 *
 * Rules:
 * - issue-fields: Check open issues for missing project fields (P1)
 * - branch-naming: Validate current branch name convention (P1)
 * - main-protection: Detect direct commits on protected branches (P1)
 * - commit-format: Validate Conventional Commits format (P2)
 * - co-authored-by: Detect Co-Authored-By signatures in commits (detected in main-protection)
 */

import { resolve } from "node:path";
import { loadConfig } from "../utils/config.js";
import { writeFile } from "../utils/file.js";
import { createLogger } from "../utils/logger.js";
import type {
  LintWorkflowConfig,
  LintWorkflowReport,
  WorkflowRuleResult,
  WorkflowIssue,
} from "../lint/workflow-types.js";
import { checkIssueFields } from "../lint/rules/workflow-issue-fields.js";
import { checkBranchNaming } from "../lint/rules/workflow-branch-naming.js";
import { checkMainProtection } from "../lint/rules/workflow-main-protection.js";
import { checkCommitFormat } from "../lint/rules/workflow-commit-format.js";

/**
 * Command options
 */
interface LintWorkflowOptions {
  project: string;
  config: string;
  format?: "terminal" | "json" | "summary";
  output?: string;
  strict?: boolean;
  verbose?: boolean;
  // Filter flags
  issues?: boolean;
  branches?: boolean;
  commits?: boolean;
}

/**
 * Default lint-workflow configuration
 */
const defaultLintWorkflowConfig: LintWorkflowConfig = {
  enabled: true,
  strict: false,
  rules: {
    "issue-fields": { severity: "warning", enabled: true },
    "branch-naming": { severity: "warning", enabled: true },
    "main-protection": { severity: "error", enabled: true },
    "commit-format": { severity: "warning", enabled: true },
  },
};

/**
 * lint-workflow command handler
 */
export async function lintWorkflowCommand(
  options: LintWorkflowOptions
): Promise<void> {
  const logger = createLogger(options.verbose);
  const projectPath = resolve(options.project);

  logger.info("Validating workflow conventions");

  // Load config
  const config = loadConfig(projectPath, options.config);
  const lintWorkflowConfig: LintWorkflowConfig = {
    ...defaultLintWorkflowConfig,
    ...config.lintWorkflow,
    rules: {
      ...defaultLintWorkflowConfig.rules,
      ...config.lintWorkflow?.rules,
    },
  };

  const strict = options.strict ?? lintWorkflowConfig.strict ?? false;

  // Determine which rules to run
  const hasFilter = options.issues || options.branches || options.commits;
  const runIssues =
    (!hasFilter || options.issues) &&
    lintWorkflowConfig.rules?.["issue-fields"]?.enabled !== false;
  const runBranches =
    (!hasFilter || options.branches) &&
    lintWorkflowConfig.rules?.["branch-naming"]?.enabled !== false;
  const runCommits =
    (!hasFilter || options.commits) &&
    lintWorkflowConfig.rules?.["main-protection"]?.enabled !== false;

  // Run checks
  const ruleResults: WorkflowRuleResult[] = [];

  if (runIssues) {
    logger.debug("Checking issue field completeness...");
    const issueFieldsSeverity =
      lintWorkflowConfig.rules?.["issue-fields"]?.severity ?? "warning";
    const issues = checkIssueFields(issueFieldsSeverity);
    ruleResults.push({
      rule: "issue-fields",
      description: "Issue field completeness (Priority, Size)",
      issues,
      passed: issues.filter((i) => i.type === "error").length === 0,
    });
  }

  if (runBranches) {
    logger.debug("Checking branch naming convention...");
    const branchSeverity =
      lintWorkflowConfig.rules?.["branch-naming"]?.severity ?? "warning";
    const prefixes =
      lintWorkflowConfig.rules?.["branch-naming"]?.prefixes ?? undefined;
    const issues = checkBranchNaming(branchSeverity, prefixes);
    ruleResults.push({
      rule: "branch-naming",
      description: "Branch naming convention ({type}/{number}-{slug})",
      issues,
      passed: issues.filter((i) => i.type === "error").length === 0,
    });
  }

  if (runCommits) {
    logger.debug("Checking protected branch protection...");
    const mainProtSeverity =
      lintWorkflowConfig.rules?.["main-protection"]?.severity ?? "error";
    const protectedBranches =
      lintWorkflowConfig.rules?.["main-protection"]?.branches ?? undefined;
    const issues = await checkMainProtection(mainProtSeverity, protectedBranches);
    ruleResults.push({
      rule: "main-protection",
      description: "Protected branch and commit conventions",
      issues,
      passed: issues.filter((i) => i.type === "error").length === 0,
    });

    // commit-format rule (also gated by --commits flag)
    if (lintWorkflowConfig.rules?.["commit-format"]?.enabled !== false) {
      logger.debug("Checking commit message format...");
      const commitSeverity =
        lintWorkflowConfig.rules?.["commit-format"]?.severity ?? "warning";
      const commitTypes =
        lintWorkflowConfig.rules?.["commit-format"]?.types ?? undefined;
      const commitIssues = await checkCommitFormat(commitSeverity, commitTypes);
      ruleResults.push({
        rule: "commit-format",
        description: "Conventional Commits format ({type}: {description})",
        issues: commitIssues,
        passed: commitIssues.filter((i) => i.type === "error").length === 0,
      });
    }
  }

  // Build report
  const report = buildReport(ruleResults);

  // Format output
  const outputFormat = options.format || "terminal";
  const output = formatReport(report, outputFormat);

  // Write to file or stdout
  if (options.output) {
    writeFile(options.output, output);
    logger.success(`Report written to: ${options.output}`);
  } else {
    console.log(output);
  }

  // Exit code
  if (report.passed) {
    logger.success(
      `Workflow validation passed (${report.summary.warningCount} warning(s))`
    );
    process.exit(0);
  } else {
    if (strict) {
      logger.error(
        `Workflow validation failed - ${report.summary.errorCount} error(s)`
      );
      process.exit(1);
    } else {
      logger.warn(
        `Workflow validation completed - ${report.summary.errorCount} error(s) (non-strict mode)`
      );
      process.exit(0);
    }
  }
}

/**
 * Build a report from rule results
 */
function buildReport(ruleResults: WorkflowRuleResult[]): LintWorkflowReport {
  let errorCount = 0;
  let warningCount = 0;
  let infoCount = 0;

  for (const rr of ruleResults) {
    for (const issue of rr.issues) {
      switch (issue.type) {
        case "error":
          errorCount++;
          break;
        case "warning":
          warningCount++;
          break;
        case "info":
          infoCount++;
          break;
      }
    }
  }

  return {
    ruleResults,
    summary: {
      totalChecks: ruleResults.length,
      errorCount,
      warningCount,
      infoCount,
    },
    passed: errorCount === 0,
  };
}

/**
 * Format the report for output
 */
function formatReport(
  report: LintWorkflowReport,
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
 * Summary format
 */
function formatSummary(report: LintWorkflowReport): string {
  const { summary } = report;
  const lines: string[] = [
    "",
    "Workflow Validation Summary",
    "==========================",
    "",
    `Checks Run:  ${summary.totalChecks}`,
    `Errors:      ${summary.errorCount}`,
    `Warnings:    ${summary.warningCount}`,
    `Info:        ${summary.infoCount}`,
    "",
    report.passed ? "PASSED" : "FAILED",
    "",
  ];

  return lines.join("\n");
}

/**
 * Terminal format with colored output
 */
function formatTerminal(report: LintWorkflowReport): string {
  const lines: string[] = [];

  lines.push("");
  lines.push("Workflow Convention Validation");
  lines.push("=".repeat(60));
  lines.push("");

  for (const rr of report.ruleResults) {
    const icon = rr.passed ? "\u2705" : "\u274C";
    lines.push(`${icon} ${rr.rule}: ${rr.description}`);

    if (rr.issues.length === 0) {
      lines.push("   No issues found");
    }

    for (const issue of rr.issues) {
      const issueIcon = getIssueIcon(issue.type);
      const ctx = issue.context ? ` [${issue.context}]` : "";
      lines.push(`   ${issueIcon} ${issue.message}${ctx}`);
    }

    lines.push("");
  }

  // Summary
  lines.push("=".repeat(60));
  lines.push("");
  lines.push("Summary:");
  lines.push(`  Checks Run:     ${report.summary.totalChecks}`);
  lines.push(`  \u274C Errors:        ${report.summary.errorCount}`);
  lines.push(`  \u26A0\uFE0F  Warnings:      ${report.summary.warningCount}`);
  lines.push(`  \u2139\uFE0F  Info:          ${report.summary.infoCount}`);
  lines.push("");
  lines.push(report.passed ? "\u2705 PASSED" : "\u274C FAILED");
  lines.push("");

  return lines.join("\n");
}

function getIssueIcon(type: string): string {
  switch (type) {
    case "error":
      return "\u274C";
    case "warning":
      return "\u26A0\uFE0F";
    case "info":
      return "\u2139\uFE0F";
    default:
      return "\u2022";
  }
}
