/**
 * gh-issues PR subcommands - Pull Request operations
 *
 * Provides PR-related functionality for the gh-issues command:
 * - pr-comments: Fetch PR review comments and threads
 * - merge: Merge a PR with configurable method
 * - pr-reply: Reply to a review comment
 * - resolve: Resolve a review thread
 * - fetchOpenPRs: Shared helper for session start
 *
 * Design:
 * - GraphQL for queries (more efficient nested data)
 * - REST API for reply (simpler than GraphQL which requires pullRequestReviewId)
 * - gh pr merge CLI for merge (handles edge cases reliably)
 */
import { Logger } from "../utils/logger.js";
import { OutputFormat } from "../utils/formatters.js";
export interface GhIssuesPrOptions {
    owner?: string;
    verbose?: boolean;
    format?: OutputFormat;
    squash?: boolean;
    merge?: boolean;
    rebase?: boolean;
    deleteBranch?: boolean;
    head?: string;
    replyTo?: string;
    threadId?: string;
    body?: string;
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
export declare function cmdPrComments(prNumberStr: string, options: GhIssuesPrOptions, logger: Logger): Promise<number>;
export declare function cmdMerge(prNumberStr: string | undefined, options: GhIssuesPrOptions, logger: Logger): Promise<number>;
export declare function cmdPrReply(prNumberStr: string, options: GhIssuesPrOptions, logger: Logger): Promise<number>;
export declare function cmdResolve(prNumberStr: string, options: GhIssuesPrOptions, logger: Logger): Promise<number>;
/**
 * ブランチ名からオープンPRの番号を解決する。
 * 見つからない場合は null を返す。
 */
export declare function resolvePrFromHead(headBranch: string, owner: string, repo: string, logger: Logger): number | null;
export declare function fetchOpenPRs(owner: string, repo: string, limit?: number): PrSummary[];
//# sourceMappingURL=gh-issues-pr.d.ts.map