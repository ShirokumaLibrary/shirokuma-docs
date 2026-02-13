import { notFound } from "next/navigation";
import { Bot, Globe, Wrench } from "lucide-react";
import { getApplicationById, loadApiTools, isApiApplication, getApiProtocol, loadApplications } from "@/lib/data-loader";
import { ApiToolsClient, type ApiToolsData } from "./api-tools-client";

export const dynamic = "force-static";
export const dynamicParams = false;

export async function generateStaticParams() {
  const applications = await loadApplications();
  if (!applications?.apps) return [];

  const apiApps = applications.apps.filter((app) => app.type === "api");

  // Return empty array if no API apps - dynamicParams = false prevents 404 errors
  if (apiApps.length === 0) return [];

  return apiApps.map((app) => ({
    appId: app.id,
  }));
}

// Protocol-specific display configuration
const protocolConfig: Record<string, { icon: typeof Bot; title: string; description: string; emptyMessage: string }> = {
  mcp: {
    icon: Bot,
    title: "MCP Tools",
    description: "AI アシスタント向け API ツール一覧",
    emptyMessage: "MCPツールデータがありません",
  },
  rest: {
    icon: Globe,
    title: "REST API",
    description: "REST API エンドポイント一覧",
    emptyMessage: "REST APIデータがありません",
  },
  graphql: {
    icon: Wrench,
    title: "GraphQL API",
    description: "GraphQL スキーマとリゾルバー",
    emptyMessage: "GraphQLデータがありません",
  },
  grpc: {
    icon: Wrench,
    title: "gRPC Services",
    description: "gRPC サービスとメソッド一覧",
    emptyMessage: "gRPCデータがありません",
  },
  default: {
    icon: Wrench,
    title: "API Tools",
    description: "API ツール一覧",
    emptyMessage: "ツールデータがありません",
  },
};

export default async function AppToolsPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  const app = await getApplicationById(appId);

  if (!app || !isApiApplication(app)) {
    notFound();
  }

  // Get protocol for this app
  const protocol = getApiProtocol(app) || "default";
  const config = protocolConfig[protocol] || protocolConfig.default;
  const Icon = config.icon;

  // Load tools data (currently only MCP tools are supported)
  // TODO: Add support for REST/GraphQL/gRPC when those generators are implemented
  const data = (await loadApiTools()) as ApiToolsData | null;

  if (!data || !data.tools) {
    return (
      <div className="space-y-8">
        <header>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/10 p-2">
              <Icon className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{app.name}</h1>
              <p className="mt-1 text-muted-foreground">
                {config.emptyMessage}
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
            <Icon className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{app.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {app.description || config.description}
            </p>
          </div>
        </div>
      </header>

      {/* Client Component */}
      <ApiToolsClient data={data} appId={appId} protocol={protocol} />
    </div>
  );
}
