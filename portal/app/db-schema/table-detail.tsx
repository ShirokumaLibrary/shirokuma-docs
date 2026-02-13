import Link from "next/link";
import {
  Database,
  Key,
  Link2,
  Hash,
  ArrowLeft,
  ArrowRight,
  Table2,
  FileCode,
  Layers,
  Code,
  Monitor,
  Component,
  Bot,
  Wrench,
  AppWindow,
} from "lucide-react";
import type { FeatureMapData, ActionItem, ScreenItem, ComponentItem, DbTable, DbColumn, DbSchemaData, ApiToolsData } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  normalizeCategory,
  getCategoryConfig,
} from "@/lib/db-schema-utils";

// MCP Tool type
interface ApiTool {
  name: string;
  description: string;
  category?: string;
  dbTables?: string[];
}

// Feature Map related items type
interface RelatedFeatureItems {
  actions: { moduleName: string; action: ActionItem }[];
  screens: { moduleName: string; screen: ScreenItem }[];
  components: { moduleName: string; component: ComponentItem }[];
}

// App configuration for styling
const appConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
  Admin: { label: "Admin", color: "text-blue-600", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/30" },
  Public: { label: "Public", color: "text-green-600", bgColor: "bg-green-500/10", borderColor: "border-green-500/30" },
  Web: { label: "Web", color: "text-purple-600", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/30" },
  API: { label: "API", color: "text-orange-600", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/30" },
  Shared: { label: "Shared", color: "text-gray-600", bgColor: "bg-gray-500/10", borderColor: "border-gray-500/30" },
};

/**
 * Group items by app
 */
function groupByApp<T extends { app?: string }>(
  items: { moduleName: string; item: T }[]
): Map<string, { moduleName: string; item: T }[]> {
  const grouped = new Map<string, { moduleName: string; item: T }[]>();

  for (const entry of items) {
    const appName = entry.item.app || "Shared";
    if (!grouped.has(appName)) {
      grouped.set(appName, []);
    }
    grouped.get(appName)!.push(entry);
  }

  return new Map([...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

/**
 * Find related API tools for a table
 */
function findRelatedApiTools(tableName: string, apiTools: ApiToolsData | null): ApiTool[] {
  if (!apiTools?.tools) return [];
  return apiTools.tools.filter((tool) => tool.dbTables?.includes(tableName));
}

/**
 * Find related Feature Map items for a table
 */
function findRelatedFeatureItems(
  tableName: string,
  featureMap: FeatureMapData
): RelatedFeatureItems {
  const result: RelatedFeatureItems = {
    actions: [],
    screens: [],
    components: [],
  };

  const relatedActionNames = new Set<string>();

  const allModules: [string, typeof featureMap.features[string]][] = [
    ...Object.entries(featureMap.features),
    ["uncategorized", featureMap.uncategorized],
  ];

  for (const [moduleName, group] of allModules) {
    if (!group) continue;

    for (const action of group.actions || []) {
      if (action.dbTables?.includes(tableName)) {
        result.actions.push({ moduleName, action });
        relatedActionNames.add(action.name);
      }
    }
  }

  for (const [moduleName, group] of allModules) {
    if (!group) continue;

    for (const screen of group.screens || []) {
      if (screen.actions?.some((a) => relatedActionNames.has(a))) {
        result.screens.push({ moduleName, screen });
      }
    }
  }

  return result;
}

function ColumnBadges({ column }: { column: DbColumn }) {
  return (
    <div className="flex flex-wrap gap-1">
      {column.primaryKey && (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
          <Key className="mr-1 h-3 w-3" />
          PK
        </Badge>
      )}
      {column.unique && !column.primaryKey && (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
          <Hash className="mr-1 h-3 w-3" />
          Unique
        </Badge>
      )}
      {!column.nullable && !column.primaryKey && (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
          Required
        </Badge>
      )}
    </div>
  );
}

interface TableDetailProps {
  table: DbTable;
  allTables: DbTable[];
  featureMap: FeatureMapData | null;
  apiTools: ApiToolsData | null;
  /** URL prefix for links (e.g., "/db-schema" or "/db-schema/main") */
  urlPrefix: string;
  /** Database name (for multi-DB mode) */
  dbName?: string;
}

/**
 * Table Detail Component (Server Component)
 *
 * Displays detailed information about a database table
 */
export function TableDetail({
  table,
  allTables,
  featureMap,
  apiTools,
  urlPrefix,
  dbName,
}: TableDetailProps) {
  const tableName = table.name;
  const category = normalizeCategory(table.category);
  const config = getCategoryConfig(category);
  const columnCount = table.columns?.length ?? table.columnCount ?? 0;

  // Build FK map
  const foreignKeyMap = new Map<string, string>();
  if (table.foreignKeys) {
    for (const fk of table.foreignKeys) {
      foreignKeyMap.set(fk.column, fk.references.table);
    }
  }

  // Find tables that reference this table
  const referencedBy: { table: string; column: string }[] = [];
  for (const t of allTables) {
    if (t.foreignKeys) {
      for (const fk of t.foreignKeys) {
        if (fk.references.table === tableName) {
          referencedBy.push({ table: t.name, column: fk.column });
        }
      }
    }
  }

  // Find same-category tables for navigation
  const sameCategoryTables = allTables
    .filter((t) => normalizeCategory(t.category) === category && t.name !== tableName)
    .slice(0, 5);

  // Find related Feature Map items
  const relatedFeatureItems = featureMap
    ? findRelatedFeatureItems(tableName, featureMap)
    : null;
  const hasFeatureMapRelations =
    relatedFeatureItems &&
    (relatedFeatureItems.actions.length > 0 ||
      relatedFeatureItems.screens.length > 0 ||
      relatedFeatureItems.components.length > 0);

  // Find related API tools
  const relatedApiTools = findRelatedApiTools(tableName, apiTools);

  // Find prev/next table
  const tableIndex = allTables.findIndex((t) => t.name === tableName);
  const prevTable = tableIndex > 0 ? allTables[tableIndex - 1] : null;
  const nextTable = tableIndex < allTables.length - 1 ? allTables[tableIndex + 1] : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-start gap-4">
          <div className={`rounded-lg p-3 ${config.bgColor}`}>
            <Table2 className={`h-8 w-8 ${config.color}`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold font-mono tracking-tight">{tableName}</h1>
              <Badge variant="outline" className={config.bgColor}>
                {config.label}
              </Badge>
              {dbName && (
                <Badge variant="secondary" className="font-mono">
                  {dbName}
                </Badge>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{columnCount} columns</span>
              {table.foreignKeys && table.foreignKeys.length > 0 && (
                <span>- {table.foreignKeys.length} foreign keys</span>
              )}
              {referencedBy.length > 0 && (
                <span>- Referenced by {referencedBy.length} tables</span>
              )}
            </div>
            {table.file && (
              <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                <FileCode className="h-3.5 w-3.5" />
                Defined in <code className="rounded bg-muted px-1">{table.file}</code>
              </p>
            )}
          </div>
        </div>
        {/* Table Description */}
        {table.description && table.description !== "*" && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {table.description}
            </p>
          </div>
        )}
      </header>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Columns</CardDescription>
            <CardTitle className="text-2xl">{columnCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Foreign Keys</CardDescription>
            <CardTitle className="text-2xl">{table.foreignKeys?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Referenced By</CardDescription>
            <CardTitle className="text-2xl">{referencedBy.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Indexes</CardDescription>
            <CardTitle className="text-2xl">{table.indexes?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Used By Actions</CardDescription>
            <CardTitle className="text-2xl">{relatedFeatureItems?.actions.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        {apiTools && apiTools.tools && apiTools.tools.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>API Tools</CardDescription>
              <CardTitle className="text-2xl">{relatedApiTools.length}</CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* Columns */}
      <Card>
        <CardHeader>
          <CardTitle>Columns</CardTitle>
          <CardDescription>All columns in this table</CardDescription>
        </CardHeader>
        <CardContent>
          {table.columns && table.columns.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[180px]">Name</TableHead>
                    <TableHead className="w-[140px]">Type</TableHead>
                    <TableHead className="w-[180px]">Constraints</TableHead>
                    <TableHead className="min-w-[200px]">Description</TableHead>
                    <TableHead className="w-[150px]">Default</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.columns.map((column) => {
                    const referencedTable = foreignKeyMap.get(column.name);
                    return (
                      <TableRow key={column.name}>
                        <TableCell className="font-mono font-medium">
                          {column.name}
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {column.type}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <ColumnBadges column={column} />
                            {referencedTable && (
                              <Link href={`${urlPrefix}/${encodeURIComponent(referencedTable)}`}>
                                <Badge className="bg-accent-purple/10 text-accent-purple border-0 cursor-pointer hover:bg-accent-purple/20">
                                  <Database className="mr-1 h-3 w-3" />
                                  {"->"} {referencedTable}
                                </Badge>
                              </Link>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {column.description || (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {column.default ? (
                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                              {column.default}
                            </code>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-lg bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              Column details not available. Run <code className="rounded bg-muted px-1">shirokuma-docs schema --full</code> to generate.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Indexes */}
      {table.indexes && table.indexes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Indexes</CardTitle>
            <CardDescription>Database indexes for query optimization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[200px]">Name</TableHead>
                    <TableHead className="w-[180px]">Columns</TableHead>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead className="min-w-[200px]">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {table.indexes.map((index) => (
                    <TableRow key={index.name}>
                      <TableCell className="font-mono">{index.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {index.columns?.map((col) => (
                            <Badge key={col} variant="outline" className="font-mono text-xs">
                              {col}
                            </Badge>
                          )) ?? "-"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {index.unique && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                            Unique
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {index.description || (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Relationships */}
      {((table.foreignKeys?.length ?? 0) > 0 || referencedBy.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-accent-purple" />
              Relationships
            </CardTitle>
            <CardDescription>Foreign key relationships with other tables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Outgoing FKs */}
            {table.foreignKeys && table.foreignKeys.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  References ({table.foreignKeys.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {table.foreignKeys.map((fk) => (
                    <Button
                      key={fk.column}
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-2 border-accent-purple/30 hover:border-accent-purple/50"
                    >
                      <Link href={`${urlPrefix}/${encodeURIComponent(fk.references.table)}`}>
                        <Database className="h-3 w-3 text-accent-purple" />
                        <span className="font-mono text-muted-foreground">{fk.column}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-mono font-medium">{fk.references.table}</span>
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Incoming FKs */}
            {referencedBy.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Referenced By ({referencedBy.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {referencedBy.map((ref) => (
                    <Button
                      key={`${ref.table}-${ref.column}`}
                      asChild
                      variant="outline"
                      size="sm"
                      className="gap-2 border-accent-purple/30 hover:border-accent-purple/50"
                    >
                      <Link href={`${urlPrefix}/${encodeURIComponent(ref.table)}`}>
                        <Database className="h-3 w-3 text-accent-purple" />
                        <span className="font-mono font-medium">{ref.table}</span>
                        <span className="text-muted-foreground">({ref.column})</span>
                      </Link>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Same category tables */}
      {sameCategoryTables.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related Tables</CardTitle>
            <CardDescription>Other tables in the {config.label} category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sameCategoryTables.map((t) => (
                <Button
                  key={t.name}
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Link href={`${urlPrefix}/${encodeURIComponent(t.name)}`}>
                    <Database className="h-3.5 w-3.5" />
                    <span className="font-mono">{t.name}</span>
                    <span className="text-muted-foreground text-xs">
                      ({t.columns?.length ?? t.columnCount ?? 0} cols)
                    </span>
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Usage - Feature Map + API Tools */}
      {(hasFeatureMapRelations || relatedApiTools.length > 0) && (() => {
        const actionsByApp: Map<string, { moduleName: string; item: ActionItem }[]> = relatedFeatureItems ? groupByApp(
          relatedFeatureItems.actions.map(({ moduleName, action }) => ({ moduleName, item: action }))
        ) : new Map();
        const screensByApp: Map<string, { moduleName: string; item: ScreenItem }[]> = relatedFeatureItems ? groupByApp(
          relatedFeatureItems.screens.map(({ moduleName, screen }) => ({ moduleName, item: screen }))
        ) : new Map();
        const componentsByApp: Map<string, { moduleName: string; item: ComponentItem }[]> = relatedFeatureItems ? groupByApp(
          relatedFeatureItems.components.map(({ moduleName, component }) => ({ moduleName, item: component }))
        ) : new Map();

        const featureMapApps = new Set([
          ...actionsByApp.keys(),
          ...screensByApp.keys(),
          ...componentsByApp.keys(),
        ]);

        const hasApiToolsToShow = relatedApiTools.length > 0;

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Usage
              </CardTitle>
              <CardDescription>
                Applications and APIs using this table
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Feature Map Apps */}
              {[...featureMapApps].sort().map((appName) => {
                const appCfg = appConfig[appName] || appConfig.Shared;
                const appActions = actionsByApp.get(appName) || [];
                const appScreens = screensByApp.get(appName) || [];
                const appComponents = componentsByApp.get(appName) || [];

                return (
                  <div key={appName} className={`rounded-lg border p-4 ${appCfg.bgColor} ${appCfg.borderColor}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <AppWindow className={`h-4 w-4 ${appCfg.color}`} />
                      <span className={`font-semibold ${appCfg.color}`}>{appCfg.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {appActions.length + appScreens.length + appComponents.length} items
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      {appActions.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-accent-yellow mb-1.5 flex items-center gap-1">
                            <Code className="h-3 w-3" />
                            Actions ({appActions.length})
                          </h5>
                          <div className="flex flex-wrap gap-1.5">
                            {appActions.map(({ moduleName, item: action }) => (
                              <Button
                                key={`${moduleName}-${action.name}`}
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5 text-xs border-accent-yellow/30 hover:border-accent-yellow/50 bg-background/50"
                              >
                                <Link href={`/details/actions/${encodeURIComponent(moduleName)}/${encodeURIComponent(action.name)}`}>
                                  <Code className="h-3 w-3 text-accent-yellow" />
                                  <span className="font-mono">{action.name}</span>
                                </Link>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {appScreens.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-accent-blue mb-1.5 flex items-center gap-1">
                            <Monitor className="h-3 w-3" />
                            Screens ({appScreens.length})
                          </h5>
                          <div className="flex flex-wrap gap-1.5">
                            {appScreens.map(({ moduleName, item: screen }) => (
                              <Button
                                key={`${moduleName}-${screen.name}`}
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5 text-xs border-accent-blue/30 hover:border-accent-blue/50 bg-background/50"
                              >
                                <Link href={`/details/screens/${encodeURIComponent(moduleName)}/${encodeURIComponent(screen.name)}`}>
                                  <Monitor className="h-3 w-3 text-accent-blue" />
                                  <span className="font-mono">{screen.name}</span>
                                </Link>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}

                      {appComponents.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-accent-green mb-1.5 flex items-center gap-1">
                            <Component className="h-3 w-3" />
                            Components ({appComponents.length})
                          </h5>
                          <div className="flex flex-wrap gap-1.5">
                            {appComponents.map(({ moduleName, item: component }) => (
                              <Button
                                key={`${moduleName}-${component.name}`}
                                asChild
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1.5 text-xs border-accent-green/30 hover:border-accent-green/50 bg-background/50"
                              >
                                <Link href={`/details/components/${encodeURIComponent(moduleName)}/${encodeURIComponent(component.name)}`}>
                                  <Component className="h-3 w-3 text-accent-green" />
                                  <span className="font-mono">{component.name}</span>
                                </Link>
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* API Server */}
              {hasApiToolsToShow && (
                <div className="rounded-lg border p-4 bg-purple-500/10 border-purple-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-purple-600">API Server</span>
                    <Badge variant="secondary" className="text-xs">
                      {relatedApiTools.length} tools
                    </Badge>
                  </div>

                  <div>
                    <h5 className="text-xs font-medium text-purple-500 mb-1.5 flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      API Tools ({relatedApiTools.length})
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {relatedApiTools.map((tool) => (
                        <Button
                          key={tool.name}
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1.5 text-xs border-purple-500/30 hover:border-purple-500/50 bg-background/50"
                        >
                          <Link href={`/apps/mcp/tools/${tool.name}`}>
                            <Wrench className="h-3 w-3 text-purple-500" />
                            <span className="font-mono">{tool.name}</span>
                          </Link>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Prev/Next navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        {prevTable ? (
          <Button asChild variant="ghost" className="gap-2">
            <Link href={`${urlPrefix}/${encodeURIComponent(prevTable.name)}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="font-mono">{prevTable.name}</span>
            </Link>
          </Button>
        ) : (
          <div />
        )}
        <Button asChild variant="outline">
          <Link href={dbName ? `/db-schema/${encodeURIComponent(dbName)}` : "/db-schema"}>
            <Database className="mr-2 h-4 w-4" />
            All Tables
          </Link>
        </Button>
        {nextTable ? (
          <Button asChild variant="ghost" className="gap-2">
            <Link href={`${urlPrefix}/${encodeURIComponent(nextTable.name)}`}>
              <span className="font-mono">{nextTable.name}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
