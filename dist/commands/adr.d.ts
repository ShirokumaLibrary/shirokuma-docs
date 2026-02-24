/**
 * adr command - Architecture Decision Records management via GitHub Discussions
 *
 * ADRs are stored in GitHub Discussions (ADR category).
 * This command is a convenience wrapper around discussions.
 *
 * Subcommands:
 * - create: Create a new ADR Discussion
 * - list: List ADR Discussions
 * - get: Get ADR Discussion details
 */
/**
 * ADR command options
 */
interface AdrOptions {
    verbose?: boolean;
    limit?: number;
    repo?: string;
    public?: boolean;
}
/**
 * adr command handler
 */
export declare function adrCommand(action: string, titleOrTarget: string | undefined, options: AdrOptions): Promise<void>;
export {};
//# sourceMappingURL=adr.d.ts.map