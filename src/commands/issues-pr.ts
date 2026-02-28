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
import {
  runGraphQL,
  isIssueNumber,
  parseIssueNumber,
  validateBody,
} from "../utils/github.js";
import { getOctokit } from "../utils/octokit-client.js";
import { OutputFormat, formatOutput, GH_PR_LIST_COLUMNS } from "../utils/formatters.js";
import {
  resolveTargetRepo,
} from "../utils/repo-pairs.js";
import { resolveAndUpdateStatus } from "../utils/issue-detail.js";
import { getCurrentBranch } from "../utils/git-local.js";
import { execFileAsync } from "../utils/spawn-async.js";

// =============================================================================
// Types
// =============================================================================

export interface IssuesPrOptions {
  owner?: string;
  verbose?: boolean;
  format?: OutputFormat;
  // list/show options (#568)
  state?: string;
  limit?: number;
  // pr-create options (#986)
  base?: string;
  title?: string;
  // merge options
  squash?: boolean;
  merge?: boolean;
  rebase?: boolean;
  deleteBranch?: boolean;
  checkout?: boolean;
  deleteLocal?: boolean;
  head?: string;
  skipLinkCheck?: boolean;
  // reply/resolve options
  replyTo?: string;
  threadId?: string;
  bodyFile?: string;
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
// PR-Issue Link Graph (#965)
// =============================================================================

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
export function detectLinkPattern(
  linkedIssues: number[],
  issueToAllPrs: Map<number, number[]>
): LinkPattern {
  if (linkedIssues.length === 0) return "1:1";

  const allPrs = new Set<number>();
  for (const prs of issueToAllPrs.values()) {
    for (const pr of prs) allPrs.add(pr);
  }

  const multipleIssues = linkedIssues.length > 1;
  const multiplePrs = allPrs.size > 1;

  if (!multipleIssues && !multiplePrs) return "1:1";
  if (multipleIssues && !multiplePrs) return "1:N";
  if (!multipleIssues && multiplePrs) return "N:1";
  return "N:N";
}

/**
 * Build a link graph for the given PR by searching for other open PRs
 * that also reference the same issues with closing keywords.
 *
 * Uses GitHub Search API to find open PRs mentioning each issue,
 * then verifies with parseLinkedIssues for precision.
 */
async function buildLinkGraph(
  owner: string,
  repo: string,
  currentPr: number,
  linkedIssues: number[],
  logger: Logger
): Promise<{ pattern: LinkPattern; entries: LinkGraphEntry[] }> {
  const octokit = getOctokit();
  const issueToAllPrs = new Map<number, number[]>();

  for (const issueNum of linkedIssues) {
    try {
      const { data } = await octokit.rest.search.issuesAndPullRequests({
        q: `repo:${owner}/${repo} is:pr is:open "#${issueNum}"`,
        per_page: 30,
      });

      // Filter: only PRs that actually have closing keywords for this issue
      const prs = data.items
        .filter((item) => {
          const linked = parseLinkedIssues(item.body ?? undefined);
          return linked.includes(issueNum);
        })
        .map((item) => item.number);

      // Ensure current PR is included (it may already be in search results)
      if (!prs.includes(currentPr)) {
        prs.push(currentPr);
      }

      issueToAllPrs.set(issueNum, prs);
    } catch {
      // Best-effort: if search fails, assume only this PR
      logger.debug(`Search failed for issue #${issueNum}, assuming single PR`);
      issueToAllPrs.set(issueNum, [currentPr]);
    }
  }

  const pattern = detectLinkPattern(linkedIssues, issueToAllPrs);
  const entries: LinkGraphEntry[] = [...issueToAllPrs.entries()].map(
    ([issueNumber, linkedPrs]) => ({ issueNumber, linkedPrs })
  );

  return { pattern, entries };
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

// PR 一覧取得クエリ（#568 — pr-list + fetchOpenPRs 共通）
const GRAPHQL_QUERY_PR_LIST = `
query($owner: String!, $name: String!, $first: Int!, $states: [PullRequestState!]) {
  repository(owner: $owner, name: $name) {
    pullRequests(first: $first, states: $states, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        number
        title
        state
        url
        headRefName
        baseRefName
        author { login }
        reviewDecision
        reviewThreads(first: 0) { totalCount }
        reviews(first: 0) { totalCount }
      }
    }
  }
}
`;

// PR 詳細取得クエリ（#568 — pr-show）
const GRAPHQL_QUERY_PR_SHOW = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      number
      title
      state
      url
      body
      headRefName
      baseRefName
      author { login }
      reviewDecision
      reviewThreads(first: 0) { totalCount }
      reviews(first: 0) { totalCount }
      labels(first: 20) { nodes { name } }
      createdAt
      updatedAt
      additions
      deletions
      changedFiles
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

  const result = await runGraphQL<QueryResult>(GRAPHQL_QUERY_PR_REVIEW_THREADS, {
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
    const resolved = await resolvePrFromHead(options.head, owner, repo, logger);
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

  // Fetch PR body + head ref + base ref BEFORE merge (C2: post-merge fetch is fragile)
  const octokit = getOctokit();
  let linkedNumbers: number[] = [];
  let headRef: string | undefined;
  let baseBranch: string | undefined;

  try {
    const { data: prData } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });
    linkedNumbers = parseLinkedIssues(prData.body ?? undefined);
    headRef = prData.head.ref;
    baseBranch = prData.base.ref;
  } catch {
    // Best-effort: if we can't get body, still try to merge
  }

  // Link graph validation (#965): detect N:N before merging
  if (linkedNumbers.length > 0 && !options.skipLinkCheck) {
    const { pattern, entries } = await buildLinkGraph(
      owner,
      repo,
      prNumber,
      linkedNumbers,
      logger
    );

    if (pattern === "N:N") {
      const output = {
        error: "N:N link graph detected",
        pattern: "N:N",
        pr_number: prNumber,
        linked_issues: linkedNumbers,
        link_graph: entries,
        message:
          "Complex PR-Issue relationship detected. " +
          "Review the link graph and update issue statuses individually using " +
          "'shirokuma-docs issues update <number> --field-status Done'. " +
          "To merge without link check, use --skip-link-check.",
      };

      console.log(JSON.stringify(output, null, 2));
      logger.error("N:N link graph detected - merge aborted");
      return 1;
    }

    logger.debug(`Link pattern: ${pattern}`);
  }

  logger.debug(`Merging PR #${prNumber} with ${mergeMethod} method`);

  // Merge PR
  try {
    await octokit.rest.pulls.merge({
      owner,
      repo,
      pull_number: prNumber,
      merge_method: mergeMethod,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to merge PR #${prNumber}: ${errorMsg}`);
    return 1;
  }

  // Delete branch (best-effort)
  if (deleteBranch && headRef) {
    try {
      await octokit.rest.git.deleteRef({
        owner,
        repo,
        ref: `heads/${headRef}`,
      });
    } catch {
      logger.warn(`Branch deletion failed for '${headRef}' (may be from a fork)`);
    }
  }

  logger.success(`Merged PR #${prNumber} (${mergeMethod})`);

  // Try to update linked issues to Done + autoSetTimestamps (best-effort, #676)
  const linkedIssuesUpdated: Array<{ number: number; status: string }> = [];

  if (linkedNumbers.length > 0) {
    for (const num of linkedNumbers) {
      const result = await resolveAndUpdateStatus(owner, repo, num, "Done", logger);
      if (result.success) {
        linkedIssuesUpdated.push({ number: num, status: "Done" });
        logger.success(`Issue #${num} → Done`);
      }
    }
  }

  // Post-merge local git operations (best-effort)
  let checkedOut = false;
  let pulled = false;
  let localBranchDeleted = false;

  if (options.checkout !== false && baseBranch) {
    try {
      await execFileAsync("git", ["checkout", baseBranch]);
      checkedOut = true;
      logger.success(`Checked out ${baseBranch}`);
    } catch {
      logger.warn(`Failed to checkout ${baseBranch} (uncommitted changes may exist)`);
    }

    if (checkedOut) {
      try {
        await execFileAsync("git", ["pull", "origin", baseBranch]);
        pulled = true;
      } catch {
        logger.warn(`Failed to pull origin/${baseBranch} (network issue?)`);
      }
    }

    if (options.deleteLocal && headRef) {
      try {
        await execFileAsync("git", ["branch", "-d", headRef]);
        localBranchDeleted = true;
        logger.success(`Deleted local branch ${headRef}`);
      } catch {
        logger.warn(`Failed to delete local branch '${headRef}'. Try: git branch -D ${headRef}`);
      }
    }
  }

  const output = {
    pr_number: prNumber,
    merged: true,
    merge_method: mergeMethod,
    branch_deleted: deleteBranch,
    linked_issues_updated: linkedIssuesUpdated,
    checked_out: checkedOut,
    pulled,
    local_branch_deleted: localBranchDeleted,
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

  if (!options.bodyFile) {
    logger.error("--body-file is required for pr-reply");
    return 1;
  }

  // H2: Validate body length
  const bodyError = validateBody(options.bodyFile);
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
  let replyId: number | null = null;
  let replyUrl: string | null = null;

  try {
    const octokit = getOctokit();
    const { data } = await octokit.request(
      "POST /repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies",
      {
        owner,
        repo,
        pull_number: prNumber,
        comment_id: Number(commentId),
        body: options.bodyFile,
      }
    );
    replyId = data.id ?? null;
    replyUrl = data.html_url ?? null;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to reply to comment: ${errorMsg}`);
    return 1;
  }

  logger.success(`Replied to comment #${commentId} on PR #${prNumber}`);

  const output = {
    pr_number: prNumber,
    reply_to: Number(commentId),
    comment_id: replyId,
    comment_url: replyUrl,
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

  const result = await runGraphQL<ResolveResult>(GRAPHQL_MUTATION_RESOLVE_THREAD, {
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
export async function resolvePrFromHead(
  headBranch: string,
  owner: string,
  repo: string,
  logger: Logger
): Promise<number | null> {
  try {
    const octokit = getOctokit();
    const { data } = await octokit.rest.pulls.list({
      owner,
      repo,
      head: `${owner}:${headBranch}`,
      state: "open",
    });

    if (data.length === 0) {
      logger.error(`No open PR found for branch "${headBranch}"`);
      return null;
    }

    const prNumber = data[0].number;
    logger.debug(`Resolved branch "${headBranch}" → PR #${prNumber}`);
    return prNumber;
  } catch {
    logger.error(`No open PR found for branch "${headBranch}"`);
    return null;
  }
}

// =============================================================================
// PR 一覧の共通型（#568 — pr-list / fetchOpenPRs 共用）
// =============================================================================

interface PrListNode {
  number?: number;
  title?: string;
  state?: string;
  url?: string;
  headRefName?: string;
  baseRefName?: string;
  author?: { login?: string };
  reviewDecision?: string | null;
  reviewThreads?: { totalCount?: number };
  reviews?: { totalCount?: number };
}

interface PrListQueryResult {
  data?: {
    repository?: {
      pullRequests?: {
        nodes?: PrListNode[];
      };
    };
  };
}

// =============================================================================
// parsePrStateFilter (#568 — --state オプションの GraphQL enum 変換)
// =============================================================================

/**
 * --state オプション値を GraphQL PullRequestState enum 配列に変換する。
 * 無効な値の場合は null を返す。
 */
export function parsePrStateFilter(
  state: string
): ("OPEN" | "CLOSED" | "MERGED")[] | null {
  switch (state.toLowerCase()) {
    case "open":
      return ["OPEN"];
    case "closed":
      return ["CLOSED"];
    case "merged":
      return ["MERGED"];
    case "all":
      return ["OPEN", "CLOSED", "MERGED"];
    default:
      return null;
  }
}

// =============================================================================
// fetchOpenPRs (#45 - shared helper for session start)
// =============================================================================

export async function fetchOpenPRs(
  owner: string,
  repo: string,
  limit: number = 10
): Promise<PrSummary[]> {
  const result = await runGraphQL<PrListQueryResult>(GRAPHQL_QUERY_PR_LIST, {
    owner,
    name: repo,
    first: limit,
    states: ["OPEN"],
  });

  if (!result.success) return [];

  const nodes = result.data?.data?.repository?.pullRequests?.nodes ?? [];

  return nodes
    .filter((n): n is PrListNode & { number: number } => !!n?.number)
    .map((n) => ({
      number: n.number,
      title: n.title ?? "",
      url: n.url ?? "",
      reviewDecision: n.reviewDecision ?? null,
      reviewThreadCount: n.reviewThreads?.totalCount ?? 0,
      reviewCount: n.reviews?.totalCount ?? 0,
    }));
}

// =============================================================================
// cmdPrList (#568 — PR 一覧表示)
// =============================================================================

export async function cmdPrList(
  options: IssuesPrOptions,
  logger: Logger
): Promise<number> {
  const repoInfo = resolveTargetRepo(options);
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner, name: repo } = repoInfo;
  const limit = options.limit ?? 10;
  const stateInput = options.state ?? "open";

  const states = parsePrStateFilter(stateInput);
  if (!states) {
    logger.error(`Invalid state: "${stateInput}". Use: open, closed, merged, all`);
    return 1;
  }

  const result = await runGraphQL<PrListQueryResult>(GRAPHQL_QUERY_PR_LIST, {
    owner,
    name: repo,
    first: limit,
    states,
  });

  if (!result.success) {
    logger.error("Failed to fetch pull requests");
    return 1;
  }

  const nodes = result.data?.data?.repository?.pullRequests?.nodes ?? [];

  const prs = nodes
    .filter((n): n is PrListNode & { number: number } => !!n?.number)
    .map((n) => ({
      number: n.number,
      title: n.title ?? "",
      state: n.state ?? "OPEN",
      head_branch: n.headRefName ?? "",
      base_branch: n.baseRefName ?? "",
      author: n.author?.login ?? "",
      review_decision: n.reviewDecision ?? null,
      url: n.url ?? "",
    }));

  const output = {
    repository: `${owner}/${repo}`,
    pull_requests: prs,
    total_count: prs.length,
  };

  const outputFormat = options.format ?? "json";
  const formatted = formatOutput(output, outputFormat, {
    arrayKey: "pull_requests",
    columns: GH_PR_LIST_COLUMNS,
  });
  console.log(formatted);
  return 0;
}

// =============================================================================
// cmdPrShow (#568 — PR 詳細表示)
// =============================================================================

export async function cmdPrShow(
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

  interface PrShowNode {
    number?: number;
    title?: string;
    state?: string;
    url?: string;
    body?: string;
    headRefName?: string;
    baseRefName?: string;
    author?: { login?: string };
    reviewDecision?: string | null;
    reviewThreads?: { totalCount?: number };
    reviews?: { totalCount?: number };
    labels?: { nodes?: Array<{ name?: string }> };
    createdAt?: string;
    updatedAt?: string;
    additions?: number;
    deletions?: number;
    changedFiles?: number;
  }

  interface QueryResult {
    data?: {
      repository?: {
        pullRequest?: PrShowNode;
      };
    };
  }

  const result = await runGraphQL<QueryResult>(GRAPHQL_QUERY_PR_SHOW, {
    owner,
    name: repo,
    number: prNumber,
  });

  if (!result.success || !result.data?.data?.repository?.pullRequest) {
    logger.error(`PR #${prNumber} not found`);
    return 1;
  }

  const pr = result.data.data.repository.pullRequest;
  const body = pr.body ?? "";

  const output = {
    number: pr.number,
    title: pr.title ?? "",
    state: pr.state ?? "OPEN",
    head_branch: pr.headRefName ?? "",
    base_branch: pr.baseRefName ?? "",
    author: pr.author?.login ?? "",
    review_decision: pr.reviewDecision ?? null,
    url: pr.url ?? "",
    body,
    labels: (pr.labels?.nodes ?? []).map((l) => l?.name ?? "").filter(Boolean),
    created_at: pr.createdAt ?? "",
    updated_at: pr.updatedAt ?? "",
    additions: pr.additions ?? 0,
    deletions: pr.deletions ?? 0,
    changed_files: pr.changedFiles ?? 0,
    review_thread_count: pr.reviewThreads?.totalCount ?? 0,
    review_count: pr.reviews?.totalCount ?? 0,
    linked_issues: parseLinkedIssues(body),
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

// =============================================================================
// cmdPrCreate (#986 — PR 作成)
// =============================================================================

/**
 * Create a pull request via Octokit REST API.
 *
 * Options:
 * - --base (required): Target branch (e.g., develop)
 * - --title (required): PR title
 * - --body-file (optional): Body content (already resolved by resolveBodyFileOption)
 * - --head (optional): Source branch (defaults to current git branch)
 */
export async function cmdPrCreate(
  options: IssuesPrOptions,
  logger: Logger
): Promise<number> {
  if (!options.base) {
    logger.error("--base is required (target branch)");
    logger.info(
      "Usage: shirokuma-docs issues pr-create --base develop --title \"feat: ...\" [--body-file ...]"
    );
    return 1;
  }

  if (!options.title) {
    logger.error("--title is required (PR title)");
    return 1;
  }

  const repoInfo = resolveTargetRepo(options);
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner, name: repo } = repoInfo;

  // Resolve head branch: explicit --head or current git branch
  const headBranch = options.head ?? getCurrentBranch() ?? undefined;
  if (!headBranch) {
    logger.error("Could not determine source branch. Specify --head <branch>.");
    return 1;
  }

  const body = options.bodyFile ?? "";

  const octokit = getOctokit();

  try {
    const { data } = await octokit.rest.pulls.create({
      owner,
      repo,
      title: options.title,
      body,
      head: headBranch,
      base: options.base,
    });

    logger.success(`Created PR #${data.number}: ${data.title}`);

    const output = {
      number: data.number,
      title: data.title,
      url: data.html_url,
      head_branch: data.head.ref,
      base_branch: data.base.ref,
    };

    console.log(JSON.stringify(output, null, 2));
    return 0;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to create PR: ${errorMsg}`);
    return 1;
  }
}
