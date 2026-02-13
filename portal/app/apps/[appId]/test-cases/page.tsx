import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  BarChart3,
  Monitor,
  Zap,
  Component,
  Database,
  FileCode2,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import {
  loadTestCases,
  loadApplications,
  loadFeatureMap,
  loadDetails,
  loadCoverage,
  type CoverageData,
} from "@/lib/data-loader";
import { encodeFilePath } from "@/lib/path-utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TabsWithHash,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/tabs-with-hash";
import type { TestCase, FeatureMapData, DetailsData } from "@/lib/types";

export const dynamic = "force-static";

interface PageProps {
  params: Promise<{ appId: string }>;
}

/**
 * Generate static params for all available apps
 */
export async function generateStaticParams() {
  const applications = await loadApplications();
  if (!applications?.apps) return [];

  return applications.apps.map((app) => ({
    appId: app.id,
  }));
}

/**
 * Get the source path prefixes for an app
 */
function getAppSourcePrefixes(appId: string, source?: string): string[] {
  const defaults: Record<string, string[]> = {
    admin: ["apps/admin", "tests/e2e/admin"],
    public: ["apps/public", "tests/e2e/public"],
    web: ["apps/web", "tests/e2e/web"],
    mcp: ["apps/mcp", "tests/e2e/mcp"],
  };

  if (source) {
    return [source, `tests/e2e/${appId}`];
  }

  return defaults[appId] || [`apps/${appId}`, `tests/e2e/${appId}`];
}

/**
 * Filter test cases by app
 */
function filterTestCasesByApp(testCases: TestCase[], appId: string, sourcePrefixes: string[]): TestCase[] {
  return testCases.filter((tc) => {
    for (const prefix of sourcePrefixes) {
      if (tc.file.startsWith(prefix)) {
        return true;
      }
    }
    if (tc.app === appId) {
      return true;
    }
    return false;
  });
}

/**
 * Strip matching prefix from file path for display
 */
function stripMatchingPrefix(file: string, prefixes: string[]): string {
  for (const prefix of prefixes) {
    if (file.startsWith(prefix + "/")) {
      return file.replace(prefix + "/", "");
    }
    if (file.startsWith(prefix)) {
      return file.replace(prefix, "");
    }
  }
  return file;
}

/**
 * Group test cases by file
 */
function groupTestCasesByFile(testCases: TestCase[]): Record<string, TestCase[]> {
  const grouped: Record<string, TestCase[]> = {};
  for (const tc of testCases) {
    if (!grouped[tc.file]) grouped[tc.file] = [];
    grouped[tc.file].push(tc);
  }
  return grouped;
}

/**
 * Get category breakdown
 */
function getCategoryBreakdown(testCases: TestCase[]): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const tc of testCases) {
    const cat = tc.category || "unknown";
    breakdown[cat] = (breakdown[cat] || 0) + 1;
  }
  return breakdown;
}

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

// Item type config
const itemTypeConfig: Record<string, { icon: React.ElementType; label: string; labelJa: string }> = {
  screens: { icon: Monitor, label: "Screens", labelJa: "画面" },
  components: { icon: Component, label: "Components", labelJa: "コンポーネント" },
  actions: { icon: Zap, label: "Actions", labelJa: "アクション" },
  tables: { icon: Database, label: "Tables", labelJa: "テーブル" },
};

/**
 * Filter feature map items by app
 */
function filterFeatureMapByApp(featureMap: FeatureMapData | null, appId: string): FeatureMapData | null {
  if (!featureMap) return null;

  // Map appId to app names in feature map
  // Note: appId "mcp" maps to items with app="API" or app="MCP" (for backward compatibility)
  const appNameMap: Record<string, string[]> = {
    admin: ["Admin"],
    public: ["Public"],
    web: ["Web"],
    mcp: ["API", "MCP"], // Support both new "API" and legacy "MCP"
  };

  const appNames = appNameMap[appId] || [appId];
  const filteredFeatures: FeatureMapData["features"] = {};

  for (const [moduleName, group] of Object.entries(featureMap.features)) {
    // Check if any item in the group belongs to this app
    const allItems = [
      ...(group.screens || []),
      ...(group.components || []),
      ...(group.actions || []),
    ];

    // Get app from first item that has it
    const firstItemWithApp = allItems.find(item => item.app);
    const moduleApp = firstItemWithApp?.app || "";

    if (appNames.some(name => moduleApp.toLowerCase().includes(name.toLowerCase()))) {
      filteredFeatures[moduleName] = group;
    }
  }

  return {
    ...featureMap,
    features: filteredFeatures,
  };
}

