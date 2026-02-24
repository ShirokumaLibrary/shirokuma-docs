/**
 * gh-discussions command - GitHub Discussions management
 *
 * Subcommands:
 * - categories: List available discussion categories
 * - list: List discussions (optionally filtered by category)
 * - get: Get discussion details
 * - create: Create a new discussion
 * - update: Update discussion title/body
 * - search: Search discussions by keyword
 * - comment: Add a comment to a discussion
 *
 * Primarily used for Handovers category in session management.
 */
import { createLogger } from "../utils/logger.js";
import { runGraphQL, validateTitle, validateBody, } from "../utils/github.js";
import { loadGhConfig, getDefaultCategory, getDefaultLimit } from "../utils/gh-config.js";
import { formatOutput, GH_DISCUSSIONS_LIST_COLUMNS, } from "../utils/formatters.js";
import { resolveTargetRepo, validateCrossRepoAlias } from "../utils/repo-pairs.js";
// =============================================================================
// GraphQL Queries
// =============================================================================
const GRAPHQL_QUERY_CATEGORIES = `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    discussionCategories(first: 20) {
      nodes {
        id
        name
        description
        emoji
        isAnswerable
      }
    }
  }
}
`;
const GRAPHQL_QUERY_DISCUSSIONS = `
query($owner: String!, $name: String!, $first: Int!, $categoryId: ID, $cursor: String) {
  repository(owner: $owner, name: $name) {
    discussions(first: $first, after: $cursor, categoryId: $categoryId, orderBy: {field: CREATED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        number
        title
        url
        createdAt
        updatedAt
        answerChosenAt
        author { login }
        category { name }
      }
    }
  }
}
`;
const GRAPHQL_QUERY_DISCUSSION = `
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    discussion(number: $number) {
      id
      number
      title
      body
      url
      createdAt
      updatedAt
      answerChosenAt
      author { login }
      category { name }
    }
  }
}
`;
const GRAPHQL_QUERY_DISCUSSION_BY_ID = `
query($id: ID!) {
  node(id: $id) {
    ... on Discussion {
      id
      number
      title
      body
      url
      createdAt
      updatedAt
      answerChosenAt
      author { login }
      category { name }
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
const GRAPHQL_MUTATION_UPDATE_DISCUSSION = `
mutation($discussionId: ID!, $title: String, $body: String) {
  updateDiscussion(input: {discussionId: $discussionId, title: $title, body: $body}) {
    discussion {
      id
      number
      url
      title
      body
    }
  }
}
`;
const GRAPHQL_MUTATION_ADD_DISCUSSION_COMMENT = `
mutation($discussionId: ID!, $body: String!) {
  addDiscussionComment(input: {discussionId: $discussionId, body: $body}) {
    comment {
      id
      url
    }
  }
}
`;
const GRAPHQL_QUERY_SEARCH_DISCUSSIONS = `
query($query: String!, $first: Int!) {
  search(query: $query, type: DISCUSSION, first: $first) {
    discussionCount
    nodes {
      ... on Discussion {
        id
        number
        title
        url
        createdAt
        updatedAt
        author { login }
        category { name }
        answerChosenAt
      }
    }
  }
}
`;
// =============================================================================
// Helper Functions
// =============================================================================
/**
 * Get discussion categories
 */
function getCategories(owner, repo) {
    const result = runGraphQL(GRAPHQL_QUERY_CATEGORIES, {
        owner,
        name: repo,
    });
    if (!result.success || !result.data?.data?.repository?.discussionCategories) {
        return [];
    }
    const nodes = result.data.data.repository.discussionCategories.nodes ?? [];
    return nodes
        .filter((n) => !!n?.id && !!n?.name)
        .map((n) => ({
        id: n.id,
        name: n.name,
        description: n.description ?? "",
        emoji: n.emoji ?? "",
        isAnswerable: n.isAnswerable ?? false,
    }));
}
/**
 * Find category by name
 */
function findCategory(owner, repo, categoryName) {
    const categories = getCategories(owner, repo);
    return (categories.find((c) => c.name.toLowerCase() === categoryName.toLowerCase()) ?? null);
}
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
/**
 * Get discussion GraphQL ID by number
 */
function getDiscussionId(owner, repo, number) {
    const result = runGraphQL(GRAPHQL_QUERY_DISCUSSION, {
        owner,
        name: repo,
        number,
    });
    if (!result.success)
        return null;
    return result.data?.data?.repository?.discussion?.id ?? null;
}
// =============================================================================
// Subcommand Handlers
// =============================================================================
/**
 * categories subcommand
 */
async function cmdCategories(options, logger) {
    const repoInfo = resolveTargetRepo(options);
    if (!repoInfo) {
        logger.error("Could not determine repository");
        return 1;
    }
    const { owner, name: repo } = repoInfo;
    const categories = getCategories(owner, repo);
    if (categories.length === 0) {
        logger.warn("No discussion categories found. Discussions may not be enabled for this repository.");
        return 0;
    }
    const output = {
        repository: `${owner}/${repo}`,
        categories: categories.map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            emoji: c.emoji,
            is_answerable: c.isAnswerable,
        })),
        total_count: categories.length,
    };
    console.log(JSON.stringify(output, null, 2));
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
    const { owner, name: repo } = repoInfo;
    // Load config for defaults
    const config = loadGhConfig();
    // Use category from options or config default
    const categoryName = options.category ?? getDefaultCategory(config);
    // Find category ID
    let categoryId = null;
    if (categoryName) {
        const category = findCategory(owner, repo, categoryName);
        if (!category) {
            logger.error(`Category '${categoryName}' not found`);
            const categories = getCategories(owner, repo);
            if (categories.length > 0) {
                logger.info(`Available categories: ${categories.map((c) => c.name).join(", ")}`);
            }
            return 1;
        }
        categoryId = category.id;
    }
    const discussions = [];
    let cursor = null;
    const limit = options.limit ?? getDefaultLimit(config);
    while (discussions.length < limit) {
        const fetchCount = Math.min(limit - discussions.length, 50);
        const result = runGraphQL(GRAPHQL_QUERY_DISCUSSIONS, {
            owner,
            name: repo,
            first: fetchCount,
            categoryId: categoryId,
            cursor: cursor,
        });
        if (!result.success || !result.data?.data?.repository?.discussions)
            break;
        const discussionsData = result.data.data.repository.discussions;
        const nodes = discussionsData.nodes ?? [];
        for (const node of nodes) {
            if (!node?.id || !node?.number)
                continue;
            discussions.push({
                id: node.id,
                number: node.number,
                title: node.title ?? "",
                url: node.url ?? "",
                createdAt: node.createdAt ?? "",
                updatedAt: node.updatedAt ?? "",
                author: node.author?.login ?? "",
                category: node.category?.name ?? "",
                answerChosenAt: node.answerChosenAt ?? undefined,
            });
        }
        const pageInfo = discussionsData.pageInfo ?? {};
        if (!pageInfo.hasNextPage)
            break;
        cursor = pageInfo.endCursor ?? null;
    }
    const output = {
        repository: `${owner}/${repo}`,
        category: categoryName ?? null,
        discussions: discussions.map((d) => ({
            id: d.id,
            number: d.number,
            title: d.title,
            url: d.url,
            created_at: d.createdAt,
            updated_at: d.updatedAt,
            author: d.author,
            category: d.category,
            answer_chosen: !!d.answerChosenAt,
        })),
        total_count: discussions.length,
    };
    const outputFormat = options.format ?? "json";
    const formatted = formatOutput(output, outputFormat, {
        arrayKey: "discussions",
        columns: GH_DISCUSSIONS_LIST_COLUMNS,
    });
    console.log(formatted);
    return 0;
}
/**
 * get subcommand
 */
async function cmdGet(idOrNumber, options, logger) {
    const repoInfo = resolveTargetRepo(options);
    if (!repoInfo) {
        logger.error("Could not determine repository");
        return 1;
    }
    const { owner, name: repo } = repoInfo;
    let discussion = null;
    // Check if it's a number or an ID
    if (/^\d+$/.test(idOrNumber)) {
        // It's a discussion number
        const number = parseInt(idOrNumber, 10);
        const result = runGraphQL(GRAPHQL_QUERY_DISCUSSION, {
            owner,
            name: repo,
            number,
        });
        if (result.success && result.data?.data?.repository?.discussion) {
            discussion = result.data.data.repository.discussion;
        }
    }
    else {
        const result = runGraphQL(GRAPHQL_QUERY_DISCUSSION_BY_ID, {
            id: idOrNumber,
        });
        if (result.success && result.data?.data?.node) {
            discussion = result.data.data.node;
        }
    }
    if (!discussion || !discussion.id) {
        logger.error(`Discussion '${idOrNumber}' not found`);
        return 1;
    }
    const output = {
        id: discussion.id,
        number: discussion.number,
        title: discussion.title,
        body: discussion.body,
        url: discussion.url,
        created_at: discussion.createdAt,
        updated_at: discussion.updatedAt,
        author: discussion.author?.login,
        category: discussion.category?.name,
        answer_chosen: !!discussion.answerChosenAt,
    };
    console.log(JSON.stringify(output, null, 2));
    return 0;
}
/**
 * create subcommand
 */
async function cmdCreate(options, logger) {
    // Load config for defaults
    const config = loadGhConfig();
    // Validation
    if (!options.title) {
        logger.error("--title is required");
        return 1;
    }
    // Use category from options or config default
    const categoryName = options.category ?? getDefaultCategory(config);
    if (!categoryName) {
        logger.error("--category is required (or set github.discussionsCategory in shirokuma-docs.config.yaml)");
        return 1;
    }
    if (!options.body) {
        logger.error("--body is required");
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
    // Find category
    const category = findCategory(owner, repo, categoryName);
    if (!category) {
        logger.error(`Category '${categoryName}' not found`);
        const categories = getCategories(owner, repo);
        if (categories.length > 0) {
            logger.info(`Available categories: ${categories.map((c) => c.name).join(", ")}`);
        }
        return 1;
    }
    const result = runGraphQL(GRAPHQL_MUTATION_CREATE_DISCUSSION, {
        repositoryId: repoId,
        categoryId: category.id,
        title: options.title,
        body: options.body,
    });
    if (!result.success) {
        logger.error("Failed to create discussion");
        return 1;
    }
    const discussion = result.data?.data?.createDiscussion?.discussion;
    if (!discussion?.id) {
        logger.error("Failed to create discussion");
        return 1;
    }
    logger.success(`Created discussion #${discussion.number}`);
    const output = {
        id: discussion.id,
        number: discussion.number,
        title: discussion.title,
        url: discussion.url,
        category: categoryName,
    };
    console.log(JSON.stringify(output, null, 2));
    return 0;
}
/**
 * update subcommand
 */
