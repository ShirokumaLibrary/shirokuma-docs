/**
 * GitHub utilities for shirokuma-docs
 *
 * Shared utilities for projects, issues, discussions commands.
 * Uses octokit for GraphQL and REST API access.
 */

import { readFileSync } from "node:fs";
import { getOctokit } from "./octokit-client.js";
import { GraphqlResponseError } from "@octokit/graphql";
import { getGitRemoteUrl, isInsideGitRepo, getGitRemotes } from "./git-local.js";

/** Input validation limits */
export const MAX_TITLE_LENGTH = 256;
export const MAX_BODY_LENGTH = 65536; // 64KB

/** Pagination limits */
export const ITEMS_PER_PAGE = 100;
export const FIELDS_PER_PAGE = 20;

/**
 * GraphQL-level error from GitHub API response.
 * Present in partial or full failure responses alongside or instead of data.
 */
export interface GraphQLError {
  message: string;
  type?: string;
  path?: string[];
}

/**
 * Result type for GitHub operations.
 * graphqlErrors is set when the GraphQL response contains errors alongside data (partial success).
 */
export type GhResult<T> =
  | { success: true; data: T; graphqlErrors?: GraphQLError[] }
  | { success: false; error: string };

/** Variable value type for GraphQL */
export type GhVariableValue = string | number | boolean | null | string[];

/**
 * Convert GhVariableValue record to octokit-compatible variables.
 * null は除外（octokit は undefined で省略）。
 */
