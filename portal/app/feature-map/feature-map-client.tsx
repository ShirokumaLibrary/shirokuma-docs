"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Monitor, Component, Zap, Database, ArrowRight, FlaskConical, CheckCircle2, Settings, Globe, ChevronDown, ChevronRight, Folder, Package } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  getCoverageColor,
  getCoverageBgColor,
} from "@/components/shared/coverage-score-bar";
import type {
  FeatureMapData,
  FeatureGroup,
  ScreenItem,
  ComponentItem,
  ActionItem,
  ModuleItem,
  TableItem,
  DetailsData,
  AppName,
} from "@/lib/types";

type LayerType = "screens" | "components" | "actions" | "modules" | "tables";

interface LayerConfig {
  key: LayerType;
  label: string;
  icon: typeof Monitor;
  color: string;
  bgColor: string;
}

const layerConfigs: LayerConfig[] = [
  {
    key: "screens",
    label: "Screens",
    icon: Monitor,
    color: "text-accent-blue",
    bgColor: "bg-accent-blue/10",
  },
  {
    key: "components",
    label: "Components",
    icon: Component,
    color: "text-accent-green",
    bgColor: "bg-accent-green/10",
  },
  {
    key: "actions",
    label: "Actions",
    icon: Zap,
    color: "text-accent-yellow",
    bgColor: "bg-accent-yellow/10",
  },
  {
    key: "modules",
    label: "Modules",
    icon: Package,
    color: "text-accent-orange",
    bgColor: "bg-accent-orange/10",
  },
  {
    key: "tables",
    label: "Tables",
    icon: Database,
    color: "text-accent-purple",
    bgColor: "bg-accent-purple/10",
  },
];

// App icon and color mapping
const appIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  settings: Settings,
  globe: Globe,
  folder: Folder,
};

const appColorMap: Record<string, string> = {
  blue: "text-blue-500 bg-blue-500/10",
  green: "text-green-500 bg-green-500/10",
  purple: "text-purple-500 bg-purple-500/10",
  gray: "text-gray-500 bg-gray-500/10",
};

function getAppMeta(appName: string): { icon: React.ComponentType<{ className?: string }>; color: string } {
  const appMeta: Record<string, { icon: string; color: string }> = {
    Admin: { icon: "settings", color: "blue" },
    Public: { icon: "globe", color: "green" },
    WEB: { icon: "globe", color: "blue" },
    MCP: { icon: "folder", color: "purple" },
    Shared: { icon: "folder", color: "gray" },
  };
  const meta = appMeta[appName] || { icon: "folder", color: "gray" };
  return {
    icon: appIconMap[meta.icon] || Folder,
    color: appColorMap[meta.color] || appColorMap.gray,
  };
}

function getItemCount(group: FeatureGroup, layer: LayerType): number {
  return group[layer]?.length || 0;
}

/**
 * Generate link to detail page
 * When appId is provided, uses app-specific route (/apps/{appId}/...)
 * Otherwise uses shared route (/details/...)
 */
function getDetailPageLink(
  item: ScreenItem | ComponentItem | ActionItem | ModuleItem | TableItem,
  layer: LayerType,
  moduleName: string,
  appId?: string
): string {
  if (appId) {
    return `/apps/${appId}/${layer}/${encodeURIComponent(moduleName)}/${encodeURIComponent(item.name)}/`;
  }
  return `/details/${layer}/${encodeURIComponent(moduleName)}/${encodeURIComponent(item.name)}/`;
}

/**
 * Generate link to module index page
 * When appId is provided, uses app-specific route (/apps/{appId}/...)
 * Otherwise uses shared route (/details/...)
 */
function getModuleIndexLink(layer: LayerType, moduleName: string, appId?: string): string {
  if (appId) {
    return `/apps/${appId}/${layer}/${encodeURIComponent(moduleName)}/`;
  }
  return `/details/${layer}/${encodeURIComponent(moduleName)}/`;
}

