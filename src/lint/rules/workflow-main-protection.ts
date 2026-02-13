/**
 * workflow-main-protection rule
 *
 * Detects direct commits on protected branches (main, develop).
 * Checks if the current branch is a protected branch and warns accordingly.
 * Also checks recent commits for Co-Authored-By signatures.
 */

import { spawnSync } from "node:child_process";
import type { WorkflowIssue, WorkflowIssueSeverity } from "../workflow-types.js";

const DEFAULT_PROTECTED_BRANCHES = ["main", "develop"];

/**
 * Git state input for pure validation
 */
export interface GitProtectionState {
  currentBranch: string;
  hasUncommittedChanges: boolean;
  directCommitCount: number;
  /** Recent commit entries */
  recentCommits: Array<{ hash: string; subject: string; body: string }>;
}

/**
 * Pure validation: check git state against protection rules.
 * Exported for testing.
 */
export function validateMainProtection(
  state: GitProtectionState,
  severity: WorkflowIssueSeverity = "error",
  protectedBranches: string[] = DEFAULT_PROTECTED_BRANCHES
): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];

  // Check if on a protected branch
  if (protectedBranches.includes(state.currentBranch)) {
    if (state.hasUncommittedChanges) {
      issues.push({
        type: severity,
        message: `Uncommitted changes detected on protected branch "${state.currentBranch}". Create a feature branch first.`,
        rule: "main-protection",
        context: state.currentBranch,
      });
    }

    if (state.directCommitCount > 0) {
      issues.push({
        type: severity,
        message: `${state.directCommitCount} direct (non-merge) commit(s) on protected branch "${state.currentBranch}". Use feature branches with PRs.`,
        rule: "main-protection",
        context: state.currentBranch,
      });
    }
  }

  // Check recent commits for Co-Authored-By lines (any branch)
  for (const commit of state.recentCommits) {
    if (
      /Co-Authored-By:/i.test(commit.body) ||
      /Co-Authored-By:/i.test(commit.subject)
    ) {
      issues.push({
        type: "warning",
        message: `Commit ${commit.hash} "${commit.subject}" contains Co-Authored-By signature`,
        rule: "co-authored-by",
        context: commit.hash,
      });
    }
  }

  return issues;
}

/**
 * Gather git state and run main-protection checks.
 */
export function checkMainProtection(
  severity: WorkflowIssueSeverity = "error",
  protectedBranches: string[] = DEFAULT_PROTECTED_BRANCHES
): WorkflowIssue[] {
  // Get current branch name
  const branchResult = spawnSync("git", ["branch", "--show-current"], {
    encoding: "utf-8",
    timeout: 5_000,
  });

  if (branchResult.status !== 0 || !branchResult.stdout?.trim()) {
    return [
      {
        type: "info",
        message: "Could not determine current branch. Skipping main-protection check.",
        rule: "main-protection",
      },
    ];
  }

  const currentBranch = branchResult.stdout.trim();

  // Gather state
  let hasUncommittedChanges = false;
  let directCommitCount = 0;

  if (protectedBranches.includes(currentBranch)) {
    // Check uncommitted changes
    const statusResult = spawnSync("git", ["status", "--porcelain"], {
      encoding: "utf-8",
      timeout: 5_000,
    });
    hasUncommittedChanges =
      statusResult.status === 0 && statusResult.stdout?.trim().length > 0;

    // Check direct commits
    const logResult = spawnSync(
      "git",
      ["log", "--oneline", "--no-merges", "-10", `origin/${currentBranch}..HEAD`],
      {
        encoding: "utf-8",
        timeout: 5_000,
      }
    );
    if (logResult.status === 0 && logResult.stdout?.trim()) {
      directCommitCount = logResult.stdout
        .trim()
        .split("\n")
        .filter((l) => l.length > 0).length;
    }
  }

  // Check recent commits for Co-Authored-By
  // Use record separator (%x00) between commits to handle multi-line bodies
  const recentCommits: GitProtectionState["recentCommits"] = [];
  const commitLogResult = spawnSync(
    "git",
    ["log", "--format=%H%x00%s%x00%b%x00", "-20"],
    {
      encoding: "utf-8",
      timeout: 5_000,
    }
  );

  if (commitLogResult.status === 0 && commitLogResult.stdout?.trim()) {
    // Split by null byte groups: each commit produces hash\0subject\0body\0
    const parts = commitLogResult.stdout.split("\0");
    // Process in groups of 3 (hash, subject, body) with trailing element
    for (let i = 0; i + 2 < parts.length; i += 3) {
      const rawHash = parts[i].trim();
      if (!rawHash) continue;
      const hash = rawHash.substring(0, 7);
      const subject = parts[i + 1];
      const body = parts[i + 2];
      recentCommits.push({ hash, subject, body });
    }
  }

  return validateMainProtection(
    { currentBranch, hasUncommittedChanges, directCommitCount, recentCommits },
    severity,
    protectedBranches
  );
}
