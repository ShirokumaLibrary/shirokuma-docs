import Link from "next/link";
import { AlertCircle, ArrowLeft, Database } from "lucide-react";
import { loadDbSchema, getDbList } from "@/lib/data-loader";
import { DbSchemaTableList } from "../table-list";
import { DbSchemaTableListDocument } from "../table-list-document";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getPortalFormat } from "@/lib/format";

export const dynamic = "force-static";
export const dynamicParams = false;

/**
 * Generate static paths for all databases
 */
export async function generateStaticParams() {
  const dbList = await getDbList();
  return dbList.map((db) => ({
    db: encodeURIComponent(db.name),
  }));
}

interface PageProps {
  params: Promise<{ db: string }>;
}

/**
 * Database-specific table list page
 *
 * Shows tables for a specific database in multi-DB setups
 */
export default async function DbTableListPage({ params }: PageProps) {
  const { db: dbParam } = await params;
  const dbName = decodeURIComponent(dbParam);

  const data = await loadDbSchema(dbName);
  const format = getPortalFormat();

  if (!data || data.tables.length === 0) {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/db-schema">DB Schema</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{dbName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Database not found: {dbName}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The database may have been renamed or removed.
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/db-schema">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Databases
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Document format
  if (format === "document") {
    return (
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/db-schema">DB Schema</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{dbName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <header>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 dark:bg-purple-900/30 p-2">
              <Database className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-muted-foreground font-normal">Database:</span>{" "}
                <span className="font-mono">{dbName}</span>
              </h1>
              <p className="mt-1 text-muted-foreground">
                {data.tables.length} tables
              </p>
            </div>
          </div>
        </header>

        {/* Table List - Document Format */}
        <DbSchemaTableListDocument data={data} dbName={dbName} />
      </div>
    );
  }

  // Card format (default)
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/db-schema">DB Schema</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{dbName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Table List */}
      <DbSchemaTableList data={data} dbName={dbName} />
    </div>
  );
}
