/**
 * Feature Map - ドキュメント形式表示
 *
 * ダッシュボード統計をテーブル・アコーディオン形式で表示
 */

import Link from "next/link";
import {
  FlaskConical,
  Monitor,
  Component,
  Zap,
  Database,
  ArrowRight,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DocSection, DocTable, type DocTableColumn } from "@/components/document";

interface AppStat {
  app: { id: string; name: string; description?: string };
  screens: number;
  components: number;
  actions: number;
  total: number;
}

interface LayerItem {
  name: string;
  count: number;
  percentage: number;
}

interface ModuleItem {
  name: string;
  count: number;
}

interface FeatureMapDocumentProps {
  totalModules: number;
  totalLayerItems: number;
  totalScreens: number;
  totalComponents: number;
  totalActions: number;
  totalTables: number;
  totalTests: number;
  totalTestedItems: number;
  totalItems: number;
  coveragePercent: number;
  appStats: AppStat[];
  layerDistribution: LayerItem[];
  moduleOverview: ModuleItem[];
  generatedAt?: string;
}

export function FeatureMapDocument({
  totalModules,
  totalLayerItems,
  totalScreens,
  totalComponents,
  totalActions,
  totalTables,
  totalTests,
  totalTestedItems,
  totalItems,
  coveragePercent,
  appStats,
  layerDistribution,
  moduleOverview,
  generatedAt,
}: FeatureMapDocumentProps) {
  // Summary table columns
  const summaryData = [
    { metric: "総モジュール数", value: totalModules, unit: "modules" },
    { metric: "総アイテム数", value: totalLayerItems, unit: "items" },
    { metric: "テストカバレッジ", value: coveragePercent, unit: "%" },
    { metric: "総テスト数", value: totalTests, unit: "tests" },
  ];

  const summaryColumns: DocTableColumn<typeof summaryData[0]>[] = [
    { key: "metric", header: "項目", width: "200px" },
    {
      key: "value",
      header: "値",
      width: "100px",
      align: "right",
      render: (_, row) => (
        <span className="text-lg font-bold">{row.value}</span>
      ),
    },
    { key: "unit", header: "単位", width: "80px" },
  ];

  // Layer distribution columns
  const layerColumns: DocTableColumn<LayerItem>[] = [
    {
      key: "name",
      header: "レイヤー",
      width: "150px",
      render: (_, row) => {
        const icons: Record<string, typeof Monitor> = {
          Screens: Monitor,
          Components: Component,
          Actions: Zap,
          Tables: Database,
        };
        const Icon = icons[row.name] || Layers;
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span>{row.name}</span>
          </div>
        );
      },
    },
    {
      key: "count",
      header: "数",
      width: "80px",
      align: "right",
      render: (_, row) => <span className="font-mono">{row.count}</span>,
    },
    {
      key: "percentage",
      header: "割合",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Progress value={row.percentage} className="h-2 flex-1" />
          <span className="text-sm text-muted-foreground w-12 text-right">
            {row.percentage}%
          </span>
        </div>
      ),
    },
  ];

  // App stats columns
  const appColumns: DocTableColumn<AppStat>[] = [
    {
      key: "app.name",
      header: "アプリ",
      width: "200px",
      render: (_, row) => (
        <Link
          href={`/apps/${row.app.id}/feature-map`}
          className="font-medium text-primary hover:underline flex items-center gap-1"
        >
          {row.app.name}
          <ArrowRight className="h-3 w-3" />
        </Link>
      ),
    },
    {
      key: "screens",
      header: "Screens",
      width: "80px",
      align: "right",
      render: (_, row) => (
        <span className="flex items-center justify-end gap-1">
          <Monitor className="h-3 w-3 text-muted-foreground" />
          {row.screens}
        </span>
      ),
    },
    {
      key: "components",
      header: "Components",
      width: "100px",
      align: "right",
      render: (_, row) => (
        <span className="flex items-center justify-end gap-1">
          <Component className="h-3 w-3 text-muted-foreground" />
          {row.components}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: "80px",
      align: "right",
      render: (_, row) => (
        <span className="flex items-center justify-end gap-1">
          <Zap className="h-3 w-3 text-muted-foreground" />
          {row.actions}
        </span>
      ),
    },
    {
      key: "total",
      header: "合計",
      width: "80px",
      align: "right",
      render: (_, row) => (
        <Badge variant="secondary">{row.total}</Badge>
      ),
    },
  ];

  // Module overview columns
  const moduleColumns: DocTableColumn<ModuleItem>[] = [
    { key: "name", header: "モジュール" },
    {
      key: "count",
      header: "アイテム数",
      width: "100px",
      align: "right",
      render: (_, row) => <Badge variant="secondary">{row.count}</Badge>,
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

      {/* Summary Section */}
      <DocSection
        title="サマリー"
        variant="info"
        icon={<Layers className="h-4 w-4" />}
        preview={`${totalModules} modules, ${totalLayerItems} items, ${coveragePercent}%`}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <DocTable columns={summaryColumns} data={summaryData} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>テストカバレッジ</span>
              <span className="font-medium">{coveragePercent}%</span>
            </div>
            <Progress value={coveragePercent} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {totalTestedItems} / {totalItems} items tested
            </p>
          </div>
        </div>
      </DocSection>

      {/* Layer Distribution */}
      <DocSection
        title="レイヤー分布"
        variant="primary"
        badge={<Badge variant="outline">{totalLayerItems} items</Badge>}
        preview={`Screens:${totalScreens}, Components:${totalComponents}, Actions:${totalActions}`}
      >
        <DocTable columns={layerColumns} data={layerDistribution} />
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1">
            <Monitor className="h-4 w-4 text-blue-500" /> Screens: {totalScreens}
          </span>
          <span className="flex items-center gap-1">
            <Component className="h-4 w-4 text-green-500" /> Components: {totalComponents}
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-4 w-4 text-yellow-500" /> Actions: {totalActions}
          </span>
          <span className="flex items-center gap-1">
            <Database className="h-4 w-4 text-purple-500" /> Tables: {totalTables}
          </span>
        </div>
      </DocSection>

      {/* App-specific Feature Maps */}
      {appStats.length > 0 && (
        <DocSection
          title="アプリ別 Feature Map"
          variant="success"
          badge={<Badge variant="outline">{appStats.length} apps</Badge>}
          preview={appStats.slice(0, 2).map(a => a.app.name).join(", ")}
        >
          <DocTable columns={appColumns} data={appStats} />
        </DocSection>
      )}

      {/* Module Overview */}
      <DocSection
        title="モジュール概要"
        badge={<Badge variant="outline">{totalModules} modules</Badge>}
      >
        <DocTable columns={moduleColumns} data={moduleOverview} />
      </DocSection>

      {/* Quick Links */}
      <DocSection title="関連ページ">
        <div className="flex flex-wrap gap-4">
          <Link
            href="/db-schema"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <Database className="h-4 w-4" />
            DB Schema ({totalTables} tables)
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/test-cases"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <FlaskConical className="h-4 w-4" />
            Test Cases ({totalTests} tests)
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </DocSection>
    </div>
  );
}
