/**
 * App Feature Map - ドキュメント形式表示
 *
 * アプリ別の機能マップをテーブル・アコーディオン形式で表示
 */

import Link from "next/link";
import {
  Monitor,
  Component,
  Zap,
  Database,
  Package,
  FlaskConical,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DocSection, DocTable, type DocTableColumn } from "@/components/document";
import type {
  FeatureMapData,
  FeatureGroup,
  ScreenItem,
  ComponentItem,
  ActionItem,
  TableItem,
} from "@/lib/types";

interface ModuleCoverage {
  totalTests: number;
  testedItems: number;
  totalItems: number;
  averageCoverage: number;
}

interface FeatureMapAppDocumentProps {
  data: FeatureMapData;
  moduleCoverages: Record<string, ModuleCoverage>;
  appId: string;
}

/**
 * モジュールセクション
 */
function ModuleSection({
  moduleName,
  group,
  coverage,
  appId,
}: {
  moduleName: string;
  group: FeatureGroup;
  coverage?: ModuleCoverage;
  appId: string;
}) {
  const screenCount = group.screens?.length || 0;
  const componentCount = group.components?.length || 0;
  const actionCount = group.actions?.length || 0;
  const tableCount = group.tables?.length || 0;
  const totalCount = screenCount + componentCount + actionCount + tableCount;

  if (totalCount === 0) return null;

  // Screen columns
  const screenColumns: DocTableColumn<ScreenItem>[] = [
    {
      key: "name",
      header: "Name",
      width: "200px",
      render: (_, row) => (
        <Link
          href={`/details/screens/${moduleName}/${row.name}`}
          className="font-medium text-primary hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    { key: "path", header: "Path" },
    {
      key: "route",
      header: "Route",
      width: "150px",
      render: (_, row) => row.route || "-",
    },
  ];

  // Component columns
  const componentColumns: DocTableColumn<ComponentItem>[] = [
    {
      key: "name",
      header: "Name",
      width: "200px",
      render: (_, row) => (
        <Link
          href={`/details/components/${moduleName}/${row.name}`}
          className="font-medium text-primary hover:underline"
        >
          {row.name}
        </Link>
      ),
    },
    { key: "path", header: "Path" },
    {
      key: "props",
      header: "Props",
      width: "80px",
      align: "center",
      render: (_, row) => row.props?.length || "-",
    },
  ];

  // Action columns
  const actionColumns: DocTableColumn<ActionItem>[] = [
    {
      key: "name",
      header: "Name",
      width: "200px",
      render: (_, row) => (
        <Link
          href={`/details/actions/${moduleName}/${row.name}`}
          className="font-medium text-primary hover:underline font-mono text-sm"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "dbTables",
      header: "DB Tables",
      render: (_, row) => {
        const tables = row.dbTables?.join(", ");
        return tables || "-";
      },
    },
    {
      key: "params",
      header: "Params",
      width: "80px",
      align: "center",
      render: (_, row) => row.params?.length || "-",
    },
  ];

  // Table columns
  const tableColumns: DocTableColumn<TableItem>[] = [
    {
      key: "name",
      header: "Name",
      width: "200px",
      render: (_, row) => (
        <Link
          href={`/db-schema/database/${row.name}`}
          className="font-medium text-primary hover:underline font-mono text-sm"
        >
          {row.name}
        </Link>
      ),
    },
    {
      key: "columns",
      header: "Columns",
      width: "80px",
      align: "center",
      render: (_, row) => row.columns?.length || "-",
    },
  ];

  return (
    <DocSection
      title={moduleName}
      badge={
        <div className="flex items-center gap-2">
          <Badge variant="outline">{totalCount} items</Badge>
          {coverage && coverage.totalTests > 0 && (
            <Badge variant="secondary" className="gap-1">
              <FlaskConical className="h-3 w-3" />
              {coverage.totalTests}
            </Badge>
          )}
        </div>
      }
      preview={`${screenCount} screens, ${componentCount} components, ${actionCount} actions`}
    >
      <div className="space-y-6">
        {/* Screens */}
        {screenCount > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium mb-2">
              <Monitor className="h-4 w-4 text-blue-500" />
              Screens ({screenCount})
            </h4>
            <DocTable columns={screenColumns} data={group.screens || []} />
          </div>
        )}

        {/* Components */}
        {componentCount > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium mb-2">
              <Component className="h-4 w-4 text-green-500" />
              Components ({componentCount})
            </h4>
            <DocTable columns={componentColumns} data={group.components || []} />
          </div>
        )}

        {/* Actions */}
        {actionCount > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium mb-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              Server Actions ({actionCount})
            </h4>
            <DocTable columns={actionColumns} data={group.actions || []} />
          </div>
        )}

        {/* Tables */}
        {tableCount > 0 && (
          <div>
            <h4 className="flex items-center gap-2 text-sm font-medium mb-2">
              <Database className="h-4 w-4 text-purple-500" />
              Tables ({tableCount})
            </h4>
            <DocTable columns={tableColumns} data={group.tables || []} />
          </div>
        )}
      </div>
    </DocSection>
  );
}

export function FeatureMapAppDocument({
  data,
  moduleCoverages,
  appId,
}: FeatureMapAppDocumentProps) {
  const moduleNames = Object.keys(data.features).sort();

  // Calculate totals
  let totalScreens = 0;
  let totalComponents = 0;
  let totalActions = 0;
  let totalTables = 0;

  for (const group of Object.values(data.features)) {
    totalScreens += group.screens?.length || 0;
    totalComponents += group.components?.length || 0;
    totalActions += group.actions?.length || 0;
    totalTables += group.tables?.length || 0;
  }

  const totalItems = totalScreens + totalComponents + totalActions + totalTables;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1">
          <Monitor className="h-4 w-4 text-blue-500" /> {totalScreens} Screens
        </span>
        <span className="flex items-center gap-1">
          <Component className="h-4 w-4 text-green-500" /> {totalComponents} Components
        </span>
        <span className="flex items-center gap-1">
          <Zap className="h-4 w-4 text-yellow-500" /> {totalActions} Actions
        </span>
        <span className="flex items-center gap-1">
          <Database className="h-4 w-4 text-purple-500" /> {totalTables} Tables
        </span>
        <span className="text-muted-foreground">
          ({moduleNames.length} modules, {totalItems} total items)
        </span>
      </div>

      {/* Modules */}
      {moduleNames.map((moduleName) => (
        <ModuleSection
          key={moduleName}
          moduleName={moduleName}
          group={data.features[moduleName]}
          coverage={moduleCoverages[moduleName]}
          appId={appId}
        />
      ))}

      {/* Uncategorized */}
      {data.uncategorized && (
        <ModuleSection
          moduleName="Uncategorized"
          group={data.uncategorized}
          coverage={moduleCoverages["Uncategorized"]}
          appId={appId}
        />
      )}
    </div>
  );
}
