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

import { createLogger, Logger } from "../utils/logger.js";
import {
  runGraphQL,
  getOwner,
  getRepoName,
  getRepoInfo,
  diagnoseRepoFailure,
  validateTitle,
  validateBody,
  isIssueNumber,
  parseIssueNumber,
  GhResult,
} from "../utils/github.js";
import { getOctokit } from "../utils/octokit-client.js";
import { loadGhConfig, getMetricsConfig } from "../utils/gh-config.js";
import {
  formatOutput,
  OutputFormat,
  GH_PROJECTS_LIST_COLUMNS,
} from "../utils/formatters.js";
import {
  getProjectFields,
  setItemFields,
  updateSelectField,
  updateTextField,
  resolveFieldName,
  autoSetTimestamps,
  generateTimestamp,
  GRAPHQL_MUTATION_ADD_TO_PROJECT,
  type ProjectField,
  type ProjectFieldType,
} from "../utils/project-fields.js";
import {
  GRAPHQL_MUTATION_DELETE_ITEM,
  getRepoId,
} from "../utils/graphql-queries.js";
import {
  getProjectId,
  getOwnerNodeId,
  fetchWorkflows,
  RECOMMENDED_WORKFLOWS,
  type ProjectWorkflow,
} from "../utils/project-utils.js";

/** Default statuses to exclude when listing (typically completed items) */
const DEFAULT_EXCLUDE_STATUSES = ["Done", "Released"];

// =============================================================================
// Types
// =============================================================================

export interface ProjectsOptions {
  owner?: string;
  verbose?: boolean;
  all?: boolean;
  status?: string[];
  force?: boolean;
  // Output format
  format?: OutputFormat;
  // Field options for create/update
  fieldStatus?: string;
  priority?: string;
  size?: string;
  title?: string;
  bodyFile?: string;
}

interface ProjectInfo {
  id: string;
  title: string;
  owner: string;
}

interface ProjectItem {
  id: string;
  title: string | null;
  body?: string | null;
  status: string | null;
  statusOptionId?: string | null;
  priority: string | null;
  priorityOptionId?: string | null;
  size: string | null;
  sizeOptionId?: string | null;
  issueNumber: number | null;
  issueUrl?: string | null;
  draftIssueId?: string | null;
  project?: { id: string; title: string };
}

// ProjectFieldType and ProjectField imported from ../utils/project-fields.ts

// Re-export from project-utils (extracted for cross-file sharing)
export {
  getProjectId,
  fetchWorkflows,
  RECOMMENDED_WORKFLOWS,
  type ProjectWorkflow,
} from "../utils/project-utils.js";

const GRAPHQL_QUERY_LIST = `
query($projectId: ID!, $cursor: String) {
  node(id: $projectId) {
    ... on ProjectV2 {
      title
      items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          status: fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          priority: fieldValueByName(name: "Priority") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          size: fieldValueByName(name: "Size") {
            ... on ProjectV2ItemFieldSingleSelectValue { name }
          }
          content {
            ... on DraftIssue { title }
            ... on Issue { title number }
          }
        }
      }
    }
  }
}
`;

const GRAPHQL_QUERY_ITEM = `
query($itemId: ID!) {
  node(id: $itemId) {
    ... on ProjectV2Item {
      id
      status: fieldValueByName(name: "Status") {
        ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
      }
      priority: fieldValueByName(name: "Priority") {
        ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
      }
      size: fieldValueByName(name: "Size") {
        ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
      }
      content {
        ... on DraftIssue { id title body }
        ... on Issue { id title number body url }
      }
      project { id title }
    }
  }
}
`;

const GRAPHQL_MUTATION_CREATE = `
mutation($projectId: ID!, $title: String!, $body: String) {
  addProjectV2DraftIssue(input: {projectId: $projectId, title: $title, body: $body}) {
    projectItem { id }
  }
}
`;

const GRAPHQL_MUTATION_UPDATE_BODY = `
mutation($draftIssueId: ID!, $body: String!) {
  updateProjectV2DraftIssue(input: {draftIssueId: $draftIssueId, body: $body}) {
    draftIssue { id body }
  }
}
`;

const GRAPHQL_MUTATION_UPDATE_ISSUE = `
mutation($id: ID!, $body: String!) {
  updateIssue(input: {id: $id, body: $body}) {
    issue { id number title body }
  }
}
`;