async function cmdUpdate(idOrNumber, options, logger) {
    const repoInfo = resolveTargetRepo(options);
    if (!repoInfo) {
        logger.error("Could not determine repository");
        return 1;
    }
    const { owner, name: repo } = repoInfo;
    // Validate that at least one update field is provided
    if (!options.title && !options.body) {
        logger.error("At least --title or --body is required for update");
        return 1;
    }
    // Validate title if provided
    if (options.title) {
        const titleError = validateTitle(options.title);
        if (titleError) {
            logger.error(titleError);
            return 1;
        }
    }
    // Validate body if provided
    if (options.body) {
        const bodyError = validateBody(options.body);
        if (bodyError) {
            logger.error(bodyError);
            return 1;
        }
    }
    // Get discussion ID
    let discussionId = null;
    if (/^\d+$/.test(idOrNumber)) {
        // It's a discussion number
        const number = parseInt(idOrNumber, 10);
        discussionId = getDiscussionId(owner, repo, number);
    }
    else {
        // It's already a GraphQL ID
        discussionId = idOrNumber;
    }
    if (!discussionId) {
        logger.error(`Discussion '${idOrNumber}' not found`);
        return 1;
    }
    const result = runGraphQL(GRAPHQL_MUTATION_UPDATE_DISCUSSION, {
        discussionId,
        title: options.title ?? null,
        body: options.body ?? null,
    });
    if (!result.success) {
        logger.error("Failed to update discussion");
        return 1;
    }
    const discussion = result.data?.data?.updateDiscussion?.discussion;
    if (!discussion?.id) {
        logger.error("Failed to update discussion");
        return 1;
    }
    logger.success(`Updated discussion #${discussion.number}`);
    const output = {
        id: discussion.id,
        number: discussion.number,
        title: discussion.title,
        url: discussion.url,
    };
    console.log(JSON.stringify(output, null, 2));
    return 0;
}
/**
 * search subcommand
 */
