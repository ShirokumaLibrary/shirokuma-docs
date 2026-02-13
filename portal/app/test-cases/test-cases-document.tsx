/**
 * Test Cases - ドキュメント形式表示
 *
 * テスト統計をテーブル・アコーディオン形式で表示
 */

import Link from "next/link";
import {
  FlaskConical,
  AppWindow,
  ArrowRight,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DocSection, DocTable, type DocTableColumn } from "@/components/document";
import type { TestCasesData, ApplicationsData } from "@/lib/types";

// Test category labels
const testCategoryLabels: Record<string, { ja: string; color: string }> = {
  "happy-path": { ja: "正常系", color: "bg-green-500" },
  auth: { ja: "認証", color: "bg-blue-500" },
  "error-handling": { ja: "異常系", color: "bg-red-500" },
  validation: { ja: "バリデーション", color: "bg-yellow-500" },
  "edge-case": { ja: "境界値", color: "bg-purple-500" },
  integration: { ja: "統合", color: "bg-cyan-500" },
  other: { ja: "その他", color: "bg-gray-500" },
  success: { ja: "正常系", color: "bg-green-500" },
  error: { ja: "異常系", color: "bg-red-500" },
  edge: { ja: "境界値", color: "bg-purple-500" },
  unknown: { ja: "その他", color: "bg-gray-500" },
};

interface AppStatItem {
  id: string;
  name: string;
  description?: string;
  total: number;
  jest: number;
  e2e: number;
  percentage: number;
}

interface CategoryItem {
  category: string;
  label: string;
  count: number;
  percentage: number;
  colorClass: string;
}

interface TestCasesDocumentProps {
  data: TestCasesData;
  applications: ApplicationsData | null;
  coverageStats: {
    totalItems: number;
    testedItems: number;
    coveragePercent: number;
  };
  coverageGapsCount: number;
  qualityAnalysis: {
    status: "good" | "warning" | "poor";
    message: string;
  };
}

