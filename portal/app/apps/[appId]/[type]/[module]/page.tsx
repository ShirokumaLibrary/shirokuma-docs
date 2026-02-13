import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Monitor,
  Component,
  Zap,
  Database,
  Package,
  ArrowLeft,
  FileCode,
  TestTube2,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { loadFeatureMap, loadDetails, loadApplications } from "@/lib/data-loader";
import type {
  FeatureMapData,
  ScreenItem,
  ComponentItem,
  ActionItem,
  ModuleItem,
  TableItem,
  DetailItem,
} from "@/lib/types";

export const dynamicParams = false;

type LayerType = "screens" | "components" | "actions" | "modules" | "tables";

interface LayerConfig {
  key: LayerType;
  singular: string;
  label: string;
  icon: typeof Monitor;
  color: string;
  bgColor: string;
}

const layerConfigs: Record<LayerType, LayerConfig> = {
  screens: {
    key: "screens",
    singular: "screen",
    label: "Screens",
    icon: Monitor,
    color: "text-accent-blue",
    bgColor: "bg-accent-blue/10",
  },
  components: {
    key: "components",
    singular: "component",
    label: "Components",
    icon: Component,
    color: "text-accent-green",
    bgColor: "bg-accent-green/10",
  },
  actions: {
    key: "actions",
    singular: "action",
    label: "Actions",
    icon: Zap,
    color: "text-accent-yellow",
    bgColor: "bg-accent-yellow/10",
  },
  modules: {
    key: "modules",
    singular: "module",
    label: "Modules",
    icon: Package,
    color: "text-accent-orange",
    bgColor: "bg-accent-orange/10",
  },
  tables: {
    key: "tables",
    singular: "table",
    label: "Tables",
    icon: Database,
    color: "text-accent-purple",
    bgColor: "bg-accent-purple/10",
  },
};

interface PageProps {
  params: Promise<{ appId: string; type: string; module: string }>;
}

/**
 * Generate static params for all app/type/module combinations
 */
export async function generateStaticParams(): Promise<
  { appId: string; type: string; module: string }[]
> {
  const [data, applications] = await Promise.all([
    loadFeatureMap(),
    loadApplications(),
  ]);

  if (!data || !applications?.apps) return [];

  const params: { appId: string; type: string; module: string }[] = [];
  const layers: LayerType[] = ["screens", "components", "actions", "modules", "tables"];

  // For each app
  for (const app of applications.apps) {
    // Skip API type apps - they don't have feature map items
    if (app.type === "api") continue;

    const appNameForFilter = app.name.replace(" アプリ", "");

    // Check each module
    for (const [moduleName, group] of Object.entries(data.features)) {
      for (const layer of layers) {
        const items = group[layer] || [];
        // Only add if this app has items in this module/layer
        const hasAppItems = items.some((item: ScreenItem | ComponentItem | ActionItem | ModuleItem | TableItem) => item.app === appNameForFilter);
        if (hasAppItems) {
          params.push({ appId: app.id, type: layer, module: moduleName });
        }
      }
    }

    // Check uncategorized
    for (const layer of layers) {
      const items = data.uncategorized[layer] || [];
      const hasAppItems = items.some((item: ScreenItem | ComponentItem | ActionItem | ModuleItem | TableItem) => item.app === appNameForFilter);
      if (hasAppItems) {
        params.push({ appId: app.id, type: layer, module: "Uncategorized" });
      }
    }
  }

  return params;
}

function getModuleItems(
  data: FeatureMapData,
  module: string,
  type: LayerType,
  appName: string
): (ScreenItem | ComponentItem | ActionItem | ModuleItem | TableItem)[] {
  const items = module === "Uncategorized"
    ? data.uncategorized[type] || []
    : data.features[module]?.[type] || [];

  // Filter by app
  return items.filter((item) => item.app === appName);
}

/**
 * Item List Card Component
 */
