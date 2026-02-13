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
  ChevronRight,
  Target,
  FileText,
  ListChecks,
  ArrowRight,
} from "lucide-react";
import { loadTestCases, loadDetails, loadFeatureMap } from "@/lib/data-loader";
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
import { TestDetailDocument } from "./test-detail-document";

export const dynamicParams = false;

// Category config (supports both old and new naming conventions)
const categoryConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  // New naming convention
  "happy-path": { icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-500/10", label: "正常系" },
  auth: { icon: Shield, color: "text-blue-500", bgColor: "bg-blue-500/10", label: "認証" },
  "error-handling": { icon: AlertCircle, color: "text-red-500", bgColor: "bg-red-500/10", label: "異常系" },
  validation: { icon: AlertTriangle, color: "text-yellow-500", bgColor: "bg-yellow-500/10", label: "バリデーション" },
  "edge-case": { icon: Layers, color: "text-purple-500", bgColor: "bg-purple-500/10", label: "境界値" },
  integration: { icon: GitBranch, color: "text-cyan-500", bgColor: "bg-cyan-500/10", label: "統合" },
  other: { icon: FlaskConical, color: "text-gray-500", bgColor: "bg-gray-500/10", label: "その他" },
  // Old naming convention aliases (for backward compatibility)
  success: { icon: CheckCircle2, color: "text-green-500", bgColor: "bg-green-500/10", label: "正常系" },
  error: { icon: AlertCircle, color: "text-red-500", bgColor: "bg-red-500/10", label: "異常系" },
  edge: { icon: Layers, color: "text-purple-500", bgColor: "bg-purple-500/10", label: "境界値" },
  unknown: { icon: FlaskConical, color: "text-gray-500", bgColor: "bg-gray-500/10", label: "その他" },
};

export async function generateStaticParams() {
  const data = await loadTestCases();
  if (!data) return [];

  // Generate pages for all test cases
  // Use __ instead of / for URL-safe paths (Nginx decodes %2F)
  return data.testCases.map((tc) => ({
    file: encodeFilePath(tc.file),
    line: String(tc.line),
  }));
}

interface Props {
  params: Promise<{ file: string; line: string }>;
}

/**
 * Find related source item from feature map
 */
function findRelatedSource(
  testFile: string,
  featureMap: Awaited<ReturnType<typeof loadFeatureMap>>
): { type: string; module: string; name: string; path: string } | null {
  if (!featureMap) return null;

  // Extract the source file name being tested
  // e.g., apps/web/__tests__/lib/actions/tokens.test.ts -> tokens
  const match = testFile.match(/__tests__\/(.+?)\.test\.(ts|tsx)$/);
  if (!match) return null;

  const testPath = match[1]; // e.g., "lib/actions/tokens" or "components/entity-form"
  const parts = testPath.split("/");
  const targetName = parts[parts.length - 1]; // e.g., "tokens" or "entity-form"

  // Determine type from path
  let type: string | null = null;
  if (testPath.includes("actions")) type = "actions";
  else if (testPath.includes("components")) type = "components";
  else if (testPath.includes("lib")) type = "actions"; // lib utilities often map to actions

  // Search in feature map
  for (const [moduleName, group] of Object.entries(featureMap.features)) {
    const layers = [
      { type: "actions", items: group.actions || [] },
      { type: "components", items: group.components || [] },
      { type: "screens", items: group.screens || [] },
    ];

    for (const layer of layers) {
      for (const item of layer.items) {
        // Match by file path or name
        const itemFileName = item.path?.split("/").pop()?.replace(/\.(ts|tsx)$/, "");
        if (itemFileName === targetName || item.name.toLowerCase().includes(targetName.replace(/-/g, ""))) {
          return {
            type: layer.type,
            module: moduleName,
            name: item.name,
            path: item.path || "",
          };
        }
      }
    }
  }

  return null;
}

