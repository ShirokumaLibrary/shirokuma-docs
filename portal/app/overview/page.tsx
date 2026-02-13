import { AlertCircle, FileText } from "lucide-react";
import { loadOverview } from "@/lib/data-loader";
import { MarkdownContent } from "@/components/markdown-content";

export const dynamic = "force-static";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-12 text-center">
      <div className="rounded-full bg-muted p-3">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">概要ドキュメントがありません</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        OVERVIEW.md または README.md が見つかりません。
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        プロジェクトのルートまたは docs/ ディレクトリに配置してください。
      </p>
    </div>
  );
}

export default async function OverviewPage() {
  const overview = await loadOverview();

  if (!overview) {
    return (
      <div className="space-y-6">
        <header className="flex items-center gap-3">
          <div className="rounded-lg bg-accent-blue/10 p-2">
            <FileText className="h-6 w-6 text-accent-blue" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">概要</h1>
            <p className="mt-1 text-muted-foreground">
              プロジェクト概要ドキュメント
            </p>
          </div>
        </header>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="rounded-lg bg-accent-blue/10 p-2">
          <FileText className="h-6 w-6 text-accent-blue" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">概要</h1>
          <p className="mt-1 text-muted-foreground">
            プロジェクト概要ドキュメント
          </p>
        </div>
      </header>

      {/* Markdown Content with Mermaid and Syntax Highlighting */}
      <MarkdownContent content={overview.content} />
    </div>
  );
}
