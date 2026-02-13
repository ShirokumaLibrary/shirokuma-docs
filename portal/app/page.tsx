import Link from "next/link";
import {
  Layers,
  Database,
  CheckCircle,
  Book,
  ExternalLink,
  Monitor,
  Component,
  Zap,
  Package,
  TestTube2,
  Link2,
  FileText,
  Globe,
  Bot,
  Wrench,
  Languages,
  ArrowRight,
  BarChart3,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  getProjectName,
  getAvailableData,
  loadFeatureMap,
  loadTestCases,
  loadDbSchema,
  loadLinkedDocs,
  loadApplications,
  loadI18n,
  loadPackages,
} from "@/lib/data-loader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Icon mapping for string icon names
const iconMap: Record<string, LucideIcon> = {
  "file-text": FileText,
  "database": Database,
  "layers": Layers,
  "check-circle": CheckCircle,
  "globe": Globe,
  "bot": Bot,
  "wrench": Wrench,
};

// Color mapping for app colors
const colorMap: Record<string, { text: string; bg: string }> = {
  blue: { text: "text-accent-blue", bg: "bg-accent-blue/10" },
  purple: { text: "text-accent-purple", bg: "bg-accent-purple/10" },
  green: { text: "text-accent-green", bg: "bg-accent-green/10" },
  yellow: { text: "text-accent-yellow", bg: "bg-accent-yellow/10" },
  orange: { text: "text-accent-orange", bg: "bg-accent-orange/10" },
};

function getIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || FileText;
}

function getColorClasses(color: string): { text: string; bg: string } {
  return colorMap[color] || { text: "text-muted-foreground", bg: "bg-muted/10" };
}

