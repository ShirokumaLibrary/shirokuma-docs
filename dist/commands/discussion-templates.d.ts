/**
 * discussion-templates command - Generate GitHub Discussion templates
 *
 * Generates `.github/DISCUSSION_TEMPLATE/` files from Handlebars templates
 * with i18n dictionary support.
 *
 * Subcommands:
 * - generate: Generate discussion templates for a specific language
 * - list-languages: List available languages
 *
 * @example
 * ```bash
 * shirokuma-docs discussion-templates generate --lang ja --output .github/DISCUSSION_TEMPLATE/
 * shirokuma-docs discussion-templates list-languages
 * ```
 */
export interface DiscussionTemplatesOptions {
    verbose?: boolean;
    lang?: string;
    output?: string;
}
/**
 * discussion-templates command handler
 */
export declare function discussionTemplatesCommand(action: string, target: string | undefined, options: DiscussionTemplatesOptions): Promise<void>;
//# sourceMappingURL=discussion-templates.d.ts.map