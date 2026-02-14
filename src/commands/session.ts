/**
 * session command - Unified session management
 *
 * Subcommands:
 * - start: Fetch session context (latest handover + active issues with project fields)
 * - end: Save handover discussion + update issue statuses
 * - check: Detect inconsistencies between Issue state and Project Status
 *
 * Design:
 * - Combines multiple API calls into a single command
 * - Excludes Done/Released items by default
 * - Used internally by starting-session / ending-session skills
 */

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { createLogger, Logger } from "../utils/logger.js";
import {
  runGhCommand,
  runGraphQL,
  getRepoName,
  getRepoInfo,
  validateTitle,
  validateBody,
  isIssueNumber,
  parseIssueNumber,
  GhResult,
} from "../utils/github.js";
import {
  loadGhConfig,
  getDefaultCategory,
  getDefaultLimit,
  getMetricsConfig,
  type MetricsConfig,
} from "../utils/gh-config.js";
import { formatOutput, OutputFormat, toTableJson } from "../utils/formatters.js";
import { fetchOpenPRs, parseLinkedIssues } from "./issues-pr.js";
import {
  getIssueId,
} from "./issues.js";
import {
  getProjectFields,
  autoSetTimestamps,
  updateTextField,
  updateSelectField,
  generateTimestamp,
  type ProjectField,
} from "../utils/project-fields.js";
import { WORK_STARTED_STATUSES } from "../utils/status-workflow.js";
import {
  getProjectId,
  fetchWorkflows,
  RECOMMENDED_WORKFLOWS,
  type ProjectWorkflow,
} from "./projects.js";
import {
  validateGitHubSetup,
  printSetupCheckResults,
  type SetupCheckResult,
} from "../utils/setup-check.js";

// =============================================================================
// Types
// =============================================================================

export interface SessionOptions {
  owner?: string;
  verbose?: boolean;
  format?: OutputFormat;
  // session start options
  user?: string;
  all?: boolean;
  team?: boolean;
  // session end options
  title?: string;
  body?: string;
  done?: string[];
  review?: string[];
  // session check options
  fix?: boolean;
  setup?: boolean;
}

/** Statuses to exclude from session start results */
export const DEFAULT_EXCLUDE_STATUSES = ["Done", "Released"];

/** Git repository state for session start */
export interface GitState {
  currentBranch: string | null;
  uncommittedChanges: string[];
  hasUncommittedChanges: boolean;
}

// =============================================================================
// Types - session check
// =============================================================================

type InconsistencySeverity = "error" | "info";

/** A single detected inconsistency between Issue state and Project Status */
export interface Inconsistency {
  number: number;
  title: string;
  url: string;
  issueState: string;
  projectStatus: string | null;
  severity: InconsistencySeverity;
  description: string;
}

/** Result of fixing an inconsistency */
export interface FixResult {
  number: number;
  action: string;
  success: boolean;
  error?: string;
}

/** ワークフロー自動化チェック結果 (#250) */
export interface AutomationStatus {
  checked: boolean;
  workflows: Array<{ name: string; enabled: boolean; recommended: boolean }>;
  missing_recommended: string[];
}

/** Full check output structure */
export interface CheckOutput {
  repository: string;
  inconsistencies: Inconsistency[];
  fixes: FixResult[];
  automations?: AutomationStatus;
  summary: {
    total_checked: number;
    total_inconsistencies: number;
    errors: number;
    info: number;
    fixed: number;
    fix_failures: number;
  };
}

/**
 * Classify inconsistencies from a list of issues with project data.
 * Pure function - no API calls, fully testable.
 *
 * Detects two types of inconsistencies:
 * 1. OPEN issue with terminal status (Done/Released) → should be closed (error)
 * 2. CLOSED issue with work-started status (In Progress/Review/etc.) → status should be Done (error)
 * 3. CLOSED issue with pre-work status (Backlog/Icebox/etc.) → may be intentional (info)
 */
export function classifyInconsistencies(
  issues: IssueData[],
  doneStatuses: string[] = DEFAULT_EXCLUDE_STATUSES
): Inconsistency[] {
  const inconsistencies: Inconsistency[] = [];

  for (const issue of issues) {
    const status = issue.status ?? "";
    const isDoneStatus = doneStatuses.includes(status);

    // OPEN issue with Done/Released status
    if (issue.state === "OPEN" && isDoneStatus) {
      inconsistencies.push({
        number: issue.number,
        title: issue.title,
        url: issue.url,
        issueState: issue.state,
        projectStatus: issue.status,
        severity: "error",
        description: `Issue is OPEN but Project Status is "${issue.status}"`,
      });
    }

    // CLOSED issue with non-terminal status
    if (issue.state === "CLOSED" && status !== "" && !isDoneStatus) {
      const isWorkStarted = WORK_STARTED_STATUSES.includes(status);
      inconsistencies.push({
        number: issue.number,
        title: issue.title,
        url: issue.url,
        issueState: issue.state,
        projectStatus: issue.status,
        severity: isWorkStarted ? "error" : "info",
        description: `Issue is CLOSED but Project Status is "${issue.status}" (expected Done/Released)`,
      });
    }
  }

  return inconsistencies;
}

// =============================================================================
// GraphQL Queries - Discussions (Handovers)
// =============================================================================

/** Fetch discussion categories to resolve Handovers category ID */
const GRAPHQL_QUERY_CATEGORIES = `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    discussionCategories(first: 20) {
      nodes {
        id
        name
      }
    }
  }
}
`;

/** Fetch recent discussions from a category (for handover filtering) */
const GRAPHQL_QUERY_RECENT_HANDOVERS = `
query($owner: String!, $name: String!, $categoryId: ID) {
  repository(owner: $owner, name: $name) {
    discussions(first: 10, categoryId: $categoryId, orderBy: {field: CREATED_AT, direction: DESC}) {
      nodes {
        number
        title
        body
        url
        createdAt
        author { login }
      }
    }
  }
}
`;

/** Get repository ID for mutations */
const GRAPHQL_QUERY_REPO_ID = `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    id
  }
}
`;

