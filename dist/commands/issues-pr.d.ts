/**
 * issues PR subcommands - Pull Request operations
 *
 * Provides PR-related functionality for the issues command:
 * - pr-create: Create a pull request via Octokit REST API
 * - pr-comments: Fetch PR review comments and threads
 * - merge: Merge a PR with configurable method
 * - pr-reply: Reply to a review comment
 * - resolve: Resolve a review thread
 * - fetchOpenPRs: Shared helper for session start
 *
 * Design:
 * - GraphQL for queries (more efficient nested data)
 * - REST API for mutations (pr-create, reply — simpler than GraphQL)
 * - Octokit REST for merge (handles edge cases reliably)
 */
import { Logger } from "../utils/logger.js";
import { OutputFormat } from "../utils/formatters.js";
export interface IssuesPrOptions {
    owner?: string;
    verbose?: boolean;
    format?: OutputFormat;
    state?: string;
    limit?: number;
    base?: string;
    title?: string;
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
    bodyFile?: string;
    public?: boolean;
    repo?: string;
}
export interface PrSummary {
    number: number;
    title: string;
    url: string;
    reviewDecision: string | null;
    reviewThreadCount: number;
    reviewCount: number;
}
/**
 * Validate that at most one merge method is specified.
 * Returns error message or null if valid.
 */
export declare function validateMergeMethod(options: {
    squash?: boolean;
    merge?: boolean;
    rebase?: boolean;
}): string | null;
/**
 * Determine the merge method from options. Defaults to "squash".
 */
export declare function parseMergeMethod(options: {
    squash?: boolean;
    merge?: boolean;
    rebase?: boolean;
}): "squash" | "merge" | "rebase";
/**
 * Parse linked issue numbers from PR body text.
 * Looks for patterns: Closes #N, Fixes #N, Resolves #N (case-insensitive).
 * Returns deduplicated array of issue numbers.
 */
export declare function parseLinkedIssues(body: string | undefined | null): number[];
export type LinkPattern = "1:1" | "1:N" | "N:1" | "N:N";
export interface LinkGraphEntry {
    issueNumber: number;
    linkedPrs: number[];
}
/**
 * Detect the PR-Issue link pattern from a mapping of issues to their linked PRs.
 * Pure function (no API calls) — exported for testing.
 *
 * @param linkedIssues - Issue numbers linked by the current PR
 * @param issueToAllPrs - Map of issue number → all PR numbers that reference it with closing keywords
 */
export declare function detectLinkPattern(linkedIssues: number[], issueToAllPrs: Map<number, number[]>): LinkPattern;
export declare function cmdPrComments(prNumberStr: string, options: IssuesPrOptions, logger: Logger): Promise<number>;
export declare function cmdMerge(prNumberStr: string | undefined, options: IssuesPrOptions, logger: Logger): Promise<number>;
export declare function cmdPrReply(prNumberStr: string, options: IssuesPrOptions, logger: Logger): Promise<number>;
export declare function cmdResolve(prNumberStr: string, options: IssuesPrOptions, logger: Logger): Promise<number>;
/**
 * ブランチ名からオープンPRの番号を解決する。
 * 見つからない場合は null を返す。
 */
export declare function resolvePrFromHead(headBranch: string, owner: string, repo: string, logger: Logger): Promise<number | null>;
/**
 * --state オプション値を GraphQL PullRequestState enum 配列に変換する。
 * 無効な値の場合は null を返す。
 */
export declare function parsePrStateFilter(state: string): ("OPEN" | "CLOSED" | "MERGED")[] | null;
export declare function fetchOpenPRs(owner: string, repo: string, limit?: number): Promise<PrSummary[]>;
export declare function cmdPrList(options: IssuesPrOptions, logger: Logger): Promise<number>;
export declare function cmdPrShow(prNumberStr: string, options: IssuesPrOptions, logger: Logger): Promise<number>;
/**
 * Create a pull request via Octokit REST API.
 *
 * Options:
 * - --base (required): Target branch (e.g., develop)
 * - --title (required): PR title
 * - --body-file (optional): Body content (already resolved by resolveBodyFileOption)
 * - --head (optional): Source branch (defaults to current git branch)
 */
export declare function cmdPrCreate(options: IssuesPrOptions, logger: Logger): Promise<number>;
//# sourceMappingURL=issues-pr.d.ts.map