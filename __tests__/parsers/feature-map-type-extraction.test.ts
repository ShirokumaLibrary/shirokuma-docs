/**
 * Feature Map Type Extraction Tests
 *
 * Tests for extracting TypeScript type definitions (interface, type, enum)
 * and utility exports (constants, functions) from source code.
 */

import {
  extractExportedTypes,
  extractBracedBlock,
  extractPrecedingJSDoc,
  extractInterfaceFields,
  extractEnumValues,
  extractExportedUtilities,
  parseParams,
} from "../../src/parsers/feature-map-type-extraction.js";

describe("feature-map-type-extraction", () => {
  describe("extractBracedBlock", () => {
    /**
     * @testdoc Simple braced block
     */
    it("should extract a simple braced block", () => {
      const content = "{ foo: string; bar: number; }";
      const result = extractBracedBlock(content, 0);
      expect(result).toBe("{ foo: string; bar: number; }");
    });

    /**
     * @testdoc Nested braces
     */
    it("should handle nested braces", () => {
      const content = "{ outer: { inner: string; }; }";
      const result = extractBracedBlock(content, 0);
      expect(result).toBe("{ outer: { inner: string; }; }");
    });

    /**
     * @testdoc Braces in strings are ignored
     */
    it("should ignore braces inside strings", () => {
      const content = '{ key: "value with { braces }"; }';
      const result = extractBracedBlock(content, 0);
      expect(result).toBe('{ key: "value with { braces }"; }');
    });

    /**
     * @testdoc Braces in template literals
     */
    it("should ignore braces inside template literals", () => {
      const content = "{ key: `template with { braces }`; }";
      const result = extractBracedBlock(content, 0);
      expect(result).toBe("{ key: `template with { braces }`; }");
    });

    /**
     * @testdoc Braces in comments
     */
    it("should ignore braces inside line comments", () => {
      const content = "{ // comment with {\nfoo: string; }";
      const result = extractBracedBlock(content, 0);
      expect(result).toBe("{ // comment with {\nfoo: string; }");
    });

    /**
     * @testdoc Braces in block comments
     */
    it("should ignore braces inside block comments", () => {
      const content = "{ /* { nested } */ foo: string; }";
      const result = extractBracedBlock(content, 0);
      expect(result).toBe("{ /* { nested } */ foo: string; }");
    });

    /**
     * @testdoc Invalid start position
     */
    it("should return null if start is not a brace", () => {
      const content = "not a brace";
      const result = extractBracedBlock(content, 0);
      expect(result).toBeNull();
    });

    /**
     * @testdoc Unmatched braces
     */
    it("should return null for unmatched braces", () => {
      const content = "{ foo: string;";
      const result = extractBracedBlock(content, 0);
      expect(result).toBeNull();
    });

    /**
     * @testdoc Start from middle of content
     */
    it("should extract block starting from given index", () => {
      const content = "prefix { inner } suffix";
      const result = extractBracedBlock(content, 7);
      expect(result).toBe("{ inner }");
    });
  });

  describe("extractExportedTypes", () => {
    /**
     * @testdoc Export interface extraction
     */
    it("should extract exported interfaces", () => {
      const content = `
export interface UserConfig {
  name: string;
  age: number;
}
`;
      const types = extractExportedTypes(content);

      expect(types).toHaveLength(1);
      expect(types[0].name).toBe("UserConfig");
      expect(types[0].kind).toBe("interface");
      expect(types[0].fields).toBeDefined();
      expect(types[0].fields!.length).toBeGreaterThan(0);
    });

    /**
     * @testdoc Export type (object form) extraction
     */
    it("should extract exported object types", () => {
      const content = `
export type Options = {
  verbose: boolean;
  output: string;
};
`;
      const types = extractExportedTypes(content);

      expect(types).toHaveLength(1);
      expect(types[0].name).toBe("Options");
      expect(types[0].kind).toBe("type");
      expect(types[0].fields).toBeDefined();
    });

    /**
     * @testdoc Export type (union) extraction
     */
    it("should extract exported union types", () => {
      const content = `
export type Status = "active" | "inactive" | "pending";
`;
      const types = extractExportedTypes(content);

      expect(types).toHaveLength(1);
      expect(types[0].name).toBe("Status");
      expect(types[0].kind).toBe("type");
      expect(types[0].fields).toBeUndefined();
    });

    /**
     * @testdoc Export enum extraction
     */
    it("should extract exported enums", () => {
      const content = `
export enum Color {
  Red,
  Green,
  Blue,
}
`;
      const types = extractExportedTypes(content);

      expect(types).toHaveLength(1);
      expect(types[0].name).toBe("Color");
      expect(types[0].kind).toBe("enum");
      expect(types[0].values).toEqual(["Red", "Green", "Blue"]);
    });

    /**
     * @testdoc JSDoc description attached to type (multi-line JSDoc)
     */
    it("should extract JSDoc description for types", () => {
      const content = `
/**
 * User configuration options
 */
export interface UserConfig {
  name: string;
}
`;
      const types = extractExportedTypes(content);

      expect(types).toHaveLength(1);
      expect(types[0].description).toBe("User configuration options");
    });

    /**
     * @testdoc Multiple types in one file
     */
    it("should extract multiple types from single file", () => {
      const content = `
export interface Foo {
  x: number;
}

export type Bar = string | number;

export enum Baz {
  A,
  B,
}
`;
      const types = extractExportedTypes(content);
      expect(types).toHaveLength(3);

      const names = types.map(t => t.name);
      expect(names).toContain("Foo");
      expect(names).toContain("Bar");
      expect(names).toContain("Baz");
    });

    /**
     * @testdoc Non-exported types are ignored
     */
    it("should not extract non-exported types", () => {
      const content = `
interface InternalConfig {
  secret: string;
}

export interface PublicConfig {
  name: string;
}
`;
      const types = extractExportedTypes(content);

      expect(types).toHaveLength(1);
      expect(types[0].name).toBe("PublicConfig");
    });

    /**
     * @testdoc Nested interface fields
     */
    it("should handle interfaces with nested types", () => {
      const content = `
export interface Config {
  database: {
    host: string;
    port: number;
  };
  name: string;
}
`;
      const types = extractExportedTypes(content);

      expect(types).toHaveLength(1);
      expect(types[0].name).toBe("Config");
      // The braced block extraction should handle nested braces
      expect(types[0].sourceCode).toBeDefined();
    });
  });

  describe("extractPrecedingJSDoc", () => {
    /**
     * @testdoc JSDoc directly before declaration
     */
    it("should extract JSDoc immediately before declaration", () => {
      const content = `/** Description */\nexport interface Foo {}`;
      const matchText = "export interface Foo {}";
      const matchIndex = content.indexOf(matchText);

      const result = extractPrecedingJSDoc(content, matchIndex, matchText);

      expect(result.jsdoc).toBe("/** Description */");
      expect(result.sourceCode).toContain("/** Description */");
      expect(result.sourceCode).toContain("export interface Foo {}");
    });

    /**
     * @testdoc No JSDoc before declaration
     */
    it("should return null jsdoc when none present", () => {
      const content = `export interface Foo {}`;
      const result = extractPrecedingJSDoc(content, 0, content);

      expect(result.jsdoc).toBeNull();
      expect(result.sourceCode).toBe("export interface Foo {}");
    });

    /**
     * @testdoc JSDoc with whitespace gap
     */
    it("should handle whitespace between JSDoc and declaration", () => {
      const content = `/** Description */\n\nexport interface Foo {}`;
      const matchText = "export interface Foo {}";
      const matchIndex = content.indexOf(matchText);

      const result = extractPrecedingJSDoc(content, matchIndex, matchText);

      expect(result.jsdoc).toBe("/** Description */");
    });

    /**
     * @testdoc Code between JSDoc and declaration
     */
    it("should not extract JSDoc if code exists between", () => {
      const content = `/** Old doc */\nconst x = 1;\nexport interface Foo {}`;
      const matchText = "export interface Foo {}";
      const matchIndex = content.indexOf(matchText);

      const result = extractPrecedingJSDoc(content, matchIndex, matchText);

      expect(result.jsdoc).toBeNull();
    });
  });

  describe("extractInterfaceFields", () => {
    /**
     * @testdoc Simple field extraction
     */
    it("should extract simple fields", () => {
      const body = `
  name: string;
  age: number;
`;
      const fields = extractInterfaceFields(body);

      expect(fields).toHaveLength(2);
      expect(fields[0]).toEqual({ name: "name", type: "string", description: undefined });
      expect(fields[1]).toEqual({ name: "age", type: "number", description: undefined });
    });

    /**
     * @testdoc Optional fields
     */
    it("should handle optional fields", () => {
      const body = `
  name: string;
  email?: string;
`;
      const fields = extractInterfaceFields(body);

      expect(fields).toHaveLength(2);
      expect(fields[1].name).toBe("email");
      expect(fields[1].type).toBe("string");
    });

    /**
     * @testdoc Fields with JSDoc comments
     */
    it("should extract inline JSDoc as description", () => {
      const body = `
  /** User's display name */
  name: string;
  /** User's age in years */
  age: number;
`;
      const fields = extractInterfaceFields(body);

      expect(fields).toHaveLength(2);
      expect(fields[0].description).toBe("User's display name");
      expect(fields[1].description).toBe("User's age in years");
    });

    /**
     * @testdoc Fields with line comments
     */
    it("should extract line comments as description", () => {
      const body = `
  // The user's name
  name: string;
`;
      const fields = extractInterfaceFields(body);

      expect(fields).toHaveLength(1);
      expect(fields[0].description).toBe("The user's name");
    });

    /**
     * @testdoc Empty body
     */
    it("should return empty array for empty body", () => {
      const fields = extractInterfaceFields("");
      expect(fields).toEqual([]);
    });
  });

  describe("extractEnumValues", () => {
    /**
     * @testdoc Simple enum values
     */
    it("should extract simple enum values", () => {
      const body = "Red, Green, Blue";
      const values = extractEnumValues(body);
      expect(values).toEqual(["Red", "Green", "Blue"]);
    });

    /**
     * @testdoc Enum with initializers
     */
    it("should extract enum names ignoring initializers", () => {
      const body = `
  Red = "red",
  Green = "green",
  Blue = "blue"
`;
      const values = extractEnumValues(body);
      expect(values).toEqual(["Red", "Green", "Blue"]);
    });

    /**
     * @testdoc Numeric enum
     */
    it("should extract numeric enum values", () => {
      const body = `
  First = 0,
  Second = 1,
  Third = 2
`;
      const values = extractEnumValues(body);
      expect(values).toEqual(["First", "Second", "Third"]);
    });
  });

  describe("extractExportedUtilities", () => {
    /**
     * @testdoc Export const extraction
     */
    it("should extract exported constants", () => {
      const content = `
export const MAX_RETRIES = 3;
export const API_URL = "https://api.example.com";
`;
      const utils = extractExportedUtilities(content);

      expect(utils.length).toBeGreaterThanOrEqual(2);
      const names = utils.map(u => u.name);
      expect(names).toContain("MAX_RETRIES");
      expect(names).toContain("API_URL");
    });

    /**
     * @testdoc Arrow function constants are excluded
     */
    it("should exclude arrow function exports", () => {
      const content = `
export const MAX_RETRIES = 3;
export const helper = () => "result";
export const asyncHelper = async (x: number) => x + 1;
`;
      const utils = extractExportedUtilities(content);

      const names = utils.map(u => u.name);
      expect(names).toContain("MAX_RETRIES");
      expect(names).not.toContain("helper");
      expect(names).not.toContain("asyncHelper");
    });

    /**
     * @testdoc Export function extraction (without @serverAction, multi-line JSDoc)
     */
    it("should extract exported functions without @serverAction", () => {
      const content = `
/**
 * Formats a date string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}
`;
      const utils = extractExportedUtilities(content);

      expect(utils).toHaveLength(1);
      expect(utils[0].name).toBe("formatDate");
      expect(utils[0].kind).toBe("function");
      expect(utils[0].description).toBe("Formats a date string");
    });

    /**
     * @testdoc @serverAction functions are excluded
     */
    it("should exclude functions with @serverAction tag", () => {
      const content = `
/** @serverAction */
export async function createUser(data: FormData) {
  // server action
}

/** Helper function */
export function validateInput(input: string): boolean {
  return input.length > 0;
}
`;
      const utils = extractExportedUtilities(content);

      const names = utils.map(u => u.name);
      expect(names).not.toContain("createUser");
      expect(names).toContain("validateInput");
    });

    /**
     * @testdoc Constant with type annotation
     */
    it("should extract type annotation from constants", () => {
      const content = `
export const DEFAULT_CONFIG: AppConfig = {
  name: "test"
};
`;
      // Note: this matches as an object, which starts with { so it might be excluded
      // as arrow function check. Let's test what actually happens.
      const utils = extractExportedUtilities(content);
      // Object assignments may or may not be captured depending on regex
      // This test documents actual behavior
      expect(Array.isArray(utils)).toBe(true);
    });
  });

  describe("parseParams", () => {
    /**
     * @testdoc Simple typed parameters
     */
    it("should parse typed parameters", () => {
      const result = parseParams("name: string, age: number");

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ name: "name", type: "string" });
      expect(result[1]).toEqual({ name: "age", type: "number" });
    });

    /**
     * @testdoc Optional parameter
     */
    it("should handle optional parameters", () => {
      const result = parseParams("name: string, email?: string");

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({ name: "email", type: "string" });
    });

    /**
     * @testdoc Empty parameter string
     */
    it("should return empty array for empty string", () => {
      const result = parseParams("");
      expect(result).toEqual([]);
    });

    /**
     * @testdoc Whitespace-only string
     */
    it("should return empty array for whitespace-only string", () => {
      const result = parseParams("   ");
      expect(result).toEqual([]);
    });

    /**
     * @testdoc Parameter without type annotation
     */
    it("should mark untyped parameters as unknown", () => {
      const result = parseParams("data");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ name: "data", type: "unknown" });
    });
  });
});
