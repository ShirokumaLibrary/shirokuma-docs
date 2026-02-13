/**
 * Project field operations - shared module
 *
 * Extracted from issues.ts and projects.ts to eliminate duplication.
 * Provides field resolution, update operations, and timestamp management.
 *
 * Consumers: issues.ts, projects.ts, session.ts, issues-pr.ts
 */

import { Logger } from "./logger.js";
import { runGraphQL, type GraphQLError } from "./github.js";
import { getMetricsConfig } from "./gh-config.js";
import { validateStatusTransition } from "./status-workflow.js";

// =============================================================================
// Types
// =============================================================================

/** Project field type discriminator */
export type ProjectFieldType = "SINGLE_SELECT" | "TEXT" | "NUMBER" | "DATE" | "UNKNOWN";

/** Project field definition with type info */
export interface ProjectField {
  id: string;
  /** Field name — set by projects.ts, optional for backward compat */
  name?: string;
  type: ProjectFieldType;
  /** Option name → option ID mapping (empty for non-select fields) */
  options: Record<string, string>;
}

// =============================================================================
// Field Name Fallbacks
// =============================================================================
// GitHub Projects V2 reserves certain field names (e.g., "Type").
// Users must create them with alternative names (e.g., "Item Type").
// This mapping provides fallback names for field resolution.

export const FIELD_FALLBACKS: Record<string, string[]> = {
  Type: ["Item Type", "ItemType"],
};

/**
 * Resolve a field name against project fields, trying fallbacks if needed.
 * Returns the actual field name found in the project, or null.
 */
export function resolveFieldName(
  fieldName: string,
  projectFields: Record<string, ProjectField>
): string | null {
  if (projectFields[fieldName]) return fieldName;

  const fallbacks = FIELD_FALLBACKS[fieldName];
  if (fallbacks) {
    for (const alt of fallbacks) {
      if (projectFields[alt]) return alt;
    }
  }
  return null;
}

// =============================================================================
// GraphQL Queries & Mutations
// =============================================================================

const GRAPHQL_QUERY_FIELDS = `
query($projectId: ID!) {
  node(id: $projectId) {
    ... on ProjectV2 {
      title
      fields(first: 30) {
        nodes {
          ... on ProjectV2SingleSelectField {
            id name dataType
            options { id name }
          }
          ... on ProjectV2Field {
            id name dataType
          }
        }
      }
    }
  }
}
`;

const GRAPHQL_MUTATION_UPDATE_FIELD = `
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $projectId
    itemId: $itemId
    fieldId: $fieldId
    value: { singleSelectOptionId: $optionId }
  }) { projectV2Item { id } }
}
`;

const GRAPHQL_MUTATION_UPDATE_TEXT_FIELD = `
mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $text: String!) {
  updateProjectV2ItemFieldValue(input: {
    projectId: $projectId
    itemId: $itemId
    fieldId: $fieldId
    value: { text: $text }
  }) { projectV2Item { id } }
}
`;

const GRAPHQL_MUTATION_ADD_TO_PROJECT = `
mutation($projectId: ID!, $contentId: ID!) {
  addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
    item { id }
  }
}
`;

// =============================================================================
// Field Fetching
// =============================================================================

/**
 * Get project field definitions (SingleSelect + Text fields).
 */
export function getProjectFields(projectId: string): Record<string, ProjectField> {
  interface FieldNode {
    id?: string;
    name?: string;
    dataType?: string;
    options?: Array<{ id: string; name: string }>;
  }

  interface QueryResult {
    data?: {
      node?: {
        fields?: { nodes?: FieldNode[] };
      };
    };
  }

  const result = runGraphQL<QueryResult>(GRAPHQL_QUERY_FIELDS, { projectId });
  if (!result.success) return {};

  const fields: Record<string, ProjectField> = {};
  const nodes = result.data?.data?.node?.fields?.nodes ?? [];

  for (const node of nodes) {
    if (!node?.name || !node?.id) continue;

    if (node.options) {
      // SingleSelect field
      const options: Record<string, string> = {};
      for (const opt of node.options) {
        options[opt.name] = opt.id;
      }
      fields[node.name] = { id: node.id, name: node.name, type: "SINGLE_SELECT", options };
    } else if (node.dataType === "TEXT") {
      // Text field (no options)
      fields[node.name] = { id: node.id, name: node.name, type: "TEXT", options: {} };
    }
  }

  return fields;
}