/**
 * Calculate coverage by mapping coverage.json to feature-map items
 * Feature-map items are considered "covered" if their source path is covered in coverage.json
 */
function calculateFeatureMapCoverage(
  coverage: CoverageData | null,
  featureMap: FeatureMapData | null,
  appId: string
): { totalItems: number; testedItems: number; coveragePercent: number; missingCount: number } | null {
  const filteredMap = filterFeatureMapByApp(featureMap, appId);
  if (!coverage || !filteredMap) return null;

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
  for (const group of Object.values(filteredMap.features)) {
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
 * Get coverage gaps for an app
 */
function getCoverageGaps(
  featureMap: FeatureMapData | null,
  details: DetailsData | null,
  appId: string
): Array<{ type: string; module: string; name: string; path?: string }> {
  const filteredMap = filterFeatureMapByApp(featureMap, appId);
  if (!filteredMap || !details) return [];

  const gaps: Array<{ type: string; module: string; name: string; path?: string }> = [];

  for (const [moduleName, group] of Object.entries(filteredMap.features)) {
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
          gaps.push({
            type,
            module: moduleName,
            name: item.name,
            path: "path" in item ? item.path : undefined,
          });
        }
      }
    }
  }

  return gaps;
}

/**
 * Get coverage distribution for an app
 */
function getCoverageDistribution(
  details: DetailsData | null,
  featureMap: FeatureMapData | null,
  appId: string
): { high: number; medium: number; low: number; none: number } {
  const filteredMap = filterFeatureMapByApp(featureMap, appId);
  if (!details || !filteredMap) return { high: 0, medium: 0, low: 0, none: 0 };

  let high = 0, medium = 0, low = 0, none = 0;

  // Get item names from filtered feature map
  const itemNames = new Set<string>();
  for (const group of Object.values(filteredMap.features)) {
    for (const item of [...(group.screens || []), ...(group.components || []), ...(group.actions || [])]) {
      itemNames.add(item.name);
    }
  }

  for (const [key, item] of Object.entries(details.details)) {
    // Check if this item belongs to the app
    const itemName = key.split("/").pop() || "";
    if (!itemNames.has(itemName)) continue;

    if (!item.testCoverage?.hasTest) {
      none++;
    } else {
      const score = item.testCoverage.coverageScore;
      if (score >= 70) high++;
      else if (score >= 40) medium++;
      else low++;
    }
  }

  return { high, medium, low, none };
}

/**
 * Get overall stats for an app
 */
