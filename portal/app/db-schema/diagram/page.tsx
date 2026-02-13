import { redirect } from "next/navigation";
import { getDbList } from "@/lib/data-loader";

export const dynamic = "force-static";

/**
 * Legacy diagram route - redirects to first database's diagram
 *
 * New URL structure: /db-schema/{dbName}/diagram
 */
export default async function ErDiagramPage() {
  const dbList = await getDbList();

  if (dbList.length > 0) {
    redirect(`/db-schema/${encodeURIComponent(dbList[0].name)}/diagram`);
  }

  // No databases, redirect to schema root
  redirect("/db-schema");
}
