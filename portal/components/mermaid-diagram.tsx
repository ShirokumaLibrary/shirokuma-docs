"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

// Initialize mermaid with dark mode support and link handling
mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  securityLevel: "loose",
  fontFamily: "ui-sans-serif, system-ui, sans-serif",
  themeVariables: {
    // Dark theme colors
    primaryColor: "#3b82f6",
    primaryTextColor: "#fafafa",
    primaryBorderColor: "#3b82f6",
    lineColor: "#6b7280",
    secondaryColor: "#262626",
    tertiaryColor: "#1e1e1e",
    // Node colors
    nodeBorder: "#3b82f6",
    nodeTextColor: "#fafafa",
    // Background
    background: "#141414",
    mainBkg: "#1e1e1e",
    // Clickable node styling
    clusterBkg: "#262626",
    clusterBorder: "#3b82f6",
  },
  flowchart: {
    htmlLabels: true,
    curve: "basis",
  },
});

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
        const { svg } = await mermaid.render(id, chart);
        setSvg(svg);
        setError(null);
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(err instanceof Error ? err.message : "Failed to render diagram");
      }
    };

    renderDiagram();
  }, [chart]);

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Diagram rendering error: {error}</p>
        <pre className="mt-2 overflow-x-auto rounded bg-muted p-2 text-xs">
          <code>{chart}</code>
        </pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`my-4 flex justify-center overflow-x-auto rounded-lg bg-card p-4 ${className || ""}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
