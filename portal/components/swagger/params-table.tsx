/**
 * Parameters Table for Swagger-style display
 *
 * Displays tool parameters in a compact table format.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface ApiToolParam {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  default?: unknown;
}

interface ParamsTableProps {
  params: ApiToolParam[];
}

export function ParamsTable({ params }: ParamsTableProps) {
  if (!params || params.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No parameters
      </p>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-[140px]">Name</TableHead>
            <TableHead className="w-[100px]">Type</TableHead>
            <TableHead className="w-[80px] text-center">Required</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {params.map((param) => (
            <TableRow key={param.name}>
              <TableCell className="font-mono text-sm text-primary">
                {param.name}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {param.type}
              </TableCell>
              <TableCell className="text-center">
                {param.required ? (
                  <span className="text-red-500 font-medium">*</span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {param.description || "-"}
                {param.default !== undefined && (
                  <span className="ml-2 text-xs opacity-70">
                    (default: {String(param.default)})
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
