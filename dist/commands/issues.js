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
import { createLogger } from "../utils/logger.js";
import { runGraphQL, getRepoInfo, validateTitle, validateBody, isIssueNumber, parseIssueNumber, } from "../utils/github.js";
import { getOctokit } from "../utils/octokit-client.js";
import { cmdPrComments, cmdPrCreate, cmdPrList, cmdPrShow, cmdMerge, cmdPrReply, cmdResolve, } from "./issues-pr.js";
import { cmdSubList, cmdSubAdd, cmdSubRemove, } from "./issues-sub.js";
import { loadGhConfig, getDefaultLimit, getDefaultStatus } from "../utils/gh-config.js";
import { formatOutput, GH_ISSUES_LIST_COLUMNS, GH_ISSUES_SEARCH_COLUMNS, } from "../utils/formatters.js";
import { resolveTargetRepo, detectCurrentRepoPair, parseRepoFullName, validateCrossRepoAlias, } from "../utils/repo-pairs.js";
import { GRAPHQL_MUTATION_DELETE_ITEM, GRAPHQL_MUTATION_CLOSE_ISSUE, getRepoId, } from "../utils/graphql-queries.js";
import { getProjectFields, setItemFields, autoSetTimestamps, addItemToProject, } from "../utils/project-fields.js";
import { getProjectId } from "../utils/project-utils.js";
import { GRAPHQL_QUERY_ISSUE_DETAIL as ISSUE_DETAIL_QUERY, getIssueDetail, updateProjectStatus, resolveAndUpdateStatus, } from "../utils/issue-detail.js";
// =============================================================================
// GraphQL Queries
// =============================================================================
// Note: We don't use $states variable because GitHub GraphQL API has issues with enum arrays
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
// GRAPHQL_QUERY_ISSUE_DETAIL は utils/issue-detail.ts から import（ISSUE_DETAIL_QUERY）
const GRAPHQL_QUERY_ISSUE_DETAIL = ISSUE_DETAIL_QUERY;
const GRAPHQL_QUERY_SEARCH_ISSUES = `
query($searchQuery: String!, $first: Int!) {
  search(query: $searchQuery, type: ISSUE, first: $first) {
    issueCount
    nodes {
      ... on Issue {
        __typename
        number
        title
        url
        state
        createdAt
        updatedAt
        author { login }
      }
      ... on PullRequest {
        __typename
        number
        title
        url
        state
        createdAt
        updatedAt
        author { login }
      }
    }
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
mutation($repositoryId: ID!, $title: String!, $body: String, $labelIds: [ID!], $issueTypeId: ID) {
  createIssue(input: {repositoryId: $repositoryId, title: $title, body: $body, labelIds: $labelIds, issueTypeId: $issueTypeId}) {
    issue { id number url title }
  }
}
`;
const GRAPHQL_MUTATION_UPDATE_ISSUE = `
mutation($id: ID!, $title: String, $body: String, $issueTypeId: ID) {
  updateIssue(input: {id: $id, title: $title, body: $body, issueTypeId: $issueTypeId}) {
    issue { id number title body }
  }
}
`;
const GRAPHQL_QUERY_ISSUE_COMMENTS = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    issue(number: $number) {
      number
      comments(first: 100) {
        totalCount
        nodes {
          id
          databaseId
          author { login }
          body
          createdAt
          url
        }
      }
    }
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
// =============================================================================
// Helper Functions
// =============================================================================
/**
 * Build GraphQL mutation variables for updateIssue.
 * When issueType is not specified, omit issueTypeId to preserve existing Type.
 */
export function buildUpdateIssueVariables(params) {
    const vars = {
        id: params.issueId,
        title: params.title,
        body: params.body,
    };
    if (params.issueType) {
        vars.issueTypeId = params.issueTypeId ?? null;
    }
    return vars;
}
/**
 * Get issue GraphQL ID by number
 */
export async function getIssueId(owner, repo, number) {
    const result = await runGraphQL(GRAPHQL_QUERY_ISSUE_ID, { owner, name: repo, number });
    if (!result.success)
        return null;
    return result.data?.data?.repository?.issue?.id ?? null;
}
/**
 * Get pull request GraphQL ID by number
 */
export async function getPullRequestId(owner, repo, number) {
    const result = await runGraphQL(GRAPHQL_QUERY_PR_ID, { owner, name: repo, number });
    if (!result.success)
        return null;
    return result.data?.data?.repository?.pullRequest?.id ?? null;
}
/**
 * Get repository labels
 */
async function getLabels(owner, repo) {
    const result = await runGraphQL(GRAPHQL_QUERY_LABELS, { owner, name: repo });
    if (!result.success)
        return {};
    const labels = {};
    const nodes = result.data?.data?.repository?.labels?.nodes ?? [];
    for (const node of nodes) {
        if (node?.name && node?.id) {
            labels[node.name] = node.id;
        }
    }
    return labels;
}
/**
 * Organization の Issue Types 一覧を取得し、名前→ID マッピングを返す
 */
