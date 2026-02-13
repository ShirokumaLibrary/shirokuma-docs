import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bot,
  Wrench,
  FileCode,
  Database,
  TestTube2,
  ChevronRight,
  Layers,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Search,
  List,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getApplicationById,
  loadApiTools,
  isApiApplication,
  loadApplications,
} from "@/lib/data-loader";
import { encodeFilePath } from "@/lib/path-utils";
import {
  getCoverageColor,
  getCoverageBgColor,
} from "@/components/shared/coverage-score-bar";

export const dynamic = "force-static";
export const dynamicParams = false;

// Tool data type
interface ApiToolData {
  name: string;
  description: string;
  params?: Array<{
    name: string;
    type: string;
    description?: string;
    required: boolean;
  }>;
  sourceFile?: string;
  app?: string;
  category?: string;
  feature?: string;
  dbTables?: string[];
  relatedTests?: string;
  tests?: Array<{
    target: string;
    testdoc: string;
    file: string;
    line?: number;
  }>;
  testCoverage?: {
    hasTest: boolean;
    totalTests: number;
    coverageScore: number;
  };
}

interface ApiToolsData {
  tools: ApiToolData[];
  generatedAt: string;
}

// Tool action icons
const actionIcons: Record<string, LucideIcon> = {
  start: Play,
  pause: Pause,
  resume: RotateCcw,
  create: Plus,
  search: Search,
  list: List,
  get: Search,
  add: Plus,
  complete: Play,
  update: Wrench,
  link: Layers,
};

function getActionIcon(toolName: string): LucideIcon {
  for (const [action, icon] of Object.entries(actionIcons)) {
    if (toolName.toLowerCase().includes(action)) {
      return icon;
    }
  }
  return Wrench;
}

// Category config
const categoryLabels: Record<string, string> = {
  sessions: "セッション管理",
  entities: "エンティティ管理",
  projects: "プロジェクト管理",
  default: "その他",
};

export async function generateStaticParams() {
  const applications = await loadApplications();
  if (!applications?.apps) return [];

  const apiApps = applications.apps.filter((app) => app.type === "api");
  if (apiApps.length === 0) return [];

  const data = (await loadApiTools()) as ApiToolsData | null;
  if (!data?.tools) return [];

  // Generate params for each tool in each API app
  const params: Array<{ appId: string; tool: string }> = [];
  for (const app of apiApps) {
    for (const tool of data.tools) {
      params.push({
        appId: app.id,
        tool: tool.name,
      });
    }
  }

  return params;
}

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ appId: string; tool: string }>;
}) {
  const { appId, tool: toolName } = await params;

  const app = await getApplicationById(appId);
  if (!app || !isApiApplication(app)) {
    notFound();
  }

  const data = (await loadApiTools()) as ApiToolsData | null;
  if (!data?.tools) {
    notFound();
  }

  const tool = data.tools.find((t) => t.name === toolName);
  if (!tool) {
    notFound();
  }

  const Icon = getActionIcon(tool.name);
  const categoryLabel = categoryLabels[tool.category || "default"] || categoryLabels.default;
  const coverage = tool.testCoverage;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href={`/apps/${appId}/tools/`}
          className="flex items-center gap-1 hover:text-foreground"
        >
          <Bot className="h-4 w-4" />
          {app.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{tool.name}</span>
      </nav>

      {/* Header */}
      <header className="flex items-start gap-4">
        <div className="rounded-lg bg-purple-500/10 p-3">
          <Icon className="h-8 w-8 text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold tracking-tight font-mono">{tool.name}</h1>
          {tool.description && (
            <p className="mt-2 text-muted-foreground">{tool.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{categoryLabel}</Badge>
            {tool.feature && (
              <Badge variant="outline">{tool.feature}</Badge>
            )}
            {coverage && coverage.totalTests > 0 && (
              <Badge
                variant="outline"
                className={`gap-1 ${getCoverageBgColor(coverage.coverageScore)}`}
              >
                <TestTube2
                  className={`h-3 w-3 ${getCoverageColor(coverage.coverageScore)}`}
                />
                <span className={getCoverageColor(coverage.coverageScore)}>
                  {coverage.totalTests} tests ({coverage.coverageScore}%)
                </span>
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Parameters */}
      {tool.params && tool.params.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-500" />
              パラメータ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名前</TableHead>
                  <TableHead>型</TableHead>
                  <TableHead>必須</TableHead>
                  <TableHead>説明</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tool.params.map((param) => (
                  <TableRow key={param.name}>
                    <TableCell className="font-mono text-sm font-medium">
                      {param.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {param.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {param.required ? (
                        <Badge variant="default" className="text-xs">
                          必須
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          任意
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {param.description || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Source File & DB Tables */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Source File */}
        {tool.sourceFile && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCode className="h-5 w-5 text-green-500" />
                ソースファイル
              </CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-sm bg-muted px-2 py-1 rounded">
                {tool.sourceFile}
              </code>
            </CardContent>
          </Card>
        )}

        {/* DB Tables */}
        {tool.dbTables && tool.dbTables.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="h-5 w-5 text-orange-500" />
                関連テーブル
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {tool.dbTables.map((table) => (
                  <Badge key={table} variant="outline" className="font-mono">
                    {table}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tests */}
      {tool.tests && tool.tests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TestTube2 className="h-5 w-5 text-green-500" />
              関連テスト
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tool.tests.map((test, idx) => (
                <Link
                  key={idx}
                  href={
                    test.line
                      ? `/test-cases/${encodeFilePath(test.file)}/${test.line}`
                      : `/test-cases/${encodeFilePath(test.file)}`
                  }
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
                >
                  <TestTube2 className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">
                      {test.testdoc}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {test.file}
                      {test.line && `:${test.line}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back link */}
      <div className="pt-4">
        <Link
          href={`/apps/${appId}/tools/`}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          ツール一覧に戻る
        </Link>
      </div>
    </div>
  );
}
