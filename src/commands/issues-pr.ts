/**
 * issues PR subcommands - Pull Request operations
 *
 * Provides PR-related functionality for the issues command:
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
import {
  runGhCommand,
  runGhCommandRaw,
  runGraphQL,
  isIssueNumber,
  parseIssueNumber,
  validateBody,
} from "../utils/github.js";
import { OutputFormat, formatOutput } from "../utils/formatters.js";
import {
  resolveTargetRepo,
} from "../utils/repo-pairs.js";
import {
  getProjectId,
  setItemFields,
  cmdGetIssueDetail,
} from "./issues.js";

// =============================================================================
// Types
// =============================================================================

export interface IssuesPrOptions {
  owner?: string;
  verbose?: boolean;
  format?: OutputFormat;
  // merge options
  squash?: boolean;
  merge?: boolean;
  rebase?: boolean;
  deleteBranch?: boolean;
  head?: string;
  // reply/resolve options
  replyTo?: string;
  threadId?: string;
  body?: string;
  // repo pair flags (pass through)
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

// =============================================================================
// Pure validation functions (exported for testing)
// =============================================================================

/**
 * Validate that at most one merge method is specified.
 * Returns error message or null if valid.
 */
export function validateMergeMethod(options: {
  squash?: boolean;
  merge?: boolean;
  rebase?: boolean;
}): string | null {
  const methods = [options.squash, options.merge, options.rebase].filter(Boolean);
  if (methods.length > 1) {
    return "Only one merge method can be specified (--squash, --merge, or --rebase)";
  }
  return null;
}

/**
 * Determine the merge method from options. Defaults to "squash".
 */
export function parseMergeMethod(options: {
  squash?: boolean;
  merge?: boolean;
  rebase?: boolean;
}): "squash" | "merge" | "rebase" {
  if (options.merge) return "merge";
  if (options.rebase) return "rebase";
  return "squash";
}

/**
 * Parse linked issue numbers from PR body text.
 * Looks for patterns: Closes #N, Fixes #N, Resolves #N (case-insensitive).
 * Returns deduplicated array of issue numbers.
 */
export function parseLinkedIssues(body: string | undefined | null): number[] {
  if (!body) return [];

  const pattern = /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)/gi;
  const numbers = new Set<number>();

  let match;
  while ((match = pattern.exec(body)) !== null) {
    numbers.add(parseInt(match[1], 10));
  }

  return [...numbers];
}

// =============================================================================
// GraphQL Queries
// =============================================================================

