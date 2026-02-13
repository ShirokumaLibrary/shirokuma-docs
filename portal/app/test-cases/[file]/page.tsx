import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
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
} from "lucide-react";
import { loadTestCases, loadApiTools } from "@/lib/data-loader";
import { encodeFilePath, decodeFilePath } from "@/lib/path-utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPortalFormat } from "@/lib/format";
import { TestFileDocument } from "./test-file-document";

export const dynamicParams = false;

// MCP tool type
interface ApiTool {
  name: string;
  description: string;
  category?: string;
  tests?: Array<{ target: string; file: string }>;
}

// Category config (supports both old and new naming conventions)
const categoryConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  // New naming convention
  "happy-path": { icon: CheckCircle2, color: "text-green-500", label: "正常系" },
  auth: { icon: Shield, color: "text-blue-500", label: "認証" },
  "error-handling": { icon: AlertCircle, color: "text-red-500", label: "異常系" },
  validation: { icon: AlertTriangle, color: "text-yellow-500", label: "バリデーション" },
  "edge-case": { icon: Layers, color: "text-purple-500", label: "境界値" },
  integration: { icon: GitBranch, color: "text-cyan-500", label: "統合" },
  other: { icon: FlaskConical, color: "text-gray-500", label: "その他" },
  // Old naming convention aliases (for backward compatibility)
  success: { icon: CheckCircle2, color: "text-green-500", label: "正常系" },
  error: { icon: AlertCircle, color: "text-red-500", label: "異常系" },
  edge: { icon: Layers, color: "text-purple-500", label: "境界値" },
  unknown: { icon: FlaskConical, color: "text-gray-500", label: "その他" },
};

export async function generateStaticParams() {
  const data = await loadTestCases();
  if (!data) return [];

  // Get unique files
  const files = new Set<string>();
  for (const tc of data.testCases) {
    files.add(tc.file);
  }

  // Use __ instead of / for URL-safe paths (Nginx decodes %2F)
  return Array.from(files).map((file) => ({
    file: encodeFilePath(file),
  }));
}

interface Props {
  params: Promise<{ file: string }>;
}

export default async function TestFilePage({ params }: Props) {
  const { file: encodedFile } = await params;
  const file = decodeFilePath(encodedFile);

  const [data, mcpTools] = await Promise.all([
    loadTestCases(),
    loadApiTools() as Promise<{ tools: ApiTool[] } | null>,
  ]);
  if (!data) return notFound();

  // Find MCP tools that have tests in this file
  const relatedApiTools = mcpTools?.tools.filter((tool) =>
    tool.tests?.some((t) => t.file === file)
  ) || [];

  // Get tests for this file
  const tests = data.testCases.filter((tc) => tc.file === file);
  if (tests.length === 0) return notFound();

  // Get file stats
  const fileStats = data.summary.fileStats?.find((fs) => fs.file === file);
  const format = getPortalFormat();

  // Group tests by describe
  const testsByDescribe: Record<string, typeof tests> = {};
  for (const test of tests) {
    const describe = test.describe || "Other";
    if (!testsByDescribe[describe]) {
      testsByDescribe[describe] = [];
    }
    testsByDescribe[describe].push(test);
  }

  // Extract filename for display
  const fileName = file.split("/").pop() || file;

  // Document format
  if (format === "document") {
    return (
      <div className="space-y-8">
        {/* Header */}
        <header>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link href="/test-cases" className="hover:text-primary transition-colors">
              テストケース
            </Link>
            <span>/</span>
            <span className="truncate">{fileName}</span>
          </div>

          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-accent-green/10 p-3">
              <FileCode2 className="h-8 w-8 text-accent-green" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">{fileName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                テストファイル詳細
              </p>
            </div>
          </div>
        </header>

        <TestFileDocument
          file={file}
          encodedFile={encodedFile}
          tests={tests}
          fileStats={fileStats}
          relatedApiTools={relatedApiTools}
        />

        {/* Back link */}
        <div className="flex justify-center">
          <Button asChild variant="ghost">
            <Link href="/test-cases">
              <ArrowLeft className="h-4 w-4 mr-2" />
              テストケース一覧に戻る
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Card format (default)
  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link href="/test-cases" className="hover:text-primary transition-colors">
            テストケース
          </Link>
          <span>/</span>
          <span className="truncate">{fileName}</span>
        </div>

        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-accent-green/10 p-3">
            <FileCode2 className="h-8 w-8 text-accent-green" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{fileName}</h1>
            <p className="mt-1 text-sm text-muted-foreground truncate">{file}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">
                {tests[0].framework === "playwright" ? "Playwright" : "Jest"}
              </Badge>
              <Badge variant="secondary">{tests.length} tests</Badge>
              {fileStats?.module?.type && fileStats.module.type !== "unknown" && (
                <Badge variant="secondary" className="capitalize">
                  {fileStats.module.type}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Link to source if available */}
        {fileStats?.module?.detailPath && (
          <div className="mt-4">
            <Button asChild variant="outline" size="sm">
              <Link href={`/${fileStats.module.detailPath.replace(".html", "")}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                ソースの詳細を見る
              </Link>
            </Button>
          </div>
        )}
      </header>

      {/* Category Stats */}
      {fileStats?.categoryStats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">カテゴリ別テスト数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {Object.entries(fileStats.categoryStats)
                .filter(([_, count]) => count > 0)
                .map(([category, count]) => {
                  const config = categoryConfig[category] || categoryConfig.unknown;
                  const Icon = config.icon;
                  return (
                    <div key={category} className="flex items-center gap-1.5 text-sm">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span>{config.label}</span>
                      <Badge variant="secondary" className="text-xs">{count}</Badge>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related MCP Tools */}
      {relatedApiTools.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-500" />
              関連 MCP ツール
            </CardTitle>
            <CardDescription>
              このテストファイルでテストされている MCP ツール
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {relatedApiTools.map((tool) => (
                <Button
                  key={tool.name}
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-2 border-purple-500/30 hover:border-purple-500/50"
                >
                  <Link href={`/api-tools/${tool.name}`}>
                    <Wrench className="h-3 w-3 text-purple-500" />
                    <span className="font-mono font-medium">{tool.name}</span>
                  </Link>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tests grouped by describe */}
      <div className="space-y-6">
        {Object.entries(testsByDescribe).map(([describe, describeTests]) => (
          <Card key={describe}>
            <CardHeader>
              <CardTitle className="text-lg">{describe}</CardTitle>
              <CardDescription>{describeTests.length} テスト</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {describeTests.map((test) => {
                  const config = categoryConfig[test.category || "unknown"] || categoryConfig.unknown;
                  const Icon = config.icon;
                  return (
                    <Link
                      key={test.line}
                      href={`/test-cases/${encodedFile}/${test.line}`}
                      id={`line-${test.line}`}
                      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors scroll-mt-20 group"
                    >
                      <Icon className={`h-5 w-5 mt-0.5 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium group-hover:text-primary transition-colors">
                          {test.it}
                        </p>
                        {test.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {test.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{config.label}</Badge>
                          <span>Line {test.line}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Back link */}
      <div className="flex justify-center">
        <Button asChild variant="ghost">
          <Link href="/test-cases">
            <ArrowLeft className="h-4 w-4 mr-2" />
            テストケース一覧に戻る
          </Link>
        </Button>
      </div>
    </div>
  );
}