export default async function HomePage() {
  const projectName = getProjectName();
  const [availableData, featureMap, testCases, dbSchema, linkedDocs, applications, i18nData, packagesData] = await Promise.all([
    getAvailableData(),
    loadFeatureMap(),
    loadTestCases(),
    loadDbSchema(),
    loadLinkedDocs(),
    loadApplications(),
    loadI18n(),
    loadPackages(),
  ]);

  // Calculate system stats
  const stats = {
    screens: 0,
    components: 0,
    actions: 0,
    tables: 0,
    modules: 0,
    tests: { total: 0, jest: 0, playwright: 0 },
    linkedSources: 0,
    i18n: { locales: 0, keys: 0, namespaces: 0, coverage: 0 },
    packages: { total: 0, modules: 0, exports: 0 },
  };

  if (featureMap) {
    for (const group of Object.values(featureMap.features)) {
      stats.screens += group.screens?.length || 0;
      stats.components += group.components?.length || 0;
      stats.actions += group.actions?.length || 0;
      stats.modules += group.modules?.length || 0;
      stats.tables += group.tables?.length || 0;
    }
    stats.screens += featureMap.uncategorized.screens?.length || 0;
    stats.components += featureMap.uncategorized.components?.length || 0;
    stats.actions += featureMap.uncategorized.actions?.length || 0;
    stats.modules += featureMap.uncategorized.modules?.length || 0;
    stats.tables += featureMap.uncategorized.tables?.length || 0;
  }

  if (testCases) {
    stats.tests.total = testCases.summary.totalTests;
    stats.tests.jest = testCases.summary.jestTests;
    stats.tests.playwright = testCases.summary.playwrightTests;
  }

  if (dbSchema) {
    stats.tables = dbSchema.tables.length;
  }

  if (linkedDocs?.linkedSources) {
    stats.linkedSources = linkedDocs.linkedSources.length;
  }

  if (i18nData) {
    stats.i18n.locales = i18nData.locales?.length || 0;
    stats.i18n.keys = i18nData.stats?.totalKeys || 0;
    stats.i18n.namespaces = i18nData.stats?.totalNamespaces || 0;
    stats.i18n.coverage = i18nData.stats?.coveragePercent || 0;
  }

  if (packagesData) {
    stats.packages.total = packagesData.summary.totalPackages;
    stats.packages.modules = packagesData.summary.totalModules;
    stats.packages.exports = packagesData.summary.totalExports;
  }

  const totalItems = stats.screens + stats.components + stats.actions;

  // Multi-app mode
  const hasMultiApp = applications && applications.apps.length > 0;

  // Layer distribution for chart
  const layerDistribution = [
    { name: "Screens", count: stats.screens, icon: Monitor, color: "bg-accent-blue" },
    { name: "Components", count: stats.components, icon: Component, color: "bg-accent-green" },
    { name: "Actions", count: stats.actions, icon: Zap, color: "bg-accent-yellow" },
    { name: "Modules", count: stats.modules, icon: Package, color: "bg-accent-orange" },
    { name: "Tables", count: stats.tables, icon: Database, color: "bg-accent-purple" },
  ];
  const totalLayerItems = stats.screens + stats.components + stats.actions + stats.modules + stats.tables;

  // Simple test ratio (not full coverage - for visual indicator only)
  const testRatio = totalItems > 0 ? Math.min(100, Math.round((stats.tests.total / totalItems) * 100)) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Book className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{projectName} Documentation</h1>
            <p className="mt-1 text-muted-foreground">
              コードアノテーションから自動生成されたドキュメントポータル
            </p>
          </div>
        </div>
      </header>

      {/* Summary Stats - Dashboard Style */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>機能アイテム</CardDescription>
            <CardTitle className="text-3xl">{totalItems}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Monitor className="h-3 w-3 text-accent-blue" /> {stats.screens}
              </span>
              <span className="flex items-center gap-1">
                <Component className="h-3 w-3 text-accent-green" /> {stats.components}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-accent-yellow" /> {stats.actions}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>テスト</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <TestTube2 className="h-6 w-6 text-accent-green" />
              {stats.tests.total}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">
              Jest: {stats.tests.jest} / E2E: {stats.tests.playwright}
            </div>
            <Progress value={testRatio} className="h-1.5 mt-2" />
            <p className="mt-1 text-xs text-muted-foreground">テスト充実度</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>データベース</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Database className="h-6 w-6 text-accent-purple" />
              {stats.tables}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              テーブル / {stats.modules} モジュール
            </p>
          </CardContent>
        </Card>

        <Card className={stats.i18n.coverage === 100 ? "border-green-500/30" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>多言語化</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Languages className="h-6 w-6 text-accent-blue" />
              {stats.i18n.locales}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats.i18n.keys.toLocaleString()} keys / {stats.i18n.coverage}% 翻訳済
            </p>
          </CardContent>
        </Card>
      </div>

      {hasMultiApp ? (
        /* Multi-App Mode */
        <>
          {/* Application Cards - Enhanced */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">アプリケーション</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {applications.apps.map((app) => {
                const AppIcon = getIcon(app.icon);
                const colors = getColorClasses(app.color);

                return (
                  <div
                    key={app.id}
                    className="rounded-lg border border-border bg-card p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className={`rounded-lg p-3 ${colors.bg}`}>
                        <AppIcon className={`h-6 w-6 ${colors.text}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold">{app.name}</h3>
                        {app.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {app.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Quick Stats */}
                    {app.stats && (
                      <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {app.stats.screens !== undefined && app.stats.screens > 0 && (
                          <span className="flex items-center gap-1">
                            <Monitor className="h-3.5 w-3.5 text-accent-blue" />
                            {app.stats.screens}
                          </span>
                        )}
                        {app.stats.components !== undefined && app.stats.components > 0 && (
                          <span className="flex items-center gap-1">
                            <Component className="h-3.5 w-3.5 text-accent-green" />
                            {app.stats.components}
                          </span>
                        )}
                        {app.stats.actions !== undefined && app.stats.actions > 0 && (
                          <span className="flex items-center gap-1">
                            <Zap className="h-3.5 w-3.5 text-accent-yellow" />
                            {app.stats.actions}
                          </span>
                        )}
                        {app.stats.tests !== undefined && app.stats.tests > 0 && (
                          <span className="flex items-center gap-1">
                            <TestTube2 className="h-3.5 w-3.5 text-accent-orange" />
                            {app.stats.tests}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Navigation Links */}
                    <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
                      <Link
                        href={`/apps/${app.id}/feature-map`}
                        className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        機能マップ
                      </Link>
                      <Link
                        href={`/apps/${app.id}/test-cases`}
                        className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        テスト
                      </Link>
                      <Link
                        href={`/apps/${app.id}/i18n`}
                        className="flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <Languages className="h-3.5 w-3.5" />
                        翻訳
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

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

            {/* Quick Navigation */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>ダッシュボード</CardTitle>
                </div>
                <CardDescription>
                  各種ドキュメントへのクイックアクセス
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {availableData.hasOverview && (
                  <Link
                    href="/overview"
                    className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">プロジェクト概要</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                )}
                <Link
                  href="/feature-map"
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Layers className="h-4 w-4 text-accent-yellow" />
                    <span className="text-sm font-medium">全体機能マップ</span>
                  </div>
                  <Badge variant="secondary">{stats.modules} modules</Badge>
                </Link>
                <Link
                  href="/db-schema"
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-accent-purple" />
                    <span className="text-sm font-medium">DBスキーマ</span>
                  </div>
                  <Badge variant="secondary">{stats.tables} tables</Badge>
                </Link>
                <Link
                  href="/test-cases"
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-accent-green" />
                    <span className="text-sm font-medium">全体テスト</span>
                  </div>
                  <Badge variant="secondary">{stats.tests.total} tests</Badge>
                </Link>
                <Link
                  href="/i18n"
                  className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Languages className="h-4 w-4 text-accent-blue" />
                    <span className="text-sm font-medium">全体翻訳</span>
                  </div>
                  <Badge variant="secondary">{stats.i18n.keys} keys</Badge>
                </Link>
                {availableData.hasPackages && (
                  <Link
                    href="/packages"
                    className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-accent-purple" />
                      <span className="text-sm font-medium">共有パッケージ</span>
                    </div>
                    <Badge variant="secondary">{stats.packages.total} packages</Badge>
                  </Link>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* Legacy Mode - Single App */
        <>
          {/* Section Cards */}
          <section>
            <h2 className="mb-4 text-lg font-semibold">ドキュメント</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {availableData.hasOverview && (
                <Link
                  href="/overview"
                  className="group rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-accent-blue/10 p-2">
                      <FileText className="h-5 w-5 text-accent-blue" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-primary">プロジェクト概要</h3>
                      <p className="text-sm text-muted-foreground">OVERVIEW.mdからの概要</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              )}
              {availableData.hasFeatureMap && (
                <Link
                  href="/feature-map"
                  className="group rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-accent-yellow/10 p-2">
                      <Layers className="h-5 w-5 text-accent-yellow" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-primary">機能マップ</h3>
                      <p className="text-sm text-muted-foreground">{stats.modules} モジュール / {totalItems} アイテム</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              )}
              {availableData.hasDbSchema && (
                <Link
                  href="/db-schema"
                  className="group rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-accent-purple/10 p-2">
                      <Database className="h-5 w-5 text-accent-purple" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-primary">DBスキーマ</h3>
                      <p className="text-sm text-muted-foreground">{stats.tables} テーブル</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              )}
              {availableData.hasTestCases && (
                <Link
                  href="/test-cases"
                  className="group rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-accent-green/10 p-2">
                      <CheckCircle className="h-5 w-5 text-accent-green" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold group-hover:text-primary">テストケース</h3>
                      <p className="text-sm text-muted-foreground">{stats.tests.total} テスト</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              )}
            </div>
          </section>

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
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {layerDistribution.map(({ name, count, icon: Icon, color }) => {
                  const percentage = totalLayerItems > 0 ? Math.round((count / totalLayerItems) * 100) : 0;
                  return (
                    <div key={name} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${color.replace("bg-", "text-")}`} />
                        <span className="text-sm font-medium">{name}</span>
                      </div>
                      <p className="text-2xl font-bold">{count}</p>
                      <Progress value={percentage} className="h-2" />
                      <p className="text-xs text-muted-foreground">{percentage}%</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Footer */}
      <footer className="text-center text-sm text-muted-foreground">
        <p>
          Generated by{" "}
          <a
            href="https://github.com/shirokuma-docs"
            className="text-primary hover:underline"
          >
            shirokuma-docs
          </a>
        </p>
      </footer>
    </div>
  );
}