const GRAPHQL_QUERY_ISSUE_BY_NUMBER = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      id
      number
      title
      body
      url
    }
  }
}
`;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Fetch all project items with pagination
 */
async function fetchAllItems(
  projectId: string
): Promise<{ title: string; items: ProjectItem[] }> {
  interface ItemNode {
    id?: string;
    status?: { name?: string };
    priority?: { name?: string };
    size?: { name?: string };
    content?: { title?: string; number?: number };
  }

  interface QueryResult {
    data?: {
      node?: {
        title?: string;
        items?: {
          pageInfo?: { hasNextPage?: boolean; endCursor?: string };
          nodes?: ItemNode[];
        };
      };
    };
  }

  const allItems: ProjectItem[] = [];
  let cursor: string | null = null;
  let projectTitle = "";

  while (true) {
    const result: GhResult<QueryResult> = await runGraphQL<QueryResult>(GRAPHQL_QUERY_LIST, {
      projectId,
      cursor: cursor ?? "null",
    });

    if (!result.success || !result.data?.data?.node) break;

    const node: NonNullable<NonNullable<QueryResult["data"]>["node"]> = result.data.data.node;
    projectTitle = node.title ?? "";

    const itemsData = node.items ?? { nodes: [], pageInfo: {} };
    const nodes: ItemNode[] = itemsData.nodes ?? [];

    for (const item of nodes) {
      if (!item?.id) continue;
      allItems.push({
        id: item.id,
        title: item.content?.title ?? null,
        status: item.status?.name ?? null,
        priority: item.priority?.name ?? null,
        size: item.size?.name ?? null,
        issueNumber: item.content?.number ?? null,
      });
    }

    const pageInfo = itemsData.pageInfo ?? {};
    if (!pageInfo.hasNextPage) break;
    cursor = pageInfo.endCursor ?? null;
  }

  return { title: projectTitle, items: allItems };
}

/**
 * Fetch a single project item by ID with full details
 */
async function fetchItem(itemId: string): Promise<ProjectItem | null> {
  interface ItemNode {
    id?: string;
    status?: { name?: string; optionId?: string };
    priority?: { name?: string; optionId?: string };
    size?: { name?: string; optionId?: string };
    content?: {
      id?: string;
      title?: string;
      body?: string;
      number?: number;
      url?: string;
    };
    project?: { id?: string; title?: string };
  }

  interface QueryResult {
    data?: {
      node?: ItemNode;
    };
  }

  const result = await runGraphQL<QueryResult>(GRAPHQL_QUERY_ITEM, { itemId });
  if (!result.success || !result.data?.data?.node) return null;

  const node = result.data.data.node;
  const content = node.content ?? {};
  const project = node.project ?? {};

  return {
    id: node.id ?? itemId,
    title: content.title ?? null,
    body: content.body ?? null,
    status: node.status?.name ?? null,
    statusOptionId: node.status?.optionId ?? null,
    priority: node.priority?.name ?? null,
    priorityOptionId: node.priority?.optionId ?? null,
    size: node.size?.name ?? null,
    sizeOptionId: node.size?.optionId ?? null,
    issueNumber: content.number ?? null,
    issueUrl: content.url ?? null,
    draftIssueId: content.number ? null : content.id ?? null,
    project: project.id ? { id: project.id, title: project.title ?? "" } : undefined,
  };
}

/**
 * Find project item by issue number
 */
async function findItemByIssueNumber(
  projectId: string,
  issueNumber: number
): Promise<{ id: string } | null> {
  const { items } = await fetchAllItems(projectId);
  for (const item of items) {
    if (item.issueNumber === issueNumber) {
      return { id: item.id };
    }
  }
  return null;
}

/**
 * Get issue by number
 */
async function getIssueByNumber(
  owner: string,
  repo: string,
  number: number
): Promise<{ id: string; number: number; title: string; body: string; url: string } | null> {
  interface QueryResult {
    data?: {
      repository?: {
        issue?: {
          id?: string;
          number?: number;
          title?: string;
          body?: string;
          url?: string;
        };
      };
    };
  }

  const result = await runGraphQL<QueryResult>(GRAPHQL_QUERY_ISSUE_BY_NUMBER, {
    owner,
    name: repo,
    number,
  });

  if (!result.success) return null;
  const issue = result.data?.data?.repository?.issue;
  if (!issue?.id) return null;

  return {
    id: issue.id,
    number: issue.number ?? number,
    title: issue.title ?? "",
    body: issue.body ?? "",
    url: issue.url ?? "",
  };
}

// =============================================================================
// Subcommand Handlers
// =============================================================================

/**
 * list subcommand
 */
async function cmdList(
  options: ProjectsOptions,
  logger: Logger
): Promise<number> {
  // Load config for defaults
  const config = loadGhConfig();

  const owner = options.owner || getOwner();
  if (!owner) {
    logger.error("Could not determine repository owner");
    return 1;
  }

  const projectId = await getProjectId(owner);
  if (!projectId) {
    logger.error(`No project found for owner '${owner}'`);
    return 1;
  }

  const { title: projectTitle, items } = await fetchAllItems(projectId);

  // Apply status filter
  // Default: exclude Done/Released unless --all or --status specified
  let filteredItems = items;
  if (options.status && options.status.length > 0) {
    filteredItems = items.filter((i) => options.status!.includes(i.status ?? ""));
  } else if (!options.all) {
    filteredItems = items.filter((i) => !DEFAULT_EXCLUDE_STATUSES.includes(i.status ?? ""));
  }

  const output = {
    project: { id: projectId, title: projectTitle, owner },
    items: filteredItems.map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status,
      priority: i.priority,
      size: i.size,
      issue_number: i.issueNumber,
    })),
    total_count: filteredItems.length,
  };

  const outputFormat = options.format ?? "json";
  const formatted = formatOutput(output, outputFormat, {
    arrayKey: "items",
    columns: GH_PROJECTS_LIST_COLUMNS,
  });
  console.log(formatted);
  return 0;
}

/**
 * get subcommand
 */
async function cmdGet(
  itemIdOrNumber: string,
  options: ProjectsOptions,
  logger: Logger
): Promise<number> {
  let itemId = itemIdOrNumber;

  // Support #number notation
  if (isIssueNumber(itemIdOrNumber)) {
    const issueNumber = parseIssueNumber(itemIdOrNumber);
    const owner = options.owner || getOwner();
    const repo = getRepoName();
    if (!owner || !repo) {
      logger.error("Could not determine repository");
      return 1;
    }

    const projectId = await getProjectId(owner);
    if (!projectId) {
      logger.error(`No project found for owner '${owner}'`);
      return 1;
    }

    const found = await findItemByIssueNumber(projectId, issueNumber);
    if (!found) {
      logger.error(`No project item found for Issue #${issueNumber}`);
      return 1;
    }
    itemId = found.id;
  }

  const item = await fetchItem(itemId);
  if (!item) {
    logger.error(`Item '${itemIdOrNumber}' not found`);
    return 1;
  }

  // Convert to snake_case for JSON output (consistency with Python version)
  const output = {
    id: item.id,
    title: item.title,
    body: item.body,
    status: item.status,
    status_option_id: item.statusOptionId,
    priority: item.priority,
    priority_option_id: item.priorityOptionId,
    size: item.size,
    size_option_id: item.sizeOptionId,
    issue_number: item.issueNumber,
    issue_url: item.issueUrl,
    draft_issue_id: item.draftIssueId,
    project: item.project,
  };

  console.log(JSON.stringify(output, null, 2));
  return 0;
}

