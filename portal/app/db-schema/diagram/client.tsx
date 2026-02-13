"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, PanelLeftOpen, PanelLeftClose, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ReactFlowErDiagram,
  type ReactFlowErDiagramRef,
} from "@/components/reactflow-er-diagram";
import { useSidebar } from "@/lib/sidebar-context";
import type { DbSchemaData } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  normalizeCategory,
  inferCategory,
  getCategoryConfig,
} from "@/lib/db-schema-utils";

interface ErDiagramClientProps {
  data: DbSchemaData;
  /** Database name (for multi-DB mode) */
  dbName?: string;
}

export function ErDiagramClient({ data, dbName }: ErDiagramClientProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { collapseTemporarily, restorePersistedState, setHideExpandButton } = useSidebar();
  const diagramRef = useRef<ReactFlowErDiagramRef>(null);

  // Temporarily collapse the main sidebar on mount, restore on unmount
  useEffect(() => {
    collapseTemporarily();
    setHideExpandButton(true);

    return () => {
      setHideExpandButton(false);
      restorePersistedState();
    };
  }, [collapseTemporarily, restorePersistedState, setHideExpandButton]);

  // Prepare data for diagram
  const drawflowTables = useMemo(() => {
    return data.tables.map((table) => ({
      name: table.name,
      category: normalizeCategory(table.category) || inferCategory(table.name),
      columns: table.columns?.map((col) => ({
        name: col.name,
        type: col.type.split(" ")[0],
        primaryKey: col.primaryKey,
      })),
    }));
  }, [data.tables]);

  const drawflowForeignKeys = useMemo(() => {
    const fks: {
      table: string;
      column: string;
      referencesTable: string;
      referencesColumn: string;
    }[] = [];
    for (const table of data.tables) {
      if (table.foreignKeys) {
        for (const fk of table.foreignKeys) {
          fks.push({
            table: table.name,
            column: fk.column,
            referencesTable: fk.references.table,
            referencesColumn: fk.references.column,
          });
        }
      }
    }
    return fks;
  }, [data.tables]);

  // Group tables by category
  const tablesByCategory = useMemo(() => {
    const grouped: Record<string, typeof drawflowTables> = {};
    for (const table of drawflowTables) {
      const category = table.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(table);
    }
    return grouped;
  }, [drawflowTables]);

  const categories = Object.keys(tablesByCategory).sort();

  const handleTableClick = useCallback((tableName: string) => {
    setSelectedTable(tableName);
    diagramRef.current?.navigateToTable(tableName);
  }, []);

  return (
    <div className="fixed inset-0 top-[57px] flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col h-full min-h-0 border-r border-border bg-card transition-all duration-300",
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Database className="h-4 w-4" />
            <span>Tables ({data.tables.length})</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSidebarCollapsed(true)}
            title="サイドバーを閉じる"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>

        {/* Table list */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-2 space-y-4">
            {categories.map((category) => {
              const config = getCategoryConfig(category);
              return (
                <div key={category}>
                  {/* Category header */}
                  <div className="flex items-center gap-2 px-2 py-1 mb-1">
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded capitalize",
                        config.bgColor
                      )}
                    >
                      {config.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({tablesByCategory[category].length})
                    </span>
                  </div>

                  {/* Tables */}
                  <div className="space-y-0.5">
                    {tablesByCategory[category].map((table) => (
                      <button
                        key={table.name}
                        onClick={() => handleTableClick(table.name)}
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
              );
            })}
          </div>
        </ScrollArea>

        {/* Back link */}
        <div className="p-2 border-t border-border shrink-0">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-start"
          >
            <Link href={dbName ? `/db-schema/${encodeURIComponent(dbName)}` : "/db-schema"}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {dbName ? dbName : "DB Schema"}
            </Link>
          </Button>
        </div>
      </aside>

      {/* Expand button (when sidebar collapsed) */}
      {sidebarCollapsed && (
        <Button
          variant="outline"
          size="icon"
          className="absolute left-2 top-2 h-8 w-8 bg-background shadow-md z-10"
          onClick={() => setSidebarCollapsed(false)}
          title="サイドバーを開く"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </Button>
      )}

      {/* Diagram Area */}
      <div className="flex-1">
        <ReactFlowErDiagram
          ref={diagramRef}
          tables={drawflowTables}
          foreignKeys={drawflowForeignKeys}
          className="h-full"
          fullscreen
        />
      </div>
    </div>
  );
}
