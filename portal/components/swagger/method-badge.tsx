/**
 * HTTP Method Badge for Swagger-style display
 *
 * Displays HTTP method with appropriate color coding
 * following Swagger UI conventions.
 */

import { cn } from "@/lib/utils";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const METHOD_STYLES: Record<HttpMethod, { bg: string; text: string }> = {
  GET: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
  },
  POST: {
    bg: "bg-green-500/20",
    text: "text-green-400",
  },
  PUT: {
    bg: "bg-amber-500/20",
    text: "text-amber-400",
  },
  DELETE: {
    bg: "bg-red-500/20",
    text: "text-red-400",
  },
  PATCH: {
    bg: "bg-purple-500/20",
    text: "text-purple-400",
  },
};

interface MethodBadgeProps {
  method: HttpMethod;
  className?: string;
}

export function MethodBadge({ method, className }: MethodBadgeProps) {
  const style = METHOD_STYLES[method] || METHOD_STYLES.POST;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-mono font-semibold uppercase tracking-wide min-w-[52px]",
        style.bg,
        style.text,
        className
      )}
    >
      {method}
    </span>
  );
}