/**
 * fields subcommand
 */
async function cmdFields(
  options: ProjectsOptions,
  logger: Logger
): Promise<number> {
  const owner = options.owner || getOwner();
  if (!owner) {
    logger.error("Could not determine repository owner");
    return 1;
  }

  const projectId = await getProjectId(owner);
  if (!projectId) {
    logger.error(`No project found for owner '${owner}'`);
    return 1;
  }

  const fields = await getProjectFields(projectId);
  console.log(JSON.stringify(fields, null, 2));
  return 0;
}

/**
 * create subcommand
 */
async function cmdCreate(
  options: ProjectsOptions,
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

  const bodyError = validateBody(options.bodyFile);
  if (bodyError) {
    logger.error(bodyError);
    return 1;
  }

  const owner = options.owner || getOwner();
  if (!owner) {
    logger.error("Could not determine repository owner");
    return 1;
  }

  const projectId = await getProjectId(owner);
  if (!projectId) {
    logger.error(`No project found for owner '${owner}'`);
    return 1;
  }

  // Create draft issue
  interface CreateResult {
    data?: {
      addProjectV2DraftIssue?: {
        projectItem?: { id?: string };
      };
    };
  }

  const result = await runGraphQL<CreateResult>(GRAPHQL_MUTATION_CREATE, {
    projectId,
    title: options.title,
    body: options.bodyFile ?? "",
  });

  if (!result.success) {
    logger.error("Failed to create item");
    return 1;
  }

  const itemId = result.data?.data?.addProjectV2DraftIssue?.projectItem?.id;
  if (!itemId) {
    logger.error("Failed to create item");
    return 1;
  }

  // Set fields if provided
  const fields: Record<string, string> = {};
  if (options.fieldStatus) fields["Status"] = options.fieldStatus;
  if (options.priority) fields["Priority"] = options.priority;
  if (options.size) fields["Size"] = options.size;

  if (Object.keys(fields).length > 0) {
    await setItemFields(projectId, itemId, fields, logger);
  }

  const item = await fetchItem(itemId);
  if (item) {
    const output = {
      id: item.id,
      title: item.title,
      status: item.status,
      priority: item.priority,
      size: item.size,
      issue_number: item.issueNumber,
      draft_issue_id: item.draftIssueId,
      project: item.project,
    };
    console.log(JSON.stringify(output, null, 2));
  }

  return 0;
}

/**
 * update subcommand
 */
async function cmdUpdate(
  itemIdOrNumber: string,
  options: ProjectsOptions,
  logger: Logger
): Promise<number> {
  // Validation
  const bodyError = validateBody(options.bodyFile);
  if (bodyError) {
    logger.error(bodyError);
    return 1;
  }

  let itemId = itemIdOrNumber;
  const owner = options.owner || getOwner();
  const repo = getRepoName();

  // Support #number notation
  if (isIssueNumber(itemIdOrNumber)) {
    const issueNumber = parseIssueNumber(itemIdOrNumber);
    if (!owner || !repo) {
      logger.error("Could not determine repository");
      return 1;
    }

    const projectId = await getProjectId(owner);
    if (!projectId) {
      logger.error(`No project found for owner '${owner}'`);
      return 1;
    }

    const found = await findItemByIssueNumber(projectId, issueNumber);
    if (!found) {
      logger.error(`No project item found for Issue #${issueNumber}`);
      return 1;
    }
    itemId = found.id;
  }

  let item = await fetchItem(itemId);
  if (!item) {
    logger.error(`Item '${itemIdOrNumber}' not found`);
    return 1;
  }

  const projectId = item.project?.id;
  if (!projectId) {
    logger.error("Could not determine project ID");
    return 1;
  }

  // Build fields dict from options
  const fields: Record<string, string> = {};
  if (options.fieldStatus) fields["Status"] = options.fieldStatus;
  if (options.priority) fields["Priority"] = options.priority;
  if (options.size) fields["Size"] = options.size;

  let updated = await setItemFields(projectId, itemId, fields, logger) > 0;

  // Update body if provided
  if (options.bodyFile !== undefined) {
    if (item.draftIssueId) {
      // DraftIssue body update
      const result = await runGraphQL(GRAPHQL_MUTATION_UPDATE_BODY, {
        draftIssueId: item.draftIssueId,
        body: options.bodyFile,
      });
      if (result.success) updated = true;
    } else if (item.issueNumber && owner && repo) {
      // Issue body update
      const issueData = await getIssueByNumber(owner, repo, item.issueNumber);
      if (issueData?.id) {
        const result = await runGraphQL(GRAPHQL_MUTATION_UPDATE_ISSUE, {
          id: issueData.id,
          body: options.bodyFile,
        });
        if (result.success) updated = true;
      } else {
        logger.warn("Cannot update Issue body (Issue not found)");
      }
    } else {
      logger.warn("Cannot update body (unknown content type)");
    }
  }

  if (updated) {
    item = await fetchItem(itemId);
  }

  if (item) {
    const output = {
      id: item.id,
      title: item.title,
      status: item.status,
      priority: item.priority,
      size: item.size,
      issue_number: item.issueNumber,
      draft_issue_id: item.draftIssueId,
      project: item.project,
    };
    console.log(JSON.stringify(output, null, 2));
  }

  return 0;
}

