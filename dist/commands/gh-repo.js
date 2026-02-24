/**
 * gh-repo command - Repository information and management
 *
 * Subcommands:
 * - info: Get repository information
 * - labels: List or create labels
 */
import { createLogger } from "../utils/logger.js";
import { runGraphQL, getRepoInfo, } from "../utils/github.js";
// =============================================================================
// GraphQL Queries
// =============================================================================
const GRAPHQL_QUERY_REPO_INFO = `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    owner { login }
    name
    nameWithOwner
    description
    url
    defaultBranchRef { name }
    visibility
    isPrivate
    isFork
    stargazerCount
    forkCount
    issues(states: OPEN) { totalCount }
    hasIssuesEnabled
    hasProjectsEnabled
    hasDiscussionsEnabled
    hasWikiEnabled
    createdAt
    updatedAt
    pushedAt
  }
}
`;
const GRAPHQL_QUERY_LABELS = `
query($owner: String!, $name: String!, $first: Int!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    labels(first: $first, after: $cursor, orderBy: {field: NAME, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        name
        color
        description
      }
    }
  }
}
`;
const GRAPHQL_MUTATION_CREATE_LABEL = `
mutation($repositoryId: ID!, $name: String!, $color: String!, $description: String) {
  createLabel(input: {repositoryId: $repositoryId, name: $name, color: $color, description: $description}) {
    label {
      id
      name
      color
      description
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
// =============================================================================
// Helper Functions
// =============================================================================
/**
 * Get repository ID
 */
function getRepoId(owner, repo) {
    const result = runGraphQL(GRAPHQL_QUERY_REPO_ID, {
        owner,
        name: repo,
    });
    if (!result.success)
        return null;
    return result.data?.data?.repository?.id ?? null;
}
// =============================================================================
// Subcommand Handlers
// =============================================================================
/**
 * info subcommand
 */
async function cmdInfo(options, logger) {
    const repoInfo = getRepoInfo();
    if (!repoInfo) {
        logger.error("Could not determine repository");
        return 1;
    }
    const { owner, name: repo } = repoInfo;
    const result = runGraphQL(GRAPHQL_QUERY_REPO_INFO, {
        owner,
        name: repo,
    });
    if (!result.success || !result.data?.data?.repository) {
        logger.error("Failed to get repository information");
        return 1;
    }
    const r = result.data.data.repository;
    const output = {
        owner: r.owner?.login ?? owner,
        name: r.name ?? repo,
        full_name: r.nameWithOwner ?? `${owner}/${repo}`,
        description: r.description ?? "",
        url: r.url ?? "",
        default_branch: r.defaultBranchRef?.name ?? "main",
        visibility: r.visibility ?? "PRIVATE",
        is_private: r.isPrivate ?? true,
        is_fork: r.isFork ?? false,
        stargazers_count: r.stargazerCount ?? 0,
        forks_count: r.forkCount ?? 0,
        open_issues_count: r.issues?.totalCount ?? 0,
        features: {
            has_issues: r.hasIssuesEnabled ?? true,
            has_projects: r.hasProjectsEnabled ?? true,
            has_discussions: r.hasDiscussionsEnabled ?? false,
            has_wiki: r.hasWikiEnabled ?? false,
        },
        created_at: r.createdAt ?? "",
        updated_at: r.updatedAt ?? "",
        pushed_at: r.pushedAt ?? "",
    };
    console.log(JSON.stringify(output, null, 2));
    return 0;
}
/**
 * labels subcommand
 */
async function cmdLabels(options, logger) {
    const repoInfo = getRepoInfo();
    if (!repoInfo) {
        logger.error("Could not determine repository");
        return 1;
    }
    const { owner, name: repo } = repoInfo;
    // Create label if --create is specified
    if (options.create) {
        const repoId = getRepoId(owner, repo);
        if (!repoId) {
            logger.error("Could not get repository ID");
            return 1;
        }
        // Validate color (should be 6-char hex without #)
        let color = options.color ?? "ededed";
        if (color.startsWith("#")) {
            color = color.slice(1);
        }
        if (!/^[0-9a-fA-F]{6}$/.test(color)) {
            logger.error("Invalid color. Use 6-character hex (e.g., 'ff0000' or '#ff0000')");
            return 1;
        }
        const result = runGraphQL(GRAPHQL_MUTATION_CREATE_LABEL, {
            repositoryId: repoId,
            name: options.create,
            color: color,
            description: options.description ?? "",
        });
        if (!result.success) {
            logger.error("Failed to create label");
            return 1;
        }
        const label = result.data?.data?.createLabel?.label;
        if (!label?.id) {
            logger.error("Failed to create label");
            return 1;
        }
        logger.success(`Created label '${label.name}'`);
        const output = {
            id: label.id,
            name: label.name,
            color: label.color,
            description: label.description,
        };
        console.log(JSON.stringify(output, null, 2));
        return 0;
    }
    const labels = [];
    let cursor = null;
    while (true) {
        const result = runGraphQL(GRAPHQL_QUERY_LABELS, {
            owner,
            name: repo,
            first: 50,
            cursor: cursor,
        });
        if (!result.success || !result.data?.data?.repository?.labels)
            break;
        const labelsData = result.data.data.repository.labels;
        const nodes = labelsData.nodes ?? [];
        for (const node of nodes) {
            if (!node?.id || !node?.name)
                continue;
            labels.push({
                id: node.id,
                name: node.name,
                color: node.color ?? "",
                description: node.description ?? "",
            });
        }
        const pageInfo = labelsData.pageInfo ?? {};
        if (!pageInfo.hasNextPage)
            break;
        cursor = pageInfo.endCursor ?? null;
    }
    const output = {
        repository: `${owner}/${repo}`,
        labels: labels.map((l) => ({
            id: l.id,
            name: l.name,
            color: `#${l.color}`,
            description: l.description,
        })),
        total_count: labels.length,
    };
    console.log(JSON.stringify(output, null, 2));
    return 0;
}
// =============================================================================
// Main Command Handler
// =============================================================================
/**
 * gh-repo command handler
 */
export async function ghRepoCommand(action, options) {
    const logger = createLogger(options.verbose);
    logger.debug(`Action: ${action}`);
    let exitCode = 0;
    switch (action) {
        case "info":
            exitCode = await cmdInfo(options, logger);
            break;
        case "labels":
            exitCode = await cmdLabels(options, logger);
            break;
        default:
            logger.error(`Unknown action: ${action}`);
            logger.info("Available actions: info, labels");
            exitCode = 1;
    }
    if (exitCode !== 0) {
        process.exit(exitCode);
    }
}
//# sourceMappingURL=gh-repo.js.map