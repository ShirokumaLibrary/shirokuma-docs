import { Bot } from "lucide-react";
import { loadApiTools } from "@/lib/data-loader";
import { getPortalFormat } from "@/lib/format";
import { ApiToolsClient, type ApiToolsData } from "./api-tools-client";
import { ApiToolsDocument } from "./api-tools-document";

export default async function ApiToolsPage() {
  const data = (await loadApiTools()) as ApiToolsData | null;
  const format = getPortalFormat();

  if (!data || !data.tools) {
    return (
      <div className="space-y-8">
        <header>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Bot className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">API Tools</h1>
              <p className="mt-1 text-muted-foreground">
                MCPツールデータがありません
              </p>
            </div>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/10 p-2">
            <Bot className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">API Tools</h1>
            <p className="mt-1 text-muted-foreground">
              AI アシスタント向け API ツール一覧
            </p>
          </div>
        </div>
      </header>

      {/* Content - format determined at build time */}
      {format === "document" ? (
        <ApiToolsDocument data={data} />
      ) : (
        <ApiToolsClient data={data} />
      )}
    </div>
  );
}