function getOverallStats(
  featureMap: FeatureMapData | null,
  details: DetailsData | null,
  appId: string
): { totalItems: number; testedItems: number; coveragePercent: number } {
  const filteredMap = filterFeatureMapByApp(featureMap, appId);
  if (!filteredMap || !details) return { totalItems: 0, testedItems: 0, coveragePercent: 0 };

  let totalItems = 0;
  let testedItems = 0;

  for (const group of Object.values(filteredMap.features)) {
    const items = [
      ...(group.screens || []),
      ...(group.components || []),
      ...(group.actions || []),
      ...(group.tables || []),
    ];
    totalItems += items.length;
  }

  // Count tested items from details
  const itemNames = new Set<string>();
  for (const group of Object.values(filteredMap.features)) {
    for (const item of [...(group.screens || []), ...(group.components || []), ...(group.actions || []), ...(group.tables || [])]) {
      itemNames.add(item.name);
    }
  }

  for (const [key, item] of Object.entries(details.details)) {
    const itemName = key.split("/").pop() || "";
    if (itemNames.has(itemName) && item.testCoverage?.hasTest) {
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
 * Analyze test quality balance
 */
function analyzeTestQuality(categoryBreakdown: Record<string, number>, totalTests: number): {
  status: "good" | "warning" | "poor";
  message: string;
  details: string[];
} {
  if (totalTests === 0) return { status: "poor", message: "テストがありません", details: [] };

  const details: string[] = [];
  const successRatio = (categoryBreakdown["happy-path"] || 0) / totalTests;
  const errorRatio = (categoryBreakdown["error-handling"] || 0) / totalTests;
  const validationRatio = (categoryBreakdown.validation || 0) / totalTests;

  if (successRatio > 0.7) {
    details.push("正常系テストが多すぎます（異常系・バリデーションも追加推奨）");
  }
  if (errorRatio < 0.1 && totalTests > 10) {
    details.push("異常系テストが少ないです");
  }
  if (validationRatio < 0.05 && totalTests > 10) {
    details.push("バリデーションテストが少ないです");
  }
  if ((categoryBreakdown["edge-case"] || 0) === 0 && totalTests > 20) {
    details.push("境界値テストがありません");
  }

  if (details.length === 0) {
    return { status: "good", message: "テストカテゴリのバランスが良好です", details: [] };
  } else if (details.length <= 2) {
    return { status: "warning", message: "改善の余地があります", details };
  } else {
    return { status: "poor", message: "テストバランスの改善が必要です", details };
  }
}

export default async function AppTestCasesPage({ params }: PageProps) {
  const { appId } = await params;

  const [data, applications, featureMap, details, coverage] = await Promise.all([
    loadTestCases(),
    loadApplications(),
    loadFeatureMap(),
    loadDetails(),
    loadCoverage(),
  ]);

  // Find the app configuration
  const app = applications?.apps?.find((a) => a.id === appId);
  if (!app) {
    notFound();
  }

  if (!data) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Test Cases - {app.name}</h1>
          <p className="mt-2 text-destructive">No test cases data available.</p>
        </header>
      </div>
    );
  }

  // Filter test cases by app
  const sourcePrefixes = getAppSourcePrefixes(appId, app.source);
  const filteredTestCases = filterTestCasesByApp(data.testCases, appId, sourcePrefixes);
  const groupedByFile = groupTestCasesByFile(filteredTestCases);
  const categoryBreakdown = getCategoryBreakdown(filteredTestCases);

  // Count files
  const fileCount = Object.keys(groupedByFile).length;

  // Count by framework
  const jestCount = filteredTestCases.filter((tc) => tc.framework === "jest").length;
  const playwrightCount = filteredTestCases.filter((tc) => tc.framework === "playwright").length;

  // Coverage analysis - map coverage.json to feature-map items
  const coverageGaps = getCoverageGaps(featureMap, details, appId);
  const coverageDistribution = getCoverageDistribution(details, featureMap, appId);
  const appCoverage = calculateFeatureMapCoverage(coverage, featureMap, appId);
  const overallStats = appCoverage || getOverallStats(featureMap, details, appId);
  const qualityAnalysis = analyzeTestQuality(categoryBreakdown, filteredTestCases.length);

  // Group gaps by type
  const gapsByType = coverageGaps.reduce((acc, gap) => {
    if (!acc[gap.type]) acc[gap.type] = [];
    acc[gap.type].push(gap);
    return acc;
  }, {} as Record<string, typeof coverageGaps>);

  // Get app color
  const colorClass = app.color === "blue" ? "text-blue-500 bg-blue-500/10" :
                     app.color === "green" ? "text-green-500 bg-green-500/10" :
                     app.color === "purple" ? "text-purple-500 bg-purple-500/10" :
                     "text-gray-500 bg-gray-500/10";

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <Link href="/test-cases" className="hover:text-foreground">
          Test Cases
        </Link>
        <span>/</span>
        <span className="text-foreground">{app.name}</span>
      </nav>

      {/* Header */}
      <header>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${colorClass}`}>
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Test Quality Dashboard - {app.name}</h1>
              <p className="mt-1 text-muted-foreground">
                {app.description || `${app.name} のテストカバレッジと品質メトリクス`}
              </p>
            </div>
          </div>
          <Link
            href="/test-cases"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            全体ビュー
          </Link>
        </div>
      </header>

      {/* Tabbed Content */}
      <TabsWithHash defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            概要
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4" />
            テストファイル
            <Badge variant="secondary" className="text-xs">
              {fileCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="gaps" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            ギャップ
            <Badge variant="secondary" className="text-xs bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
              {coverageGaps.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>総テスト数</CardDescription>
                <CardTitle className="text-3xl">{filteredTestCases.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <div className="flex gap-2">
                    <span>Jest: {jestCount}</span>
                    <span>|</span>
                    <span>Playwright: {playwrightCount}</span>
                  </div>
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
                <CardDescription>テスト無し</CardDescription>
                <CardTitle className="text-3xl text-red-500">{coverageGaps.length}</CardTitle>
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
              {qualityAnalysis.details.length > 0 && (
                <CardContent>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {qualityAnalysis.details.map((d, i) => (
                      <li key={i}>• {d}</li>
                    ))}
                  </ul>
                </CardContent>
              )}
            </Card>
          </div>

          {/* Two Column Layout */}
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
                {Object.entries(categoryBreakdown)
                  .filter(([_, count]) => count > 0)
                  .sort((a, b) => b[1] - a[1])
                  .map(([category, count]) => {
                    const config = testCategoryLabels[category] || testCategoryLabels.unknown;
                    const percentage = Math.round((count / filteredTestCases.length) * 100);
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

            {/* Coverage Score Distribution */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>カバレッジスコア分布</CardTitle>
                </div>
                <CardDescription>
                  機能別テストカバレッジの品質
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm">高 (70%+)</span>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      {coverageDistribution.high}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <span className="text-sm">中 (40-69%)</span>
                    </div>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      {coverageDistribution.medium}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <span className="text-sm">低 (1-39%)</span>
                    </div>
                    <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      {coverageDistribution.low}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-gray-400" />
                      <span className="text-sm">なし (0%)</span>
                    </div>
                    <Badge variant="secondary">
                      {coverageDistribution.none}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Test Files Tab */}
        <TabsContent value="files" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileCode2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle>テストファイル</CardTitle>
              </div>
              <CardDescription>
                {fileCount} ファイル / {filteredTestCases.length} テスト
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(groupedByFile)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([file, tests]) => (
                    <div
                      key={file}
                      className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/test-cases/${encodeFilePath(file)}`}
                          className="flex items-center gap-2 font-medium text-foreground hover:text-primary"
                        >
                          <FileCode2 className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate">{stripMatchingPrefix(file, sourcePrefixes)}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                        <Badge variant="secondary">{tests.length} tests</Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(() => {
                          const categories = new Set(tests.map((t) => t.category || "unknown"));
                          return Array.from(categories).map((cat) => {
                            const config = testCategoryLabels[cat] || testCategoryLabels.unknown;
                            return (
                              <Badge
                                key={cat}
                                variant="outline"
                                className="text-xs"
                              >
                                <span className={`mr-1 h-1.5 w-1.5 rounded-full ${config.color}`} />
                                {config.ja}
                              </Badge>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coverage Gaps Tab */}
        <TabsContent value="gaps" className="mt-4">
          {coverageGaps.length > 0 ? (
            <Card className="border-red-500/30">
              <CardHeader className="pb-4">
                <CardDescription>
                  テストが存在しない機能 ({coverageGaps.length}件)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(gapsByType).map(([type, gaps]) => {
                    const config = itemTypeConfig[type];
                    const Icon = config?.icon || Zap;
                    return (
                      <div key={type} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span>{config?.labelJa || type}</span>
                          <Badge variant="outline" className="text-xs">{gaps.length}</Badge>
                        </div>
                        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                          {gaps.map((gap, idx) => (
                            <Link
                              key={idx}
                              href={`/apps/${appId}/${type}/${encodeURIComponent(gap.module)}/${encodeURIComponent(gap.name)}#tests`}
                              className="flex items-center gap-2 rounded-lg border p-2 text-sm hover:bg-muted/50 transition-colors"
                            >
                              <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium truncate">{gap.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{gap.module}</p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-green-500/30">
              <CardContent className="py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-muted-foreground">カバレッジギャップはありません</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </TabsWithHash>

      {/* Back to all tests link */}
      <div className="flex justify-center">
        <Link
          href="/test-cases"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <TrendingUp className="h-4 w-4" />
          全アプリのテストダッシュボードを見る
        </Link>
      </div>

      {/* Generated timestamp */}
      <footer className="text-center text-sm text-muted-foreground">
        <p>Generated at {new Date(data.generatedAt).toLocaleString()}</p>
      </footer>
    </div>
  );
}
