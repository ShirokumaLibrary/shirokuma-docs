/**
 * Table Detail - ドキュメント形式表示
 *
 * テーブル詳細をテーブル・アコーディオン形式で表示
 * 視線移動を減らすため、タグではなくテーブル形式を使用
 */

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
  Code,
  Monitor,
  Component,
  Bot,
  Wrench,
} from "lucide-react";
import type {
  FeatureMapData,
  ActionItem,
  ScreenItem,
  ComponentItem,
  DbTable,
  DbColumn,
  DbSchemaData,
  ApiToolsData,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocSection, DocTable, type DocTableColumn } from "@/components/document";
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

// Column row type for table
interface ColumnRow {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isUnique: boolean;
  isRequired: boolean;
  referencedTable?: string;
  description?: string;
  defaultValue?: string;
}

// Relationship row types
interface ReferenceRow {
  column: string;
  targetTable: string;
  targetColumn: string;
}

interface ReferencedByRow {
  sourceTable: string;
  sourceColumn: string;
}

// Related table row
interface RelatedTableRow {
  name: string;
  columnCount: number;
}

// Usage row types
interface ActionRow {
  name: string;
  module: string;
  app?: string;
}

interface ScreenRow {
  name: string;
  module: string;
  app?: string;
}

interface ApiToolRow {
  name: string;
  description: string;
}

interface TableDetailDocumentProps {
  table: DbTable;
  allTables: DbTable[];
  featureMap: FeatureMapData | null;
  apiTools: ApiToolsData | null;
  urlPrefix: string;
  dbName?: string;
}

/**
 * Table Detail Document Component
 */
