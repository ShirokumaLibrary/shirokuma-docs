/**
 * DB Schema Landing Page - ドキュメント形式表示
 *
 * データベース一覧をテーブル形式で表示
 */

import Link from "next/link";
import { Database, Server, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DocSection, DocTable, type DocTableColumn } from "@/components/document";

interface DbInfo {
  name: string;
  description?: string;
  tableCount: number;
}

interface DbSchemaDocumentProps {
  dbList: DbInfo[];
  totalTables: number;
  generatedAt?: string;
}

export function DbSchemaDocument({
  dbList,
  totalTables,
  generatedAt,
}: DbSchemaDocumentProps) {
  // Database list columns
  const dbColumns: DocTableColumn<DbInfo>[] = [
    {
      key: "name",
      header: "Database",
      width: "200px",
      render: (_, row) => (
        <Link
          href={`/db-schema/${encodeURIComponent(row.name)}`}
          className="font-medium text-primary hover:underline flex items-center gap-1 font-mono"
        >
          {row.name}
          <ArrowRight className="h-3 w-3" />
        </Link>
      ),
    },
    {
      key: "tableCount",
      header: "Tables",
      width: "100px",
      align: "right",
      render: (_, row) => (
        <Badge variant="secondary">{row.tableCount}</Badge>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (_, row) => row.description || "-",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Generated timestamp */}
      {generatedAt && (
        <div className="text-sm text-muted-foreground text-right">
          Generated: {new Date(generatedAt).toLocaleString("ja-JP")}
        </div>
      )}

      {/* Summary */}
      <DocSection
        title="サマリー"
        variant="info"
        icon={<Server className="h-4 w-4" />}
        preview={`${dbList.length} DBs, ${totalTables} tables`}
      >
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Server className="h-4 w-4 text-purple-500" />
            {dbList.length === 1 ? "1 database" : `${dbList.length} databases`}
          </span>
          <span className="flex items-center gap-1">
            <Database className="h-4 w-4 text-purple-500" />
            {totalTables} tables total
          </span>
        </div>
      </DocSection>

      {/* Database List */}
      <DocSection
        title="Databases"
        variant="primary"
        badge={<Badge variant="outline">{dbList.length}</Badge>}
        preview={dbList.slice(0, 3).map(d => d.name).join(", ")}
      >
        <DocTable columns={dbColumns} data={dbList} />
      </DocSection>
    </div>
  );
}
