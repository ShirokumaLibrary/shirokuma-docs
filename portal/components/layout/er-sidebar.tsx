"use client";

import { PanelLeftClose, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSidebar } from "@/lib/sidebar-context";

interface TableInfo {
  name: string;
  category?: string;
}

interface ErSidebarProps {
  tables: TableInfo[];
  selectedTable: string | null;
  onTableSelect: (tableName: string) => void;
  className?: string;
}

// Category colors for badges
const categoryColors: Record<string, string> = {
  auth: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  organization: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  project: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  session: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  entity: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  activity: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  token: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  content: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export function ErSidebar({
  tables,
  selectedTable,
  onTableSelect,
  className,
}: ErSidebarProps) {
  const { collapse } = useSidebar();

  // Group tables by category
  const tablesByCategory = tables.reduce((acc, table) => {
    const category = table.category || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(table);
    return acc;
  }, {} as Record<string, TableInfo[]>);

  const categories = Object.keys(tablesByCategory).sort();

  return (
    <aside className={cn("flex flex-col border-r border-border bg-card", className)}>
      {/* Header with collapse button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Database className="h-4 w-4" />
          <span>Tables ({tables.length})</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={collapse}
          title="サイドバーを閉じる"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Table list grouped by category */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-4">
          {categories.map((category) => (
            <div key={category}>
              {/* Category header */}
              <div className="flex items-center gap-2 px-2 py-1 mb-1">
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded capitalize",
                    categoryColors[category] || categoryColors.other
                  )}
                >
                  {category}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({tablesByCategory[category].length})
                </span>
              </div>

              {/* Tables in category */}
              <div className="space-y-0.5">
                {tablesByCategory[category].map((table) => (
                  <button
                    key={table.name}
                    onClick={() => onTableSelect(table.name)}
                    className={cn(
                      "w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      selectedTable === table.name &&
                        "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    {table.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
