/**
 * Server Action Structure Rule Tests
 *
 * Tests for the rule that validates Server Action structure.
 *
 * @testdoc Server Action の構造が正しい順序かを検証する
 */

import { serverActionStructureRule } from "../../../src/lint/rules/server-action-structure.js";
import type { CodeIssue } from "../../../src/lint/code-types.js";

describe("serverActionStructureRule", () => {
  /**
   * @testdoc ルールメタデータが正しく定義されている
   */
  it("should have correct metadata", () => {
    expect(serverActionStructureRule.id).toBe("server-action-structure");
    expect(serverActionStructureRule.severity).toBe("error");
    expect(serverActionStructureRule.description).toBeDefined();
  });

  describe("check", () => {
    /**
     * @testdoc 正しい順序の Server Action には issue を返さない
     * @purpose 認証 -> CSRF -> Zod の順序
     */
    it("should not return issues for correctly ordered Server Action", () => {
      const content = `
"use server";

import { verifyAuth } from "@/lib/auth";
import { validateCSRF } from "@/lib/csrf";
import { z } from "zod";

const schema = z.object({ name: z.string() });

export async function updateUser(formData: FormData) {
  const session = await verifyAuth();
  await validateCSRF(formData);
  const data = schema.parse(Object.fromEntries(formData));
  // ... implementation
}
`;
      const issues = serverActionStructureRule.check(
        content,
        "lib/actions/users.ts",
        "updateUser",
        10
      );
      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc mutation でも正しい順序には issue を返さない
     * @purpose verifyAuthMutation を使用する場合
     */
    it("should not return issues for mutation with verifyAuthMutation", () => {
      const content = `
"use server";

import { verifyAuthMutation } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ id: z.string() });

export async function deleteProject(formData: FormData) {
  await verifyAuthMutation(formData);
  const data = schema.parse(Object.fromEntries(formData));
  // ... implementation
}
`;
      const issues = serverActionStructureRule.check(
        content,
        "lib/actions/projects.ts",
        "deleteProject",
        8
      );
      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc 認証が最初にない場合は issue を返す
     * @purpose セキュリティ上、認証は最初に実行する必要がある
     */
    it("should return issue when auth is not first", () => {
      const content = `
"use server";

import { verifyAuth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ name: z.string() });

export async function updateUser(formData: FormData) {
  const data = schema.parse(Object.fromEntries(formData));
  const session = await verifyAuth();
  // ... implementation
}
`;
      const issues = serverActionStructureRule.check(
        content,
        "lib/actions/users.ts",
        "updateUser",
        9
      );
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].rule).toBe("server-action-structure");
      expect(issues[0].message).toContain("認証");
    });

    /**
     * @testdoc 認証関数が呼ばれていない場合は issue を返す
     * @purpose Server Action には認証が必須
     */
    it("should return issue when no auth call exists", () => {
      const content = `
"use server";

import { z } from "zod";

const schema = z.object({ name: z.string() });

export async function updateUser(formData: FormData) {
  const data = schema.parse(Object.fromEntries(formData));
  // ... implementation without auth
}
`;
      const issues = serverActionStructureRule.check(
        content,
        "lib/actions/users.ts",
        "updateUser",
        8
      );
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some((i) => i.message.includes("認証"))).toBe(true);
    });

    /**
     * @testdoc Zod バリデーションがない場合は warning を返す
     * @purpose 入力検証は推奨
     */
    it("should return warning when no Zod validation", () => {
      const content = `
"use server";

import { verifyAuth } from "@/lib/auth";

export async function getUser(id: string) {
  const session = await verifyAuth();
  // ... implementation without validation
  return { id };
}
`;
      const issues = serverActionStructureRule.check(
        content,
        "lib/actions/users.ts",
        "getUser",
        6
      );
      // Warning for missing validation
      expect(issues.some((i) => i.type === "warning")).toBe(true);
    });

    /**
     * @testdoc CSRF 検証が認証より後にある場合は OK
     * @purpose mutation 時の正しい順序
     */
    it("should accept CSRF after auth", () => {
      const content = `
"use server";

import { verifyAuth } from "@/lib/auth";
import { validateCSRF } from "@/lib/csrf";

export async function deleteItem(formData: FormData) {
  const session = await verifyAuth();
  await validateCSRF(formData);
  // ... implementation
}
`;
      const issues = serverActionStructureRule.check(
        content,
        "lib/actions/items.ts",
        "deleteItem",
        7
      );
      // Should not have order issues
      const orderIssues = issues.filter((i) =>
        i.message.includes("順序")
      );
      expect(orderIssues).toHaveLength(0);
    });

    /**
     * @testdoc "use server" がないファイルはスキップ
     * @purpose Server Action 以外のファイルは対象外
     */
    it("should skip files without 'use server'", () => {
      const content = `
import { z } from "zod";

export function regularFunction() {
  return "hello";
}
`;
      const issues = serverActionStructureRule.check(
        content,
        "lib/utils.ts",
        "regularFunction",
        4
      );
      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc 複数の関数を含むファイルで個別にチェック
     * @purpose 各関数を独立して検証
     */
    it("should check each function independently", () => {
      const content = `
"use server";

import { verifyAuth } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({ name: z.string() });

export async function getUser(id: string) {
  const session = await verifyAuth();
  return { id };
}

export async function updateUser(formData: FormData) {
  // Missing auth!
  const data = schema.parse(Object.fromEntries(formData));
  return data;
}
`;
      // Check updateUser specifically
      const issues = serverActionStructureRule.check(
        content,
        "lib/actions/users.ts",
        "updateUser",
        14
      );
      expect(issues.length).toBeGreaterThan(0);
    });
  });
});
