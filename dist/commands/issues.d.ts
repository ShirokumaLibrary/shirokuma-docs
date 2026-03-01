/**
 * issues command - GitHub Issues management with Projects integration
 *
 * This is the main user-facing command that abstracts Issues + Projects.
 *
 * Subcommands:
 * - list: List issues (with Projects field filtering)
 * - show: Get issue details including Projects fields
 * - create: Create issue and optionally add to project with fields
 * - update: Update issue and/or project fields
 * - comment: Add comment to issue or PR
 * - comment-edit: Edit existing comment
 * - close: Close an issue (with optional comment)
 * - search: Search issues and PRs by keyword (#552)
 *
 * Key design:
 * - Issues provide: #number references, comments, PR links
 * - Projects provide: Status/Priority/Size field management
 * - This command unifies both for a seamless experience
 */
import { Logger } from "../utils/logger.js";
import { GhVariableValue } from "../utils/github.js";
import { OutputFormat } from "../utils/formatters.js";
export interface IssuesOptions {
    owner?: string;
    verbose?: boolean;
    all?: boolean;
    status?: string[];
    state?: string;
    labels?: string[];
    limit?: number;
    query?: string;
    format?: OutputFormat;
    fieldStatus?: string;
    priority?: string;
    size?: string;
    title?: string;
    bodyFile?: string;
    issueType?: string;
    addAssignee?: string;
    addLabel?: string[];
    removeLabel?: string[];
    base?: string;
    stateReason?: string;
    squash?: boolean;
    merge?: boolean;
    rebase?: boolean;
    deleteBranch?: boolean;
    checkout?: boolean;
    deleteLocal?: boolean;
    head?: string;
    skipLinkCheck?: boolean;
    replyTo?: string;
    threadId?: string;
    parent?: number;
    replaceParent?: boolean;
    public?: boolean;
    repo?: string;
    fromPublic?: string;
    syncPublic?: boolean;
    _subTarget?: string;
}
/**
 * Build GraphQL mutation variables for updateIssue.
 * When issueType is not specified, omit issueTypeId to preserve existing Type.
 */
export declare function buildUpdateIssueVariables(params: {
    issueId: string;
    title: string;
    body: string;
    issueType?: string;
    issueTypeId?: string | null;
}): Record<string, GhVariableValue>;
/**
 * Get issue GraphQL ID by number
 */
export declare function getIssueId(owner: string, repo: string, number: number): Promise<string | null>;
/**
 * Get pull request GraphQL ID by number
 */
export declare function getPullRequestId(owner: string, repo: string, number: number): Promise<string | null>;
export declare function getOrganizationIssueTypes(owner: string): Promise<Record<string, string>>;
/**
 * get subcommand
 */
declare function cmdGet(issueNumberStr: string, options: IssuesOptions, logger: Logger): Promise<number>;
/**
 * issues command handler
 */
export declare function issuesCommand(action: string, target: string | undefined, options: IssuesOptions): Promise<void>;
export { cmdGet as cmdIssueShow };
//# sourceMappingURL=issues.d.ts.map