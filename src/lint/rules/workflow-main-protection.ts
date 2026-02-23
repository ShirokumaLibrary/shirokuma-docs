/**
 * workflow-main-protection rule
 *
 * Detects direct commits on protected branches (main, develop).
 * Checks if the current branch is a protected branch and warns accordingly.
 * Also checks recent commits for Co-Authored-By signatures.
 */

import { simpleGit } from "simple-git";
import type { WorkflowIssue, WorkflowIssueSeverity } from "../workflow-types.js";
import { getCurrentBranch } from "../../utils/git-local.js";

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
export async function checkMainProtection(
  severity: WorkflowIssueSeverity = "error",
  protectedBranches: string[] = DEFAULT_PROTECTED_BRANCHES
): Promise<WorkflowIssue[]> {
  // Get current branch name
  const currentBranch = getCurrentBranch();

  if (!currentBranch) {
    return [
      {
        type: "info",
        message: "Could not determine current branch. Skipping main-protection check.",
        rule: "main-protection",
      },
    ];
  }

  const git = simpleGit();

  // Gather state
  let hasUncommittedChanges = false;
  let directCommitCount = 0;

  if (protectedBranches.includes(currentBranch)) {
    // Check uncommitted changes
    try {
      const status = await git.status();
      hasUncommittedChanges = status.files.length > 0;
    } catch {
      // git status 失敗時は false のまま
    }

    // Check direct commits
    try {
      const logResult = await git.raw([
        "log", "--oneline", "--no-merges", "-10", `origin/${currentBranch}..HEAD`,
      ]);
      if (logResult?.trim()) {
        directCommitCount = logResult
          .trim()
          .split("\n")
          .filter((l) => l.length > 0).length;
      }
    } catch {
      // log 失敗時は 0 のまま
    }
  }

  // Check recent commits for Co-Authored-By
  const recentCommits: GitProtectionState["recentCommits"] = [];
  try {
    const commitLogResult = await git.raw([
      "log", "--format=%H%x00%s%x00%b%x00", "-20",
    ]);

    if (commitLogResult?.trim()) {
      const parts = commitLogResult.split("\0");
      for (let i = 0; i + 2 < parts.length; i += 3) {
        const rawHash = parts[i].trim();
        if (!rawHash) continue;
        const hash = rawHash.substring(0, 7);
        const subject = parts[i + 1];
        const body = parts[i + 2];
        recentCommits.push({ hash, subject, body });
      }
    }
  } catch {
    // log 失敗時は空配列のまま
  }

  return validateMainProtection(
    { currentBranch, hasUncommittedChanges, directCommitCount, recentCommits },
    severity,
    protectedBranches
  );
}
