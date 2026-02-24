/**
 * gh-projects command - GitHub Projects V2 management
 *
 * Subcommands:
 * - list: List project items (excludes Done/Released by default)
 * - get: Get item details by ID or issue number
 * - fields: Show available field options
 * - create: Create a new draft issue in the project
 * - update: Update item fields
 * - delete: Delete item from project
 * - add-issue: Add existing issue to project
 *
 * Project naming convention: Project name = Repository name
 */
import { OutputFormat } from "../utils/formatters.js";
export interface GhProjectsOptions {
    owner?: string;
    verbose?: boolean;
    all?: boolean;
    status?: string[];
    force?: boolean;
    format?: OutputFormat;
    fieldStatus?: string;
    priority?: string;
    type?: string;
    size?: string;
    title?: string;
    body?: string;
}
/** ワークフロー情報 */
export interface ProjectWorkflow {
    id: string;
    name: string;
    number: number;
    enabled: boolean;
}
/** #250 推奨ワークフロー: 有効にすべき自動化 */
export declare const RECOMMENDED_WORKFLOWS: string[];
/**
 * Get project ID by name (defaults to repository name)
 */
export declare function getProjectId(owner: string, projectName?: string): string | null;
/**
 * プロジェクトのワークフロー一覧を取得する。
 * GitHub Projects V2 のビルトイン自動化を確認するために使用。
 *
 * @returns ワークフロー配列。取得失敗時は空配列
 */
export declare function fetchWorkflows(projectId: string): ProjectWorkflow[];
/**
 * gh-projects command handler
 */
export declare function ghProjectsCommand(action: string, target: string | undefined, options: GhProjectsOptions): Promise<void>;
//# sourceMappingURL=gh-projects.d.ts.map