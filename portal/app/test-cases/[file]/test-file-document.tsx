/**
 * Test File Page - ドキュメント形式表示
 *
 * テストファイル内のテストケースをテーブル形式で表示
 */

import Link from "next/link";
import {
  FileCode2,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  Shield,
  AlertCircle,
  Layers,
  GitBranch,
  ExternalLink,
  Bot,
  Wrench,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DocSection, DocTable, type DocTableColumn } from "@/components/document";
import { encodeFilePath } from "@/lib/path-utils";
import type { TestCase } from "@/lib/types";

// MCP tool type
interface ApiTool {
  name: string;
  description: string;
  category?: string;
  tests?: Array<{ target: string; file: string }>;
}

// Category config
const categoryConfig: Record<
  string,
  { icon: React.ElementType; color: string; label: string }
> = {
  "happy-path": { icon: CheckCircle2, color: "text-green-500", label: "正常系" },
  auth: { icon: Shield, color: "text-blue-500", label: "認証" },
  "error-handling": { icon: AlertCircle, color: "text-red-500", label: "異常系" },
  validation: { icon: AlertTriangle, color: "text-yellow-500", label: "バリデーション" },
  "edge-case": { icon: Layers, color: "text-purple-500", label: "境界値" },
  integration: { icon: GitBranch, color: "text-cyan-500", label: "統合" },
  other: { icon: FlaskConical, color: "text-gray-500", label: "その他" },
  success: { icon: CheckCircle2, color: "text-green-500", label: "正常系" },
  error: { icon: AlertCircle, color: "text-red-500", label: "異常系" },
  edge: { icon: Layers, color: "text-purple-500", label: "境界値" },
  unknown: { icon: FlaskConical, color: "text-gray-500", label: "その他" },
};

interface CategoryStatRow {
  category: string;
  label: string;
  count: number;
  color: string;
}

interface ApiToolRow {
  name: string;
  description: string;
}

interface TestRow {
  line: number;
  name: string;
  description?: string;
  category: string;
  categoryLabel: string;
  categoryColor: string;
}

interface TestFileDocumentProps {
  file: string;
  encodedFile: string;
  tests: TestCase[];
  fileStats?: {
    categoryStats?: Record<string, number>;
    module?: { type?: string; detailPath?: string; name?: string };
  };
  relatedApiTools: ApiTool[];
}

