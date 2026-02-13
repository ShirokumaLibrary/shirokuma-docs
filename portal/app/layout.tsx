import type { Metadata } from "next";
import { GlobalHeader } from "@/components/layout/global-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarProvider } from "@/lib/sidebar-context";
import { LayoutContent } from "@/components/layout/layout-content";
import { getProjectName, getSidebarNavData, loadSearchIndex } from "@/lib/data-loader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Documentation Portal",
  description: "Auto-generated documentation portal",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const projectName = getProjectName();
  const [navData, searchIndex] = await Promise.all([
    getSidebarNavData(),
    loadSearchIndex(),
  ]);

  return (
    <html lang="ja">
      <body className="min-h-screen bg-background antialiased">
        <SidebarProvider>
          <GlobalHeader projectName={projectName} navData={navData} searchIndex={searchIndex} />
          <LayoutContent navData={navData}>
            {children}
          </LayoutContent>
        </SidebarProvider>
      </body>
    </html>
  );
}
