/**
 * GitHub CLI utilities for shirokuma-docs
 *
 * Shared utilities for projects, issues, discussions commands.
 * Uses gh CLI under the hood for authentication and API access.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Default timeout for subprocess calls (ms) */
const SUBPROCESS_TIMEOUT = 30_000;

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

/**
 * Run a gh CLI command and return parsed JSON output.
 */
export function runGhCommand<T = unknown>(
  args: string[],
  options: { silent?: boolean; timeout?: number } = {}
): GhResult<T> {
  const { silent = false, timeout = SUBPROCESS_TIMEOUT } = options;

  try {
    const result = spawnSync("gh", args, {
      encoding: "utf-8",
      timeout,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });

    if (result.error) {
      if (!silent) {
        console.error(`Error: ${result.error.message}`);
      }
      return { success: false, error: result.error.message };
    }

    if (result.status !== 0) {
      const errorMsg = result.stderr?.trim() || "Command failed";
      if (!silent) {
        console.error(`Error: ${errorMsg}`);
      }
      return { success: false, error: errorMsg };
    }

    const stdout = result.stdout?.trim();
    if (!stdout) {
      return { success: true, data: null as T };
    }

    try {
      return { success: true, data: JSON.parse(stdout) as T };
    } catch {
      return { success: false, error: `JSON parse error: ${stdout.slice(0, 100)}` };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (!silent) {
      console.error(`Error: ${errorMsg}`);
    }
    return { success: false, error: errorMsg };
  }
}

/**
 * Run a gh CLI command and return raw stdout (no JSON parsing).
 * Useful for commands that don't return JSON (e.g., gh pr merge).
 */
export function runGhCommandRaw(
  args: string[],
  options: { silent?: boolean; timeout?: number } = {}
): GhResult<string> {
  const { silent = false, timeout = SUBPROCESS_TIMEOUT } = options;

  try {
    const result = spawnSync("gh", args, {
      encoding: "utf-8",
      timeout,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (result.error) {
      if (!silent) console.error(`Error: ${result.error.message}`);
      return { success: false, error: result.error.message };
    }

    if (result.status !== 0) {
      const errorMsg = result.stderr?.trim() || "Command failed";
      if (!silent) console.error(`Error: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    return { success: true, data: result.stdout?.trim() ?? "" };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (!silent) console.error(`Error: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/** Variable value type for GraphQL */
export type GhVariableValue = string | number | boolean | null | string[];

/**
 * Check if variables contain complex types (arrays) that require --input mode
 */
function hasComplexVariables(
  variables: Record<string, GhVariableValue>
): boolean {
  return Object.values(variables).some((v) => Array.isArray(v));
}

/**
 * Run a GraphQL query via gh api graphql
 *
 * For simple variables (strings, numbers, booleans, null), uses -f/-F flags.
 * For complex variables (arrays), uses --input stdin to avoid gh CLI array parsing issues.
 */
export function runGraphQL<T = unknown>(
  query: string,
  variables: Record<string, GhVariableValue>,
  options: { silent?: boolean } = {}
): GhResult<T> {
  // If variables contain arrays, use --input mode for reliable JSON serialization
  if (hasComplexVariables(variables)) {
    return runGraphQLWithInput<T>(query, variables, options);
  }

  const args = ["api", "graphql", "-f", `query=${query}`];

  for (const [key, value] of Object.entries(variables)) {
    if (value === null) {
      args.push("-F", `${key}=null`);
    } else if (typeof value === "number" || typeof value === "boolean") {
      args.push("-F", `${key}=${value}`);
    } else {
      args.push("-F", `${key}=${value}`);
    }
  }

  const result = runGhCommand<T>(args, options);
  return checkGraphQLErrors(result);
}

/**
 * Run a GraphQL query using --input stdin for reliable complex variable support
 */
function runGraphQLWithInput<T = unknown>(
  query: string,
  variables: Record<string, GhVariableValue>,
  options: { silent?: boolean; timeout?: number } = {}
): GhResult<T> {
  const { silent = false, timeout = SUBPROCESS_TIMEOUT } = options;

  // Build clean variables object (replace null with undefined for JSON)
  const cleanVars: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(variables)) {
    if (value !== null) {
      cleanVars[key] = value;
    }
  }

  const requestBody = JSON.stringify({
    query,
    variables: cleanVars,
  });

  const args = ["api", "graphql", "--input", "-"];

  try {
    const result = spawnSync("gh", args, {
      encoding: "utf-8",
      input: requestBody,
      timeout,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (result.error) {
      if (!silent) console.error(`Error: ${result.error.message}`);
      return { success: false, error: result.error.message };
    }

    if (result.status !== 0) {
      const errorMsg = result.stderr?.trim() || "Command failed";
      if (!silent) console.error(`Error: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

    const stdout = result.stdout?.trim();
    if (!stdout) return { success: true, data: null as T };

    try {
      const parsed: GhResult<T> = { success: true, data: JSON.parse(stdout) as T };
      return checkGraphQLErrors(parsed);
    } catch {
      return {
        success: false,
        error: `JSON parse error: ${stdout.slice(0, 100)}`,
      };
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (!silent) console.error(`Error: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Check for GraphQL-level errors in a successful response.
 * GitHub API may return { data: ..., errors: [...] } for partial failures,
 * or { errors: [...] } for complete failures.
 */
function checkGraphQLErrors<T>(result: GhResult<T>): GhResult<T> {
  if (!result.success) return result;

  const responseData = result.data as Record<string, unknown> | null;
  if (!responseData) return result;

  const errors = responseData.errors as GraphQLError[] | undefined;
  if (!errors || errors.length === 0) return result;

  // Check if we have actual data alongside errors (partial success)
  if (responseData.data !== undefined && responseData.data !== null) {
    return { success: true, data: result.data, graphqlErrors: errors };
  }

  // No data, only errors — complete failure
  const msg = errors.map((e) => e.message).join("; ");
  return { success: false, error: `GraphQL error: ${msg}` };
}

/**
 * Get repository owner from current repo
 */
export function getOwner(): string | null {
  const result = runGhCommand<{ owner: { login: string } }>(
    ["repo", "view", "--json", "owner"],
    { silent: true }
  );

  if (!result.success) return null;
  return result.data?.owner?.login ?? null;
}

/**
 * Get repository name from current repo
 */
export function getRepoName(): string | null {
  const result = runGhCommand<{ name: string }>(
    ["repo", "view", "--json", "name"],
    { silent: true }
  );

  if (!result.success) return null;
  return result.data?.name ?? null;
}

/**
 * Get full repo info (owner/name)
 */
export function getRepoInfo(): { owner: string; name: string } | null {
  const owner = getOwner();
  const name = getRepoName();

  if (!owner || !name) return null;
  return { owner, name };
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
 * ファイルパスから本文を読み込む。
 * --body オプションでファイルパスを受け取り、内容をテキストとして返す。
 */
export function readBodyFile(filePath: string): string {
  return readFileSync(filePath, "utf-8");
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
 * Check if gh CLI is available and authenticated
 */
export function checkGhCli(): GhResult<{ authenticated: boolean; user: string }> {
  const result = runGhCommand<{ login: string }>(
    ["api", "user", "--jq", ".login"],
    { silent: true }
  );

  if (!result.success) {
    // Try to get more specific error
    const authResult = spawnSync("gh", ["auth", "status"], {
      encoding: "utf-8",
      timeout: 5000,
    });

    if (authResult.status !== 0) {
      return {
        success: false,
        error: "Not authenticated. Run: gh auth login",
      };
    }

    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: true,
    data: {
      authenticated: true,
      user: typeof result.data === "string" ? result.data : String(result.data),
    },
  };
}