function ItemListCard({
  item,
  type,
  module,
  appId,
  config,
  detail,
}: {
  item: ScreenItem | ComponentItem | ActionItem | ModuleItem | TableItem;
  type: LayerType;
  module: string;
  appId: string;
  config: LayerConfig;
  detail?: DetailItem;
}) {
  const Icon = config.icon;
  const hasTests = (detail?.testCoverage?.totalTests || 0) > 0;

  return (
    <Link href={`/apps/${appId}/${type}/${encodeURIComponent(module)}/${encodeURIComponent(item.name)}`}>
      <Card className="transition-all hover:border-primary/50 hover:shadow-md cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start gap-3">
            <div className={`rounded-md p-2 mt-0.5 ${config.bgColor}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-mono group-hover:text-primary transition-colors flex items-center gap-2">
                {item.name}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardTitle>
              {item.description && (
                <CardDescription className="mt-1 line-clamp-2">
                  {item.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            {"path" in item && item.path && (
              <span className="flex items-center gap-1">
                <FileCode className="h-3.5 w-3.5" />
                <code className="truncate max-w-[200px]">{item.path}</code>
              </span>
            )}
            <span className="flex items-center gap-1">
              <TestTube2 className={`h-3.5 w-3.5 ${hasTests ? 'text-accent-green' : ''}`} />
              {detail?.testCoverage?.totalTests || 0} テスト
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function AppModulePage({ params }: PageProps) {
  const { appId, type, module } = await params;
  const decodedModule = decodeURIComponent(module);
  const layerType = type as LayerType;

  // Validate layer type
  if (!layerConfigs[layerType]) {
    notFound();
  }

  const config = layerConfigs[layerType];

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

  const appNameForFilter = app.name.replace(" アプリ", "");

  if (!data) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">{decodedModule}</h1>
          <p className="mt-2 text-destructive">No feature map data available.</p>
        </header>
      </div>
    );
  }

  // Get items filtered by app
  const items = getModuleItems(data, decodedModule, layerType, appNameForFilter);

  if (items.length === 0) {
    notFound();
  }

  // Get detail for an item
  const getDetailForItem = (itemName: string): DetailItem | undefined => {
    if (!details) return undefined;

    // First try exact key match (type/module/name)
    const exactKey = `${config.singular}/${decodedModule}/${itemName}`;
    if (details.details[exactKey]) {
      return details.details[exactKey];
    }

    // Search by item name across all modules
    const prefix = `${config.singular}/`;
    const suffix = `/${itemName}`;

    for (const [key, detail] of Object.entries(details.details)) {
      if (key.startsWith(prefix) && key.endsWith(suffix)) {
        return detail;
      }
    }

    return undefined;
  };

  // Stats
  const testedItems = items.filter((item) => {
    const detail = getDetailForItem(item.name);
    return (detail?.testCoverage?.totalTests || 0) > 0;
  }).length;
  const totalTests = items.reduce((sum, item) => {
    const detail = getDetailForItem(item.name);
    return sum + (detail?.testCoverage?.totalTests || 0);
  }, 0);

  const Icon = config.icon;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/apps/${appId}/feature-map`}
          className="flex items-center gap-1 text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {app.name} Feature Map
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">{config.label}</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{decodedModule}</span>
      </div>

      {/* Header */}
      <header className="flex items-start gap-4">
        <div className={`rounded-lg p-3 ${config.bgColor}`}>
          <Icon className={`h-8 w-8 ${config.color}`} />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{decodedModule}</h1>
          <div className="mt-2 flex items-center gap-4">
            <Badge variant="secondary">
              {items.length} {config.label.toLowerCase()}
            </Badge>
            <Badge variant="outline" className={config.color}>
              {config.label}
            </Badge>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>アイテム数</CardDescription>
            <CardTitle className="text-3xl">{items.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>テスト付きアイテム</CardDescription>
            <CardTitle className="text-3xl">{testedItems}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>総テスト数</CardDescription>
            <CardTitle className="text-3xl">{totalTests}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Items List - No app grouping needed since we're already in app context */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">
          {config.label} in this module
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <ItemListCard
              key={item.name}
              item={item}
              type={layerType}
              module={decodedModule}
              appId={appId}
              config={config}
              detail={getDetailForItem(item.name)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