async function cmdSearch(options, logger) {
    const repoInfo = resolveTargetRepo(options);
    if (!repoInfo) {
        logger.error("Could not determine repository");
        return 1;
    }
    const { owner, name: repo } = repoInfo;
    // Build search query
    // GitHub search syntax: repo:owner/name type:discussion <query>
    let searchQuery = `repo:${owner}/${repo} type:discussion`;
    if (options.query) {
        searchQuery += ` ${options.query}`;
    }
    if (options.category) {
        searchQuery += ` category:"${options.category}"`;
    }
    const limit = options.limit ?? 20;
    const result = runGraphQL(GRAPHQL_QUERY_SEARCH_DISCUSSIONS, {
        query: searchQuery,
        first: Math.min(limit, 100),
    });
    if (!result.success || !result.data?.data?.search) {
        logger.error("Search failed");
        return 1;
    }
    const searchData = result.data.data.search;
    const nodes = searchData.nodes ?? [];
    const discussions = nodes
        .filter((n) => !!n?.id && !!n?.number)
        .map((n) => ({
        id: n.id,
        number: n.number,
        title: n.title ?? "",
        url: n.url ?? "",
        createdAt: n.createdAt ?? "",
        updatedAt: n.updatedAt ?? "",
        author: n.author?.login ?? "",
        category: n.category?.name ?? "",
        answerChosenAt: n.answerChosenAt ?? undefined,
    }));
    const output = {
        repository: `${owner}/${repo}`,
        query: options.query ?? "",
        category: options.category ?? null,
        discussions: discussions.map((d) => ({
            id: d.id,
            number: d.number,
            title: d.title,
            url: d.url,
            created_at: d.createdAt,
            updated_at: d.updatedAt,
            author: d.author,
            category: d.category,
            answer_chosen: !!d.answerChosenAt,
        })),
        total_count: searchData.discussionCount ?? discussions.length,
    };
    const outputFormat = options.format ?? "json";
    const formatted = formatOutput(output, outputFormat, {
        arrayKey: "discussions",
        columns: GH_DISCUSSIONS_LIST_COLUMNS,
    });
    console.log(formatted);
    return 0;
}
/**
 * comment subcommand
 */
