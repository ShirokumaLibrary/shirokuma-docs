import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { loadDbSchema, getDbList } from "@/lib/data-loader";
import { ErDiagramClient } from "../../diagram/client";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export const dynamic = "force-static";
export const dynamicParams = false;

/**
 * Generate static paths for all database diagrams
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
 * ER Diagram page for a specific database (multi-DB mode)
 */
export default async function DbDiagramPage({ params }: PageProps) {
  const { db: dbParam } = await params;
  const dbName = decodeURIComponent(dbParam);

  const data = await loadDbSchema(dbName);

  if (!data || data.tables.length === 0) {
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
              <BreadcrumbPage>Diagram</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No schema data for: {dbName}</h3>
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

  return <ErDiagramClient data={data} dbName={dbName} />;
}