function convertVariables(
  variables: Record<string, GhVariableValue>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(variables)) {
    if (value !== null) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Run a GraphQL query via octokit.graphql()
 *
 * 後方互換ラッパー: octokit は { data: ... } ラッパーを自動除去して返すが、
 * 既存の呼び出し元は result.data.data.xxx でアクセスしているため、
 * { data: ... } で再ラップして互換性を維持する。
 */
export async function runGraphQL<T = unknown>(
  query: string,
  variables: Record<string, GhVariableValue>,
  options: { silent?: boolean; headers?: Record<string, string> } = {}
): Promise<GhResult<T>> {
  // Guard: "query" は octokit でもクエリパラメータとして予約されている (#585)
  if ("query" in variables) {
    return {
      success: false,
      error: 'Variable name "query" is reserved. Use a different name (e.g., "searchQuery").',
    };
  }

  const { silent = false } = options;

  try {
    const octokit = getOctokit();
    const convertedVars = convertVariables(variables);

    const data = await octokit.graphql(query, {
      ...convertedVars,
      ...(options.headers ? { headers: options.headers } : {}),
    });

    // 後方互換: { data: <response> } でラップ
    return { success: true, data: { data } as unknown as T };
  } catch (error) {
    if (error instanceof GraphqlResponseError) {
      // 部分成功: data と errors が両方ある場合
      if (error.data !== undefined && error.data !== null) {
        const graphqlErrors: GraphQLError[] = (error.errors ?? []).map((e) => ({
          message: e.message,
          type: (e as Record<string, unknown>).type as string | undefined,
          path: (e as Record<string, unknown>).path as string[] | undefined,
        }));
        return {
          success: true,
          data: { data: error.data } as unknown as T,
          graphqlErrors,
        };
      }

      // 完全失敗: data なし
      const msg = (error.errors ?? []).map((e) => e.message).filter(Boolean).join("; ") || "Unknown GraphQL error";
      if (!silent) console.error(`GraphQL error: ${msg}`);
      return { success: false, error: `GraphQL error: ${msg}` };
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    if (!silent) console.error(`Error: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

// =============================================================================
// Git remote parsing (no API calls needed)
// =============================================================================

/**
 * git remote の origin URL から owner/repo を抽出（SSH/HTTPS 両対応）。
 * API 呼び出し不要で高速。認証前でも動作する。
 */
export function parseGitRemoteUrl(url: string): { owner: string; name: string } | null {
  // SSH: git@github.com:owner/repo.git
  const sshMatch = url.match(/git@github\.com:([^/]+)\/([^/\s]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], name: sshMatch[2] };
  }

  // HTTPS: https://github.com/owner/repo.git
  const httpsMatch = url.match(/https?:\/\/github\.com\/([^/]+)\/([^/\s]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], name: httpsMatch[2] };
  }

  return null;
}

/**
 * .git/config から origin リモート URL を取得する。
 * git-local.ts による直接ファイル読み取り。同期関数。
 */
function getGitRemoteOriginUrl(): string | null {
  return getGitRemoteUrl("origin");
}

/**
 * Get repository owner from current repo (git remote URL parsing)
 */
export function getOwner(): string | null {
  const url = getGitRemoteOriginUrl();
  if (!url) return null;
  return parseGitRemoteUrl(url)?.owner ?? null;
}

/**
 * Get repository name from current repo (git remote URL parsing)
 */
export function getRepoName(): string | null {
  const url = getGitRemoteOriginUrl();
  if (!url) return null;
  return parseGitRemoteUrl(url)?.name ?? null;
}

/**
 * Get full repo info (owner/name) via git remote URL parsing
 */
export function getRepoInfo(): { owner: string; name: string } | null {
  const url = getGitRemoteOriginUrl();
  if (!url) return null;
  return parseGitRemoteUrl(url);
}

/**
 * リポジトリ情報取得の失敗原因を診断する。
 * getOwner() / getRepoName() / getRepoInfo() が null を返した後に呼び出す。
 * コストの低いチェックから順に実行し、最初にヒットした原因を返す。
 */
export async function diagnoseRepoFailure(): Promise<{ cause: string; suggestion: string }> {
  // (1) git リポジトリ内かチェック（.git ファイル直接読み取り）
  if (!isInsideGitRepo()) {
    return {
      cause: "Not inside a git repository",
      suggestion: "Run this command from a git repository root, or run: git init",
    };
  }

  // (2) git remote に GitHub URL が含まれるかチェック（.git/config 直接読み取り）
  const remotes = getGitRemotes();

  if (remotes.length === 0) {
    return {
      cause: "No git remote configured",
      suggestion: "Add a GitHub remote: git remote add origin https://github.com/OWNER/REPO.git",
    };
  }

  if (!remotes.some(r => r.url.includes("github.com"))) {
    return {
      cause: "No GitHub remote found (remotes exist but none point to github.com)",
      suggestion: "Add a GitHub remote: git remote add origin https://github.com/OWNER/REPO.git",
    };
  }

  // (3) octokit で認証チェック
  const ghCheck = await checkGitHubAuth();
  if (!ghCheck.success) {
    return {
      cause: "GitHub API is not authenticated",
      suggestion: "Set GITHUB_TOKEN environment variable, or run: gh auth login",
    };
  }

  // (4) フォールバック: 上記すべてパスしたが取得できない場合
  return {
    cause: "Could not resolve repository (multiple remotes or no default set)",
    suggestion: "Use the --owner option to specify the repository owner",
  };
}

/**
 * Validate title input
 */
export function validateTitle(title: string): string | null {
  if (!title || !title.trim()) {
    return "Title cannot be empty";
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return `Title too long (${title.length} > ${MAX_TITLE_LENGTH} chars)`;
  }
  return null;
}

/**
 * Validate body input
 */
export function validateBody(body: string | undefined): string | null {
  if (!body) return null;
  if (body.length > MAX_BODY_LENGTH) {
    return `Body too long (${body.length} > ${MAX_BODY_LENGTH} chars)`;
  }
  return null;
}

/**
 * ファイルパスまたは stdin から本文を読み込む。
 * `--body -` の場合は stdin、それ以外はファイルパスとして読み取る。
 */
export function readBodyFile(source: string): string {
  if (source === "-") {
    return readFileSync(0, "utf-8");
  }
  return readFileSync(source, "utf-8");
}

/**
 * Check if value looks like an Issue number (integer or #number)
 */
export function isIssueNumber(value: string): boolean {
  const clean = value.replace(/^#/, "");
  return /^\d+$/.test(clean);
}

/**
 * Parse issue number from string (handles #123 and 123)
 */
export function parseIssueNumber(value: string): number {
  return parseInt(value.replace(/^#/, ""), 10);
}

/**
 * Check if GitHub API is accessible and authenticated.
 * Uses octokit REST API (GITHUB_TOKEN or gh auth token fallback).
 */
export async function checkGitHubAuth(): Promise<GhResult<{ authenticated: boolean; user: string }>> {
  try {
    const octokit = getOctokit();
    const { data } = await octokit.rest.users.getAuthenticated();

    return {
      success: true,
      data: {
        authenticated: true,
        user: data.login,
      },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg.includes("401")
        ? "Not authenticated. Set GITHUB_TOKEN, or run: gh auth login"
        : errorMsg,
    };
  }
}
