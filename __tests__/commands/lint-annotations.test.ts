/**
 * lint-annotations コマンドテスト
 *
 * コードアノテーションの整合性を検証するコマンドのテスト
 *
 * 検証対象:
 * - @usedComponents: インポートとの整合性
 * - @screen: page.tsx での存在チェック
 * - @component: components/*.tsx での存在チェック
 */

import { resolve, join } from "node:path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import {
  extractUsedComponentsAnnotation,
  extractComponentsFromImports,
  compareUsedComponents,
  checkScreenAnnotation,
  checkComponentAnnotation,
  type UsedComponentsResult,
  type AnnotationCheckResult,
} from "../../src/lint/annotation-lint.js";

const TEST_DIR = resolve(process.cwd(), "__tests__/fixtures/lint-annotations");

/**
 * テストフィクスチャのセットアップとクリーンアップ
 */
beforeAll(() => {
  if (!existsSync(TEST_DIR)) {
    mkdirSync(TEST_DIR, { recursive: true });
  }
});

afterAll(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
});

describe("extractUsedComponentsAnnotation", () => {
  /**
   * @testdoc JSDocから@usedComponentsを正しく抽出する
   */
  it("should extract @usedComponents from JSDoc", () => {
    const content = `/**
 * Navigation component
 * @component NavTags
 * @usedComponents SidebarGroup, SidebarMenu, Badge
 */
export function NavTags() {}`;

    const result = extractUsedComponentsAnnotation(content);

    expect(result).toEqual(["SidebarGroup", "SidebarMenu", "Badge"]);
  });

  /**
   * @testdoc @usedComponentsがない場合は空配列を返す
   */
  it("should return empty array when @usedComponents is not present", () => {
    const content = `/**
 * Navigation component
 * @component NavTags
 */
export function NavTags() {}`;

    const result = extractUsedComponentsAnnotation(content);

    expect(result).toEqual([]);
  });

  /**
   * @testdoc 複数行の@usedComponentsを処理する
   */
  it("should handle @usedComponents with multiple lines", () => {
    const content = `/**
 * @usedComponents Button, Card,
 *   Dialog, Form
 */
export function MyComponent() {}`;

    const result = extractUsedComponentsAnnotation(content);

    expect(result).toContain("Button");
    expect(result).toContain("Card");
    expect(result).toContain("Dialog");
    expect(result).toContain("Form");
  });

  /**
   * @testdoc スペースやカンマの揺れを許容する
   */
  it("should handle various spacing and comma formats", () => {
    const content = `/**
 * @usedComponents   Button,  Card ,Dialog
 */
export function MyComponent() {}`;

    const result = extractUsedComponentsAnnotation(content);

    expect(result).toEqual(["Button", "Card", "Dialog"]);
  });
});

describe("extractComponentsFromImports", () => {
  /**
   * @testdoc 名前付きインポートからコンポーネントを抽出する
   */
  it("should extract components from named imports", () => {
    const content = `import { Button, Card } from "@/components/ui/button";
import { SidebarGroup, SidebarMenu } from "@/components/ui/sidebar";`;

    const result = extractComponentsFromImports(content);

    expect(result).toContain("Button");
    expect(result).toContain("Card");
    expect(result).toContain("SidebarGroup");
    expect(result).toContain("SidebarMenu");
  });

  /**
   * @testdoc デフォルトインポートからコンポーネントを抽出する
   */
  it("should extract components from default imports", () => {
    const content = `import MyComponent from "@/components/my-component";
import AnotherComponent from "@/components/another";`;

    const result = extractComponentsFromImports(content);

    expect(result).toContain("MyComponent");
    expect(result).toContain("AnotherComponent");
  });

  /**
   * @testdoc PascalCase以外の名前（hooks等）を除外する
   */
  it("should exclude non-PascalCase names (hooks)", () => {
    const content = `import { Button, useSidebar, Card, useForm } from "@/components/ui";`;

    const result = extractComponentsFromImports(content, { excludeHooks: true });

    expect(result).toContain("Button");
    expect(result).toContain("Card");
    expect(result).not.toContain("useSidebar");
    expect(result).not.toContain("useForm");
  });

  /**
   * @testdoc componentsディレクトリ以外のインポートを除外する
   */
  it("should exclude imports from non-components directories", () => {
    const content = `import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import React from "react";`;

    const result = extractComponentsFromImports(content);

    expect(result).toContain("Button");
    expect(result).not.toContain("db");
    expect(result).not.toContain("auth");
    expect(result).not.toContain("React");
  });

  /**
   * @testdoc 相対パスのインポートを処理する
   */
  it("should handle relative imports from components directory", () => {
    const content = `import { Button } from "../components/ui/button";
import { Card } from "./components/card";`;

    const result = extractComponentsFromImports(content);

    expect(result).toContain("Button");
    expect(result).toContain("Card");
  });
});

