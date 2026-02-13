"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wrench,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Search,
  List,
  Layers,
  Database,
  ArrowRight,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getCoverageColor,
  getCoverageBgColor,
} from "@/components/shared/coverage-score-bar";

// Category type
type CategoryType = "sessions" | "entities" | "projects" | "default";

// Category config
interface CategoryConfig {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  labelJa: string;
}

const categoryConfigs: Record<CategoryType, CategoryConfig> = {
  sessions: {
    icon: Play,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    labelJa: "セッション管理",
  },
  entities: {
    icon: Layers,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    labelJa: "エンティティ管理",
  },
  projects: {
    icon: Database,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    labelJa: "プロジェクト管理",
  },
  default: {
    icon: Wrench,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    labelJa: "その他",
  },
};

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

// Types
export interface ApiToolData {
  name: string;
  description: string;
  params?: Array<{
    name: string;
    type: string;
    description?: string;
    required: boolean;
  }>;
  sourceFile?: string;
  category?: string;
  feature?: string;
  dbTables?: string[];
  relatedTests?: string;
  httpMethod?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  authLevel?: string;
  tests?: Array<{
    target: string;
    testdoc: string;
    file: string;
  }>;
  testCoverage?: {
    hasTest: boolean;
    totalTests: number;
    coverageScore: number;
  };
}

export interface ApiToolsData {
  tools: ApiToolData[];
  generatedAt: string;
  projectPath?: string;
}

interface ApiToolsClientProps {
  data: ApiToolsData;
}

// CategoryCard component (like ModuleCard in Feature Map)
function CategoryCard({
  category,
  tools,
  config,
}: {
  category: string;
  tools: ApiToolData[];
  config: CategoryConfig;
}) {
  const Icon = config.icon;
  const categoryIndexLink = `/api-tools/${category}/`;

  // Calculate category stats
  const totalTests = tools.reduce(
    (sum, tool) => sum + (tool.testCoverage?.totalTests || 0),
    0
  );

  if (tools.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Link
            href={categoryIndexLink}
            className="flex items-center gap-2 group"
          >
            <div className={`rounded-md p-1.5 ${config.bgColor}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div>
              <CardTitle className="text-base group-hover:text-primary transition-colors">
                {config.labelJa}
              </CardTitle>
              <CardDescription className="text-xs">
                {tools.length} tool{tools.length !== 1 ? "s" : ""}
              </CardDescription>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {totalTests > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <FlaskConical className="h-3 w-3" />
                {totalTests}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              MCP
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2">
          {tools.slice(0, 5).map((tool) => {
            const ActionIcon = getActionIcon(tool.name);
            const coverage = tool.testCoverage;
            return (
              <Link
                key={tool.name}
                href={`/api-tools/${tool.name}`}
                className="group flex items-center justify-between rounded-md border border-border bg-muted/50 px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <ActionIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm group-hover:text-primary">
                      {tool.name}
                    </p>
                    {tool.description && (
                      <p className="truncate text-xs text-muted-foreground">
                        {tool.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="ml-2 flex items-center gap-2 flex-shrink-0">
                  {coverage && coverage.totalTests > 0 && (
                    <Badge
                      variant="outline"
                      className={`text-xs gap-1 ${getCoverageBgColor(coverage.coverageScore)}`}
                    >
                      <FlaskConical
                        className={`h-3 w-3 ${getCoverageColor(coverage.coverageScore)}`}
                      />
                      <span className={getCoverageColor(coverage.coverageScore)}>
                        {coverage.totalTests}
                      </span>
                    </Badge>
                  )}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </div>
              </Link>
            );
          })}
          <Link
            href={categoryIndexLink}
            className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary pt-2"
          >
            すべて見る ({tools.length}件)
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Category content component - shows all categories as cards
function CategoryContent({
  toolsByCategory,
}: {
  toolsByCategory: Record<string, ApiToolData[]>;
}) {
  const categories = Object.keys(toolsByCategory).sort() as CategoryType[];
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => {
        const config = categoryConfigs[cat] || categoryConfigs.default;
        return (
          <CategoryCard
            key={cat}
            category={cat}
            tools={toolsByCategory[cat]}
            config={config}
          />
        );
      })}
    </div>
  );
}

export function ApiToolsClient({ data }: ApiToolsClientProps) {
  const [activeTab, setActiveTab] = useState<CategoryType | null>(null);
  const [mounted, setMounted] = useState(false);

  // Group tools by category
  const toolsByCategory: Record<string, ApiToolData[]> = {};
  for (const tool of data.tools) {
    const category = tool.category || "default";
    if (!toolsByCategory[category]) {
      toolsByCategory[category] = [];
    }
    toolsByCategory[category].push(tool);
  }

  const categories = Object.keys(toolsByCategory).sort() as CategoryType[];

  // Handle URL hash on mount and hash changes
  useEffect(() => {
    setMounted(true);

    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (categories.includes(hash as CategoryType)) {
        setActiveTab(hash as CategoryType);
      } else {
        setActiveTab(null); // Show all
      }
    };

    // Check initial hash
    handleHashChange();

    // Listen for hash changes
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [categories]);

  // Update URL hash when tab changes
  const handleTabChange = (value: CategoryType | null) => {
    setActiveTab(value);
    if (value) {
      window.history.pushState(null, "", `#${value}`);
    } else {
      window.history.pushState(null, "", window.location.pathname);
    }
  };

  // Calculate counts for summary cards (no "All" - categories only)
  const counts = categories.map((cat) => {
    const config = categoryConfigs[cat] || categoryConfigs.default;
    return {
      key: cat,
      label: config.labelJa,
      labelJa: config.labelJa,
      count: toolsByCategory[cat]?.length || 0,
      icon: config.icon,
      color: config.color,
      bgColor: config.bgColor,
    };
  });

  if (!mounted) {
    // SSR placeholder to prevent hydration mismatch
    return (
      <div className="space-y-8">
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {counts.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.key}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"
              >
                <div className={`rounded-lg p-2 ${item.bgColor}`}>
                  <Icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-sm text-muted-foreground">{item.labelJa}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats summary */}
      <div className="flex items-center justify-end gap-4 text-sm text-muted-foreground">
        <span>{data.tools.length} tools</span>
        <span>{categories.length} categories</span>
      </div>

      {/* Clickable Summary Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {counts.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleTabChange(isActive ? null : item.key)}
                className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-all hover:shadow-md ${
                  isActive
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className={`rounded-lg p-2 ${item.bgColor}`}>
                  <Icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{item.count}</p>
                  <p className="text-sm text-muted-foreground">{item.labelJa}</p>
                </div>
              </button>
            );
          })}
        </div>

      {/* Content */}
      {activeTab === null ? (
        // Show all categories
        <CategoryContent toolsByCategory={toolsByCategory} />
      ) : (
        // Show filtered category
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <CategoryCard
            category={activeTab}
            tools={toolsByCategory[activeTab] || []}
            config={categoryConfigs[activeTab] || categoryConfigs.default}
          />
        </div>
      )}

      {/* Generated timestamp */}
      <footer className="text-center text-sm text-muted-foreground">
        <p>Generated at {new Date(data.generatedAt).toLocaleString()}</p>
      </footer>
    </div>
  );
}
