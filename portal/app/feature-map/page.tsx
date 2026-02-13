import Link from "next/link";
import {
  FlaskConical,
  AppWindow,
  Layers,
  ArrowRight,
  Monitor,
  Component,
  Zap,
  Database,
  BarChart3,
  TrendingUp,
} from "lucide-react";
import { loadFeatureMap, loadDetails, getModuleTestCoverage, loadApplications } from "@/lib/data-loader";
import { getPortalFormat } from "@/lib/format";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FeatureMapDocument } from "./feature-map-document";

export const dynamic = "force-static";

export default async function FeatureMapPage() {
  const [data, details, applications] = await Promise.all([
    loadFeatureMap(),
    loadDetails(),
    loadApplications(),
  ]);

  if (!data) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Feature Map</h1>
          <p className="mt-2 text-destructive">No feature map data available.</p>
        </header>
      </div>
    );
  }

  // Calculate module coverages
  const moduleNames = [...Object.keys(data.features), "Uncategorized"];
  const moduleCoveragesMap = new Map<
    string,
    { totalTests: number; testedItems: number; totalItems: number; averageCoverage: number }
  >();

  for (const moduleName of moduleNames) {
    const coverage = await getModuleTestCoverage(moduleName);
    moduleCoveragesMap.set(moduleName, coverage);
  }

  // Calculate total stats
  let totalScreens = 0;
  let totalComponents = 0;
  let totalActions = 0;
  let totalTables = 0;
  let totalTests = 0;
  let totalTestedItems = 0;
  let totalItems = 0;

  for (const group of Object.values(data.features)) {
    totalScreens += group.screens?.length || 0;
    totalComponents += group.components?.length || 0;
    totalActions += group.actions?.length || 0;
    totalTables += group.tables?.length || 0;
  }

  // Add uncategorized
  if (data.uncategorized) {
    totalScreens += data.uncategorized.screens?.length || 0;
    totalComponents += data.uncategorized.components?.length || 0;
    totalActions += data.uncategorized.actions?.length || 0;
    totalTables += data.uncategorized.tables?.length || 0;
  }

  for (const coverage of moduleCoveragesMap.values()) {
    totalTests += coverage.totalTests;
    totalTestedItems += coverage.testedItems;
    totalItems += coverage.totalItems;
  }

  const coveragePercent = totalItems > 0 ? Math.round((totalTestedItems / totalItems) * 100) : 0;
  const totalModules = Object.keys(data.features).length;

  // Calculate per-app stats
  const appStats = applications?.apps?.map((app) => {
    const appName = app.name.replace(" アプリ", "");
    let screens = 0, components = 0, actions = 0;

    for (const group of Object.values(data.features)) {
      const allItems = [
        ...(group.screens || []),
        ...(group.components || []),
        ...(group.actions || []),
      ];
      const firstItemWithApp = allItems.find(item => item.app);
      const moduleApp = firstItemWithApp?.app || "";

      if (moduleApp.toLowerCase().includes(appName.toLowerCase())) {
        screens += group.screens?.length || 0;
        components += group.components?.length || 0;
        actions += group.actions?.length || 0;
      }
    }

    return { app, screens, components, actions, total: screens + components + actions };
  }) || [];

  // Layer distribution for chart
  const layerDistribution = [
    { name: "Screens", count: totalScreens, icon: Monitor, color: "bg-accent-blue" },
    { name: "Components", count: totalComponents, icon: Component, color: "bg-accent-green" },
    { name: "Actions", count: totalActions, icon: Zap, color: "bg-accent-yellow" },
    { name: "Tables", count: totalTables, icon: Database, color: "bg-accent-purple" },
  ];

  const totalLayerItems = totalScreens + totalComponents + totalActions + totalTables;

  // Check format
  const format = getPortalFormat();

  // Prepare data for document format
  const layerDistributionForDoc = layerDistribution.map(item => ({
    name: item.name,
    count: item.count,
    percentage: totalLayerItems > 0 ? Math.round((item.count / totalLayerItems) * 100) : 0,
  }));

  const moduleOverview = Object.entries(data.features)
    .map(([name, group]) => ({
      name,
      count: (group.screens?.length || 0) +
             (group.components?.length || 0) +
             (group.actions?.length || 0) +
             (group.tables?.length || 0),
    }))
    .sort((a, b) => b.count - a.count);

  // Document format rendering
  if (format === "document") {
    return (
      <div className="space-y-8">
        <header>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-blue/10 p-2">
              <Layers className="h-6 w-6 text-accent-blue" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Feature Map Dashboard</h1>
              <p className="mt-1 text-muted-foreground">
                4層アーキテクチャの全体統計
              </p>
            </div>
          </div>
        </header>

        <FeatureMapDocument
          totalModules={totalModules}
          totalLayerItems={totalLayerItems}
          totalScreens={totalScreens}
          totalComponents={totalComponents}
          totalActions={totalActions}
          totalTables={totalTables}
          totalTests={totalTests}
          totalTestedItems={totalTestedItems}
          totalItems={totalItems}
          coveragePercent={coveragePercent}
          appStats={appStats}
          layerDistribution={layerDistributionForDoc}
          moduleOverview={moduleOverview}
          generatedAt={data.generatedAt}
        />
      </div>
    );
  }

  // Card format (default)
  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-accent-blue/10 p-2">
            <Layers className="h-6 w-6 text-accent-blue" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Feature Map Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              4層アーキテクチャの全体統計とアプリ別ビューへの導線
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
            <CardDescription>総モジュール数</CardDescription>
            <CardTitle className="text-3xl">{totalModules}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              機能モジュール
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>総アイテム数</CardDescription>
            <CardTitle className="text-3xl">{totalLayerItems}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Monitor className="h-3 w-3" /> {totalScreens}
              </span>
              <span className="flex items-center gap-1">
                <Component className="h-3 w-3" /> {totalComponents}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" /> {totalActions}
              </span>
              <span className="flex items-center gap-1">
                <Database className="h-3 w-3" /> {totalTables}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>テストカバレッジ</CardDescription>
            <CardTitle className="text-3xl">{coveragePercent}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={coveragePercent} className="h-2" />
            <p className="mt-1 text-xs text-muted-foreground">
              {totalTestedItems} / {totalItems} items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>総テスト数</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <FlaskConical className="h-6 w-6 text-accent-green" />
              {totalTests}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              機能に紐づくテスト
            </p>
          </CardContent>
        </Card>
      </div>

      {/* App-specific Views - Main navigation */}
      {applications && applications.apps.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AppWindow className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">アプリ別 Feature Map</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {appStats.map(({ app, screens, components, actions, total }) => (
              <Link
                key={app.id}
                href={`/apps/${app.id}/feature-map`}
                className="group rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2.5">
                      <Layers className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-primary">{app.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {app.description || "機能マップを表示"}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  {screens > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Monitor className="h-4 w-4 text-accent-blue" />
                      {screens} screens
                    </span>
                  )}
                  {components > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Component className="h-4 w-4 text-accent-green" />
                      {components} components
                    </span>
                  )}
                  {actions > 0 && (
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-accent-yellow" />
                      {actions} actions
                    </span>
                  )}
                </div>
                {total > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <Badge variant="secondary" className="text-xs">
                      {total} items total
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
        {/* Layer Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>レイヤー分布</CardTitle>
            </div>
            <CardDescription>
              4層アーキテクチャのアイテム構成
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {layerDistribution.map(({ name, count, icon: Icon, color }) => {
              const percentage = totalLayerItems > 0 ? Math.round((count / totalLayerItems) * 100) : 0;
              return (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${color.replace("bg-", "text-")}`} />
                      <span>{name}</span>
                    </div>
                    <span className="text-muted-foreground">{count} ({percentage}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Module Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              <CardTitle>モジュール概要</CardTitle>
            </div>
            <CardDescription>
              上位モジュール（アイテム数順）
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.features)
                .map(([name, group]) => ({
                  name,
                  count: (group.screens?.length || 0) +
                         (group.components?.length || 0) +
                         (group.actions?.length || 0) +
                         (group.tables?.length || 0),
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 6)
                .map(({ name, count }) => (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <span className="truncate">{name}</span>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
            </div>
            {totalModules > 6 && (
              <p className="mt-3 text-xs text-muted-foreground text-center">
                他 {totalModules - 6} モジュール
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shared Resources Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-accent-purple" />
            <CardTitle>共有リソース</CardTitle>
          </div>
          <CardDescription>
            全アプリで共有されるデータベーステーブル
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-accent-purple/10 p-3">
                <Database className="h-6 w-6 text-accent-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTables}</p>
                <p className="text-sm text-muted-foreground">Database Tables</p>
              </div>
            </div>
            <Link
              href="/db-schema"
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              スキーマを表示
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <footer className="text-center text-sm text-muted-foreground">
        <p>詳細な機能マップはアプリ別ビューで確認できます</p>
      </footer>
    </div>
  );
}
