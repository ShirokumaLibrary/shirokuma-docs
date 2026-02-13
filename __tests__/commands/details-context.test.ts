/**
 * Tests for details-context.ts
 *
 * Covers: createDetailsContext, extractModuleName, getElementFullKey,
 * getExistingMap, findElementLink, readSourceCode, extractFunctionCode
 */

import {
  createDetailsContext,
  extractModuleName,
  getElementFullKey,
  getExistingMap,
  findElementLink,
  extractFunctionCode,
} from "../../src/commands/details-context.js";
import type { DetailsContext } from "../../src/commands/details-types.js";

describe("details-context", () => {
  describe("createDetailsContext", () => {
    it("should create an empty context", () => {
      const ctx = createDetailsContext();
      expect(ctx.allTestCases).toEqual([]);
      expect(ctx.detailsJsonItems).toEqual({});
      expect(ctx.existingElements.screens).toBeInstanceOf(Map);
      expect(ctx.existingElements.components).toBeInstanceOf(Map);
      expect(ctx.existingElements.actions).toBeInstanceOf(Map);
      expect(ctx.existingElements.modules).toBeInstanceOf(Map);
      expect(ctx.existingElements.tables).toBeInstanceOf(Map);
    });
  });

  describe("extractModuleName", () => {
    it("should extract module from route group directory", () => {
      expect(extractModuleName("apps/admin/app/[locale]/(entities)/page.tsx")).toBe("entities");
    });

    it("should skip dynamic route segments", () => {
      expect(extractModuleName("apps/admin/app/[locale]/(dashboard)/[id]/page.tsx")).toBe("dashboard");
    });

    it("should use meaningful directory name, not excluded dirs", () => {
      expect(extractModuleName("apps/admin/components/projects/ProjectList.tsx")).toBe("projects");
    });

    it("should fall back to filename when no meaningful dir found", () => {
      expect(extractModuleName("app/lib/utils.ts")).toBe("utils");
    });

    it("should handle Windows-style paths", () => {
      expect(extractModuleName("apps\\admin\\components\\projects\\ProjectList.tsx")).toBe("projects");
    });

    it("should skip common excluded directories", () => {
      // "lib" is excluded, so it should go up to find a meaningful name
      expect(extractModuleName("src/lib/helpers.ts")).toBe("helpers");
    });

    it("should handle nested module paths", () => {
      expect(extractModuleName("apps/web/lib/actions/entities/create.ts")).toBe("entities");
    });
  });

  describe("getElementFullKey", () => {
    it("should generate key with module/name format", () => {
      expect(getElementFullKey("entities", "DashboardPage")).toBe("entities/DashboardPage");
    });
  });

  describe("getExistingMap", () => {
    let ctx: DetailsContext;

    beforeEach(() => {
      ctx = createDetailsContext();
      ctx.existingElements.screens.set("dashboard/DashboardPage", "dashboard");
      ctx.existingElements.components.set("projects/ProjectList", "projects");
      ctx.existingElements.actions.set("entities/createEntity", "entities");
      ctx.existingElements.modules.set("auth/authHelper", "auth");
      ctx.existingElements.tables.set("schema/users", "schema");
    });

    it("should return screens map for 'screen' linkType", () => {
      const map = getExistingMap(ctx, "screen");
      expect(map.has("dashboard/DashboardPage")).toBe(true);
    });

    it("should return components map for 'component' linkType", () => {
      const map = getExistingMap(ctx, "component");
      expect(map.has("projects/ProjectList")).toBe(true);
    });

    it("should return actions map for 'action' linkType", () => {
      const map = getExistingMap(ctx, "action");
      expect(map.has("entities/createEntity")).toBe(true);
    });

    it("should return modules map for 'module' linkType", () => {
      const map = getExistingMap(ctx, "module");
      expect(map.has("auth/authHelper")).toBe(true);
    });

    it("should return tables map for 'table' linkType", () => {
      const map = getExistingMap(ctx, "table");
      expect(map.has("schema/users")).toBe(true);
    });

    it("should return empty map for unknown linkType", () => {
      const map = getExistingMap(ctx, "unknown");
      expect(map.size).toBe(0);
    });
  });

  describe("findElementLink", () => {
    let ctx: DetailsContext;

    beforeEach(() => {
      ctx = createDetailsContext();
      ctx.existingElements.screens.set("dashboard/DashboardPage", "dashboard");
      ctx.existingElements.components.set("projects/ProjectList", "projects");
      ctx.existingElements.components.set("shared/ProjectList", "shared");
    });

    it("should find element link by name", () => {
      const result = findElementLink(ctx, "screen", "DashboardPage");
      expect(result).toEqual({ module: "dashboard" });
    });

    it("should return first match when multiple modules have same element name", () => {
      const result = findElementLink(ctx, "component", "ProjectList");
      expect(result).not.toBeNull();
      expect(result!.module).toBeDefined();
    });

    it("should return null for non-existing element", () => {
      const result = findElementLink(ctx, "screen", "NonExistentPage");
      expect(result).toBeNull();
    });

    it("should return null for unknown linkType", () => {
      const result = findElementLink(ctx, "unknown", "DashboardPage");
      expect(result).toBeNull();
    });
  });

  describe("extractFunctionCode", () => {
    it("should extract a named function with JSDoc", () => {
      const source = `
import { something } from "somewhere";

/**
 * Dashboard page component
 * @screen DashboardPage
 */
export function DashboardPage() {
  return <div>Dashboard</div>;
}

export function OtherPage() {
  return <div>Other</div>;
}`;

      const result = extractFunctionCode(source, "DashboardPage");
      expect(result).toContain("Dashboard page component");
      expect(result).toContain("export function DashboardPage");
      expect(result).toContain("return <div>Dashboard</div>");
      expect(result).not.toContain("OtherPage");
    });

    it("should extract const arrow function", () => {
      const source = `
export const createEntity = async (data: FormData) => {
  const result = await db.insert(entities).values(data);
  return result;
};

export const deleteEntity = async (id: string) => {
  await db.delete(entities).where(eq(entities.id, id));
};`;

      const result = extractFunctionCode(source, "createEntity");
      expect(result).toContain("export const createEntity");
      expect(result).toContain("db.insert");
    });

    it("should return full source when target not found", () => {
      const source = "const x = 1;";
      const result = extractFunctionCode(source, "NonExistent");
      expect(result).toBe(source);
    });

    it("should handle async function", () => {
      const source = `
export async function fetchData(id: string) {
  const data = await fetch(\`/api/\${id}\`);
  return data.json();
}`;

      const result = extractFunctionCode(source, "fetchData");
      expect(result).toContain("export async function fetchData");
      expect(result).toContain("return data.json()");
    });

    it("should handle nested braces correctly", () => {
      const source = `
export function complexFn(items: Item[]) {
  const result = items.map((item) => {
    if (item.type === "a") {
      return { ...item, processed: true };
    }
    return item;
  });
  return result;
}

export function otherFn() { return 1; }`;

      const result = extractFunctionCode(source, "complexFn");
      expect(result).toContain("export function complexFn");
      expect(result).toContain("return result;");
      expect(result).not.toContain("otherFn");
    });
  });
});