/** Create a discussion */
const GRAPHQL_MUTATION_CREATE_DISCUSSION = `
mutation($repositoryId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
  createDiscussion(input: {repositoryId: $repositoryId, categoryId: $categoryId, title: $title, body: $body}) {
    discussion {
      id
      number
      url
      title
    }
  }
}
`;

// =============================================================================
// GraphQL Queries - Issues with Projects
// =============================================================================

/** Fetch issues with project field data */
const GRAPHQL_QUERY_ISSUES_WITH_PROJECTS = `
query($owner: String!, $name: String!, $first: Int!, $cursor: String, $states: [IssueState!]) {
  repository(owner: $owner, name: $name) {
    issues(first: $first, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}, states: $states) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number
        title
        url
        state
        closedAt
        assignees(first: 5) {
          nodes { login }
        }
        labels(first: 10) {
          nodes { name }
        }
        projectItems(first: 5) {
          nodes {
            id
            project { id title }
            status: fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
            priority: fieldValueByName(name: "Priority") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
            type: fieldValueByName(name: "Type") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
            itemType: fieldValueByName(name: "Item Type") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
            size: fieldValueByName(name: "Size") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
          }
        }
      }
    }
  }
}
`;

// =============================================================================
// Helper: Get current GitHub username
// =============================================================================