describe("compareUsedComponents", () => {
  /**
   * @testdoc アノテーションとインポートが一致する場合
   */
  it("should return no issues when annotation matches imports", () => {
    const annotated = ["Button", "Card", "Dialog"];
    const imported = ["Button", "Card", "Dialog"];

    const result = compareUsedComponents(annotated, imported);

    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.valid).toBe(true);
  });

  /**
   * @testdoc アノテーションに不足がある場合（インポートにあるがアノテーションにない）
   */
  it("should detect missing components (imported but not annotated)", () => {
    const annotated = ["Button", "Card"];
    const imported = ["Button", "Card", "Dialog", "Form"];

    const result = compareUsedComponents(annotated, imported);

    expect(result.missing).toEqual(["Dialog", "Form"]);
    expect(result.extra).toEqual([]);
    expect(result.valid).toBe(false);
  });

  /**
   * @testdoc アノテーションに余分がある場合（アノテーションにあるがインポートにない）
   */
  it("should detect extra components (annotated but not imported)", () => {
    const annotated = ["Button", "Card", "Dialog", "Form"];
    const imported = ["Button", "Card"];

    const result = compareUsedComponents(annotated, imported);

    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual(["Dialog", "Form"]);
    expect(result.valid).toBe(false);
  });

  /**
   * @testdoc 複合的な不一致を検出する
   */
  it("should detect both missing and extra components", () => {
    const annotated = ["Button", "Dialog"];
    const imported = ["Button", "Card"];

    const result = compareUsedComponents(annotated, imported);

    expect(result.missing).toEqual(["Card"]);
    expect(result.extra).toEqual(["Dialog"]);
    expect(result.valid).toBe(false);
  });

  /**
   * @testdoc 空のアノテーションと空のインポート
   */
  it("should handle empty arrays", () => {
    const result = compareUsedComponents([], []);

    expect(result.missing).toEqual([]);
    expect(result.extra).toEqual([]);
    expect(result.valid).toBe(true);
  });
});

describe("checkScreenAnnotation", () => {
  /**
   * @testdoc @screenがある場合は成功を返す
   */
  it("should return valid when @screen annotation exists", () => {
    const content = `/**
 * Dashboard page
 * @screen DashboardScreen
 * @route /dashboard
 */
export default function DashboardPage() {}`;

    const result = checkScreenAnnotation(content, "app/[locale]/dashboard/page.tsx");

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * @testdoc @screenがない場合はwarningを返す
   */
  it("should return warning when @screen annotation is missing", () => {
    const content = `/**
 * Dashboard page
 */
export default function DashboardPage() {}`;

    const result = checkScreenAnnotation(content, "app/[locale]/dashboard/page.tsx");

    expect(result.valid).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].message).toContain("@screen");
  });

  /**
   * @testdoc 除外ファイル（not-found.tsx等）はスキップする
   */
  it("should skip excluded files like not-found.tsx", () => {
    const content = `export default function NotFound() {}`;

    const result = checkScreenAnnotation(
      content,
      "app/[locale]/not-found.tsx",
      { exclude: ["**/not-found.tsx", "**/error.tsx", "**/loading.tsx"] }
    );

    expect(result.valid).toBe(true);
    expect(result.skipped).toBe(true);
  });

  /**
   * @testdoc error.tsxは除外する
   */
  it("should skip error.tsx files", () => {
    const content = `export default function ErrorPage() {}`;

    const result = checkScreenAnnotation(
      content,
      "app/[locale]/error.tsx",
      { exclude: ["**/not-found.tsx", "**/error.tsx", "**/loading.tsx"] }
    );

    expect(result.valid).toBe(true);
    expect(result.skipped).toBe(true);
  });

  /**
   * @testdoc loading.tsxは除外する
   */
  it("should skip loading.tsx files", () => {
    const content = `export default function Loading() {}`;

    const result = checkScreenAnnotation(
      content,
      "app/[locale]/loading.tsx",
      { exclude: ["**/not-found.tsx", "**/error.tsx", "**/loading.tsx"] }
    );

    expect(result.valid).toBe(true);
    expect(result.skipped).toBe(true);
  });
});

