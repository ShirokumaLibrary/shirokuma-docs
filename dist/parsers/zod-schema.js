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
import { escapeRegExp } from "../utils/sanitize.js";
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
export function parseZodSchema(content, schemaName) {
    // Pattern to find schema definition: const SchemaName = z.object({
    const schemaPattern = new RegExp(`const\\s+${escapeRegExp(schemaName)}\\s*=\\s*z\\.object\\s*\\(\\s*\\{([\\s\\S]*?)\\}\\s*\\)`, "m");
    const match = content.match(schemaPattern);
    if (!match) {
        return null;
    }
    const objectBody = match[1];
    const parameters = parseObjectFields(objectBody);
    return {
        name: schemaName,
        parameters,
    };
}
/**
 * Parse all fields within a z.object({ ... }) body.
 *
 * @param objectBody - Content between braces of z.object({ ... })
 * @returns Array of parsed parameters
 */
function parseObjectFields(objectBody) {
    const parameters = [];
    // Strategy: Find field names first, then extract the definition up to the next field or end
    // This handles multiline field definitions properly
    // Find all field starts: "fieldName: z."
    const fieldStartPattern = /(\w+)\s*:\s*z\./g;
    const fieldStarts = [];
    let startMatch;
    while ((startMatch = fieldStartPattern.exec(objectBody)) !== null) {
        fieldStarts.push({
            name: startMatch[1],
            index: startMatch.index,
        });
    }
    // Extract each field's definition
    for (let i = 0; i < fieldStarts.length; i++) {
        const current = fieldStarts[i];
        const nextStart = fieldStarts[i + 1]?.index ?? objectBody.length;
        // Extract from current field name to next field (or end)
        const fieldContent = objectBody.slice(current.index, nextStart);
        // Remove trailing comma and whitespace
        const fieldDefMatch = fieldContent.match(/^\w+\s*:\s*(z\..+?)(?:,\s*)?$/s);
        if (!fieldDefMatch) {
            continue;
        }
        const fieldDef = fieldDefMatch[1].trim();
        const parameter = parseField(current.name, fieldDef);
        if (parameter) {
            parameters.push(parameter);
        }
    }
    return parameters;
}
/**
 * Parse a single field definition.
 *
 * @param name - Field name
 * @param definition - Field definition (e.g., "z.string().uuid().describe(...)")
 * @returns Parsed parameter or null
 */
function parseField(name, definition) {
    // Initialize parameter object
    const param = {
        name,
        type: "string", // default
        required: true, // default
    };
    // Detect base type
    // IMPORTANT: Check container types (array, object) FIRST before primitives
    // because z.array(z.string()) contains both "z.array(" and "z.string()"
    if (definition.includes("z.array(")) {
        param.type = "array";
    }
    else if (definition.includes("z.object(")) {
        param.type = "object";
    }
    else if (definition.includes("z.enum(")) {
        param.type = "enum";
        param.enumValues = extractEnumValues(definition);
    }
    else if (definition.includes("z.string()")) {
        param.type = "string";
    }
    else if (definition.includes("z.number()")) {
        param.type = "number";
    }
    else if (definition.includes("z.boolean()")) {
        param.type = "boolean";
    }
    else {
        // Unknown type, skip
        return null;
    }
    // Check if optional or nullable
    if (definition.includes(".optional()") || definition.includes(".nullable()")) {
        param.required = false;
    }
    // Extract format for strings
    if (param.type === "string") {
        if (definition.includes(".uuid(")) {
            param.format = "uuid";
        }
        else if (definition.includes(".email(")) {
            param.format = "email";
        }
        else if (definition.includes(".url(")) {
            param.format = "url";
        }
    }
    // Extract min/max for strings
    if (param.type === "string") {
        const minMatch = definition.match(/\.min\s*\(\s*(\d+)/);
        if (minMatch) {
            param.minLength = parseInt(minMatch[1], 10);
        }
        const maxMatch = definition.match(/\.max\s*\(\s*(\d+)/);
        if (maxMatch) {
            param.maxLength = parseInt(maxMatch[1], 10);
        }
    }
    // Extract min/max for numbers
    if (param.type === "number") {
        const minMatch = definition.match(/\.min\s*\(\s*(-?\d+)/);
        if (minMatch) {
            param.min = parseInt(minMatch[1], 10);
        }
        const maxMatch = definition.match(/\.max\s*\(\s*(-?\d+)/);
        if (maxMatch) {
            param.max = parseInt(maxMatch[1], 10);
        }
    }
    // Extract default value
    const defaultMatch = definition.match(/\.default\s*\(\s*([^)]+)\s*\)/);
    if (defaultMatch) {
        param.default = parseDefaultValue(defaultMatch[1]);
    }
    // Extract description
    const descMatch = definition.match(/\.describe\s*\(\s*["']([^"']+)["']\s*\)/);
    if (descMatch) {
        param.description = descMatch[1];
    }
    // Extract validation message from first validation method
    const validationMatch = definition.match(/\.(uuid|email|url|min|max)\s*\(\s*(?:\d+\s*,\s*)?["']([^"']+)["']/);
    if (validationMatch) {
        param.validation = {
            message: validationMatch[2],
        };
    }
    return param;
}
/**
 * Extract enum values from z.enum([...]) definition.
 *
 * @param definition - Field definition containing z.enum
 * @returns Array of enum values
 */
function extractEnumValues(definition) {
    const enumMatch = definition.match(/z\.enum\s*\(\s*\[([^\]]+)\]/);
    if (!enumMatch) {
        return [];
    }
    const enumContent = enumMatch[1];
    const values = [];
    // Match quoted strings in the array
    const valuePattern = /["']([^"']+)["']/g;
    const matches = enumContent.matchAll(valuePattern);
    for (const match of matches) {
        values.push(match[1]);
    }
    return values;
}
/**
 * Parse default value from string representation.
 *
 * @param valueStr - String representation of the default value
 * @returns Parsed value (string, number, boolean, etc.)
 */
function parseDefaultValue(valueStr) {
    const trimmed = valueStr.trim();
    // Remove quotes for strings
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
    }
    // Parse numbers
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
        return parseFloat(trimmed);
    }
    // Parse booleans
    if (trimmed === "true") {
        return true;
    }
    if (trimmed === "false") {
        return false;
    }
    // Parse null
    if (trimmed === "null") {
        return null;
    }
    // Return as-is for other cases
    return trimmed;
}
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
export function findSchemaInFiles(files, schemaName) {
    for (const file of files) {
        const schema = parseZodSchema(file.content, schemaName);
        if (schema) {
            return schema;
        }
    }
    return null;
}
//# sourceMappingURL=zod-schema.js.map