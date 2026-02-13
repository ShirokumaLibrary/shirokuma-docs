import Link from "next/link";
import { AlertCircle, ArrowLeft, Database } from "lucide-react";
import { loadDbSchema, getDbList, loadFeatureMap, loadApiTools } from "@/lib/data-loader";
import { TableDetail } from "../../table-detail";
import { TableDetailDocument } from "../../table-detail-document";
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
 * Generate static paths for all database/table combinations
 */
export async function generateStaticParams() {
  const dbList = await getDbList();
  const params: { db: string; table: string }[] = [];

  for (const db of dbList) {
    const dbData = await loadDbSchema(db.name);
    if (dbData) {
      for (const table of dbData.tables) {
        params.push({
          db: encodeURIComponent(db.name),
          table: encodeURIComponent(table.name),
        });
      }
    }
  }

  return params;
}

interface PageProps {
  params: Promise<{ db: string; table: string }>;
}

/**
 * Table detail page for multi-DB setups
 */
export default async function DbTableDetailPage({ params }: PageProps) {
  const { db: dbParam, table: tableParam } = await params;
  const dbName = decodeURIComponent(dbParam);
  const tableName = decodeURIComponent(tableParam);

  const [data, featureMap, apiTools] = await Promise.all([
    loadDbSchema(dbName),
    loadFeatureMap(),
    loadApiTools(),
  ]);
  const format = getPortalFormat();

  if (!data) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/db-schema">DB Schema</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/db-schema/${encodeURIComponent(dbName)}`}>{dbName}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{tableName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Database not found: {dbName}</h3>
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

  const table = data.tables.find((t) => t.name === tableName);
  if (!table) {
    return (
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/db-schema">DB Schema</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/db-schema/${encodeURIComponent(dbName)}`}>{dbName}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{tableName}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Table not found: {tableName}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            in database: {dbName}
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href={`/db-schema/${encodeURIComponent(dbName)}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {dbName}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const urlPrefix = `/db-schema/${encodeURIComponent(dbName)}`;

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
              <BreadcrumbLink asChild>
                <Link href={`/db-schema/${encodeURIComponent(dbName)}`}>{dbName}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{tableName}</BreadcrumbPage>
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
                <span className="font-mono">{tableName}</span>
              </h1>
              {table.description && (
                <p className="mt-1 text-muted-foreground">{table.description}</p>
              )}
            </div>
          </div>
        </header>

        {/* Table Detail - Document Format */}
        <TableDetailDocument
          table={table}
          allTables={data.tables}
          featureMap={featureMap}
          apiTools={apiTools}
          urlPrefix={urlPrefix}
          dbName={dbName}
        />
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
            <BreadcrumbLink asChild>
              <Link href={`/db-schema/${encodeURIComponent(dbName)}`}>{dbName}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{tableName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Table Detail */}
      <TableDetail
        table={table}
        allTables={data.tables}
        featureMap={featureMap}
        apiTools={apiTools}
        urlPrefix={urlPrefix}
        dbName={dbName}
      />
    </div>
  );
}
