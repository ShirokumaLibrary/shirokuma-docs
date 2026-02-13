"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MermaidDiagram } from "@/components/mermaid-diagram";
import { cn } from "@/lib/utils";

interface TableInfo {
  name: string;
  category?: string;
}

interface InteractiveErDiagramProps {
  chart: string;
  tables: TableInfo[];
  className?: string;
}

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;

export function InteractiveErDiagram({
  chart,
  tables,
  className,
}: InteractiveErDiagramProps) {
  const [zoom, setZoom] = useState(3);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, []);

  const handleZoomFit = useCallback(() => {
    // Fit to container width
    if (containerRef.current && diagramRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      const diagramWidth = diagramRef.current.scrollWidth / zoom;
      const fitZoom = Math.min(containerWidth / diagramWidth, 1);
      setZoom(Math.max(fitZoom, MIN_ZOOM));
    }
  }, [zoom]);

  // Scroll to table when selected
  const handleTableClick = useCallback((tableName: string) => {
    setSelectedTable(tableName);

    // Find the table element in the SVG
    if (diagramRef.current) {
      const svg = diagramRef.current.querySelector("svg");
      if (svg) {
        // Mermaid creates elements with IDs based on entity names
        const tableElement = svg.querySelector(`[id*="${tableName}"]`) ||
          svg.querySelector(`g.entity[id*="${tableName}"]`) ||
          // Try to find text containing the table name
          Array.from(svg.querySelectorAll("text")).find(
            (el) => el.textContent?.includes(tableName)
          )?.closest("g");

        if (tableElement) {
          tableElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });

          // Add highlight effect
          tableElement.classList.add("er-highlight");
          setTimeout(() => {
            tableElement.classList.remove("er-highlight");
          }, 2000);
        }
      }
    }
  }, []);

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === "-") {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === "0") {
          e.preventDefault();
          handleZoomReset();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleZoomIn, handleZoomOut, handleZoomReset]);

  return (
    <div className={cn("flex flex-col lg:flex-row gap-4", className)}>
      {/* Table List Sidebar */}
      <div className="lg:w-48 shrink-0">
        <div className="text-sm font-medium mb-2 text-muted-foreground">
          Tables ({tables.length})
        </div>
        <ScrollArea className="h-[300px] lg:h-[500px] rounded-md border">
          <div className="p-2 space-y-1">
            {tables.map((table) => (
              <button
                key={table.name}
                onClick={() => handleTableClick(table.name)}
                className={cn(
                  "w-full text-left px-2 py-1.5 text-sm rounded-md transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  selectedTable === table.name && "bg-accent text-accent-foreground font-medium"
                )}
              >
                {table.name}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Diagram Area */}
      <div className="flex-1 min-w-0">
        {/* Zoom Controls */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1 rounded-md border p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              title="Zoom out (Ctrl+-)"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-14 text-center text-sm tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              title="Zoom in (Ctrl++)"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomReset}
            title="Reset zoom (Ctrl+0)"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomFit}
            title="Fit to width"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            Ctrl+/- to zoom, Ctrl+0 to reset
          </span>
        </div>

        {/* Scrollable Diagram Container */}
        <div
          ref={containerRef}
          className="overflow-auto rounded-lg border bg-muted/20"
          style={{ maxHeight: "600px" }}
        >
          <div
            ref={diagramRef}
            className="min-w-max p-4"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
            }}
          >
            <MermaidDiagram chart={chart} className="min-h-[400px]" />
          </div>
        </div>

        {/* Help Text */}
        <p className="mt-2 text-xs text-muted-foreground">
          Click a table on the left to navigate. Scroll to pan, use controls to zoom.
        </p>
      </div>

      {/* CSS for highlight effect */}
      <style jsx global>{`
        .er-highlight rect,
        .er-highlight .er-entityBox {
          stroke: hsl(var(--primary)) !important;
          stroke-width: 3px !important;
          animation: pulse 0.5s ease-in-out 2;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
