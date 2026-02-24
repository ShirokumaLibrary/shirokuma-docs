/**
 * projects command - GitHub Projects V2 management
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
export interface ProjectsOptions {
    owner?: string;
    verbose?: boolean;
    all?: boolean;
    status?: string[];
    force?: boolean;
    format?: OutputFormat;
    fieldStatus?: string;
    priority?: string;
    size?: string;
    title?: string;
    bodyFile?: string;
}
export { getProjectId, fetchWorkflows, RECOMMENDED_WORKFLOWS, type ProjectWorkflow, } from "../utils/project-utils.js";
/**
 * 定義済みオプションと既存オプションの差分を検出する。
 * ユニットテスト可能な純粋関数。
 */
export declare function detectOptionDiff(existingNames: string[], definedNames: string[]): {
    missing: string[];
    extra: string[];
};
/**
 * projects command handler
 */
export declare function projectsCommand(action: string, target: string | undefined, options: ProjectsOptions): Promise<void>;
//# sourceMappingURL=projects.d.ts.map