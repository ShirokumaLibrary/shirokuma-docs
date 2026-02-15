/**
 * Output Formatters
 *
 * Provides Table JSON format for AI agent context optimization.
 * Table JSON reduces token usage by eliminating repeated key names.
 *
 * Traditional JSON:
 * ```json
 * {
 *   "issues": [
 *     {"number": 19, "title": "Fix bug", "status": "Backlog"},
 *     {"number": 20, "title": "New feature", "status": "Ready"}
 *   ]
 * }
 * ```
 *
 * Table JSON:
 * ```json
 * {
 *   "columns": ["number", "title", "status"],
 *   "rows": [
 *     [19, "Fix bug", "Backlog"],
 *     [20, "New feature", "Ready"]
 *   ]
 * }
 * ```
 */

/**
 * Table JSON output structure
 */
export interface TableJsonOutput {
  columns: string[];
  rows: unknown[][];
}

/**
 * Supported output formats
 */
export type OutputFormat = "json" | "table-json";

/**
 * Options for formatOutput function
 */
export interface FormatOptions {
  /** The key in the data object that contains the array to convert */
  arrayKey?: string;
  /** Columns to include (optional, defaults to all keys from first item) */
  columns?: string[];
}

/**
 * Convert an array of objects to Table JSON format
 *
 * @param data - Array of objects to convert
 * @param columns - Optional array of column names to include (preserves order)
 * @returns Table JSON output with columns and rows
 *
 * @example
 * ```typescript
 * const data = [
 *   { number: 19, title: "Fix bug", status: "Backlog" },
 *   { number: 20, title: "New feature", status: "Ready" },
 * ];
 *
 * const tableJson = toTableJson(data);
 * // {
 * //   columns: ["number", "title", "status"],
 * //   rows: [[19, "Fix bug", "Backlog"], [20, "New feature", "Ready"]]
 * // }
 * ```
 */
export function toTableJson<T extends Record<string, unknown>>(
  data: T[],
  columns?: string[]
): TableJsonOutput {
  if (data.length === 0) {
    return { columns: columns ?? [], rows: [] };
  }

  // Determine columns: use specified columns or all keys from first item
  const columnNames = columns ?? Object.keys(data[0]);

  // Convert each object to an array of values in column order
  const rows = data.map((item) =>
    columnNames.map((col) => {
      const value = item[col];
      // Convert undefined to null for consistency
      if (value === undefined) {
        return null;
      }
      return value;
    })
  );

  return {
    columns: columnNames,
    rows,
  };
}

/**
 * Format output data based on specified format
 *
 * @param data - Data object to format
 * @param format - Output format ("json" or "table-json")
 * @param options - Format options for table-json
 * @returns Formatted JSON string
 *
 * @example
 * ```typescript
 * const data = {
 *   repository: "owner/repo",
 *   issues: [
 *     { number: 19, title: "Fix bug" },
 *   ],
 *   total_count: 1,
 * };
 *
 * // Regular JSON
 * formatOutput(data, "json");
 *
 * // Table JSON (converts issues array)
 * formatOutput(data, "table-json", {
 *   arrayKey: "issues",
 *   columns: ["number", "title"]
 * });
 * ```
 */
export function formatOutput(
  data: Record<string, unknown>,
  format: OutputFormat,
  options?: FormatOptions
): string {
  switch (format) {
    case "json":
      return JSON.stringify(data, null, 2);

    case "table-json": {
      if (!options?.arrayKey) {
        // Fallback to regular JSON if arrayKey not specified
        return JSON.stringify(data, null, 2);
      }

      const arrayData = data[options.arrayKey];
      if (!Array.isArray(arrayData)) {
        // Fallback to regular JSON if arrayKey doesn't point to an array
        return JSON.stringify(data, null, 2);
      }

      // Convert the array to table format
      const tableData = toTableJson(
        arrayData as Record<string, unknown>[],
        options.columns
      );

      // Build output with metadata and table data
      const output: Record<string, unknown> = {};

      // Add all non-array fields first
      for (const [key, value] of Object.entries(data)) {
        if (key !== options.arrayKey) {
          output[key] = value;
        }
      }

      // Add columns and rows
      output.columns = tableData.columns;
      output.rows = tableData.rows;

      return JSON.stringify(output, null, 2);
    }

    default:
      return "";
  }
}

/**
 * Default columns for issues list output
 */
export const GH_ISSUES_LIST_COLUMNS = [
  "number",
  "title",
  "state",
  "status",
  "priority",
  "type",
  "size",
];

/**
 * Default columns for projects list output
 */
export const GH_PROJECTS_LIST_COLUMNS = [
  "id",
  "title",
  "status",
  "priority",
  "type",
  "size",
  "issue_number",
];

/**
 * Default columns for issues search output (#552)
 */
export const GH_ISSUES_SEARCH_COLUMNS = [
  "number",
  "title",
  "state",
  "is_pr",
  "author",
  "created_at",
];

/**
 * Default columns for PR list output (#568)
 */
export const GH_PR_LIST_COLUMNS = [
  "number",
  "title",
  "state",
  "head_branch",
  "base_branch",
  "author",
  "review_decision",
  "url",
];

/**
 * Default columns for discussions list output
 */
export const GH_DISCUSSIONS_LIST_COLUMNS = [
  "number",
  "title",
  "category",
  "author",
  "answer_chosen",
];

/**
 * Default columns for discussions search output (#553)
 */
export const GH_DISCUSSIONS_SEARCH_COLUMNS = [
  "number",
  "title",
  "category",
  "author",
  "answer_chosen",
  "created_at",
];
