/**
 * gh-projects command - GitHub Projects V2 management
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
import { createLogger } from "../utils/logger.js";
import { runGhCommand, runGraphQL, getOwner, getRepoName, validateTitle, validateBody, isIssueNumber, parseIssueNumber, } from "../utils/github.js";
import { loadGhConfig } from "../utils/gh-config.js";
import { formatOutput, GH_PROJECTS_LIST_COLUMNS, } from "../utils/formatters.js";
/** Default statuses to exclude when listing (typically completed items) */
const DEFAULT_EXCLUDE_STATUSES = ["Done", "Released"];
/** #250 推奨ワークフロー: 有効にすべき自動化 */
export const RECOMMENDED_WORKFLOWS = ["Item closed", "Pull request merged"];
// =============================================================================
// GraphQL Queries
// =============================================================================
/** プロジェクトのワークフロー一覧を取得 */
const GRAPHQL_QUERY_WORKFLOWS = `
query($projectId: ID!) {
  node(id: $projectId) {
    ... on ProjectV2 {
      title
      workflows(first: 20) {
        nodes {
          id
          name
          number
          enabled
        }
      }
    }
  }
}
`;
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
          type: fieldValueByName(name: "Type") {
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
      type: fieldValueByName(name: "Type") {
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
const GRAPHQL_QUERY_FIELDS = `
query($projectId: ID!) {
  node(id: $projectId) {
    ... on ProjectV2 {
      title
      fields(first: 20) {
        nodes {
          ... on ProjectV2SingleSelectField {
            id name
            options { id name }
          }
        }
      }
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
const GRAPHQL_MUTATION_UPDATE_FIELD = `
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $projectId
    itemId: $itemId
    fieldId: $fieldId
    value: { singleSelectOptionId: $optionId }
  }) { projectV2Item { id } }
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
const GRAPHQL_MUTATION_DELETE_ITEM = `
mutation($projectId: ID!, $itemId: ID!) {
  deleteProjectV2Item(input: {projectId: $projectId, itemId: $itemId}) {
    deletedItemId
  }
}
`;
const GRAPHQL_MUTATION_ADD_ISSUE_TO_PROJECT = `
mutation($projectId: ID!, $contentId: ID!) {
  addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
    item { id }
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
 * Get project ID by name (defaults to repository name)
 */
export function getProjectId(owner, projectName) {
    const targetName = projectName || getRepoName();
    if (!targetName)
        return null;
    const result = runGhCommand(["project", "list", "--owner", owner, "--format", "json"], { silent: true });
    if (!result.success || !result.data?.projects)
        return null;
    // Find project by name (repository name convention)
    for (const project of result.data.projects) {
        if (project.title === targetName) {
            return project.id;
        }
    }
    // Fallback to first project if no match
    return result.data.projects[0]?.id ?? null;
}
/**
 * Get project field definitions with option mappings
 */
function getProjectFields(projectId) {
    const result = runGraphQL(GRAPHQL_QUERY_FIELDS, { projectId });
    if (!result.success)
        return {};
    const fields = {};
    const nodes = result.data?.data?.node?.fields?.nodes ?? [];
    for (const node of nodes) {
        if (node?.name && node?.options && node?.id) {
            const options = {};
            for (const opt of node.options) {
                options[opt.name] = opt.id;
            }
            fields[node.name] = {
                id: node.id,
                name: node.name,
                options,
            };
        }
    }
    return fields;
}
/**
 * Fetch all project items with pagination
 */
function fetchAllItems(projectId) {
    const allItems = [];
    let cursor = null;
    let projectTitle = "";
    while (true) {
        const result = runGraphQL(GRAPHQL_QUERY_LIST, {
            projectId,
            cursor: cursor ?? "null",
        });
        if (!result.success || !result.data?.data?.node)
            break;
        const node = result.data.data.node;
        projectTitle = node.title ?? "";
        const itemsData = node.items ?? { nodes: [], pageInfo: {} };
        const nodes = itemsData.nodes ?? [];
        for (const item of nodes) {
            if (!item?.id)
                continue;
            allItems.push({
                id: item.id,
                title: item.content?.title ?? null,
                status: item.status?.name ?? null,
                priority: item.priority?.name ?? null,
                type: item.type?.name ?? null,
                size: item.size?.name ?? null,
                issueNumber: item.content?.number ?? null,
            });
        }
        const pageInfo = itemsData.pageInfo ?? {};
        if (!pageInfo.hasNextPage)
            break;
        cursor = pageInfo.endCursor ?? null;
    }
    return { title: projectTitle, items: allItems };
}
/**
 * Fetch a single project item by ID with full details
 */
function fetchItem(itemId) {
    const result = runGraphQL(GRAPHQL_QUERY_ITEM, { itemId });
    if (!result.success || !result.data?.data?.node)
        return null;
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
        type: node.type?.name ?? null,
        typeOptionId: node.type?.optionId ?? null,
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
function findItemByIssueNumber(projectId, issueNumber) {
    const { items } = fetchAllItems(projectId);
    for (const item of items) {
        if (item.issueNumber === issueNumber) {
            return { id: item.id };
        }
    }
    return null;
}
/**
 * Update a single select field on an item
 */
function updateField(projectId, itemId, fieldId, optionId) {
    const result = runGraphQL(GRAPHQL_MUTATION_UPDATE_FIELD, {
        projectId,
        itemId,
        fieldId,
        optionId,
    });
    return result.success;
}
/**
 * Set multiple fields on an item
 */
function setItemFields(projectId, itemId, fields, projectFields, logger) {
    if (Object.keys(fields).length === 0)
        return 0;
    const pf = projectFields ?? getProjectFields(projectId);
    let updatedCount = 0;
    for (const [fieldName, value] of Object.entries(fields)) {
        if (!pf[fieldName]) {
            logger?.warn(`Field '${fieldName}' not found in project`);
            continue;
        }
        const fieldInfo = pf[fieldName];
        const optionId = fieldInfo.options[value];
        if (optionId) {
            if (updateField(projectId, itemId, fieldInfo.id, optionId)) {
                updatedCount++;
            }
        }
        else {
            const available = Object.keys(fieldInfo.options).sort().join(", ");
            logger?.error(`Invalid ${fieldName} value '${value}'`);
            logger?.info(`  Available options: ${available}`);
        }
    }
    return updatedCount;
}
/**
 * Get issue by number
 */
function getIssueByNumber(owner, repo, number) {
    const result = runGraphQL(GRAPHQL_QUERY_ISSUE_BY_NUMBER, {
        owner,
        name: repo,
        number,
    });
    if (!result.success)
        return null;
    const issue = result.data?.data?.repository?.issue;
    if (!issue?.id)
        return null;
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
async function cmdList(options, logger) {
    // Load config for defaults
    const config = loadGhConfig();
    const owner = options.owner || getOwner();
    if (!owner) {
        logger.error("Could not determine repository owner");
        return 1;
    }
    const projectId = getProjectId(owner);
    if (!projectId) {
        logger.error(`No project found for owner '${owner}'`);
        return 1;
    }
    const { title: projectTitle, items } = fetchAllItems(projectId);
    // Apply status filter
    // Default: exclude Done/Released unless --all or --status specified
    let filteredItems = items;
    if (options.status && options.status.length > 0) {
        filteredItems = items.filter((i) => options.status.includes(i.status ?? ""));
    }
    else if (!options.all) {
        filteredItems = items.filter((i) => !DEFAULT_EXCLUDE_STATUSES.includes(i.status ?? ""));
    }
    const output = {
        project: { id: projectId, title: projectTitle, owner },
        items: filteredItems.map((i) => ({
            id: i.id,
            title: i.title,
            status: i.status,
            priority: i.priority,
            type: i.type,
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
async function cmdGet(itemIdOrNumber, options, logger) {
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
        const projectId = getProjectId(owner);
        if (!projectId) {
            logger.error(`No project found for owner '${owner}'`);
            return 1;
        }
        const found = findItemByIssueNumber(projectId, issueNumber);
        if (!found) {
            logger.error(`No project item found for Issue #${issueNumber}`);
            return 1;
        }
        itemId = found.id;
    }
    const item = fetchItem(itemId);
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
        type: item.type,
        type_option_id: item.typeOptionId,
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
async function cmdFields(options, logger) {
    const owner = options.owner || getOwner();
    if (!owner) {
        logger.error("Could not determine repository owner");
        return 1;
    }
    const projectId = getProjectId(owner);
    if (!projectId) {
        logger.error(`No project found for owner '${owner}'`);
        return 1;
    }
    const fields = getProjectFields(projectId);
    console.log(JSON.stringify(fields, null, 2));
    return 0;
}
/**
 * create subcommand
 */