export default async function TestDetailPage({ params }: Props) {
  const { file: encodedFile, line: lineStr } = await params;
  const file = decodeFilePath(encodedFile);
  const line = parseInt(lineStr, 10);

  const [data, details, featureMap] = await Promise.all([
    loadTestCases(),
    loadDetails(),
    loadFeatureMap(),
  ]);

  if (!data) return notFound();

  // Find the specific test
  const test = data.testCases.find((tc) => tc.file === file && tc.line === line);
  if (!test) return notFound();

  // Get file stats for module info
  const fileStats = data.summary.fileStats?.find((fs) => fs.file === file);

  // Find related tests (same describe, different test)
  const relatedTests = data.testCases.filter(
    (tc) => tc.file === file && tc.describe === test.describe && tc.line !== line
  );

  // Find related source
  const relatedSource = findRelatedSource(file, featureMap);
  const format = getPortalFormat();

  // Get config for this test's category
  const config = categoryConfig[test.category || "unknown"] || categoryConfig.unknown;
  const CategoryIcon = config.icon;

  // Extract filename for display
  const fileName = file.split("/").pop() || file;

  // Document format
  if (format === "document") {
    return (
      <div className="space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/test-cases" className="hover:text-primary transition-colors">
            テストケース
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/test-cases/${encodeFilePath(file)}`}
            className="hover:text-primary transition-colors truncate max-w-[200px]"
          >
            {fileName}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="truncate">Line {line}</span>
        </nav>

        {/* Header */}
        <header>
          <div className="flex items-start gap-4">
            <div className={`rounded-lg p-3 ${config.bgColor}`}>
              <CategoryIcon className={`h-8 w-8 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight">{test.it}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                テストケース詳細
              </p>
            </div>
          </div>
        </header>

        <TestDetailDocument
          test={test}
          file={file}
          relatedTests={relatedTests}
          relatedSource={relatedSource}
          fileStats={fileStats}
        />

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button asChild variant="ghost">
            <Link href={`/test-cases/${encodeFilePath(file)}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              ファイルに戻る
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/test-cases">
              テストケース一覧
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Card format (default)
  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/test-cases" className="hover:text-primary transition-colors">
          テストケース
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/test-cases/${encodeFilePath(file)}`}
          className="hover:text-primary transition-colors truncate max-w-[200px]"
        >
          {fileName}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="truncate">Line {line}</span>
      </nav>

      {/* Header */}
      <header>
        <div className="flex items-start gap-4">
          <div className={`rounded-lg p-3 ${config.bgColor}`}>
            <CategoryIcon className={`h-8 w-8 ${config.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight">{test.it}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge className={config.bgColor}>
                <CategoryIcon className={`h-3 w-3 mr-1 ${config.color}`} />
                {config.label}
              </Badge>
              <Badge variant="outline">
                {test.framework === "playwright" ? "Playwright" : "Jest"}
              </Badge>
              <Badge variant="secondary">Line {line}</Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Test details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {test.description && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>説明</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-foreground">{test.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Purpose & Expected */}
          <div className="grid gap-6 md:grid-cols-2">
            {test.purpose && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">テスト目的</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{test.purpose}</p>
                </CardContent>
              </Card>
            )}

            {test.expected && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">期待結果</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{test.expected}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Describe docs */}
          {test.describeDocs && test.describeDocs.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>テストスイート情報</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {test.describeDocs.map((doc, idx) => (
                    <div key={idx} className="border-l-2 border-muted pl-4">
                      <p className="font-medium">{doc.name}</p>
                      {doc.testdoc && (
                        <p className="text-sm text-muted-foreground mt-1">{doc.testdoc}</p>
                      )}
                      {doc.purpose && (
                        <p className="text-xs text-muted-foreground mt-1">
                          目的: {doc.purpose}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Links and related */}
        <div className="space-y-6">
          {/* Source file info */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">ソースファイル</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground break-all">{file}</p>
              <p className="text-sm mt-2">
                <span className="text-muted-foreground">describe: </span>
                <span className="font-mono text-xs">{test.describe}</span>
              </p>
            </CardContent>
          </Card>

          {/* Related source link */}
          {relatedSource && (
            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">テスト対象</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          )}

          {/* Module link from fileStats */}
          {fileStats?.module?.detailPath && !relatedSource && (
            <Card className="border-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">関連モジュール</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/${fileStats.module.detailPath.replace(".html", "")}`}>
                    {fileStats.module.name}の詳細を見る
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Related tests */}
          {relatedTests.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">同じdescribeのテスト</CardTitle>
                <CardDescription>{relatedTests.length} tests</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {relatedTests.slice(0, 10).map((rt) => {
                    const rtConfig = categoryConfig[rt.category || "unknown"] || categoryConfig.unknown;
                    const RtIcon = rtConfig.icon;
                    return (
                      <Link
                        key={rt.line}
                        href={`/test-cases/${encodeFilePath(file)}#line-${rt.line}`}
                        className="flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors text-sm"
                      >
                        <RtIcon className={`h-4 w-4 mt-0.5 ${rtConfig.color}`} />
                        <span className="line-clamp-2">{rt.it}</span>
                      </Link>
                    );
                  })}
                  {relatedTests.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center pt-2">
                      +{relatedTests.length - 10} more
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button asChild variant="ghost">
          <Link href={`/test-cases/${encodeFilePath(file)}`}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            ファイルに戻る
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/test-cases">
            テストケース一覧
          </Link>
        </Button>
      </div>
    </div>
  );
}
