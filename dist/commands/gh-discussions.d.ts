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
import { OutputFormat } from "../utils/formatters.js";
export interface GhDiscussionsOptions {
    verbose?: boolean;
    category?: string;
    limit?: number;
    format?: OutputFormat;
    title?: string;
    body?: string;
    query?: string;
    public?: boolean;
    repo?: string;
}
/**
 * gh-discussions command handler
 */
export declare function ghDiscussionsCommand(action: string, target: string | undefined, options: GhDiscussionsOptions): Promise<void>;
//# sourceMappingURL=gh-discussions.d.ts.map