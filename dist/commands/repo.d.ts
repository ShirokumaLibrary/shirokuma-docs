/**
 * repo command - Repository information and management
 *
 * Subcommands:
 * - info: Get repository information
 * - labels: List or create labels
 */
export interface RepoOptions {
    verbose?: boolean;
    create?: string;
    color?: string;
    description?: string;
}
/**
 * repo command handler
 */
export declare function repoCommand(action: string, options: RepoOptions): Promise<void>;
//# sourceMappingURL=repo.d.ts.map