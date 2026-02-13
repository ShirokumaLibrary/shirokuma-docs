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

import { createLogger, Logger } from "../utils/logger.js";
import { discussionsCommand } from "./discussions.js";

/**
 * ADR command options
 */
interface AdrOptions {
  verbose?: boolean;
  limit?: number;
  repo?: string;
  public?: boolean;
}

/** ADR category name in GitHub Discussions */
const ADR_CATEGORY = "ADR";

/**
 * Format ADR title with numbering convention
 */
function formatAdrTitle(title: string): string {
  // If already formatted as ADR-XXXX, keep as-is
  if (/^ADR-\d{4}:/i.test(title)) {
    return title;
  }
  // Otherwise, prefix with ADR- (number will be the Discussion number)
  return `ADR: ${title}`;
}

/**
 * Build ADR body from template
 */
function buildAdrBody(title: string): string {
  const today = new Date().toISOString().split("T")[0];

  return `## Status
Proposed

## Date
${today}

## Context
[What is the issue that is motivating this decision? What context or background is relevant?]

## Decision
[What change are we proposing/implementing? What alternatives were considered?]

## Consequences
[What becomes easier or harder as a result of this decision?]

### Positive
-

### Concerns
-

## Related
- Related ADRs: None
- Related code:
- References:
`;
}

/**
 * create subcommand - Create a new ADR as GitHub Discussion
 */
async function cmdCreate(
  title: string,
  options: AdrOptions,
  logger: Logger
): Promise<void> {
  const formattedTitle = formatAdrTitle(title);
  const body = buildAdrBody(title);

  logger.info(`Creating ADR Discussion: ${formattedTitle}`);

  await discussionsCommand("create", undefined, {
    category: ADR_CATEGORY,
    title: formattedTitle,
    body,
    verbose: options.verbose,
    repo: options.repo,
    public: options.public,
  });
}

/**
 * list subcommand - List ADR Discussions
 */
async function cmdList(options: AdrOptions, logger: Logger): Promise<void> {
  await discussionsCommand("list", undefined, {
    category: ADR_CATEGORY,
    limit: options.limit,
    verbose: options.verbose,
    repo: options.repo,
    public: options.public,
  });
}

/**
 * get subcommand - Get ADR Discussion details
 */
async function cmdGet(
  target: string,
  options: AdrOptions,
  logger: Logger
): Promise<void> {
  await discussionsCommand("get", target, {
    verbose: options.verbose,
    repo: options.repo,
    public: options.public,
  });
}

/**
 * adr command handler
 */
export async function adrCommand(
  action: string,
  titleOrTarget: string | undefined,
  options: AdrOptions
): Promise<void> {
  const logger = createLogger(options.verbose);

  logger.debug(`ADR action: ${action}`);

  switch (action) {
    case "create":
      if (!titleOrTarget) {
        logger.error("Title is required");
        logger.info('Usage: shirokuma-docs adr create "Decision title"');
        process.exit(1);
      }
      await cmdCreate(titleOrTarget, options, logger);
      break;

    case "list":
      await cmdList(options, logger);
      break;

    case "get":
      if (!titleOrTarget) {
        logger.error("Discussion number is required");
        logger.info("Usage: shirokuma-docs adr get <number>");
        process.exit(1);
      }
      await cmdGet(titleOrTarget, options, logger);
      break;

    default:
      logger.error(`Unknown action: ${action}`);
      logger.info("Available actions: create, list, get");
      process.exit(1);
  }
}
