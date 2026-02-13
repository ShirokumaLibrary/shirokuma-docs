import Link from "next/link";
import { Database, AlertCircle, Server, ArrowRight } from "lucide-react";
import { loadDbSchema, getDbList } from "@/lib/data-loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPortalFormat } from "@/lib/format";
import { DbSchemaDocument } from "./db-schema-document";

export const dynamic = "force-static";

/**
 * DB Schema Landing Page
 *
 * Shows database list with navigation to each DB's tables.
 * URL structure: /db-schema/{dbName}/{table}
 */
export default async function DbSchemaPage() {
  const [data, dbList] = await Promise.all([
    loadDbSchema(),
    getDbList(),
  ]);
  const format = getPortalFormat();

  // No schema data
  if (!data || data.tables.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Database Schema</h1>
          <p className="mt-2 text-muted-foreground">
            PostgreSQL database tables and relationships
          </p>
        </header>
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No schema data available</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Run <code className="rounded bg-muted px-1.5 py-0.5 font-mono">shirokuma-docs schema</code> to generate.
          </p>
        </div>
      </div>
    );
  }

  const totalTables = dbList.reduce((sum, db) => sum + db.tableCount, 0);

  // Document format
  if (format === "document") {
    return (
      <div className="space-y-8">
        <header>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2">
              <Database className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Database Schema</h1>
              <p className="mt-1 text-muted-foreground">
                PostgreSQL database tables and relationships
              </p>
            </div>
          </div>
        </header>
        <DbSchemaDocument
          dbList={dbList}
          totalTables={totalTables}
          generatedAt={data.generatedAt}
        />
      </div>
    );
  }

  // Card format (default)
  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2">
            <Database className="h-6 w-6 text-purple-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Database Schema</h1>
            <p className="mt-1 text-muted-foreground">
              {dbList.length === 1
                ? `${totalTables} tables`
                : `${dbList.length} databases - ${totalTables} tables total`}
            </p>
          </div>
        </div>
      </header>

      {/* Database List */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Server className="h-5 w-5" />
          {dbList.length === 1 ? "Database" : "Databases"}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dbList.map((db) => (
            <Link key={db.name} href={`/db-schema/${encodeURIComponent(db.name)}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2">
                      <Server className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-mono">{db.name}</CardTitle>
                      <CardDescription>
                        {db.tableCount} tables
                      </CardDescription>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                {db.description && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      {db.description}
                    </p>
                  </CardContent>
                )}
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      {data.generatedAt && (
        <footer className="text-center text-sm text-muted-foreground">
          Generated at {new Date(data.generatedAt).toLocaleString()}
        </footer>
      )}
    </div>
  );
}
