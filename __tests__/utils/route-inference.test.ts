/**
 * Route Inference Utility Tests
 *
 * Tests for inferring URL routes from Next.js App Router file paths
 * and applying route parameter substitution.
 *
 * @testdoc ファイルパスからURLルートを推論する
 */

import {
  inferRouteFromPath,
  applyRouteParams,
  normalizeRoute,
} from "../../src/utils/route-inference.js";

describe("inferRouteFromPath", () => {
  /**
   * @testdoc 基本的なページパスからルートを推論できる
   * @purpose App Routerのpage.tsxファイルパスからルートを抽出
   */
  it("should infer route from basic page path", () => {
    const result = inferRouteFromPath("apps/web/app/page.tsx");
    expect(result).toBe("/");
  });

  /**
   * @testdoc localeパラメータを含むパスを処理できる
   * @purpose [locale]動的セグメントの処理
   */
  it("should handle locale parameter in path", () => {
    const result = inferRouteFromPath("apps/web/app/[locale]/page.tsx");
    expect(result).toBe("/[locale]");
  });

  /**
   * @testdoc 複数の動的セグメントを持つパスを処理できる
   * @purpose [locale]/[orgSlug]のような複合パスの処理
   */
  it("should handle multiple dynamic segments", () => {
    const result = inferRouteFromPath(
      "apps/web/app/[locale]/[orgSlug]/page.tsx"
    );
    expect(result).toBe("/[locale]/[orgSlug]");
  });

  /**
   * @testdoc ネストしたルートを処理できる
   * @purpose 深いネスト構造のルート抽出
   */
  it("should handle nested routes", () => {
    const result = inferRouteFromPath(
      "apps/web/app/[locale]/[orgSlug]/[projectSlug]/sessions/page.tsx"
    );
    expect(result).toBe("/[locale]/[orgSlug]/[projectSlug]/sessions");
  });

  /**
   * @testdoc レイアウトグループを除外できる
   * @purpose (dashboard)のようなルートグループはURLに含まない
   */
  it("should exclude layout groups from route", () => {
    const result = inferRouteFromPath(
      "apps/web/app/[locale]/(dashboard)/[orgSlug]/page.tsx"
    );
    expect(result).toBe("/[locale]/[orgSlug]");
  });

  /**
   * @testdoc 複数のレイアウトグループを除外できる
   * @purpose 複数の(group)セグメントを正しく処理
   */
  it("should exclude multiple layout groups", () => {
    const result = inferRouteFromPath(
      "apps/web/app/[locale]/(dashboard)/(admin)/settings/page.tsx"
    );
    expect(result).toBe("/[locale]/settings");
  });

  /**
   * @testdoc admin appパスを処理できる
   * @purpose apps/admin/app/... 形式のパス処理
   */
  it("should handle admin app path", () => {
    const result = inferRouteFromPath(
      "apps/admin/app/[locale]/users/page.tsx"
    );
    expect(result).toBe("/[locale]/users");
  });

  /**
   * @testdoc page以外のファイルはnullを返す
   * @purpose layout.tsx, loading.tsx等は対象外
   */
  it("should return null for non-page files", () => {
    const layoutResult = inferRouteFromPath(
      "apps/web/app/[locale]/layout.tsx"
    );
    expect(layoutResult).toBeNull();

    const loadingResult = inferRouteFromPath(
      "apps/web/app/[locale]/loading.tsx"
    );
    expect(loadingResult).toBeNull();
  });

  /**
   * @testdoc app外のファイルはnullを返す
   * @purpose componentsディレクトリ等は対象外
   */
  it("should return null for files outside app directory", () => {
    const result = inferRouteFromPath(
      "apps/web/components/my-component.tsx"
    );
    expect(result).toBeNull();
  });
});

describe("applyRouteParams", () => {
  const routeParams = {
    "[locale]": "ja",
    "[orgSlug]": "demo-org",
    "[projectSlug]": "demo-project",
    "[sessionId]": "session-123",
  };

  /**
   * @testdoc 単一のパラメータを置換できる
   * @purpose 基本的なパラメータ置換
   */
  it("should replace single parameter", () => {
    const result = applyRouteParams("/[locale]", routeParams);
    expect(result).toBe("/ja");
  });

  /**
   * @testdoc 複数のパラメータを置換できる
   * @purpose 複合パスのパラメータ置換
   */
  it("should replace multiple parameters", () => {
    const result = applyRouteParams(
      "/[locale]/[orgSlug]/[projectSlug]",
      routeParams
    );
    expect(result).toBe("/ja/demo-org/demo-project");
  });

  /**
   * @testdoc 未定義のパラメータはそのまま残す
   * @purpose 設定にないパラメータの処理
   */
  it("should keep undefined parameters", () => {
    const result = applyRouteParams(
      "/[locale]/[unknownParam]",
      routeParams
    );
    expect(result).toBe("/ja/[unknownParam]");
  });

  /**
   * @testdoc 静的セグメントは変更しない
   * @purpose パラメータでない部分の保持
   */
  it("should not change static segments", () => {
    const result = applyRouteParams(
      "/[locale]/settings/profile",
      routeParams
    );
    expect(result).toBe("/ja/settings/profile");
  });

  /**
   * @testdoc 空のルートを処理できる
   * @purpose ルートパス(/)の処理
   */
  it("should handle root route", () => {
    const result = applyRouteParams("/", routeParams);
    expect(result).toBe("/");
  });
});

describe("normalizeRoute", () => {
  /**
   * @testdoc 末尾スラッシュを削除できる
   * @purpose ルートの正規化
   */
  it("should remove trailing slash", () => {
    const result = normalizeRoute("/ja/dashboard/");
    expect(result).toBe("/ja/dashboard");
  });

  /**
   * @testdoc ルートパスの末尾スラッシュは保持する
   * @purpose "/" は "/" のまま
   */
  it("should keep root path as is", () => {
    const result = normalizeRoute("/");
    expect(result).toBe("/");
  });

  /**
   * @testdoc 連続スラッシュを単一に正規化する
   * @purpose "/ja//dashboard" -> "/ja/dashboard"
   */
  it("should normalize multiple slashes", () => {
    const result = normalizeRoute("/ja//dashboard");
    expect(result).toBe("/ja/dashboard");
  });

  /**
   * @testdoc 先頭にスラッシュを追加する
   * @purpose "ja/dashboard" -> "/ja/dashboard"
   */
  it("should add leading slash if missing", () => {
    const result = normalizeRoute("ja/dashboard");
    expect(result).toBe("/ja/dashboard");
  });
});
