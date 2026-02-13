import Link from "next/link";
import { notFound } from "next/navigation";
import { Languages, ArrowLeft } from "lucide-react";
import { loadI18n, loadApplications } from "@/lib/data-loader";
import { I18nClient } from "@/app/i18n/i18n-client";
import type { I18nData, I18nNamespace, I18nApp } from "@/lib/types";

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
 * Filter i18n data by app
 */
function filterI18nDataByApp(data: I18nData, appId: string): I18nData {
  // Filter namespaces by app (namespaces have `app` field like "admin", "public")
  const filteredNamespaces = (data.namespaces || []).filter((ns) => ns.app === appId);

  // Calculate filtered stats
  const totalKeys = filteredNamespaces.reduce((sum, ns) => sum + ns.stats.totalKeys, 0);
  const fullyTranslatedKeys = filteredNamespaces.reduce((sum, ns) => sum + ns.stats.fullyTranslatedKeys, 0);
  const coveragePercent = totalKeys > 0 ? Math.round((fullyTranslatedKeys / totalKeys) * 100) : 100;

  // Filter apps to only include this app (apps array may not exist)
  const filteredApps = (data.apps || []).filter((a) => a.id === appId);

  return {
    ...data,
    namespaces: filteredNamespaces,
    apps: filteredApps,
    stats: {
      totalNamespaces: filteredNamespaces.length,
      totalKeys,
      coveragePercent,
    },
  };
}

export default async function AppI18nPage({ params }: PageProps) {
  const { appId } = await params;

  const [data, applications] = await Promise.all([
    loadI18n(),
    loadApplications(),
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
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-2">
              <Languages className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">i18n - {app.name}</h1>
              <p className="mt-1 text-muted-foreground">
                翻訳データがありません
              </p>
            </div>
          </div>
        </header>
      </div>
    );
  }

  // Filter data by app
  const filteredData = filterI18nDataByApp(data, appId);

  // Get app color
  const colorClass = app.color === "blue" ? "text-blue-500 bg-blue-500/10" :
                     app.color === "green" ? "text-green-500 bg-green-500/10" :
                     app.color === "purple" ? "text-purple-500 bg-purple-500/10" :
                     "text-green-500 bg-green-500/10";

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <Link href="/i18n" className="hover:text-foreground">
          i18n
        </Link>
        <span>/</span>
        <span className="text-foreground">{app.name}</span>
      </nav>

      {/* Header */}
      <header>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${colorClass}`}>
              <Languages className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">翻訳 - {app.name}</h1>
              <p className="mt-1 text-muted-foreground">
                {app.description || `${app.name} の翻訳ファイル`}
              </p>
            </div>
          </div>
          <Link
            href="/i18n"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            全体ビュー
          </Link>
        </div>
      </header>

      {/* Client Component with filtered data */}
      <I18nClient data={filteredData} />
    </div>
  );
}
