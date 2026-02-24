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
import { runGraphQL, isIssueNumber, parseIssueNumber, } from "../utils/github.js";
import { resolveTargetRepo, } from "../utils/repo-pairs.js";
import { getOctokit } from "../utils/octokit-client.js";
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
export async function getIssueInternalId(owner, repo, issueNumber, _options) {
    try {
        const octokit = getOctokit();
        const { data } = await octokit.rest.issues.get({
            owner,
            repo,
            issue_number: issueNumber,
        });
        return data.id ?? null;
    }
    catch {
        return null;
    }
}
// =============================================================================
// cmdSubList - 子 Issue 一覧
// =============================================================================
export async function cmdSubList(parentNumberStr, options, logger) {
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
    const result = await runGraphQL(GRAPHQL_QUERY_SUB_ISSUES, { owner, name: repo, number: parentNumber }, { headers: SUB_ISSUES_GRAPHQL_HEADERS });
    if (!result.success || !result.data?.data?.repository?.issue) {
        logger.error(`Issue #${parentNumber} not found`);
        return 1;
    }
    const issue = result.data.data.repository.issue;
    const subIssueNodes = issue.subIssues?.nodes ?? [];
    const summary = issue.subIssuesSummary;
    const subIssues = subIssueNodes
        .filter((n) => !!n?.number)
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
export async function cmdSubAdd(parentNumberStr, childNumberStr, options, logger) {
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
    const childInternalId = await getIssueInternalId(owner, repo, childNumber);
    if (!childInternalId) {
        logger.error(`Could not resolve internal ID for issue #${childNumber}`);
        return 1;
    }
    // REST API で子 Issue を紐付け
    try {
        const octokit = getOctokit();
        await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues", {
            owner,
            repo,
            issue_number: parentNumber,
            sub_issue_id: childInternalId,
            ...(options.replaceParent ? { replace_parent_issue: true } : {}),
        });
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes("422") || message.includes("already has a parent") || message.includes("sub_issue_id")) {
            logger.error(`Issue #${childNumber} は既に親 Issue に紐付けられています。` +
                ` --replace-parent で上書きできます。`);
        }
        else {
            logger.error(`Failed to add #${childNumber} as sub-issue of #${parentNumber}: ${message}`);
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
export async function cmdSubRemove(parentNumberStr, childNumberStr, options, logger) {
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
    const childInternalId = await getIssueInternalId(owner, repo, childNumber);
    if (!childInternalId) {
        logger.error(`Could not resolve internal ID for issue #${childNumber}`);
        return 1;
    }
    // REST API で子 Issue を解除
    // DELETE /repos/{owner}/{repo}/issues/{parent}/sub_issue (単数形)
    try {
        const octokit = getOctokit();
        await octokit.request("DELETE /repos/{owner}/{repo}/issues/{issue_number}/sub_issue", {
            owner,
            repo,
            issue_number: parentNumber,
            sub_issue_id: childInternalId,
        });
    }
    catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        logger.error(`Failed to remove #${childNumber} from sub-issues of #${parentNumber}: ${message}`);
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
//# sourceMappingURL=issues-sub.js.map