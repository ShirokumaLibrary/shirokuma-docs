"use client";

import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Home, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import dagre from "dagre";

interface TableInfo {
  name: string;
  category?: string;
  columns?: { name: string; type: string; primaryKey?: boolean }[];
}

interface ForeignKey {
  table: string;
  column: string;
  referencesTable: string;
  referencesColumn: string;
}

interface DrawflowErDiagramProps {
  tables: TableInfo[];
  foreignKeys: ForeignKey[];
  className?: string;
  fullscreen?: boolean;
}

export interface DrawflowErDiagramRef {
  navigateToTable: (tableName: string) => void;
}

// Category colors for nodes (CSS color values for inline styles)
const categoryColors: Record<string, { bg: string; border: string; header: string }> = {
  auth: { bg: "#eff6ff", border: "#93c5fd", header: "#dbeafe" },
  organization: { bg: "#faf5ff", border: "#c4b5fd", header: "#ede9fe" },
  project: { bg: "#fffbeb", border: "#fcd34d", header: "#fef3c7" },
  session: { bg: "#ecfeff", border: "#67e8f9", header: "#cffafe" },
  entity: { bg: "#fff1f2", border: "#fda4af", header: "#ffe4e6" },
  activity: { bg: "#eef2ff", border: "#a5b4fc", header: "#e0e7ff" },
  token: { bg: "#fff7ed", border: "#fdba74", header: "#ffedd5" },
  content: { bg: "#f0fdf4", border: "#86efac", header: "#dcfce7" },
  other: { bg: "#f9fafb", border: "#d1d5db", header: "#f3f4f6" },
};

// Generate HTML for a table node with inline styles
function generateTableNodeHtml(table: TableInfo): string {
  const category = table.category || "other";
  const colors = categoryColors[category] || categoryColors.other;

  const columnsHtml = (table.columns || [])
    .map((col) => {
      const pkIcon = col.primaryKey ? '<span style="color: #f59e0b; margin-right: 4px;">🔑</span>' : "";
      return `<div style="display: flex; align-items: center; gap: 8px; padding: 2px 8px; font-size: 11px; border-top: 1px solid #e5e7eb;">
        ${pkIcon}<span style="font-family: monospace; color: #374151;">${col.name}</span>
        <span style="color: #9ca3af; margin-left: auto; font-size: 10px;">${col.type}</span>
      </div>`;
    })
    .join("");

  return `
    <div class="er-table-node" style="
      border-radius: 8px;
      border: 2px solid ${colors.border};
      background: ${colors.bg};
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      overflow: hidden;
      min-width: 160px;
    ">
      <div style="
        padding: 6px 10px;
        font-weight: 600;
        font-size: 12px;
        background: ${colors.header};
        color: #1f2937;
      ">
        ${table.name}
      </div>
      <div style="background: white;">
        ${columnsHtml}
      </div>
    </div>
  `;
}

