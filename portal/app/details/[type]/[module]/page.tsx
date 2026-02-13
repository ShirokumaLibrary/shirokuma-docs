import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Monitor,
  Component,
  Zap,
  Database,
  ArrowLeft,
  FileCode,
  Code2,
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
  AppWindow,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { loadFeatureMap, loadDetails } from "@/lib/data-loader";
import { encodeFilePath } from "@/lib/path-utils";
import { CodeBlock } from "@/components/code-block";
import { CoverageScoreBar } from "@/components/shared/coverage-score-bar";
import { CATEGORY_LABELS } from "@/lib/constants/test-categories";
import type {
  FeatureMapData,
  ScreenItem,
  ComponentItem,
  ActionItem,
  TableItem,
  DetailItem,
  AuthLevel,
  ZodParameterInfo,
  ErrorCodeInfo,
} from "@/lib/types";

// Only pre-generated paths will work (required for output: export)
export const dynamicParams = false;

type LayerType = "screens" | "components" | "actions" | "tables";
type LayerTypeSingular = "screen" | "component" | "action" | "table";

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
  tables: {
    key: "tables",
    singular: "table",
    label: "Tables",
    icon: Database,
    color: "text-accent-purple",
    bgColor: "bg-accent-purple/10",
  },
};

// App configuration for styling
const appConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  Admin: { label: "Admin", color: "text-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
  Public: { label: "Public", color: "text-green-600", bgColor: "bg-green-500/10", borderColor: "border-green-500/30" },
  Web: { label: "Web", color: "text-purple-600", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30" },
  API: { label: "API Server", color: "text-orange-600", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30" },
  Shared: { label: "Shared", color: "text-gray-600", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/30" },
};

/**
 * Group items by app
 */
function groupItemsByApp<T extends { app?: string }>(
  items: T[]
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const appName = item.app || "Shared";
    if (!grouped.has(appName)) {
      grouped.set(appName, []);
    }
    grouped.get(appName)!.push(item);
  }

  // Sort by app name for consistent ordering
  return new Map([...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

export async function generateStaticParams(): Promise<
  { type: string; module: string }[]
> {
  const data = await loadFeatureMap();
  if (!data) return [];

  const params: { type: string; module: string }[] = [];
  const layers: LayerType[] = ["screens", "components", "actions", "tables"];

  // Add feature modules
  for (const [moduleName, group] of Object.entries(data.features)) {
    for (const layer of layers) {
      if (group[layer]?.length > 0) {
        params.push({ type: layer, module: moduleName });
      }
    }
  }

  // Add uncategorized if has items
  for (const layer of layers) {
    if (data.uncategorized[layer]?.length > 0) {
      params.push({ type: layer, module: "Uncategorized" });
    }
  }

  return params;
}

function getModuleItems(
  data: FeatureMapData,
  module: string,
  type: LayerType
): (ScreenItem | ComponentItem | ActionItem | TableItem)[] {
  if (module === "Uncategorized") {
    return data.uncategorized[type] || [];
  }
  return data.features[module]?.[type] || [];
}

// Test category labels - using shared constant
const categoryLabels = CATEGORY_LABELS;

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
function JSDocSection({ detail }: { detail: DetailItem }) {
  const { jsDoc } = detail;

  return (
    <div className="space-y-6">
      {/* Description */}
      {jsDoc.description && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">概要</h4>
          <p className="whitespace-pre-wrap text-sm">{jsDoc.description}</p>
        </div>
      )}

      {/* Parameters */}
      {jsDoc.params && jsDoc.params.length > 0 && (
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

      {/* Returns */}
      {jsDoc.returns && (
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

      {/* Meta Tags */}
      {jsDoc.tags && jsDoc.tags.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">メタ情報</h4>
          <div className="flex flex-wrap gap-2">
            {jsDoc.tags.map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                @{tag.name}{tag.value ? `: ${tag.value}` : ""}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Source Code Section Component
function SourceCodeSection({ sourceCode }: { sourceCode: string }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80">
        <Code2 className="h-4 w-4" />
        ソースコード
        <ChevronDown className="ml-auto h-4 w-4" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-2 max-h-[500px] overflow-auto rounded-md bg-muted p-4 text-xs">
          <code>{sourceCode}</code>
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

// Test Coverage Section Component
function TestCoverageSection({ detail }: { detail: DetailItem }) {
  const { testCoverage } = detail;

  if (!testCoverage.hasTest && testCoverage.totalTests === 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-yellow-500/20 bg-yellow-500/10 p-4">
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">テストがありません</span>
          </div>
          {testCoverage.recommendations.length > 0 && (
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
    <div className="space-y-4">
      {/* Score and Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-4">
            <CoverageScoreBar score={testCoverage.coverageScore} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 pt-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <TestTube2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{testCoverage.totalTests}</p>
              <p className="text-sm text-muted-foreground">テストケース</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tests by Category */}
      <div className="space-y-3">
        {Object.entries(testCoverage.byCategory)
          .filter(([, tests]) => tests.length > 0)
          .map(([category, tests]) => {
            const catInfo = categoryLabels[category] || categoryLabels["other"];
            const Icon = catInfo.icon;

            return (
              <Collapsible key={category}>
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border px-4 py-2 text-sm hover:bg-muted/50">
                  <div className={`h-2 w-2 rounded-full ${catInfo.color}`} />
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{catInfo.label}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {tests.length}
                  </Badge>
                  <ChevronRight className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 space-y-2 pl-4">
                    {tests.map((test, idx) => (
                      <Link
                        key={idx}
                        href={`/test-cases/${encodeFilePath(test.file)}/${test.line}`}
                        className="block rounded-md border bg-card p-3 text-sm hover:bg-muted/50 transition-colors group"
                      >
                        <p className="font-medium group-hover:text-primary transition-colors">{test.name}</p>
                        {test.summary && (
                          <p className="mt-1 text-muted-foreground">
                            {test.summary}
                          </p>
                        )}
                        {test.purpose && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            目的: {test.purpose}
                          </p>
                        )}
                        {test.expected && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            期待結果: {test.expected}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <FileCode className="h-3 w-3" />
                          <code className="truncate">{test.file}:{test.line}</code>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
      </div>

      {/* Recommendations */}
      {testCoverage.recommendations.length > 0 && (
        <div className="rounded-md border border-blue-500/20 bg-blue-500/10 p-4">
          <div className="flex items-center gap-2 text-blue-600">
            <Info className="h-4 w-4" />
            <span className="font-medium">推奨事項</span>
          </div>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            {testCoverage.recommendations.map((rec, idx) => (
              <li key={idx}>{rec}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

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

// Related Items Section
function RelatedItemsSection({ detail, config }: { detail: DetailItem; config: LayerConfig }) {
  const { related } = detail;

  const hasRelated =
    (related.usedInScreens?.length || 0) +
    (related.usedInComponents?.length || 0) +
    (related.usedInActions?.length || 0) +
    (related.dbTables?.length || 0) > 0;

  if (!hasRelated) return null;

  return (
    <div className="space-y-4">
      {related.usedInScreens && related.usedInScreens.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">使用されている画面</h4>
          <div className="flex flex-wrap gap-2">
            {related.usedInScreens.map((name) => (
              <Badge key={name} variant="secondary">
                <Monitor className="mr-1 h-3 w-3" />
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {related.usedInComponents && related.usedInComponents.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">使用コンポーネント</h4>
          <div className="flex flex-wrap gap-2">
            {related.usedInComponents.map((name) => (
              <Badge key={name} variant="secondary">
                <Component className="mr-1 h-3 w-3" />
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {related.usedInActions && related.usedInActions.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">使用アクション</h4>
          <div className="flex flex-wrap gap-2">
            {related.usedInActions.map((name) => (
              <Badge key={name} variant="secondary">
                <Zap className="mr-1 h-3 w-3" />
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {related.dbTables && related.dbTables.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-muted-foreground">使用DBテーブル</h4>
          <div className="flex flex-wrap gap-2">
            {related.dbTables.map((name) => (
              <Badge key={name} variant="secondary">
                <Database className="mr-1 h-3 w-3" />
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Item List Card with link to individual page
function ItemListCard({
  item,
  type,
  module,
  config,
  detail,
}: {
  item: ScreenItem | ComponentItem | ActionItem | TableItem;
  type: LayerType;
  module: string;
  config: LayerConfig;
  detail: DetailItem | null;
}) {
  const Icon = config.icon;

  return (
    <Link href={`/details/${type}/${encodeURIComponent(module)}/${encodeURIComponent(item.name)}`}>
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
                <CardDescription className="line-clamp-2 mt-1 text-sm">{item.description}</CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Auth/Security Badges */}
          {(detail?.authLevel || detail?.rateLimit || detail?.csrfProtection) && (
            <div className="flex flex-wrap gap-1 mt-2">
              {detail?.authLevel && <AuthLevelBadge level={detail.authLevel} />}
              {detail?.rateLimit && (
                <Badge variant="outline" className="text-xs text-orange-600 bg-orange-500/10 border-orange-500/30">
                  <Clock className="mr-1 h-3 w-3" />
                  {detail.rateLimit}
                </Badge>
              )}
              {detail?.csrfProtection && (
                <Badge variant="outline" className="text-xs text-cyan-600 bg-cyan-500/10 border-cyan-500/30">
                  <Shield className="mr-1 h-3 w-3" />
                  CSRF
                </Badge>
              )}
            </div>
          )}

          {/* File Path */}
          {detail?.filePath && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
              <FileCode className="h-3 w-3" />
              <code className="truncate">{detail.filePath}</code>
            </div>
          )}

          {/* Test Coverage */}
          {detail?.testCoverage && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <TestTube2 className="h-3 w-3" />
                  <span>{detail.testCoverage.totalTests} テスト</span>
                </div>
                {detail.testCoverage.hasTest && (
                  <CoverageScoreBar
                    score={detail.testCoverage.coverageScore}
                    variant="badge"
                    className="text-[10px]"
                  />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

interface PageProps {
  params: Promise<{
    type: string;
    module: string;
  }>;
}

export default async function ModuleDetailPage({ params }: PageProps) {
  const { type, module } = await params;
  const decodedModule = decodeURIComponent(module);
  const layerType = type as LayerType;

  // Validate type
  if (!["screens", "components", "actions", "tables"].includes(type)) {
    notFound();
  }

  const [featureMapData, detailsData] = await Promise.all([
    loadFeatureMap(),
    loadDetails(),
  ]);

  if (!featureMapData) {
    notFound();
  }

  const items = getModuleItems(featureMapData, decodedModule, layerType);

  if (items.length === 0) {
    notFound();
  }

  const config = layerConfigs[layerType];
  const Icon = config.icon;
  const description = featureMapData.moduleDescriptions?.[decodedModule];

  // Get detail items from details.json
  // Module names in details.json (from file paths) differ from feature group names
  // So we search by item name across all modules
  const getDetailForItem = (itemName: string): DetailItem | null => {
    if (!detailsData) return null;

    // First try exact key match (type/module/name)
    const exactKey = `${config.singular}/${decodedModule}/${itemName}`;
    if (detailsData.details[exactKey]) {
      return detailsData.details[exactKey];
    }

    // Search by item name across all modules
    // Keys are in format: "{type}/{moduleName}/{itemName}"
    const prefix = `${config.singular}/`;
    const suffix = `/${itemName}`;

    for (const [key, detail] of Object.entries(detailsData.details)) {
      if (key.startsWith(prefix) && key.endsWith(suffix)) {
        return detail;
      }
    }

    return null;
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/feature-map"
          className="flex items-center gap-1 text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Feature Map
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
          {description && (
            <p className="mt-2 text-muted-foreground">{description}</p>
          )}
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

      {/* Stats Cards */}
      {(() => {
        // Calculate stats
        const testedItems = items.filter((item) => {
          const detail = getDetailForItem(item.name);
          return detail?.testCoverage?.hasTest;
        }).length;
        const totalTests = items.reduce((sum, item) => {
          const detail = getDetailForItem(item.name);
          return sum + (detail?.testCoverage?.totalTests || 0);
        }, 0);

        return (
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
        );
      })()}

      {/* Items List - Always Grouped by App */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">
          {config.label} in this module
        </h2>
        {(() => {
          const itemsByApp = groupItemsByApp(items);

          // Always show app grouping
          return (
            <div className="space-y-6">
              {[...itemsByApp.entries()].map(([appName, appItems]) => {
                const appCfg = appConfig[appName] || appConfig.Shared;

                return (
                  <div key={appName} className={`rounded-lg border p-4 ${appCfg.bgColor} ${appCfg.borderColor}`}>
                    {/* App Header */}
                    <div className="flex items-center gap-2 mb-4">
                      <AppWindow className={`h-4 w-4 ${appCfg.color}`} />
                      <span className={`font-semibold ${appCfg.color}`}>{appCfg.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {appItems.length} {config.label.toLowerCase()}
                      </Badge>
                    </div>

                    {/* Items Grid */}
                    <div className="grid gap-4 md:grid-cols-2">
                      {appItems.map((item) => (
                        <ItemListCard
                          key={item.name}
                          item={item}
                          type={layerType}
                          module={decodedModule}
                          config={config}
                          detail={getDetailForItem(item.name)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </section>
    </div>
  );
}