/**
 * delete subcommand
 */
async function cmdDelete(
  itemIdOrNumber: string,
  options: ProjectsOptions,
  logger: Logger
): Promise<number> {
  let itemId = itemIdOrNumber;
  const owner = options.owner || getOwner();
  const repo = getRepoName();

  // Support #number notation
  if (isIssueNumber(itemIdOrNumber)) {
    const issueNumber = parseIssueNumber(itemIdOrNumber);
    if (!owner || !repo) {
      logger.error("Could not determine repository");
      return 1;
    }

    const projectId = await getProjectId(owner);
    if (!projectId) {
      logger.error(`No project found for owner '${owner}'`);
      return 1;
    }

    const found = await findItemByIssueNumber(projectId, issueNumber);
    if (!found) {
      logger.error(`No project item found for Issue #${issueNumber}`);
      return 1;
    }
    itemId = found.id;
  }

  const item = await fetchItem(itemId);
  if (!item) {
    logger.error(`Item '${itemIdOrNumber}' not found`);
    return 1;
  }

  const projectId = item.project?.id;
  if (!projectId) {
    logger.error("Could not determine project ID");
    return 1;
  }

  const title = item.title ?? "Unknown";
  const issueNum = item.issueNumber;

  // Confirmation prompt (unless --force)
  if (!options.force) {
    const displayName = issueNum ? `#${issueNum} ${title}` : title;
    console.error(`About to remove from project: ${displayName}`);
    if (issueNum) {
      console.error("  Note: The Issue will NOT be deleted, only removed from project.");
    }

    // In Node.js we can't easily do interactive prompts in a portable way
    // For now, require --force flag
    logger.error("Use --force to confirm deletion");
    return 1;
  }

  // Delete from project
  const result = await runGraphQL(GRAPHQL_MUTATION_DELETE_ITEM, { projectId, itemId });

  if (result.success) {
    const output: Record<string, unknown> = {
      deleted: true,
      item_id: itemId,
      title,
    };
    if (issueNum) {
      output.issue_number = issueNum;
      output.note = "Item removed from project. Issue still exists.";
    }
    console.log(JSON.stringify(output, null, 2));
    return 0;
  } else {
    logger.error("Failed to delete item");
    return 1;
  }
}

/**
 * add-issue subcommand
 */
async function cmdAddIssue(
  issueNumberStr: string,
  options: ProjectsOptions,
  logger: Logger
): Promise<number> {
  const owner = options.owner || getOwner();
  const repo = getRepoName();
  if (!owner || !repo) {
    logger.error("Could not determine repository");
    return 1;
  }

  const projectId = await getProjectId(owner);
  if (!projectId) {
    logger.error(`No project found for owner '${owner}'`);
    return 1;
  }

  const issueNumber = parseIssueNumber(issueNumberStr);

  // Get Issue details
  const issue = await getIssueByNumber(owner, repo, issueNumber);
  if (!issue) {
    logger.error(`Issue #${issueNumber} not found`);
    return 1;
  }

  // Check if already in project
  const existing = await findItemByIssueNumber(projectId, issueNumber);
  if (existing) {
    logger.info(`Issue #${issueNumber} is already in the project`);
    const item = await fetchItem(existing.id);
    if (item) {
      const output = {
        id: item.id,
        title: item.title,
        status: item.status,
        priority: item.priority,
        size: item.size,
        issue_number: item.issueNumber,
        issue_url: item.issueUrl,
      };
      console.log(JSON.stringify(output, null, 2));
    }
    return 0;
  }

  // Add to project
  interface AddResult {
    data?: {
      addProjectV2ItemById?: {
        item?: { id?: string };
      };
    };
  }

  const result = await runGraphQL<AddResult>(GRAPHQL_MUTATION_ADD_TO_PROJECT, {
    projectId,
    contentId: issue.id,
  });

  if (!result.success) {
    logger.error(`Failed to add Issue #${issueNumber} to project`);
    return 1;
  }

  const itemId = result.data?.data?.addProjectV2ItemById?.item?.id;
  if (!itemId) {
    logger.error(`Failed to add Issue #${issueNumber} to project`);
    return 1;
  }

  // Set project fields
  const fields: Record<string, string> = {};
  if (options.fieldStatus) fields["Status"] = options.fieldStatus;
  if (options.priority) fields["Priority"] = options.priority;
  if (options.size) fields["Size"] = options.size;

  if (Object.keys(fields).length > 0) {
    await setItemFields(projectId, itemId, fields, logger);
  }

  const item = await fetchItem(itemId);
  if (item) {
    const output = {
      id: item.id,
      title: item.title,
      status: item.status,
      priority: item.priority,
      size: item.size,
      issue_number: item.issueNumber,
      issue_url: item.issueUrl,
    };
    console.log(JSON.stringify(output, null, 2));
  }

  return 0;
}

// =============================================================================
// Workflow helpers (#250) — fetchWorkflows/RECOMMENDED_WORKFLOWS は
// ../utils/project-utils.ts に移動。re-export 経由でアクセス可能。
// =============================================================================

/**
 * workflows subcommand - ビルトイン自動化の状態を表示
 */