// =============================================================================
// Field Update Operations
// =============================================================================

/**
 * Format GraphQL errors for logging.
 */
function formatGraphQLErrors(errors: GraphQLError[]): string {
  return errors.map((e) => e.message).join("; ");
}

/**
 * Update project item SingleSelect field.
 * Logs GraphQL errors as warnings if present.
 */
export function updateSelectField(
  projectId: string,
  itemId: string,
  fieldId: string,
  optionId: string,
  logger?: Logger
): boolean {
  const result = runGraphQL(GRAPHQL_MUTATION_UPDATE_FIELD, {
    projectId,
    itemId,
    fieldId,
    optionId,
  });
  if (result.success && result.graphqlErrors) {
    logger?.warn(`GraphQL partial error (select field): ${formatGraphQLErrors(result.graphqlErrors)}`);
  }
  return result.success;
}

/**
 * Update project item Text field.
 * Logs GraphQL errors as warnings if present.
 */
export function updateTextField(
  projectId: string,
  itemId: string,
  fieldId: string,
  text: string,
  logger?: Logger
): boolean {
  const result = runGraphQL(GRAPHQL_MUTATION_UPDATE_TEXT_FIELD, {
    projectId,
    itemId,
    fieldId,
    text,
  });
  if (result.success && result.graphqlErrors) {
    logger?.warn(`GraphQL partial error (text field): ${formatGraphQLErrors(result.graphqlErrors)}`);
  }
  return result.success;
}

/**
 * Add an item to a project by content ID (Issue/PR GraphQL ID).
 * Returns the project item ID on success, or null on failure.
 */
export function addItemToProject(
  projectId: string,
  contentId: string,
  logger?: Logger
): string | null {
  interface AddResult {
    data?: {
      addProjectV2ItemById?: {
        item?: { id?: string };
      };
    };
  }

  const result = runGraphQL<AddResult>(GRAPHQL_MUTATION_ADD_TO_PROJECT, {
    projectId,
    contentId,
  });

  if (!result.success) {
    logger?.warn(`Failed to add item to project: ${result.error}`);
    return null;
  }
  if (result.graphqlErrors) {
    logger?.warn(`GraphQL partial error (add to project): ${formatGraphQLErrors(result.graphqlErrors)}`);
  }

  return result.data?.data?.addProjectV2ItemById?.item?.id ?? null;
}

// =============================================================================
// Batch Field Updates
// =============================================================================

/**
 * Resolve option ID with case-insensitive fallback.
 * Returns the option ID and warns if case mismatch was used.
 */
function resolveOptionId(
  fieldName: string,
  value: string,
  options: Record<string, string>,
  logger?: Logger
): string | null {
  // Exact match first
  const exact = options[value];
  if (exact) return exact;

  // Case-insensitive fallback
  const lowerValue = value.toLowerCase();
  const match = Object.entries(options).find(
    ([key]) => key.toLowerCase() === lowerValue
  );
  if (match) {
    logger?.warn(`Field '${fieldName}': case mismatch '${value}' → '${match[0]}'`);
    return match[1];
  }

  return null;
}

/**
 * Set multiple project fields on an item.
 * Dispatches to SingleSelect or Text mutation based on field type.
 *
 * Features (#380):
 * - Case-insensitive option ID resolution with warning
 * - Failed field summary logging
 * - GraphQL error propagation
 *
 * @param currentStatus - Current Status value for transition validation (optional, #382)
 */