function getRelatedCount(
  item: ScreenItem | ComponentItem | ActionItem | ModuleItem | TableItem,
  layer: LayerType
): number {
  switch (layer) {
    case "screens": {
      const screen = item as ScreenItem;
      return (screen.components?.length || 0) + (screen.actions?.length || 0);
    }
    case "components": {
      const component = item as ComponentItem;
      return component.props?.length || 0;
    }
    case "actions": {
      const action = item as ActionItem;
      return (action.params?.length || 0) + (action.dbTables?.length || 0);
    }
    case "modules": {
      const mod = item as ModuleItem;
      return (mod.usedInScreens?.length || 0) + (mod.usedInActions?.length || 0);
    }
    case "tables": {
      const table = item as TableItem;
      return table.columns?.length || 0;
    }
    default:
      return 0;
  }
}

function extractFileModule(path: string | undefined): string | null {
  if (!path) return null;
  const fileName = path.split("/").pop();
  if (!fileName) return null;
  return fileName.replace(/\.(ts|tsx)$/, "");
}

function getItemTestCoverage(
  details: DetailsData | null,
  item: ScreenItem | ComponentItem | ActionItem | ModuleItem | TableItem,
  layer: LayerType,
  moduleName: string
): { hasTest: boolean; totalTests: number; coverageScore: number } | null {
  if (!details) return null;

  const typeMap: Record<LayerType, string> = {
    screens: "screen",
    components: "component",
    actions: "action",
    modules: "module",
    tables: "table",
  };
  const type = typeMap[layer];
  const itemPath = "path" in item ? item.path : undefined;
  const fileModule = extractFileModule(itemPath);

  const possibleKeys = [
    fileModule ? `${type}/${fileModule}/${item.name}` : null,
    `${type}/${moduleName}/${item.name}`,
    `${type}/${moduleName.toLowerCase()}/${item.name}`,
  ].filter((k): k is string => k !== null);

  for (const key of possibleKeys) {
    const detail = details.details[key];
    if (detail?.testCoverage) {
      return {
        hasTest: detail.testCoverage.hasTest,
        totalTests: detail.testCoverage.totalTests,
        coverageScore: detail.testCoverage.coverageScore,
      };
    }
  }

  return null;
}