async function cmdWorkflows(
  options: ProjectsOptions,
  logger: Logger
): Promise<number> {
  const owner = options.owner || getOwner();
  if (!owner) {
    logger.error("Could not determine repository owner");
    return 1;
  }

  const projectId = await getProjectId(owner);
  if (!projectId) {
    logger.error(`No project found for owner '${owner}'`);
    return 1;
  }

  const workflows = await fetchWorkflows(projectId);
  if (workflows.length === 0) {
    logger.warn("No workflows found or failed to fetch");
    return 1;
  }

  // 推奨ワークフローの有効/無効をチェック
  const disabledRecommended = workflows.filter(
    (w) => RECOMMENDED_WORKFLOWS.includes(w.name) && !w.enabled
  );

  const output = {
    project_id: projectId,
    workflows: workflows.map((w) => ({
      name: w.name,
      number: w.number,
      enabled: w.enabled,
      recommended: RECOMMENDED_WORKFLOWS.includes(w.name),
    })),
    recommendations: disabledRecommended.length > 0
      ? {
          message: "以下の推奨ワークフローが無効です。GitHub UI から有効化してください。",
          disabled: disabledRecommended.map((w) => w.name),
          settings_url: `https://github.com/orgs/${owner}/projects (Settings > Workflows)`,
        }
      : null,
  };

  console.log(JSON.stringify(output, null, 2));

  if (disabledRecommended.length > 0) {
    logger.warn(
      `${disabledRecommended.length} recommended workflow(s) disabled: ${disabledRecommended.map((w) => w.name).join(", ")}`
    );
    logger.info("Enable via: GitHub Project Settings > Workflows (API not supported)");
  }

  return 0;
}

// =============================================================================
// setup-metrics (#342)
// =============================================================================

/** Create a custom field in a project */
const GRAPHQL_MUTATION_CREATE_FIELD = `
mutation($projectId: ID!, $name: String!, $dataType: ProjectV2CustomFieldType!) {
  createProjectV2Field(input: {projectId: $projectId, name: $name, dataType: $dataType}) {
    projectV2Field {
      ... on ProjectV2Field { id name dataType }
    }
  }
}
`;

/**
 * Create Text fields for metrics tracking (idempotent).
 * Reads field names from metrics config, creates missing ones.
 */
async function cmdSetupMetrics(
  options: ProjectsOptions,
  logger: Logger
): Promise<number> {
  const config = loadGhConfig();
  const metricsConfig = getMetricsConfig(config);

  const owner = options.owner || getOwner();
  if (!owner) {
    logger.error("Could not determine repository owner");
    return 1;
  }

  const projectId = await getProjectId(owner);
  if (!projectId) {
    logger.error(`No project found for owner '${owner}'`);
    return 1;
  }

  // Get existing fields
  const existingFields = await getProjectFields(projectId);

  // Determine which text fields to create
  const dateFields = metricsConfig.dateFields ?? {};
  const fieldNames = Object.values(dateFields).filter(Boolean) as string[];

  const created: string[] = [];
  const existing: string[] = [];
  const failed: string[] = [];

  for (const fieldName of fieldNames) {
    if (existingFields[fieldName]) {
      const field = existingFields[fieldName];
      if (field.type === "TEXT") {
        existing.push(fieldName);
        logger.debug(`Field already exists: ${fieldName}`);
      } else {
        logger.warn(`Field '${fieldName}' exists but is type ${field.type}, expected TEXT`);
        failed.push(fieldName);
      }
      continue;
    }

    // Create text field
    const result = await runGraphQL(GRAPHQL_MUTATION_CREATE_FIELD, {
      projectId,
      name: fieldName,
      dataType: "TEXT",
    });

    if (result.success) {
      created.push(fieldName);
      logger.success(`Created Text field: ${fieldName}`);
    } else {
      failed.push(fieldName);
      logger.error(`Failed to create Text field: ${fieldName}`);
    }
  }

  // Output
  const output = {
    project_id: projectId,
    fields: { created, existing, failed },
    metrics_config: {
      enabled: metricsConfig.enabled,
      dateFields: metricsConfig.dateFields,
      statusToDateMapping: metricsConfig.statusToDateMapping,
    },
    next_steps: [
      ...(metricsConfig.enabled
        ? []
        : ["Set metrics.enabled: true in shirokuma-docs.config.yaml"]),
      "Timestamps are automatically set when status changes via 'issues update --field-status'",
      "Run 'session check --fix' to backfill timestamps for existing Done issues",
    ],
  };

  console.log(JSON.stringify(output, null, 2));
  return failed.length > 0 ? 1 : 0;
}

// =============================================================================
// setup (#591) - Port of setup-project.py
// =============================================================================

/** フィールド色定義（全言語共通） */
const FIELD_COLORS: Record<string, Record<string, string>> = {
  status: {
    Icebox: "GRAY", Backlog: "BLUE", Planning: "YELLOW", "Spec Review": "PINK",
    Ready: "GREEN", "In Progress": "YELLOW", Pending: "RED", Review: "PURPLE",
    Testing: "ORANGE", Done: "GREEN", "Not Planned": "GRAY", Released: "GREEN",
  },
  priority: {
    Critical: "RED", High: "ORANGE", Medium: "YELLOW", Low: "GRAY",
  },
  size: {
    XS: "GRAY", S: "GREEN", M: "YELLOW", L: "ORANGE", XL: "RED",
  },
};

/** 日付トラッキング用 TEXT フィールド */
const DATE_TEXT_FIELDS = [
  "Planning At", "Spec Review At", "In Progress At", "Review At", "Completed At",
];

