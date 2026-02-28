/**
 * repo-pairs command - Public/Private repository pair management
 *
 * Subcommands:
 * - list: Show all configured repo pairs
 * - init <alias>: Initialize a repo pair in config
 * - status [alias]: Show sync status between repos
 * - release <alias> --tag <version>: Release to public repo
 */
export interface RepoPairsOptions {
    verbose?: boolean;
    private?: string;
    public?: string;
    exclude?: string[];
    tag?: string;
    dryRun?: boolean;
    sourceDir?: string;
}
export declare function repoPairsCommand(action: string, alias: string | undefined, options: RepoPairsOptions): Promise<void>;
//# sourceMappingURL=repo-pairs.d.ts.map