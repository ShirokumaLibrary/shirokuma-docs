/**
 * DocParamsTable - パラメータテーブル
 *
 * API ツールやServer Actionsのパラメータを表示するテーブル
 */

import { Badge } from "@/components/ui/badge";
import { DocTable, type DocTableColumn } from "./doc-table";

export interface ApiParam {
  name: string;
  type: string;
  description?: string;
  required: boolean;
}

interface DocParamsTableProps {
  params: ApiParam[];
  emptyMessage?: string;
}

export function DocParamsTable({
  params,
  emptyMessage = "パラメータなし",
}: DocParamsTableProps) {
  const columns: DocTableColumn<ApiParam>[] = [
    {
      key: "name",
      header: "Name",
      width: "150px",
      render: (_, row) => (
        <code className="text-sm font-mono text-primary">{row.name}</code>
      ),
    },
    {
      key: "type",
      header: "Type",
      width: "120px",
      render: (_, row) => (
        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
          {row.type}
        </code>
      ),
    },
    {
      key: "required",
      header: "Required",
      width: "80px",
      align: "center",
      render: (_, row) => (
        <Badge
          variant={row.required ? "default" : "secondary"}
          className="text-xs"
        >
          {row.required ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (_, row) => (
        <span className="text-sm text-muted-foreground">
          {row.description || "-"}
        </span>
      ),
    },
  ];

  return <DocTable columns={columns} data={params} emptyMessage={emptyMessage} />;
}
