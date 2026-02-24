/**
 * Issue detail resolution and Status update helpers (#676)
 *
 * GraphQL クエリ定数と Issue → Project Item 解決ロジックを集約。
 * issues.ts, issues-pr.ts, session.ts の Status 更新を共通化する。
 *
 * 3層構造:
 * - updateProjectStatus(): projectId/itemId 既知の場合（低レベル）
 * - resolveProjectItem(): issueNumber → projectId/itemId/fields を一括取得
 * - resolveAndUpdateStatus(): issueNumber → Status 更新を一発で（ファサード）
 */
import { runGraphQL } from "./github.js";
import { getProjectFields, setItemFields, autoSetTimestamps, } from "./project-fields.js";
import { getProjectId } from "./project-utils.js";
// =============================================================================
// GraphQL Query
// =============================================================================
export const GRAPHQL_QUERY_ISSUE_DETAIL = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      number
      title
      body
      url
      state
      issueType { name }
      createdAt
      updatedAt
      labels(first: 20) {
        nodes { name }
      }
      subIssuesSummary {
        total
        completed
        percentCompleted
      }
      projectItems(first: 5) {
        nodes {
          id
          project { id title }
          status: fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
          }
          priority: fieldValueByName(name: "Priority") {
            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
          }
          size: fieldValueByName(name: "Size") {
            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
          }
        }
      }
    }
  }
}
`;
// =============================================================================
// getIssueDetail - Issue の projectItemId と projectId を取得
// =============================================================================
/**
 * Issue の projectItemId と projectId を GraphQL で取得する
 */
export async function getIssueDetail(owner, repo, issueNumber) {
    const result = await runGraphQL(GRAPHQL_QUERY_ISSUE_DETAIL, {
        owner,
        name: repo,
        number: issueNumber,
    });
    if (!result.success)
        return null;
    const issue = result.data?.data?.repository?.issue;
    if (!issue)
        return null;
    // Match by project name convention, fallback to first item
    const projectItems = issue.projectItems?.nodes ?? [];
    const projectItem = projectItems.find((p) => p?.project?.title === repo) ?? projectItems[0];
    return {
        projectItemId: projectItem?.id,
        projectId: projectItem?.project?.id,
    };
}
// =============================================================================
// updateProjectStatus - 低レベル: projectId/itemId 既知の場合
// =============================================================================
/**
 * projectId/itemId が既知の場合に Status を更新する。
 * autoSetTimestamps も一貫して呼び出す。
 *
 * @param options.projectId - Project の GraphQL ID
 * @param options.itemId - Project Item の GraphQL ID
 * @param options.statusValue - 設定する Status 値
 * @param options.projectFields - キャッシュ済みフィールド定義
 * @param options.logger - ロガー
 */
export async function updateProjectStatus(options) {
    const { projectId, itemId, statusValue, projectFields, logger } = options;
    const count = await setItemFields(projectId, itemId, { Status: statusValue }, logger, projectFields);
    if (count > 0) {
        // 常に autoSetTimestamps を呼び出す（mapping なしなら silent skip）
        await autoSetTimestamps(projectId, itemId, statusValue, projectFields, logger);
        return { success: true };
    }
    return { success: false, reason: "update-failed" };
}
// =============================================================================
// resolveProjectItem - issueNumber → projectId/itemId/fields を一括取得
// =============================================================================
/**
 * Issue 番号から projectId, projectItemId, fields を解決する。
 *
 * @param owner - リポジトリオーナー
 * @param repo - リポジトリ名
 * @param issueNumber - Issue 番号
 * @param logger - ロガー
 * @param projectName - プロジェクト名（省略時はリポジトリ名）
 */
export async function resolveProjectItem(owner, repo, issueNumber, logger, projectName) {
    const projectId = await getProjectId(owner, projectName);
    if (!projectId) {
        logger.warn("No project found");
        return null;
    }
    const detail = await getIssueDetail(owner, repo, issueNumber);
    if (!detail?.projectItemId) {
        logger.warn(`Issue #${issueNumber}: not found in project`);
        return null;
    }
    const fields = await getProjectFields(projectId);
    return {
        projectId,
        projectItemId: detail.projectItemId,
        fields,
    };
}
// =============================================================================
// resolveAndUpdateStatus - ファサード: issueNumber → Status 更新を一発で
// =============================================================================
/**
 * Issue 番号から Status を解決・更新する。
 * projectId/itemId 未知の場合のファサード。
 *
 * @param owner - リポジトリオーナー
 * @param repo - リポジトリ名
 * @param issueNumber - Issue 番号
 * @param statusValue - 設定する Status 値
 * @param logger - ロガー
 * @param projectName - プロジェクト名（省略時はリポジトリ名）
 */
export async function resolveAndUpdateStatus(owner, repo, issueNumber, statusValue, logger, projectName) {
    const resolved = await resolveProjectItem(owner, repo, issueNumber, logger, projectName);
    if (!resolved) {
        return { success: false, reason: "no-item" };
    }
    return await updateProjectStatus({
        projectId: resolved.projectId,
        itemId: resolved.projectItemId,
        statusValue,
        projectFields: resolved.fields,
        logger,
    });
}
//# sourceMappingURL=issue-detail.js.map