export function TableDetailDocument({
  table,
  allTables,
  featureMap,
  apiTools,
  urlPrefix,
  dbName,
}: TableDetailDocumentProps) {
  const tableName = table.name;
  const category = normalizeCategory(table.category);
  const config = getCategoryConfig(category);
  const columnCount = table.columns?.length ?? table.columnCount ?? 0;

  // Build FK map
  const foreignKeyMap = new Map<string, { table: string; column: string }>();
  if (table.foreignKeys) {
    for (const fk of table.foreignKeys) {
      foreignKeyMap.set(fk.column, { table: fk.references.table, column: fk.references.column });
    }
  }

  // Find tables that reference this table
  const referencedBy: ReferencedByRow[] = [];
  for (const t of allTables) {
    if (t.foreignKeys) {
      for (const fk of t.foreignKeys) {
        if (fk.references.table === tableName) {
          referencedBy.push({ sourceTable: t.name, sourceColumn: fk.column });
        }
      }
    }
  }

  // Find same-category tables for navigation
  const sameCategoryTables: RelatedTableRow[] = allTables
    .filter((t) => normalizeCategory(t.category) === category && t.name !== tableName)
    .slice(0, 10)
    .map((t) => ({
      name: t.name,
      columnCount: t.columns?.length ?? t.columnCount ?? 0,
    }));

  // Find related Feature Map items
  const relatedFeatureItems = featureMap
    ? findRelatedFeatureItems(tableName, featureMap)
    : null;

  // Find related API tools
  const relatedApiTools = findRelatedApiTools(tableName, apiTools);

  // Find prev/next table
  const tableIndex = allTables.findIndex((t) => t.name === tableName);
  const prevTable = tableIndex > 0 ? allTables[tableIndex - 1] : null;
  const nextTable = tableIndex < allTables.length - 1 ? allTables[tableIndex + 1] : null;

  // Prepare column data
  const columnRows: ColumnRow[] = (table.columns || []).map((col) => {
    const fk = foreignKeyMap.get(col.name);
    return {
      name: col.name,
      type: col.type,
      isPrimaryKey: col.primaryKey || false,
      isUnique: col.unique || false,
      isRequired: !col.nullable && !col.primaryKey,
      referencedTable: fk?.table,
      description: col.description,
      defaultValue: col.default,
    };
  });

  // Prepare reference data
  const referenceRows: ReferenceRow[] = (table.foreignKeys || []).map((fk) => ({
    column: fk.column,
    targetTable: fk.references.table,
    targetColumn: fk.references.column,
  }));

  // Prepare usage data
  const actionRows: ActionRow[] = (relatedFeatureItems?.actions || []).map(({ moduleName, action }) => ({
    name: action.name,
    module: moduleName,
    app: action.app,
  }));

  const screenRows: ScreenRow[] = (relatedFeatureItems?.screens || []).map(({ moduleName, screen }) => ({
    name: screen.name,
    module: moduleName,
    app: screen.app,
  }));

  const apiToolRows: ApiToolRow[] = relatedApiTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
  }));

  // Column definitions
  const columnColumns: DocTableColumn<ColumnRow>[] = [
    {
      key: "name",
      header: "Column",
      width: "180px",
      render: (_, row) => <span className="font-mono font-medium">{row.name}</span>,
    },
    {
      key: "type",
      header: "Type",
      width: "140px",
      render: (_, row) => (
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.type}</code>
      ),
    },
    {
      key: "constraints",
      header: "Constraints",
      width: "200px",
      render: (_, row) => (
        <div className="flex flex-wrap gap-1">
          {row.isPrimaryKey && (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs">
              <Key className="mr-1 h-3 w-3" />
              PK
            </Badge>
          )}
          {row.isUnique && !row.isPrimaryKey && (
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 text-xs">
              <Hash className="mr-1 h-3 w-3" />
              Unique
            </Badge>
          )}
          {row.isRequired && (
            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 text-xs">
              Required
            </Badge>
          )}
          {row.referencedTable && (
            <Link href={`${urlPrefix}/${encodeURIComponent(row.referencedTable)}`}>
              <Badge className="bg-accent-purple/10 text-accent-purple border-0 cursor-pointer hover:bg-accent-purple/20 text-xs">
                <Database className="mr-1 h-3 w-3" />
                → {row.referencedTable}
              </Badge>
            </Link>
          )}
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (_, row) => row.description || "-",
    },
    {
      key: "defaultValue",
      header: "Default",
      width: "120px",
      render: (_, row) =>
        row.defaultValue ? (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.defaultValue}</code>
        ) : (
          "-"
        ),
    },
  ];

  // Reference columns
  const referenceColumns: DocTableColumn<ReferenceRow>[] = [
    {
      key: "column",
      header: "Column",
      width: "200px",
      render: (_, row) => <span className="font-mono">{row.column}</span>,
    },
    {
      key: "targetTable",
      header: "References Table",
      width: "200px",
      render: (_, row) => (
        <Link
          href={`${urlPrefix}/${encodeURIComponent(row.targetTable)}`}
          className="font-mono text-primary hover:underline"
        >
          {row.targetTable}
        </Link>
      ),
    },
    {
      key: "targetColumn",
      header: "Target Column",
      render: (_, row) => <span className="font-mono">{row.targetColumn}</span>,
    },
  ];

  // Referenced by columns
  const referencedByColumns: DocTableColumn<ReferencedByRow>[] = [
    {
      key: "sourceTable",
      header: "Table",
      width: "200px",
      render: (_, row) => (
        <Link
          href={`${urlPrefix}/${encodeURIComponent(row.sourceTable)}`}
          className="font-mono text-primary hover:underline"
        >
          {row.sourceTable}
        </Link>
      ),
    },
    {
      key: "sourceColumn",
      header: "Column",
      render: (_, row) => <span className="font-mono">{row.sourceColumn}</span>,
    },
  ];

  // Related table columns
  const relatedTableColumns: DocTableColumn<RelatedTableRow>[] = [
    {
      key: "name",
      header: "Table",
      width: "200px",
      render: (_, row) => (
        <Link
          href={`${urlPrefix}/${encodeURIComponent(row.name)}`}
          className="font-mono text-primary hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "columnCount",
      header: "Columns",
      width: "100px",
      align: "right",
      render: (_, row) => row.columnCount,
    },
  ];

  // Action columns
  const actionColumns: DocTableColumn<ActionRow>[] = [
    {
      key: "name",
      header: "Action",
      width: "250px",
      render: (_, row) => (
        <Link
          href={`/details/actions/${encodeURIComponent(row.module)}/${encodeURIComponent(row.name)}`}
          className="font-mono text-primary hover:underline flex items-center gap-1"
        >
          <Code className="h-3 w-3 text-accent-yellow" />
          {row.name}
        </Link>
      ),
    },
    {
      key: "module",
      header: "Module",
      width: "150px",
    },
    {
      key: "app",
      header: "App",
      width: "100px",
      render: (_, row) => row.app || "-",
    },
  ];

  // Screen columns
  const screenColumns: DocTableColumn<ScreenRow>[] = [
    {
      key: "name",
      header: "Screen",
      width: "250px",
      render: (_, row) => (
        <Link
          href={`/details/screens/${encodeURIComponent(row.module)}/${encodeURIComponent(row.name)}`}
          className="font-mono text-primary hover:underline flex items-center gap-1"
        >
          <Monitor className="h-3 w-3 text-accent-blue" />
          {row.name}
        </Link>
      ),
    },
    {
      key: "module",
      header: "Module",
      width: "150px",
    },
    {
      key: "app",
      header: "App",
      width: "100px",
      render: (_, row) => row.app || "-",
    },
  ];

  // API Tool columns
  const apiToolColumns: DocTableColumn<ApiToolRow>[] = [
    {
      key: "name",
      header: "Tool",
      width: "250px",
      render: (_, row) => (
        <Link
          href={`/apps/mcp/tools/${row.name}`}
          className="font-mono text-primary hover:underline flex items-center gap-1"
        >
          <Wrench className="h-3 w-3 text-purple-500" />
          {row.name}
        </Link>
      ),
    },
    {
      key: "description",
      header: "Description",
    },
  ];

  // Summary data
  const summaryData = [
    { metric: "Columns", value: columnCount },
    { metric: "Foreign Keys", value: table.foreignKeys?.length ?? 0 },
    { metric: "Referenced By", value: referencedBy.length },
    { metric: "Indexes", value: table.indexes?.length ?? 0 },
    { metric: "Used By Actions", value: actionRows.length },
    { metric: "API Tools", value: apiToolRows.length },
  ];

  const summaryColumns: DocTableColumn<(typeof summaryData)[0]>[] = [
    { key: "metric", header: "Metric", width: "150px" },
    {
      key: "value",
      header: "Count",
      width: "80px",
      align: "right",
      render: (_, row) => <span className="font-bold">{row.value}</span>,
    },
  ];

  return (
    <div className="space-y-6">
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
            {table.file && (
              <p className="mt-1 text-sm text-muted-foreground flex items-center gap-1">
                <FileCode className="h-3.5 w-3.5" />
                Defined in <code className="rounded bg-muted px-1">{table.file}</code>
              </p>
            )}
          </div>
        </div>
        {table.description && table.description !== "*" && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {table.description}
            </p>
          </div>
        )}
      </header>

      {/* Summary */}
      <DocSection
        title="サマリー"
        variant="info"
        icon={<Database className="h-4 w-4" />}
        preview={`${columnCount} cols, ${table.foreignKeys?.length ?? 0} FK`}
        defaultOpen
      >
        <DocTable columns={summaryColumns} data={summaryData} />
      </DocSection>

      {/* Columns */}
      <DocSection
        title="カラム一覧"
        variant="primary"
        icon={<Table2 className="h-4 w-4" />}
        badge={<Badge variant="outline">{columnCount}</Badge>}
        preview={columnRows.slice(0, 3).map(r => r.name).join(", ") + (columnRows.length > 3 ? "..." : "")}
        defaultOpen
      >
        {columnRows.length > 0 ? (
          <DocTable columns={columnColumns} data={columnRows} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Column details not available. Run <code className="rounded bg-muted px-1">shirokuma-docs schema --full</code> to generate.
          </p>
        )}
      </DocSection>

      {/* Indexes */}
      {table.indexes && table.indexes.length > 0 && (
        <DocSection
          title="インデックス"
          variant="cyan"
          icon={<Hash className="h-4 w-4" />}
          badge={<Badge variant="outline">{table.indexes.length}</Badge>}
          preview={table.indexes.slice(0, 2).map(i => i.name).join(", ")}
          defaultOpen
        >
          <DocTable
            columns={[
              { key: "name", header: "Name", width: "200px", render: (_, row) => <span className="font-mono">{row.name}</span> },
              { key: "columns", header: "Columns", render: (_, row) => row.columns?.join(", ") || "-" },
              { key: "unique", header: "Unique", width: "80px", align: "center", render: (_, row) => row.unique ? "Yes" : "-" },
              { key: "description", header: "Description", render: (_, row) => row.description || "-" },
            ]}
            data={table.indexes}
          />
        </DocSection>
      )}

      {/* Relationships - References */}
      {referenceRows.length > 0 && (
        <DocSection
          title="外部キー参照 (このテーブル → 他テーブル)"
          variant="purple"
          icon={<ArrowRight className="h-4 w-4" />}
          badge={<Badge variant="outline">{referenceRows.length}</Badge>}
          preview={referenceRows.slice(0, 2).map(r => `→${r.targetTable}`).join(", ")}
          defaultOpen
        >
          <DocTable columns={referenceColumns} data={referenceRows} />
        </DocSection>
      )}

      {/* Relationships - Referenced By */}
      {referencedBy.length > 0 && (
        <DocSection
          title="被参照 (他テーブル → このテーブル)"
          variant="success"
          icon={<ArrowLeft className="h-4 w-4" />}
          badge={<Badge variant="outline">{referencedBy.length}</Badge>}
          preview={referencedBy.slice(0, 2).map(r => `${r.sourceTable}←`).join(", ")}
          defaultOpen
        >
          <DocTable columns={referencedByColumns} data={referencedBy} />
        </DocSection>
      )}

      {/* Related Tables */}
      {sameCategoryTables.length > 0 && (
        <DocSection
          title={`関連テーブル (${config.label})`}
          variant="default"
          icon={<Link2 className="h-4 w-4" />}
          badge={<Badge variant="outline">{sameCategoryTables.length}</Badge>}
          preview={sameCategoryTables.slice(0, 3).map(t => t.name).join(", ")}
          defaultOpen
        >
          <DocTable columns={relatedTableColumns} data={sameCategoryTables} />
        </DocSection>
      )}

      {/* Usage - Actions */}
      {actionRows.length > 0 && (
        <DocSection
          title="使用するServer Actions"
          variant="warning"
          icon={<Code className="h-4 w-4" />}
          badge={<Badge variant="outline">{actionRows.length}</Badge>}
          preview={actionRows.slice(0, 2).map(a => a.name).join(", ")}
          defaultOpen
        >
          <DocTable columns={actionColumns} data={actionRows} />
        </DocSection>
      )}

      {/* Usage - Screens */}
      {screenRows.length > 0 && (
        <DocSection
          title="使用する画面"
          variant="info"
          icon={<Monitor className="h-4 w-4" />}
          badge={<Badge variant="outline">{screenRows.length}</Badge>}
          preview={screenRows.slice(0, 2).map(s => s.name).join(", ")}
          defaultOpen
        >
          <DocTable columns={screenColumns} data={screenRows} />
        </DocSection>
      )}

      {/* Usage - API Tools */}
      {apiToolRows.length > 0 && (
        <DocSection
          title="使用するAPIツール"
          variant="purple"
          icon={<Bot className="h-4 w-4" />}
          badge={<Badge variant="outline">{apiToolRows.length}</Badge>}
          preview={apiToolRows.slice(0, 2).map(t => t.name).join(", ")}
          defaultOpen
        >
          <DocTable columns={apiToolColumns} data={apiToolRows} />
        </DocSection>
      )}

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
