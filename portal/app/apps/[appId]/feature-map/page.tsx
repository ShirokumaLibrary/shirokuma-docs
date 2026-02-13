import { FlaskConical, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadFeatureMap, loadDetails, getModuleTestCoverage, loadApplications } from "@/lib/data-loader";
import { getPortalFormat } from "@/lib/format";
import { FeatureMapClient } from "@/app/feature-map/feature-map-client";
import { FeatureMapAppDocument } from "./feature-map-app-document";
import type { FeatureMapData, FeatureGroup, ScreenItem, ComponentItem, ActionItem, TableItem } from "@/lib/types";

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
 * Filter feature group by app
 */
function filterGroupByApp(group: FeatureGroup, appName: string): FeatureGroup {
  return {
    screens: group.screens?.filter((s) => s.app === appName) || [],
    components: group.components?.filter((c) => c.app === appName) || [],
    actions: group.actions?.filter((a) => a.app === appName) || [],
    modules: group.modules?.filter((m) => m.app === appName) || [],
    tables: group.tables?.filter((t) => t.app === appName) || [],
  };
}

/**
 * Check if a group has any items
 */
function hasItems(group: FeatureGroup): boolean {
  return (
    (group.screens?.length || 0) > 0 ||
    (group.components?.length || 0) > 0 ||
    (group.actions?.length || 0) > 0 ||
    (group.modules?.length || 0) > 0 ||
    (group.tables?.length || 0) > 0
  );
}

/**
 * Filter feature map data by app
 */
function filterFeatureMapByApp(data: FeatureMapData, appName: string): FeatureMapData {
  const filteredFeatures: Record<string, FeatureGroup> = {};

  for (const [moduleName, group] of Object.entries(data.features)) {
    const filtered = filterGroupByApp(group, appName);
    if (hasItems(filtered)) {
      filteredFeatures[moduleName] = filtered;
    }
  }

  const filteredUncategorized = filterGroupByApp(data.uncategorized, appName);

  return {
    ...data,
    features: filteredFeatures,
    uncategorized: filteredUncategorized,
    // Remove apps array since we're showing single app
    apps: undefined,
  };
}

export default async function AppFeatureMapPage({ params }: PageProps) {
  const { appId } = await params;

  const [data, details, applications] = await Promise.all([
    loadFeatureMap(),
    loadDetails(),
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
          <h1 className="text-3xl font-bold tracking-tight">Feature Map - {app.name}</h1>
          <p className="mt-2 text-destructive">No feature map data available.</p>
        </header>
      </div>
    );
  }

  // Convert app.name to match the app field in feature map items
  // e.g., "Admin" -> "Admin", "Public" -> "Public", "Web アプリ" -> "Web"
  const appNameForFilter = app.name.replace(" アプリ", "");

  // Filter data by app
  const filteredData = filterFeatureMapByApp(data, appNameForFilter);

  // Calculate module coverages for filtered modules
  const moduleNames = [...Object.keys(filteredData.features)];
  if (hasItems(filteredData.uncategorized)) {
    moduleNames.push("Uncategorized");
  }

  const moduleCoveragesMap = new Map<
    string,
    { totalTests: number; testedItems: number; totalItems: number; averageCoverage: number }
  >();

  for (const moduleName of moduleNames) {
    const coverage = await getModuleTestCoverage(moduleName);
    moduleCoveragesMap.set(moduleName, coverage);
  }

  // Convert Map to object for serialization
  const moduleCoverages: Record<
    string,
    { totalTests: number; testedItems: number; totalItems: number; averageCoverage: number }
  > = Object.fromEntries(moduleCoveragesMap);

  // Calculate total test coverage stats
  let totalTests = 0;
  let totalTestedItems = 0;
  let totalItems = 0;
  for (const coverage of moduleCoveragesMap.values()) {
    totalTests += coverage.totalTests;
    totalTestedItems += coverage.testedItems;
    totalItems += coverage.totalItems;
  }

  // Get app icon color
  const colorClass = app.color === "blue" ? "text-blue-500" :
                     app.color === "green" ? "text-green-500" :
                     app.color === "purple" ? "text-purple-500" : "text-gray-500";

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <Link href="/feature-map" className="hover:text-foreground">
          Feature Map
        </Link>
        <span>/</span>
        <span className="text-foreground">{app.name}</span>
      </nav>

      {/* Header */}
      <header>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                Feature Map - {app.name}
              </h1>
            </div>
            <p className="mt-2 text-muted-foreground">
              {app.description || `${app.name} の画面、コンポーネント、アクション、テーブル`}
            </p>
            {data.generatedAt && (
              <p className="mt-1 text-xs text-muted-foreground">
                Generated: {new Date(data.generatedAt).toLocaleString("ja-JP")}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Overall test coverage summary */}
            {totalTests > 0 && (
              <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                <div className="rounded-lg bg-accent-green/10 p-2">
                  <FlaskConical className="h-5 w-5 text-accent-green" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalTests}</p>
                  <p className="text-sm text-muted-foreground">
                    Tests ({totalTestedItems}/{totalItems} items covered)
                  </p>
                </div>
              </div>
            )}
            <Link
              href="/feature-map"
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              全体ビュー
            </Link>
          </div>
        </div>
      </header>

      {/* Feature Map - format determined at build time */}
      {getPortalFormat() === "document" ? (
        <FeatureMapAppDocument
          data={filteredData}
          moduleCoverages={moduleCoverages}
          appId={appId}
        />
      ) : (
        <FeatureMapClient
          data={filteredData}
          details={details}
          moduleCoverages={moduleCoverages}
          appId={appId}
        />
      )}
    </div>
  );
}