export function setItemFields(
  projectId: string,
  itemId: string,
  fields: Record<string, string>,
  logger?: Logger,
  cachedFields?: Record<string, ProjectField>,
  currentStatus?: string
): number {
  if (Object.keys(fields).length === 0) return 0;

  const projectFields = cachedFields ?? getProjectFields(projectId);
  let updatedCount = 0;
  const failedFields: string[] = [];

  // Status transition validation (#382)
  if (currentStatus && fields["Status"]) {
    const validation = validateStatusTransition(currentStatus, fields["Status"]);
    if (!validation.valid) {
      logger?.warn(validation.warning ?? "");
    }
  }

  for (const [fieldName, value] of Object.entries(fields)) {
    const resolvedName = resolveFieldName(fieldName, projectFields);
    if (!resolvedName) {
      const fallbacks = FIELD_FALLBACKS[fieldName];
      const hint = fallbacks ? ` (also tried: ${fallbacks.join(", ")})` : "";
      logger?.warn(`Field '${fieldName}' not found in project${hint}`);
      failedFields.push(fieldName);
      continue;
    }

    const fieldInfo = projectFields[resolvedName];

    if (fieldInfo.type === "TEXT") {
      // Text field: set value directly
      if (updateTextField(projectId, itemId, fieldInfo.id, value, logger)) {
        updatedCount++;
      } else {
        failedFields.push(fieldName);
      }
    } else {
      // SingleSelect field: resolve option ID with case-insensitive fallback
      const optionId = resolveOptionId(fieldName, value, fieldInfo.options, logger);
      if (optionId) {
        if (updateSelectField(projectId, itemId, fieldInfo.id, optionId, logger)) {
          updatedCount++;
        } else {
          failedFields.push(fieldName);
        }
      } else {
        const available = Object.keys(fieldInfo.options).sort().join(", ");
        logger?.error(`Invalid ${fieldName} value '${value}'`);
        logger?.info(`  Available options: ${available}`);
        failedFields.push(fieldName);
      }
    }
  }

  if (failedFields.length > 0) {
    logger?.warn(`Failed to update field(s): ${failedFields.join(", ")}`);
  }

  return updatedCount;
}

// =============================================================================
// Timestamp Management
// =============================================================================

/**
 * Generate ISO 8601 local timestamp with timezone offset.
 * Example: "2026-02-10T10:27:24+09:00"
 */
export function generateTimestamp(): string {
  const now = new Date();
  const offset = -now.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const absOffset = Math.abs(offset);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const minutes = String(absOffset % 60).padStart(2, "0");

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day}T${h}:${m}:${s}${sign}${hours}:${minutes}`;
}

/**
 * Auto-set timestamp Text fields when Status changes.
 * Uses metrics config to determine which Text field to set.
 * Silently skips if metrics is not enabled or Text fields don't exist.
 *
 * #380: Logs warning on timestamp update failure instead of silently failing.
 */
export function autoSetTimestamps(
  projectId: string,
  itemId: string,
  statusValue: string,
  projectFields: Record<string, ProjectField>,
  logger?: Logger,
  timestamp?: string
): void {
  const metricsConfig = getMetricsConfig();
  if (!metricsConfig.enabled) return;

  const mapping = metricsConfig.statusToDateMapping ?? {};
  const textFieldName = mapping[statusValue];
  if (!textFieldName) return;

  const fieldInfo = projectFields[textFieldName];
  if (!fieldInfo) {
    logger?.warn(`Metrics: Text field '${textFieldName}' not found in project (run 'projects setup-metrics' to create)`);
    return;
  }
  if (fieldInfo.type !== "TEXT") {
    logger?.warn(`Metrics: Field '${textFieldName}' is not a Text field`);
    return;
  }

  const ts = timestamp ?? generateTimestamp();
  if (updateTextField(projectId, itemId, fieldInfo.id, ts, logger)) {
    logger?.info(`Metrics: ${textFieldName} = ${ts}`);
  } else {
    logger?.warn(`Metrics: Failed to set ${textFieldName} for item`);
  }
}
