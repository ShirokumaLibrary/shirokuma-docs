import Link from "next/link";
import {
  FlaskConical,
  AppWindow,
  ArrowRight,
  TestTube2,
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import {
  loadTestCases,
  loadFeatureMap,
  loadDetails,
  loadApplications,
  loadCoverage,
  type CoverageData,
} from "@/lib/data-loader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { getPortalFormat } from "@/lib/format";
import { TestCasesDocument } from "./test-cases-document";
import type { DetailsData, FeatureMapData, TestCase } from "@/lib/types";

export const dynamicParams = false;

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

/**
 * Get category breakdown from test cases
 */
function getCategoryBreakdown(testCases: TestCase[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const tc of testCases) {
    const cat = tc.category || "unknown";
    breakdown[cat] = (breakdown[cat] || 0) + 1;
  }
  return breakdown;
}

/**
 * Get coverage gaps count
 */
function getCoverageGapsCount(
  featureMap: FeatureMapData | null,
  details: DetailsData | null
): number {
  if (!featureMap || !details) return 0;

  let gapsCount = 0;

  for (const [moduleName, group] of Object.entries(featureMap.features)) {
    const itemTypes = [
      { type: "screens", items: group.screens || [] },
      { type: "components", items: group.components || [] },
      { type: "actions", items: group.actions || [] },
      { type: "tables", items: group.tables || [] },
    ];

    for (const { type, items } of itemTypes) {
      for (const item of items) {
        const possibleKeys = [`${type}/${moduleName}/${item.name}`];
        if ("path" in item && item.path) {
          const fileName = item.path.split("/").pop()?.replace(/\.(ts|tsx)$/, "");
          if (fileName) {
            possibleKeys.unshift(`${type}/${fileName}/${item.name}`);
          }
        }

        let hasTest = false;
        for (const key of possibleKeys) {
          const detail = details.details[key];
          if (detail?.testCoverage?.hasTest) {
            hasTest = true;
            break;
          }
        }

        if (!hasTest) {
          gapsCount++;
        }
      }
    }
  }

  return gapsCount;
}

/**
 * Get overall stats (fallback when coverage.json not available)
 */
function getOverallStats(
  featureMap: FeatureMapData | null,
  details: DetailsData | null
): { totalItems: number; testedItems: number; coveragePercent: number } {
  if (!featureMap || !details) return { totalItems: 0, testedItems: 0, coveragePercent: 0 };

  let totalItems = 0;
  let testedItems = 0;

  for (const group of Object.values(featureMap.features)) {
    const items = [
      ...(group.screens || []),
      ...(group.components || []),
      ...(group.actions || []),
      ...(group.tables || []),
    ];
    totalItems += items.length;
  }

  for (const item of Object.values(details.details)) {
    if (item.testCoverage?.hasTest) {
      testedItems++;
    }
  }

  return {
    totalItems,
    testedItems,
    coveragePercent: totalItems > 0 ? Math.round((testedItems / totalItems) * 100) : 0,
  };
}

/**
 * Calculate coverage by mapping coverage.json to feature-map items
 * Feature-map items are considered "covered" if their source path is covered in coverage.json
 */
function calculateFeatureMapCoverage(
  coverage: CoverageData | null,
  featureMap: FeatureMapData | null
): { totalItems: number; testedItems: number; coveragePercent: number; missingCount: number } | null {
  if (!coverage || !featureMap) return null;

  // Build a set of covered source paths
  const coveredSources = new Set<string>();
  for (const result of coverage.results) {
    if (result.status === "covered" || result.status === "skipped") {
      coveredSources.add(result.source);
    }
  }

  let totalItems = 0;
  let testedItems = 0;

  // Check each feature-map item against covered sources
  for (const group of Object.values(featureMap.features)) {
    const items = [
      ...(group.screens || []),
      ...(group.components || []),
      ...(group.actions || []),
    ];

    for (const item of items) {
      totalItems++;
      // Check if item's path matches any covered source
      if ("path" in item && item.path) {
        if (coveredSources.has(item.path)) {
          testedItems++;
        }
      }
    }
  }

  if (totalItems === 0) return null;

  const missingCount = totalItems - testedItems;
  const coveragePercent = Math.round((testedItems / totalItems) * 100);

  return { totalItems, testedItems, coveragePercent, missingCount };
}

/**
 * Analyze test quality balance
 */
function analyzeTestQuality(categoryBreakdown: Record<string, number>): {
  status: "good" | "warning" | "poor";
  message: string;
} {
  const total = Object.values(categoryBreakdown).reduce((a, b) => a + b, 0);
  if (total === 0) return { status: "poor", message: "テストなし" };

  const successRatio = (categoryBreakdown["happy-path"] || 0) / total;
  const errorRatio = (categoryBreakdown["error-handling"] || 0) / total;

  if (successRatio > 0.7) {
    return { status: "warning", message: "正常系に偏り" };
  }
  if (errorRatio < 0.1 && total > 10) {
    return { status: "warning", message: "異常系が少ない" };
  }

  return { status: "good", message: "バランス良好" };
}

export default async function TestCasesPage() {
  const [data, featureMap, details, applications, coverage] = await Promise.all([
    loadTestCases(),
    loadFeatureMap(),
    loadDetails(),
    loadApplications(),
    loadCoverage(),
  ]);
  const format = getPortalFormat();

  if (!data) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Test Quality Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            No test cases data available. Run{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
              shirokuma-docs test-cases
            </code>{" "}
            to generate.
          </p>
        </header>
      </div>
    );
  }

  const categoryBreakdown = getCategoryBreakdown(data.testCases);

  // Calculate coverage by mapping coverage.json to feature-map items
  const featureMapCoverage = calculateFeatureMapCoverage(coverage, featureMap);
  const coverageStats = featureMapCoverage || getOverallStats(featureMap, details);

  const coverageGapsCount = featureMapCoverage
    ? featureMapCoverage.missingCount
    : getCoverageGapsCount(featureMap, details);
  const overallStats = coverageStats;
  const qualityAnalysis = analyzeTestQuality(categoryBreakdown);

  // Document format
  if (format === "document") {
    return (
      <div className="space-y-8">
        <header>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-green/10 p-2">
              <FlaskConical className="h-6 w-6 text-accent-green" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Test Quality Dashboard</h1>
              <p className="mt-1 text-muted-foreground">
                テストカバレッジと品質メトリクスの全体統計
              </p>
            </div>
          </div>
        </header>
        <TestCasesDocument
          data={data}
          applications={applications}
          coverageStats={overallStats}
          coverageGapsCount={coverageGapsCount}
          qualityAnalysis={qualityAnalysis}
        />
      </div>
    );
  }

  // Calculate per-app stats (for card format)
  const appStats = applications?.apps?.map((app) => {
    const appPrefixes = [app.source || `apps/${app.id}`, `tests/e2e/${app.id}`];
    const appTests = data.testCases.filter((tc) =>
      appPrefixes.some((prefix) => tc.file.startsWith(prefix))
    );
    const jestTests = appTests.filter((tc) => tc.framework === "jest").length;
    const e2eTests = appTests.filter((tc) => tc.framework === "playwright").length;

    return {
      app,
      total: appTests.length,
      jest: jestTests,
      e2e: e2eTests,
    };
  }) || [];

  // Get top categories for chart
  const topCategories = Object.entries(categoryBreakdown)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-accent-green/10 p-2">
            <FlaskConical className="h-6 w-6 text-accent-green" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Test Quality Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              テストカバレッジと品質メトリクスの全体統計
            </p>
            {data.generatedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Generated: {new Date(data.generatedAt).toLocaleString("ja-JP")}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>総テスト数</CardDescription>
            <CardTitle className="text-3xl">{data.summary.totalTests}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span>Jest: {data.summary.jestTests}</span>
              <span>|</span>
              <span>Playwright: {data.summary.playwrightTests}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>カバレッジ率</CardDescription>
            <CardTitle className="text-3xl">{overallStats.coveragePercent}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={overallStats.coveragePercent} className="h-2" />
            <p className="mt-1 text-xs text-muted-foreground">
              {overallStats.testedItems} / {overallStats.totalItems} items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>テストなし</CardDescription>
            <CardTitle className="text-3xl text-red-500">{coverageGapsCount}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              カバレッジギャップ
            </p>
          </CardContent>
        </Card>

        <Card className={qualityAnalysis.status === "good" ? "border-green-500/50" : qualityAnalysis.status === "warning" ? "border-yellow-500/50" : "border-red-500/50"}>
          <CardHeader className="pb-2">
            <CardDescription>品質スコア</CardDescription>
            <CardTitle className="flex items-center gap-2">
              {qualityAnalysis.status === "good" ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : qualityAnalysis.status === "warning" ? (
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
              <span className="text-lg">{qualityAnalysis.message}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              テストカテゴリバランス
            </p>
          </CardContent>
        </Card>
      </div>

      {/* App-specific Views - Main navigation */}
      {applications && applications.apps.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AppWindow className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">アプリ別テストダッシュボード</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {appStats.map(({ app, total, jest, e2e }) => (
              <Link
                key={app.id}
                href={`/apps/${app.id}/test-cases`}
                className="group rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2.5">
                      <TestTube2 className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-primary">{app.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {app.description || "テストダッシュボードを表示"}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FlaskConical className="h-4 w-4 text-accent-green" />
                    {total} tests
                  </span>
                  {jest > 0 && (
                    <span className="text-xs">Jest: {jest}</span>
                  )}
                  {e2e > 0 && (
                    <span className="text-xs">E2E: {e2e}</span>
                  )}
                </div>
                {total > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Badge variant="secondary" className="text-xs">
                      {Math.round((total / data.summary.totalTests) * 100)}% of total
                    </Badge>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Two Column Layout for Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Test Category Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>テストカテゴリ分布</CardTitle>
            </div>
            <CardDescription>
              テストの種類別内訳
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {topCategories.map(([category, count]) => {
              const config = testCategoryLabels[category] || testCategoryLabels.unknown;
              const percentage = Math.round((count / data.summary.totalTests) * 100);
              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${config.color}`} />
                      <span>{config.ja}</span>
                    </div>
                    <span className="text-muted-foreground">{count} ({percentage}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Framework Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <CardTitle>フレームワーク分布</CardTitle>
            </div>
            <CardDescription>
              Jest / Playwright の構成比率
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span>Jest (Unit)</span>
                </div>
                <span className="text-muted-foreground">
                  {data.summary.jestTests} ({Math.round((data.summary.jestTests / data.summary.totalTests) * 100)}%)
                </span>
              </div>
              <Progress value={(data.summary.jestTests / data.summary.totalTests) * 100} className="h-2" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-purple-500" />
                  <span>Playwright (E2E)</span>
                </div>
                <span className="text-muted-foreground">
                  {data.summary.playwrightTests} ({Math.round((data.summary.playwrightTests / data.summary.totalTests) * 100)}%)
                </span>
              </div>
              <Progress value={(data.summary.playwrightTests / data.summary.totalTests) * 100} className="h-2" />
            </div>

            {/* File count summary */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">テストファイル数</span>
                <Badge variant="secondary">{data.summary.fileStats?.length || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage Gaps Alert */}
      {coverageGapsCount > 0 && (
        <Card className="border-red-500/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle>カバレッジギャップ</CardTitle>
            </div>
            <CardDescription>
              テストが存在しない機能が {coverageGapsCount} 件あります
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              詳細はアプリ別ダッシュボードの「ギャップ」タブで確認できます。
            </p>
          </CardContent>
        </Card>
      )}

      {/* Footer */}
      <footer className="text-center text-sm text-muted-foreground">
        <p>詳細なテスト一覧・ギャップ分析はアプリ別ビューで確認できます</p>
      </footer>
    </div>
  );
}