async function cmdComment(idOrNumber, options, logger) {
    if (!options.body) {
        logger.error("--body is required for comment");
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
    // Get discussion ID
    let discussionId = null;
    let discussionNumber;
    if (/^\d+$/.test(idOrNumber)) {
        // It's a discussion number
        discussionNumber = parseInt(idOrNumber, 10);
        discussionId = getDiscussionId(owner, repo, discussionNumber);
    }
    else {
        // It's already a GraphQL ID
        discussionId = idOrNumber;
        discussionNumber = 0; // Unknown when using ID directly
    }
    if (!discussionId) {
        logger.error(`Discussion '${idOrNumber}' not found`);
        return 1;
    }
    const result = runGraphQL(GRAPHQL_MUTATION_ADD_DISCUSSION_COMMENT, {
        discussionId,
        body: options.body,
    });
    if (!result.success) {
        logger.error("Failed to add comment");
        return 1;
    }
    const comment = result.data?.data?.addDiscussionComment?.comment;
    if (!comment?.id) {
        logger.error("Failed to add comment");
        return 1;
    }
    if (discussionNumber > 0) {
        logger.success(`Added comment to discussion #${discussionNumber}`);
    }
    else {
        logger.success("Added comment to discussion");
    }
    const output = {
        discussion_id: discussionId,
        discussion_number: discussionNumber > 0 ? discussionNumber : undefined,
        comment_id: comment.id,
        comment_url: comment.url,
    };
    console.log(JSON.stringify(output, null, 2));
    return 0;
}
// =============================================================================
// Main Command Handler
// =============================================================================
/**
 * gh-discussions command handler
 */
export async function ghDiscussionsCommand(action, target, options) {
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
        case "categories":
            exitCode = await cmdCategories(options, logger);
            break;
        case "list":
            exitCode = await cmdList(options, logger);
            break;
        case "get":
            if (!target) {
                logger.error("Discussion ID or number required");
                logger.info("Usage: shirokuma-docs gh-discussions get <id-or-number>");
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
                logger.error("Discussion ID or number required");
                logger.info("Usage: shirokuma-docs gh-discussions update <id-or-number> --title ... --body ...");
                exitCode = 1;
            }
            else {
                exitCode = await cmdUpdate(target, options, logger);
            }
            break;
        case "search":
            if (!options.query && !options.category) {
                logger.error("Either search query or --category is required");
                logger.info("Usage: shirokuma-docs gh-discussions search <query> [--category ...]");
                exitCode = 1;
            }
            else {
                exitCode = await cmdSearch(options, logger);
            }
            break;
        case "comment":
            if (!target) {
                logger.error("Discussion ID or number required");
                logger.info("Usage: shirokuma-docs gh-discussions comment <id-or-number> --body ...");
                exitCode = 1;
            }
            else {
                exitCode = await cmdComment(target, options, logger);
            }
            break;
        default:
            logger.error(`Unknown action: ${action}`);
            logger.info("Available actions: categories, list, get, create, update, search, comment");
            exitCode = 1;
    }
    if (exitCode !== 0) {
        process.exit(exitCode);
    }
}
//# sourceMappingURL=gh-discussions.js.map