describe("checkComponentAnnotation", () => {
  /**
   * @testdoc @componentがある場合は成功を返す
   */
  it("should return valid when @component annotation exists", () => {
    const content = `/**
 * Project list component
 * @component ProjectList
 * @usedInScreen DashboardScreen
 */
export function ProjectList() {}`;

    const result = checkComponentAnnotation(content, "components/project-list.tsx");

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  /**
   * @testdoc @componentがない場合はinfoを返す
   */
  it("should return info when @component annotation is missing", () => {
    const content = `/**
 * Project list component
 */
export function ProjectList() {}`;

    const result = checkComponentAnnotation(content, "components/project-list.tsx");

    // infos don't make valid=false, since infos are just informational
    expect(result.valid).toBe(true);
    expect(result.infos.length).toBeGreaterThan(0);
    expect(result.infos[0].type).toBe("info");
    expect(result.infos[0].message).toContain("@component");
  });

  /**
   * @testdoc ui/ディレクトリは除外する
   */
  it("should skip ui/ directory components", () => {
    const content = `export function Button() {}`;

    const result = checkComponentAnnotation(
      content,
      "components/ui/button.tsx",
      { exclude: ["**/components/ui/**"] }
    );

    expect(result.valid).toBe(true);
    expect(result.skipped).toBe(true);
  });

  /**
   * @testdoc providers/ディレクトリは除外する
   */
  it("should skip providers/ directory", () => {
    const content = `export function AuthProvider() {}`;

    const result = checkComponentAnnotation(
      content,
      "components/providers/auth-provider.tsx",
      { exclude: ["**/providers/**"] }
    );

    expect(result.valid).toBe(true);
    expect(result.skipped).toBe(true);
  });
});

/**
 * --fix オプション関連のテスト
 */
describe("fix functions", () => {
  // Import the fix functions (will be added to annotation-lint.ts)
  // These tests will fail initially until implementation is complete

  describe("fixUsedComponentsAnnotation", () => {
    /**
     * @testdoc @usedComponents がない場合にインポートから自動生成する
     */
    it("should add @usedComponents when missing", async () => {
      // Dynamic import to test the fix functions
      const { fixUsedComponentsAnnotation } = await import("../../src/lint/annotation-lint.js");

      const content = `import { Button, Card } from "@/components/ui/button";

export function MyComponent() {
  return <Button><Card /></Button>;
}`;

      const result = fixUsedComponentsAnnotation(content, "components/my-component.tsx");

      expect(result.changed).toBe(true);
      expect(result.content).toContain("@usedComponents Button, Card");
      expect(result.content).toContain("/**");
      expect(result.content).toContain("*/");
    });

    /**
     * @testdoc 既存の@usedComponentsを更新する
     */
    it("should update existing @usedComponents", async () => {
      const { fixUsedComponentsAnnotation } = await import("../../src/lint/annotation-lint.js");

      const content = `/**
 * My Component
 * @usedComponents Button
 */
import { Button, Card, Dialog } from "@/components/ui";

export function MyComponent() {}`;

      const result = fixUsedComponentsAnnotation(content, "components/my-component.tsx");

      expect(result.changed).toBe(true);
      expect(result.content).toContain("@usedComponents Button, Card, Dialog");
      expect(result.content).not.toContain("@usedComponents Button\n");
    });

    /**
     * @testdoc hooksをコンポーネントから除外する
     */
    it("should exclude hooks from components", async () => {
      const { fixUsedComponentsAnnotation } = await import("../../src/lint/annotation-lint.js");

      const content = `import { Button, useSidebar, Card, useForm } from "@/components/ui";

export function MyComponent() {}`;

      const result = fixUsedComponentsAnnotation(content, "components/my-component.tsx");

      expect(result.changed).toBe(true);
      // Check that the annotation only contains Button and Card (no hooks)
      expect(result.content).toContain("@usedComponents Button, Card");
      // The original import statement should still have the hooks
      // but they should NOT be in the @usedComponents annotation
      expect(result.content).toMatch(/@usedComponents Button, Card\n/);
    });

    /**
     * @testdoc インポートがない場合は変更しない
     */
    it("should not change when no component imports", async () => {
      const { fixUsedComponentsAnnotation } = await import("../../src/lint/annotation-lint.js");

      const content = `import { db } from "@/lib/db";

export function getData() {}`;

      const result = fixUsedComponentsAnnotation(content, "lib/actions/data.ts");

      expect(result.changed).toBe(false);
      expect(result.content).toBe(content);
    });

    /**
     * @testdoc 既存のJSDocに追加する
     */
    it("should add to existing JSDoc without @usedComponents", async () => {
      const { fixUsedComponentsAnnotation } = await import("../../src/lint/annotation-lint.js");

      const content = `/**
 * My Component
 * @component MyComponent
 */
import { Button } from "@/components/ui/button";

export function MyComponent() {}`;

      const result = fixUsedComponentsAnnotation(content, "components/my-component.tsx");

      expect(result.changed).toBe(true);
      expect(result.content).toContain("@component MyComponent");
      expect(result.content).toContain("@usedComponents Button");
    });
  });

  describe("fixScreenAnnotation", () => {
    /**
     * @testdoc ファイルパスから@screenを自動生成する
     */
    it("should add @screen from file path", async () => {
      const { fixScreenAnnotation } = await import("../../src/lint/annotation-lint.js");

      const content = `export default function DashboardPage() {
  return <div>Dashboard</div>;
}`;

      const result = fixScreenAnnotation(content, "app/[locale]/dashboard/page.tsx");

      expect(result.changed).toBe(true);
      expect(result.content).toContain("@screen DashboardScreen");
    });

    /**
     * @testdoc [locale]ディレクトリを処理する
     */
    it("should handle [locale] directory", async () => {
      const { fixScreenAnnotation } = await import("../../src/lint/annotation-lint.js");

      const content = `export default function PostsPage() {}`;

      const result = fixScreenAnnotation(content, "apps/web/app/[locale]/posts/[id]/page.tsx");

      expect(result.changed).toBe(true);
      // The screen name should be derived from the path
      expect(result.content).toContain("@screen");
      // Should contain a meaningful name like PostsIdScreen or PostsDetailScreen
      expect(result.content).toMatch(/@screen \w+Screen/);
    });

    /**
     * @testdoc 既存の@screenがある場合は変更しない
     */
    it("should not change when @screen already exists", async () => {
      const { fixScreenAnnotation } = await import("../../src/lint/annotation-lint.js");

      const content = `/**
 * @screen DashboardScreen
 */
export default function DashboardPage() {}`;

      const result = fixScreenAnnotation(content, "app/[locale]/dashboard/page.tsx");

      expect(result.changed).toBe(false);
      expect(result.content).toBe(content);
    });

    /**
     * @testdoc ネストしたルートを処理する
     */
    it("should handle nested routes", async () => {
      const { fixScreenAnnotation } = await import("../../src/lint/annotation-lint.js");

      const content = `export default function SettingsProfilePage() {}`;

      const result = fixScreenAnnotation(content, "app/[locale]/settings/profile/page.tsx");

      expect(result.changed).toBe(true);
      expect(result.content).toContain("@screen SettingsProfileScreen");
    });
  });

  describe("fixRouteAnnotation", () => {
    /**
     * @testdoc ファイルパスから@routeを自動生成する
     */
    it("should add @route from file path", async () => {
      const { fixRouteAnnotation } = await import("../../src/lint/annotation-lint.js");

      const content = `export default function PostsPage() {}`;

      const result = fixRouteAnnotation(content, "app/[locale]/posts/page.tsx");

      expect(result.changed).toBe(true);
      expect(result.content).toContain("@route /posts");
    });

    /**
     * @testdoc [locale]をルートから除外する
     */
    it("should remove [locale] from route", async () => {
      const { fixRouteAnnotation } = await import("../../src/lint/annotation-lint.js");

      const content = `export default function DashboardPage() {}`;

      const result = fixRouteAnnotation(content, "apps/web/app/[locale]/dashboard/page.tsx");

      expect(result.changed).toBe(true);
      expect(result.content).toContain("@route /dashboard");
      expect(result.content).not.toContain("[locale]");
    });

    /**
     * @testdoc 動的セグメントを保持する
     */
    it("should preserve dynamic segments other than locale", async () => {
      const { fixRouteAnnotation } = await import("../../src/lint/annotation-lint.js");

      const content = `export default function PostDetailPage() {}`;

      const result = fixRouteAnnotation(content, "app/[locale]/posts/[id]/page.tsx");

      expect(result.changed).toBe(true);
      expect(result.content).toContain("@route /posts/[id]");
    });

    /**
     * @testdoc 既存の@routeがある場合は変更しない
     */
    it("should not change when @route already exists", async () => {
      const { fixRouteAnnotation } = await import("../../src/lint/annotation-lint.js");

      const content = `/**
 * @route /posts
 */
export default function PostsPage() {}`;

      const result = fixRouteAnnotation(content, "app/[locale]/posts/page.tsx");

      expect(result.changed).toBe(false);
      expect(result.content).toBe(content);
    });

    /**
     * @testdoc ルートディレクトリのpage.tsxを処理する
     */
    it("should handle root page.tsx", async () => {
      const { fixRouteAnnotation } = await import("../../src/lint/annotation-lint.js");

      const content = `export default function HomePage() {}`;

      const result = fixRouteAnnotation(content, "app/[locale]/page.tsx");

      expect(result.changed).toBe(true);
      expect(result.content).toContain("@route /");
    });
  });

  describe("applyFixes", () => {
    /**
     * @testdoc 複数の修正を一度に適用する
     */
    it("should apply multiple fixes at once", async () => {
      const { applyFixes } = await import("../../src/lint/annotation-lint.js");

      const content = `import { Button, Card } from "@/components/ui";

export default function DashboardPage() {
  return <div><Button /><Card /></div>;
}`;

      const result = applyFixes(content, "app/[locale]/dashboard/page.tsx", {
        fixUsedComponents: true,
        fixScreen: true,
        fixRoute: true,
      });

      expect(result.changed).toBe(true);
      expect(result.content).toContain("@usedComponents Button, Card");
      expect(result.content).toContain("@screen DashboardScreen");
      expect(result.content).toContain("@route /dashboard");
      expect(result.changes).toContain("@usedComponents");
      expect(result.changes).toContain("@screen");
      expect(result.changes).toContain("@route");
    });

    /**
     * @testdoc 既存のアノテーションを保持する
     */
    it("should preserve existing annotations", async () => {
      const { applyFixes } = await import("../../src/lint/annotation-lint.js");

      const content = `/**
 * Dashboard page
 * @screen DashboardScreen
 */
import { Button } from "@/components/ui";

export default function DashboardPage() {}`;

      const result = applyFixes(content, "app/[locale]/dashboard/page.tsx", {
        fixUsedComponents: true,
        fixScreen: true,
        fixRoute: true,
      });

      expect(result.content).toContain("@screen DashboardScreen");
      expect(result.content).toContain("@usedComponents Button");
      expect(result.content).toContain("@route /dashboard");
    });
  });
});

describe("Integration: Full file validation", () => {
  const navTagsContent = `/**
 * Navigation tags component
 * @component NavTags
 * @usedComponents SidebarGroup, SidebarMenu, Badge
 */
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

export function NavTags() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>Tags</SidebarGroupLabel>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton>
            <Badge>Tag</Badge>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}`;

  /**
   * @testdoc 実際のファイルで@usedComponentsの不一致を検出する
   */
  it("should detect @usedComponents mismatch in real file content", () => {
    const annotated = extractUsedComponentsAnnotation(navTagsContent);
    const imported = extractComponentsFromImports(navTagsContent, { excludeHooks: true });
    const comparison = compareUsedComponents(annotated, imported);

    expect(annotated).toEqual(["SidebarGroup", "SidebarMenu", "Badge"]);
    expect(imported).toContain("SidebarGroupLabel");
    expect(imported).toContain("SidebarMenuButton");
    expect(imported).toContain("SidebarMenuItem");
    expect(comparison.missing).toContain("SidebarGroupLabel");
    expect(comparison.missing).toContain("SidebarMenuButton");
    expect(comparison.missing).toContain("SidebarMenuItem");
    expect(comparison.valid).toBe(false);
  });

  const pageWithScreenContent = `/**
 * Dashboard page
 * @screen DashboardScreen
 * @route /dashboard
 * @usedComponents ProjectList, ActivityFeed
 */
import { ProjectList } from "@/components/project-list";
import { ActivityFeed } from "@/components/activity-feed";

export default function DashboardPage() {
  return (
    <div>
      <ProjectList />
      <ActivityFeed />
    </div>
  );
}`;

  /**
   * @testdoc @screenと@usedComponentsが正しく設定されたページファイルを検証する
   */
  it("should validate page file with correct @screen and @usedComponents", () => {
    const screenResult = checkScreenAnnotation(
      pageWithScreenContent,
      "apps/web/app/[locale]/dashboard/page.tsx"
    );
    const annotated = extractUsedComponentsAnnotation(pageWithScreenContent);
    const imported = extractComponentsFromImports(pageWithScreenContent);
    const comparison = compareUsedComponents(annotated, imported);

    expect(screenResult.valid).toBe(true);
    expect(comparison.valid).toBe(true);
  });
});