function ModuleCard({
  moduleName,
  group,
  layer,
  details,
  moduleCoverage,
  appId,
}: {
  moduleName: string;
  group: FeatureGroup;
  layer: LayerType;
  details: DetailsData | null;
  moduleCoverage: { totalTests: number; testedItems: number; totalItems: number; averageCoverage: number };
  appId?: string;
}) {
  const items = group[layer] || [];
  const layerConfig = layerConfigs.find((l) => l.key === layer)!;
  const Icon = layerConfig.icon;

  if (items.length === 0) return null;

  const moduleIndexLink = getModuleIndexLink(layer, moduleName, appId);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Link
            href={moduleIndexLink}
            className="flex items-center gap-2 group"
          >
            <div className={`rounded-md p-1.5 ${layerConfig.bgColor}`}>
              <Icon className={`h-4 w-4 ${layerConfig.color}`} />
            </div>
            <div>
              <CardTitle className="text-base group-hover:text-primary transition-colors">
                {moduleName}
              </CardTitle>
              <CardDescription className="text-xs">
                {items.length}{" "}
                {layer === "screens"
                  ? "screen"
                  : layer === "components"
                    ? "component"
                    : layer === "actions"
                      ? "action"
                      : "table"}
                {items.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {moduleCoverage.totalTests > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <FlaskConical className="h-3 w-3" />
                {moduleCoverage.totalTests}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {layerConfig.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => {
            const relatedCount = getRelatedCount(item, layer);
            const detailLink = getDetailPageLink(item, layer, moduleName, appId);
            const coverage = getItemTestCoverage(details, item, layer, moduleName);
            return (
              <Link
                key={item.name}
                href={detailLink}
                className="group flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium group-hover:text-primary">
                    {item.name}
                  </p>
                  {item.description && (
                    <p className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  )}
                </div>
                <div className="ml-2 flex items-center gap-2">
                  {coverage && coverage.totalTests > 0 && (
                    <Badge
                      variant="outline"
                      className={`text-xs gap-1 ${getCoverageBgColor(coverage.coverageScore)}`}
                    >
                      <CheckCircle2 className={`h-3 w-3 ${getCoverageColor(coverage.coverageScore)}`} />
                      <span className={getCoverageColor(coverage.coverageScore)}>
                        {coverage.totalTests}
                      </span>
                    </Badge>
                  )}
                  {relatedCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {relatedCount} related
                    </Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
              </Link>
            );
          })}
          <Link
            href={moduleIndexLink}
            className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary pt-2"
          >
            すべて見る ({items.length}件)
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Filter FeatureMapData by app
 */
function filterFeatureMapByApp(data: FeatureMapData, appName: string): FeatureMapData {
  const filterItems = <T extends { app?: AppName }>(items: T[]): T[] =>
    items.filter((item) => item.app === appName);

  const filterGroup = (group: FeatureGroup): FeatureGroup => ({
    screens: filterItems(group.screens),
    components: filterItems(group.components),
    actions: filterItems(group.actions),
    modules: filterItems(group.modules || []),
    tables: filterItems(group.tables),
  });

  const filteredFeatures: Record<string, FeatureGroup> = {};
  for (const [moduleName, group] of Object.entries(data.features)) {
    const filtered = filterGroup(group);
    // Only include if has any items
    if (
      filtered.screens.length > 0 ||
      filtered.components.length > 0 ||
      filtered.actions.length > 0 ||
      filtered.modules.length > 0 ||
      filtered.tables.length > 0
    ) {
      filteredFeatures[moduleName] = filtered;
    }
  }

  return {
    ...data,
    features: filteredFeatures,
    uncategorized: filterGroup(data.uncategorized),
  };
}

/**
 * Count items by layer for an app
 */
function countItemsByApp(data: FeatureMapData, appName: string): Record<LayerType, number> {
  const filtered = filterFeatureMapByApp(data, appName);
  const counts: Record<LayerType, number> = {
    screens: 0,
    components: 0,
    actions: 0,
    modules: 0,
    tables: 0,
  };

  for (const group of Object.values(filtered.features)) {
    counts.screens += group.screens.length;
    counts.components += group.components.length;
    counts.actions += group.actions.length;
    counts.modules += (group.modules || []).length;
    counts.tables += group.tables.length;
  }

  counts.screens += filtered.uncategorized.screens.length;
  counts.components += filtered.uncategorized.components.length;
  counts.actions += filtered.uncategorized.actions.length;
  counts.modules += (filtered.uncategorized.modules || []).length;
  counts.tables += filtered.uncategorized.tables.length;

  return counts;
}

function LayerContent({
  data,
  layer,
  details,
  moduleCoverages,
  appId,
}: {
  data: FeatureMapData;
  layer: LayerType;
  details: DetailsData | null;
  moduleCoverages: Map<string, { totalTests: number; testedItems: number; totalItems: number; averageCoverage: number }>;
  appId?: string;
}) {
  const modules = Object.entries(data.features).filter(
    ([, group]) => getItemCount(group, layer) > 0
  );

  const uncategorizedCount = getItemCount(data.uncategorized, layer);

  if (modules.length === 0 && uncategorizedCount === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>No {layer} found in the codebase.</p>
      </div>
    );
  }

  const defaultCoverage = { totalTests: 0, testedItems: 0, totalItems: 0, averageCoverage: 0 };

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {modules.map(([moduleName, group]) => (
        <ModuleCard
          key={moduleName}
          moduleName={moduleName}
          group={group}
          layer={layer}
          details={details}
          moduleCoverage={moduleCoverages.get(moduleName) || defaultCoverage}
          appId={appId}
        />
      ))}
      {uncategorizedCount > 0 && (
        <ModuleCard
          moduleName="Uncategorized"
          group={data.uncategorized}
          layer={layer}
          details={details}
          moduleCoverage={moduleCoverages.get("Uncategorized") || defaultCoverage}
          appId={appId}
        />
      )}
    </div>
  );
}

/**
 * App Section with collapsible content
 */
function AppSection({
  appName,
  data,
  layer,
  details,
  moduleCoverages,
}: {
  appName: string;
  data: FeatureMapData;
  layer: LayerType;
  details: DetailsData | null;
  moduleCoverages: Map<string, { totalTests: number; testedItems: number; totalItems: number; averageCoverage: number }>;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const filteredData = filterFeatureMapByApp(data, appName);
  const counts = countItemsByApp(data, appName);
  const totalCount = counts[layer];

  // Skip if no items for this layer
  if (totalCount === 0) return null;

  const { icon: AppIcon, color: colorClass } = getAppMeta(appName);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-4">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${colorClass}`}>
                  <AppIcon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{appName}</CardTitle>
                  <CardDescription>
                    {totalCount} {layer}
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <LayerContent
              data={filteredData}
              layer={layer}
              details={details}
              moduleCoverages={moduleCoverages}
            />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface FeatureMapClientProps {
  data: FeatureMapData;
  details: DetailsData | null;
  moduleCoverages: Record<string, { totalTests: number; testedItems: number; totalItems: number; averageCoverage: number }>;
  appId?: string;
}

export function FeatureMapClient({ data, details, moduleCoverages, appId }: FeatureMapClientProps) {
  const [activeTab, setActiveTab] = useState<LayerType>("screens");
  const [mounted, setMounted] = useState(false);

  // Convert moduleCoverages back to Map
  const coveragesMap = new Map(Object.entries(moduleCoverages));

  // Check if multiple apps exist
  const hasMultipleApps = data.apps && data.apps.length > 1;

  // Handle URL hash on mount and hash changes
  useEffect(() => {
    setMounted(true);

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as LayerType;
      if (["screens", "components", "actions", "tables"].includes(hash)) {
        setActiveTab(hash);
      }
    };

    // Check initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Update URL hash when tab changes
  const handleTabChange = (value: string) => {
    const newTab = value as LayerType;
    setActiveTab(newTab);
    window.history.pushState(null, "", `#${newTab}`);
  };

  // Calculate counts for summary
  const counts = layerConfigs.map((layer) => {
    const count = Object.values(data.features).reduce(
      (sum, group) => sum + getItemCount(group, layer.key),
      getItemCount(data.uncategorized, layer.key)
    );
    return { ...layer, count };
  });

  if (!mounted) {
    // SSR placeholder to prevent hydration mismatch
    return (
      <div className="space-y-8">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {counts.map((layer) => {
            const Icon = layer.icon;
            return (
              <div
                key={layer.key}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
              >
                <div className={`rounded-lg p-2 ${layer.bgColor}`}>
                  <Icon className={`h-5 w-5 ${layer.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{layer.count}</p>
                  <p className="text-sm text-muted-foreground">{layer.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Clickable Summary Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {counts.map((layer) => {
          const Icon = layer.icon;
          const isActive = activeTab === layer.key;
          return (
            <button
              key={layer.key}
              onClick={() => handleTabChange(layer.key)}
              className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
                isActive
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              <div className={`rounded-lg p-2 ${layer.bgColor}`}>
                <Icon className={`h-5 w-5 ${layer.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{layer.count}</p>
                <p className="text-sm text-muted-foreground">{layer.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab content (navigation via summary cards above) */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {layerConfigs.map((layer) => (
          <TabsContent
            key={layer.key}
            value={layer.key}
            forceMount
            className="data-[state=inactive]:hidden"
          >
            {hasMultipleApps ? (
              // Multiple apps: Show grouped by app
              <div className="space-y-4">
                {data.apps?.map((appName) => (
                  <AppSection
                    key={appName}
                    appName={appName}
                    data={data}
                    layer={layer.key}
                    details={details}
                    moduleCoverages={coveragesMap}
                  />
                ))}
              </div>
            ) : (
              // Single app: Show flat
              <LayerContent
                data={data}
                layer={layer.key}
                details={details}
                moduleCoverages={coveragesMap}
                appId={appId}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
