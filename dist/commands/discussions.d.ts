/**
 * discussions command - GitHub Discussions management
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
import { Logger } from "../utils/logger.js";
import { OutputFormat } from "../utils/formatters.js";
export interface DiscussionsOptions {
    verbose?: boolean;
    category?: string;
    limit?: number;
    format?: OutputFormat;
    title?: string;
    bodyFile?: string;
    query?: string;
    public?: boolean;
    repo?: string;
}
/**
 * get subcommand
 */
declare function cmdGet(idOrNumber: string, options: DiscussionsOptions, logger: Logger): Promise<number>;
/**
 * discussions command handler
 */
export declare function discussionsCommand(action: string, target: string | undefined, options: DiscussionsOptions): Promise<void>;
export { cmdGet as cmdDiscussionShow };
//# sourceMappingURL=discussions.d.ts.map