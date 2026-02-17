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

import { runGraphQL, getRepoInfo } from "./github.js";
import { Logger } from "./logger.js";
import {
  getProjectFields,
  setItemFields,
  autoSetTimestamps,
  type ProjectField,
} from "./project-fields.js";
import { getProjectId } from "../commands/projects.js";

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
      createdAt
      updatedAt
      labels(first: 20) {
        nodes { name }
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
// Types
// =============================================================================

export interface IssueDetail {
  projectItemId?: string;
  projectId?: string;
}

export interface ResolvedProjectItem {
  projectId: string;
  projectItemId: string;
  fields: Record<string, ProjectField>;
}

export type StatusUpdateReason =
  | "field-not-found"
  | "option-not-found"
  | "update-failed";

export type ResolutionFailReason =
  | "no-project"
  | "no-item"
  | "no-fields";

export type FullStatusUpdateReason = StatusUpdateReason | ResolutionFailReason;

export interface UpdateProjectStatusResult {
  success: boolean;
  reason?: StatusUpdateReason;
}

export interface FullStatusUpdateResult {
  success: boolean;
  reason?: FullStatusUpdateReason;
}

// =============================================================================
// getIssueDetail - Issue の projectItemId と projectId を取得
// =============================================================================

/**
 * Issue の projectItemId と projectId を GraphQL で取得する
 */
export function getIssueDetail(
  owner: string,
  repo: string,
  issueNumber: number
): IssueDetail | null {
  interface IssueNode {
    number?: number;
    projectItems?: {
      nodes?: Array<{
        id?: string;
        project?: { id?: string; title?: string };
      }>;
    };
  }

  interface QueryResult {
    data?: {
      repository?: {
        issue?: IssueNode;
      };
    };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_ISSUE_DETAIL, {
    owner,
    name: repo,
    number: issueNumber,
  });

  if (!result.success) return null;
  const issue = result.data?.data?.repository?.issue;
  if (!issue) return null;

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
export function updateProjectStatus(options: {
  projectId: string;
  itemId: string;
  statusValue: string;
  projectFields: Record<string, ProjectField>;
  logger: Logger;
}): UpdateProjectStatusResult {
  const { projectId, itemId, statusValue, projectFields, logger } = options;

  const count = setItemFields(
    projectId,
    itemId,
    { Status: statusValue },
    logger,
    projectFields
  );

  if (count > 0) {
    // 常に autoSetTimestamps を呼び出す（mapping なしなら silent skip）
    autoSetTimestamps(projectId, itemId, statusValue, projectFields, logger);
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
export function resolveProjectItem(
  owner: string,
  repo: string,
  issueNumber: number,
  logger: Logger,
  projectName?: string
): ResolvedProjectItem | null {
  const projectId = getProjectId(owner, projectName);
  if (!projectId) {
    logger.warn("No project found");
    return null;
  }

  const detail = getIssueDetail(owner, repo, issueNumber);
  if (!detail?.projectItemId) {
    logger.warn(`Issue #${issueNumber}: not found in project`);
    return null;
  }

  const fields = getProjectFields(projectId);
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
export function resolveAndUpdateStatus(
  owner: string,
  repo: string,
  issueNumber: number,
  statusValue: string,
  logger: Logger,
  projectName?: string
): FullStatusUpdateResult {
  const resolved = resolveProjectItem(owner, repo, issueNumber, logger, projectName);
  if (!resolved) {
    return { success: false, reason: "no-item" };
  }

  return updateProjectStatus({
    projectId: resolved.projectId,
    itemId: resolved.projectItemId,
    statusValue,
    projectFields: resolved.fields,
    logger,
  });
}
