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
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Info,
  Shield,
  Globe,
  Users,
  Lock,
  Clock,
  ExternalLink,
  Route,
  Layers,
  Languages,
  Workflow,
  Tag,
  AppWindow,
  Camera,
  ImageOff,
} from "lucide-react";
import { ItemTabsClient } from "./item-tabs-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { loadFeatureMap, loadDetails, loadApplications, getScreenshotForScreen, type ScreenshotEntry } from "@/lib/data-loader";
import { encodeFilePath } from "@/lib/path-utils";
import { CodeBlock } from "@/components/code-block";
import { CATEGORY_LABELS } from "@/lib/constants/test-categories";
import type {
  FeatureMapData,
  ScreenItem,
  ComponentItem,
  ActionItem,
  ModuleItem,
  TableItem,
  DetailItem,
  AuthLevel,
  ZodParameterInfo,
  ErrorCodeInfo,
} from "@/lib/types";

// Only pre-generated paths will work (required for output: export)
export const dynamicParams = false;

type LayerType = "screens" | "components" | "actions" | "modules" | "tables";
type LayerTypeSingular = "screen" | "component" | "action" | "module" | "table";

interface LayerConfig {
  key: LayerType;
  singular: LayerTypeSingular;
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

export async function generateStaticParams(): Promise<
  { appId: string; type: string; module: string; item: string }[]
> {
  const [data, applications] = await Promise.all([
    loadFeatureMap(),
    loadApplications(),
  ]);

  if (!data || !applications?.apps) return [];

  const params: { appId: string; type: string; module: string; item: string }[] = [];
  const layers: LayerType[] = ["screens", "components", "actions", "modules", "tables"];

  // For each app
  for (const app of applications.apps) {
    // Skip API type apps - they don't have feature map items
    if (app.type === "api") continue;

    const appNameForFilter = app.name.replace(" アプリ", "");

    // Add items from feature modules
    for (const [moduleName, group] of Object.entries(data.features)) {
      for (const layer of layers) {
        const items = group[layer] || [];
        for (const item of items) {
          if (item.app === appNameForFilter) {
            params.push({
              appId: app.id,
              type: layer,
              module: moduleName,
              item: item.name,
            });
          }
        }
      }
    }

    // Add uncategorized items
    for (const layer of layers) {
      const items = data.uncategorized[layer] || [];
      for (const item of items) {
        if (item.app === appNameForFilter) {
          params.push({
            appId: app.id,
            type: layer,
            module: "Uncategorized",
            item: item.name,
          });
        }
      }
    }
  }

  return params;
}

// Test category labels - using shared constant
const categoryLabels = CATEGORY_LABELS;

// Auth Level Badge Component
const authLevelConfig: Record<AuthLevel, { label: string; icon: typeof Shield; color: string }> = {
  none: { label: "Public", icon: Globe, color: "text-green-600 bg-green-500/10 border-green-500/30" },
  authenticated: { label: "Auth Required", icon: Lock, color: "text-blue-600 bg-blue-500/10 border-blue-500/30" },
  member: { label: "Member Only", icon: Users, color: "text-purple-600 bg-purple-500/10 border-purple-500/30" },
  admin: { label: "Admin Only", icon: Shield, color: "text-red-600 bg-red-500/10 border-red-500/30" },
};

function AuthLevelBadge({ level }: { level: AuthLevel }) {
  const config = authLevelConfig[level];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`${config.color} text-xs`}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  );
}

// Coverage Score Bar Component
function CoverageScoreBar({ score }: { score: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">カバレッジスコア</span>
        <span className="font-medium">{score}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all ${getScoreColor(score)}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
    </div>
  );
}

