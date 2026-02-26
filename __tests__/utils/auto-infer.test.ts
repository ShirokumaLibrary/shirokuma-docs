/**
 * Auto Infer Utility Tests
 *
 * Tests for automatic annotation inference from TypeScript files.
 *
 * @testdoc ファイルからアノテーションを自動推論する
 */

import {
  inferAnnotations,
  inferRouteFromFilePath,
  inferComponentsFromImports,
  inferDbTablesFromDrizzleCalls,
  type InferredAnnotations,
} from "../../src/utils/auto-infer.js";

describe("inferRouteFromFilePath", () => {
  /**
   * @testdoc page.tsx ファイルパスからルートを推論できる
   * @purpose App Router のファイルパスからURLルートを抽出
   */
  it("should infer route from page.tsx file path", () => {
    const result = inferRouteFromFilePath(
      "apps/web/app/[locale]/dashboard/page.tsx"
    );
    expect(result).toBe("/dashboard");
  });

  /**
   * @testdoc [locale] を除外したルートを返す
   * @purpose i18n セグメントはルートに含めない
   */
  it("should exclude [locale] from route", () => {
    const result = inferRouteFromFilePath(
      "apps/admin/app/[locale]/users/[userId]/page.tsx"
    );
    expect(result).toBe("/users/[userId]");
  });

  /**
   * @testdoc ルートページは "/" を返す
   * @purpose ルート app/[locale]/page.tsx の場合
   */
  it("should return / for root page", () => {
    const result = inferRouteFromFilePath("apps/web/app/[locale]/page.tsx");
    expect(result).toBe("/");
  });

  /**
   * @testdoc レイアウトグループを除外する
   * @purpose (dashboard) などのグループセグメントを除外
   */
  it("should exclude layout groups from route", () => {
    const result = inferRouteFromFilePath(
      "apps/web/app/[locale]/(dashboard)/settings/page.tsx"
    );
    expect(result).toBe("/settings");
  });

  /**
   * @testdoc page.tsx 以外のファイルは null を返す
   * @purpose layout.tsx, loading.tsx などは対象外
   */
  it("should return null for non-page files", () => {
    const layoutResult = inferRouteFromFilePath(
      "apps/web/app/[locale]/layout.tsx"
    );
    expect(layoutResult).toBeNull();

    const componentResult = inferRouteFromFilePath(
      "apps/web/components/my-component.tsx"
    );
    expect(componentResult).toBeNull();
  });
});

describe("inferComponentsFromImports", () => {
  /**
   * @testdoc import 文からコンポーネント名を抽出する
   * @purpose ファイル内で使用しているコンポーネントを特定
   */
  it("should extract component names from imports", () => {
    const content = `
import { Button, Card } from "@/components/ui";
import { UserAvatar } from "@/components/user-avatar";
import { useEffect } from "react";
`;
    const result = inferComponentsFromImports(content);
    expect(result).toContain("Button");
    expect(result).toContain("Card");
    expect(result).toContain("UserAvatar");
    // React hooks should not be included (lowercase start)
    expect(result).not.toContain("useEffect");
  });

  /**
   * @testdoc components ディレクトリからのインポートのみを抽出
   * @purpose lib や utils からのインポートは除外
   */
  it("should only extract imports from components directory", () => {
    const content = `
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { serverAction } from "@/lib/actions/users";
`;
    const result = inferComponentsFromImports(content);
    expect(result).toContain("Button");
    expect(result).not.toContain("formatDate");
    expect(result).not.toContain("serverAction");
  });

  /**
   * @testdoc デフォルトインポートを抽出する
   * @purpose default export のコンポーネント
   */
  it("should extract default imports", () => {
    const content = `
import ProjectList from "@/components/project-list";
import { Button } from "@/components/ui";
`;
    const result = inferComponentsFromImports(content);
    expect(result).toContain("ProjectList");
    expect(result).toContain("Button");
  });

  /**
   * @testdoc [auto-infer/inferComponents] 重複を除去する
   * @purpose 同じコンポーネントを複数回インポートしている場合
   */
  it("should remove duplicates", () => {
    const content = `
import { Button } from "@/components/ui/button";
import { Button as PrimaryButton } from "@/components/ui/button";
`;
    const result = inferComponentsFromImports(content);
    const buttonCount = result.filter((c) => c === "Button").length;
    expect(buttonCount).toBe(1);
  });
});

