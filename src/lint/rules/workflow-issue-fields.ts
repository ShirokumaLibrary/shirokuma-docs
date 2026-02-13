/**
 * workflow-issue-fields rule
 *
 * Checks open issues for missing Project fields (Priority, Type, Size).
 * Uses shirokuma-docs issues list output (JSON with project fields).
 */

import { spawnSync } from "node:child_process";
import type { WorkflowIssue, WorkflowIssueSeverity } from "../workflow-types.js";

/**
 * Table-JSON response from issues list
 */
export interface TableJsonResponse {
  columns: string[];
  rows: Array<Array<string | number | string[] | null>>;
}

const REQUIRED_FIELDS = ["priority", "type", "size"] as const;

/**
 * Pure validation: check issue data for missing fields.
 * Exported for testing.
 */
export function validateIssueFields(
  data: TableJsonResponse,
  severity: WorkflowIssueSeverity = "warning"
): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];

  // Map columns to indices
  const colIndex: Record<string, number> = {};
  for (let i = 0; i < data.columns.length; i++) {
    colIndex[data.columns[i]] = i;
  }

  // Validate required columns exist
  const requiredCols = ["number", "title", "status", ...REQUIRED_FIELDS];
  for (const col of requiredCols) {
    if (colIndex[col] === undefined) {
      return [
        {
          type: "warning",
          message: `Invalid table-json format: missing "${col}" column`,
          rule: "issue-fields",
        },
      ];
    }
  }

  // Check each issue row
  for (const row of data.rows) {
    const issueNumber = row[colIndex["number"]] as number;
    const issueTitle = row[colIndex["title"]] as string;
    const status = row[colIndex["status"]] as string | null;

    // Skip Done/Released issues
    if (status === "Done" || status === "Released") continue;

    for (const field of REQUIRED_FIELDS) {
      const value = row[colIndex[field]] as string | null;
      if (!value) {
        issues.push({
          type: severity,
          message: `Issue #${issueNumber} "${issueTitle}" is missing ${field} field`,
          rule: "issue-fields",
          context: `#${issueNumber}`,
        });
      }
    }
  }

  return issues;
}

/**
 * Fetch issue data and check field completeness.
 */
export function checkIssueFields(
  severity: WorkflowIssueSeverity = "warning"
): WorkflowIssue[] {
  // Fetch open issues via shirokuma-docs CLI (reuse existing logic)
  const result = spawnSync(
    "shirokuma-docs",
    ["issues", "list", "--format", "table-json"],
    {
      encoding: "utf-8",
      timeout: 30_000,
    }
  );

  if (result.status !== 0 || !result.stdout?.trim()) {
    return [
      {
        type: "warning",
        message: "Failed to fetch issues from GitHub. Skipping issue-fields check.",
        rule: "issue-fields",
        context: result.stderr?.trim() || "unknown error",
      },
    ];
  }

  let data: TableJsonResponse;
  try {
    data = JSON.parse(result.stdout.trim());
  } catch {
    return [
      {
        type: "warning",
        message: "Failed to parse issues list output",
        rule: "issue-fields",
      },
    ];
  }

  return validateIssueFields(data, severity);
}