const GRAPHQL_QUERY_ORGANIZATION_ISSUE_TYPES = `
query($login: String!) {
  organization(login: $login) {
    issueTypes(first: 50) {
      nodes { id name }
    }
  }
}
`;
export async function getOrganizationIssueTypes(owner) {
    const result = await runGraphQL(GRAPHQL_QUERY_ORGANIZATION_ISSUE_TYPES, { login: owner });
    if (!result.success)
        return {};
    const types = {};
    const nodes = result.data?.data?.organization?.issueTypes?.nodes ?? [];
    for (const node of nodes) {
        if (node?.name && node?.id) {
            types[node.name] = node.id;
        }
    }
    return types;
}
/**
 * Issue Type 名を ID に解決する。
 * 解決成功時は ID 文字列、スキップ時は null、エラー時は false を返す。
 */
async function resolveIssueTypeId(owner, typeName, logger) {
    const issueTypes = await getOrganizationIssueTypes(owner);
    const id = issueTypes[typeName] ?? null;
    if (id)
        return id;
    const available = Object.keys(issueTypes);
    if (available.length === 0) {
        logger.error(`Issue Types not available for organization '${owner}'. ` +
            `--issue-type requires an organization with Issue Types enabled.`);
        return false;
    }
    logger.error(`Issue Type '${typeName}' not found. Available: ${available.join(", ")}`);
    return false;
}
// =============================================================================
// Subcommand Handlers
// =============================================================================
/**
 * search subcommand (#552)
 */
async function cmdSearch(options, logger) {
    const repoInfo = resolveTargetRepo(options);
    if (!repoInfo) {
        logger.error("Could not determine repository");
        return 1;
    }
    const { owner, name: repo } = repoInfo;
    // GitHub search syntax: repo:owner/name <query> [is:open|is:closed]
    let searchQuery = `repo:${owner}/${repo}`;
    if (options.query) {
        searchQuery += ` ${options.query}`;
    }
    if (options.state && options.state !== "all") {
        const validStates = ["open", "closed"];
        if (validStates.includes(options.state)) {
            searchQuery += ` is:${options.state}`;
        }
    }
    const limit = options.limit ?? 10;
    const result = await runGraphQL(GRAPHQL_QUERY_SEARCH_ISSUES, {
        searchQuery,
        first: Math.min(limit, 100),
    });
    if (!result.success || !result.data?.data?.search) {
        logger.error("Search failed");
        return 1;
    }
    const searchData = result.data.data.search;
    const nodes = searchData.nodes ?? [];
    const issues = nodes
        .filter((n) => !!n?.number)
        .map((n) => ({
        number: n.number,
        title: n.title ?? "",
        url: n.url ?? "",
        state: n.state ?? "",
        is_pr: n.__typename === "PullRequest",
        author: n.author?.login ?? "",
        created_at: n.createdAt ?? "",
    }));
    const output = {
        repository: `${owner}/${repo}`,
        query: options.query ?? "",
        state: options.state ?? null,
        issues,
        total_count: searchData.issueCount ?? issues.length,
    };
    const outputFormat = options.format ?? "json";
    const formatted = formatOutput(output, outputFormat, {
        arrayKey: "issues",
        columns: GH_ISSUES_SEARCH_COLUMNS,
    });
    console.log(formatted);
    return 0;
}
/**
 * list subcommand
 */
