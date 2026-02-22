/**
 * issues Sub-Issue subcommands - Sub-Issue management operations
 *
 * Provides Sub-Issue functionality for the issues command:
 * - sub-list: List child issues with Project fields
 * - sub-add: Link a child issue to a parent
 * - sub-remove: Unlink a child issue from a parent
 *
 * Design:
 * - GraphQL for reads (sub-list, issues show summary) with GraphQL-Features header
 * - REST API for writes (sub-add, sub-remove) - GA endpoints
 * - Issue number → internal ID conversion via REST for write operations
 */

import { Logger } from "../utils/logger.js";
import {
  runGhCommand,
  runGraphQL,
  isIssueNumber,
  parseIssueNumber,
} from "../utils/github.js";
import {
  resolveTargetRepo,
} from "../utils/repo-pairs.js";

// =============================================================================
// Types
// =============================================================================

export interface IssuesSubOptions {
  owner?: string;
  verbose?: boolean;
  replaceParent?: boolean;
  // Repo pair flags (pass through)
  public?: boolean;
  repo?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** GraphQL-Features ヘッダー: Sub-Issues API へのアクセスに必要 */
const SUB_ISSUES_GRAPHQL_HEADERS = {
  "GraphQL-Features": "sub_issues",
};

// =============================================================================
// GraphQL Queries
// =============================================================================

/**
 * 子 Issue 一覧取得クエリ
 * subIssues コネクションで子 Issue の基本情報と Project フィールドを1クエリで取得
 */
const GRAPHQL_QUERY_SUB_ISSUES = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      number
      title
      subIssues(first: 50) {
        totalCount
        nodes {
          number
          title
          url
          state
          labels(first: 10) {
            nodes { name }
          }
          projectItems(first: 5) {
            nodes {
              id
              project { title }
              status: fieldValueByName(name: "Status") {
                ... on ProjectV2ItemFieldSingleSelectValue { name }
              }
              priority: fieldValueByName(name: "Priority") {
                ... on ProjectV2ItemFieldSingleSelectValue { name }
              }
              size: fieldValueByName(name: "Size") {
                ... on ProjectV2ItemFieldSingleSelectValue { name }
              }
            }
          }
        }
      }
      subIssuesSummary {
        total
        completed
        percentCompleted
      }
    }
  }
}
`;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Issue 番号から GitHub 内部 ID（REST API の id フィールド）を取得する。
 * Sub-Issues REST API の sub_issue_id パラメータに必要。
 */
export function getIssueInternalId(
  owner: string,
  repo: string,
  issueNumber: number,
  options?: { silent?: boolean }
): number | null {
  interface IssueResponse {
    id?: number;
    number?: number;
  }

  const result = runGhCommand<IssueResponse>(
    ["api", `repos/${owner}/${repo}/issues/${issueNumber}`, "--jq", ".id"],
    { silent: options?.silent ?? true }
  );

  if (!result.success) return null;

  // --jq ".id" は数値を文字列として返すので parseInt で変換
  const id = typeof result.data === "string"
    ? parseInt(result.data, 10)
    : typeof result.data === "number"
      ? result.data
      : null;

  return id && !isNaN(id) ? id : null;
}

// =============================================================================
// cmdSubList - 子 Issue 一覧
// =============================================================================

export async function cmdSubList(
  parentNumberStr: string,
  options: IssuesSubOptions,
  logger: Logger
): Promise<number> {
  if (!isIssueNumber(parentNumberStr)) {
    logger.error(`Invalid issue number: ${parentNumberStr}`);
    return 1;
  }

  const repoInfo = resolveTargetRepo(options);
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner, name: repo } = repoInfo;
  const parentNumber = parseIssueNumber(parentNumberStr);
  const projectName = repo;

  interface SubIssueNode {
    number?: number;
    title?: string;
    url?: string;
    state?: string;
    labels?: { nodes?: Array<{ name?: string }> };
    projectItems?: {
      nodes?: Array<{
        id?: string;
        project?: { title?: string };
        status?: { name?: string };
        priority?: { name?: string };
        size?: { name?: string };
      }>;
    };
  }

  interface QueryResult {
    data?: {
      repository?: {
        issue?: {
          number?: number;
          title?: string;
          subIssues?: {
            totalCount?: number;
            nodes?: SubIssueNode[];
          };
          subIssuesSummary?: {
            total?: number;
            completed?: number;
            percentCompleted?: number;
          };
        };
      };
    };
  }

  const result = runGraphQL<QueryResult>(
    GRAPHQL_QUERY_SUB_ISSUES,
    { owner, name: repo, number: parentNumber },
    { headers: SUB_ISSUES_GRAPHQL_HEADERS }
  );

  if (!result.success || !result.data?.data?.repository?.issue) {
    logger.error(`Issue #${parentNumber} not found`);
    return 1;
  }

  const issue = result.data.data.repository.issue;
  const subIssueNodes = issue.subIssues?.nodes ?? [];
  const summary = issue.subIssuesSummary;

  const subIssues = subIssueNodes
    .filter((n): n is SubIssueNode & { number: number } => !!n?.number)
    .map((n) => {
      const projectItems = n.projectItems?.nodes ?? [];
      const matchingItem = projectItems.find((p) => p?.project?.title === projectName);
      const labels = (n.labels?.nodes ?? []).map((l) => l?.name ?? "").filter(Boolean);

      return {
        number: n.number,
        title: n.title ?? "",
        url: n.url ?? "",
        state: n.state ?? "",
        labels,
        status: matchingItem?.status?.name ?? null,
        priority: matchingItem?.priority?.name ?? null,
        size: matchingItem?.size?.name ?? null,
      };
    });

  const output = {
    parent: {
      number: issue.number,
      title: issue.title ?? "",
    },
    sub_issues: subIssues,
    summary: {
      total: summary?.total ?? 0,
      completed: summary?.completed ?? 0,
      percent_completed: summary?.percentCompleted ?? 0,
    },
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

// =============================================================================
// cmdSubAdd - 子 Issue 紐付け
// =============================================================================

export async function cmdSubAdd(
  parentNumberStr: string,
  childNumberStr: string | undefined,
  options: IssuesSubOptions,
  logger: Logger
): Promise<number> {
  if (!isIssueNumber(parentNumberStr)) {
    logger.error(`Invalid parent issue number: ${parentNumberStr}`);
    return 1;
  }

  if (!childNumberStr || !isIssueNumber(childNumberStr)) {
    logger.error("Child issue number is required");
    logger.info("Usage: shirokuma-docs issues sub-add <parent> <child> [--replace-parent]");
    return 1;
  }

  const repoInfo = resolveTargetRepo(options);
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner, name: repo } = repoInfo;
  const parentNumber = parseIssueNumber(parentNumberStr);
  const childNumber = parseIssueNumber(childNumberStr);

  // 子 Issue の内部 ID を取得
  const childInternalId = getIssueInternalId(owner, repo, childNumber);
  if (!childInternalId) {
    logger.error(`Could not resolve internal ID for issue #${childNumber}`);
    return 1;
  }

  // REST API で子 Issue を紐付け
  const apiArgs = [
    "api",
    "-X", "POST",
    `repos/${owner}/${repo}/issues/${parentNumber}/sub_issues`,
    "-F", `sub_issue_id=${childInternalId}`,
  ];

  if (options.replaceParent) {
    apiArgs.push("-F", "replace_parent_issue=true");
  }

  const result = runGhCommand<{ id?: number; number?: number }>(
    apiArgs,
    { silent: true }
  );

  if (!result.success) {
    // 親 Issue が既にある場合のエラーハンドリング
    if (result.error?.includes("422") || result.error?.includes("already has a parent") || result.error?.includes("sub_issue_id")) {
      logger.error(
        `Issue #${childNumber} は既に親 Issue に紐付けられています。` +
        ` --replace-parent で上書きできます。`
      );
    } else {
      logger.error(`Failed to add #${childNumber} as sub-issue of #${parentNumber}: ${result.error}`);
    }
    return 1;
  }

  logger.success(`Added #${childNumber} as sub-issue of #${parentNumber}`);

  const output = {
    parent: parentNumber,
    child: childNumber,
    added: true,
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

// =============================================================================
// cmdSubRemove - 子 Issue 解除
// =============================================================================

export async function cmdSubRemove(
  parentNumberStr: string,
  childNumberStr: string | undefined,
  options: IssuesSubOptions,
  logger: Logger
): Promise<number> {
  if (!isIssueNumber(parentNumberStr)) {
    logger.error(`Invalid parent issue number: ${parentNumberStr}`);
    return 1;
  }

  if (!childNumberStr || !isIssueNumber(childNumberStr)) {
    logger.error("Child issue number is required");
    logger.info("Usage: shirokuma-docs issues sub-remove <parent> <child>");
    return 1;
  }

  const repoInfo = resolveTargetRepo(options);
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner, name: repo } = repoInfo;
  const parentNumber = parseIssueNumber(parentNumberStr);
  const childNumber = parseIssueNumber(childNumberStr);

  // 子 Issue の内部 ID を取得
  const childInternalId = getIssueInternalId(owner, repo, childNumber);
  if (!childInternalId) {
    logger.error(`Could not resolve internal ID for issue #${childNumber}`);
    return 1;
  }

  // REST API で子 Issue を解除
  // DELETE /repos/{owner}/{repo}/issues/{parent}/sub_issue (単数形)
  const result = runGhCommand<{ id?: number }>(
    [
      "api",
      "-X", "DELETE",
      `repos/${owner}/${repo}/issues/${parentNumber}/sub_issue`,
      "-F", `sub_issue_id=${childInternalId}`,
    ],
    { silent: true }
  );

  if (!result.success) {
    logger.error(`Failed to remove #${childNumber} from sub-issues of #${parentNumber}: ${result.error}`);
    return 1;
  }

  logger.success(`Removed #${childNumber} from sub-issues of #${parentNumber}`);

  const output = {
    parent: parentNumber,
    child: childNumber,
    removed: true,
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}
