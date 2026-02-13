/**
 * DB Schema Table List - ドキュメント形式表示
 *
 * テーブル一覧をカテゴリ別のアコーディオン・テーブル形式で表示
 */

import Link from "next/link";
import { Database, Link2, Key, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DocSection, DocTable, type DocTableColumn } from "@/components/document";
import type { DbTable, DbSchemaData } from "@/lib/types";
import {
  normalizeCategory,
  inferCategory,
  getCategoryConfig,
} from "@/lib/db-schema-utils";

interface DbSchemaTableListDocumentProps {
  data: DbSchemaData;
  /** Database name for URL prefix (multi-DB mode) */
  dbName?: string;
}

interface TableRowData {
  name: string;
  columnCount: number;
  fkCount: number;
  description?: string;
  primaryKeys: string[];
}

/**
 * Database Schema Table List - Document Format
 */
export function DbSchemaTableListDocument({
  data,
  dbName,
}: DbSchemaTableListDocumentProps) {
  // URL prefix for links
  const urlPrefix = dbName
    ? `/db-schema/${encodeURIComponent(dbName)}`
    : "/db-schema";

  // Group tables by category
  const tablesByCategory = new Map<string, DbTable[]>();
  for (const table of data.tables) {
    const category =
      normalizeCategory(table.category) || inferCategory(table.name);
    if (!tablesByCategory.has(category)) {
      tablesByCategory.set(category, []);
    }
    tablesByCategory.get(category)!.push(table);
  }

  // Sort categories by table count
  const sortedCategories = Array.from(tablesByCategory.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  // Calculate totals
  const totalColumns = data.tables.reduce(
    (sum, t) => sum + (t.columns?.length ?? t.columnCount ?? 0),
    0
  );
  const totalFKs = data.tables.reduce(
    (sum, t) => sum + (t.foreignKeys?.length ?? 0),
    0
  );

  // Table columns definition
  const tableColumns: DocTableColumn<TableRowData>[] = [
    {
      key: "name",
      header: "Table",
      width: "200px",
      render: (_, row) => (
        <Link
          href={`${urlPrefix}/${encodeURIComponent(row.name)}`}
          className="font-medium text-primary hover:underline font-mono text-sm"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "columnCount",
      header: "Columns",
      width: "100px",
      align: "center",
      render: (_, row) => row.columnCount,
    },
    {
      key: "fkCount",
      header: "FK",
      width: "80px",
      align: "center",
      render: (_, row) =>
        row.fkCount > 0 ? (
          <span className="flex items-center justify-center gap-1">
            <Link2 className="h-3 w-3" />
            {row.fkCount}
          </span>
        ) : (
          "-"
        ),
    },
    {
      key: "primaryKeys",
      header: "Primary Keys",
      width: "150px",
      render: (_, row) =>
        row.primaryKeys.length > 0 ? (
          <span className="flex items-center gap-1 text-xs font-mono">
            <Key className="h-3 w-3" />
            {row.primaryKeys.join(", ")}
          </span>
        ) : (
          "-"
        ),
    },
    {
      key: "description",
      header: "Description",
      render: (_, row) => row.description || "-",
    },
  ];

  // Convert table to row data
  function tableToRowData(table: DbTable): TableRowData {
    const primaryKeys =
      table.columns?.filter((c) => c.primaryKey).map((c) => c.name) || [];
    return {
      name: table.name,
      columnCount: table.columns?.length ?? table.columnCount ?? 0,
      fkCount: table.foreignKeys?.length ?? 0,
      description: table.description,
      primaryKeys,
    };
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <DocSection
        title="サマリー"
        variant="info"
        icon={<Database className="h-4 w-4" />}
        preview={`${data.tables.length} tables, ${totalColumns} cols, ${totalFKs} FKs`}
      >
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Database className="h-4 w-4 text-purple-500" />
            {data.tables.length} tables
          </span>
          <span className="flex items-center gap-1">
            <Layers className="h-4 w-4 text-blue-500" />
            {totalColumns} columns
          </span>
          <span className="flex items-center gap-1">
            <Link2 className="h-4 w-4 text-green-500" />
            {totalFKs} foreign keys
          </span>
          <span className="text-muted-foreground">
            ({sortedCategories.length} categories)
          </span>
        </div>
      </DocSection>

      {/* Categories */}
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

        const rowData = tables.map(tableToRowData);

        return (
          <DocSection
            key={category}
            title={config.label}
            badge={
              <div className="flex items-center gap-2">
                <Badge variant="outline">{tables.length} tables</Badge>
                <span className="text-xs text-muted-foreground">
                  {totalCols} cols
                  {totalRels > 0 && ` · ${totalRels} FKs`}
                </span>
              </div>
            }
            preview={tables.slice(0, 3).map(t => t.name).join(", ")}
          >
            <DocTable columns={tableColumns} data={rowData} />
          </DocSection>
        );
      })}

      {/* Diagram Link */}
      <DocSection title="関連ページ">
        <div className="flex flex-wrap gap-4">
          <Link
            href={`${urlPrefix}/diagram`}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Database className="h-4 w-4" />
            ER Diagram (Full Screen)
          </Link>
        </div>
      </DocSection>

      {/* Footer */}
      {data.generatedAt && (
        <div className="text-sm text-muted-foreground text-right">
          Generated: {new Date(data.generatedAt).toLocaleString("ja-JP")}
        </div>
      )}
    </div>
  );
}
