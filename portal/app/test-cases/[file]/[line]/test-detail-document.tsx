/**
 * Test Case Detail - ドキュメント形式表示
 *
 * 個別テストケースの詳細をテーブル形式で表示
 */

import Link from "next/link";
import {
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  Shield,
  AlertCircle,
  Layers,
  GitBranch,
  ArrowRight,
  FileCode,
  Target,
  FileText,
  ExternalLink,
  ListChecks,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DocSection, DocTable, type DocTableColumn } from "@/components/document";
import { encodeFilePath } from "@/lib/path-utils";
import type { TestCase } from "@/lib/types";

// Category config
const categoryConfig: Record<
  string,
  { icon: React.ElementType; color: string; bgColor: string; label: string }
> = {
  "happy-path": { icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-500/10", label: "正常系" },
  auth: { icon: Shield, color: "text-blue-500", bgColor: "bg-blue-500/10", label: "認証" },
  "error-handling": { icon: AlertCircle, color: "text-red-500", bgColor: "bg-red-500/10", label: "異常系" },
  validation: { icon: AlertTriangle, color: "text-yellow-500", bgColor: "bg-yellow-500/10", label: "バリデーション" },
  "edge-case": { icon: Layers, color: "text-purple-500", bgColor: "bg-purple-500/10", label: "境界値" },
  integration: { icon: GitBranch, color: "text-cyan-500", bgColor: "bg-cyan-500/10", label: "統合" },
  other: { icon: FlaskConical, color: "text-gray-500", bgColor: "bg-gray-500/10", label: "その他" },
  success: { icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-500/10", label: "正常系" },
  error: { icon: AlertCircle, color: "text-red-500", bgColor: "bg-red-500/10", label: "異常系" },
  edge: { icon: Layers, color: "text-purple-500", bgColor: "bg-purple-500/10", label: "境界値" },
  unknown: { icon: FlaskConical, color: "text-gray-500", bgColor: "bg-gray-500/10", label: "その他" },
};

interface InfoRow {
  label: string;
  value: string;
}

interface RelatedTestRow {
  line: number;
  name: string;
  category: string;
  categoryLabel: string;
  categoryColor: string;
}

interface DescribeDocRow {
  name: string;
  description?: string;
  purpose?: string;
}

interface TestDetailDocumentProps {
  test: TestCase;
  file: string;
  relatedTests: TestCase[];
  relatedSource?: {
    type: string;
    module: string;
    name: string;
    path: string;
  } | null;
  fileStats?: {
    module?: { detailPath?: string; name?: string };
  };
}

export function TestDetailDocument({
  test,
  file,
  relatedTests,
  relatedSource,
  fileStats,
}: TestDetailDocumentProps) {
  const config = categoryConfig[test.category || "unknown"] || categoryConfig.unknown;

  // Basic info rows
  const infoRows: InfoRow[] = [
    { label: "ファイル", value: file },
    { label: "describe", value: test.describe },
    { label: "行番号", value: String(test.line) },
    { label: "フレームワーク", value: test.framework === "playwright" ? "Playwright" : "Jest" },
    { label: "カテゴリ", value: config.label },
  ];

  const infoColumns: DocTableColumn<InfoRow>[] = [
    {
      key: "label",
      header: "項目",
      width: "150px",
      render: (_, row) => <span className="text-muted-foreground">{row.label}</span>,
    },
    {
      key: "value",
      header: "値",
      render: (_, row) => <span className="font-mono text-sm">{row.value}</span>,
    },
  ];

  // Describe docs rows
  const describeDocRows: DescribeDocRow[] =
    test.describeDocs?.map((doc) => ({
      name: doc.name,
      description: doc.testdoc,
      purpose: doc.purpose,
    })) || [];

  const describeDocColumns: DocTableColumn<DescribeDocRow>[] = [
    {
      key: "name",
      header: "名前",
      width: "250px",
      render: (_, row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "description",
      header: "説明",
      render: (_, row) => (
        <span className="text-sm text-muted-foreground">{row.description || "-"}</span>
      ),
    },
    {
      key: "purpose",
      header: "目的",
      render: (_, row) => (
        <span className="text-sm text-muted-foreground">{row.purpose || "-"}</span>
      ),
    },
  ];

  // Related tests rows
  const relatedTestRows: RelatedTestRow[] = relatedTests.slice(0, 20).map((rt) => {
    const rtConfig = categoryConfig[rt.category || "unknown"] || categoryConfig.unknown;
    return {
      line: rt.line,
      name: rt.it,
      category: rt.category || "unknown",
      categoryLabel: rtConfig.label,
      categoryColor: rtConfig.color,
    };
  });

  const relatedTestColumns: DocTableColumn<RelatedTestRow>[] = [
    {
      key: "name",
      header: "テスト名",
      render: (_, row) => (
        <Link
          href={`/test-cases/${encodeFilePath(file)}/${row.line}`}
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
        const cfg = categoryConfig[row.category] || categoryConfig.unknown;
        const Icon = cfg.icon;
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

  // Calculate related tests category preview
  const relatedCatCounts: Record<string, number> = {};
  for (const t of relatedTests) {
    const cat = t.category || "unknown";
    relatedCatCounts[cat] = (relatedCatCounts[cat] || 0) + 1;
  }
  const relatedPreview = Object.entries(relatedCatCounts)
    .slice(0, 2)
    .map(([cat, cnt]) => `${categoryConfig[cat]?.label || cat}:${cnt}`)
    .join(", ");

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <DocSection
        title="基本情報"
        variant="info"
        icon={<FileCode className="h-4 w-4" />}
        preview={`${config.label}, Line ${test.line}`}
        defaultOpen
      >
        <DocTable columns={infoColumns} data={infoRows} />
      </DocSection>

      {/* Description */}
      {test.description && (
        <DocSection
          title="説明"
          variant="default"
          icon={<FileText className="h-4 w-4" />}
          preview={test.description.slice(0, 50) + (test.description.length > 50 ? "..." : "")}
          defaultOpen
        >
          <p className="text-foreground">{test.description}</p>
        </DocSection>
      )}

      {/* Purpose & Expected */}
      {(test.purpose || test.expected) && (
        <DocSection
          title="テスト内容"
          variant="success"
          icon={<Target className="h-4 w-4" />}
          preview={test.purpose?.slice(0, 30) || test.expected?.slice(0, 30)}
          defaultOpen
        >
          <div className="space-y-4">
            {test.purpose && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">目的</h4>
                <p className="text-sm">{test.purpose}</p>
              </div>
            )}
            {test.expected && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">期待結果</h4>
                <p className="text-sm">{test.expected}</p>
              </div>
            )}
          </div>
        </DocSection>
      )}

      {/* Describe Docs */}
      {describeDocRows.length > 0 && (
        <DocSection
          title="テストスイート情報"
          variant="cyan"
          icon={<ListChecks className="h-4 w-4" />}
          badge={<Badge variant="outline">{describeDocRows.length} describe</Badge>}
          preview={describeDocRows[0]?.name}
          defaultOpen
        >
          <DocTable columns={describeDocColumns} data={describeDocRows} />
        </DocSection>
      )}

      {/* Related Source */}
      {relatedSource && (
        <DocSection
          title="テスト対象"
          variant="primary"
          icon={<ExternalLink className="h-4 w-4" />}
          preview={relatedSource.name}
          defaultOpen
        >
          <Link
            href={`/details/${relatedSource.type}/${encodeURIComponent(relatedSource.module)}/${encodeURIComponent(relatedSource.name)}`}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
          >
            <div>
              <p className="font-medium group-hover:text-primary transition-colors">
                {relatedSource.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {relatedSource.module} / {relatedSource.type}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </DocSection>
      )}

      {/* Module link from fileStats (fallback) */}
      {fileStats?.module?.detailPath && !relatedSource && (
        <DocSection
          title="関連モジュール"
          variant="primary"
          icon={<ExternalLink className="h-4 w-4" />}
          preview={fileStats.module.name}
          defaultOpen
        >
          <Link
            href={`/${fileStats.module.detailPath.replace(".html", "")}`}
            className="flex items-center gap-2 text-primary hover:underline"
          >
            {fileStats.module.name || "詳細を見る"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </DocSection>
      )}

      {/* Related Tests */}
      {relatedTestRows.length > 0 && (
        <DocSection
          title="同じ describe のテスト"
          variant="default"
          icon={<FlaskConical className="h-4 w-4" />}
          badge={<Badge variant="secondary">{relatedTests.length} tests</Badge>}
          preview={relatedPreview}
          defaultOpen
        >
          <DocTable columns={relatedTestColumns} data={relatedTestRows} />
          {relatedTests.length > 20 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              +{relatedTests.length - 20} more tests
            </p>
          )}
        </DocSection>
      )}
    </div>
  );
}