describe("inferDbTablesFromDrizzleCalls", () => {
  /**
   * @testdoc db.query.xxx から使用テーブルを抽出
   * @purpose Drizzle ORM のクエリパターンを解析
   */
  it("should extract table names from db.query calls", () => {
    const content = `
const users = await db.query.users.findMany();
const projects = await db.query.projects.findFirst({ where: eq(projects.id, id) });
`;
    const result = inferDbTablesFromDrizzleCalls(content);
    expect(result).toContain("users");
    expect(result).toContain("projects");
  });

  /**
   * @testdoc db.select().from(table) から使用テーブルを抽出
   * @purpose Drizzle ORM の select パターンを解析
   */
  it("should extract table names from db.select().from() calls", () => {
    const content = `
const result = await db.select().from(users).where(eq(users.id, id));
const data = await db.select({ id: posts.id }).from(posts);
`;
    const result = inferDbTablesFromDrizzleCalls(content);
    expect(result).toContain("users");
    expect(result).toContain("posts");
  });

  /**
   * @testdoc db.insert(table) から使用テーブルを抽出
   * @purpose Drizzle ORM の insert パターンを解析
   */
  it("should extract table names from db.insert() calls", () => {
    const content = `
await db.insert(users).values({ name: "Test" });
await db.insert(projects).values([{ name: "P1" }, { name: "P2" }]);
`;
    const result = inferDbTablesFromDrizzleCalls(content);
    expect(result).toContain("users");
    expect(result).toContain("projects");
  });

  /**
   * @testdoc db.update(table) から使用テーブルを抽出
   * @purpose Drizzle ORM の update パターンを解析
   */
  it("should extract table names from db.update() calls", () => {
    const content = `
await db.update(users).set({ name: "New" }).where(eq(users.id, id));
`;
    const result = inferDbTablesFromDrizzleCalls(content);
    expect(result).toContain("users");
  });

  /**
   * @testdoc db.delete(table) から使用テーブルを抽出
   * @purpose Drizzle ORM の delete パターンを解析
   */
  it("should extract table names from db.delete() calls", () => {
    const content = `
await db.delete(users).where(eq(users.id, id));
`;
    const result = inferDbTablesFromDrizzleCalls(content);
    expect(result).toContain("users");
  });

  /**
   * @testdoc [auto-infer/inferDbTables] 重複を除去する
   * @purpose 同じテーブルを複数回使用している場合
   */
  it("should remove duplicates", () => {
    const content = `
const user = await db.query.users.findFirst();
await db.update(users).set({ name: "New" });
await db.delete(users).where(eq(users.id, id));
`;
    const result = inferDbTablesFromDrizzleCalls(content);
    const usersCount = result.filter((t) => t === "users").length;
    expect(usersCount).toBe(1);
  });

  /**
   * @testdoc DB 操作がない場合は空配列を返す
   * @purpose 非 Server Action ファイルの場合
   */
  it("should return empty array when no db calls", () => {
    const content = `
export function myFunction() {
  return "hello";
}
`;
    const result = inferDbTablesFromDrizzleCalls(content);
    expect(result).toEqual([]);
  });
});

describe("inferAnnotations", () => {
  /**
   * @testdoc ファイルパスとコンテンツから全アノテーションを推論
   * @purpose 統合的なアノテーション推論
   */
  it("should infer all annotations from file path and content", async () => {
    const filePath = "apps/web/app/[locale]/dashboard/page.tsx";
    const content = `
import { Button } from "@/components/ui/button";
import { ProjectList } from "@/components/project-list";

export default function DashboardPage() {
  return <div><Button /><ProjectList /></div>;
}
`;
    const result = await inferAnnotations(filePath, content);

    expect(result.route).toBe("/dashboard");
    expect(result.usedComponents).toContain("Button");
    expect(result.usedComponents).toContain("ProjectList");
    expect(result.dbTables).toEqual([]);
  });

  /**
   * @testdoc Server Action ファイルからDB テーブルを推論
   * @purpose lib/actions 内のファイル解析
   */
  it("should infer db tables from server action file", async () => {
    const filePath = "apps/web/lib/actions/users.ts";
    const content = `
"use server";

import { db } from "@/lib/db";
import { users, sessions } from "@/lib/schema";

export async function getUser(id: string) {
  return await db.query.users.findFirst({ where: eq(users.id, id) });
}

export async function deleteSession(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
`;
    const result = await inferAnnotations(filePath, content);

    expect(result.route).toBeNull();
    expect(result.dbTables).toContain("users");
    expect(result.dbTables).toContain("sessions");
  });
});
