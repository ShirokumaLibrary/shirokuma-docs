"use client";

import { useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import ELK from "elkjs/lib/elk.bundled.js";
import { cn } from "@/lib/utils";

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

interface ReactFlowErDiagramProps {
  tables: TableInfo[];
  foreignKeys: ForeignKey[];
  className?: string;
  fullscreen?: boolean;
}

export interface ReactFlowErDiagramRef {
  navigateToTable: (tableName: string) => void;
}

// Category colors for nodes
const categoryColors: Record<string, { bg: string; border: string; header: string }> = {
  auth: { bg: "#eff6ff", border: "#3b82f6", header: "#dbeafe" },
  organization: { bg: "#faf5ff", border: "#a855f7", header: "#ede9fe" },
  project: { bg: "#fffbeb", border: "#f59e0b", header: "#fef3c7" },
  session: { bg: "#ecfeff", border: "#06b6d4", header: "#cffafe" },
  entity: { bg: "#fff1f2", border: "#f43f5e", header: "#ffe4e6" },
  activity: { bg: "#eef2ff", border: "#6366f1", header: "#e0e7ff" },
  token: { bg: "#fff7ed", border: "#f97316", header: "#ffedd5" },
  content: { bg: "#f0fdf4", border: "#22c55e", header: "#dcfce7" },
  other: { bg: "#f9fafb", border: "#6b7280", header: "#f3f4f6" },
};

// Normalize category name to match categoryOrder
function normalizeCategory(category: string | undefined): string {
  if (!category) return "other";
  const lower = category.toLowerCase();

  // Handle aliases
  if (lower === "authentication" || lower === "auth") return "auth";
  if (lower === "organizations" || lower === "organization") return "organization";
  if (lower === "projects" || lower === "project") return "project";
  if (lower === "sessions" || lower === "session" || lower === "work sessions") return "session";
  if (lower === "entities" || lower === "entity") return "entity";
  if (lower === "activities" || lower === "activity") return "activity";
  if (lower === "tokens" || lower === "token" || lower === "mcp tokens") return "token";
  if (lower === "content" || lower === "contents") return "content";
  if (lower === "user context" || lower === "context") return "other";

  return "other";
}

// Custom node component for tables
function TableNode({ data }: { data: { label: string; category: string; columns: { name: string; type: string; primaryKey?: boolean }[] } }) {
  const colors = categoryColors[data.category] || categoryColors.other;

  return (
    <div
      className="er-table-node"
      style={{
        borderRadius: 8,
        border: `2px solid ${colors.border}`,
        background: colors.bg,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        overflow: "visible",
        minWidth: 180,
        fontSize: 12,
        position: "relative",
      }}
    >
      {/* Connection handles - Left for target (incoming), Right for source (outgoing) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: colors.border,
          width: 8,
          height: 8,
          border: "2px solid white",
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: colors.border,
          width: 8,
          height: 8,
          border: "2px solid white",
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          fontWeight: 600,
          background: colors.header,
          color: "#1f2937",
          borderBottom: `1px solid ${colors.border}`,
          borderRadius: "6px 6px 0 0",
        }}
      >
        {data.label}
      </div>

      {/* Columns */}
      <div style={{ background: "white", borderRadius: "0 0 6px 6px" }}>
        {data.columns.map((col, idx) => (
          <div
            key={col.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderTop: idx > 0 ? "1px solid #e5e7eb" : "none",
              fontSize: 11,
            }}
          >
            {col.primaryKey && (
              <span style={{ color: "#f59e0b" }}>🔑</span>
            )}
            <span style={{ fontFamily: "monospace", color: "#374151" }}>
              {col.name}
            </span>
            <span style={{ color: "#9ca3af", marginLeft: "auto", fontSize: 10 }}>
              {col.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  table: TableNode,
};

// ELK instance
const elk = new ELK();

// Calculate node dimensions
function getNodeDimensions(table: TableInfo): { width: number; height: number } {
  const columnCount = table.columns?.length || 0;
  return {
    width: 220,
    height: 40 + columnCount * 22,
  };
}

// Category display order (left to right)
const categoryOrder = [
  "auth",
  "organization",
  "project",
  "session",
  "entity",
  "activity",
  "token",
  "content",
  "other",
];

// Calculate layout using ELK with hierarchical grouping by category
async function calculateElkLayout(
  tables: TableInfo[],
  foreignKeys: ForeignKey[]
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  // Create a set of valid table names for quick lookup
  const tableNames = new Set(tables.map((t) => t.name));

  // Filter out edges that reference non-existent tables
  const validForeignKeys = foreignKeys.filter(
    (fk) =>
      fk.referencesTable !== fk.table &&
      tableNames.has(fk.table) &&
      tableNames.has(fk.referencesTable)
  );

  // Group tables by category
  const tablesByCategory: Record<string, TableInfo[]> = {};
  for (const table of tables) {
    const category = normalizeCategory(table.category);
    if (!tablesByCategory[category]) {
      tablesByCategory[category] = [];
    }
    tablesByCategory[category].push(table);
  }

  // Create category group nodes with their table children
  const categoryNodes = categoryOrder
    .filter((cat) => tablesByCategory[cat] && tablesByCategory[cat].length > 0)
    .map((category) => {
      const categoryTables = tablesByCategory[category];
      const children = categoryTables.map((table) => {
        const { width, height } = getNodeDimensions(table);
        return {
          id: table.name,
          width,
          height,
          labels: [{ text: table.name }],
        };
      });

      return {
        id: `category-${category}`,
        labels: [{ text: category }],
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": "DOWN",
          "elk.spacing.nodeNode": "30",
          "elk.layered.spacing.nodeNodeBetweenLayers": "40",
          "elk.padding": "[top=40,left=20,bottom=20,right=20]",
        },
        children,
      };
    });

  // Create edges at the root level (between tables in different categories)
  const elkEdges = validForeignKeys.map((fk, idx) => ({
    id: `edge-${idx}`,
    sources: [fk.referencesTable],
    targets: [fk.table],
  }));

  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.spacing.nodeNode": "80",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.layered.spacing.edgeNodeBetweenLayers": "40",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.padding": "[top=50,left=50,bottom=50,right=50]",
    },
    children: categoryNodes,
    edges: elkEdges,
  };

  // Run ELK layout
  const layoutedGraph = await elk.layout(graph);

  // Convert ELK result to React Flow nodes
  const nodes: Node[] = [];

  for (const categoryNode of layoutedGraph.children || []) {
    const categoryX = categoryNode.x || 0;
    const categoryY = categoryNode.y || 0;

    // Add table nodes with absolute positions
    for (const elkNode of categoryNode.children || []) {
      const table = tables.find((t) => t.name === elkNode.id);
      if (!table) continue;

      const category = normalizeCategory(table.category);

      nodes.push({
        id: elkNode.id,
        type: "table",
        position: {
          x: categoryX + (elkNode.x || 0),
          y: categoryY + (elkNode.y || 0),
        },
        data: {
          label: table.name,
          category,
          columns: table.columns || [],
        },
      });
    }
  }

  // Create edges with category-aware colors
  const edges: Edge[] = validForeignKeys.map((fk, idx) => {
    const sourceTable = tables.find((t) => t.name === fk.referencesTable);
    const category = normalizeCategory(sourceTable?.category);
    const colors = categoryColors[category] || categoryColors.other;

    return {
      id: `edge-${idx}-${fk.table}-${fk.referencesTable}`,
      source: fk.referencesTable,
      target: fk.table,
      type: "smoothstep",
      animated: false,
      style: { stroke: colors.border, strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: colors.border,
        width: 20,
        height: 20,
      },
      label: `${fk.column} → ${fk.referencesColumn}`,
      labelStyle: { fontSize: 10, fill: "#6b7280" },
      labelBgStyle: { fill: "white", fillOpacity: 0.8 },
    };
  });

  return { nodes, edges };
}

// Inner component that uses React Flow hooks
function ReactFlowErDiagramInner(
  { tables, foreignKeys, className, onNavigate }: ReactFlowErDiagramProps & { onNavigate?: (fn: (tableName: string) => void) => void }
) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isLayouting, setIsLayouting] = useState(true);
  const { fitView, setCenter, getNode } = useReactFlow();

  // Run ELK layout on mount and when data changes
  useEffect(() => {
    let cancelled = false;

    async function runLayout() {
      setIsLayouting(true);
      try {
        const { nodes: layoutedNodes, edges: layoutedEdges } = await calculateElkLayout(tables, foreignKeys);
        if (!cancelled) {
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
        }
      } catch (error) {
        console.error("ELK layout error:", error);
      } finally {
        if (!cancelled) {
          setIsLayouting(false);
        }
      }
    }

    runLayout();

    return () => {
      cancelled = true;
    };
  }, [tables, foreignKeys, setNodes, setEdges]);

  // Navigate to a specific table
  const navigateToTable = useCallback((tableName: string) => {
    const node = getNode(tableName);
    if (node) {
      const x = node.position.x + (node.measured?.width || 200) / 2;
      const y = node.position.y + (node.measured?.height || 100) / 2;
      setCenter(x, y, { zoom: 1, duration: 500 });

      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === tableName,
          style: n.id === tableName
            ? { ...n.style, boxShadow: "0 0 0 3px #3b82f6" }
            : { ...n.style, boxShadow: undefined },
        }))
      );
    }
  }, [getNode, setCenter, setNodes]);

  // Expose navigate function to parent
  useEffect(() => {
    if (onNavigate) {
      onNavigate(navigateToTable);
    }
  }, [navigateToTable, onNavigate]);

  // Fit view after layout completes
  useEffect(() => {
    if (!isLayouting && nodes.length > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.1, duration: 500, maxZoom: 1.0 });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLayouting, nodes.length, fitView]);

  return (
    <div className={cn("w-full h-full", className)}>
      {isLayouting && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <div className="text-muted-foreground">Calculating layout...</div>
        </div>
      )}
      <ReactFlow
        className="dark"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1, maxZoom: 1.0 }}
        minZoom={0.1}
        maxZoom={2.0}
        defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        selectNodesOnDrag={false}
      >
        <Background color="#94a3b8" gap={24} size={1} />
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={false}
          position="top-right"
        />
      </ReactFlow>
    </div>
  );
}

// Wrapper component with ReactFlowProvider and ref forwarding
export const ReactFlowErDiagram = forwardRef<ReactFlowErDiagramRef, ReactFlowErDiagramProps>(
  function ReactFlowErDiagram({ tables, foreignKeys, className, fullscreen = false }, ref) {
    const [navigateFn, setNavigateFn] = useState<((tableName: string) => void) | null>(null);

    useImperativeHandle(ref, () => ({
      navigateToTable: (tableName: string) => {
        if (navigateFn) {
          navigateFn(tableName);
        }
      },
    }), [navigateFn]);

    const handleNavigate = useCallback((fn: (tableName: string) => void) => {
      setNavigateFn(() => fn);
    }, []);

    return (
      <ReactFlowProvider>
        <ReactFlowErDiagramInner
          tables={tables}
          foreignKeys={foreignKeys}
          className={className}
          fullscreen={fullscreen}
          onNavigate={handleNavigate}
        />
      </ReactFlowProvider>
    );
  }
);