/** ロケール辞書 */
const SETUP_LOCALES: Record<string, Record<string, Record<string, string>>> = {
  ja: {
    status: {
      Icebox: "アイデア・将来検討", Backlog: "やることリスト", Planning: "計画策定中",
      "Spec Review": "要件・仕様確認中", Ready: "着手可能", "In Progress": "作業中",
      Pending: "一時保留・ブロック中", Review: "レビュー待ち", Testing: "テスト中",
      Done: "完了", "Not Planned": "見送り・対応不要", Released: "リリース済み",
    },
    priority: { Critical: "緊急・最優先", High: "高優先度", Medium: "通常", Low: "低優先度" },
    size: { XS: "数分で完了", S: "1セッションで完了", M: "複数セッション", L: "1日以上", XL: "分割が必要" },
  },
  en: {
    status: {
      Icebox: "Ideas for future", Backlog: "To do list", Planning: "Planning in progress",
      "Spec Review": "Requirements review", Ready: "Ready to start", "In Progress": "Working on it",
      Pending: "Blocked", Review: "Awaiting review", Testing: "Testing",
      Done: "Completed", "Not Planned": "Explicitly not planned", Released: "Released",
    },
    priority: { Critical: "Urgent", High: "High priority", Medium: "Normal", Low: "Low priority" },
    size: { XS: "Minutes", S: "Single session", M: "Multiple sessions", L: "Full day+", XL: "Split needed" },
  },
};

/**
 * GraphQL の singleSelectOptions 配列を組み立てる
 */
function buildSingleSelectOptions(
  colors: Record<string, string>,
  descriptions: Record<string, string>,
): string {
  const items = Object.entries(colors).map(([name, color]) => {
    const desc = descriptions[name] ?? name;
    return `{name: "${name}", color: ${color}, description: "${desc}"}`;
  });
  return `[${items.join(", ")}]`;
}

/** setup サブコマンドのオプション */
interface SetupOptions extends ProjectsOptions {
  lang?: string;
  fieldId?: string;
  projectId?: string;
  statusOnly?: boolean;
  dryRun?: boolean;
}

/**
 * 定義済みオプションと既存オプションの差分を検出する。
 * ユニットテスト可能な純粋関数。
 */
export function detectOptionDiff(
  existingNames: string[],
  definedNames: string[],
): { missing: string[]; extra: string[] } {
  const existingSet = new Set(existingNames);
  const definedSet = new Set(definedNames);
  const missing = definedNames.filter(name => !existingSet.has(name));
  const extra = existingNames.filter(name => !definedSet.has(name));
  return { missing, extra };
}

/**
 * setup subcommand - Status/Priority/Size フィールドの初期設定
 */
async function cmdSetup(
  options: SetupOptions,
  logger: Logger,
): Promise<number> {
  const lang = options.lang ?? "en";
  const locale = SETUP_LOCALES[lang];
  if (!locale) {
    logger.error(`Unknown language: ${lang}. Available: ${Object.keys(SETUP_LOCALES).join(", ")}`);
    return 1;
  }

  const dryRun = options.dryRun ?? false;
  if (dryRun) {
    logger.info("[DRY RUN] プレビューモード（変更は実行されません）");
  }

  logger.info(`Language: ${lang}`);

  // プロジェクト ID を解決（--project-id 優先、なければ自動検出）
  let projectId = options.projectId ?? null;

  if (!projectId) {
    const owner = options.owner || getOwner();
    if (!owner) {
      logger.error("Could not determine repository owner. Use --owner or --project-id.");
      return 1;
    }
    projectId = await getProjectId(owner);
    if (!projectId) {
      logger.error(`No project found for owner '${owner}'. Use --project-id.`);
      return 1;
    }
  }

  // 全フィールドを1回取得して共有する
  const allFields = projectId ? await getProjectFields(projectId) : {};

  // Status フィールド ID を解決（--field-id 優先、なければ自動検出）
  let fieldId = options.fieldId ?? null;
  if (!fieldId && projectId) {
    const statusField = resolveFieldName("Status", allFields);
    if (statusField) {
      fieldId = allFields[statusField].id;
    }
  }

  // Status フィールド更新（差分検出付き）
  if (fieldId) {
    const statusFieldName = resolveFieldName("Status", allFields);
    const existingOptions = statusFieldName
      ? Object.keys(allFields[statusFieldName].options)
      : [];
    const definedOptions = Object.keys(FIELD_COLORS.status);
    const { missing, extra } = detectOptionDiff(existingOptions, definedOptions);

    if (existingOptions.length > 0 && missing.length === 0 && extra.length === 0) {
      // 差分なし → スキップ
      logger.info("\n[Status] Already up to date, skipped");
    } else if (existingOptions.length > 0 && missing.length < definedOptions.length && !options.force) {
      // 既存オプションあり + 差分あり + --force なし → 警告のみ
      logger.info("\n[Status] Options differ from definition:");
      if (missing.length > 0) {
        logger.warn(`  Missing: ${missing.join(", ")}`);
      }
      if (extra.length > 0) {
        logger.info(`  Extra (not in definition): ${extra.join(", ")}`);
      }
      if (dryRun) {
        logger.info("  [DRY RUN] --force を指定すると全置換を実行します");
      } else {
        logger.warn("  Use --force to replace all options (WARNING: existing items will lose their Status)");
      }
    } else {
      // 初回セットアップ（完全不一致）または --force → 全置換
      if (options.force && existingOptions.length > 0 && missing.length < definedOptions.length) {
        logger.warn("\n[Status] --force: Replacing all options (existing items will lose their Status)");
      } else {
        logger.info("\n[Status] Updating field...");
      }
      if (dryRun) {
        logger.info("  [DRY RUN] Status フィールドを更新します（全オプション置換）");
        logger.info(`  [DRY RUN] オプション: ${definedOptions.join(", ")}`);
      } else {
        const statusOptions = buildSingleSelectOptions(FIELD_COLORS.status, locale.status);
        const query = `mutation { updateProjectV2Field(input: { fieldId: "${fieldId}", name: "Status", singleSelectOptions: ${statusOptions} }) { projectV2Field { ... on ProjectV2SingleSelectField { name options { name description } } } } }`;
        const result = await runGraphQL(query, {});
        if (result.success) {
          logger.success("  Status updated");
        } else {
          logger.error("  Status update failed");
        }
      }
    }
  }

  // Priority/Size フィールド作成（既存検出付き）
  if (projectId && !options.statusOnly) {
    for (const [fieldName, fieldKey] of [["Priority", "priority"], ["Size", "size"]] as const) {
      const existingField = resolveFieldName(fieldName, allFields);
      if (existingField) {
        logger.info(`\n[${fieldName}] Already exists, skipped`);
        continue;
      }
      if (dryRun) {
        const optionNames = Object.keys(FIELD_COLORS[fieldKey]);
        logger.info(`\n[${fieldName}] [DRY RUN] フィールドを作成します`);
        logger.info(`  [DRY RUN] オプション: ${optionNames.join(", ")}`);
      } else {
        logger.info(`\n[${fieldName}] Creating field...`);
        const fieldOptions = buildSingleSelectOptions(FIELD_COLORS[fieldKey], locale[fieldKey]);
        const createQuery = `mutation { createProjectV2Field(input: { projectId: "${projectId}", dataType: SINGLE_SELECT, name: "${fieldName}", singleSelectOptions: ${fieldOptions} }) { projectV2Field { ... on ProjectV2SingleSelectField { name options { name } } } } }`;
        const result = await runGraphQL(createQuery, {});
        if (result.success) {
          logger.success(`  ${fieldName} created`);
        } else {
          logger.error(`  ${fieldName} creation failed`);
        }
      }
    }

    // DATE_TEXT_FIELDS 作成（既存検出付き）
    for (const fieldName of DATE_TEXT_FIELDS) {
      const existingField = resolveFieldName(fieldName, allFields);
      if (existingField) {
        logger.info(`\n[${fieldName}] Already exists, skipped`);
        continue;
      }
      if (dryRun) {
        logger.info(`\n[${fieldName}] [DRY RUN] テキストフィールドを作成します`);
      } else {
        logger.info(`\n[${fieldName}] Creating text field...`);
        const textQuery = `mutation { createProjectV2Field(input: { projectId: "${projectId}", dataType: TEXT, name: "${fieldName}" }) { projectV2Field { ... on ProjectV2Field { name } } } }`;
        const result = await runGraphQL(textQuery, {});
        if (result.success) {
          logger.success(`  ${fieldName} created`);
        } else {
          logger.warn(`  ${fieldName} creation failed`);
        }
      }
    }
  }

  logger.info("\nTip: Rename the default View \"View 1\" in GitHub UI:");
  logger.info("  TABLE → \"Board\", BOARD → \"Kanban\", ROADMAP → \"Roadmap\"");
  logger.info("\nDone!");
  return 0;
}

