/**
 * API Tools - ドキュメント形式表示
 *
 * カテゴリ別にアコーディオンとテーブルで表示
 */

import Link from "next/link";
import {
  Play,
  Layers,
  Database,
  Wrench,
  FlaskConical,
  Shield,
  ExternalLink,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DocSection, DocTable, DocParamsTable, type DocTableColumn } from "@/components/document";
import { MethodBadge, type HttpMethod } from "@/components/swagger";
import type { ApiToolsData, ApiToolData } from "./api-tools-client";

// Category config
interface CategoryConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  labelJa: string;
}

const categoryConfigs: Record<string, CategoryConfig> = {
  sessions: {
    icon: Play,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    labelJa: "Session Management",
  },
  entities: {
    icon: Layers,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    labelJa: "Entity Management",
  },
  projects: {
    icon: Database,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    labelJa: "Project Management",
  },
  reviews: {
    icon: Wrench,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    labelJa: "Review Management",
  },
  default: {
    icon: Wrench,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
    labelJa: "Other Tools",
  },
};

interface ApiToolsDocumentProps {
  data: ApiToolsData;
}

/**
 * カテゴリ別ツールセクション
 */
function CategorySection({
  category,
  tools,
  config,
}: {
  category: string;
  tools: ApiToolData[];
  config: CategoryConfig;
}) {
  const Icon = config.icon;
  const totalTests = tools.reduce(
    (sum, tool) => sum + (tool.testCoverage?.totalTests || 0),
    0
  );

  return (
    <div className={`rounded-lg border ${config.borderColor} overflow-hidden`}>
      {/* Category header */}
      <div className={`flex items-center gap-2 px-4 py-3 ${config.bgColor}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
        <span className="font-semibold text-sm">{config.labelJa}</span>
        <span className="text-xs text-muted-foreground ml-2">
          ({tools.length} tools)
        </span>
        {totalTests > 0 && (
          <Badge variant="outline" className="text-xs gap-1 ml-auto">
            <FlaskConical className="h-3 w-3" />
            {totalTests} tests
          </Badge>
        )}
      </div>

      {/* Tools list */}
      <div className="divide-y">
        {tools.map((tool) => (
          <ToolRow key={tool.name} tool={tool} />
        ))}
      </div>
    </div>
  );
}

/**
 * ツール行（展開可能）
 */
function ToolRow({ tool }: { tool: ApiToolData }) {
  const method: HttpMethod = tool.httpMethod || "POST";
  const coverage = tool.testCoverage;

  return (
    <details className="group">
      <summary className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-muted/50 list-none">
        <MethodBadge method={method} />
        <span className="font-mono text-sm font-medium group-hover:text-primary transition-colors">
          {tool.name}
        </span>
        <span className="text-sm text-muted-foreground truncate flex-1">
          {tool.description}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {coverage && coverage.totalTests > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <FlaskConical className="h-3 w-3" />
              {coverage.totalTests}
            </Badge>
          )}
          {tool.authLevel && tool.authLevel !== "none" && (
            <Badge variant="outline" className="text-xs gap-1">
              <Shield className="h-3 w-3" />
              {tool.authLevel}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground group-open:rotate-90 transition-transform">
            ▶
          </span>
        </div>
      </summary>

      {/* Expanded content */}
      <div className="pl-[68px] pr-4 pb-4 space-y-4 bg-muted/20">
        {/* Parameters */}
        <div>
          <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
            Parameters
          </h4>
          <DocParamsTable params={tool.params || []} />
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {tool.feature && (
            <div className="flex items-center gap-1">
              <span className="font-medium">Feature:</span>
              <Badge variant="secondary" className="text-xs">
                {tool.feature}
              </Badge>
            </div>
          )}
          {tool.dbTables && tool.dbTables.length > 0 && (
            <div className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              <span>{tool.dbTables.join(", ")}</span>
            </div>
          )}
          {tool.sourceFile && (
            <div className="flex items-center gap-1">
              <span className="font-medium">Source:</span>
              <code className="text-xs">{tool.sourceFile}</code>
            </div>
          )}
        </div>

        {/* Detail link */}
        <Link
          href={`/api-tools/${tool.name}`}
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View details
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </details>
  );
}

/**
 * API Tools ドキュメント形式コンポーネント
 */
export function ApiToolsDocument({ data }: ApiToolsDocumentProps) {
  // Group tools by category
  const grouped: Record<string, ApiToolData[]> = {};
  for (const tool of data.tools) {
    const category = tool.category || "default";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(tool);
  }

  const categories = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{data.tools.length} tools in {categories.length} categories</span>
        <span>Generated at {new Date(data.generatedAt).toLocaleString()}</span>
      </div>

      {/* Categories */}
      {categories.map((category) => {
        const config = categoryConfigs[category] || categoryConfigs.default;
        return (
          <CategorySection
            key={category}
            category={category}
            tools={grouped[category]}
            config={config}
          />
        );
      })}
    </div>
  );
}
