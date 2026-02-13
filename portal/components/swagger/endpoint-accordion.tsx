/**
 * Endpoint Accordion for Swagger-style display
 *
 * Displays a single API tool as an expandable accordion item
 * with method badge, name, description, and parameter details.
 */

import Link from "next/link";
import { ExternalLink, FlaskConical, Database, Shield } from "lucide-react";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { MethodBadge, type HttpMethod } from "./method-badge";
import { ParamsTable, type ApiToolParam } from "./params-table";

export interface ApiToolData {
  name: string;
  description: string;
  params?: ApiToolParam[];
  sourceFile?: string;
  category?: string;
  feature?: string;
  dbTables?: string[];
  authLevel?: string;
  httpMethod?: HttpMethod;
  testCoverage?: {
    hasTest: boolean;
    totalTests: number;
    coverageScore: number;
  };
}

interface EndpointAccordionProps {
  tool: ApiToolData;
}

export function EndpointAccordion({ tool }: EndpointAccordionProps) {
  const method = tool.httpMethod || "POST";
  const coverage = tool.testCoverage;

  return (
    <AccordionItem value={tool.name} className="border-b-0">
      <AccordionTrigger className="hover:no-underline py-2 px-3 rounded-md hover:bg-muted/50 [&>svg]:hidden group">
        <div className="flex items-center gap-3 w-full">
          <MethodBadge method={method} />
          <span className="font-mono text-sm font-medium group-hover:text-primary transition-colors">
            {tool.name}
          </span>
          <span className="text-sm text-muted-foreground truncate flex-1 text-left">
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
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <div className="pl-[68px] space-y-4">
          {/* Parameters */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
              Parameters
            </h4>
            <ParamsTable params={tool.params || []} />
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
      </AccordionContent>
    </AccordionItem>
  );
}
