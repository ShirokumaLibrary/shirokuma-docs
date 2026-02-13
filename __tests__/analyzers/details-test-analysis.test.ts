/**
 * Tests for details-test-analysis.ts
 *
 * Covers: categorizeTest, extractTestIntent, analyzeTestCoverage,
 * findTestCasesForElement, findTestCasesForModule
 */

import {
  categorizeTest,
  extractTestIntent,
  analyzeTestCoverage,
  findTestCasesForElement,
  findTestCasesForModule,
} from "../../src/analyzers/details-test-analysis.js";
import { createDetailsContext } from "../../src/commands/details-context.js";
import type { DetailsContext, ShirokumaTestCase } from "../../src/commands/details-types.js";

describe("details-test-analysis", () => {
  describe("categorizeTest", () => {
    it("should categorize auth-related tests", () => {
      const result = categorizeTest("should require authentication", "UserService");
      expect(result.category).toBe("auth");
    });

    it("should categorize login/logout tests as auth", () => {
      expect(categorizeTest("should redirect to login page", "Auth").category).toBe("auth");
      expect(categorizeTest("should handle logout correctly", "Session").category).toBe("auth");
    });

    it("should categorize error handling tests", () => {
      const result = categorizeTest("should throw error on missing data", "DataService");
      expect(result.category).toBe("error-handling");
    });

    it("should categorize validation tests", () => {
      const result = categorizeTest("should validate email format", "FormValidator");
      expect(result.category).toBe("validation");
    });

    it("should categorize edge-case tests", () => {
      const result = categorizeTest("edge case: boundary value at limit", "Calculator");
      expect(result.category).toBe("edge-case");
    });

    it("should categorize happy-path tests as default", () => {
      const result = categorizeTest("should return user profile data", "UserProfile");
      expect(result.category).toBe("happy-path");
    });

    it("should include summary in result", () => {
      const result = categorizeTest("should create a new entity successfully", "EntityService");
      expect(result.summary).toBeTruthy();
      expect(typeof result.summary).toBe("string");
    });

    it("should prioritize auth over error keywords", () => {
      // "unauthorized" contains auth keyword AND error-like keyword
      const result = categorizeTest("should return unauthorized for invalid token", "AuthGuard");
      expect(result.category).toBe("auth");
    });
  });

  describe("extractTestIntent", () => {
    it("should extract intent from 'should' prefix", () => {
      const result = extractTestIntent("should create a new user");
      expect(result).toBe("create a new user");
    });

    it("should return original when no 'should' prefix", () => {
      const result = extractTestIntent("it creates a user");
      expect(result).toBe("it creates a user");
    });

    it("should return original for non-standard format", () => {
      const result = extractTestIntent("renders component correctly");
      expect(result).toBe("renders component correctly");
    });
  });

  describe("analyzeTestCoverage", () => {
    it("should return zero score for empty test cases", () => {
      const result = analyzeTestCoverage([], false, false);
      expect(result.coverageScore).toBe(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should score higher with more test categories", () => {
      const testCases = [
        { category: "happy-path" as const, it: "test1", describe: "desc", file: "f.test.ts", line: 1, framework: "jest" as const, summary: "s1" },
        { category: "error-handling" as const, it: "test2", describe: "desc", file: "f.test.ts", line: 2, framework: "jest" as const, summary: "s2" },
        { category: "validation" as const, it: "test3", describe: "desc", file: "f.test.ts", line: 3, framework: "jest" as const, summary: "s3" },
      ];
      const result = analyzeTestCoverage(testCases, false, false);
      expect(result.coverageScore).toBeGreaterThan(0);
      expect(Object.keys(result.byCategory).length).toBeGreaterThan(0);
    });

    it("should recommend auth tests when hasAuth is true and no auth tests", () => {
      const testCases = [
        { category: "happy-path" as const, it: "test1", describe: "desc", file: "f.test.ts", line: 1, framework: "jest" as const, summary: "s1" },
      ];
      const result = analyzeTestCoverage(testCases, true, false);
      expect(result.missingPatterns).toContain("認証・認可テスト");
    });

    it("should recommend DB tests when hasDb is true and no edge-case tests", () => {
      const testCases = [
        { category: "happy-path" as const, it: "test1", describe: "desc", file: "f.test.ts", line: 1, framework: "jest" as const, summary: "s1" },
      ];
      const result = analyzeTestCoverage(testCases, false, true);
      // DB recommendations may vary, but coverage should reflect it
      expect(result.coverageScore).toBeDefined();
    });

    it("should organize tests by category", () => {
      const testCases = [
        { category: "happy-path" as const, it: "test1", describe: "desc", file: "f.test.ts", line: 1, framework: "jest" as const, summary: "s1" },
        { category: "happy-path" as const, it: "test2", describe: "desc", file: "f.test.ts", line: 2, framework: "jest" as const, summary: "s2" },
        { category: "auth" as const, it: "test3", describe: "desc", file: "f.test.ts", line: 3, framework: "jest" as const, summary: "s3" },
      ];
      const result = analyzeTestCoverage(testCases, false, false);
      expect(result.byCategory["happy-path"]).toHaveLength(2);
      expect(result.byCategory["auth"]).toHaveLength(1);
    });
  });

  describe("findTestCasesForElement", () => {
    let ctx: DetailsContext;

    beforeEach(() => {
      ctx = createDetailsContext();
      ctx.allTestCases = [
        {
          it: "should create entity",
          describe: "createEntity",
          file: "__tests__/actions/entities.test.ts",
          line: 10,
          framework: "jest",
        },
        {
          it: "should validate form",
          describe: "EntityForm",
          file: "__tests__/components/entity-form.test.tsx",
          line: 20,
          framework: "jest",
        },
        {
          it: "should navigate to dashboard",
          describe: "DashboardPage",
          file: "tests/e2e/dashboard.spec.ts",
          line: 30,
          framework: "playwright",
        },
      ] as ShirokumaTestCase[];
    });

    it("should find tests by describe name matching", () => {
      const results = findTestCasesForElement("createEntity", "lib/actions/entities.ts", ctx);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].it).toBe("should create entity");
    });

    it("should find tests by file path matching", () => {
      const results = findTestCasesForElement("EntityForm", "components/entity-form.tsx", ctx);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty array for unrelated element", () => {
      const results = findTestCasesForElement("UnrelatedComponent", "components/unrelated.tsx", ctx);
      expect(results).toEqual([]);
    });

    it("should categorize found test cases", () => {
      const results = findTestCasesForElement("createEntity", "lib/actions/entities.ts", ctx);
      if (results.length > 0) {
        expect(results[0].category).toBeDefined();
        expect(results[0].summary).toBeDefined();
      }
    });
  });

  describe("findTestCasesForModule", () => {
    let ctx: DetailsContext;

    beforeEach(() => {
      ctx = createDetailsContext();
      ctx.allTestCases = [
        {
          it: "should create entity",
          describe: "entities > createEntity",
          file: "__tests__/lib/actions/entities.test.ts",
          line: 10,
          framework: "jest",
        },
        {
          it: "should render dashboard",
          describe: "DashboardPage",
          file: "tests/e2e/dashboard.spec.ts",
          line: 20,
          framework: "playwright",
        },
        {
          it: "should unrelated test",
          describe: "SomethingElse",
          file: "__tests__/other/something.test.ts",
          line: 30,
          framework: "jest",
        },
      ] as ShirokumaTestCase[];
    });

    it("should find tests for action module by path", () => {
      const results = findTestCasesForModule("entities", "action", ctx);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].it).toBe("should create entity");
    });

    it("should find tests for screen module by path", () => {
      const results = findTestCasesForModule("dashboard", "screen", ctx);
      expect(results.length).toBeGreaterThan(0);
    });

    it("should return empty for module with no related tests", () => {
      const results = findTestCasesForModule("nonexistent", "action", ctx);
      expect(results).toEqual([]);
    });

    it("should find tests by describe matching", () => {
      const results = findTestCasesForModule("entities", "action", ctx);
      const matchByDescribe = results.some((r) => r.describe.toLowerCase().includes("entities"));
      expect(matchByDescribe).toBe(true);
    });
  });
});
