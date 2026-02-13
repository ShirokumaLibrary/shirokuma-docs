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
 *
 * Key design:
 * - Issues provide: #number references, comments, PR links
 * - Projects provide: Status/Priority/Type/Size field management
 * - This command unifies both for a seamless experience
 */

import { createLogger, Logger } from "../utils/logger.js";
import {
  runGhCommand,
  runGraphQL,
  getOwner,
  getRepoName,
  getRepoInfo,
  validateTitle,
  validateBody,
  isIssueNumber,
  parseIssueNumber,
  GhResult,
} from "../utils/github.js";
import {
  cmdPrComments,
  cmdMerge,
  cmdPrReply,
  cmdResolve,
} from "./issues-pr.js";
import { loadGhConfig, getDefaultLimit, getDefaultStatus } from "../utils/gh-config.js";
import {
  formatOutput,
  OutputFormat,
  GH_ISSUES_LIST_COLUMNS,
} from "../utils/formatters.js";
import {
  resolveTargetRepo,
  detectCurrentRepoPair,
  parseRepoFullName,
  validateCrossRepoAlias,
} from "../utils/repo-pairs.js";
import {
  FIELD_FALLBACKS,
  resolveFieldName,
  getProjectFields,
  updateTextField,
  setItemFields,
  generateTimestamp,
  autoSetTimestamps,
  addItemToProject,
  type ProjectField,
  type ProjectFieldType,
} from "../utils/project-fields.js";

// Re-exports for backward compatibility (issues-pr.ts, session.ts)
export {
  FIELD_FALLBACKS,
  resolveFieldName,
  getProjectFields,
  updateTextField,
  setItemFields,
  generateTimestamp,
  autoSetTimestamps,
  addItemToProject,
  type ProjectField,
  type ProjectFieldType,
};

// =============================================================================
// Types
// =============================================================================

export interface IssuesOptions {
  owner?: string;
  verbose?: boolean;
  // Filters for list
  all?: boolean;
  status?: string[];
  state?: string; // open, closed, all
  labels?: string[];
  limit?: number;
  // Output format
  format?: OutputFormat;
  // Fields for create/update
  fieldStatus?: string;
  priority?: string;
  type?: string;
  size?: string;
  title?: string;
  body?: string;
  // Label management
  addLabel?: string[];
  removeLabel?: string[];
  // Close options
  stateReason?: string;
  // Merge options
  squash?: boolean;
  merge?: boolean;
  rebase?: boolean;
  deleteBranch?: boolean;
  head?: string;
  // Reply/resolve options
  replyTo?: string;
  threadId?: string;
  // Repo pair flags
  public?: boolean;
  repo?: string;
  fromPublic?: string;
  syncPublic?: boolean;
}

interface IssueWithProjects {
  number: number;
  title: string;
  body?: string;
  url: string;
  state: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
  // Projects fields (if linked)
  projectItemId?: string;
  status?: string;
  priority?: string;
  type?: string;
  size?: string;
}

// =============================================================================
// GraphQL Queries
// =============================================================================

// Note: We don't use $states variable because gh CLI has issues with GraphQL enum arrays
// Instead, we filter by state client-side
const GRAPHQL_QUERY_ISSUES_WITH_PROJECTS = `
query($owner: String!, $name: String!, $first: Int!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    issues(first: $first, after: $cursor, orderBy: {field: CREATED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number
        title
        url
        state
        createdAt
        updatedAt
        labels(first: 10) {
          nodes { name }
        }
        projectItems(first: 5) {
          nodes {
            id
            project { title }
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

const GRAPHQL_QUERY_ISSUE_DETAIL = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      number
      title
      body
      url
      state
      createdAt
      updatedAt
      labels(first: 20) {
        nodes { name }
      }
      projectItems(first: 5) {
        nodes {
          id
          project { id title }
          status: fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
          }
          priority: fieldValueByName(name: "Priority") {
            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
          }
          type: fieldValueByName(name: "Type") {
            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
          }
          itemType: fieldValueByName(name: "Item Type") {
            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
          }
          size: fieldValueByName(name: "Size") {
            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
          }
        }
      }
    }
  }
}
`;

const GRAPHQL_QUERY_REPO_ID = `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    id
  }
}
`;

const GRAPHQL_QUERY_LABELS = `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    labels(first: 50) {
      nodes { id name }
    }
  }
}
`;

const GRAPHQL_MUTATION_CREATE_ISSUE = `
mutation($repositoryId: ID!, $title: String!, $body: String, $labelIds: [ID!]) {
  createIssue(input: {repositoryId: $repositoryId, title: $title, body: $body, labelIds: $labelIds}) {
    issue { id number url title }
  }
}
`;

const GRAPHQL_MUTATION_UPDATE_ISSUE = `
mutation($id: ID!, $title: String, $body: String) {
  updateIssue(input: {id: $id, title: $title, body: $body}) {
    issue { id number title body }
  }
}
`;

const GRAPHQL_MUTATION_ADD_COMMENT = `
mutation($subjectId: ID!, $body: String!) {
  addComment(input: {subjectId: $subjectId, body: $body}) {
    commentEdge {
      node { id databaseId url }
    }
  }
}
`;

const GRAPHQL_MUTATION_CLOSE_ISSUE = `
mutation($issueId: ID!, $stateReason: IssueClosedStateReason) {
  closeIssue(input: {issueId: $issueId, stateReason: $stateReason}) {
    issue { id number state }
  }
}
`;

const GRAPHQL_MUTATION_REOPEN_ISSUE = `
mutation($issueId: ID!) {
  reopenIssue(input: {issueId: $issueId}) {
    issue { id number state }
  }
}
`;