async function cmdList(options, logger) {
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
    const allIssues = [];
    let cursor = null;
    const limit = options.limit ?? getDefaultLimit(config);
    while (allIssues.length < limit) {
        const remaining = limit - allIssues.length;
        const fetchCount = Math.min(remaining, 50);
        const result = await runGraphQL(GRAPHQL_QUERY_ISSUES_WITH_PROJECTS, {
            owner,
            name: repo,
            first: fetchCount,
            cursor: cursor,
        });
        if (!result.success || !result.data?.data?.repository?.issues)
            break;
        const issuesData = result.data.data.repository.issues;
        const nodes = issuesData.nodes ?? [];
        for (const node of nodes) {
            if (!node?.number)
                continue;
            // Client-side state filter
            const nodeState = node.state ?? "OPEN";
            if (stateFilter === "open" && nodeState !== "OPEN")
                continue;
            if (stateFilter === "closed" && nodeState !== "CLOSED")
                continue;
            const projectItems = node.projectItems?.nodes ?? [];
            const matchingItem = projectItems.find((p) => p?.project?.title === projectName);
            const labelNodes = node.labels?.nodes ?? [];
            const issueLabels = labelNodes.map((l) => l?.name ?? "").filter(Boolean);
            // Client-side label filter
            if (options.labels && options.labels.length > 0) {
                const hasAllLabels = options.labels.every((label) => issueLabels.includes(label));
                if (!hasAllLabels)
                    continue;
            }
            const issue = {
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
                size: matchingItem?.size?.name,
            };
            allIssues.push(issue);
        }
        const pageInfo = issuesData.pageInfo ?? {};
        if (!pageInfo.hasNextPage)
            break;
        cursor = pageInfo.endCursor ?? null;
    }
    // Apply status filter (from Projects) if specified
    let filteredIssues = allIssues;
    if (options.status && options.status.length > 0) {
        filteredIssues = allIssues.filter((i) => options.status.includes(i.status ?? ""));
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
async function cmdGet(issueNumberStr, options, logger) {
    const repoInfo = resolveTargetRepo(options);
    if (!repoInfo) {
        logger.error("Could not determine repository");
        return 1;
    }
    const { owner, name: repo } = repoInfo;
    const issueNumber = parseIssueNumber(issueNumberStr);
    const projectName = repo;
    const result = await runGraphQL(GRAPHQL_QUERY_ISSUE_DETAIL, {
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
    const output = {
        number: node.number,
        title: node.title,
        type: node.issueType?.name ?? null,
        body: node.body,
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
        size: matchingItem?.size?.name,
        size_option_id: matchingItem?.size?.optionId,
    };
    // parent（親 Issue がある場合のみ表示）
    if (node.parent?.number) {
        output.parent = {
            number: node.parent.number,
            title: node.parent.title,
        };
    }
    // Sub-Issues summary（子 Issue がある場合のみ表示）
    const subSummary = node.subIssuesSummary;
    if (subSummary && (subSummary.total ?? 0) > 0) {
        output.sub_issues = `${subSummary.total} 件 (${subSummary.completed ?? 0}/${subSummary.total} 完了, ${subSummary.percentCompleted ?? 0}%)`;
    }
    const outputFormat = options.format ?? "frontmatter";
    console.log(formatOutput(output, outputFormat));
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
    // Get repository ID
    const repoId = await getRepoId(owner, repo);
    if (!repoId) {
        logger.error("Could not get repository ID");
        return 1;
    }
    // Resolve label names to IDs
    let labelIds = null;
    if (options.labels && options.labels.length > 0) {
        const allLabels = await getLabels(owner, repo);
        labelIds = [];
        for (const labelName of options.labels) {
            if (allLabels[labelName]) {
                labelIds.push(allLabels[labelName]);
            }
            else {
                logger.warn(`Label '${labelName}' not found`);
            }
        }
    }
    // Resolve issue type name to ID
    let issueTypeId = null;
    if (options.issueType) {
        const resolved = await resolveIssueTypeId(owner, options.issueType, logger);
        if (resolved === false)
            return 1;
        issueTypeId = resolved;
    }
    const createResult = await runGraphQL(GRAPHQL_MUTATION_CREATE_ISSUE, {
        repositoryId: repoId,
        title: options.title,
        body: options.bodyFile ?? "",
        labelIds: labelIds ?? null,
        issueTypeId,
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
    const createStatusValue = options.fieldStatus ?? getDefaultStatus();
    let projectItemId = null;
    const projectId = await getProjectId(owner, repo);
    if (!projectId) {
        logger.warn("No project found. Issue created but not added to project.");
    }
    else {
        projectItemId = await addItemToProject(projectId, issue.id, logger);
        if (projectItemId) {
            logger.success("Added to project");
            // Set project fields
            const fields = {};
            if (createStatusValue)
                fields["Status"] = createStatusValue;
            if (options.priority)
                fields["Priority"] = options.priority;
            if (options.size)
                fields["Size"] = options.size;
            if (Object.keys(fields).length > 0) {
                const fieldCount = await setItemFields(projectId, projectItemId, fields, logger);
                if (fieldCount === 0) {
                    logger.warn("Failed to set project fields on created issue");
                }
            }
        }
        else {
            logger.warn("Failed to add to project");
        }
    }
    // Warn about missing fields (field completeness check)
    const missingFields = [];
    if (!options.priority)
        missingFields.push("Priority");
    if (!options.size)
        missingFields.push("Size");
    if (missingFields.length > 0) {
        logger.warn(`Issue #${issue.number} created without: ${missingFields.join(", ")}. ` +
            `Consider setting them with: shirokuma-docs issues update ${issue.number} ` +
            missingFields.map((f) => `--${f.toLowerCase()} <value>`).join(" "));
    }
    // Link as sub-issue if --parent is specified
    let parentNumber;
    if (options.parent) {
        parentNumber = options.parent;
        const { getIssueInternalId } = await import("./issues-sub.js");
        const childInternalId = await getIssueInternalId(owner, repo, issue.number);
        if (childInternalId) {
            try {
                const octokit = getOctokit();
                await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues", {
                    owner,
                    repo,
                    issue_number: parentNumber,
                    sub_issue_id: childInternalId,
                });
                logger.success(`Linked as sub-issue of #${parentNumber}`);
            }
            catch {
                logger.warn(`Failed to link as sub-issue of #${parentNumber}`);
            }
        }
        else {
            logger.warn(`Could not resolve internal ID for issue #${issue.number}`);
        }
    }
    // Output created issue info
    const output = {
        number: issue.number,
        title: issue.title,
        project_item_id: projectItemId,
    };
    if (parentNumber) {
        output.parent = parentNumber;
    }
    console.log(JSON.stringify(output, null, 2));
    return 0;
}
/**
 * update subcommand
 */
async function cmdUpdate(issueNumberStr, options, logger) {
    const repoInfo = resolveTargetRepo(options);
    if (!repoInfo) {
        logger.error("Could not determine repository");
        return 1;
    }
    const { owner, name: repo } = repoInfo;
    const issueNumber = parseIssueNumber(issueNumberStr);
    const getResult = await runGraphQL(GRAPHQL_QUERY_ISSUE_DETAIL, {
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
    // Resolve issue type name to ID
    let issueTypeId = null;
    if (options.issueType) {
        const resolved = await resolveIssueTypeId(owner, options.issueType, logger);
        if (resolved === false)
            return 1;
        issueTypeId = resolved;
    }
    // Update issue fields (title, body, issueType)
    if (options.title !== undefined || options.bodyFile !== undefined || issueTypeId) {
        const issueId = await getIssueId(owner, repo, issueNumber);
        if (issueId) {
            const updateVars = buildUpdateIssueVariables({
                issueId,
                title: options.title !== undefined ? options.title : (issueNode.title ?? ""),
                body: options.bodyFile !== undefined ? options.bodyFile : (issueNode.body ?? ""),
                issueType: options.issueType,
                issueTypeId,
            });
            const updateResult = await runGraphQL(GRAPHQL_MUTATION_UPDATE_ISSUE, updateVars);
            if (updateResult.success) {
                updated = true;
                if (options.issueType) {
                    logger.success(`Set issue type to '${options.issueType}'`);
                }
                if (options.title !== undefined || options.bodyFile !== undefined) {
                    logger.success("Updated issue");
                }
            }
        }
    }
    // Track label changes for minimal output
    const addedLabels = [];
    const removedLabels = [];
    // Update labels
    if ((options.addLabel && options.addLabel.length > 0) ||
        (options.removeLabel && options.removeLabel.length > 0)) {
        const issueId = await getIssueId(owner, repo, issueNumber);
        if (issueId) {
            const allLabels = await getLabels(owner, repo);
            // Add labels
            if (options.addLabel && options.addLabel.length > 0) {
                const addIds = [];
                const addNames = [];
                for (const name of options.addLabel) {
                    if (allLabels[name]) {
                        addIds.push(allLabels[name]);
                        addNames.push(name);
                    }
                    else {
                        logger.warn(`Label '${name}' not found`);
                    }
                }
                if (addIds.length > 0) {
                    const addResult = await runGraphQL(GRAPHQL_MUTATION_ADD_LABELS, {
                        labelableId: issueId,
                        labelIds: addIds,
                    });
                    if (addResult.success) {
                        updated = true;
                        addedLabels.push(...addNames);
                        logger.success(`Added ${addIds.length} label(s)`);
                    }
                }
            }
            // Remove labels
            if (options.removeLabel && options.removeLabel.length > 0) {
                const removeIds = [];
                const removeNames = [];
                for (const name of options.removeLabel) {
                    if (allLabels[name]) {
                        removeIds.push(allLabels[name]);
                        removeNames.push(name);
                    }
                    else {
                        logger.warn(`Label '${name}' not found`);
                    }
                }
                if (removeIds.length > 0) {
                    const removeResult = await runGraphQL(GRAPHQL_MUTATION_REMOVE_LABELS, {
                        labelableId: issueId,
                        labelIds: removeIds,
                    });
                    if (removeResult.success) {
                        updated = true;
                        removedLabels.push(...removeNames);
                        logger.success(`Removed ${removeIds.length} label(s)`);
                    }
                }
            }
        }
    }
    // Add assignee (#986)
    if (options.addAssignee) {
        const octokit = getOctokit();
        let assignee = options.addAssignee;
        // Resolve @me to authenticated user
        if (assignee === "@me") {
            try {
                const { data: user } = await octokit.rest.users.getAuthenticated();
                assignee = user.login;
            }
            catch {
                logger.error("Failed to resolve @me — could not get authenticated user");
                return 1;
            }
        }
        try {
            await octokit.rest.issues.addAssignees({
                owner,
                repo,
                issue_number: issueNumber,
                assignees: [assignee],
            });
            updated = true;
            logger.success(`Assigned ${assignee}`);
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            logger.error(`Failed to add assignee: ${errorMsg}`);
        }
    }
    // Update project fields
    const statusValue = options.fieldStatus;
    const fields = {};
    if (statusValue)
        fields["Status"] = statusValue;
    if (options.priority)
        fields["Priority"] = options.priority;
    if (options.size)
        fields["Size"] = options.size;
    if (Object.keys(fields).length > 0) {
        if (matchingItem?.id && matchingItem?.project?.id) {
            const pId = matchingItem.project.id;
            const iId = matchingItem.id;
            const pf = await getProjectFields(pId);
            const count = await setItemFields(pId, iId, fields, logger, pf);
            if (count > 0) {
                updated = true;
                logger.success(`Updated ${count} project field(s)`);
            }
            // Auto-set timestamp when Status changes (#342) - reuse fetched fields
            if (statusValue) {
                await autoSetTimestamps(pId, iId, statusValue, pf, logger);
            }
        }
        else {
            // Issue not in project, add it first
            const projectId = await getProjectId(owner, repo);
            if (projectId) {
                const issueId = await getIssueId(owner, repo, issueNumber);
                if (issueId) {
                    const itemId = await addItemToProject(projectId, issueId, logger);
                    if (itemId) {
                        logger.success("Added to project");
                        const pf = await getProjectFields(projectId);
                        const count = await setItemFields(projectId, itemId, fields, logger, pf);
                        if (count > 0) {
                            updated = true;
                            logger.success(`Updated ${count} project field(s)`);
                        }
                        // Auto-set timestamp when Status changes (#342) - reuse fetched fields
                        if (statusValue) {
                            await autoSetTimestamps(projectId, itemId, statusValue, pf, logger);
                        }
                    }
                }
            }
            else {
                logger.warn("No project found. Cannot update project fields.");
            }
        }
    }
    // Track state and auto-status changes for minimal output
    let finalState = issueNode.state;
    let autoSetStatus;
    // Handle --state (close/reopen)
    if (options.state !== undefined) {
        const stateValue = options.state.toLowerCase();
        if (stateValue !== "open" && stateValue !== "closed") {
            logger.error(`Invalid --state value: "${options.state}". Use "open" or "closed".`);
            return 1;
        }
        const issueId = await getIssueId(owner, repo, issueNumber);
        if (!issueId) {
            logger.error(`Issue #${issueNumber} not found`);
            return 1;
        }
        if (stateValue === "closed" && issueNode.state !== "CLOSED") {
            // Close the issue
            const stateReason = options.stateReason === "NOT_PLANNED" ? "NOT_PLANNED" : "COMPLETED";
            const closeResult = await runGraphQL(GRAPHQL_MUTATION_CLOSE_ISSUE, {
                issueId,
                stateReason,
            });
            if (closeResult.success) {
                updated = true;
                finalState = "CLOSED";
                logger.success(`Closed #${issueNumber} (${stateReason})`);
                // Auto-set Status if --field-status was not explicitly specified (#676)
                if (!options.fieldStatus) {
                    const targetStatus = stateReason === "NOT_PLANNED" ? "Not Planned" : "Done";
                    let statusResult;
                    if (matchingItem?.id && matchingItem?.project?.id) {
                        const pf = await getProjectFields(matchingItem.project.id);
                        statusResult = await updateProjectStatus({
                            projectId: matchingItem.project.id,
                            itemId: matchingItem.id,
                            statusValue: targetStatus,
                            projectFields: pf,
                            logger,
                        });
                    }
                    else {
                        statusResult = await resolveAndUpdateStatus(owner, repo, issueNumber, targetStatus, logger);
                    }
                    if (statusResult.success) {
                        autoSetStatus = targetStatus;
                        logger.success(`Issue #${issueNumber} → ${targetStatus}`);
                    }
                }
            }
            else {
                logger.error(`Failed to close issue #${issueNumber}`);
                return 1;
            }
        }
        else if (stateValue === "open" && issueNode.state === "CLOSED") {
            const reopenResult = await runGraphQL(GRAPHQL_MUTATION_REOPEN_ISSUE, {
                issueId,
            });
            if (reopenResult.success) {
                updated = true;
                finalState = "OPEN";
                logger.success(`Reopened #${issueNumber}`);
            }
            else {
                logger.error(`Failed to reopen issue #${issueNumber}`);
                return 1;
            }
        }
    }
    if (!updated) {
        logger.info("No changes made");
    }
    // Build minimal output from available data (no re-fetch)
    const initialLabels = (issueNode.labels?.nodes ?? []).map((l) => l?.name ?? "").filter(Boolean);
    const finalLabels = [
        ...initialLabels.filter((l) => !removedLabels.includes(l)),
        ...addedLabels.filter((l) => !initialLabels.includes(l)),
    ];
    const output = {
        number: issueNumber,
        title: options.title !== undefined ? options.title : issueNode.title,
        type: options.issueType ?? issueNode.issueType?.name ?? null,
        state: finalState,
        labels: finalLabels,
        status: fields.Status ?? autoSetStatus ?? matchingItem?.status?.name,
        priority: fields.Priority ?? matchingItem?.priority?.name,
        size: fields.Size ?? matchingItem?.size?.name,
    };
    console.log(JSON.stringify(output, null, 2));
    return 0;
}
/**
 * comment subcommand
 *
 * Supports both Issues and Pull Requests via ID fallback.
 * The addComment mutation accepts subjectId for both types.
 */
async function cmdComment(issueNumberStr, options, logger) {
    if (!options.bodyFile) {
        logger.error("--body-file is required for comment");
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
    let subjectId = await getIssueId(owner, repo, number);
    let targetType = "issue";
    if (!subjectId) {
        subjectId = await getPullRequestId(owner, repo, number);
        targetType = "pull_request";
    }
    if (!subjectId) {
        logger.error(`Issue or PR #${number} not found`);
        return 1;
    }
    const result = await runGraphQL(GRAPHQL_MUTATION_ADD_COMMENT, {
        subjectId,
        body: options.bodyFile,
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
    };
    console.log(JSON.stringify(output, null, 2));
    return 0;
}
/**
 * comments subcommand (#537)
 *
 * List all comments on an Issue using GraphQL.
 */
async function cmdComments(issueNumberStr, options, logger) {
    const repoInfo = resolveTargetRepo(options);
    if (!repoInfo) {
        logger.error("Could not determine repository");
        return 1;
    }
    const { owner, name: repo } = repoInfo;
    const number = parseIssueNumber(issueNumberStr);
    const result = await runGraphQL(GRAPHQL_QUERY_ISSUE_COMMENTS, {
        owner,
        name: repo,
        number,
    });
    if (!result.success || !result.data?.data?.repository?.issue) {
        logger.error(`Issue #${number} not found`);
        return 1;
    }
    const issue = result.data.data.repository.issue;
    const commentsData = issue.comments;
    const nodes = commentsData?.nodes ?? [];
    const output = {
        issue_number: issue.number,
        total_comments: commentsData?.totalCount ?? 0,
        comments: nodes.map((c) => ({
            id: c.id,
            database_id: c.databaseId,
            author: c.author?.login ?? null,
            body: c.body,
            created_at: c.createdAt,
            url: c.url,
        })),
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
async function cmdCommentEdit(commentIdStr, options, logger) {
    if (!options.bodyFile) {
        logger.error("--body-file is required for comment-edit");
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
    // REST API PATCH to edit comment (octokit)
    try {
        const octokit = getOctokit();
        await octokit.rest.issues.updateComment({
            owner,
            repo,
            comment_id: commentId,
            body: options.bodyFile,
        });
    }
    catch {
        logger.error(`Failed to edit comment ${commentId}`);
        return 1;
    }
    logger.success(`Edited comment ${commentId}`);
    const output = {
        comment_id: commentId,
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
 * - --body-file: Add a closing comment before closing
 * - --state-reason: COMPLETED (default) or NOT_PLANNED
 * - --repo: Cross-repo support
 */
async function cmdClose(issueNumberStr, options, logger) {
    const repoInfo = resolveTargetRepo(options);
    if (!repoInfo) {
        logger.error("Could not determine repository");
        return 1;
    }
    const { owner, name: repo } = repoInfo;
    const issueNumber = parseIssueNumber(issueNumberStr);
    // Get issue ID
    const issueId = await getIssueId(owner, repo, issueNumber);
    if (!issueId) {
        logger.error(`Issue #${issueNumber} not found`);
        return 1;
    }
    // Add closing comment if --body-file is provided
    if (options.bodyFile) {
        const commentResult = await runGraphQL(GRAPHQL_MUTATION_ADD_COMMENT, {
            subjectId: issueId,
            body: options.bodyFile,
        });
        if (commentResult.success) {
            logger.success(`Added closing comment to #${issueNumber}`);
        }
        else {
            logger.warn("Failed to add closing comment, proceeding with close");
        }
    }
    // Close the issue
    const stateReason = options.stateReason === "NOT_PLANNED" ? "NOT_PLANNED" : "COMPLETED";
    const result = await runGraphQL(GRAPHQL_MUTATION_CLOSE_ISSUE, {
        issueId,
        stateReason,
    });
    if (!result.success) {
        logger.error(`Failed to close issue #${issueNumber}`);
        return 1;
    }
    logger.success(`Closed #${issueNumber} (${stateReason})`);
    // Auto-update project Status based on stateReason (#373, #676)
    // Priority: --field-status > stateReason-based default
    const targetStatus = options.fieldStatus
        ? options.fieldStatus
        : stateReason === "NOT_PLANNED"
            ? "Not Planned"
            : "Done";
    const statusResult = await resolveAndUpdateStatus(owner, repo, issueNumber, targetStatus, logger);
    const statusUpdated = statusResult.success;
    if (statusUpdated) {
        logger.success(`Issue #${issueNumber} → ${targetStatus}`);
    }
    else {
        logger.warn(`Issue #${issueNumber}: Status 更新をスキップ (${statusResult.reason ?? "unknown"})`);
    }
    const output = {
        number: issueNumber,
        state: "CLOSED",
        stateReason,
        status: statusUpdated ? targetStatus : undefined,
    };
    console.log(JSON.stringify(output, null, 2));
    return 0;
}
/**
 * reopen subcommand - Reopen a closed issue.
 */
async function cmdReopen(issueNumberStr, options, logger) {
    const repoInfo = resolveTargetRepo(options);
    if (!repoInfo) {
        logger.error("Could not determine repository");
        return 1;
    }
    const { owner, name: repo } = repoInfo;
    const issueNumber = parseIssueNumber(issueNumberStr);
    const issueId = await getIssueId(owner, repo, issueNumber);
    if (!issueId) {
        logger.error(`Issue #${issueNumber} not found`);
        return 1;
    }
    const result = await runGraphQL(GRAPHQL_MUTATION_REOPEN_ISSUE, {
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
async function cmdImport(options, logger) {
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
        logger.error("No repo pair found for current repository. Configure repoPairs in config.");
        return 1;
    }
    const publicRepoParsed = parseRepoFullName(pair.public);
    if (!publicRepoParsed) {
        logger.error(`Invalid public repo: ${pair.public}`);
        return 1;
    }
    logger.info(`Importing issue #${publicIssueNumber} from ${pair.public}`);
    const fetchResult = await runGraphQL(GRAPHQL_QUERY_ISSUE_DETAIL, {
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
    const repoId = await getRepoId(owner, repo);
    if (!repoId) {
        logger.error("Could not get repository ID for private repo");
        return 1;
    }
    const createResult = await runGraphQL(GRAPHQL_MUTATION_CREATE_ISSUE, {
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
    const projectId = await getProjectId(owner, repo);
    if (projectId && privateIssue.id) {
        const itemId = await addItemToProject(projectId, privateIssue.id, logger);
        if (itemId) {
            logger.success("Added to project");
            const fields = {};
            if (importStatusValue)
                fields["Status"] = importStatusValue;
            if (options.priority)
                fields["Priority"] = options.priority;
            if (options.size)
                fields["Size"] = options.size;
            if (Object.keys(fields).length > 0) {
                await setItemFields(projectId, itemId, fields, logger);
            }
        }
    }
    // Comment on public issue to note internal tracking
    const publicIssueId = await getIssueId(publicRepoParsed.owner, publicRepoParsed.name, publicIssueNumber);
    if (publicIssueId) {
        const commentBody = `This issue is being tracked internally. Thank you for the report.`;
        await runGraphQL(GRAPHQL_MUTATION_ADD_COMMENT, {
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
async function cmdFields(options, logger) {
    const resolved = resolveTargetRepo(options);
    const repoInfo = getRepoInfo();
    const owner = resolved?.owner ?? options.owner ?? repoInfo?.owner;
    const repoName = resolved?.name ?? repoInfo?.name;
    if (!owner) {
        logger.error("Could not determine repository owner");
        return 1;
    }
    const projectId = await getProjectId(owner, repoName ?? undefined);
    if (!projectId) {
        logger.error(`No project found for owner '${owner}'`);
        return 1;
    }
    const fields = await getProjectFields(projectId);
    console.log(JSON.stringify(fields, null, 2));
    return 0;
}
/**
 * remove subcommand - Remove issue from project
 * (Migrated from projects delete)
 */
async function cmdRemove(target, options, logger) {
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
    const projectId = await getProjectId(owner, repo);
    if (!projectId) {
        logger.error(`No project found for owner '${owner}'`);
        return 1;
    }
    // Find project item for this issue
    // Fetch the issue to find its project item ID
    const issueResult = await getIssueDetail(owner, repo, issueNumber);
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
    const result = await runGraphQL(GRAPHQL_MUTATION_DELETE_ITEM, {
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
    }
    else {
        logger.error(`Failed to remove Issue #${issueNumber} from project`);
        return 1;
    }
}
// =============================================================================
// Main Command Handler
// =============================================================================
/**
 * issues command handler
 */
export async function issuesCommand(action, target, options) {
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
        case "search":
            if (!options.query) {
                logger.error("Search query required");
                logger.info("Usage: shirokuma-docs issues search <query> [--state open|closed]");
                exitCode = 1;
            }
            else {
                exitCode = await cmdSearch(options, logger);
            }
            break;
        case "show":
            if (!target) {
                logger.error("Issue number required");
                logger.info("Usage: shirokuma-docs issues show <number>");
                exitCode = 1;
            }
            else {
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
            }
            else {
                exitCode = await cmdUpdate(target, options, logger);
            }
            break;
        case "comment":
            if (!target) {
                logger.error("Issue or PR number required");
                logger.info("Usage: shirokuma-docs issues comment <issue-or-pr-number> --body-file ...");
                exitCode = 1;
            }
            else {
                exitCode = await cmdComment(target, options, logger);
            }
            break;
        case "comments":
            if (!target) {
                logger.error("Issue number required");
                logger.info("Usage: shirokuma-docs issues comments <number>");
                exitCode = 1;
            }
            else {
                exitCode = await cmdComments(target, options, logger);
            }
            break;
        case "comment-edit":
            if (!target) {
                logger.error("Comment ID required");
                logger.info("Usage: shirokuma-docs issues comment-edit <comment-id> --body-file ...");
                exitCode = 1;
            }
            else {
                exitCode = await cmdCommentEdit(target, options, logger);
            }
            break;
        case "close":
            if (!target) {
                logger.error("Issue number required");
                logger.info("Usage: shirokuma-docs issues close <number> [--body-file ...] [--state-reason COMPLETED|NOT_PLANNED]");
                exitCode = 1;
            }
            else {
                exitCode = await cmdClose(target, options, logger);
            }
            break;
        case "cancel":
            if (!target) {
                logger.error("Issue number required");
                logger.info("Usage: shirokuma-docs issues cancel <number> [--body-file ...]");
                exitCode = 1;
            }
            else {
                // cancel = close with NOT_PLANNED reason (#373)
                exitCode = await cmdClose(target, { ...options, stateReason: "NOT_PLANNED" }, logger);
            }
            break;
        case "reopen":
            if (!target) {
                logger.error("Issue number required");
                logger.info("Usage: shirokuma-docs issues reopen <number>");
                exitCode = 1;
            }
            else {
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
            }
            else {
                exitCode = await cmdRemove(target, options, logger);
            }
            break;
        case "pr-create":
            exitCode = await cmdPrCreate(options, logger);
            break;
        case "pr-list":
            exitCode = await cmdPrList(options, logger);
            break;
        case "pr-show":
            if (!target) {
                logger.error("PR number required");
                logger.info("Usage: shirokuma-docs issues pr-show <number>");
                exitCode = 1;
            }
            else {
                exitCode = await cmdPrShow(target, options, logger);
            }
            break;
        case "pr-comments":
            if (!target) {
                logger.error("PR number required");
                logger.info("Usage: shirokuma-docs issues pr-comments <number>");
                exitCode = 1;
            }
            else {
                exitCode = await cmdPrComments(target, options, logger);
            }
            break;
        case "merge":
            if (!target && !options.head) {
                logger.error("PR number or --head <branch> required");
                logger.info("Usage: shirokuma-docs issues merge <number> [--squash|--merge|--rebase]\n" +
                    "       shirokuma-docs issues merge --head <branch>");
                exitCode = 1;
            }
            else {
                exitCode = await cmdMerge(target, options, logger);
            }
            break;
        case "pr-reply":
            if (!target) {
                logger.error("PR number required");
                logger.info("Usage: shirokuma-docs issues pr-reply <number> --reply-to <id> --body-file ...");
                exitCode = 1;
            }
            else {
                exitCode = await cmdPrReply(target, options, logger);
            }
            break;
        case "resolve":
            if (!target) {
                logger.error("PR number required");
                logger.info("Usage: shirokuma-docs issues resolve <number> --thread-id <id>");
                exitCode = 1;
            }
            else {
                exitCode = await cmdResolve(target, options, logger);
            }
            break;
        case "sub-list":
            if (!target) {
                logger.error("Parent issue number required");
                logger.info("Usage: shirokuma-docs issues sub-list <parent-number>");
                exitCode = 1;
            }
            else {
                exitCode = await cmdSubList(target, options, logger);
            }
            break;
        case "sub-add":
            if (!target) {
                logger.error("Parent issue number required");
                logger.info("Usage: shirokuma-docs issues sub-add <parent> <child> [--replace-parent]");
                exitCode = 1;
            }
            else {
                // target = parent, options._subTarget = child (set in index.ts action)
                exitCode = await cmdSubAdd(target, options._subTarget, options, logger);
            }
            break;
        case "sub-remove":
            if (!target) {
                logger.error("Parent issue number required");
                logger.info("Usage: shirokuma-docs issues sub-remove <parent> <child>");
                exitCode = 1;
            }
            else {
                exitCode = await cmdSubRemove(target, options._subTarget, options, logger);
            }
            break;
        default:
            logger.error(`Unknown action: ${action}`);
            logger.info("Available actions: list, show, create, update, comment, comments, comment-edit, close, cancel, reopen, import, fields, remove, search, pr-list, pr-show, pr-comments, merge, pr-reply, resolve, sub-list, sub-add, sub-remove");
            exitCode = 1;
    }
    if (exitCode !== 0) {
        process.exit(exitCode);
    }
}
//# sourceMappingURL=issues.js.map