// Calculate initial positions using dagre for relationship-based layout
function calculateInitialPositions(
  tables: TableInfo[],
  foreignKeys: ForeignKey[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  // Create a new directed graph
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: "TB",      // Top to bottom layout
    nodesep: 80,        // Horizontal separation between nodes
    ranksep: 120,       // Vertical separation between ranks
    marginx: 50,
    marginy: 50,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Estimate node dimensions based on column count
  tables.forEach((table) => {
    const columnCount = table.columns?.length || 0;
    const height = 30 + columnCount * 18; // header + columns
    const width = 180;
    g.setNode(table.name, { width, height });
  });

  // Add edges for foreign key relationships
  foreignKeys.forEach((fk) => {
    // Edge goes from referenced table (parent) to referencing table (child)
    if (fk.referencesTable !== fk.table) {
      g.setEdge(fk.referencesTable, fk.table);
    }
  });

  // Run the dagre layout algorithm
  dagre.layout(g);

  // Extract positions from the layout
  g.nodes().forEach((nodeName) => {
    const node = g.node(nodeName);
    if (node) {
      // dagre gives center positions, convert to top-left
      positions.set(nodeName, {
        x: node.x - (node.width || 180) / 2,
        y: node.y - (node.height || 100) / 2,
      });
    }
  });

  return positions;
}

export const DrawflowErDiagram = forwardRef<DrawflowErDiagramRef, DrawflowErDiagramProps>(
  function DrawflowErDiagram({ tables, foreignKeys, className, fullscreen = false }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<unknown>(null);
  const nodeIdsRef = useRef<Map<string, number>>(new Map());
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [isLoaded, setIsLoaded] = useState(false);

  // Navigate to a specific table by centering it in the view
  const navigateToTable = useCallback((tableName: string) => {
    setSelectedTable(tableName);

    if (!containerRef.current) return;

    const editor = editorRef.current as {
      canvas_x: number;
      canvas_y: number;
      zoom: number;
      precanvas: HTMLElement;
      node_selected: string | null;
      dispatch: (event: string, data: unknown) => void;
      getNodeFromId: (id: number) => unknown;
    } | null;

    if (!editor) return;

    // Get node ID from our stored map
    const nodeId = nodeIdsRef.current.get(tableName);
    if (!nodeId) return;

    // Find the node element by ID
    const targetNode = containerRef.current.querySelector(`#node-${nodeId}`) as HTMLElement;
    if (!targetNode) return;

    // Get node position from style
    const nodeX = parseFloat(targetNode.style.left) || 0;
    const nodeY = parseFloat(targetNode.style.top) || 0;

    // Get container dimensions
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    // Calculate the position to center the node
    const targetX = containerWidth / 2 - nodeX - 100;
    const targetY = containerHeight / 2 - nodeY - 80;

    // Update Drawflow's internal canvas position
    editor.canvas_x = targetX;
    editor.canvas_y = targetY;
    editor.zoom = 1;

    // Apply transform directly to precanvas
    if (editor.precanvas) {
      editor.precanvas.style.transform = `translate(${targetX}px, ${targetY}px) scale(1)`;
    }

    setZoom(100);

    // Clear previous selection
    containerRef.current.querySelectorAll(".drawflow-node.selected").forEach((node) => {
      node.classList.remove("selected");
    });

    // Select the node using Drawflow's mechanism
    targetNode.classList.add("selected");
    editor.node_selected = `node-${nodeId}`;
    editor.dispatch("nodeSelected", nodeId);
  }, []);

  // Expose navigateToTable to parent via ref
  useImperativeHandle(ref, () => ({
    navigateToTable,
  }), [navigateToTable]);

  // Initialize Drawflow (dynamic import to avoid SSR issues)
  useEffect(() => {
    if (!containerRef.current || editorRef.current) return;

    // Load Drawflow CSS from CDN
    const cssId = "drawflow-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://cdn.jsdelivr.net/gh/jerosoler/Drawflow/dist/drawflow.min.css";
      document.head.appendChild(link);
    }

    // Dynamic import of Drawflow
    import("drawflow").then((DrawflowModule) => {
      const Drawflow = DrawflowModule.default;
      const editor = new Drawflow(containerRef.current!);

      editor.reroute = true;
      editor.reroute_fix_curvature = false;  // Match official demo
      editor.force_first_input = false;
      editor.start();

      // Store editor reference
      editorRef.current = editor;

      // Calculate positions
      const positions = calculateInitialPositions(tables, foreignKeys);

      // Add table nodes
      tables.forEach((table) => {
        const pos = positions.get(table.name) || { x: 100, y: 100 };
        const html = generateTableNodeHtml(table);

        const nodeId = editor.addNode(
          table.name,
          1,
          1,
          pos.x,
          pos.y,
          table.category || "other",
          {},
          html,
          false
        );
        // Store node ID for later reference
        nodeIdsRef.current.set(table.name, nodeId);
      });

      // Add connections after a delay to ensure DOM is ready
      setTimeout(() => {
        console.log("Adding connections for", foreignKeys.length, "foreign keys");

        foreignKeys.forEach((fk) => {
          const sourceId = nodeIdsRef.current.get(fk.referencesTable);
          const targetId = nodeIdsRef.current.get(fk.table);

          if (sourceId && targetId && sourceId !== targetId) {
            try {
              editor.addConnection(sourceId, targetId, "output_1", "input_1");
            } catch (e) {
              console.error("Connection error:", e);
            }
          }
        });

      }, 200);

      // Block delete operations
      containerRef.current!.addEventListener("contextmenu", (e) => e.preventDefault());

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      document.addEventListener("keydown", handleKeyDown);

      setIsLoaded(true);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    });
  }, [tables, foreignKeys]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    const editor = editorRef.current as { zoom_in: () => void; zoom: number } | null;
    if (editor) {
      editor.zoom_in();
      setZoom(Math.round(editor.zoom * 100));
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    const editor = editorRef.current as { zoom_out: () => void; zoom: number } | null;
    if (editor) {
      editor.zoom_out();
      setZoom(Math.round(editor.zoom * 100));
    }
  }, []);

  const handleZoomReset = useCallback(() => {
    const editor = editorRef.current as { zoom_reset: () => void; zoom: number } | null;
    if (editor) {
      editor.zoom_reset();
      setZoom(100);
    }
  }, []);

  // Reset view to initial position
  const handleViewReset = useCallback(() => {
    const parentDrawflow = containerRef.current?.querySelector('.parent-drawflow') as HTMLElement;
    if (parentDrawflow) {
      parentDrawflow.style.transform = 'translate(0px, 0px) scale(1)';
      setZoom(100);
    }
  }, []);

  // Navigate to table
  const handleTableClick = useCallback((tableName: string) => {
    setSelectedTable(tableName);
    if (containerRef.current) {
      const nodeEl = containerRef.current.querySelector(`[data-name="${tableName}"]`) ||
        Array.from(containerRef.current.querySelectorAll(".drawflow-node")).find(
          (el) => el.textContent?.includes(tableName)
        );
      if (nodeEl) {
        nodeEl.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        (nodeEl as HTMLElement).style.boxShadow = "0 0 0 3px #3b82f6";
        setTimeout(() => {
          (nodeEl as HTMLElement).style.boxShadow = "";
        }, 2000);
      }
    }
  }, []);

  // Fullscreen mode - just the diagram with zoom controls
  if (fullscreen) {
    return (
      <div className={cn("flex flex-col h-full", className)}>
        {/* Zoom Controls */}
        <div className="flex items-center gap-2 p-3 bg-background border-b shrink-0">
          <div className="flex items-center gap-1 rounded-md border p-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleZoomOut}
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-14 text-center text-sm tabular-nums">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleZoomIn}
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomReset}
            title="Reset zoom"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleViewReset}
            title="ビューをリセット"
          >
            <Home className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            {isLoaded ? "Drag tables to rearrange" : "Loading..."}
          </span>
          <a
            href="https://jerosoler.github.io/Drawflow/"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Drawflow Demo
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Drawflow Container - fills remaining space */}
        <div
          ref={containerRef}
          className="drawflow-container flex-1"
          style={{
            width: "100%",
            minHeight: "500px",
            backgroundColor: "#f8fafc",
            backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            backgroundAttachment: "local",
            position: "relative",
          }}
        />

        {/* Minimal custom styles - base styles from CDN */}
        <style jsx global>{`
          /* Custom colors for connections */
          .drawflow .connection .main-path {
            stroke: #3b82f6;
            stroke-width: 2;
          }

          .drawflow .connection .main-path:hover {
            stroke: #1d4ed8;
            stroke-width: 3;
          }

          /* Custom input/output colors */
          .drawflow .drawflow-node .input,
          .drawflow .drawflow-node .output {
            background: #3b82f6;
            border: 2px solid white;
          }

          /* Selection highlight */
          .drawflow .drawflow-node.selected .er-table-node {
            box-shadow: 0 0 0 2px #3b82f6 !important;
          }

          /* Hide delete button */
          .drawflow .drawflow-delete {
            display: none !important;
          }

          /* Node background transparent */
          .drawflow .drawflow-node {
            background: transparent;
            border: none;
            padding: 0;
          }
        `}</style>
      </div>
    );
  }

  // Normal mode - with sidebar
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
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="w-14 text-center text-sm tabular-nums">
              {zoom}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleZoomIn}
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomReset}
            title="Reset zoom"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleViewReset}
            title="ビューをリセット"
          >
            <Home className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            {isLoaded ? "Drag tables to rearrange" : "Loading..."}
          </span>
        </div>

        {/* Drawflow Container */}
        <div
          ref={containerRef}
          className="drawflow-container rounded-lg border"
          style={{
            height: "600px",
            width: "100%",
            backgroundColor: "#f8fafc",
            backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            position: "relative",
          }}
        />

        {/* Help Text */}
        <p className="mt-2 text-xs text-muted-foreground">
          Drag tables to rearrange. Connections show foreign key relationships.
        </p>
      </div>

      {/* Minimal custom styles - base styles from CDN */}
      <style jsx global>{`
        /* Custom colors for connections */
        .drawflow .connection .main-path {
          stroke: #3b82f6;
          stroke-width: 2;
        }

        .drawflow .connection .main-path:hover {
          stroke: #1d4ed8;
          stroke-width: 3;
        }

        /* Custom input/output colors */
        .drawflow .drawflow-node .input,
        .drawflow .drawflow-node .output {
          background: #3b82f6;
          border: 2px solid white;
        }

        /* Selection highlight */
        .drawflow .drawflow-node.selected .er-table-node {
          box-shadow: 0 0 0 2px #3b82f6 !important;
        }

        /* Hide delete button */
        .drawflow .drawflow-delete {
          display: none !important;
        }

        /* Node background transparent */
        .drawflow .drawflow-node {
          background: transparent;
          border: none;
          padding: 0;
        }
      `}</style>
    </div>
  );
});
