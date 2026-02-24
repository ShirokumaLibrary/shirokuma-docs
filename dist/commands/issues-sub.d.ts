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
export interface IssuesSubOptions {
    owner?: string;
    verbose?: boolean;
    replaceParent?: boolean;
    public?: boolean;
    repo?: string;
}
/**
 * Issue 番号から GitHub 内部 ID（REST API の id フィールド）を取得する。
 * Sub-Issues REST API の sub_issue_id パラメータに必要。
 */
export declare function getIssueInternalId(owner: string, repo: string, issueNumber: number, _options?: {
    silent?: boolean;
}): Promise<number | null>;
export declare function cmdSubList(parentNumberStr: string, options: IssuesSubOptions, logger: Logger): Promise<number>;
export declare function cmdSubAdd(parentNumberStr: string, childNumberStr: string | undefined, options: IssuesSubOptions, logger: Logger): Promise<number>;
export declare function cmdSubRemove(parentNumberStr: string, childNumberStr: string | undefined, options: IssuesSubOptions, logger: Logger): Promise<number>;
//# sourceMappingURL=issues-sub.d.ts.map