const GRAPHQL_QUERY_PR_REVIEW_THREADS = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      title
      state
      body
      reviewDecision
      reviews(first: 50) {
        nodes {
          author { login }
          state
          body
        }
      }
      reviewThreads(first: 50) {
        nodes {
          id
          isResolved
          isOutdated
          comments(first: 20) {
            nodes {
              id
              databaseId
              body
              path
              line
              author { login }
              createdAt
            }
          }
        }
      }
    }
  }
}
`;

const GRAPHQL_QUERY_OPEN_PRS = `
query($owner: String!, $name: String!, $first: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequests(first: $first, states: [OPEN], orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        number
        title
        url
        reviewDecision
        reviewThreads(first: 0) { totalCount }
        reviews(first: 0) { totalCount }
      }
    }
  }
}
`;

const GRAPHQL_MUTATION_RESOLVE_THREAD = `
mutation($threadId: ID!) {
  resolveReviewThread(input: {threadId: $threadId}) {
    thread { id isResolved }
  }
}
`;

// =============================================================================
// cmdPrComments (#44)
// =============================================================================

export async function cmdPrComments(
  prNumberStr: string,
  options: IssuesPrOptions,
  logger: Logger
): Promise<number> {
  if (!isIssueNumber(prNumberStr)) {
    logger.error(`Invalid PR number: ${prNumberStr}`);
    return 1;
  }

  const repoInfo = resolveTargetRepo(options);
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner, name: repo } = repoInfo;
  const prNumber = parseIssueNumber(prNumberStr);

  interface ReviewNode {
    author?: { login?: string };
    state?: string;
    body?: string;
  }

  interface CommentNode {
    id?: string;
    databaseId?: number;
    body?: string;
    path?: string | null;
    line?: number | null;
    author?: { login?: string };
    createdAt?: string;
  }

  interface ThreadNode {
    id?: string;
    isResolved?: boolean;
    isOutdated?: boolean;
    comments?: { nodes?: CommentNode[] };
  }

  interface QueryResult {
    data?: {
      repository?: {
        pullRequest?: {
          title?: string;
          state?: string;
          body?: string;
          reviewDecision?: string | null;
          reviews?: { nodes?: ReviewNode[] };
          reviewThreads?: { nodes?: ThreadNode[] };
        };
      };
    };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_PR_REVIEW_THREADS, {
    owner,
    name: repo,
    number: prNumber,
  });

  if (!result.success) {
    logger.error(`Failed to fetch PR #${prNumber}: ${result.error}`);
    return 1;
  }

  const pr = result.data?.data?.repository?.pullRequest;
  if (!pr) {
    logger.error(`PR #${prNumber} not found`);
    return 1;
  }

  // Transform reviews
  const reviews = (pr.reviews?.nodes ?? []).map((r: ReviewNode) => ({
    author: r.author?.login ?? "unknown",
    state: r.state ?? "UNKNOWN",
    body: r.body ?? "",
  }));

  // Transform threads
  const threads = (pr.reviewThreads?.nodes ?? []).map((t: ThreadNode) => {
    const comments = (t.comments?.nodes ?? []).map((c: CommentNode) => ({
      id: c.id ?? "",
      database_id: c.databaseId ?? 0,
      author: c.author?.login ?? "unknown",
      body: c.body ?? "",
      created_at: c.createdAt ?? "",
    }));

    const firstComment = t.comments?.nodes?.[0];
    return {
      id: t.id ?? "",
      is_resolved: t.isResolved ?? false,
      is_outdated: t.isOutdated ?? false,
      file: firstComment?.path ?? null,
      line: firstComment?.line ?? null,
      comments,
    };
  });

  const unresolvedCount = threads.filter((t) => !t.is_resolved).length;

  const output = {
    pr_number: prNumber,
    title: pr.title ?? "",
    state: pr.state ?? "UNKNOWN",
    review_decision: pr.reviewDecision ?? null,
    reviews,
    threads,
    total_threads: threads.length,
    unresolved_threads: unresolvedCount,
  };

  const outputFormat = options.format ?? "json";
  const formatted = formatOutput(output, outputFormat, {
    arrayKey: "threads",
  });
  console.log(formatted);
  return 0;
}

// =============================================================================
// cmdMerge (#47)
// =============================================================================

