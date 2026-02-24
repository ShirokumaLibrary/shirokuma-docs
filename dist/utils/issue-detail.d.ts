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
import { Logger } from "./logger.js";
import { type ProjectField } from "./project-fields.js";
export declare const GRAPHQL_QUERY_ISSUE_DETAIL = "\nquery($owner: String!, $name: String!, $number: Int!) {\n  repository(owner: $owner, name: $name) {\n    issue(number: $number) {\n      number\n      title\n      body\n      url\n      state\n      issueType { name }\n      createdAt\n      updatedAt\n      labels(first: 20) {\n        nodes { name }\n      }\n      subIssuesSummary {\n        total\n        completed\n        percentCompleted\n      }\n      projectItems(first: 5) {\n        nodes {\n          id\n          project { id title }\n          status: fieldValueByName(name: \"Status\") {\n            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }\n          }\n          priority: fieldValueByName(name: \"Priority\") {\n            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }\n          }\n          size: fieldValueByName(name: \"Size\") {\n            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }\n          }\n        }\n      }\n    }\n  }\n}\n";
export interface IssueDetail {
    projectItemId?: string;
    projectId?: string;
}
export interface ResolvedProjectItem {
    projectId: string;
    projectItemId: string;
    fields: Record<string, ProjectField>;
}
export type StatusUpdateReason = "field-not-found" | "option-not-found" | "update-failed";
export type ResolutionFailReason = "no-project" | "no-item" | "no-fields";
export type FullStatusUpdateReason = StatusUpdateReason | ResolutionFailReason;
export interface UpdateProjectStatusResult {
    success: boolean;
    reason?: StatusUpdateReason;
}
export interface FullStatusUpdateResult {
    success: boolean;
    reason?: FullStatusUpdateReason;
}
/**
 * Issue の projectItemId と projectId を GraphQL で取得する
 */
export declare function getIssueDetail(owner: string, repo: string, issueNumber: number): Promise<IssueDetail | null>;
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
export declare function updateProjectStatus(options: {
    projectId: string;
    itemId: string;
    statusValue: string;
    projectFields: Record<string, ProjectField>;
    logger: Logger;
}): Promise<UpdateProjectStatusResult>;
/**
 * Issue 番号から projectId, projectItemId, fields を解決する。
 *
 * @param owner - リポジトリオーナー
 * @param repo - リポジトリ名
 * @param issueNumber - Issue 番号
 * @param logger - ロガー
 * @param projectName - プロジェクト名（省略時はリポジトリ名）
 */
export declare function resolveProjectItem(owner: string, repo: string, issueNumber: number, logger: Logger, projectName?: string): Promise<ResolvedProjectItem | null>;
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
export declare function resolveAndUpdateStatus(owner: string, repo: string, issueNumber: number, statusValue: string, logger: Logger, projectName?: string): Promise<FullStatusUpdateResult>;
//# sourceMappingURL=issue-detail.d.ts.map