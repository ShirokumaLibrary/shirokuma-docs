/**
 * Project field operations - shared module
 *
 * Extracted from issues.ts and projects.ts to eliminate duplication.
 * Provides field resolution, update operations, and timestamp management.
 *
 * Consumers: issues.ts, projects.ts, session.ts, issues-pr.ts
 */
import { Logger } from "./logger.js";
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
/**
 * Resolve a field name against project fields.
 * Returns the field name if found, or null.
 */
export declare function resolveFieldName(fieldName: string, projectFields: Record<string, ProjectField>): string | null;
export declare const GRAPHQL_MUTATION_ADD_TO_PROJECT = "\nmutation($projectId: ID!, $contentId: ID!) {\n  addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {\n    item { id }\n  }\n}\n";
/**
 * Get project field definitions (SingleSelect + Text fields).
 */
export declare function getProjectFields(projectId: string): Promise<Record<string, ProjectField>>;
/**
 * Update project item SingleSelect field.
 * Logs GraphQL errors as warnings if present.
 */
export declare function updateSelectField(projectId: string, itemId: string, fieldId: string, optionId: string, logger?: Logger): Promise<boolean>;
/**
 * Update project item Text field.
 * Logs GraphQL errors as warnings if present.
 */
export declare function updateTextField(projectId: string, itemId: string, fieldId: string, text: string, logger?: Logger): Promise<boolean>;
/**
 * Update project item Number field.
 * Logs GraphQL errors as warnings if present.
 */
export declare function updateNumberField(projectId: string, itemId: string, fieldId: string, value: number, logger?: Logger): Promise<boolean>;
/**
 * Update project item Date field.
 * Logs GraphQL errors as warnings if present.
 */
export declare function updateDateField(projectId: string, itemId: string, fieldId: string, date: string, logger?: Logger): Promise<boolean>;
/**
 * Add an item to a project by content ID (Issue/PR GraphQL ID).
 * Returns the project item ID on success, or null on failure.
 */
export declare function addItemToProject(projectId: string, contentId: string, logger?: Logger): Promise<string | null>;
/**
 * Set multiple project fields on an item.
 * Dispatches to the appropriate mutation based on field type
 * (TEXT, NUMBER, DATE, SINGLE_SELECT).
 *
 * Features (#380):
 * - Case-insensitive option ID resolution with warning
 * - Failed field summary logging
 * - GraphQL error propagation
 *
 * @param currentStatus - Current Status value for transition validation (optional, #382)
 */
export declare function setItemFields(projectId: string, itemId: string, fields: Record<string, string>, logger?: Logger, cachedFields?: Record<string, ProjectField>, currentStatus?: string): Promise<number>;
/**
 * Generate ISO 8601 local timestamp with timezone offset.
 * Example: "2026-02-10T10:27:24+09:00"
 */
export declare function generateTimestamp(): string;
/**
 * Auto-set timestamp Text fields when Status changes.
 * Uses metrics config to determine which Text field to set.
 * Silently skips if metrics is not enabled or Text fields don't exist.
 *
 * #380: Logs warning on timestamp update failure instead of silently failing.
 */
export declare function autoSetTimestamps(projectId: string, itemId: string, statusValue: string, projectFields: Record<string, ProjectField>, logger?: Logger, timestamp?: string): Promise<void>;
//# sourceMappingURL=project-fields.d.ts.map