export async function cmdMerge(
  prNumberStr: string | undefined,
  options: IssuesPrOptions,
  logger: Logger
): Promise<number> {
  // Validate merge method exclusivity
  const mergeError = validateMergeMethod(options);
  if (mergeError) {
    logger.error(mergeError);
    return 1;
  }

  const repoInfo = resolveTargetRepo(options);
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner, name: repo } = repoInfo;

  // PR番号の解決: 直接指定 or --head からブランチベースで特定
  let prNumber: number;

  if (prNumberStr && isIssueNumber(prNumberStr)) {
    prNumber = parseIssueNumber(prNumberStr);
  } else if (options.head) {
    const resolved = resolvePrFromHead(options.head, owner, repo, logger);
    if (resolved === null) return 1;
    prNumber = resolved;
  } else {
    logger.error("PR number or --head <branch> is required");
    logger.info(
      "Usage: shirokuma-docs issues merge <number> [--squash|--merge|--rebase]\n" +
      "       shirokuma-docs issues merge --head <branch>"
    );
    return 1;
  }
  const mergeMethod = parseMergeMethod(options);
  const deleteBranch = options.deleteBranch !== false; // default true

  // Fetch PR body BEFORE merge to find linked issues (C2: post-merge fetch is fragile)
  const prBodyResult = runGhCommand<{ body?: string }>(
    ["pr", "view", String(prNumber), "--json", "body", "--repo", `${owner}/${repo}`],
    { silent: true }
  );
  const linkedNumbers = prBodyResult.success
    ? parseLinkedIssues(prBodyResult.data?.body)
    : [];

  // Build gh pr merge command
  const mergeArgs = [
    "pr", "merge", String(prNumber),
    `--${mergeMethod}`,
    "--repo", `${owner}/${repo}`,
  ];

  if (deleteBranch) {
    mergeArgs.push("--delete-branch");
  }

  logger.debug(`Merging PR #${prNumber} with ${mergeMethod} method`);

  const mergeResult = runGhCommandRaw(mergeArgs);
  if (!mergeResult.success) {
    logger.error(`Failed to merge PR #${prNumber}: ${mergeResult.error}`);
    return 1;
  }

  logger.success(`Merged PR #${prNumber} (${mergeMethod})`);

  // Try to update linked issues to Done (best-effort)
  const linkedIssuesUpdated: Array<{ number: number; status: string }> = [];

  if (linkedNumbers.length > 0) {
    const projectId = getProjectId(owner, repo);
    if (projectId) {
      for (const num of linkedNumbers) {
        // GraphQL で projectItemId を取得（gh CLI の projectItems には id がないため）
        const detail = cmdGetIssueDetail(owner, repo, num);
        if (!detail?.projectItemId) continue;

        const fieldResult = setItemFields(
          projectId,
          detail.projectItemId,
          { Status: "Done" },
          logger
        );

        if (fieldResult > 0) {
          linkedIssuesUpdated.push({ number: num, status: "Done" });
          logger.success(`Issue #${num} → Done`);
        }
      }
    }
  }

  const output = {
    pr_number: prNumber,
    merged: true,
    merge_method: mergeMethod,
    branch_deleted: deleteBranch,
    linked_issues_updated: linkedIssuesUpdated,
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

// =============================================================================
// cmdPrReply (#46)
// =============================================================================

export async function cmdPrReply(
  prNumberStr: string,
  options: IssuesPrOptions,
  logger: Logger
): Promise<number> {
  if (!isIssueNumber(prNumberStr)) {
    logger.error(`Invalid PR number: ${prNumberStr}`);
    return 1;
  }

  if (!options.replyTo) {
    logger.error("--reply-to is required (comment database ID)");
    return 1;
  }

  // H1: Validate reply-to as numeric database ID
  if (!/^\d+$/.test(options.replyTo)) {
    logger.error(`Invalid --reply-to value: ${options.replyTo} (must be a numeric comment database ID)`);
    return 1;
  }

  if (!options.body) {
    logger.error("--body is required for pr-reply");
    return 1;
  }

  // H2: Validate body length
  const bodyError = validateBody(options.body);
  if (bodyError) {
    logger.error(bodyError);
    return 1;
  }

  const repoInfo = resolveTargetRepo(options);
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner, name: repo } = repoInfo;
  const prNumber = parseIssueNumber(prNumberStr);
  const commentId = options.replyTo;

  // Use REST API to reply (simpler than GraphQL which requires pullRequestReviewId)
  interface ReplyResult {
    id?: number;
    html_url?: string;
  }

  const result = runGhCommand<ReplyResult>([
    "api",
    `repos/${owner}/${repo}/pulls/${prNumber}/comments/${commentId}/replies`,
    "-f", `body=${options.body}`,
  ]);

  if (!result.success) {
    logger.error(`Failed to reply to comment: ${result.error}`);
    return 1;
  }

  logger.success(`Replied to comment #${commentId} on PR #${prNumber}`);

  const output = {
    pr_number: prNumber,
    reply_to: Number(commentId),
    comment_id: result.data?.id ?? null,
    comment_url: result.data?.html_url ?? null,
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

// =============================================================================
// cmdResolve (#46)
// =============================================================================

export async function cmdResolve(
  prNumberStr: string,
  options: IssuesPrOptions,
  logger: Logger
): Promise<number> {
  if (!isIssueNumber(prNumberStr)) {
    logger.error(`Invalid PR number: ${prNumberStr}`);
    return 1;
  }

  if (!options.threadId) {
    logger.error("--thread-id is required (GraphQL thread node ID)");
    return 1;
  }

  // M4: Basic format validation for GraphQL node ID
  if (options.threadId.length < 4 || /\s/.test(options.threadId)) {
    logger.error(`Invalid --thread-id format: ${options.threadId}`);
    return 1;
  }

  const prNumber = parseIssueNumber(prNumberStr);

  interface ResolveResult {
    data?: {
      resolveReviewThread?: {
        thread?: { id?: string; isResolved?: boolean };
      };
    };
  }

  const result = runGraphQL<ResolveResult>(GRAPHQL_MUTATION_RESOLVE_THREAD, {
    threadId: options.threadId,
  });

  if (!result.success) {
    logger.error(`Failed to resolve thread: ${result.error}`);
    return 1;
  }

  const resolved = result.data?.data?.resolveReviewThread?.thread?.isResolved ?? false;

  if (resolved) {
    logger.success(`Resolved thread ${options.threadId} on PR #${prNumber}`);
  } else {
    logger.warn(`Thread resolve request completed but thread may not be resolved`);
  }

  const output = {
    pr_number: prNumber,
    thread_id: options.threadId,
    resolved,
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

// =============================================================================
// resolvePrFromHead - ブランチ名からPR番号を解決
// =============================================================================

/**
 * ブランチ名からオープンPRの番号を解決する。
 * 見つからない場合は null を返す。
 */
export function resolvePrFromHead(
  headBranch: string,
  owner: string,
  repo: string,
  logger: Logger
): number | null {
  interface PrListItem {
    number?: number;
    url?: string;
  }

  const result = runGhCommand<PrListItem[]>(
    ["pr", "list", "--head", headBranch, "--json", "number,url", "--repo", `${owner}/${repo}`],
    { silent: true }
  );

  if (!result.success || !result.data || result.data.length === 0) {
    logger.error(`No open PR found for branch "${headBranch}"`);
    return null;
  }

  const prNumber = result.data[0].number;
  if (!prNumber) {
    logger.error(`Could not extract PR number for branch "${headBranch}"`);
    return null;
  }

  logger.debug(`Resolved branch "${headBranch}" → PR #${prNumber}`);
  return prNumber;
}

// =============================================================================
// fetchOpenPRs (#45 - shared helper for session start)
// =============================================================================

export function fetchOpenPRs(
  owner: string,
  repo: string,
  limit: number = 10
): PrSummary[] {
  interface PrNode {
    number?: number;
    title?: string;
    url?: string;
    reviewDecision?: string | null;
    reviewThreads?: { totalCount?: number };
    reviews?: { totalCount?: number };
  }

  interface QueryResult {
    data?: {
      repository?: {
        pullRequests?: {
          nodes?: PrNode[];
        };
      };
    };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_OPEN_PRS, {
    owner,
    name: repo,
    first: limit,
  });

  if (!result.success) return [];

  const nodes = result.data?.data?.repository?.pullRequests?.nodes ?? [];

  return nodes
    .filter((n): n is PrNode & { number: number } => !!n?.number)
    .map((n) => ({
      number: n.number,
      title: n.title ?? "",
      url: n.url ?? "",
      reviewDecision: n.reviewDecision ?? null,
      reviewThreadCount: n.reviewThreads?.totalCount ?? 0,
      reviewCount: n.reviews?.totalCount ?? 0,
    }));
}
