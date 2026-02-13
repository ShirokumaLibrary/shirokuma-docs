import Link from "next/link";
import {
  Languages,
  AppWindow,
  ArrowRight,
  FileText,
  Key,
  Percent,
  BarChart3,
  PieChart,
  Globe2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { loadI18n, loadApplications } from "@/lib/data-loader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-static";

export default async function I18nPage() {
  const [data, applications] = await Promise.all([
    loadI18n(),
    loadApplications(),
  ]);

  if (!data) {
    return (
      <div className="space-y-8">
        <header>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-2">
              <Languages className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">i18n</h1>
              <p className="mt-1 text-muted-foreground">
                翻訳データがありません
              </p>
            </div>
          </div>
        </header>
      </div>
    );
  }

  // Calculate stats
  const locales = data.locales || [];
  const primaryLocale = data.primaryLocale || "ja";
  const totalNamespaces = data.stats?.totalNamespaces || (data.namespaces || []).length;
  const totalKeys = data.stats?.totalKeys || 0;
  const coveragePercent = data.stats?.coveragePercent || 0;
  const apps = data.apps || [];

  // Calculate app stats
  const appStats = apps.map((app) => {
    const appNamespaces = (data.namespaces || []).filter((ns) => ns.app === app.id);
    const keys = app.keyCount || appNamespaces.reduce((sum, ns) => sum + (ns.entries?.length || 0), 0);
    const namespaces = app.namespaceCount || appNamespaces.length;
    return { app, keys, namespaces };
  });

  // Namespace distribution by app for chart
  const namespaceDistribution = appStats.map(({ app, namespaces }) => ({
    name: app.name,
    count: namespaces,
    color: app.color === "blue" ? "bg-accent-blue" :
           app.color === "green" ? "bg-accent-green" :
           app.color === "purple" ? "bg-accent-purple" :
           "bg-accent-yellow",
  }));

  const totalNamespacesInApps = namespaceDistribution.reduce((sum, d) => sum + d.count, 0);

  // Key distribution by app for chart
  const keyDistribution = appStats.map(({ app, keys }) => ({
    name: app.name,
    count: keys,
    color: app.color === "blue" ? "bg-accent-blue" :
           app.color === "green" ? "bg-accent-green" :
           app.color === "purple" ? "bg-accent-purple" :
           "bg-accent-yellow",
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-accent-green/10 p-2">
            <Languages className="h-6 w-6 text-accent-green" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">i18n Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              翻訳カバレッジと言語リソースの全体統計
            </p>
          </div>
        </div>
      </header>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>対応言語</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Globe2 className="h-6 w-6 text-accent-blue" />
              {locales.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {locales.map((locale) => (
                <Badge
                  key={locale}
                  variant={locale === primaryLocale ? "default" : "secondary"}
                  className="text-xs"
                >
                  {locale.toUpperCase()}
                  {locale === primaryLocale && " (primary)"}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>総キー数</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Key className="h-6 w-6 text-accent-yellow" />
              {totalKeys.toLocaleString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              翻訳キー（全言語共通）
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>名前空間</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <FileText className="h-6 w-6 text-accent-purple" />
              {totalNamespaces}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              翻訳ファイル数
            </p>
          </CardContent>
        </Card>

        <Card className={coveragePercent === 100 ? "border-green-500/50" : coveragePercent >= 80 ? "border-yellow-500/50" : "border-red-500/50"}>
          <CardHeader className="pb-2">
            <CardDescription>翻訳カバレッジ</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {coveragePercent === 100 ? (
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              ) : (
                <AlertCircle className={`h-6 w-6 ${coveragePercent >= 80 ? "text-yellow-500" : "text-red-500"}`} />
              )}
              {coveragePercent}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={coveragePercent} className="h-2" />
            <p className="mt-1 text-xs text-muted-foreground">
              {coveragePercent === 100 ? "全キー翻訳済み" : "未翻訳キーあり"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* App-specific Views */}
      {applications && applications.apps.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <AppWindow className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">アプリ別翻訳ダッシュボード</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {appStats.map(({ app, keys, namespaces }) => (
              <Link
                key={app.id}
                href={`/apps/${app.id}/i18n`}
                className="group rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-muted p-2.5">
                      <Languages className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-primary">{app.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        翻訳リソースを表示
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-accent-purple" />
                    {namespaces} namespaces
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Key className="h-4 w-4 text-accent-yellow" />
                    {keys.toLocaleString()} keys
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>キー占有率</span>
                    <span>{totalKeys > 0 ? Math.round((keys / totalKeys) * 100) : 0}%</span>
                  </div>
                  <Progress value={totalKeys > 0 ? (keys / totalKeys) * 100 : 0} className="h-1.5 mt-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Two Column Layout for Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Namespace Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>名前空間分布</CardTitle>
            </div>
            <CardDescription>
              アプリ別の翻訳ファイル数
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {namespaceDistribution.map(({ name, count, color }) => {
              const percentage = totalNamespacesInApps > 0 ? Math.round((count / totalNamespacesInApps) * 100) : 0;
              return (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded ${color}`} />
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

        {/* Key Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-muted-foreground" />
              <CardTitle>キー分布</CardTitle>
            </div>
            <CardDescription>
              アプリ別の翻訳キー数
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {keyDistribution.map(({ name, count, color }) => {
              const percentage = totalKeys > 0 ? Math.round((count / totalKeys) * 100) : 0;
              return (
                <div key={name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded ${color}`} />
                      <span>{name}</span>
                    </div>
                    <span className="text-muted-foreground">{count.toLocaleString()} ({percentage}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Locale Support Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-accent-blue" />
            <CardTitle>言語サポート</CardTitle>
          </div>
          <CardDescription>
            next-intl による多言語化設定
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-accent-blue/10 p-3">
                <Languages className="h-6 w-6 text-accent-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold">{locales.length} 言語</p>
                <div className="flex gap-2 mt-1">
                  {locales.map((locale) => (
                    <Badge
                      key={locale}
                      variant={locale === primaryLocale ? "default" : "outline"}
                    >
                      {locale.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>Primary: <span className="font-medium">{primaryLocale.toUpperCase()}</span></p>
              <p className="text-xs">Cookie-based locale detection</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <footer className="text-center text-sm text-muted-foreground">
        <p>詳細な翻訳キー一覧はアプリ別ビューで確認できます</p>
      </footer>
    </div>
  );
}