// =============================================================================
// create-project (#597)
// =============================================================================

/** create-project サブコマンドのオプション */
interface CreateProjectOptions extends SetupOptions {
  // title は ProjectsOptions から継承
  // lang は SetupOptions から継承
}


/**
 * create-project subcommand - Project 作成からフィールド設定まで一括実行
 *
 * 1. gh project create で Project を作成
 * 2. gh project link でリポジトリにリンク
 * 3. Discussions を自動有効化
 * 4. cmdSetup() でフィールド初期設定
 */
async function cmdCreateProject(
  options: CreateProjectOptions,
  logger: Logger,
): Promise<number> {
  if (!options.title) {
    logger.error("--title is required");
    logger.info("Usage: shirokuma-docs projects create-project --title \"Project Name\" [--lang ja]");
    return 1;
  }

  const owner = options.owner || getOwner();
  const repo = getRepoName();
  if (!owner || !repo) {
    const diagnosis = await diagnoseRepoFailure();
    logger.error(`Could not determine repository owner/name: ${diagnosis.cause}`);
    logger.info(`  ${diagnosis.suggestion}`);
    return 1;
  }

  // ステップ 1: Project 作成 (GraphQL mutation: createProjectV2)
  logger.info(`[1/4] Creating project "${options.title}"...`);

  const ownerId = await getOwnerNodeId(owner);
  if (!ownerId) {
    logger.error(`Could not resolve owner ID for '${owner}'`);
    return 1;
  }

  const GRAPHQL_MUTATION_CREATE_PROJECT = `
    mutation($ownerId: ID!, $title: String!) {
      createProjectV2(input: {ownerId: $ownerId, title: $title}) {
        projectV2 {
          id
          number
          url
        }
      }
    }
  `;

  interface CreateProjectResult {
    data?: {
      createProjectV2?: {
        projectV2?: {
          id?: string;
          number?: number;
          url?: string;
        };
      };
    };
  }

  const createResult = await runGraphQL<CreateProjectResult>(GRAPHQL_MUTATION_CREATE_PROJECT, {
    ownerId,
    title: options.title,
  });

  if (!createResult.success) {
    logger.error(`Failed to create project: ${createResult.error}`);
    return 1;
  }

  const createdProject = createResult.data?.data?.createProjectV2?.projectV2;
  const projectNumber = createdProject?.number;
  const projectUrl = createdProject?.url;
  if (projectNumber === undefined) {
    logger.error("Failed to get project number from creation response");
    return 1;
  }
  logger.success(`  Project created: #${projectNumber} ${projectUrl ?? ""}`);

  // ステップ 2: リポジトリにリンク (GraphQL mutation: linkProjectV2ToRepository)
  logger.info(`[2/4] Linking project to ${owner}/${repo}...`);

  const repoId = await getRepoId(owner, repo);
  const createdProjectId = createdProject?.id;
  if (!repoId || !createdProjectId) {
    logger.error(`Failed to link project to repository`);
    logger.info(`  Project was created successfully (URL: ${projectUrl ?? "unknown"})`);
    logger.info(`  Link manually: gh project link ${projectNumber} --owner ${owner} --repo ${owner}/${repo}`);
    return 1;
  }

  const GRAPHQL_MUTATION_LINK_PROJECT = `
    mutation($projectId: ID!, $repositoryId: ID!) {
      linkProjectV2ToRepository(input: {projectId: $projectId, repositoryId: $repositoryId}) {
        repository { id }
      }
    }
  `;

  const linkResult = await runGraphQL(GRAPHQL_MUTATION_LINK_PROJECT, {
    projectId: createdProjectId,
    repositoryId: repoId,
  });

  if (!linkResult.success) {
    logger.error(`Failed to link project to repository`);
    logger.info(`  Project was created successfully (URL: ${projectUrl ?? "unknown"})`);
    logger.info(`  Link manually: gh project link ${projectNumber} --owner ${owner} --repo ${owner}/${repo}`);
    return 1;
  }

  logger.success("  Project linked to repository");

  // ステップ 3: Discussions 有効化 (octokit REST API)
  logger.info(`[3/4] Enabling Discussions for ${owner}/${repo}...`);
  try {
    const octokit = getOctokit();
    await octokit.rest.repos.update({
      owner,
      repo,
      has_discussions: true,
    });
    logger.success("  Discussions enabled");
  } catch {
    logger.warn("  Failed to enable Discussions automatically");
    logger.info(`  Enable manually: gh api -X PATCH /repos/${owner}/${repo} -f has_discussions=true`);
  }

  // ステップ 4: フィールド設定（cmdSetup を呼び出し）
  logger.info("[4/4] Setting up project fields...");

  // 新しく作成した Project の ID を取得して setup に渡す
  const projectId = await getProjectId(owner, options.title);
  if (!projectId) {
    logger.error("Failed to resolve project ID after creation");
    logger.info("  Run 'shirokuma-docs projects setup' manually to set up fields");
    return 1;
  }

  const setupResult = await cmdSetup(
    { ...options, projectId, owner, force: true },
    logger,
  );

  // 出力
  const output = {
    project_number: projectNumber,
    project_url: projectUrl,
    project_id: projectId,
    owner,
    repository: `${owner}/${repo}`,
    setup: setupResult === 0 ? "completed" : "failed",
    next_steps: [
      `Add Issue Types: https://github.com/organizations/${owner}/settings/issue-types`,
      "  - Chore, Docs, Research (in addition to Feature / Bug / Task)",
      "Enable recommended workflows: Project → Workflows",
      "  - Item closed → Done",
      "  - Pull request merged → Done",
      `Create Discussion categories: https://github.com/${owner}/${repo}/discussions/categories`,
      "  - Handovers (🤝, Open-ended discussion)",
      "  - ADR (📐, Open-ended discussion)",
      "  - Knowledge (💡, Open-ended discussion)",
      "  - Research (🔬, Open-ended discussion)",
      "Rename default View \"View 1\" in GitHub UI (API not supported):",
      "  - TABLE → \"Board\", BOARD → \"Kanban\", ROADMAP → \"Roadmap\"",
    ],
  };

  console.log(JSON.stringify(output, null, 2));
  return setupResult;
}

