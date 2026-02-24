/**
 * Zod Schema Parser
 *
 * Parses Zod schema definitions from TypeScript source code to extract
 * parameter information for Server Actions documentation.
 *
 * Supported Zod methods:
 * - z.string() + .uuid(), .email(), .url(), .min(), .max()
 * - z.number() + .min(), .max(), .int()
 * - z.boolean()
 * - z.enum([...])
 * - .optional(), .nullable(), .default(), .describe()
 *
 * @module parsers/zod-schema
 */
/**
 * Zod parameter information extracted from schema
 */
export interface ZodParameter {
    /** Parameter name */
    name: string;
    /** Parameter type */
    type: "string" | "number" | "boolean" | "enum" | "array" | "object";
    /** Format specification (uuid, email, url, etc.) */
    format?: string;
    /** Whether the parameter is required */
    required: boolean;
    /** Minimum length for strings */
    minLength?: number;
    /** Maximum length for strings */
    maxLength?: number;
    /** Minimum value for numbers */
    min?: number;
    /** Maximum value for numbers */
    max?: number;
    /** Default value */
    default?: unknown;
    /** Description from .describe() */
    description?: string;
    /** Enum values if type is "enum" */
    enumValues?: string[];
    /** Validation configuration */
    validation?: {
        /** Error message */
        message?: string;
    };
}
/**
 * Parsed Zod schema with all parameters
 */
export interface ParsedZodSchema {
    /** Schema name */
    name: string;
    /** Array of parameters */
    parameters: ZodParameter[];
}
/**
 * Parse Zod schema from TypeScript source code.
 *
 * Detects schema definitions in the format:
 * `const SchemaName = z.object({ ... })`
 *
 * Uses regex-based parsing (no AST) for simplicity.
 *
 * @param content - TypeScript source code
 * @param schemaName - Name of the schema to parse
 * @returns Parsed schema with parameters, or null if not found
 *
 * @example
 * ```typescript
 * const code = `
 * const CreateEntitySchema = z.object({
 *   projectId: z.string().uuid("Invalid project ID").describe("プロジェクトのUUID"),
 *   title: z.string().min(1).max(200).describe("エンティティのタイトル"),
 *   status: z.enum(["open", "closed"]).default("open")
 * });
 * `;
 * const result = parseZodSchema(code, "CreateEntitySchema");
 * // Returns: { name: "CreateEntitySchema", parameters: [...] }
 * ```
 */
export declare function parseZodSchema(content: string, schemaName: string): ParsedZodSchema | null;
/**
 * Scan multiple files for a specific schema.
 *
 * Searches through multiple files to find the specified schema definition.
 *
 * @param files - Array of file objects with content and path
 * @param schemaName - Name of the schema to find
 * @returns Parsed schema or null if not found in any file
 *
 * @example
 * ```typescript
 * const files = [
 *   { path: "lib/validations/entities.ts", content: "..." },
 *   { path: "lib/validations/projects.ts", content: "..." },
 * ];
 * const schema = findSchemaInFiles(files, "CreateEntitySchema");
 * ```
 */
export declare function findSchemaInFiles(files: Array<{
    content: string;
    path: string;
}>, schemaName: string): ParsedZodSchema | null;
//# sourceMappingURL=zod-schema.d.ts.map