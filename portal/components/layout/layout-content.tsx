"use client";

import { PanelLeftOpen } from "lucide-react";
import { AppSidebar, type SidebarNavData } from "@/components/layout/app-sidebar";
import { useSidebar } from "@/lib/sidebar-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LayoutContentProps {
  navData: SidebarNavData;
  children: React.ReactNode;
}

export function LayoutContent({ navData, children }: LayoutContentProps) {
  const { isCollapsed, hideExpandButton, skipAnimation, expand } = useSidebar();

  return (
    <div className="flex">
      {/* Desktop Sidebar */}
      <AppSidebar
        navData={navData}
        className={cn(
          "hidden lg:flex h-[calc(100vh-57px)] sticky top-[57px]",
          !skipAnimation && "transition-all duration-300",
          isCollapsed ? "w-0 overflow-hidden border-r-0" : "w-64"
        )}
      />

      {/* Expand button (shows when sidebar is collapsed, unless explicitly hidden) */}
      {isCollapsed && !hideExpandButton && (
        <div className="hidden lg:block fixed left-2 top-[70px] z-40">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 bg-background shadow-md"
            onClick={expand}
            title="サイドバーを開く"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 px-4 py-8 lg:px-8">{children}</main>
    </div>
  );
}