// =============================================================================
// Main Command Handler
// =============================================================================

/**
 * projects command handler
 */
export async function projectsCommand(
  action: string,
  target: string | undefined,
  options: ProjectsOptions
): Promise<void> {
  const logger = createLogger(options.verbose);

  logger.debug(`Action: ${action}`);
  logger.debug(`Target: ${target ?? "(none)"}`);
  logger.debug(`Owner: ${options.owner ?? "(auto)"}`);

  let exitCode = 0;

  switch (action) {
    case "list":
      exitCode = await cmdList(options, logger);
      break;

    case "get":
      if (!target) {
        logger.error("Item ID or issue number required");
        logger.info("Usage: shirokuma-docs projects get <item-id-or-number>");
        exitCode = 1;
      } else {
        exitCode = await cmdGet(target, options, logger);
      }
      break;

    case "fields":
      exitCode = await cmdFields(options, logger);
      break;

    case "create":
      exitCode = await cmdCreate(options, logger);
      break;

    case "update":
      if (!target) {
        logger.error("Item ID or issue number required");
        logger.info("Usage: shirokuma-docs projects update <item-id-or-number> --field-status ...");
        exitCode = 1;
      } else {
        exitCode = await cmdUpdate(target, options, logger);
      }
      break;

    case "delete":
      if (!target) {
        logger.error("Item ID or issue number required");
        logger.info("Usage: shirokuma-docs projects delete <item-id-or-number> --force");
        exitCode = 1;
      } else {
        exitCode = await cmdDelete(target, options, logger);
      }
      break;

    case "add-issue":
      if (!target) {
        logger.error("Issue number required");
        logger.info("Usage: shirokuma-docs projects add-issue <issue-number>");
        exitCode = 1;
      } else {
        exitCode = await cmdAddIssue(target, options, logger);
      }
      break;

    case "workflows":
      exitCode = await cmdWorkflows(options, logger);
      break;

    case "setup-metrics":
      exitCode = await cmdSetupMetrics(options, logger);
      break;

    case "setup":
      exitCode = await cmdSetup(options as SetupOptions, logger);
      break;

    case "create-project":
      exitCode = await cmdCreateProject(options as CreateProjectOptions, logger);
      break;

    default:
      logger.error(`Unknown action: ${action}`);
      logger.info("Available actions: list, get, fields, create, update, delete, add-issue, workflows, setup-metrics, setup, create-project");
      exitCode = 1;
  }

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
