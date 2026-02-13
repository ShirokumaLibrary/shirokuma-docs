import Link from "next/link";
import {
  Database,
  Maximize2,
  Link2,
  Layers,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DbTable, DbSchemaData } from "@/lib/types";
import { ReactFlowErDiagram } from "@/components/reactflow-er-diagram";
import {
  normalizeCategory,
  inferCategory,
  getCategoryConfig,
} from "@/lib/db-schema-utils";

interface DbSchemaTableListProps {
  data: DbSchemaData;
  /** Database name for URL prefix (multi-DB mode) */
  dbName?: string;
}

/**
 * Database Schema Table List Component (Server Component)
 *
 * Displays tables grouped by category with ER diagram
 * Used for both single-DB and per-DB pages in multi-DB mode
 */
export function DbSchemaTableList({ data, dbName }: DbSchemaTableListProps) {
  // URL prefix for links
  const urlPrefix = dbName ? `/db-schema/${encodeURIComponent(dbName)}` : "/db-schema";

  // Group tables by category
  const tablesByCategory = new Map<string, DbTable[]>();
  for (const table of data.tables) {
    const category = normalizeCategory(table.category) || inferCategory(table.name);
    if (!tablesByCategory.has(category)) {
      tablesByCategory.set(category, []);
    }
    tablesByCategory.get(category)!.push(table);
  }

  // Sort categories by table count
  const sortedCategories = Array.from(tablesByCategory.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  // Prepare data for ER diagram
  const drawflowTables = data.tables.map((table) => ({
    name: table.name,
    category: normalizeCategory(table.category) || inferCategory(table.name),
    columns: table.columns?.map((col) => ({
      name: col.name,
      type: col.type.split(" ")[0],
      primaryKey: col.primaryKey,
    })),
  }));

  const drawflowForeignKeys: {
    table: string;
    column: string;
    referencesTable: string;
    referencesColumn: string;
  }[] = [];
  for (const table of data.tables) {
    if (table.foreignKeys) {
      for (const fk of table.foreignKeys) {
        drawflowForeignKeys.push({
          table: table.name,
          column: fk.column,
          referencesTable: fk.references.table,
          referencesColumn: fk.references.column,
        });
      }
    }
  }

  const totalColumns = data.tables.reduce(
    (sum, t) => sum + (t.columns?.length ?? t.columnCount ?? 0),
    0
  );
  const totalFKs = data.tables.reduce(
    (sum, t) => sum + (t.foreignKeys?.length ?? 0),
    0
  );

  // Get database info if available
  const dbInfo = data.databases?.[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2">
            <Database className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {dbName ? (
                <>
                  <span className="text-muted-foreground font-normal">Database:</span>{" "}
                  <span className="font-mono">{dbName}</span>
                </>
              ) : (
                "Database Schema"
              )}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {data.tables.length} tables - {totalColumns} columns - {totalFKs} relationships
            </p>
            {dbInfo?.description && (
              <p className="mt-1 text-sm text-muted-foreground">{dbInfo.description}</p>
            )}
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Tables</CardDescription>
            <CardTitle className="text-3xl">{data.tables.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Columns</CardDescription>
            <CardTitle className="text-3xl">{totalColumns}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Foreign Keys</CardDescription>
            <CardTitle className="text-3xl">{totalFKs}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Category Summary */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Categories
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedCategories.map(([category, tables]) => {
            const config = getCategoryConfig(category);
            const totalCols = tables.reduce(
              (sum, t) => sum + (t.columns?.length ?? t.columnCount ?? 0),
              0
            );
            const totalRels = tables.reduce(
              (sum, t) => sum + (t.foreignKeys?.length ?? 0),
              0
            );

            return (
              <Card key={category} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${config.bgColor}`}>
                      <Database className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{config.label}</CardTitle>
                      <CardDescription>
                        {tables.length} tables - {totalCols} cols
                        {totalRels > 0 && ` - ${totalRels} FKs`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {tables.map((table) => {
                      const columnCount =
                        table.columns?.length ?? table.columnCount ?? 0;
                      const fkCount = table.foreignKeys?.length ?? 0;

                      return (
                        <Link
                          key={table.name}
                          href={`${urlPrefix}/${encodeURIComponent(table.name)}`}
                          className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-1 rounded bg-muted hover:bg-muted/80 hover:text-primary transition-colors group"
                        >
                          <span>{table.name}</span>
                          <span className="text-muted-foreground text-[10px]">
                            {columnCount}
                            {fkCount > 0 && (
                              <Link2 className="inline h-2.5 w-2.5 ml-0.5" />
                            )}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ER Diagram */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            ER Diagram
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href={`${urlPrefix}/diagram`}>
              <Maximize2 className="h-4 w-4 mr-2" />
              Full Screen
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-0">
            <div className="h-[500px] rounded-lg overflow-hidden">
              <ReactFlowErDiagram
                tables={drawflowTables}
                foreignKeys={drawflowForeignKeys}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      {data.generatedAt && (
        <footer className="text-center text-sm text-muted-foreground">
          Generated at {new Date(data.generatedAt).toLocaleString()}
        </footer>
      )}
    </div>
  );
}
