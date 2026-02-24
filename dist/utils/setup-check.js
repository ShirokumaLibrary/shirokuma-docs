/**
 * GitHub setup validation utility (#345, #527)
 *
 * Checks whether manual GitHub configuration steps have been completed:
 * - Discussion categories (Handovers, ADR, Knowledge, Research) with recommended settings
 * - Project existence and required fields (Status, Priority, Size)
 * - Project workflow automations (Item closed → Done, PR merged → Done)
 * - Metrics text fields (if metrics enabled)
 */
import { runGraphQL, getRepoInfo } from "./github.js";
import { loadGhConfig, getMetricsConfig } from "./gh-config.js";
import { getProjectId, fetchWorkflows, RECOMMENDED_WORKFLOWS, } from "./project-utils.js";
import { getProjectFields, resolveFieldName } from "./project-fields.js";
// =============================================================================
// Constants
// =============================================================================
const REQUIRED_DISCUSSION_CATEGORIES = ["Handovers", "ADR", "Knowledge", "Research"];
/** 必須 Project フィールド */
const REQUIRED_PROJECT_FIELDS = ["Status", "Priority", "Size"];
/**
 * 各 Discussion カテゴリの推奨設定
 * GitHub UI でカテゴリを作成する際に使用する値
 */
export const RECOMMENDED_CATEGORY_SETTINGS = {
    Handovers: {
        description: "セッション間の引き継ぎ記録",
        emoji: "🤝",
        format: "Open-ended discussion",
    },
    ADR: {
        description: "Architecture Decision Records — 設計判断の記録",
        emoji: "📐",
        format: "Open-ended discussion",
    },
    Knowledge: {
        description: "確認されたパターン・解決策の蓄積",
        emoji: "💡",
        format: "Open-ended discussion",
    },
    Research: {
        description: "調査が必要な事項の記録と追跡",
        emoji: "🔬",
        format: "Open-ended discussion",
    },
};
// =============================================================================
// GraphQL Query
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
// =============================================================================
// Check Functions
// =============================================================================
async function checkDiscussionCategories(owner, repo) {
    const result = await runGraphQL(GRAPHQL_QUERY_CATEGORIES, {
        owner,
        name: repo,
    });
    const nodes = result.success
        ? (result.data?.data?.repository?.discussionCategories?.nodes ?? [])
        : [];
    const existingNames = new Set(nodes.map((n) => n?.name).filter(Boolean));
    const categoriesUrl = `https://github.com/${owner}/${repo}/discussions/categories`;
    return REQUIRED_DISCUSSION_CATEGORIES.map((cat) => {
        const recommended = RECOMMENDED_CATEGORY_SETTINGS[cat];
        return {
            category: "discussions",
            name: cat,
            ok: existingNames.has(cat),
            hint: existingNames.has(cat)
                ? undefined
                : `Create "${cat}" category: Repository → Settings → Features → Discussions → Set up discussions → New category`,
            url: existingNames.has(cat) ? undefined : categoriesUrl,
            recommended,
        };
    });
}
function checkProjectExists(projectId) {
    return [{
            category: "project",
            name: "Project",
            ok: projectId !== null,
            hint: projectId
                ? undefined
                : "Create a GitHub Project: shirokuma-docs projects create-project --title \"<repo-name>\" --lang ja",
        }];
}
async function checkProjectFields(projectId) {
    const fields = await getProjectFields(projectId);
    return REQUIRED_PROJECT_FIELDS.map((fieldName) => {
        const resolved = resolveFieldName(fieldName, fields);
        return {
            category: "project",
            name: fieldName,
            ok: resolved !== null,
            hint: resolved
                ? undefined
                : `Create "${fieldName}" field: Run 'shirokuma-docs projects setup --lang ja' ` +
                    `or Project → Settings → Custom fields → New field (Single Select).`,
        };
    });
}
async function checkWorkflows(projectId) {
    const workflows = await fetchWorkflows(projectId);
    if (workflows.length === 0)
        return [];
    return RECOMMENDED_WORKFLOWS.map((name) => {
        const wf = workflows.find((w) => w.name === name);
        const ok = wf?.enabled ?? false;
        return {
            category: "workflows",
            name,
            ok,
            hint: ok
                ? undefined
                : `Enable "${name}" workflow: Project → ⋯ menu → Settings → Workflows → "${name}" → Enable (API not supported)`,
        };
    });
}
async function checkMetricsFields(projectId, metricsConfig) {
    if (!metricsConfig.enabled)
        return [];
    const fields = await getProjectFields(projectId);
    const mapping = metricsConfig.statusToDateMapping ?? {};
    return Object.values(mapping).map((fieldName) => ({
        category: "metrics",
        name: fieldName,
        ok: fieldName in fields && fields[fieldName].type === "TEXT",
        hint: fieldName in fields
            ? undefined
            : `Create Text field "${fieldName}": Project → Settings → Custom fields → New field (Text). ` +
                `Or run 'shirokuma-docs projects setup-metrics' for automated setup.`,
    }));
}
// =============================================================================
// Main Validation Function
// =============================================================================
/**
 * Validate GitHub setup and return results
 */
export async function validateGitHubSetup(logger) {
    const repoInfo = getRepoInfo();
    if (!repoInfo) {
        logger.error("Could not determine repository");
        return null;
    }
    const { owner: repoOwner, name: repo } = repoInfo;
    const config = loadGhConfig();
    const projectId = await getProjectId(repoOwner);
    const items = [
        ...await checkDiscussionCategories(repoOwner, repo),
        ...checkProjectExists(projectId),
    ];
    // Project 依存のチェック: projectId がない場合はスキップ
    if (projectId) {
        items.push(...await checkProjectFields(projectId), ...await checkWorkflows(projectId), ...await checkMetricsFields(projectId, getMetricsConfig(config)));
    }
    const ok = items.filter((i) => i.ok).length;
    return {
        repository: `${repoOwner}/${repo}`,
        items,
        summary: {
            total: items.length,
            ok,
            missing: items.length - ok,
        },
    };
}
/**
 * Print setup check results to logger (human-friendly format)
 */
export function printSetupCheckResults(result, logger) {
    const categoryOrder = ["discussions", "project", "workflows", "metrics"];
    const categoryLabels = {
        discussions: "Discussion Categories",
        project: "Project Setup",
        workflows: "Project Workflows",
        metrics: "Metrics Fields",
    };
    for (const cat of categoryOrder) {
        const catItems = result.items.filter((i) => i.category === cat);
        if (catItems.length === 0)
            continue;
        logger.info(`\n[${categoryLabels[cat]}]`);
        for (const item of catItems) {
            if (item.ok) {
                logger.success(`  ${item.name}`);
            }
            else {
                logger.error(`  ${item.name}`);
                if (item.hint)
                    logger.info(`    -> ${item.hint}`);
                if (item.url)
                    logger.info(`    URL: ${item.url}`);
                if (item.recommended) {
                    logger.info(`    Recommended settings:`);
                    logger.info(`      Description: ${item.recommended.description}`);
                    logger.info(`      Emoji: ${item.recommended.emoji}`);
                    logger.info(`      Format: ${item.recommended.format}`);
                }
            }
        }
    }
    // Reports カテゴリの任意案内
    const allDiscussionsOk = result.items
        .filter((i) => i.category === "discussions")
        .every((i) => i.ok);
    if (allDiscussionsOk) {
        logger.info("\n[Optional]");
        logger.info("  Reports category (for review reports) is also recommended");
    }
}
//# sourceMappingURL=setup-check.js.map