const GRAPHQL_MUTATION_ADD_LABELS = `
mutation($labelableId: ID!, $labelIds: [ID!]!) {
  addLabelsToLabelable(input: {labelableId: $labelableId, labelIds: $labelIds}) {
    labelable { ... on Issue { id number labels(first: 20) { nodes { name } } } }
  }
}
`;

const GRAPHQL_MUTATION_REMOVE_LABELS = `
mutation($labelableId: ID!, $labelIds: [ID!]!) {
  removeLabelsFromLabelable(input: {labelableId: $labelableId, labelIds: $labelIds}) {
    labelable { ... on Issue { id number labels(first: 20) { nodes { name } } } }
  }
}
`;

const GRAPHQL_QUERY_ISSUE_ID = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      id
    }
  }
}
`;

const GRAPHQL_QUERY_PR_ID = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      id
    }
  }
}
`;

const GRAPHQL_MUTATION_DELETE_ITEM = `
mutation($projectId: ID!, $itemId: ID!) {
  deleteProjectV2Item(input: {projectId: $projectId, itemId: $itemId}) {
    deletedItemId
  }
}
`;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get project ID by name (defaults to repository name)
 */
export function getProjectId(owner: string, projectName?: string): string | null {
  const targetName = projectName || getRepoName();
  if (!targetName) return null;

  const result = runGhCommand<{ projects: Array<{ id: string; title: string }> }>(
    ["project", "list", "--owner", owner, "--format", "json"],
    { silent: true }
  );

  if (!result.success || !result.data?.projects) return null;

  for (const project of result.data.projects) {
    if (project.title === targetName) {
      return project.id;
    }
  }

  return result.data.projects[0]?.id ?? null;
}

/**
 * Get repository ID
 */
function getRepoId(owner: string, repo: string): string | null {
  interface QueryResult {
    data?: { repository?: { id?: string } };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_REPO_ID, { owner, name: repo });
  if (!result.success) return null;
  return result.data?.data?.repository?.id ?? null;
}

/**
 * Get issue GraphQL ID by number
 */
export function getIssueId(owner: string, repo: string, number: number): string | null {
  interface QueryResult {
    data?: { repository?: { issue?: { id?: string } } };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_ISSUE_ID, { owner, name: repo, number });
  if (!result.success) return null;
  return result.data?.data?.repository?.issue?.id ?? null;
}

/**
 * Get pull request GraphQL ID by number
 */
export function getPullRequestId(owner: string, repo: string, number: number): string | null {
  interface QueryResult {
    data?: { repository?: { pullRequest?: { id?: string } } };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_PR_ID, { owner, name: repo, number });
  if (!result.success) return null;
  return result.data?.data?.repository?.pullRequest?.id ?? null;
}

/**
 * Get repository labels
 */
function getLabels(owner: string, repo: string): Record<string, string> {
  interface QueryResult {
    data?: {
      repository?: {
        labels?: { nodes?: Array<{ id: string; name: string }> };
      };
    };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_LABELS, { owner, name: repo });
  if (!result.success) return {};

  const labels: Record<string, string> = {};
  const nodes = result.data?.data?.repository?.labels?.nodes ?? [];
  for (const node of nodes) {
    if (node?.name && node?.id) {
      labels[node.name] = node.id;
    }
  }
  return labels;
}

// =============================================================================
// Subcommand Handlers
// =============================================================================

/**
 * list subcommand
 */