async function cmdCreate(options, logger) {
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
    const owner = options.owner || getOwner();
    if (!owner) {
        logger.error("Could not determine repository owner");
        return 1;
    }
    const projectId = getProjectId(owner);
    if (!projectId) {
        logger.error(`No project found for owner '${owner}'`);
        return 1;
    }
    const result = runGraphQL(GRAPHQL_MUTATION_CREATE, {
        projectId,
        title: options.title,
        body: options.body ?? "",
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
    const fields = {};
    if (options.fieldStatus)
        fields["Status"] = options.fieldStatus;
    if (options.priority)
        fields["Priority"] = options.priority;
    if (options.type)
        fields["Type"] = options.type;
    if (options.size)
        fields["Size"] = options.size;
    if (Object.keys(fields).length > 0) {
        setItemFields(projectId, itemId, fields, undefined, logger);
    }
    const item = fetchItem(itemId);
    if (item) {
        const output = {
            id: item.id,
            title: item.title,
            body: item.body,
            status: item.status,
            priority: item.priority,
            type: item.type,
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
async function cmdUpdate(itemIdOrNumber, options, logger) {
    // Validation
    const bodyError = validateBody(options.body);
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
        const projectId = getProjectId(owner);
        if (!projectId) {
            logger.error(`No project found for owner '${owner}'`);
            return 1;
        }
        const found = findItemByIssueNumber(projectId, issueNumber);
        if (!found) {
            logger.error(`No project item found for Issue #${issueNumber}`);
            return 1;
        }
        itemId = found.id;
    }
    let item = fetchItem(itemId);
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
    const fields = {};
    if (options.fieldStatus)
        fields["Status"] = options.fieldStatus;
    if (options.priority)
        fields["Priority"] = options.priority;
    if (options.type)
        fields["Type"] = options.type;
    if (options.size)
        fields["Size"] = options.size;
    let updated = setItemFields(projectId, itemId, fields, undefined, logger) > 0;
    // Update body if provided
    if (options.body !== undefined) {
        if (item.draftIssueId) {
            // DraftIssue body update
            const result = runGraphQL(GRAPHQL_MUTATION_UPDATE_BODY, {
                draftIssueId: item.draftIssueId,
                body: options.body,
            });
            if (result.success)
                updated = true;
        }
        else if (item.issueNumber && owner && repo) {
            // Issue body update
            const issueData = getIssueByNumber(owner, repo, item.issueNumber);
            if (issueData?.id) {
                const result = runGraphQL(GRAPHQL_MUTATION_UPDATE_ISSUE, {
                    id: issueData.id,
                    body: options.body,
                });
                if (result.success)
                    updated = true;
            }
            else {
                logger.warn("Cannot update Issue body (Issue not found)");
            }
        }
        else {
            logger.warn("Cannot update body (unknown content type)");
        }
    }
    if (updated) {
        item = fetchItem(itemId);
    }
    if (item) {
        const output = {
            id: item.id,
            title: item.title,
            body: item.body,
            status: item.status,
            status_option_id: item.statusOptionId,
            priority: item.priority,
            type: item.type,
            size: item.size,
            issue_number: item.issueNumber,
            issue_url: item.issueUrl,
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
async function cmdDelete(itemIdOrNumber, options, logger) {
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
        const projectId = getProjectId(owner);
        if (!projectId) {
            logger.error(`No project found for owner '${owner}'`);
            return 1;
        }
        const found = findItemByIssueNumber(projectId, issueNumber);
        if (!found) {
            logger.error(`No project item found for Issue #${issueNumber}`);
            return 1;
        }
        itemId = found.id;
    }
    const item = fetchItem(itemId);
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
    const result = runGraphQL(GRAPHQL_MUTATION_DELETE_ITEM, { projectId, itemId });
    if (result.success) {
        const output = {
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
    }
    else {
        logger.error("Failed to delete item");
        return 1;
    }
}
/**
 * add-issue subcommand
 */
async function cmdAddIssue(issueNumberStr, options, logger) {
    const owner = options.owner || getOwner();
    const repo = getRepoName();
    if (!owner || !repo) {
        logger.error("Could not determine repository");
        return 1;
    }
    const projectId = getProjectId(owner);
    if (!projectId) {
        logger.error(`No project found for owner '${owner}'`);
        return 1;
    }
    const issueNumber = parseIssueNumber(issueNumberStr);
    // Get Issue details
    const issue = getIssueByNumber(owner, repo, issueNumber);
    if (!issue) {
        logger.error(`Issue #${issueNumber} not found`);
        return 1;
    }
    // Check if already in project
    const existing = findItemByIssueNumber(projectId, issueNumber);
    if (existing) {
        logger.info(`Issue #${issueNumber} is already in the project`);
        const item = fetchItem(existing.id);
        if (item) {
            const output = {
                id: item.id,
                title: item.title,
                status: item.status,
                priority: item.priority,
                type: item.type,
                size: item.size,
                issue_number: item.issueNumber,
                issue_url: item.issueUrl,
            };
            console.log(JSON.stringify(output, null, 2));
        }
        return 0;
    }
    const result = runGraphQL(GRAPHQL_MUTATION_ADD_ISSUE_TO_PROJECT, {
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
    const fields = {};
    if (options.fieldStatus)
        fields["Status"] = options.fieldStatus;
    if (options.priority)
        fields["Priority"] = options.priority;
    if (options.type)
        fields["Type"] = options.type;
    if (options.size)
        fields["Size"] = options.size;
    if (Object.keys(fields).length > 0) {
        setItemFields(projectId, itemId, fields, undefined, logger);
    }
    const item = fetchItem(itemId);
    if (item) {
        const output = {
            id: item.id,
            title: item.title,
            status: item.status,
            priority: item.priority,
            type: item.type,
            size: item.size,
            issue_number: item.issueNumber,
            issue_url: item.issueUrl,
        };
        console.log(JSON.stringify(output, null, 2));
    }
    return 0;
}
// =============================================================================
// Workflow helpers (#250)
// =============================================================================
/**
 * プロジェクトのワークフロー一覧を取得する。
 * GitHub Projects V2 のビルトイン自動化を確認するために使用。
 *
 * @returns ワークフロー配列。取得失敗時は空配列
 */
export function fetchWorkflows(projectId) {
    const result = runGraphQL(GRAPHQL_QUERY_WORKFLOWS, { projectId });
    if (!result.success)
        return [];
    const nodes = result.data?.data?.node?.workflows?.nodes ?? [];
    return nodes
        .filter((n) => !!n?.id && !!n?.name && n.number !== undefined)
        .map((n) => ({
        id: n.id,
        name: n.name,
        number: n.number,
        enabled: n.enabled ?? false,
    }));
}
/**
 * workflows subcommand - ビルトイン自動化の状態を表示
 */
async function cmdWorkflows(options, logger) {
    const owner = options.owner || getOwner();
    if (!owner) {
        logger.error("Could not determine repository owner");
        return 1;
    }
    const projectId = getProjectId(owner);
    if (!projectId) {
        logger.error(`No project found for owner '${owner}'`);
        return 1;
    }
    const workflows = fetchWorkflows(projectId);
    if (workflows.length === 0) {
        logger.warn("No workflows found or failed to fetch");
        return 1;
    }
    // 推奨ワークフローの有効/無効をチェック
    const disabledRecommended = workflows.filter((w) => RECOMMENDED_WORKFLOWS.includes(w.name) && !w.enabled);
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
        logger.warn(`${disabledRecommended.length} recommended workflow(s) disabled: ${disabledRecommended.map((w) => w.name).join(", ")}`);
        logger.info("Enable via: GitHub Project Settings > Workflows (API not supported)");
    }
    return 0;
}
// =============================================================================
// Main Command Handler
// =============================================================================
/**
 * gh-projects command handler
 */
export async function ghProjectsCommand(action, target, options) {
    const logger = createLogger(options.verbose);
    // Deprecation warning (workflows subcommand is NOT deprecated)
    if (action !== "workflows") {
        console.error("[DEPRECATED] gh-projects item commands are deprecated. Use gh-issues instead:\n" +
            "  gh-issues fields     (was: gh-projects fields)\n" +
            "  gh-issues remove     (was: gh-projects delete)\n" +
            "  gh-issues update     (was: gh-projects update)\n" +
            "  gh-issues create     (was: gh-projects create)\n" +
            "  session start        (was: gh-projects list)\n" +
            "  gh-projects workflows  (project-level: NOT deprecated)\n");
    }
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
                logger.info("Usage: shirokuma-docs gh-projects get <item-id-or-number>");
                exitCode = 1;
            }
            else {
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
                logger.info("Usage: shirokuma-docs gh-projects update <item-id-or-number> --status ...");
                exitCode = 1;
            }
            else {
                exitCode = await cmdUpdate(target, options, logger);
            }
            break;
        case "delete":
            if (!target) {
                logger.error("Item ID or issue number required");
                logger.info("Usage: shirokuma-docs gh-projects delete <item-id-or-number> --force");
                exitCode = 1;
            }
            else {
                exitCode = await cmdDelete(target, options, logger);
            }
            break;
        case "add-issue":
            if (!target) {
                logger.error("Issue number required");
                logger.info("Usage: shirokuma-docs gh-projects add-issue <issue-number>");
                exitCode = 1;
            }
            else {
                exitCode = await cmdAddIssue(target, options, logger);
            }
            break;
        case "workflows":
            exitCode = await cmdWorkflows(options, logger);
            break;
        default:
            logger.error(`Unknown action: ${action}`);
            logger.info("Available actions: list, get, fields, create, update, delete, add-issue, workflows");
            exitCode = 1;
    }
    if (exitCode !== 0) {
        process.exit(exitCode);
    }
}
//# sourceMappingURL=gh-projects.js.map