export function TestCasesDocument({
  data,
  applications,
  coverageStats,
  coverageGapsCount,
  qualityAnalysis,
}: TestCasesDocumentProps) {
  // Calculate category breakdown
  const categoryBreakdown: Record<string, number> = {};
  for (const tc of data.testCases) {
    const cat = tc.category || "unknown";
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
  }

  // Calculate per-app stats
  const appStats: AppStatItem[] =
    applications?.apps?.map((app) => {
      const appPrefixes = [app.source || `apps/${app.id}`, `tests/e2e/${app.id}`];
      const appTests = data.testCases.filter((tc) =>
        appPrefixes.some((prefix) => tc.file.startsWith(prefix))
      );
      const jestTests = appTests.filter((tc) => tc.framework === "jest").length;
      const e2eTests = appTests.filter((tc) => tc.framework === "playwright").length;

      return {
        id: app.id,
        name: app.name,
        description: app.description,
        total: appTests.length,
        jest: jestTests,
        e2e: e2eTests,
        percentage:
          data.summary.totalTests > 0
            ? Math.round((appTests.length / data.summary.totalTests) * 100)
            : 0,
      };
    }) || [];

  // Top categories for chart
  const topCategories: CategoryItem[] = Object.entries(categoryBreakdown)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => {
      const config = testCategoryLabels[category] || testCategoryLabels.unknown;
      return {
        category,
        label: config.ja,
        count,
        percentage: Math.round((count / data.summary.totalTests) * 100),
        colorClass: config.color,
      };
    });

  // Summary table columns
  const summaryData = [
    { metric: "総テスト数", value: data.summary.totalTests, unit: "tests" },
    { metric: "Jest (Unit)", value: data.summary.jestTests, unit: "tests" },
    { metric: "Playwright (E2E)", value: data.summary.playwrightTests, unit: "tests" },
    { metric: "テストファイル数", value: data.summary.fileStats?.length || 0, unit: "files" },
    { metric: "カバレッジ率", value: coverageStats.coveragePercent, unit: "%" },
    { metric: "テストなし", value: coverageGapsCount, unit: "items" },
  ];

  const summaryColumns: DocTableColumn<(typeof summaryData)[0]>[] = [
    { key: "metric", header: "項目", width: "200px" },
    {
      key: "value",
      header: "値",
      width: "100px",
      align: "right",
      render: (_, row) => (
        <span
          className={`text-lg font-bold ${
            row.metric === "テストなし" && row.value > 0 ? "text-red-500" : ""
          }`}
        >
          {row.value}
        </span>
      ),
    },
    { key: "unit", header: "単位", width: "80px" },
  ];

  // App stats columns
  const appColumns: DocTableColumn<AppStatItem>[] = [
    {
      key: "name",
      header: "アプリ",
      width: "200px",
      render: (_, row) => (
        <Link
          href={`/apps/${row.id}/test-cases`}
          className="font-medium text-primary hover:underline flex items-center gap-1"
        >
          {row.name}
          <ArrowRight className="h-3 w-3" />
        </Link>
      ),
    },
    {
      key: "total",
      header: "Total",
      width: "80px",
      align: "right",
      render: (_, row) => <Badge variant="secondary">{row.total}</Badge>,
    },
    {
      key: "jest",
      header: "Jest",
      width: "80px",
      align: "right",
    },
    {
      key: "e2e",
      header: "E2E",
      width: "80px",
      align: "right",
    },
    {
      key: "percentage",
      header: "割合",
      width: "100px",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Progress value={row.percentage} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground">{row.percentage}%</span>
        </div>
      ),
    },
  ];

  // Category columns
  const categoryColumns: DocTableColumn<CategoryItem>[] = [
    {
      key: "label",
      header: "カテゴリ",
      width: "150px",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${row.colorClass}`} />
          <span>{row.label}</span>
        </div>
      ),
    },
    {
      key: "count",
      header: "数",
      width: "80px",
      align: "right",
      render: (_, row) => <span className="font-mono">{row.count}</span>,
    },
    {
      key: "percentage",
      header: "割合",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Progress value={row.percentage} className="h-2 flex-1" />
          <span className="text-sm text-muted-foreground w-12 text-right">
            {row.percentage}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Generated timestamp */}
      {data.generatedAt && (
        <div className="text-sm text-muted-foreground text-right">
          Generated: {new Date(data.generatedAt).toLocaleString("ja-JP")}
        </div>
      )}

      {/* Summary Section */}
      <DocSection
        title="サマリー"
        variant="info"
        icon={<FlaskConical className="h-4 w-4" />}
        preview={`${data.summary.totalTests} tests, ${coverageStats.coveragePercent}% coverage`}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <DocTable columns={summaryColumns} data={summaryData} />
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>テストカバレッジ</span>
                <span className="font-medium">{coverageStats.coveragePercent}%</span>
              </div>
              <Progress value={coverageStats.coveragePercent} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {coverageStats.testedItems} / {coverageStats.totalItems} items tested
              </p>
            </div>

            <div className="p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">品質スコア:</span>
                {qualityAnalysis.status === "good" ? (
                  <span className="flex items-center gap-1 text-green-500">
                    <CheckCircle2 className="h-4 w-4" />
                    {qualityAnalysis.message}
                  </span>
                ) : qualityAnalysis.status === "warning" ? (
                  <span className="flex items-center gap-1 text-yellow-500">
                    <AlertTriangle className="h-4 w-4" />
                    {qualityAnalysis.message}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-500">
                    <XCircle className="h-4 w-4" />
                    {qualityAnalysis.message}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </DocSection>

      {/* App Stats */}
      {appStats.length > 0 && (
        <DocSection
          title="アプリ別テスト"
          badge={<Badge variant="outline">{appStats.length} apps</Badge>}
          preview={appStats.slice(0, 2).map(a => a.name).join(", ")}
        >
          <DocTable columns={appColumns} data={appStats} />
        </DocSection>
      )}

      {/* Category Distribution */}
      <DocSection
        title="テストカテゴリ分布"
        badge={
          <Badge variant="outline">{Object.keys(categoryBreakdown).length} categories</Badge>
        }
        preview={topCategories.slice(0, 2).map(c => `${c.label}:${c.count}`).join(", ")}
      >
        <DocTable columns={categoryColumns} data={topCategories} />
      </DocSection>

      {/* Framework Distribution */}
      <DocSection title="フレームワーク分布">
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span>Jest (Unit)</span>
              </div>
              <span className="text-muted-foreground">
                {data.summary.jestTests} (
                {Math.round((data.summary.jestTests / data.summary.totalTests) * 100)}%)
              </span>
            </div>
            <Progress
              value={(data.summary.jestTests / data.summary.totalTests) * 100}
              className="h-2"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-purple-500" />
                <span>Playwright (E2E)</span>
              </div>
              <span className="text-muted-foreground">
                {data.summary.playwrightTests} (
                {Math.round((data.summary.playwrightTests / data.summary.totalTests) * 100)}%)
              </span>
            </div>
            <Progress
              value={(data.summary.playwrightTests / data.summary.totalTests) * 100}
              className="h-2"
            />
          </div>
        </div>
      </DocSection>

      {/* Coverage Gaps Alert */}
      {coverageGapsCount > 0 && (
        <DocSection
          title="カバレッジギャップ"
          badge={<Badge variant="destructive">{coverageGapsCount} items</Badge>}
        >
          <p className="text-sm text-muted-foreground">
            テストが存在しない機能が {coverageGapsCount} 件あります。
            詳細はアプリ別ダッシュボードの「ギャップ」タブで確認できます。
          </p>
        </DocSection>
      )}

      {/* Quick Links */}
      <DocSection title="関連ページ">
        <div className="flex flex-wrap gap-4">
          {appStats.map((app) => (
            <Link
              key={app.id}
              href={`/apps/${app.id}/test-cases`}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <FlaskConical className="h-4 w-4" />
              {app.name} ({app.total} tests)
              <ArrowRight className="h-3 w-3" />
            </Link>
          ))}
        </div>
      </DocSection>
    </div>
  );
}
