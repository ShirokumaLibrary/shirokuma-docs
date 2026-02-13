/**
 * JSDoc パーサーのテスト
 */

import { parseJSDoc, extractJSDocsFromFile, extractTags } from "../../src/parsers/jsdoc.js";

describe("JSDoc Parser", () => {
  describe("extractTags", () => {
    it("should extract all unique tags from JSDoc", () => {
      const jsdoc = `/**
       * Test function
       * @param id - Entity ID
       * @returns Entity object
       * @serverAction
       */`;

      const tags = extractTags(jsdoc);

      expect(tags).toContain("@param");
      expect(tags).toContain("@returns");
      expect(tags).toContain("@serverAction");
    });
  });

  describe("parseJSDoc - New Tags", () => {
    it("should parse @inputSchema tag", () => {
      const jsdoc = `/**
       * Create entity
       * @inputSchema CreateEntitySchema
       */`;

      const result = parseJSDoc(jsdoc, "createEntity");

      expect(result.inputSchema).toBe("CreateEntitySchema");
    });

    it("should parse @outputSchema tag", () => {
      const jsdoc = `/**
       * Get entity
       * @outputSchema EntityResponse
       */`;

      const result = parseJSDoc(jsdoc, "getEntity");

      expect(result.outputSchema).toBe("EntityResponse");
    });

    it("should parse @authLevel tag with valid values", () => {
      const testCases = [
        { input: "none", expected: "none" },
        { input: "authenticated", expected: "authenticated" },
        { input: "member", expected: "member" },
        { input: "admin", expected: "admin" },
      ];

      testCases.forEach(({ input, expected }) => {
        const jsdoc = `/**
         * Test function
         * @authLevel ${input}
         */`;

        const result = parseJSDoc(jsdoc, "testFunc");

        expect(result.authLevel).toBe(expected);
      });
    });

    it("should return undefined for invalid @authLevel values", () => {
      const jsdoc = `/**
       * Test function
       * @authLevel superadmin
       */`;

      const result = parseJSDoc(jsdoc, "testFunc");

      expect(result.authLevel).toBeUndefined();
    });

    it("should parse @rateLimit tag", () => {
      const jsdoc = `/**
       * Send email
       * @rateLimit 10/hour
       */`;

      const result = parseJSDoc(jsdoc, "sendEmail");

      expect(result.rateLimit).toBe("10/hour");
    });

    it("should parse @errorCodes tag with multiple entries", () => {
      const jsdoc = `/**
       * Delete entity
       * @errorCodes
       *   - NOT_FOUND: エンティティが存在しない (404)
       *   - VALIDATION_ERROR: バリデーション失敗 (400)
       *   - UNAUTHORIZED: 権限がありません (403)
       */`;

      const result = parseJSDoc(jsdoc, "deleteEntity");

      expect(result.errorCodes).toBeDefined();
      expect(result.errorCodes).toHaveLength(3);

      expect(result.errorCodes![0]).toEqual({
        code: "NOT_FOUND",
        description: "エンティティが存在しない",
        status: 404,
      });

      expect(result.errorCodes![1]).toEqual({
        code: "VALIDATION_ERROR",
        description: "バリデーション失敗",
        status: 400,
      });

      expect(result.errorCodes![2]).toEqual({
        code: "UNAUTHORIZED",
        description: "権限がありません",
        status: 403,
      });
    });

    it("should return undefined for @errorCodes with no entries", () => {
      const jsdoc = `/**
       * Test function
       * @errorCodes
       */`;

      const result = parseJSDoc(jsdoc, "testFunc");

      expect(result.errorCodes).toBeUndefined();
    });
  });

  describe("parseJSDoc - Combined Tags", () => {
    it("should parse all new tags together", () => {
      const jsdoc = `/**
       * Update entity with validation
       * @inputSchema UpdateEntitySchema
       * @outputSchema EntityResponse
       * @authLevel member
       * @rateLimit 50/minute
       * @errorCodes
       *   - NOT_FOUND: Entity not found (404)
       *   - FORBIDDEN: No permission (403)
       */`;

      const result = parseJSDoc(jsdoc, "updateEntity");

      expect(result.name).toBe("updateEntity");
      expect(result.description).toBe("Update entity with validation");
      expect(result.inputSchema).toBe("UpdateEntitySchema");
      expect(result.outputSchema).toBe("EntityResponse");
      expect(result.authLevel).toBe("member");
      expect(result.rateLimit).toBe("50/minute");
      expect(result.errorCodes).toHaveLength(2);
    });
  });

  describe("parseJSDoc - Legacy Tags", () => {
    it("should parse @param tags", () => {
      const jsdoc = `/**
       * Test function
       * @param id - Entity ID
       * @param name - Entity name
       */`;

      const result = parseJSDoc(jsdoc, "testFunc");

      expect(result.params).toBeDefined();
      expect(result.params).toHaveLength(2);
      expect(result.params![0]).toEqual({
        name: "id",
        description: "Entity ID",
        type: undefined,
      });
      expect(result.params![1]).toEqual({
        name: "name",
        description: "Entity name",
        type: undefined,
      });
    });

    it("should parse @param tags with types", () => {
      const jsdoc = `/**
       * Test function
       * @param {string} id - Entity ID
       * @param {number} age - Entity age
       */`;

      const result = parseJSDoc(jsdoc, "testFunc");

      expect(result.params).toBeDefined();
      expect(result.params![0]).toEqual({
        name: "id",
        description: "Entity ID",
        type: "string",
      });
      expect(result.params![1]).toEqual({
        name: "age",
        description: "Entity age",
        type: "number",
      });
    });

    it("should parse @returns tag", () => {
      const jsdoc = `/**
       * Get entity
       * @returns Entity object with all fields
       */`;

      const result = parseJSDoc(jsdoc, "getEntity");

      expect(result.returns).toBe("Entity object with all fields");
    });

    it("should parse @throws tags", () => {
      const jsdoc = `/**
       * Delete entity
       * @throws {NotFoundError} Entity not found
       * @throws {PermissionError} No permission
       */`;

      const result = parseJSDoc(jsdoc, "deleteEntity");

      expect(result.throws).toBeDefined();
      expect(result.throws).toHaveLength(2);
      expect(result.throws![0]).toBe("Entity not found");
      expect(result.throws![1]).toBe("No permission");
    });
  });

  describe("extractJSDocsFromFile", () => {
    it("should extract JSDoc from all exported functions", () => {
      const fileContent = `
/**
 * Get entity by ID
 * @inputSchema GetEntitySchema
 * @authLevel authenticated
 */
export async function getEntity(id: string) {
  // implementation
}

/**
 * Create new entity
 * @inputSchema CreateEntitySchema
 * @outputSchema EntityResponse
 * @authLevel member
 */
export function createEntity(data: any) {
  // implementation
}

// Function without JSDoc
export function noDocFunc() {
  // no doc
}
`;

      const results = extractJSDocsFromFile(fileContent);

      expect(results).toHaveLength(2); // Only functions with JSDoc
      expect(results[0].name).toBe("getEntity");
      expect(results[0].inputSchema).toBe("GetEntitySchema");
      expect(results[0].authLevel).toBe("authenticated");

      expect(results[1].name).toBe("createEntity");
      expect(results[1].inputSchema).toBe("CreateEntitySchema");
      expect(results[1].outputSchema).toBe("EntityResponse");
      expect(results[1].authLevel).toBe("member");
    });
  });
});
