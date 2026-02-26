/**
 * Annotation Required Rule Tests
 *
 * Tests for the rule that checks required annotations in specific files.
 *
 * @testdoc 特定ファイルパターンに必須アノテーションを要求する
 */

import { annotationRequiredRule } from "../../../src/lint/rules/annotation-required.js";
import type { CodeIssue } from "../../../src/lint/code-types.js";

describe("annotationRequiredRule", () => {
  /**
   * @testdoc [annotation-required] ルールメタデータが正しく定義されている
   */
  it("should have correct metadata", () => {
    expect(annotationRequiredRule.id).toBe("annotation-required");
    expect(annotationRequiredRule.severity).toBe("warning");
    expect(annotationRequiredRule.description).toBeDefined();
  });

  describe("check for page.tsx files", () => {
    /**
     * @testdoc @screen がある page.tsx は issue を返さない
     * @purpose 画面ファイルに @screen アノテーションが必須
     */
    it("should not return issue for page.tsx with @screen", () => {
      const content = `
/**
 * ダッシュボード画面
 * @screen DashboardScreen
 * @route /dashboard
 */
export default function DashboardPage() {
  return <div>Dashboard</div>;
}
`;
      const issues = annotationRequiredRule.check(
        content,
        "apps/web/app/[locale]/dashboard/page.tsx"
      );
      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc @screen がない page.tsx は warning を返す
     * @purpose 画面ファイルには @screen が推奨
     */
    it("should return warning for page.tsx without @screen", () => {
      const content = `
export default function DashboardPage() {
  return <div>Dashboard</div>;
}
`;
      const issues = annotationRequiredRule.check(
        content,
        "apps/web/app/[locale]/dashboard/page.tsx"
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].rule).toBe("annotation-required");
      expect(issues[0].type).toBe("warning");
      expect(issues[0].message).toContain("@screen");
    });

    /**
     * @testdoc JSDoc があっても @screen がない場合は warning を返す
     * @purpose 他のアノテーションだけでは不十分
     */
    it("should return warning for page.tsx with JSDoc but no @screen", () => {
      const content = `
/**
 * ダッシュボード画面
 * @route /dashboard
 */
export default function DashboardPage() {
  return <div>Dashboard</div>;
}
`;
      const issues = annotationRequiredRule.check(
        content,
        "apps/web/app/[locale]/dashboard/page.tsx"
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].message).toContain("@screen");
    });
  });

  describe("check for 'use server' files", () => {
    /**
     * @testdoc @serverAction がある Server Action ファイルは issue を返さない
     * @purpose Server Action ファイルに @serverAction アノテーションが必須
     */
    it("should not return issue for server action file with @serverAction", () => {
      const content = `
"use server";

/**
 * ユーザー関連 Server Actions
 * @serverAction
 * @feature UserManagement
 * @dbTables users, sessions
 */

export async function getUser(id: string) {
  // implementation
}
`;
      const issues = annotationRequiredRule.check(
        content,
        "apps/web/lib/actions/users.ts"
      );
      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc @serverAction がない Server Action ファイルは warning を返す
     * @purpose Server Action ファイルには @serverAction が推奨
     */
    it("should return warning for server action file without @serverAction", () => {
      const content = `
"use server";

export async function getUser(id: string) {
  // implementation
}
`;
      const issues = annotationRequiredRule.check(
        content,
        "apps/web/lib/actions/users.ts"
      );
      expect(issues).toHaveLength(1);
      expect(issues[0].rule).toBe("annotation-required");
      expect(issues[0].type).toBe("warning");
      expect(issues[0].message).toContain("@serverAction");
    });

    /**
     * @testdoc 関数レベルの @serverAction は OK
     * @purpose モジュールヘッダーまたは関数に @serverAction があればよい
     */
    it("should accept function-level @serverAction annotation", () => {
      const content = `
"use server";

/**
 * ユーザーを取得
 * @serverAction
 */
export async function getUser(id: string) {
  // implementation
}
`;
      const issues = annotationRequiredRule.check(
        content,
        "apps/web/lib/actions/users.ts"
      );
      expect(issues).toHaveLength(0);
    });
  });

  describe("check for component files", () => {
    /**
     * @testdoc @component がある component ファイルは issue を返さない
     * @purpose コンポーネントファイルに @component アノテーションが推奨
     */
    it("should not return issue for component file with @component", () => {
      const content = `
/**
 * プロジェクトリスト
 * @component ProjectList
 * @usedInScreen DashboardScreen
 */
export function ProjectList() {
  return <ul></ul>;
}
`;
      const issues = annotationRequiredRule.check(
        content,
        "apps/web/components/project-list.tsx"
      );
      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc components/ui ディレクトリはスキップ
     * @purpose shadcn/ui コンポーネントは対象外
     */
    it("should skip components/ui directory", () => {
      const content = `
export function Button() {
  return <button>Click</button>;
}
`;
      const issues = annotationRequiredRule.check(
        content,
        "apps/web/components/ui/button.tsx"
      );
      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc @component がないコンポーネントファイルは info を返す
     * @purpose コンポーネントへの @component は info レベル
     */
    it("should return info for component file without @component", () => {
      const content = `
export function ProjectList() {
  return <ul></ul>;
}
`;
      const issues = annotationRequiredRule.check(
        content,
        "apps/web/components/project-list.tsx"
      );
      // Components get info level, not warning
      expect(issues).toHaveLength(1);
      expect(issues[0].type).toBe("info");
      expect(issues[0].message).toContain("@component");
    });
  });

  describe("non-target files", () => {
    /**
     * @testdoc 対象外のファイルはチェックしない
     * @purpose lib/utils や hooks などは対象外
     */
    it("should not check non-target files", () => {
      const content = `
export function formatDate(date: Date) {
  return date.toISOString();
}
`;
      const issues = annotationRequiredRule.check(
        content,
        "apps/web/lib/utils.ts"
      );
      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc layout.tsx はチェックしない
     * @purpose layout ファイルは page.tsx とは別扱い
     */
    it("should not check layout.tsx files", () => {
      const content = `
export default function RootLayout({ children }) {
  return <html><body>{children}</body></html>;
}
`;
      const issues = annotationRequiredRule.check(
        content,
        "apps/web/app/[locale]/layout.tsx"
      );
      expect(issues).toHaveLength(0);
    });

    /**
     * @testdoc テストファイルはチェックしない
     * @purpose __tests__ や .test.ts は対象外
     */
    it("should not check test files", () => {
      const content = `
describe("test", () => {
  it("should work", () => {});
});
`;
      const issues = annotationRequiredRule.check(
        content,
        "apps/web/__tests__/lib/utils.test.ts"
      );
      expect(issues).toHaveLength(0);
    });
  });
});