function getCurrentUsername(): string | null {
  try {
    const result = spawnSync("gh", ["api", "user", "-q", ".login"], {
      encoding: "utf-8",
      timeout: 10000,
    });
    if (result.status === 0 && result.stdout.trim()) {
      return result.stdout.trim();
    }
    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// Helper: Resolve Handovers category ID
// =============================================================================

function getHandoversCategoryId(
  owner: string,
  repo: string,
  categoryName: string
): string | null {
  interface QueryResult {
    data?: {
      repository?: {
        discussionCategories?: {
          nodes?: Array<{ id?: string; name?: string }>;
        };
      };
    };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_CATEGORIES, {
    owner,
    name: repo,
  });

  if (!result.success) return null;

  const nodes = result.data?.data?.repository?.discussionCategories?.nodes ?? [];
  const category = nodes.find((n) => n?.name === categoryName);
  return category?.id ?? null;
}

// =============================================================================
// Helper: Get repository GraphQL ID
// =============================================================================

function getRepoId(owner: string, repo: string): string | null {
  interface QueryResult {
    data?: { repository?: { id?: string } };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_REPO_ID, {
    owner,
    name: repo,
  });
  if (!result.success) return null;
  return result.data?.data?.repository?.id ?? null;
}

// =============================================================================
// Helper: Fetch latest handover
// =============================================================================

interface HandoverData {
  number: number;
  title: string;
  body: string;
  url: string;
  author: string | null;
}

/**
 * Fetch handovers from the Handovers category, optionally filtered by author.
 *
 * @param authorFilter - Username to filter by, or null for all
 * @returns The most recent matching handover, or null
 */
function fetchLatestHandover(
  owner: string,
  repo: string,
  categoryId: string,
  authorFilter: string | null,
): HandoverData | null {
  interface DiscussionNode {
    number?: number;
    title?: string;
    body?: string;
    url?: string;
    author?: { login?: string };
  }

  interface QueryResult {
    data?: {
      repository?: {
        discussions?: {
          nodes?: DiscussionNode[];
        };
      };
    };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_RECENT_HANDOVERS, {
    owner,
    name: repo,
    categoryId,
  });

  if (!result.success) return null;

  const nodes = result.data?.data?.repository?.discussions?.nodes ?? [];

  // Filter by author if specified
  const filtered = authorFilter
    ? nodes.filter((n) => n?.author?.login === authorFilter)
    : nodes;

  const first = filtered[0];
  if (!first?.number) return null;

  return {
    number: first.number,
    title: first.title ?? "",
    body: first.body ?? "",
    url: first.url ?? "",
    author: first.author?.login ?? null,
  };
}

// =============================================================================
// Helper: Fetch all recent handovers (for --team mode)
// =============================================================================

/**
 * Fetch all recent handovers and group by author (latest per author).
 */
function fetchTeamHandovers(
  owner: string,
  repo: string,
  categoryId: string,
): HandoverData[] {
  interface DiscussionNode {
    number?: number;
    title?: string;
    body?: string;
    url?: string;
    author?: { login?: string };
  }

  interface QueryResult {
    data?: {
      repository?: {
        discussions?: {
          nodes?: DiscussionNode[];
        };
      };
    };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_RECENT_HANDOVERS, {
    owner,
    name: repo,
    categoryId,
  });

  if (!result.success) return [];

  const nodes = result.data?.data?.repository?.discussions?.nodes ?? [];

  // Group by author: keep only the latest per author
  const byAuthor = new Map<string, HandoverData>();
  for (const node of nodes) {
    if (!node?.number) continue;
    const author = node.author?.login ?? "unknown";
    if (!byAuthor.has(author)) {
      byAuthor.set(author, {
        number: node.number,
        title: node.title ?? "",
        body: node.body ?? "",
        url: node.url ?? "",
        author,
      });
    }
  }

  return Array.from(byAuthor.values());
}

// =============================================================================
// Helper: Fetch issues with project fields
// =============================================================================

export interface IssueData {
  number: number;
  title: string;
  url: string;
  state: string;
  closedAt: string | null;
  labels: string[];
  assignees: string[];
  status: string | null;
  priority: string | null;
  type: string | null;
  size: string | null;
  projectItemId: string | null;
  projectId: string | null;
}

function fetchActiveIssues(
  owner: string,
  repo: string,
  limit: number,
  states: string[] = ["OPEN"]
): IssueData[] {
  interface IssueNode {
    number?: number;
    title?: string;
    url?: string;
    state?: string;
    closedAt?: string;
    assignees?: { nodes?: Array<{ login?: string }> };
    labels?: { nodes?: Array<{ name?: string }> };
    projectItems?: {
      nodes?: Array<{
        id?: string;
        project?: { id?: string; title?: string };
        status?: { name?: string };
        priority?: { name?: string };
        type?: { name?: string };
        itemType?: { name?: string };
        size?: { name?: string };
      }>;
    };
  }

  interface QueryResult {
    data?: {
      repository?: {
        issues?: {
          pageInfo?: { hasNextPage?: boolean; endCursor?: string };
          nodes?: IssueNode[];
        };
      };
    };
  }

  const allIssues: IssueData[] = [];
  let cursor: string | null = null;

  while (allIssues.length < limit) {
    const fetchCount = Math.min(100, limit - allIssues.length);

    const result: GhResult<QueryResult> = runGraphQL<QueryResult>(
      GRAPHQL_QUERY_ISSUES_WITH_PROJECTS,
      {
        owner,
        name: repo,
        first: fetchCount,
        cursor: cursor,
        states,
      }
    );

    if (!result.success || !result.data?.data?.repository?.issues) break;

    type IssuesData = NonNullable<NonNullable<NonNullable<QueryResult["data"]>["repository"]>["issues"]>;
    const issuesData: IssuesData = result.data.data.repository.issues;
    const nodes: IssueNode[] = issuesData.nodes ?? [];

    for (const node of nodes) {
      if (!node?.number) continue;

      // Match project item by repo name convention, fallback to first item
      type ProjectItemNode = NonNullable<NonNullable<IssueNode["projectItems"]>["nodes"]>[number];
      const projectItems: ProjectItemNode[] = node.projectItems?.nodes ?? [];
      const matchingItem = projectItems.find((p: ProjectItemNode) => p?.project?.title === repo) ?? projectItems[0];

      type LabelNode = NonNullable<NonNullable<IssueNode["labels"]>["nodes"]>[number];
      const labelNodes: LabelNode[] = node.labels?.nodes ?? [];
      const issueLabels = labelNodes.map((l: LabelNode) => l?.name ?? "").filter(Boolean);

      type AssigneeNode = NonNullable<NonNullable<IssueNode["assignees"]>["nodes"]>[number];
      const assigneeNodes: AssigneeNode[] = node.assignees?.nodes ?? [];
      const issueAssignees = assigneeNodes.map((a: AssigneeNode) => a?.login ?? "").filter(Boolean);

      allIssues.push({
        number: node.number,
        title: node.title ?? "",
        url: node.url ?? "",
        state: node.state ?? "OPEN",
        closedAt: node.closedAt ?? null,
        labels: issueLabels,
        assignees: issueAssignees,
        status: matchingItem?.status?.name ?? null,
        priority: matchingItem?.priority?.name ?? null,
        type: matchingItem?.type?.name ?? matchingItem?.itemType?.name ?? null,
        size: matchingItem?.size?.name ?? null,
        projectItemId: matchingItem?.id ?? null,
        projectId: matchingItem?.project?.id ?? null,
      });
    }

    const pageInfo: { hasNextPage?: boolean; endCursor?: string } = issuesData.pageInfo ?? {};
    if (!pageInfo.hasNextPage) break;
    cursor = pageInfo.endCursor ?? null;
  }

  return allIssues;
}

// =============================================================================
// Helper: Update issue status in project
// =============================================================================

function updateIssueStatus(
  projectId: string,
  itemId: string,
  statusValue: string,
  projectFields: Record<string, ProjectField>,
  logger: Logger
): boolean {
  const statusField = projectFields["Status"];
  if (!statusField) {
    logger.warn("Status field not found in project");
    return false;
  }

  const optionId = statusField.options[statusValue];
  if (!optionId) {
    const available = Object.keys(statusField.options).sort().join(", ");
    logger.error(`Invalid Status value '${statusValue}'`);
    logger.info(`  Available options: ${available}`);
    return false;
  }

  return updateSelectField(projectId, itemId, statusField.id, optionId, logger);
}

// =============================================================================
// PR merge detection (#220)
// =============================================================================

/**
 * Issue に紐づくマージ済み PR を検出する。
 *
 * 検出戦略:
 * 1. ブランチ名検索: 現在のブランチに対応する merged PR を探す
 * 2. Issue リンク逆引き: マージ済み PR の body から "Closes #N" 等を検索
 *
 * @returns マージ済み PR 番号。見つからない場合は null
 */
export function findMergedPrForIssue(
  owner: string,
  repo: string,
  issueNumber: number,
  logger: Logger
): number | null {
  // Strategy 1: ブランチ名ベースの検出
  // 現在のブランチに紐づくマージ済み PR を探す
  try {
    const branchResult = spawnSync("git", ["branch", "--show-current"], {
      encoding: "utf-8",
      timeout: 5000,
    });
    const currentBranch = branchResult.stdout?.trim();

    const baseBranches = ["main", "master", "develop"];
    if (currentBranch && !baseBranches.includes(currentBranch)) {
      const prResult = runGhCommand<Array<{ number: number }>>(
        [
          "pr", "list",
          "--head", currentBranch,
          "--state", "merged",
          "--json", "number",
          "--repo", `${owner}/${repo}`,
          "-L", "1",
        ],
        { silent: true }
      );

      if (prResult.success && Array.isArray(prResult.data) && prResult.data.length > 0) {
        const prNum = prResult.data[0].number;
        logger.debug(`Merged PR #${prNum} found for branch ${currentBranch}`);
        return prNum;
      }
    }
  } catch {
    // git コマンド失敗時は次の戦略へ
  }

  // Strategy 2: Issue リンク逆引き
  // 最近マージされた PR の body を検索して、対象 Issue への参照を探す
  const searchResult = runGhCommand<Array<{ number: number; body: string }>>(
    [
      "pr", "list",
      "--state", "merged",
      "--search", `#${issueNumber}`,
      "--json", "number,body",
      "--repo", `${owner}/${repo}`,
      "-L", "10",
    ],
    { silent: true }
  );

  if (searchResult.success && Array.isArray(searchResult.data)) {
    for (const pr of searchResult.data) {
      const linked = parseLinkedIssues(pr.body);
      if (linked.includes(issueNumber)) {
        logger.debug(`Merged PR #${pr.number} links to issue #${issueNumber}`);
        return pr.number;
      }
    }
  }

  return null;
}

// =============================================================================
// Git state helpers
// =============================================================================

/**
 * Get current git repository state (branch + uncommitted changes).
 * Returns safe defaults if git commands fail.
 */
export function getGitState(): GitState {
  let currentBranch: string | null = null;
  let uncommittedChanges: string[] = [];

  try {
    const branchResult = spawnSync("git", ["branch", "--show-current"], {
      encoding: "utf-8",
      timeout: 5000,
    });
    if (branchResult.status === 0 && branchResult.stdout.trim()) {
      currentBranch = branchResult.stdout.trim();
    }
  } catch {
    // Git not available or not in a repo - return defaults
  }

  try {
    const statusResult = spawnSync("git", ["status", "--short"], {
      encoding: "utf-8",
      timeout: 5000,
    });
    if (statusResult.status === 0 && statusResult.stdout.trim()) {
      uncommittedChanges = statusResult.stdout
        .trim()
        .split("\n")
        .filter((line) => line.length > 0);
    }
  } catch {
    // Git not available or not in a repo - return defaults
  }

  return {
    currentBranch,
    uncommittedChanges,
    hasUncommittedChanges: uncommittedChanges.length > 0,
  };
}

// =============================================================================
// Session backup helpers (#251)
// =============================================================================

const SESSIONS_DIR = ".claude/sessions";
const BACKUP_SUFFIX = "-precompact-backup.md";

/** Session backup metadata returned by getSessionBackups */
export interface SessionBackup {
  filename: string;
  timestamp: string;
  content: string;
}

/**
 * Check for PreCompact session backups in .claude/sessions/.
 * Returns backups sorted by timestamp (most recent first).
 */
export function getSessionBackups(): SessionBackup[] {
  if (!existsSync(SESSIONS_DIR)) return [];

  try {
    const files = readdirSync(SESSIONS_DIR)
      .filter((f) => f.endsWith(BACKUP_SUFFIX))
      .sort()
      .reverse();

    return files.map((f) => ({
      filename: f,
      timestamp: f.replace(BACKUP_SUFFIX, ""),
      content: readFileSync(join(SESSIONS_DIR, f), "utf-8"),
    }));
  } catch {
    return [];
  }
}

/**
 * Remove all PreCompact session backups from .claude/sessions/.
 * Called after a successful handover to prevent stale backups.
 *
 * @returns Number of files cleaned up
 */
export function cleanupSessionBackups(): number {
  if (!existsSync(SESSIONS_DIR)) return 0;

  try {
    const files = readdirSync(SESSIONS_DIR).filter((f) =>
      f.endsWith(BACKUP_SUFFIX)
    );

    for (const f of files) {
      unlinkSync(join(SESSIONS_DIR, f));
    }
    return files.length;
  } catch {
    return 0;
  }
}

// =============================================================================
// session start
// =============================================================================

async function cmdStart(
  options: SessionOptions,
  logger: Logger
): Promise<number> {
  const config = loadGhConfig();
  const repoInfo = getRepoInfo();
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner: repoOwner, name: repo } = repoInfo;
  const owner = options.owner || repoOwner;
  const categoryName = getDefaultCategory(config);
  const limit = getDefaultLimit(config);

  logger.debug(`Repository: ${owner}/${repo}`);
  logger.debug(`Handover category: ${categoryName}`);

  // Team mode: delegate to cmdStartTeam
  if (options.team) {
    return cmdStartTeam(owner, repo, categoryName, limit, options, logger);
  }

  // 1. Resolve author filter for handovers
  let authorFilter: string | null = null;
  if (options.all) {
    authorFilter = null;
  } else if (options.user) {
    authorFilter = options.user;
  } else {
    // Default: filter by current GitHub user
    authorFilter = getCurrentUsername();
    if (authorFilter) {
      logger.debug(`Filtering handovers by author: ${authorFilter}`);
    }
  }

  // 2. Fetch latest handover (filtered)
  let lastHandover: HandoverData | null = null;

  const categoryId = getHandoversCategoryId(owner, repo, categoryName);
  if (categoryId) {
    lastHandover = fetchLatestHandover(owner, repo, categoryId, authorFilter);
    if (lastHandover) {
      logger.debug(`Found handover #${lastHandover.number} by ${lastHandover.author ?? "unknown"}`);
    } else {
      logger.debug("No handover found");
    }
  } else {
    logger.debug(`Category '${categoryName}' not found, skipping handover`);
  }

  // 2. Fetch active issues with project fields
  const allIssues = fetchActiveIssues(owner, repo, limit);

  // Filter out Done/Released
  const activeIssues = allIssues.filter(
    (i) => !DEFAULT_EXCLUDE_STATUSES.includes(i.status ?? "")
  );

  logger.debug(`Issues: ${allIssues.length} total, ${activeIssues.length} active`);

  // 3. Fetch open PRs
  const openPRs = fetchOpenPRs(owner, repo);
  logger.debug(`Open PRs: ${openPRs.length}`);

  // 4. Get git state
  const git = getGitState();
  logger.debug(`Branch: ${git.currentBranch ?? "(detached)"}`);
  logger.debug(`Uncommitted changes: ${git.uncommittedChanges.length}`);

  // 4b. Workflow warnings
  const warnings: string[] = [];
  const protectedBranches = ["main", "develop"];
  if (git.currentBranch && protectedBranches.includes(git.currentBranch)) {
    warnings.push(
      `On protected branch "${git.currentBranch}". Create a feature branch before committing.`
    );
    logger.warn(
      `Warning: On protected branch "${git.currentBranch}". Create a feature branch before committing.`
    );
  }
  if (git.hasUncommittedChanges) {
    warnings.push(
      `${git.uncommittedChanges.length} uncommitted change(s) detected.`
    );
  }

  // 5. Check for session backups (#251)
  const backups = getSessionBackups();
  if (backups.length > 0) {
    warnings.push(
      `${backups.length} PreCompact backup(s) found in .claude/sessions/. A previous session may have been interrupted.`
    );
    logger.warn(`Found ${backups.length} PreCompact backup(s) from interrupted session(s)`);
  }

  // 6. Build output (TableJSON for lists, plain object for single items)
  const issueColumns = ["number", "title", "status", "priority", "type", "size", "assignees", "labels"];
  const prColumns = ["number", "title", "review_decision", "review_thread_count", "review_count"];

  const output = {
    repository: `${owner}/${repo}`,
    warnings: warnings.length > 0 ? warnings : undefined,
    git,
    lastHandover: lastHandover
      ? {
          number: lastHandover.number,
          title: lastHandover.title,
          body: lastHandover.body,
          url: lastHandover.url,
        }
      : null,
    backups: backups.length > 0
      ? {
          count: backups.length,
          latest: {
            filename: backups[0].filename,
            timestamp: backups[0].timestamp,
            content: backups[0].content,
          },
        }
      : undefined,
    issues: toTableJson(
      activeIssues.map((i) => ({
        number: i.number,
        title: i.title,
        status: i.status,
        priority: i.priority,
        type: i.type,
        size: i.size,
        assignees: i.assignees,
        labels: i.labels,
      })),
      issueColumns
    ),
    total_issues: activeIssues.length,
    openPRs: toTableJson(
      openPRs.map((pr) => ({
        number: pr.number,
        title: pr.title,
        review_decision: pr.reviewDecision,
        review_thread_count: pr.reviewThreadCount,
        review_count: pr.reviewCount,
      })),
      prColumns
    ),
  };

  const outputFormat = options.format ?? "json";
  const formatted = formatOutput(output, outputFormat);
  console.log(formatted);
  return 0;
}

// =============================================================================
// session start --team (team dashboard)
// =============================================================================

/** Group issues by assignee for team view */
export function groupIssuesByAssignee(
  issues: IssueData[]
): Record<string, IssueData[]> {
  const groups: Record<string, IssueData[]> = {};

  for (const issue of issues) {
    if (issue.assignees.length === 0) {
      const key = "unassigned";
      if (!groups[key]) groups[key] = [];
      groups[key].push(issue);
    } else {
      for (const assignee of issue.assignees) {
        if (!groups[assignee]) groups[assignee] = [];
        groups[assignee].push(issue);
      }
    }
  }

  return groups;
}

/**
 * Team dashboard mode for session start.
 * Shows all members' handovers and issues grouped by assignee.
 */
async function cmdStartTeam(
  owner: string,
  repo: string,
  categoryName: string,
  limit: number,
  options: SessionOptions,
  logger: Logger,
): Promise<number> {
  logger.debug("Team dashboard mode");

  // 1. Fetch all team handovers (latest per author)
  const categoryId = getHandoversCategoryId(owner, repo, categoryName);
  let teamHandovers: HandoverData[] = [];
  if (categoryId) {
    teamHandovers = fetchTeamHandovers(owner, repo, categoryId);
    logger.debug(`Team handovers: ${teamHandovers.length} members`);
  } else {
    logger.debug(`Category '${categoryName}' not found, skipping handovers`);
  }

  // 2. Fetch active issues with project fields
  const allIssues = fetchActiveIssues(owner, repo, limit);
  const activeIssues = allIssues.filter(
    (i) => !DEFAULT_EXCLUDE_STATUSES.includes(i.status ?? "")
  );

  // 3. Group issues by assignee
  const issuesByAssignee = groupIssuesByAssignee(activeIssues);

  // 4. Fetch open PRs
  const openPRs = fetchOpenPRs(owner, repo);

  // 5. Build team dashboard output
  const issueColumns = ["number", "title", "status", "priority", "type", "size"];

  const memberDashboards: Record<string, {
    handover: { number: number; title: string; body: string; url: string } | null;
    issues: ReturnType<typeof toTableJson>;
    issue_count: number;
  }> = {};

  // Collect all member names from both handovers and issues
  const allMembers = new Set<string>();
  for (const h of teamHandovers) {
    if (h.author) allMembers.add(h.author);
  }
  for (const assignee of Object.keys(issuesByAssignee)) {
    allMembers.add(assignee);
  }

  for (const member of allMembers) {
    const handover = teamHandovers.find((h) => h.author === member);
    const memberIssues = issuesByAssignee[member] ?? [];

    memberDashboards[member] = {
      handover: handover
        ? {
            number: handover.number,
            title: handover.title,
            body: handover.body,
            url: handover.url,
          }
        : null,
      issues: toTableJson(
        memberIssues.map((i) => ({
          number: i.number,
          title: i.title,
          status: i.status,
          priority: i.priority,
          type: i.type,
          size: i.size,
        })),
        issueColumns
      ),
      issue_count: memberIssues.length,
    };
  }

  const prColumns = ["number", "title", "review_decision", "review_thread_count", "review_count"];

  const output = {
    repository: `${owner}/${repo}`,
    mode: "team",
    members: memberDashboards,
    total_members: allMembers.size,
    total_issues: activeIssues.length,
    openPRs: toTableJson(
      openPRs.map((pr) => ({
        number: pr.number,
        title: pr.title,
        review_decision: pr.reviewDecision,
        review_thread_count: pr.reviewThreadCount,
        review_count: pr.reviewCount,
      })),
      prColumns
    ),
  };

  const outputFormat = options.format ?? "json";
  const formatted = formatOutput(output, outputFormat);
  console.log(formatted);
  return 0;
}

// =============================================================================
// session end
// =============================================================================

async function cmdEnd(
  options: SessionOptions,
  logger: Logger
): Promise<number> {
  const config = loadGhConfig();
  const repoInfo = getRepoInfo();
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner: repoOwner, name: repo } = repoInfo;
  const owner = options.owner || repoOwner;

  // Check for uncommitted changes and warn
  const git = getGitState();
  const endWarnings: string[] = [];
  if (git.hasUncommittedChanges) {
    endWarnings.push(
      `${git.uncommittedChanges.length} uncommitted change(s) detected. Consider committing or stashing before ending session.`
    );
    logger.warn(
      `Warning: ${git.uncommittedChanges.length} uncommitted change(s) detected. Consider committing or stashing.`
    );
  }

  // Validate required inputs
  if (!options.title) {
    logger.error("--title is required for session end");
    return 1;
  }

  // Auto-insert [username] into handover title if not already present (#196)
  // Format: "YYYY-MM-DD - summary" → "YYYY-MM-DD [username] - summary"
  let title = options.title;
  if (/^\d{4}-\d{2}-\d{2} - /.test(title) && !title.includes("[")) {
    const username = getCurrentUsername();
    if (username) {
      title = title.replace(/^(\d{4}-\d{2}-\d{2}) - /, `$1 [${username}] - `);
      logger.debug(`Title updated with username: ${title}`);
    }
  }

  const titleError = validateTitle(title);
  if (titleError) {
    logger.error(titleError);
    return 1;
  }

  const bodyError = validateBody(options.body);
  if (bodyError) {
    logger.error(bodyError);
    return 1;
  }

  const updatedIssues: Array<{ number: number; status: string }> = [];

  // 1. Update issue statuses (--done, --review)
  const doneNumbers = (options.done ?? []).filter(isIssueNumber).map(parseIssueNumber);
  const reviewNumbers = (options.review ?? []).filter(isIssueNumber).map(parseIssueNumber);

  if (doneNumbers.length > 0 || reviewNumbers.length > 0) {
    // Fetch issues to get project item IDs
    const limit = getDefaultLimit(config);
    const issues = fetchActiveIssues(owner, repo, limit);

    // Get project fields once
    const projectIds = new Set<string>();
    for (const issue of issues) {
      if (issue.projectId) projectIds.add(issue.projectId);
    }

    // Cache project fields per project
    const fieldsCache: Record<string, Record<string, ProjectField>> = {};
    for (const pid of projectIds) {
      fieldsCache[pid] = getProjectFields(pid);
    }

    // Update Done issues
    for (const num of doneNumbers) {
      const issue = issues.find((i) => i.number === num);
      if (!issue?.projectItemId || !issue?.projectId) {
        logger.warn(`Issue #${num}: not found in project, skipping status update`);
        continue;
      }

      const fields = fieldsCache[issue.projectId] ?? {};
      if (updateIssueStatus(issue.projectId, issue.projectItemId, "Done", fields, logger)) {
        updatedIssues.push({ number: num, status: "Done" });
        logger.success(`Issue #${num} → Done`);
        // Auto-set timestamp (#342) - reuse cached fields
        autoSetTimestamps(issue.projectId, issue.projectItemId, "Done", fields, logger);
      }
    }

    // Update Review issues (auto-promote to Done if PR is already merged, #220)
    for (const num of reviewNumbers) {
      const issue = issues.find((i) => i.number === num);
      if (!issue?.projectItemId || !issue?.projectId) {
        logger.warn(`Issue #${num}: not found in project, skipping status update`);
        continue;
      }

      const fields = fieldsCache[issue.projectId] ?? {};

      // Check if a merged PR exists for this issue (#220)
      const mergedPr = findMergedPrForIssue(owner, repo, num, logger);
      const targetStatus = mergedPr ? "Done" : "Review";

      if (updateIssueStatus(issue.projectId, issue.projectItemId, targetStatus, fields, logger)) {
        updatedIssues.push({ number: num, status: targetStatus });
        if (mergedPr) {
          logger.success(`Issue #${num} → Done (PR #${mergedPr} merged)`);
        } else {
          logger.success(`Issue #${num} → Review`);
        }
        // Auto-set timestamp (#342) - reuse cached fields
        autoSetTimestamps(issue.projectId, issue.projectItemId, targetStatus, fields, logger);
      }
    }
  }

  // 2. Create handover discussion
  const categoryName = getDefaultCategory(config);
  const categoryId = getHandoversCategoryId(owner, repo, categoryName);

  let handoverOutput: { number: number; title: string; url: string } | null = null;

  if (categoryId) {
    const repoId = getRepoId(owner, repo);
    if (!repoId) {
      logger.error("Could not get repository ID");
      return 1;
    }

    interface CreateResult {
      data?: {
        createDiscussion?: {
          discussion?: {
            id?: string;
            number?: number;
            url?: string;
            title?: string;
          };
        };
      };
    }

    const result = runGraphQL<CreateResult>(GRAPHQL_MUTATION_CREATE_DISCUSSION, {
      repositoryId: repoId,
      categoryId: categoryId,
      title: title,
      body: options.body ?? "",
    });

    if (!result.success) {
      logger.error("Failed to create handover discussion");
      return 1;
    }

    const discussion = result.data?.data?.createDiscussion?.discussion;
    if (discussion?.number) {
      handoverOutput = {
        number: discussion.number,
        title: discussion.title ?? title,
        url: discussion.url ?? "",
      };
      logger.success(`Handover saved: #${discussion.number}`);
    } else {
      logger.error("Failed to create handover discussion");
      return 1;
    }
  } else {
    logger.error(`Category '${categoryName}' not found. Cannot create handover.`);
    logger.info("Ensure Discussions are enabled and Handovers category exists.");
    return 1;
  }

  // 3. Clean up session backups (#251)
  const cleanedBackups = cleanupSessionBackups();
  if (cleanedBackups > 0) {
    logger.debug(`Cleaned up ${cleanedBackups} PreCompact backup(s)`);
  }

  // 4. Build output
  const output = {
    warnings: endWarnings.length > 0 ? endWarnings : undefined,
    handover: handoverOutput,
    updatedIssues,
    cleanedBackups: cleanedBackups > 0 ? cleanedBackups : undefined,
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

// =============================================================================
// session check - Metrics helpers (#342)
// =============================================================================

/** Fetch Text field values for all project items (batch, 1 query per project) */
const GRAPHQL_QUERY_PROJECT_ITEM_TEXT_VALUES = `
query($projectId: ID!, $first: Int!) {
  node(id: $projectId) {
    ... on ProjectV2 {
      items(first: $first) {
        nodes {
          id
          fieldValues(first: 20) {
            nodes {
              ... on ProjectV2ItemFieldTextValue {
                text
                field { ... on ProjectV2Field { name } }
              }
            }
          }
        }
      }
    }
  }
}
`;

/**
 * Batch-fetch Text field values for all items in a project.
 * Returns map: itemId → { fieldName → textValue }
 */
function fetchItemTextFieldValues(
  projectId: string
): Record<string, Record<string, string>> {
  interface TextValueNode {
    text?: string;
    field?: { name?: string };
  }

  interface ItemNode {
    id?: string;
    fieldValues?: {
      nodes?: TextValueNode[];
    };
  }

  interface QueryResult {
    data?: {
      node?: {
        items?: {
          nodes?: ItemNode[];
        };
      };
    };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_PROJECT_ITEM_TEXT_VALUES, {
    projectId,
    first: 100,
  });

  if (!result.success) return {};

  const itemMap: Record<string, Record<string, string>> = {};
  const items = result.data?.data?.node?.items?.nodes ?? [];

  for (const item of items) {
    if (!item?.id) continue;
    const textValues: Record<string, string> = {};
    const fieldValues = item.fieldValues?.nodes ?? [];
    for (const fv of fieldValues) {
      if (fv?.field?.name && fv?.text) {
        textValues[fv.field.name] = fv.text;
      }
    }
    if (Object.keys(textValues).length > 0) {
      itemMap[item.id] = textValues;
    }
  }

  return itemMap;
}

/**
 * Classify metrics-related inconsistencies.
 * Pure function - no API calls, fully testable.
 *
 * Detects:
 * 1. Done/Released issues missing Completed At timestamp
 * 2. In Progress issues that are stale (In Progress At older than threshold)
 */
export function classifyMetricsInconsistencies(
  issues: IssueData[],
  textFieldValues: Record<string, Record<string, string>>,
  metricsConfig: MetricsConfig,
  now?: Date
): Inconsistency[] {
  const inconsistencies: Inconsistency[] = [];
  const currentTime = now ?? new Date();

  const mapping = metricsConfig.statusToDateMapping ?? {};
  const staleThreshold = metricsConfig.staleThresholdDays ?? 14;

  for (const issue of issues) {
    const status = issue.status ?? "";
    const itemId = issue.projectItemId;
    if (!itemId) continue;

    const textValues = textFieldValues[itemId] ?? {};

    // Done/Released issues missing Completed At timestamp
    if (["Done", "Released"].includes(status)) {
      const completedAtField = mapping["Done"];
      if (completedAtField && !textValues[completedAtField]) {
        inconsistencies.push({
          number: issue.number,
          title: issue.title,
          url: issue.url,
          issueState: issue.state,
          projectStatus: issue.status,
          severity: "info",
          description: `Metrics: Missing '${completedAtField}' timestamp for ${status} issue`,
        });
      }
    }

    // In Progress issues - stale check
    if (status === "In Progress") {
      const inProgressAtField = mapping["In Progress"];
      if (inProgressAtField && textValues[inProgressAtField]) {
        const inProgressAt = new Date(textValues[inProgressAtField]);
        if (!isNaN(inProgressAt.getTime())) {
          const daysSinceStart = Math.floor(
            (currentTime.getTime() - inProgressAt.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSinceStart > staleThreshold) {
            inconsistencies.push({
              number: issue.number,
              title: issue.title,
              url: issue.url,
              issueState: issue.state,
              projectStatus: issue.status,
              severity: "info",
              description: `Metrics: In Progress for ${daysSinceStart} days (stale threshold: ${staleThreshold} days)`,
            });
          }
        }
      }
    }
  }

  return inconsistencies;
}

// =============================================================================
// session check - Integrity check
// =============================================================================

const GRAPHQL_MUTATION_CLOSE_ISSUE = `
mutation($issueId: ID!, $stateReason: IssueClosedStateReason) {
  closeIssue(input: {issueId: $issueId, stateReason: $stateReason}) {
    issue { id number state }
  }
}
`;

function closeIssueById(issueId: string): boolean {
  const result = runGraphQL(GRAPHQL_MUTATION_CLOSE_ISSUE, {
    issueId,
    stateReason: "COMPLETED",
  });
  return result.success;
}

/**
 * Check for inconsistencies between GitHub Issue state and Project Status.
 *
 * Detects two types of inconsistencies:
 * 1. OPEN issues with terminal Project Status (Done/Released) → fix: close issue
 * 2. CLOSED issues with active Project Status (Review/In Progress/etc.) → fix: set status to Done
 */
async function cmdCheck(
  options: SessionOptions,
  logger: Logger
): Promise<number> {
  // --setup mode: validate GitHub manual setup items (#345)
  if (options.setup) {
    const setupResult = validateGitHubSetup(logger);
    if (!setupResult) return 1;

    printSetupCheckResults(setupResult, logger);
    console.log(JSON.stringify(setupResult, null, 2));

    return setupResult.summary.missing > 0 ? 1 : 0;
  }

  const config = loadGhConfig();
  const repoInfo = getRepoInfo();
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner: repoOwner, name: repo } = repoInfo;
  const owner = options.owner || repoOwner;
  const limit = getDefaultLimit(config);

  logger.debug(`Repository: ${owner}/${repo}`);

  // 1. Fetch both OPEN and CLOSED issues in a single query
  const allIssues = fetchActiveIssues(owner, repo, limit, ["OPEN", "CLOSED"]);
  logger.debug(`Issues fetched: ${allIssues.length}`);

  // 2. Classify inconsistencies (pure function)
  const inconsistencies = classifyInconsistencies(allIssues);
  logger.debug(`Inconsistencies found: ${inconsistencies.length}`);

  // 3. Fix if --fix is specified
  const fixes: FixResult[] = [];

  if (options.fix && inconsistencies.length > 0) {
    // Pre-fetch project fields for status updates (needed for CLOSED + active status fixes)
    const projectFieldsCache: Record<string, Record<string, ProjectField>> = {};

    const errorItems = inconsistencies.filter((i) => i.severity === "error");

    for (const item of errorItems) {
      if (item.issueState === "OPEN") {
        // OPEN + Done/Released → close the issue
        logger.info(`Closing #${item.number}: ${item.description}`);

        const issueId = getIssueId(owner, repo, item.number);
        if (!issueId) {
          fixes.push({
            number: item.number,
            action: "close",
            success: false,
            error: "Could not resolve issue ID",
          });
          continue;
        }

        const success = closeIssueById(issueId);
        fixes.push({
          number: item.number,
          action: "close",
          success,
          error: success ? undefined : "GraphQL mutation failed",
        });

        if (success) {
          logger.success(`Closed #${item.number}`);
        } else {
          logger.error(`Failed to close #${item.number}`);
        }
      } else if (item.issueState === "CLOSED") {
        // CLOSED + active status → update status to Done
        logger.info(`Updating #${item.number} status to Done: ${item.description}`);

        const issueData = allIssues.find((i) => i.number === item.number);
        if (!issueData?.projectItemId || !issueData?.projectId) {
          fixes.push({
            number: item.number,
            action: "update-status",
            success: false,
            error: "Could not resolve project item ID",
          });
          continue;
        }

        // Cache project fields per project
        if (!projectFieldsCache[issueData.projectId]) {
          projectFieldsCache[issueData.projectId] = getProjectFields(issueData.projectId);
        }
        const fields = projectFieldsCache[issueData.projectId];

        const success = updateIssueStatus(
          issueData.projectId,
          issueData.projectItemId,
          "Done",
          fields,
          logger
        );

        fixes.push({
          number: item.number,
          action: "update-status",
          success,
          error: success ? undefined : "Failed to update project status",
        });

        if (success) {
          logger.success(`Updated #${item.number} status to Done`);
        } else {
          logger.error(`Failed to update #${item.number} status`);
        }
      }
    }
  }

  // 3b. Metrics check (#342) - if metrics enabled, detect missing timestamps and stale issues
  const metricsConfig = getMetricsConfig(config);
  if (metricsConfig.enabled) {
    logger.debug("Metrics check enabled");

    // Batch-fetch text field values per project
    const projectIds = new Set<string>();
    for (const issue of allIssues) {
      if (issue.projectId) projectIds.add(issue.projectId);
    }

    let allTextFieldValues: Record<string, Record<string, string>> = {};
    for (const pid of projectIds) {
      const values = fetchItemTextFieldValues(pid);
      allTextFieldValues = { ...allTextFieldValues, ...values };
    }

    // Classify metrics inconsistencies (pure function)
    const metricsIssues = classifyMetricsInconsistencies(
      allIssues,
      allTextFieldValues,
      metricsConfig
    );
    logger.debug(`Metrics inconsistencies: ${metricsIssues.length}`);

    // Add to main inconsistencies list
    inconsistencies.push(...metricsIssues);

    // Fix: backfill timestamps for Done issues missing Completed At
    if (options.fix && metricsIssues.length > 0) {
      const mapping = metricsConfig.statusToDateMapping ?? {};

      for (const item of metricsIssues) {
        if (!item.description.startsWith("Metrics: Missing")) continue;

        const issueData = allIssues.find((i) => i.number === item.number);
        if (!issueData?.projectItemId || !issueData?.projectId) continue;

        const completedAtField = mapping["Done"];
        if (!completedAtField) continue;

        const pf = getProjectFields(issueData.projectId);
        const fieldInfo = pf[completedAtField];
        if (!fieldInfo || fieldInfo.type !== "TEXT") continue;

        // Use closedAt if available, otherwise current timestamp
        const ts = issueData.closedAt ?? generateTimestamp();
        const success = updateTextField(
          issueData.projectId,
          issueData.projectItemId,
          fieldInfo.id,
          ts
        );

        fixes.push({
          number: item.number,
          action: "backfill-timestamp",
          success,
          error: success ? undefined : "Failed to set Text field",
        });

        if (success) {
          logger.success(`Backfilled ${completedAtField} for #${item.number} (${ts})`);
        } else {
          logger.error(`Failed to backfill ${completedAtField} for #${item.number}`);
        }
      }
    }
  }

  // 4. Check automation status (#250)
  let automationStatus: AutomationStatus | undefined;
  const projectId = getProjectId(owner);
  if (projectId) {
    const workflows = fetchWorkflows(projectId);
    if (workflows.length > 0) {
      const workflowSummary = workflows.map((w: ProjectWorkflow) => ({
        name: w.name,
        enabled: w.enabled,
        recommended: RECOMMENDED_WORKFLOWS.includes(w.name),
      }));
      const missingRecommended = workflowSummary
        .filter((w) => w.recommended && !w.enabled)
        .map((w) => w.name);

      automationStatus = {
        checked: true,
        workflows: workflowSummary,
        missing_recommended: missingRecommended,
      };

      if (missingRecommended.length > 0) {
        logger.warn(
          `Recommended automations disabled: ${missingRecommended.join(", ")}`
        );
        logger.info(
          "Enable via: GitHub Project Settings > Workflows"
        );
      } else {
        logger.debug("All recommended automations are enabled");
      }
    }
  }

  // 5. Build output
  const output: CheckOutput = {
    repository: `${owner}/${repo}`,
    inconsistencies,
    fixes,
    automations: automationStatus,
    summary: {
      total_checked: allIssues.length,
      total_inconsistencies: inconsistencies.length,
      errors: inconsistencies.filter((i) => i.severity === "error").length,
      info: inconsistencies.filter((i) => i.severity === "info").length,
      fixed: fixes.filter((f) => f.success).length,
      fix_failures: fixes.filter((f) => !f.success).length,
    },
  };

  console.log(JSON.stringify(output, null, 2));

  // Exit code 1 if: unfixed inconsistencies remain, or fix attempts failed
  if (output.summary.fix_failures > 0) return 1;
  if (!options.fix && output.summary.errors > 0) return 1;
  return 0;
}

// =============================================================================
// Main Command Handler
// =============================================================================

export async function sessionCommand(
  action: string,
  options: SessionOptions
): Promise<void> {
  const logger = createLogger(options.verbose);

  logger.debug(`Action: ${action}`);
  logger.debug(`Owner: ${options.owner ?? "(auto)"}`);

  let exitCode = 0;

  switch (action) {
    case "start":
      exitCode = await cmdStart(options, logger);
      break;

    case "end":
      exitCode = await cmdEnd(options, logger);
      break;

    case "check":
      exitCode = await cmdCheck(options, logger);
      break;

    default:
      logger.error(`Unknown action: ${action}`);
      logger.info("Available actions: start, end, check");
      exitCode = 1;
  }

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