export function TestFileDocument({
  file,
  encodedFile,
  tests,
  fileStats,
  relatedApiTools,
}: TestFileDocumentProps) {
  // Group tests by describe
  const testsByDescribe: Record<string, TestCase[]> = {};
  for (const test of tests) {
    const describe = test.describe || "Other";
    if (!testsByDescribe[describe]) {
      testsByDescribe[describe] = [];
    }
    testsByDescribe[describe].push(test);
  }

  // Category stats rows
  const categoryRows: CategoryStatRow[] = fileStats?.categoryStats
    ? Object.entries(fileStats.categoryStats)
        .filter(([_, count]) => count > 0)
        .map(([category, count]) => {
          const config = categoryConfig[category] || categoryConfig.unknown;
          return {
            category,
            label: config.label,
            count,
            color: config.color,
          };
        })
        .sort((a, b) => b.count - a.count)
    : [];

  // Category stat columns
  const categoryColumns: DocTableColumn<CategoryStatRow>[] = [
    {
      key: "label",
      header: "カテゴリ",
      width: "150px",
      render: (_, row) => {
        const config = categoryConfig[row.category] || categoryConfig.unknown;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${row.color}`} />
            <span>{row.label}</span>
          </div>
        );
      },
    },
    {
      key: "count",
      header: "テスト数",
      width: "100px",
      align: "right",
      render: (_, row) => <span className="font-mono">{row.count}</span>,
    },
  ];

  // API tool rows
  const apiToolRows: ApiToolRow[] = relatedApiTools.map((tool) => ({
    name: tool.name,
    description: tool.description || "",
  }));

  // API tool columns
  const apiToolColumns: DocTableColumn<ApiToolRow>[] = [
    {
      key: "name",
      header: "ツール",
      width: "200px",
      render: (_, row) => (
        <Link
          href={`/api-tools/${row.name}`}
          className="font-mono text-primary hover:underline flex items-center gap-1"
        >
          <Wrench className="h-3 w-3" />
          {row.name}
        </Link>
      ),
    },
    {
      key: "description",
      header: "説明",
      render: (_, row) => (
        <span className="text-sm text-muted-foreground line-clamp-1">
          {row.description || "-"}
        </span>
      ),
    },
  ];

  // Test columns
  const testColumns: DocTableColumn<TestRow>[] = [
    {
      key: "name",
      header: "テスト名",
      render: (_, row) => (
        <Link
          href={`/test-cases/${encodedFile}/${row.line}`}
          className="text-primary hover:underline flex items-center gap-1"
        >
          {row.name}
          <ArrowRight className="h-3 w-3" />
        </Link>
      ),
    },
    {
      key: "categoryLabel",
      header: "カテゴリ",
      width: "120px",
      render: (_, row) => {
        const config = categoryConfig[row.category] || categoryConfig.unknown;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-1">
            <Icon className={`h-3 w-3 ${row.categoryColor}`} />
            <span className="text-xs">{row.categoryLabel}</span>
          </div>
        );
      },
    },
    {
      key: "line",
      header: "Line",
      width: "80px",
      align: "right",
      render: (_, row) => <span className="font-mono text-xs">{row.line}</span>,
    },
  ];

  // Calculate category summary for preview
  const categorySummary = categoryRows.slice(0, 2).map(r => `${r.label}:${r.count}`).join(", ");

  return (
    <div className="space-y-6">
      {/* Summary */}
      <DocSection
        title="サマリー"
        variant="info"
        icon={<FileCode2 className="h-4 w-4" />}
        preview={`${tests.length} tests, ${Object.keys(testsByDescribe).length} describe`}
        defaultOpen
      >
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1">
            <FileCode2 className="h-4 w-4 text-green-500" />
            {tests[0].framework === "playwright" ? "Playwright" : "Jest"}
          </span>
          <span className="flex items-center gap-1">
            <FlaskConical className="h-4 w-4 text-blue-500" />
            {tests.length} tests
          </span>
          <span className="text-muted-foreground">
            ({Object.keys(testsByDescribe).length} describe blocks)
          </span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground font-mono break-all">
          {file}
        </div>
      </DocSection>

      {/* Source link */}
      {fileStats?.module?.detailPath && (
        <DocSection
          title="テスト対象"
          variant="primary"
          icon={<ExternalLink className="h-4 w-4" />}
          preview={fileStats.module.name}
          defaultOpen
        >
          <Link
            href={`/${fileStats.module.detailPath.replace(".html", "")}`}
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            {fileStats.module.name || "ソースの詳細を見る"}
          </Link>
        </DocSection>
      )}

      {/* Category Stats */}
      {categoryRows.length > 0 && (
        <DocSection
          title="カテゴリ別テスト数"
          variant="success"
          icon={<FlaskConical className="h-4 w-4" />}
          badge={<Badge variant="outline">{categoryRows.length} categories</Badge>}
          preview={categorySummary}
          defaultOpen
        >
          <DocTable columns={categoryColumns} data={categoryRows} />
        </DocSection>
      )}

      {/* Related API Tools */}
      {apiToolRows.length > 0 && (
        <DocSection
          title="関連 MCP ツール"
          variant="purple"
          icon={<Bot className="h-4 w-4" />}
          badge={<Badge variant="outline">{apiToolRows.length} tools</Badge>}
          preview={apiToolRows.slice(0, 2).map(t => t.name).join(", ")}
          defaultOpen
        >
          <DocTable columns={apiToolColumns} data={apiToolRows} />
        </DocSection>
      )}

      {/* Tests by Describe */}
      {Object.entries(testsByDescribe).map(([describe, describeTests]) => {
        const testRows: TestRow[] = describeTests.map((test) => {
          const config = categoryConfig[test.category || "unknown"] || categoryConfig.unknown;
          return {
            line: test.line,
            name: test.it,
            description: test.description,
            category: test.category || "unknown",
            categoryLabel: config.label,
            categoryColor: config.color,
          };
        });

        // Category count for preview
        const catCounts: Record<string, number> = {};
        for (const t of describeTests) {
          const cat = t.category || "unknown";
          catCounts[cat] = (catCounts[cat] || 0) + 1;
        }
        const catPreview = Object.entries(catCounts)
          .slice(0, 2)
          .map(([cat, cnt]) => `${categoryConfig[cat]?.label || cat}:${cnt}`)
          .join(", ");

        return (
          <DocSection
            key={describe}
            title={describe}
            variant="default"
            icon={<FlaskConical className="h-4 w-4" />}
            badge={<Badge variant="secondary">{describeTests.length} tests</Badge>}
            preview={catPreview}
            defaultOpen
          >
            <DocTable columns={testColumns} data={testRows} />
          </DocSection>
        );
      })}
    </div>
  );
}
