/**
 * gh-issues command - GitHub Issues management with Projects integration
 *
 * This is the main user-facing command that abstracts Issues + Projects.
 *
 * Subcommands:
 * - list: List issues (with Projects field filtering)
 * - get: Get issue details including Projects fields
 * - create: Create issue and optionally add to project with fields
 * - update: Update issue and/or project fields
 * - comment: Add comment to issue
 * - close: Close an issue (with optional comment)
 *
 * Key design:
 * - Issues provide: #number references, comments, PR links
 * - Projects provide: Status/Priority/Type/Size field management
 * - This command unifies both for a seamless experience
 */
import { Logger } from "../utils/logger.js";
import { OutputFormat } from "../utils/formatters.js";
export interface GhIssuesOptions {
    owner?: string;
    verbose?: boolean;
    all?: boolean;
    status?: string[];
    state?: string;
    labels?: string[];
    limit?: number;
    format?: OutputFormat;
    fieldStatus?: string;
    priority?: string;
    type?: string;
    size?: string;
    title?: string;
    body?: string;
    addLabel?: string[];
    removeLabel?: string[];
    stateReason?: string;
    squash?: boolean;
    merge?: boolean;
    rebase?: boolean;
    deleteBranch?: boolean;
    head?: string;
    replyTo?: string;
    threadId?: string;
    public?: boolean;
    repo?: string;
    fromPublic?: string;
    syncPublic?: boolean;
}
export declare const FIELD_FALLBACKS: Record<string, string[]>;
/**
 * Resolve a field name against project fields, trying fallbacks if needed.
 * Returns the actual field name found in the project, or null.
 */
export declare function resolveFieldName(fieldName: string, projectFields: Record<string, {
    id: string;
    options: Record<string, string>;
}>): string | null;
/**
 * Get project ID by name (defaults to repository name)
 */
export declare function getProjectId(owner: string, projectName?: string): string | null;
/**
 * Get issue GraphQL ID by number
 */
export declare function getIssueId(owner: string, repo: string, number: number): string | null;
/**
 * Get project field definitions
 */
export declare function getProjectFields(projectId: string): Record<string, {
    id: string;
    options: Record<string, string>;
}>;
/**
 * Set multiple project fields on an item
 */
export declare function setItemFields(projectId: string, itemId: string, fields: Record<string, string>, logger?: Logger): number;
/**
 * Issue の projectItemId と projectId を GraphQL で取得する
 */
export declare function cmdGetIssueDetail(owner: string, repo: string, issueNumber: number): {
    projectItemId?: string;
    projectId?: string;
} | null;
/**
 * gh-issues command handler
 */
export declare function ghIssuesCommand(action: string, target: string | undefined, options: GhIssuesOptions): Promise<void>;
//# sourceMappingURL=gh-issues.d.ts.map