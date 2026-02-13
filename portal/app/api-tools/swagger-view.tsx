/**
 * Swagger-style view for API Tools
 *
 * Groups tools by category and displays them in expandable
 * accordion format similar to Swagger UI.
 */

"use client";

import { Accordion } from "@/components/ui/accordion";
import { EndpointAccordion, type ApiToolData } from "@/components/swagger";
import { Play, Layers, Database, Wrench, type LucideIcon } from "lucide-react";

// Category config (same as api-tools-client)
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

interface SwaggerViewProps {
  tools: ApiToolData[];
}

export function SwaggerView({ tools }: SwaggerViewProps) {
  // Group tools by category
  const grouped: Record<string, ApiToolData[]> = {};
  for (const tool of tools) {
    const category = tool.category || "default";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(tool);
  }

  const categories = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      {categories.map((category) => {
        const config = categoryConfigs[category] || categoryConfigs.default;
        const Icon = config.icon;
        const categoryTools = grouped[category];

        return (
          <div
            key={category}
            className={`rounded-lg border ${config.borderColor} overflow-hidden`}
          >
            {/* Category header */}
            <div
              className={`flex items-center gap-2 px-4 py-3 ${config.bgColor}`}
            >
              <Icon className={`h-4 w-4 ${config.color}`} />
              <span className="font-semibold text-sm">
                {config.labelJa}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                ({categoryTools.length} tools)
              </span>
            </div>

            {/* Tools accordion */}
            <Accordion type="multiple" className="px-2 pb-2">
              {categoryTools.map((tool) => (
                <EndpointAccordion key={tool.name} tool={tool} />
              ))}
            </Accordion>
          </div>
        );
      })}
    </div>
  );
}