// Enhanced Parameters Table (from Zod schema)
function EnhancedParametersTable({ parameters }: { parameters: ZodParameterInfo[] }) {
  if (!parameters || parameters.length === 0) return null;

  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-muted-foreground">入力パラメータ (Zodスキーマ)</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">名前</TableHead>
            <TableHead className="w-[100px]">型</TableHead>
            <TableHead className="w-[60px]">必須</TableHead>
            <TableHead className="w-[150px]">制約</TableHead>
            <TableHead className="w-[100px]">デフォルト</TableHead>
            <TableHead>説明</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {parameters.map((param, idx) => {
            const constraints: string[] = [];
            if (param.format) constraints.push(param.format);
            if (param.minLength !== undefined) constraints.push(`min: ${param.minLength}`);
            if (param.maxLength !== undefined) constraints.push(`max: ${param.maxLength}`);
            if (param.min !== undefined) constraints.push(`≥ ${param.min}`);
            if (param.max !== undefined) constraints.push(`≤ ${param.max}`);
            if (param.enumValues) constraints.push(param.enumValues.join(" | "));

            return (
              <TableRow key={idx}>
                <TableCell className="font-mono text-sm">{param.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{param.type}</TableCell>
                <TableCell>
                  {param.required ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {constraints.length > 0 ? constraints.join(", ") : "-"}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {param.default !== undefined ? JSON.stringify(param.default) : "-"}
                </TableCell>
                <TableCell className="text-sm">{param.description || "-"}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

// Error Codes Section
function ErrorCodesSection({ errorCodes }: { errorCodes: ErrorCodeInfo[] }) {
  if (!errorCodes || errorCodes.length === 0) return null;

  return (
    <div>
      <h4 className="mb-2 text-sm font-semibold text-muted-foreground">エラーコード</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">コード</TableHead>
            <TableHead className="w-[80px]">ステータス</TableHead>
            <TableHead>説明</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {errorCodes.map((error, idx) => (
            <TableRow key={idx}>
              <TableCell className="font-mono text-sm text-red-600">{error.code}</TableCell>
              <TableCell>
                {error.status && (
                  <Badge variant="outline" className="text-xs">
                    {error.status}
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-sm">{error.description}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Tag configuration for enhanced display
interface TagConfig {
  icon: typeof Route;
  color: string;
  bgColor: string;
  label: string;
}

const tagConfigs: Record<string, TagConfig> = {
  route: {
    icon: Route,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10 border-blue-500/30",
    label: "Route",
  },
  layer: {
    icon: Layers,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10 border-purple-500/30",
    label: "Layer",
  },
  accessControl: {
    icon: Shield,
    color: "text-red-600",
    bgColor: "bg-red-500/10 border-red-500/30",
    label: "Access",
  },
  i18nNamespaces: {
    icon: Languages,
    color: "text-green-600",
    bgColor: "bg-green-500/10 border-green-500/30",
    label: "i18n",
  },
  dataFlow: {
    icon: Workflow,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10 border-amber-500/30",
    label: "Data Flow",
  },
  feature: {
    icon: Tag,
    color: "text-cyan-600",
    bgColor: "bg-cyan-500/10 border-cyan-500/30",
    label: "Feature",
  },
  category: {
    icon: Tag,
    color: "text-gray-600",
    bgColor: "bg-gray-500/10 border-gray-500/30",
    label: "Category",
  },
};

// Hidden tags (internal use, not displayed prominently)
const hiddenTags = ["screen", "component", "action", "table", "screenshot", "screenshotWaitFor"];

// Type for item lookup function - now includes appId and returns app info for cross-app linking
type ItemLookupResult = { module: string; app?: string } | null;
type ItemLookupFn = (type: "components" | "actions" | "screens" | "tables", name: string, targetApp?: string) => ItemLookupResult;

// Build a lookup map from item name to module name using feature map
// For app-specific context, we also track the app each item belongs to
function buildItemModuleLookup(featureMap: FeatureMapData): ItemLookupFn {
  // Maps: { "components": { "ProjectHeader": { module: "ProjectManagement", app: "Web" } }, ... }
  const lookupMaps: Record<string, Map<string, { module: string; app?: string }>> = {
    screens: new Map(),
    components: new Map(),
    actions: new Map(),
    tables: new Map(),
  };

  // Process all feature groups
  for (const [moduleName, group] of Object.entries(featureMap.features)) {
    for (const screen of group.screens || []) {
      lookupMaps.screens.set(screen.name, { module: moduleName, app: screen.app });
    }
    for (const component of group.components || []) {
      lookupMaps.components.set(component.name, { module: moduleName, app: component.app });
    }
    for (const action of group.actions || []) {
      lookupMaps.actions.set(action.name, { module: moduleName, app: action.app });
    }
    for (const table of group.tables || []) {
      lookupMaps.tables.set(table.name, { module: moduleName, app: table.app });
    }
  }

  // Process uncategorized
  const uncategorized = featureMap.uncategorized;
  for (const screen of uncategorized.screens || []) {
    lookupMaps.screens.set(screen.name, { module: "Uncategorized", app: screen.app });
  }
  for (const component of uncategorized.components || []) {
    lookupMaps.components.set(component.name, { module: "Uncategorized", app: component.app });
  }
  for (const action of uncategorized.actions || []) {
    lookupMaps.actions.set(action.name, { module: "Uncategorized", app: action.app });
  }
  for (const table of uncategorized.tables || []) {
    lookupMaps.tables.set(table.name, { module: "Uncategorized", app: table.app });
  }

  // Return the full entry with app info for cross-app linking
  // targetApp parameter is kept for backward compatibility but not used for filtering
  return (type, name, _targetApp) => {
    const entry = lookupMaps[type]?.get(name);
    if (!entry) return null;
    return entry;  // { module: string; app?: string }
  };
}

// Enhanced Tags Section Component
function EnhancedTagsSection({
  tags,
  moduleName,
  appId,
  appName,
  lookupModule
}: {
  tags: Array<{ name: string; value: string }>;
  moduleName: string;
  appId: string;
  appName: string;
  lookupModule?: ItemLookupFn;
}) {
  // Separate tags into categories
  const keyTags = tags.filter(t => ["route", "layer", "accessControl", "feature", "category"].includes(t.name));
  const dependencyTags = tags.filter(t => ["usedComponents", "usedActions"].includes(t.name));
  const dataFlowTag = tags.find(t => t.name === "dataFlow");
  const i18nTag = tags.find(t => t.name === "i18nNamespaces");
  const otherTags = tags.filter(t =>
    !["route", "layer", "accessControl", "feature", "category", "usedComponents", "usedActions", "dataFlow", "i18nNamespaces", ...hiddenTags].includes(t.name)
  );

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-muted-foreground">タグ情報</h4>

      {/* Key Tags + i18n as Table */}
      {(keyTags.length > 0 || (i18nTag && i18nTag.value)) && (
        <Table>
          <TableBody>
            {keyTags.map((tag, idx) => {
              const config = tagConfigs[tag.name];
              if (!config || !tag.value) return null;
              const Icon = config.icon;
              return (
                <TableRow key={idx} className="border-b-0">
                  <TableCell className="py-2 pl-0 w-[140px]">
                    <div className={`flex items-center gap-2 ${config.color}`}>
                      <Icon className="h-4 w-4" />
                      <span className="font-medium text-sm">{config.label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2 text-sm">
                    {tag.value}
                  </TableCell>
                </TableRow>
              );
            })}
            {/* i18n Namespaces row */}
            {i18nTag && i18nTag.value && (
              <TableRow className="border-b-0">
                <TableCell className="py-2 pl-0 w-[140px]">
                  <div className="flex items-center gap-2 text-green-600">
                    <Languages className="h-4 w-4" />
                    <span className="font-medium text-sm">i18n</span>
                  </div>
                </TableCell>
                <TableCell className="py-2 text-sm">
                  <div className="flex flex-wrap gap-1">
                    {i18nTag.value.split(",").map((ns, i) => {
                      const namespace = ns.trim();
                      if (!namespace) return null;
                      return (
                        <Link key={i} href={`/i18n/${encodeURIComponent(namespace)}`}>
                          <Badge
                            variant="outline"
                            className="text-xs hover:bg-green-100 cursor-pointer transition-colors border-green-300"
                          >
                            {namespace}
                          </Badge>
                        </Link>
                      );
                    })}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      {/* Dependencies (usedComponents, usedActions) */}
      {dependencyTags.length > 0 && (
        <div className="space-y-2">
          {dependencyTags.map((tag, idx) => {
            const items = tag.value?.split(",").map(s => s.trim()).filter(Boolean) || [];
            if (items.length === 0) return null;

            const isComponents = tag.name === "usedComponents";
            const Icon = isComponents ? Component : Zap;
            const color = isComponents ? "text-accent-green" : "text-accent-yellow";
            const label = isComponents ? "使用コンポーネント" : "使用アクション";
            const linkType = isComponents ? "components" : "actions";

            return (
              <div key={idx} className="rounded-md border p-3 bg-muted/30">
                <div className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 mt-0.5 ${color}`} />
                  <div>
                    <span className="text-sm font-medium">{label}</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {items.map((item, i) => {
                        // Look up the correct module for this item
                        const result = lookupModule?.(linkType, item);

                        if (result) {
                          // Determine if this is a cross-app link
                          const isCrossApp = result.app && result.app !== appName;
                          const targetAppId = result.app ? result.app.toLowerCase() : appId;

                          return (
                            <Link
                              key={i}
                              href={`/apps/${targetAppId}/${linkType}/${encodeURIComponent(result.module)}/${encodeURIComponent(item)}`}
                            >
                              <Badge
                                variant="outline"
                                className={`text-xs hover:bg-muted cursor-pointer transition-colors ${isCrossApp ? "border-dashed" : ""}`}
                              >
                                {item}
                                {isCrossApp && <ExternalLink className="ml-1 h-2 w-2 inline" />}
                              </Badge>
                            </Link>
                          );
                        }
                        // Item not found - show plain badge without link
                        return (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs text-muted-foreground"
                          >
                            {item}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Data Flow as numbered list */}
      {dataFlowTag && dataFlowTag.value && (
        <div className="rounded-md border p-3 bg-amber-500/5 border-amber-500/20">
          <div className="flex items-start gap-2">
            <Workflow className="h-4 w-4 mt-0.5 text-amber-600" />
            <div>
              <span className="text-sm font-medium text-amber-700">データフロー</span>
              <ol className="mt-2 space-y-1 text-sm list-decimal list-inside text-muted-foreground">
                {dataFlowTag.value
                  .split(/\d+\.\s*/)
                  .filter(Boolean)
                  .map((step, idx) => (
                    <li key={idx}>{step.trim()}</li>
                  ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Other Tags in collapsible */}
      {otherTags.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-90" />
            <span>その他のタグ ({otherTags.length})</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">タグ名</TableHead>
                  <TableHead>値</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {otherTags.map((tag, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-sm">@{tag.name}</TableCell>
                    <TableCell className="text-sm">{tag.value || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

/**
 * Parse markdown code fence and extract language and code
 * @example ```tsx\nconst x = 1;\n``` -> { language: "tsx", code: "const x = 1;" }
 */
function parseMarkdownCodeFence(text: string): { language: string; code: string } {
  // Match ```language\ncode\n```
  const fenceMatch = text.match(/^```(\w+)?\s*\n?([\s\S]*?)\n?```\s*$/);
  if (fenceMatch) {
    return {
      language: fenceMatch[1] || "typescript",
      code: fenceMatch[2].trim(),
    };
  }
  // No code fence, return as-is
  return { language: "typescript", code: text.trim() };
}

// JSDoc Section Component
function JSDocSection({
  detail,
  appId,
  appName,
  lookupModule
}: {
  detail: DetailItem;
  appId: string;
  appName: string;
  lookupModule?: ItemLookupFn;
}) {
  const { jsDoc } = detail;
  // Fallback to detail.description if jsDoc.description is empty
  const descriptionText = jsDoc.description || detail.description;

  return (
    <div className="space-y-6">
      {/* Description */}
      {descriptionText && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">概要</h4>
          <p className="whitespace-pre-wrap text-sm">{descriptionText}</p>
        </div>
      )}

      {/* Parameters (JSDoc) - only show if no Zod schema */}
      {!detail.inputSchema && jsDoc.params && jsDoc.params.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">パラメータ</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">名前</TableHead>
                <TableHead className="w-[200px]">型</TableHead>
                <TableHead>説明</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jsDoc.params.map((param, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-mono text-sm">{param.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {param.type || "-"}
                  </TableCell>
                  <TableCell className="text-sm">{param.description || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Returns - only show if no outputSchema */}
      {!detail.outputSchema && jsDoc.returns && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">戻り値</h4>
          <p className="text-sm">{jsDoc.returns}</p>
        </div>
      )}

      {/* Throws */}
      {jsDoc.throws && jsDoc.throws.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">例外</h4>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {jsDoc.throws.map((t, idx) => (
              <li key={idx}>{t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Examples - Parse markdown code fences and use CodeBlock */}
      {jsDoc.examples && jsDoc.examples.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">使用例</h4>
          <div className="space-y-3">
            {jsDoc.examples.map((example, idx) => {
              const { language, code } = parseMarkdownCodeFence(example);
              return (
                <CodeBlock key={idx} code={code} language={language} />
              );
            })}
          </div>
        </div>
      )}

      {/* Enhanced Tags Section */}
      {jsDoc.tags && jsDoc.tags.length > 0 && (
        <EnhancedTagsSection
          tags={jsDoc.tags}
          moduleName={detail.moduleName}
          appId={appId}
          appName={appName}
          lookupModule={lookupModule}
        />
      )}
    </div>
  );
}

// Source Code Section
function SourceCodeSection({ sourceCode }: { sourceCode: string }) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-muted-foreground">ソースコード</h4>
      <div className="max-h-[600px] overflow-auto">
        <CodeBlock code={sourceCode} language="typescript" />
      </div>
    </div>
  );
}

// BDD Section Component for individual test
function BddDisplay({ bdd }: { bdd: { given?: string; when?: string; then?: string; and?: string[] } }) {
  const bddColors = {
    given: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/30",
    when: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/30",
    then: "border-l-green-500 bg-green-50 dark:bg-green-950/30",
    and: "border-l-gray-400 bg-gray-50 dark:bg-gray-950/30",
  };
  const labelColors = {
    given: "text-blue-600 dark:text-blue-400",
    when: "text-amber-600 dark:text-amber-400",
    then: "text-green-600 dark:text-green-400",
    and: "text-gray-600 dark:text-gray-400",
  };

  return (
    <div className="space-y-1 mt-2">
      {bdd.given && (
        <div className={`border-l-4 ${bddColors.given} rounded-r px-2 py-1`}>
          <span className={`text-xs font-bold uppercase ${labelColors.given}`}>Given</span>
          <p className="text-xs">{bdd.given}</p>
        </div>
      )}
      {bdd.when && (
        <div className={`border-l-4 ${bddColors.when} rounded-r px-2 py-1`}>
          <span className={`text-xs font-bold uppercase ${labelColors.when}`}>When</span>
          <p className="text-xs">{bdd.when}</p>
        </div>
      )}
      {bdd.then && (
        <div className={`border-l-4 ${bddColors.then} rounded-r px-2 py-1`}>
          <span className={`text-xs font-bold uppercase ${labelColors.then}`}>Then</span>
          <p className="text-xs">{bdd.then}</p>
        </div>
      )}
      {bdd.and?.map((andItem, idx) => (
        <div key={idx} className={`border-l-4 ${bddColors.and} rounded-r px-2 py-1`}>
          <span className={`text-xs font-bold uppercase ${labelColors.and}`}>And</span>
          <p className="text-xs">{andItem}</p>
        </div>
      ))}
    </div>
  );
}

// Test Coverage Section
function TestCoverageSection({ detail }: { detail: DetailItem }) {
  const { testCoverage } = detail;

  if (!testCoverage || !testCoverage.hasTest) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <span className="font-medium text-yellow-600">テストがありません</span>
          </div>
          {testCoverage?.recommendations && testCoverage.recommendations.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
              {testCoverage.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CoverageScoreBar score={testCoverage.coverageScore || 0} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold">{testCoverage.totalTests || 0}</div>
          <div className="text-sm text-muted-foreground">総テスト数</div>
        </div>
        <div className="rounded-lg border p-4">
          <div className="text-2xl font-bold">{Object.keys(testCoverage.byCategory || {}).length}</div>
          <div className="text-sm text-muted-foreground">カテゴリ数</div>
        </div>
      </div>

      {/* Tests by Category with BDD display */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground">カテゴリ別テスト</h4>
        {Object.entries(testCoverage.byCategory || {}).map(([category, tests]) => {
          const catConfig = categoryLabels[category] || categoryLabels["other"];

          return (
            <Collapsible key={category} defaultOpen={tests.length <= 5}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border p-3 hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${catConfig.color}`} />
                  <span className="font-medium">{catConfig.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {tests.length}
                  </Badge>
                </div>
                <ChevronRight className="h-4 w-4 transition-transform [[data-state=open]_&]:rotate-90" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-3 pl-4">
                {tests.map((test, idx) => (
                  <Link
                    key={idx}
                    href={`/test-cases/${encodeFilePath(test.file)}/${test.line}`}
                    className="block rounded-lg border p-3 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <TestTube2 className="mt-0.5 h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm group-hover:text-primary transition-colors">{test.name}</p>
                        {test.summary && (
                          <p className="text-xs text-muted-foreground mt-1">{test.summary}</p>
                        )}
                        {test.purpose && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">目的:</span> {test.purpose}
                          </p>
                        )}
                        {test.expected && (
                          <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">期待結果:</span> {test.expected}
                          </p>
                        )}
                        {/* BDD Display */}
                        {test.bdd && (test.bdd.given || test.bdd.when || test.bdd.then) && (
                          <BddDisplay bdd={test.bdd} />
                        )}
                        {/* File Link */}
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <FileCode className="h-3 w-3" />
                          <span className="truncate">{test.file}:{test.line}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Recommendations */}
      {testCoverage.recommendations && testCoverage.recommendations.length > 0 && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <h4 className="mb-2 flex items-center gap-2 font-medium text-yellow-600">
            <Info className="h-4 w-4" />
            推奨事項
          </h4>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {testCoverage.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Related Items Section - app-specific version
function RelatedItemsSection({
  detail,
  config,
  appId,
  appName,
  lookupModule
}: {
  detail: DetailItem;
  config: LayerConfig;
  appId: string;
  appName: string;
  lookupModule?: ItemLookupFn;
}) {
  const { related } = detail;

  const hasRelated =
    (related.usedInScreens?.length || 0) +
    (related.usedInComponents?.length || 0) +
    (related.usedInActions?.length || 0) +
    (related.dbTables?.length || 0) > 0;

  if (!hasRelated) {
    return (
      <div className="text-center text-muted-foreground">
        関連アイテムはありません
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Used in Screens */}
      {related.usedInScreens && related.usedInScreens.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Monitor className="h-4 w-4 text-accent-blue" />
            使用している画面
          </h4>
          <div className="flex flex-wrap gap-2">
            {related.usedInScreens.map((screen, idx) => {
              const result = lookupModule?.("screens", screen);
              if (result) {
                const isCrossApp = result.app && result.app !== appName;
                const targetAppId = result.app ? result.app.toLowerCase() : appId;
                return (
                  <Link
                    key={idx}
                    href={`/apps/${targetAppId}/screens/${encodeURIComponent(result.module)}/${encodeURIComponent(screen)}`}
                  >
                    <Badge variant="outline" className={`text-xs hover:bg-muted cursor-pointer transition-colors ${isCrossApp ? "border-dashed" : ""}`}>
                      {screen}
                      {isCrossApp && <ExternalLink className="ml-1 h-2 w-2 inline" />}
                    </Badge>
                  </Link>
                );
              }
              return (
                <Badge key={idx} variant="outline" className="text-xs text-muted-foreground">
                  {screen}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Used in Components */}
      {related.usedInComponents && related.usedInComponents.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Component className="h-4 w-4 text-accent-green" />
            使用しているコンポーネント
          </h4>
          <div className="flex flex-wrap gap-2">
            {related.usedInComponents.map((comp, idx) => {
              const result = lookupModule?.("components", comp);
              if (result) {
                const isCrossApp = result.app && result.app !== appName;
                const targetAppId = result.app ? result.app.toLowerCase() : appId;
                return (
                  <Link
                    key={idx}
                    href={`/apps/${targetAppId}/components/${encodeURIComponent(result.module)}/${encodeURIComponent(comp)}`}
                  >
                    <Badge variant="outline" className={`text-xs hover:bg-muted cursor-pointer transition-colors ${isCrossApp ? "border-dashed" : ""}`}>
                      {comp}
                      {isCrossApp && <ExternalLink className="ml-1 h-2 w-2 inline" />}
                    </Badge>
                  </Link>
                );
              }
              return (
                <Badge key={idx} variant="outline" className="text-xs text-muted-foreground">
                  {comp}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Used in Actions */}
      {related.usedInActions && related.usedInActions.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Zap className="h-4 w-4 text-accent-yellow" />
            使用しているアクション
          </h4>
          <div className="flex flex-wrap gap-2">
            {related.usedInActions.map((action, idx) => {
              const result = lookupModule?.("actions", action);
              if (result) {
                const isCrossApp = result.app && result.app !== appName;
                const targetAppId = result.app ? result.app.toLowerCase() : appId;
                return (
                  <Link
                    key={idx}
                    href={`/apps/${targetAppId}/actions/${encodeURIComponent(result.module)}/${encodeURIComponent(action)}`}
                  >
                    <Badge variant="outline" className={`text-xs hover:bg-muted cursor-pointer transition-colors ${isCrossApp ? "border-dashed" : ""}`}>
                      {action}
                      {isCrossApp && <ExternalLink className="ml-1 h-2 w-2 inline" />}
                    </Badge>
                  </Link>
                );
              }
              return (
                <Badge key={idx} variant="outline" className="text-xs text-muted-foreground">
                  {action}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Uses DB Tables - link to db-schema page */}
      {related.dbTables && related.dbTables.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Database className="h-4 w-4 text-accent-purple" />
            使用しているテーブル
          </h4>
          <div className="flex flex-wrap gap-2">
            {related.dbTables.map((table, idx) => (
              <Link
                key={idx}
                href={`/db-schema/${encodeURIComponent(table)}`}
              >
                <Badge variant="outline" className="text-xs hover:bg-muted cursor-pointer transition-colors">
                  {table}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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

export default async function AppItemDetailPage({
  params,
}: {
  params: Promise<{ appId: string; type: string; module: string; item: string }>;
}) {
  const { appId, type, module, item } = await params;
  const decodedModule = decodeURIComponent(module);
  const decodedItem = decodeURIComponent(item);

  const [featureMapData, detailsData, applications] = await Promise.all([
    loadFeatureMap(),
    loadDetails(),
    loadApplications(),
  ]);

  // Load screenshot for screens only
  let screenshot: ScreenshotEntry | null = null;
  let screenshotAppId: string | null = null;
  if (type === "screens") {
    const result = await getScreenshotForScreen(decodedItem, appId);
    if (result) {
      screenshot = result.entry;
      screenshotAppId = result.appId;
    }
  }

  // Find the app configuration
  const app = applications?.apps?.find((a) => a.id === appId);
  if (!app) {
    notFound();
  }

  const appNameForFilter = app.name.replace(" アプリ", "");

  if (!featureMapData) {
    notFound();
  }

  // Build lookup function for cross-module linking
  const lookupModule = buildItemModuleLookup(featureMapData);

  const layerType = type as LayerType;
  if (!layerConfigs[layerType]) {
    notFound();
  }

  const config = layerConfigs[layerType];
  const Icon = config.icon;

  // Get all items in this module filtered by app
  const items = getModuleItems(featureMapData, decodedModule, layerType, appNameForFilter);
  const foundItem = items.find((i) => i.name === decodedItem);

  if (!foundItem) {
    notFound();
  }

  // Get detail from details.json
  const getDetailForItem = (itemName: string): DetailItem | null => {
    if (!detailsData) return null;

    // First try exact key match (type/module/name)
    const exactKey = `${config.singular}/${decodedModule}/${itemName}`;
    if (detailsData.details[exactKey]) {
      return detailsData.details[exactKey];
    }

    // Search by item name across all modules
    const prefix = `${config.singular}/`;
    const suffix = `/${itemName}`;

    for (const [key, detail] of Object.entries(detailsData.details)) {
      if (key.startsWith(prefix) && key.endsWith(suffix)) {
        return detail;
      }
    }

    return null;
  };

  const detail = getDetailForItem(decodedItem);

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
        <Link
          href={`/apps/${appId}/${type}/${module}`}
          className="text-muted-foreground hover:text-primary"
        >
          {decodedModule}
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{decodedItem}</span>
      </div>

      {/* Header */}
      <header className="flex items-start gap-4">
        <div className={`rounded-lg p-3 ${config.bgColor}`}>
          <Icon className={`h-8 w-8 ${config.color}`} />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{decodedItem}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* Auth Level Badge */}
            {detail?.authLevel && <AuthLevelBadge level={detail.authLevel} />}

            {/* Rate Limit Badge */}
            {detail?.rateLimit && (
              <Badge variant="outline" className="text-xs text-orange-600 bg-orange-500/10 border-orange-500/30">
                <Clock className="mr-1 h-3 w-3" />
                {detail.rateLimit}
              </Badge>
            )}

            {/* CSRF Badge */}
            {detail?.csrfProtection && (
              <Badge variant="outline" className="text-xs text-cyan-600 bg-cyan-500/10 border-cyan-500/30">
                <Shield className="mr-1 h-3 w-3" />
                CSRF Protected
              </Badge>
            )}

            {/* Test Coverage Badges */}
            {detail?.testCoverage && (
              <>
                <Badge
                  variant={detail.testCoverage.coverageScore >= 70 ? "default" : "secondary"}
                >
                  {detail.testCoverage.totalTests} tests
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    detail.testCoverage.coverageScore >= 70
                      ? "border-green-500 text-green-600"
                      : detail.testCoverage.coverageScore >= 40
                      ? "border-yellow-500 text-yellow-600"
                      : "border-red-500 text-red-600"
                  }
                >
                  {detail.testCoverage.coverageScore}%
                </Badge>
              </>
            )}

            {/* App Badge */}
            <Badge
              variant="outline"
              className={`text-xs ${
                appNameForFilter === "Admin"
                  ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                  : appNameForFilter === "Public"
                  ? "bg-green-500/10 text-green-600 border-green-500/30"
                  : appNameForFilter === "Web"
                  ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                  : "bg-gray-500/10 text-gray-600 border-gray-500/30"
              }`}
            >
              <AppWindow className="mr-1 h-3 w-3" />
              {appNameForFilter}
            </Badge>

            {/* Module Badge */}
            <Badge variant="outline" className="text-xs">
              {decodedModule}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {detail ? (
        <ItemTabsClient
          overviewContent={
            <Card>
              <CardContent className="pt-6 space-y-8">
                {/* Screenshot (Screens only) */}
                {layerType === "screens" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Camera className="h-4 w-4" />
                      スクリーンショット
                    </div>
                    {screenshot && screenshotAppId ? (
                      <div className="relative overflow-hidden rounded-lg border bg-muted/30">
                        <img
                          src={screenshotAppId === "default"
                            ? `/screenshots/${screenshot.fileName}`
                            : `/screenshots/${screenshotAppId}/${screenshot.fileName}`
                          }
                          alt={`Screenshot of ${screenshot.name}`}
                          className="w-full h-auto"
                          loading="lazy"
                        />
                        {screenshot.account && (
                          <div className="absolute bottom-2 right-2">
                            <Badge variant="outline" className="text-xs bg-background/80">
                              {screenshot.account}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32 rounded-lg border border-dashed bg-muted/20 text-muted-foreground">
                        <div className="text-center">
                          <ImageOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">スクリーンショット未生成</p>
                          <p className="text-xs mt-1">
                            <code>shirokuma-docs screenshots --run</code> で生成
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* File Path */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileCode className="h-4 w-4" />
                  <code className="truncate">{detail.filePath}</code>
                </div>

                {/* Enhanced Parameters Table (from Zod schema) */}
                {detail.inputSchema?.parameters && (
                  <EnhancedParametersTable parameters={detail.inputSchema.parameters} />
                )}

                {/* Output Schema */}
                {detail.outputSchema && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-muted-foreground">戻り値</h4>
                    <div className="rounded-md bg-muted p-3">
                      <code className="text-sm">{detail.outputSchema.type}</code>
                      {detail.outputSchema.successType && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          成功時: <code>{detail.outputSchema.successType}</code>
                        </p>
                      )}
                      {detail.outputSchema.errorType && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          エラー時: <code>{detail.outputSchema.errorType}</code>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Codes */}
                {detail.errorCodes && detail.errorCodes.length > 0 && (
                  <ErrorCodesSection errorCodes={detail.errorCodes} />
                )}

                {/* JSDoc Section */}
                <JSDocSection
                  detail={detail}
                  appId={appId}
                  appName={appNameForFilter}
                  lookupModule={lookupModule}
                />
              </CardContent>
            </Card>
          }
          codeContent={
            <Card>
              <CardContent className="pt-6">
                <SourceCodeSection sourceCode={detail.sourceCode} />
              </CardContent>
            </Card>
          }
          testsContent={
            <Card>
              <CardContent className="pt-6">
                <TestCoverageSection detail={detail} />
              </CardContent>
            </Card>
          }
          relatedContent={
            <Card>
              <CardContent className="pt-6">
                <RelatedItemsSection
                  detail={detail}
                  config={config}
                  appId={appId}
                  appName={appNameForFilter}
                  lookupModule={lookupModule}
                />
              </CardContent>
            </Card>
          }
        />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              詳細情報はありません
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Link
          href={`/apps/${appId}/${type}/${module}`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {decodedModule} の一覧に戻る
        </Link>
      </div>
    </div>
  );
}
