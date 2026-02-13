/**
 * GitHub setup validation utility (#345)
 *
 * Checks whether manual GitHub configuration steps have been completed:
 * - Discussion categories (Handovers, ADR, Knowledge, Research)
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
import { getProjectFields } from "./project-fields.js";
import type { Logger } from "./logger.js";

// =============================================================================
// Types
// =============================================================================

export interface SetupCheckItem {
  category: "discussions" | "workflows" | "metrics";
  name: string;
  ok: boolean;
  hint?: string;
  url?: string;
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

// =============================================================================
// GraphQL Query (reuse same shape as session.ts)
// =============================================================================

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

// =============================================================================
// Check Functions
// =============================================================================

function checkDiscussionCategories(
  owner: string,
  repo: string
): SetupCheckItem[] {
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

  const nodes = result.success
    ? (result.data?.data?.repository?.discussionCategories?.nodes ?? [])
    : [];
  const existingNames = new Set(nodes.map((n) => n?.name).filter(Boolean));
  const categoriesUrl = `https://github.com/${owner}/${repo}/discussions/categories`;

  return REQUIRED_DISCUSSION_CATEGORIES.map((cat) => ({
    category: "discussions" as const,
    name: cat,
    ok: existingNames.has(cat),
    hint: existingNames.has(cat) ? undefined : `Create "${cat}" category in GitHub UI`,
    url: existingNames.has(cat) ? undefined : categoriesUrl,
  }));
}

function checkWorkflows(owner: string): SetupCheckItem[] {
  const projectId = getProjectId(owner);
  if (!projectId) return [];

  const workflows = fetchWorkflows(projectId);
  if (workflows.length === 0) return [];

  return RECOMMENDED_WORKFLOWS.map((name) => {
    const wf = workflows.find((w: ProjectWorkflow) => w.name === name);
    const ok = wf?.enabled ?? false;
    return {
      category: "workflows" as const,
      name,
      ok,
      hint: ok ? undefined : `Enable "${name}" workflow in GitHub Project Settings > Workflows`,
      url: ok ? undefined : undefined, // Project workflow settings URL is not stable
    };
  });
}

function checkMetricsFields(
  owner: string,
  metricsConfig: MetricsConfig
): SetupCheckItem[] {
  if (!metricsConfig.enabled) return [];

  const projectId = getProjectId(owner);
  if (!projectId) return [];

  const fields = getProjectFields(projectId);
  const mapping = metricsConfig.statusToDateMapping ?? {};

  return Object.values(mapping).map((fieldName) => ({
    category: "metrics" as const,
    name: fieldName,
    ok: fieldName in fields && fields[fieldName].type === "TEXT",
    hint: fieldName in fields
      ? undefined
      : `Create Text field "${fieldName}" in GitHub Project Settings > Fields`,
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

  const items: SetupCheckItem[] = [
    ...checkDiscussionCategories(repoOwner, repo),
    ...checkWorkflows(repoOwner),
    ...checkMetricsFields(repoOwner, getMetricsConfig(config)),
  ];

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
  for (const item of result.items) {
    if (item.ok) {
      logger.success(`${item.category}: ${item.name}`);
    } else {
      logger.error(`${item.category}: ${item.name}`);
      if (item.hint) logger.info(`  → ${item.hint}`);
      if (item.url) logger.info(`  URL: ${item.url}`);
    }
  }
}
