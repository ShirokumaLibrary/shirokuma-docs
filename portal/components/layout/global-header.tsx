"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Book, Layers, Database, CheckCircle, Menu, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AppSidebar, type SidebarNavData } from "./app-sidebar";
import { SearchButton } from "@/components/search-dialog";
import type { SearchIndex } from "@/lib/search";

interface GlobalHeaderProps {
  projectName: string;
  navData: SidebarNavData;
  searchIndex: SearchIndex | null;
}

function getNavItems(navData: SidebarNavData) {
  const items = [
    { href: "/", label: "トップ", icon: Book },
    { href: "/feature-map", label: "機能マップ", icon: Layers },
    { href: "/db-schema", label: "DBスキーマ", icon: Database },
    { href: "/test-cases", label: "テスト", icon: CheckCircle },
  ];

  // Add API apps from configuration (MCP, REST, etc.)
  if (navData.applications?.apps) {
    for (const app of navData.applications.apps) {
      if (app.type === "api") {
        const toolsSection = app.sections.find(s => s.type === "tools");
        if (toolsSection?.available !== false) {
          items.push({
            href: `/apps/${app.id}/tools`,
            label: app.name,
            icon: Bot,
          });
        }
      }
    }
  }

  return items;
}

export function GlobalHeader({ projectName, navData, searchIndex }: GlobalHeaderProps) {
  const pathname = usePathname();
  const navItems = getNavItems(navData);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-14 items-center px-4">
        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2 lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">メニューを開く</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="border-b border-border px-4 py-3">
              <SheetTitle className="text-left text-sm font-semibold">
                {projectName} Docs
              </SheetTitle>
            </SheetHeader>
            <AppSidebar navData={navData} className="h-[calc(100vh-57px)] border-0" />
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center gap-2">
          <Book className="h-5 w-5 text-primary" />
          <span className="font-semibold">{projectName} Docs</span>
        </Link>

        {/* Navigation - hidden on mobile since we have sidebar */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Search */}
        <div className="ml-auto flex items-center gap-2">
          <SearchButton searchIndex={searchIndex} />
        </div>
      </div>
    </header>
  );
}
