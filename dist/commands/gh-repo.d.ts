/**
 * gh-repo command - Repository information and management
 *
 * Subcommands:
 * - info: Get repository information
 * - labels: List or create labels
 */
export interface GhRepoOptions {
    verbose?: boolean;
    create?: string;
    color?: string;
    description?: string;
}
/**
 * gh-repo command handler
 */
export declare function ghRepoCommand(action: string, options: GhRepoOptions): Promise<void>;
//# sourceMappingURL=gh-repo.d.ts.map