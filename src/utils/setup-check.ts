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
import { loadGhConfig, getMetricsConfig, type MetricsConfig } from "./gh-config.js";
import {
  getProjectId,
  fetchWorkflows,
  RECOMMENDED_WORKFLOWS,
  type ProjectWorkflow,
} from "../commands/projects.js";
import { getProjectFields, resolveFieldName } from "./project-fields.js";
import type { Logger } from "./logger.js";

// =============================================================================
// Types
// =============================================================================

/** Discussion カテゴリの推奨設定 */
export interface RecommendedCategorySetting {
  description: string;
  emoji: string;
  format: "Open-ended discussion" | "Question / Answer";
}

export interface SetupCheckItem {
  category: "discussions" | "workflows" | "metrics" | "project";
  name: string;
  ok: boolean;
  hint?: string;
  url?: string;
  /** Discussion カテゴリの推奨設定（discussions カテゴリのみ） */
  recommended?: RecommendedCategorySetting;
}

export interface SetupCheckResult {
  repository: string;
  items: SetupCheckItem[];
  summary: {
    total: number;
    ok: number;
    missing: number;
  };
}

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
export const RECOMMENDED_CATEGORY_SETTINGS: Record<string, RecommendedCategorySetting> = {
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

function checkDiscussionCategories(
  owner: string,
  repo: string
): SetupCheckItem[] {
  interface CategoryNode {
    id?: string;
    name?: string;
    description?: string;
    emoji?: string;
    isAnswerable?: boolean;
  }

  interface QueryResult {
    data?: {
      repository?: {
        discussionCategories?: {
          nodes?: CategoryNode[];
        };
      };
    };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_CATEGORIES, {
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
      category: "discussions" as const,
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

function checkProjectExists(projectId: string | null): SetupCheckItem[] {
  return [{
    category: "project" as const,
    name: "Project",
    ok: projectId !== null,
    hint: projectId
      ? undefined
      : "Create a GitHub Project: shirokuma-docs projects create-project --title \"<repo-name>\" --lang ja",
  }];
}

function checkProjectFields(projectId: string): SetupCheckItem[] {
  const fields = getProjectFields(projectId);

  return REQUIRED_PROJECT_FIELDS.map((fieldName) => {
    const resolved = resolveFieldName(fieldName, fields);
    return {
      category: "project" as const,
      name: fieldName,
      ok: resolved !== null,
      hint: resolved
        ? undefined
        : `Create "${fieldName}" field: Run 'shirokuma-docs projects setup --lang ja' ` +
          `or Project → Settings → Custom fields → New field (Single Select).`,
    };
  });
}

function checkWorkflows(projectId: string): SetupCheckItem[] {
  const workflows = fetchWorkflows(projectId);
  if (workflows.length === 0) return [];

  return RECOMMENDED_WORKFLOWS.map((name) => {
    const wf = workflows.find((w: ProjectWorkflow) => w.name === name);
    const ok = wf?.enabled ?? false;
    return {
      category: "workflows" as const,
      name,
      ok,
      hint: ok
        ? undefined
        : `Enable "${name}" workflow: Project → ⋯ menu → Settings → Workflows → "${name}" → Enable (API not supported)`,
    };
  });
}

function checkMetricsFields(
  projectId: string,
  metricsConfig: MetricsConfig
): SetupCheckItem[] {
  if (!metricsConfig.enabled) return [];

  const fields = getProjectFields(projectId);
  const mapping = metricsConfig.statusToDateMapping ?? {};

  return Object.values(mapping).map((fieldName) => ({
    category: "metrics" as const,
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
export function validateGitHubSetup(logger: Logger): SetupCheckResult | null {
  const repoInfo = getRepoInfo();
  if (!repoInfo) {
    logger.error("Could not determine repository");
    return null;
  }

  const { owner: repoOwner, name: repo } = repoInfo;
  const config = loadGhConfig();
  const projectId = getProjectId(repoOwner);

  const items: SetupCheckItem[] = [
    ...checkDiscussionCategories(repoOwner, repo),
    ...checkProjectExists(projectId),
  ];

  // Project 依存のチェック: projectId がない場合はスキップ
  if (projectId) {
    items.push(
      ...checkProjectFields(projectId),
      ...checkWorkflows(projectId),
      ...checkMetricsFields(projectId, getMetricsConfig(config)),
    );
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
export function printSetupCheckResults(
  result: SetupCheckResult,
  logger: Logger
): void {
  const categoryOrder = ["discussions", "project", "workflows", "metrics"] as const;
  const categoryLabels: Record<string, string> = {
    discussions: "Discussion Categories",
    project: "Project Setup",
    workflows: "Project Workflows",
    metrics: "Metrics Fields",
  };

  for (const cat of categoryOrder) {
    const catItems = result.items.filter((i) => i.category === cat);
    if (catItems.length === 0) continue;

    logger.info(`\n[${categoryLabels[cat]}]`);

    for (const item of catItems) {
      if (item.ok) {
        logger.success(`  ${item.name}`);
      } else {
        logger.error(`  ${item.name}`);
        if (item.hint) logger.info(`    -> ${item.hint}`);
        if (item.url) logger.info(`    URL: ${item.url}`);
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
