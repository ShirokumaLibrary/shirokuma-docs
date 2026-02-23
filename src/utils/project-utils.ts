/**
 * プロジェクト関連ユーティリティ（共有関数）。
 *
 * projects.ts から抽出。複数の commands/utils ファイルから参照される
 * 共有関数を集約し、Phase 2 の並行作業でコンフリクトを防ぐ。
 */

import { runGraphQL, getRepoName } from "./github.js";
import { getOctokit } from "./octokit-client.js";

// =============================================================================
// Types
// =============================================================================

/** ワークフロー情報 */
export interface ProjectWorkflow {
  id: string;
  name: string;
  number: number;
  enabled: boolean;
}

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

// =============================================================================
// Functions
// =============================================================================

// =============================================================================
// GraphQL Queries - Project list
// =============================================================================

/** Organization の ProjectsV2 一覧を取得 */
const GRAPHQL_QUERY_ORG_PROJECTS = `
query($login: String!, $first: Int!) {
  organization(login: $login) {
    projectsV2(first: $first) {
      nodes {
        id
        title
      }
    }
  }
}
`;

/** User の ProjectsV2 一覧を取得 */
const GRAPHQL_QUERY_USER_PROJECTS = `
query($login: String!, $first: Int!) {
  user(login: $login) {
    projectsV2(first: $first) {
      nodes {
        id
        title
      }
    }
  }
}
`;

/**
 * Get project ID by name (defaults to repository name).
 * Organization を先に試行し、失敗時に User にフォールバックする。
 */
export async function getProjectId(owner: string, projectName?: string): Promise<string | null> {
  const targetName = projectName || getRepoName();
  if (!targetName) return null;

  interface ProjectNode {
    id?: string;
    title?: string;
  }

  interface OrgQueryResult {
    data?: {
      organization?: {
        projectsV2?: {
          nodes?: ProjectNode[];
        };
      };
    };
  }

  interface UserQueryResult {
    data?: {
      user?: {
        projectsV2?: {
          nodes?: ProjectNode[];
        };
      };
    };
  }

  // Organization を先に試行
  let projects: ProjectNode[] = [];
  const orgResult = await runGraphQL<OrgQueryResult>(GRAPHQL_QUERY_ORG_PROJECTS, {
    login: owner,
    first: 50,
  });

  if (orgResult.success) {
    projects = orgResult.data?.data?.organization?.projectsV2?.nodes ?? [];
  } else {
    // User にフォールバック
    const userResult = await runGraphQL<UserQueryResult>(GRAPHQL_QUERY_USER_PROJECTS, {
      login: owner,
      first: 50,
    });

    if (!userResult.success) return null;
    projects = userResult.data?.data?.user?.projectsV2?.nodes ?? [];
  }

  if (projects.length === 0) return null;

  // Find project by name (repository name convention)
  for (const project of projects) {
    if (project?.title === targetName) {
      return project.id ?? null;
    }
  }

  // Fallback to first project if no match (#382: warn about fallback)
  const fallbackId = projects[0]?.id ?? null;
  if (fallbackId) {
    console.error(`warn: No project named '${targetName}'. Using first project as fallback.`);
  }
  return fallbackId;
}

/**
 * Owner の GraphQL Node ID を取得する。
 * Organization を先に試行し、失敗時に User にフォールバック。
 * cmdCreateProject() で createProjectV2 mutation に必要。
 */
export async function getOwnerNodeId(owner: string): Promise<string | null> {
  const octokit = getOctokit();

  // Organization を試行
  try {
    const { data } = await octokit.rest.orgs.get({ org: owner });
    return data.node_id ?? null;
  } catch {
    // Organization でなければ User を試行
  }

  try {
    const { data } = await octokit.rest.users.getByUsername({ username: owner });
    return data.node_id ?? null;
  } catch {
    return null;
  }
}

/**
 * プロジェクトのワークフロー一覧を取得する。
 * GitHub Projects V2 のビルトイン自動化を確認するために使用。
 *
 * @returns ワークフロー配列。取得失敗時は空配列
 */
export async function fetchWorkflows(projectId: string): Promise<ProjectWorkflow[]> {
  interface WorkflowNode {
    id?: string;
    name?: string;
    number?: number;
    enabled?: boolean;
  }

  interface QueryResult {
    data?: {
      node?: {
        workflows?: {
          nodes?: WorkflowNode[];
        };
      };
    };
  }

  const result = await runGraphQL<QueryResult>(GRAPHQL_QUERY_WORKFLOWS, { projectId });
  if (!result.success) return [];

  const nodes = result.data?.data?.node?.workflows?.nodes ?? [];
  return nodes
    .filter((n): n is Required<WorkflowNode> => !!n?.id && !!n?.name && n.number !== undefined && n.enabled !== undefined)
    .map((n) => ({
      id: n.id,
      name: n.name,
      number: n.number,
      enabled: n.enabled,
    }));
}