async function cmdList(
  options: IssuesOptions,
  logger: Logger
): Promise<number> {
  const repoInfo = resolveTargetRepo(options);
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  // Load config for defaults
  const config = loadGhConfig();

  const { owner, name: repo } = repoInfo;
  const projectName = repo; // Project name = repo name convention

  // Map state option for client-side filtering
  // --all is shortcut for --state all
  const stateFilter = options.all ? "all" : (options.state ?? "open");

  interface IssueNode {
    number?: number;
    title?: string;
    url?: string;
    state?: string;
    createdAt?: string;
    updatedAt?: string;
    labels?: { nodes?: Array<{ name?: string }> };
    projectItems?: {
      nodes?: Array<{
        id?: string;
        project?: { title?: string };
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

  const allIssues: IssueWithProjects[] = [];
  let cursor: string | null = null;
  const limit = options.limit ?? getDefaultLimit(config);

  while (allIssues.length < limit) {
    const remaining = limit - allIssues.length;
    const fetchCount = Math.min(remaining, 50);

    const result: GhResult<QueryResult> = runGraphQL<QueryResult>(
      GRAPHQL_QUERY_ISSUES_WITH_PROJECTS,
      {
        owner,
        name: repo,
        first: fetchCount,
        cursor: cursor,
      }
    );

    if (!result.success || !result.data?.data?.repository?.issues) break;

    const issuesData: NonNullable<NonNullable<NonNullable<QueryResult["data"]>["repository"]>["issues"]> =
      result.data.data.repository.issues;
    const nodes: IssueNode[] = issuesData.nodes ?? [];

    for (const node of nodes) {
      if (!node?.number) continue;

      // Client-side state filter
      const nodeState = node.state ?? "OPEN";
      if (stateFilter === "open" && nodeState !== "OPEN") continue;
      if (stateFilter === "closed" && nodeState !== "CLOSED") continue;
      // stateFilter === "all" means no filtering

      // Find project item for our project
      type ProjectItemNode = NonNullable<NonNullable<IssueNode["projectItems"]>["nodes"]>[number];
      const projectItems: ProjectItemNode[] = node.projectItems?.nodes ?? [];
      const matchingItem = projectItems.find((p: ProjectItemNode) => p?.project?.title === projectName);

      type LabelNode = NonNullable<NonNullable<IssueNode["labels"]>["nodes"]>[number];
      const labelNodes: LabelNode[] = node.labels?.nodes ?? [];
      const issueLabels = labelNodes.map((l: LabelNode) => l?.name ?? "").filter(Boolean);

      // Client-side label filter
      if (options.labels && options.labels.length > 0) {
        const hasAllLabels = options.labels.every((label) => issueLabels.includes(label));
        if (!hasAllLabels) continue;
      }

      const issue: IssueWithProjects = {
        number: node.number,
        title: node.title ?? "",
        url: node.url ?? "",
        state: nodeState,
        labels: issueLabels,
        createdAt: node.createdAt ?? "",
        updatedAt: node.updatedAt ?? "",
        projectItemId: matchingItem?.id,
        status: matchingItem?.status?.name,
        priority: matchingItem?.priority?.name,
        type: matchingItem?.type?.name ?? matchingItem?.itemType?.name,
        size: matchingItem?.size?.name,
      };

      allIssues.push(issue);
    }

    const pageInfo = issuesData.pageInfo ?? {};
    if (!pageInfo.hasNextPage) break;
    cursor = pageInfo.endCursor ?? null;
  }

  // Apply status filter (from Projects) if specified
  let filteredIssues = allIssues;
  if (options.status && options.status.length > 0) {
    filteredIssues = allIssues.filter((i) => options.status!.includes(i.status ?? ""));
  }
  // Note: state filter (open/closed/all) is applied client-side during fetch
  // Done/Released items are typically closed, so --state open (default) excludes them

  const output = {
    repository: `${owner}/${repo}`,
    issues: filteredIssues.map((i) => ({
      number: i.number,
      title: i.title,
      url: i.url,
      state: i.state,
      labels: i.labels,
      status: i.status,
      priority: i.priority,
      type: i.type,
      size: i.size,
      project_item_id: i.projectItemId,
    })),
    total_count: filteredIssues.length,
  };

  const outputFormat = options.format ?? "json";
  const formatted = formatOutput(output, outputFormat, {
    arrayKey: "issues",
    columns: GH_ISSUES_LIST_COLUMNS,
  });
  console.log(formatted);
  return 0;
}

/**
 * get subcommand
 */
async function cmdGet(
  issueNumberStr: string,
  options: IssuesOptions,
  logger: Logger
): Promise<number> {
  const repoInfo = resolveTargetRepo(options);
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner, name: repo } = repoInfo;
  const issueNumber = parseIssueNumber(issueNumberStr);
  const projectName = repo;

  interface IssueNode {
    number?: number;
    title?: string;
    body?: string;
    url?: string;
    state?: string;
    createdAt?: string;
    updatedAt?: string;
    labels?: { nodes?: Array<{ name?: string }> };
    projectItems?: {
      nodes?: Array<{
        id?: string;
        project?: { id?: string; title?: string };
        status?: { name?: string; optionId?: string };
        priority?: { name?: string; optionId?: string };
        type?: { name?: string; optionId?: string };
        itemType?: { name?: string; optionId?: string };
        size?: { name?: string; optionId?: string };
      }>;
    };
  }

  interface QueryResult {
    data?: {
      repository?: {
        issue?: IssueNode;
      };
    };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_ISSUE_DETAIL, {
    owner,
    name: repo,
    number: issueNumber,
  });

  if (!result.success || !result.data?.data?.repository?.issue) {
    logger.error(`Issue #${issueNumber} not found`);
    return 1;
  }

  const node = result.data.data.repository.issue;
  const projectItems = node.projectItems?.nodes ?? [];
  const matchingItem = projectItems.find((p) => p?.project?.title === projectName);

  // Merge "Type" and "Item Type" fields (GitHub reserves "Type" name)
  const typeField = matchingItem?.type ?? matchingItem?.itemType;

  const output = {
    number: node.number,
    title: node.title,
    body: node.body,
    url: node.url,
    state: node.state,
    labels: (node.labels?.nodes ?? []).map((l) => l?.name ?? "").filter(Boolean),
    created_at: node.createdAt,
    updated_at: node.updatedAt,
    // Projects fields
    project_item_id: matchingItem?.id,
    project_id: matchingItem?.project?.id,
    status: matchingItem?.status?.name,
    status_option_id: matchingItem?.status?.optionId,
    priority: matchingItem?.priority?.name,
    priority_option_id: matchingItem?.priority?.optionId,
    type: typeField?.name,
    type_option_id: typeField?.optionId,
    size: matchingItem?.size?.name,
    size_option_id: matchingItem?.size?.optionId,
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

/**
 * create subcommand
 */
async function cmdCreate(
  options: IssuesOptions,
  logger: Logger
): Promise<number> {
  // Validation
  if (!options.title) {
    logger.error("--title is required");
    return 1;
  }

  const titleError = validateTitle(options.title);
  if (titleError) {
    logger.error(titleError);
    return 1;
  }

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

  // Get repository ID
  const repoId = getRepoId(owner, repo);
  if (!repoId) {
    logger.error("Could not get repository ID");
    return 1;
  }

  // Resolve label names to IDs
  let labelIds: string[] | null = null;
  if (options.labels && options.labels.length > 0) {
    const allLabels = getLabels(owner, repo);
    labelIds = [];
    for (const labelName of options.labels) {
      if (allLabels[labelName]) {
        labelIds.push(allLabels[labelName]);
      } else {
        logger.warn(`Label '${labelName}' not found`);
      }
    }
  }

  // Create the Issue
  interface CreateResult {
    data?: {
      createIssue?: {
        issue?: { id?: string; number?: number; url?: string; title?: string };
      };
    };
  }

  const createResult = runGraphQL<CreateResult>(GRAPHQL_MUTATION_CREATE_ISSUE, {
    repositoryId: repoId,
    title: options.title,
    body: options.body ?? "",
    labelIds: labelIds ?? null,
  });

  if (!createResult.success) {
    logger.error("Failed to create issue");
    return 1;
  }

  const issue = createResult.data?.data?.createIssue?.issue;
  if (!issue?.id || !issue?.number) {
    logger.error("Failed to create issue");
    return 1;
  }

  logger.success(`Created issue #${issue.number}`);

  // Always add to project and set default Status if not explicitly provided.
  // --status is array (for list filtering), --field-status is string (for setting)
  // Accept --status as fallback when --field-status is not provided
  const createStatusValue = options.fieldStatus ?? options.status?.[0] ?? getDefaultStatus();

  let projectItemId: string | null = null;

  const projectId = getProjectId(owner, repo);
  if (!projectId) {
    logger.warn("No project found. Issue created but not added to project.");
  } else {
    projectItemId = addItemToProject(projectId, issue.id, logger);
    if (projectItemId) {
      logger.success("Added to project");

      // Set project fields
      const fields: Record<string, string> = {};
      if (createStatusValue) fields["Status"] = createStatusValue;
      if (options.priority) fields["Priority"] = options.priority;
      if (options.type) fields["Type"] = options.type;
      if (options.size) fields["Size"] = options.size;

      if (Object.keys(fields).length > 0) {
        setItemFields(projectId, projectItemId, fields, logger);
      }
    } else {
      logger.warn("Failed to add to project");
    }
  }

  // Warn about missing fields (field completeness check)
  const missingFields: string[] = [];
  if (!options.priority) missingFields.push("Priority");
  if (!options.type) missingFields.push("Type");
  if (!options.size) missingFields.push("Size");
  if (missingFields.length > 0) {
    logger.warn(
      `Issue #${issue.number} created without: ${missingFields.join(", ")}. ` +
      `Consider setting them with: shirokuma-docs issues update ${issue.number} ` +
      missingFields.map((f) => `--${f.toLowerCase()} <value>`).join(" ")
    );
  }

  // Output created issue info
  const output = {
    number: issue.number,
    title: issue.title,
    url: issue.url,
    project_item_id: projectItemId,
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

/**
 * update subcommand
 */
async function cmdUpdate(
  issueNumberStr: string,
  options: IssuesOptions,
  logger: Logger
): Promise<number> {
  const repoInfo = resolveTargetRepo(options);
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner, name: repo } = repoInfo;
  const issueNumber = parseIssueNumber(issueNumberStr);

  // Get issue details first
  interface IssueNode {
    number?: number;
    title?: string;
    body?: string;
    projectItems?: {
      nodes?: Array<{
        id?: string;
        project?: { id?: string; title?: string };
      }>;
    };
  }

  interface QueryResult {
    data?: {
      repository?: {
        issue?: IssueNode;
      };
    };
  }

  const getResult = runGraphQL<QueryResult>(GRAPHQL_QUERY_ISSUE_DETAIL, {
    owner,
    name: repo,
    number: issueNumber,
  });

  if (!getResult.success || !getResult.data?.data?.repository?.issue) {
    logger.error(`Issue #${issueNumber} not found`);
    return 1;
  }

  const issueNode = getResult.data.data.repository.issue;
  const projectName = repo;
  const projectItems = issueNode.projectItems?.nodes ?? [];
  const matchingItem = projectItems.find((p) => p?.project?.title === projectName);

  let updated = false;

  // Update issue fields (title, body)
  if (options.title !== undefined || options.body !== undefined) {
    const issueId = getIssueId(owner, repo, issueNumber);
    if (issueId) {
      const updateResult = runGraphQL(GRAPHQL_MUTATION_UPDATE_ISSUE, {
        id: issueId,
        title: options.title !== undefined ? options.title : (issueNode.title ?? ""),
        body: options.body !== undefined ? options.body : (issueNode.body ?? ""),
      });
      if (updateResult.success) {
        updated = true;
        logger.success("Updated issue");
      }
    }
  }

  // Update labels
  if (
    (options.addLabel && options.addLabel.length > 0) ||
    (options.removeLabel && options.removeLabel.length > 0)
  ) {
    const issueId = getIssueId(owner, repo, issueNumber);
    if (issueId) {
      const allLabels = getLabels(owner, repo);

      // Add labels
      if (options.addLabel && options.addLabel.length > 0) {
        const addIds: string[] = [];
        for (const name of options.addLabel) {
          if (allLabels[name]) {
            addIds.push(allLabels[name]);
          } else {
            logger.warn(`Label '${name}' not found`);
          }
        }
        if (addIds.length > 0) {
          const addResult = runGraphQL(GRAPHQL_MUTATION_ADD_LABELS, {
            labelableId: issueId,
            labelIds: addIds,
          });
          if (addResult.success) {
            updated = true;
            logger.success(`Added ${addIds.length} label(s)`);
          }
        }
      }

      // Remove labels
      if (options.removeLabel && options.removeLabel.length > 0) {
        const removeIds: string[] = [];
        for (const name of options.removeLabel) {
          if (allLabels[name]) {
            removeIds.push(allLabels[name]);
          } else {
            logger.warn(`Label '${name}' not found`);
          }
        }
        if (removeIds.length > 0) {
          const removeResult = runGraphQL(GRAPHQL_MUTATION_REMOVE_LABELS, {
            labelableId: issueId,
            labelIds: removeIds,
          });
          if (removeResult.success) {
            updated = true;
            logger.success(`Removed ${removeIds.length} label(s)`);
          }
        }
      }
    }
  }

  // Update project fields
  // --status is array (for list filtering), --field-status is string (for setting)
  // Accept --status as fallback when --field-status is not provided
  const statusValue = options.fieldStatus ?? options.status?.[0];
  const fields: Record<string, string> = {};
  if (statusValue) fields["Status"] = statusValue;
  if (options.priority) fields["Priority"] = options.priority;
  if (options.type) fields["Type"] = options.type;
  if (options.size) fields["Size"] = options.size;

  if (Object.keys(fields).length > 0) {
    if (matchingItem?.id && matchingItem?.project?.id) {
      const pId = matchingItem.project.id;
      const iId = matchingItem.id;
      const pf = getProjectFields(pId);
      const count = setItemFields(pId, iId, fields, logger, pf);
      if (count > 0) {
        updated = true;
        logger.success(`Updated ${count} project field(s)`);
      }
      // Auto-set timestamp when Status changes (#342) - reuse fetched fields
      if (statusValue) {
        autoSetTimestamps(pId, iId, statusValue, pf, logger);
      }
    } else {
      // Issue not in project, add it first
      const projectId = getProjectId(owner, repo);
      if (projectId) {
        const issueId = getIssueId(owner, repo, issueNumber);
        if (issueId) {
          const itemId = addItemToProject(projectId, issueId, logger);
          if (itemId) {
            logger.success("Added to project");
            const pf = getProjectFields(projectId);
            const count = setItemFields(projectId, itemId, fields, logger, pf);
            if (count > 0) {
              updated = true;
              logger.success(`Updated ${count} project field(s)`);
            }
            // Auto-set timestamp when Status changes (#342) - reuse fetched fields
            if (statusValue) {
              autoSetTimestamps(projectId, itemId, statusValue, pf, logger);
            }
          }
        }
      } else {
        logger.warn("No project found. Cannot update project fields.");
      }
    }
  }

  if (!updated) {
    logger.info("No changes made");
  }

  // Output updated issue info
  return cmdGet(issueNumberStr, options, logger);
}

/**
 * comment subcommand
 *
 * Supports both Issues and Pull Requests via ID fallback.
 * The addComment mutation accepts subjectId for both types.
 */
async function cmdComment(
  issueNumberStr: string,
  options: IssuesOptions,
  logger: Logger
): Promise<number> {
  if (!options.body) {
    logger.error("--body is required for comment");
    return 1;
  }

  const repoInfo = resolveTargetRepo(options);
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner, name: repo } = repoInfo;
  const number = parseIssueNumber(issueNumberStr);

  // Try Issue first, then fallback to PR (#353)
  let subjectId = getIssueId(owner, repo, number);
  let targetType: "issue" | "pull_request" = "issue";

  if (!subjectId) {
    subjectId = getPullRequestId(owner, repo, number);
    targetType = "pull_request";
  }

  if (!subjectId) {
    logger.error(`Issue or PR #${number} not found`);
    return 1;
  }

  // Add comment
  interface CommentResult {
    data?: {
      addComment?: {
        commentEdge?: {
          node?: { id?: string; databaseId?: number; url?: string };
        };
      };
    };
  }

  const result = runGraphQL<CommentResult>(GRAPHQL_MUTATION_ADD_COMMENT, {
    subjectId,
    body: options.body,
  });

  if (!result.success) {
    logger.error("Failed to add comment");
    return 1;
  }

  const comment = result.data?.data?.addComment?.commentEdge?.node;
  logger.success(`Added comment to #${number}`);

  const output = {
    issue_number: number,
    target_type: targetType,
    comment_id: comment?.id,
    comment_database_id: comment?.databaseId,
    comment_url: comment?.url,
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

/**
 * comment-edit subcommand (#375)
 *
 * Edit an existing comment using REST API.
 * Works for both Issue and PR comments (GitHub treats them identically).
 */
async function cmdCommentEdit(
  commentIdStr: string,
  options: IssuesOptions,
  logger: Logger
): Promise<number> {
  if (!options.body) {
    logger.error("--body is required for comment-edit");
    return 1;
  }

  const repoInfo = resolveTargetRepo(options);
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner, name: repo } = repoInfo;
  const commentId = parseInt(commentIdStr, 10);

  if (isNaN(commentId) || commentId <= 0) {
    logger.error(`Invalid comment ID: ${commentIdStr}`);
    return 1;
  }

  // REST API PATCH to edit comment
  const result = runGhCommand<{ html_url?: string }>(
    ["api", "-X", "PATCH", `repos/${owner}/${repo}/issues/comments/${commentId}`, "-f", `body=${options.body}`],
    { silent: true }
  );

  if (!result.success) {
    logger.error(`Failed to edit comment ${commentId}`);
    return 1;
  }

  const commentUrl = result.data?.html_url;
  logger.success(`Edited comment ${commentId}`);

  const output = {
    comment_id: commentId,
    comment_url: commentUrl,
    updated: true,
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

// =============================================================================
// Close / Reopen Issue
// =============================================================================

/**
 * close subcommand - Close an issue with optional comment.
 *
 * Supports:
 * - --body: Add a closing comment before closing
 * - --state-reason: COMPLETED (default) or NOT_PLANNED
 * - --repo: Cross-repo support
 */
async function cmdClose(
  issueNumberStr: string,
  options: IssuesOptions,
  logger: Logger
): Promise<number> {
  const repoInfo = resolveTargetRepo(options);
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner, name: repo } = repoInfo;
  const issueNumber = parseIssueNumber(issueNumberStr);

  // Get issue ID
  const issueId = getIssueId(owner, repo, issueNumber);
  if (!issueId) {
    logger.error(`Issue #${issueNumber} not found`);
    return 1;
  }

  // Add closing comment if --body is provided
  if (options.body) {
    const commentResult = runGraphQL<{
      data?: {
        addComment?: { commentEdge?: { node?: { id?: string } } };
      };
    }>(GRAPHQL_MUTATION_ADD_COMMENT, {
      subjectId: issueId,
      body: options.body,
    });

    if (commentResult.success) {
      logger.success(`Added closing comment to #${issueNumber}`);
    } else {
      logger.warn("Failed to add closing comment, proceeding with close");
    }
  }

  // Close the issue
  const stateReason = options.stateReason === "NOT_PLANNED" ? "NOT_PLANNED" : "COMPLETED";

  interface CloseResult {
    data?: {
      closeIssue?: {
        issue?: { id?: string; number?: number; state?: string };
      };
    };
  }

  const result = runGraphQL<CloseResult>(GRAPHQL_MUTATION_CLOSE_ISSUE, {
    issueId,
    stateReason,
  });

  if (!result.success) {
    logger.error(`Failed to close issue #${issueNumber}`);
    return 1;
  }

  logger.success(`Closed #${issueNumber} (${stateReason})`);

  // Auto-update project Status based on stateReason (#373)
  // Priority: --field-status > stateReason-based default
  const targetStatus = options.fieldStatus
    ? options.fieldStatus
    : stateReason === "NOT_PLANNED"
    ? "Not Planned"
    : "Done";

  let statusUpdated = false;
  const projectId = getProjectId(owner);
  if (projectId) {
    const detail = cmdGetIssueDetail(owner, repo, issueNumber);
    if (detail?.projectItemId) {
      const fields = getProjectFields(projectId);
      const fieldResult = setItemFields(
        projectId,
        detail.projectItemId,
        { Status: targetStatus },
        logger
      );
      if (fieldResult > 0) {
        statusUpdated = true;
        logger.success(`Issue #${issueNumber} → ${targetStatus}`);
        // Auto-set timestamp for Done status (#342)
        if (targetStatus === "Done") {
          autoSetTimestamps(projectId, detail.projectItemId, "Done", fields, logger);
        }
      }
    }
  }

  const output = {
    number: issueNumber,
    state: "CLOSED",
    stateReason,
    status: statusUpdated ? targetStatus : undefined,
    url: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

/**
 * reopen subcommand - Reopen a closed issue.
 */
async function cmdReopen(
  issueNumberStr: string,
  options: IssuesOptions,
  logger: Logger
): Promise<number> {
  const repoInfo = resolveTargetRepo(options);
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const { owner, name: repo } = repoInfo;
  const issueNumber = parseIssueNumber(issueNumberStr);

  const issueId = getIssueId(owner, repo, issueNumber);
  if (!issueId) {
    logger.error(`Issue #${issueNumber} not found`);
    return 1;
  }

  interface ReopenResult {
    data?: {
      reopenIssue?: {
        issue?: { id?: string; number?: number; state?: string };
      };
    };
  }

  const result = runGraphQL<ReopenResult>(GRAPHQL_MUTATION_REOPEN_ISSUE, {
    issueId,
  });

  if (!result.success) {
    logger.error(`Failed to reopen issue #${issueNumber}`);
    return 1;
  }

  logger.success(`Reopened #${issueNumber}`);

  const output = {
    number: issueNumber,
    state: "OPEN",
    url: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

// =============================================================================
// Import from Public Repo
// =============================================================================

/**
 * import subcommand - Import an issue from public repo to private repo.
 *
 * Workflow:
 * 1. Resolve current repo pair (private ← public)
 * 2. Fetch issue from public repo
 * 3. Create issue in private repo with cross-reference
 * 4. Add comment to public issue noting internal tracking
 */
async function cmdImport(
  options: IssuesOptions,
  logger: Logger
): Promise<number> {
  if (!options.fromPublic) {
    logger.error("--from-public <number> is required for import");
    logger.info("Usage: shirokuma-docs issues import --from-public 5");
    return 1;
  }

  const publicIssueNumber = parseIssueNumber(options.fromPublic);

  // Resolve private (current) and public repos from pair config
  const privateRepo = getRepoInfo();
  if (!privateRepo) {
    logger.error("Could not determine current repository");
    return 1;
  }

  const pair = detectCurrentRepoPair();
  if (!pair) {
    logger.error(
      "No repo pair found for current repository. Configure repoPairs in config."
    );
    return 1;
  }

  const publicRepoParsed = parseRepoFullName(pair.public);
  if (!publicRepoParsed) {
    logger.error(`Invalid public repo: ${pair.public}`);
    return 1;
  }

  logger.info(`Importing issue #${publicIssueNumber} from ${pair.public}`);

  // Fetch issue from public repo
  interface IssueNode {
    number?: number;
    title?: string;
    body?: string;
    url?: string;
    state?: string;
    labels?: { nodes?: Array<{ name?: string }> };
  }

  interface QueryResult {
    data?: {
      repository?: {
        issue?: IssueNode;
      };
    };
  }

  const fetchResult = runGraphQL<QueryResult>(GRAPHQL_QUERY_ISSUE_DETAIL, {
    owner: publicRepoParsed.owner,
    name: publicRepoParsed.name,
    number: publicIssueNumber,
  });

  if (!fetchResult.success || !fetchResult.data?.data?.repository?.issue) {
    logger.error(`Issue #${publicIssueNumber} not found in ${pair.public}`);
    return 1;
  }

  const publicIssue = fetchResult.data.data.repository.issue;
  const publicUrl = publicIssue.url ?? `https://github.com/${pair.public}/issues/${publicIssueNumber}`;

  // Create issue in private repo
  const importTitle = `[Public #${publicIssueNumber}] ${publicIssue.title ?? "Imported Issue"}`;
  const importBody = [
    `> Imported from public repo: ${publicUrl}`,
    "",
    "---",
    "",
    publicIssue.body ?? "",
  ].join("\n");

  const { owner, name: repo } = privateRepo;
  const repoId = getRepoId(owner, repo);
  if (!repoId) {
    logger.error("Could not get repository ID for private repo");
    return 1;
  }

  interface CreateResult {
    data?: {
      createIssue?: {
        issue?: { id?: string; number?: number; url?: string; title?: string };
      };
    };
  }

  const createResult = runGraphQL<CreateResult>(GRAPHQL_MUTATION_CREATE_ISSUE, {
    repositoryId: repoId,
    title: importTitle,
    body: importBody,
    labelIds: null,
  });

  if (!createResult.success) {
    logger.error("Failed to create issue in private repo");
    return 1;
  }

  const privateIssue = createResult.data?.data?.createIssue?.issue;
  if (!privateIssue?.number) {
    logger.error("Failed to create issue in private repo");
    return 1;
  }

  logger.success(`Created private issue #${privateIssue.number}`);

  // Always add imported issue to project with default Status
  const importStatusValue = options.fieldStatus ?? getDefaultStatus();
  const projectId = getProjectId(owner, repo);
  if (projectId && privateIssue.id) {
    const itemId = addItemToProject(projectId, privateIssue.id, logger);
    if (itemId) {
      logger.success("Added to project");
      const fields: Record<string, string> = {};
      if (importStatusValue) fields["Status"] = importStatusValue;
      if (options.priority) fields["Priority"] = options.priority;
      if (options.type) fields["Type"] = options.type;
      if (options.size) fields["Size"] = options.size;
      if (Object.keys(fields).length > 0) {
        setItemFields(projectId, itemId, fields, logger);
      }
    }
  }

  // Comment on public issue to note internal tracking
  const publicIssueId = getIssueId(publicRepoParsed.owner, publicRepoParsed.name, publicIssueNumber);
  if (publicIssueId) {
    const commentBody = `This issue is being tracked internally. Thank you for the report.`;
    runGraphQL(GRAPHQL_MUTATION_ADD_COMMENT, {
      subjectId: publicIssueId,
      body: commentBody,
    });
    logger.debug("Added tracking comment to public issue");
  }

  // Output
  const output = {
    private_issue: {
      number: privateIssue.number,
      title: privateIssue.title,
      url: privateIssue.url,
    },
    public_issue: {
      number: publicIssueNumber,
      url: publicUrl,
      repo: pair.public,
    },
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

/**
 * fields subcommand - Show project field definitions
 * (Migrated from projects fields)
 */
async function cmdFields(
  options: IssuesOptions,
  logger: Logger
): Promise<number> {
  const resolved = resolveTargetRepo(options);
  const repoInfo = getRepoInfo();
  const owner = resolved?.owner ?? options.owner ?? repoInfo?.owner;
  const repoName = resolved?.name ?? repoInfo?.name;
  if (!owner) {
    logger.error("Could not determine repository owner");
    return 1;
  }

  const projectId = getProjectId(owner, repoName ?? undefined);
  if (!projectId) {
    logger.error(`No project found for owner '${owner}'`);
    return 1;
  }

  const fields = getProjectFields(projectId);
  console.log(JSON.stringify(fields, null, 2));
  return 0;
}

/**
 * remove subcommand - Remove issue from project
 * (Migrated from projects delete)
 */
async function cmdRemove(
  target: string,
  options: IssuesOptions,
  logger: Logger
): Promise<number> {
  if (!isIssueNumber(target)) {
    logger.error("Issue number required");
    return 1;
  }

  const issueNumber = parseIssueNumber(target);
  const resolved = resolveTargetRepo(options);
  const repoInfo = getRepoInfo();
  const owner = resolved?.owner ?? options.owner ?? repoInfo?.owner;
  const repo = resolved?.name ?? repoInfo?.name;
  if (!owner) {
    logger.error("Could not determine repository owner");
    return 1;
  }
  if (!repo) {
    logger.error("Could not determine repository name");
    return 1;
  }

  const projectId = getProjectId(owner, repo);
  if (!projectId) {
    logger.error(`No project found for owner '${owner}'`);
    return 1;
  }

  // Find project item for this issue

  // Fetch the issue to find its project item ID
  const issueResult = cmdGetIssueDetail(owner, repo, issueNumber);
  if (!issueResult) {
    logger.error(`Issue #${issueNumber} not found`);
    return 1;
  }

  const projectItemId = issueResult.projectItemId;
  if (!projectItemId) {
    logger.error(`Issue #${issueNumber} is not in any project`);
    return 1;
  }

  // Remove from project
  const result = runGraphQL(GRAPHQL_MUTATION_DELETE_ITEM, {
    projectId,
    itemId: projectItemId,
  });

  if (result.success) {
    const output = {
      removed: true,
      issue_number: issueNumber,
      note: "Issue removed from project. Issue still exists.",
    };
    console.log(JSON.stringify(output, null, 2));
    return 0;
  } else {
    logger.error(`Failed to remove Issue #${issueNumber} from project`);
    return 1;
  }
}

/**
 * Issue の projectItemId と projectId を GraphQL で取得する
 */
export function cmdGetIssueDetail(
  owner: string,
  repo: string,
  issueNumber: number
): { projectItemId?: string; projectId?: string } | null {
  interface IssueNode {
    number?: number;
    projectItems?: {
      nodes?: Array<{
        id?: string;
        project?: { id?: string; title?: string };
      }>;
    };
  }

  interface QueryResult {
    data?: {
      repository?: {
        issue?: IssueNode;
      };
    };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_ISSUE_DETAIL, {
    owner,
    name: repo,
    number: issueNumber,
  });

  if (!result.success) return null;
  const issue = result.data?.data?.repository?.issue;
  if (!issue) return null;

  // Match by project name convention, fallback to first item
  const projectItems = issue.projectItems?.nodes ?? [];
  const projectItem = projectItems.find((p) => p?.project?.title === repo) ?? projectItems[0];
  return {
    projectItemId: projectItem?.id,
    projectId: projectItem?.project?.id,
  };
}

// =============================================================================
// Main Command Handler
// =============================================================================

/**
 * issues command handler
 */
export async function issuesCommand(
  action: string,
  target: string | undefined,
  options: IssuesOptions
): Promise<void> {
  const logger = createLogger(options.verbose);

  logger.debug(`Action: ${action}`);
  logger.debug(`Target: ${target ?? "(none)"}`);

  // Validate --repo alias early
  if (options.repo) {
    const aliasError = validateCrossRepoAlias(options.repo);
    if (aliasError) {
      logger.error(aliasError);
      process.exit(1);
    }
  }

  let exitCode = 0;

  switch (action) {
    case "list":
      exitCode = await cmdList(options, logger);
      break;

    case "show":
      if (!target) {
        logger.error("Issue number required");
        logger.info("Usage: shirokuma-docs issues show <number>");
        exitCode = 1;
      } else {
        exitCode = await cmdGet(target, options, logger);
      }
      break;

    case "create":
      exitCode = await cmdCreate(options, logger);
      break;

    case "update":
      if (!target) {
        logger.error("Issue number required");
        logger.info("Usage: shirokuma-docs issues update <number> --field-status ...");
        exitCode = 1;
      } else {
        exitCode = await cmdUpdate(target, options, logger);
      }
      break;

    case "comment":
      if (!target) {
        logger.error("Issue or PR number required");
        logger.info("Usage: shirokuma-docs issues comment <issue-or-pr-number> --body ...");
        exitCode = 1;
      } else {
        exitCode = await cmdComment(target, options, logger);
      }
      break;

    case "comment-edit":
      if (!target) {
        logger.error("Comment ID required");
        logger.info("Usage: shirokuma-docs issues comment-edit <comment-id> --body ...");
        exitCode = 1;
      } else {
        exitCode = await cmdCommentEdit(target, options, logger);
      }
      break;

    case "close":
      if (!target) {
        logger.error("Issue number required");
        logger.info(
          "Usage: shirokuma-docs issues close <number> [--body ...] [--state-reason COMPLETED|NOT_PLANNED]"
        );
        exitCode = 1;
      } else {
        exitCode = await cmdClose(target, options, logger);
      }
      break;

    case "cancel":
      if (!target) {
        logger.error("Issue number required");
        logger.info(
          "Usage: shirokuma-docs issues cancel <number> [--body ...]"
        );
        exitCode = 1;
      } else {
        // cancel = close with NOT_PLANNED reason (#373)
        exitCode = await cmdClose(target, { ...options, stateReason: "NOT_PLANNED" }, logger);
      }
      break;

    case "reopen":
      if (!target) {
        logger.error("Issue number required");
        logger.info("Usage: shirokuma-docs issues reopen <number>");
        exitCode = 1;
      } else {
        exitCode = await cmdReopen(target, options, logger);
      }
      break;

    case "import":
      exitCode = await cmdImport(options, logger);
      break;

    case "fields":
      exitCode = await cmdFields(options, logger);
      break;

    case "remove":
      if (!target) {
        logger.error("Issue number required");
        logger.info("Usage: shirokuma-docs issues remove <number>");
        exitCode = 1;
      } else {
        exitCode = await cmdRemove(target, options, logger);
      }
      break;

    case "pr-comments":
      if (!target) {
        logger.error("PR number required");
        logger.info("Usage: shirokuma-docs issues pr-comments <number>");
        exitCode = 1;
      } else {
        exitCode = await cmdPrComments(target, options, logger);
      }
      break;

    case "merge":
      if (!target && !options.head) {
        logger.error("PR number or --head <branch> required");
        logger.info(
          "Usage: shirokuma-docs issues merge <number> [--squash|--merge|--rebase]\n" +
          "       shirokuma-docs issues merge --head <branch>"
        );
        exitCode = 1;
      } else {
        exitCode = await cmdMerge(target, options, logger);
      }
      break;

    case "pr-reply":
      if (!target) {
        logger.error("PR number required");
        logger.info(
          "Usage: shirokuma-docs issues pr-reply <number> --reply-to <id> --body ..."
        );
        exitCode = 1;
      } else {
        exitCode = await cmdPrReply(target, options, logger);
      }
      break;

    case "resolve":
      if (!target) {
        logger.error("PR number required");
        logger.info(
          "Usage: shirokuma-docs issues resolve <number> --thread-id <id>"
        );
        exitCode = 1;
      } else {
        exitCode = await cmdResolve(target, options, logger);
      }
      break;

    default:
      logger.error(`Unknown action: ${action}`);
      logger.info(
        "Available actions: list, show, create, update, comment, comment-edit, close, cancel, reopen, import, fields, remove, pr-comments, merge, pr-reply, resolve"
      );
      exitCode = 1;
  }

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
