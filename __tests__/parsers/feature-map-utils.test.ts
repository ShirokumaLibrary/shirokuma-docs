/**
 * Feature Map Utils Tests
 *
 * Tests for shared utility functions used by feature-map tag parsing
 * and type extraction modules.
 */

import {
  extractTags,
  extractDescription,
  parseCommaSeparatedList,
  extractModuleName,
} from "../../src/parsers/feature-map-utils.js";

describe("feature-map-utils", () => {
  describe("extractTags", () => {
    /**
     * @testdoc Basic tag extraction from JSDoc block
     */
    it("should extract basic tags", () => {
      const jsdoc = `/**
 * @screen Dashboard
 * @route /dashboard
 * @feature UserManagement
 */`;
      const tags = extractTags(jsdoc);

      expect(tags.screen).toBe("Dashboard");
      expect(tags.route).toBe("/dashboard");
      expect(tags.feature).toBe("UserManagement");
    });

    /**
     * @testdoc @serverAction as a marker tag (no value)
     */
    it("should handle marker tags like @serverAction", () => {
      const jsdoc = `/**
 * @serverAction
 * @feature Test
 */`;
      const tags = extractTags(jsdoc);

      expect(tags.serverAction).toBe("");
      expect(tags.feature).toBe("Test");
    });

    /**
     * @testdoc Tags with trailing whitespace
     */
    it("should trim tag values", () => {
      const jsdoc = `/**
 * @screen  Dashboard
 * @route  /dashboard
 */`;
      const tags = extractTags(jsdoc);

      expect(tags.screen).toBe("Dashboard");
      expect(tags.route).toBe("/dashboard");
    });

    /**
     * @testdoc Tags with comma-separated values
     */
    it("should preserve comma-separated values as single string", () => {
      const jsdoc = `/**
 * @usedComponents CompA, CompB, CompC
 * @dbTables users, accounts
 */`;
      const tags = extractTags(jsdoc);

      expect(tags.usedComponents).toBe("CompA, CompB, CompC");
      expect(tags.dbTables).toBe("users, accounts");
    });

    /**
     * @testdoc Empty JSDoc block
     */
    it("should return empty object for JSDoc without tags", () => {
      const jsdoc = `/**
 * Just a description
 * with multiple lines
 */`;
      const tags = extractTags(jsdoc);

      expect(Object.keys(tags)).toHaveLength(0);
    });

    /**
     * @testdoc Tag at end of JSDoc (before closing)
     */
    it("should extract tags before closing */", () => {
      const jsdoc = `/** @screen Inline */`;
      const tags = extractTags(jsdoc);

      expect(tags.screen).toBe("Inline");
    });
  });

  describe("extractDescription", () => {
    /**
     * @testdoc Single-line description
     */
    it("should extract single-line description", () => {
      const jsdoc = `/**
 * Dashboard page component
 * @screen Dashboard
 */`;
      const desc = extractDescription(jsdoc);
      expect(desc).toBe("Dashboard page component");
    });

    /**
     * @testdoc Multi-line description
     */
    it("should extract multi-line description", () => {
      const jsdoc = `/**
 * Dashboard page component
 * Shows user statistics and recent activity
 * @screen Dashboard
 */`;
      const desc = extractDescription(jsdoc);
      expect(desc).toContain("Dashboard page component");
      expect(desc).toContain("Shows user statistics and recent activity");
    });

    /**
     * @testdoc JSDoc with only tags (no description)
     */
    it("should return undefined when no description exists", () => {
      const jsdoc = `/**
 * @screen Dashboard
 * @route /dashboard
 */`;
      const desc = extractDescription(jsdoc);
      expect(desc).toBeUndefined();
    });

    /**
     * @testdoc Japanese description
     */
    it("should extract Japanese description", () => {
      const jsdoc = `/**
 * ユーザー管理画面
 * @screen UserAdmin
 */`;
      const desc = extractDescription(jsdoc);
      expect(desc).toBe("ユーザー管理画面");
    });

    /**
     * @testdoc Description lines preserve relative indentation
     */
    it("should preserve content after JSDoc marker", () => {
      const jsdoc = `/**
 * Main description
 *   indented content
 * @tag value
 */`;
      const desc = extractDescription(jsdoc);
      expect(desc).toContain("Main description");
      expect(desc).toContain("  indented content");
    });
  });

  describe("parseCommaSeparatedList", () => {
    /**
     * @testdoc Standard comma-separated values
     */
    it("should parse comma-separated values", () => {
      const result = parseCommaSeparatedList("CompA, CompB, CompC");
      expect(result).toEqual(["CompA", "CompB", "CompC"]);
    });

    /**
     * @testdoc Undefined input
     */
    it("should return empty array for undefined", () => {
      const result = parseCommaSeparatedList(undefined);
      expect(result).toEqual([]);
    });

    /**
     * @testdoc Empty string
     */
    it("should return empty array for empty string", () => {
      const result = parseCommaSeparatedList("");
      expect(result).toEqual([]);
    });

    /**
     * @testdoc Whitespace handling
     */
    it("should trim whitespace from values", () => {
      const result = parseCommaSeparatedList("  CompA ,  CompB  , CompC  ");
      expect(result).toEqual(["CompA", "CompB", "CompC"]);
    });

    /**
     * @testdoc Single value without commas
     */
    it("should handle single value", () => {
      const result = parseCommaSeparatedList("CompA");
      expect(result).toEqual(["CompA"]);
    });

    /**
     * @testdoc Filter out empty entries from trailing commas
     */
    it("should filter out empty entries", () => {
      const result = parseCommaSeparatedList("CompA,,CompB,");
      expect(result).toEqual(["CompA", "CompB"]);
    });
  });

  describe("extractModuleName", () => {
    /**
     * @testdoc Actions directory extraction
     */
    it("should extract module name from actions path", () => {
      const result = extractModuleName("apps/web/lib/actions/members.ts");
      expect(result).toBe("members");
    });

    /**
     * @testdoc Components subdirectory
     */
    it("should extract module name from components path", () => {
      const result = extractModuleName("apps/web/components/ui/button.tsx");
      expect(result).toBe("ui");
    });

    /**
     * @testdoc Route group directory (parentheses)
     */
    it("should extract route group name without parentheses", () => {
      const result = extractModuleName("apps/web/app/[locale]/(dashboard)/page.tsx");
      expect(result).toBe("dashboard");
    });

    /**
     * @testdoc Dynamic route segments are skipped
     */
    it("should skip dynamic route segments", () => {
      const result = extractModuleName("apps/web/app/[locale]/settings/page.tsx");
      expect(result).toBe("settings");
    });

    /**
     * @testdoc Package path - 'database' is first non-excluded dir from right
     */
    it("should extract from package path", () => {
      const result = extractModuleName("packages/database/src/schema/users.ts");
      // "users" is the filename, "schema" is excluded, "src" is excluded, "database" is the first non-excluded dir
      expect(result).toBe("database");
    });

    /**
     * @testdoc Fallback to filename
     */
    it("should fallback to filename when no meaningful directory", () => {
      const result = extractModuleName("src/utils.ts");
      expect(result).toBe("utils");
    });

    /**
     * @testdoc Excludes common directory names
     */
    it("should skip excluded directories like lib, app, src", () => {
      const result = extractModuleName("apps/web/lib/auth/session.ts");
      expect(result).toBe("auth");
    });

    /**
     * @testdoc Backslash path handling (Windows)
     */
    it("should handle backslash paths", () => {
      const result = extractModuleName("apps\\web\\lib\\actions\\members.ts");
      expect(result).toBe("members");
    });
  });
});
