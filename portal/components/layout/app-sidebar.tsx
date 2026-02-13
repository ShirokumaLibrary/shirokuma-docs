"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  Layers,
  Database,
  CheckCircle,
  Monitor,
  Component,
  Zap,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  Bot,
  Globe,
  Wrench,
  Languages,
  Package,
  type LucideIcon,
} from "lucide-react";
import type { ApplicationsData, AppConfig } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { useSidebar } from "@/lib/sidebar-context";

export interface SidebarModule {
  name: string;
  screens?: number;
  components?: number;
  actions?: number;
  tables?: number;
}

export interface SidebarTestCategory {
  name: string;
  slug: string;
  count: number;
}

export interface SidebarNavData {
  modules: SidebarModule[];
  testCategories: SidebarTestCategory[];
  hasFeatureMap: boolean;
  hasDbSchema: boolean;
  hasTestCases: boolean;
  hasOverview: boolean;
  hasApiTools: boolean;
  hasI18n: boolean;
  hasPackages: boolean;
  applications?: ApplicationsData | null;
}

// Icon mapping for string icon names
const iconMap: Record<string, LucideIcon> = {
  "file-text": FileText,
  "database": Database,
  "layers": Layers,
  "check-circle": CheckCircle,
  "globe": Globe,
  "bot": Bot,
  "wrench": Wrench,
  "languages": Languages,
};

// Color mapping for app colors
const colorMap: Record<string, string> = {
  blue: "text-accent-blue",
  purple: "text-accent-purple",
  green: "text-accent-green",
  yellow: "text-accent-yellow",
  orange: "text-accent-orange",
};

function getIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || FileText;
}

function getColorClass(color: string): string {
  return colorMap[color] || "text-muted-foreground";
}

interface NavItemProps {
  href: string;
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  indent?: boolean;
}

function NavItem({ href, icon: Icon, label, isActive, indent }: NavItemProps) {
  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        "w-full justify-start gap-2 px-2",
        indent && "pl-6",
        isActive && "bg-primary/10 text-primary"
      )}
    >
      <Link href={href}>
        <Icon className="h-4 w-4" />
        <span className="truncate">{label}</span>
      </Link>
    </Button>
  );
}

interface NavSectionProps {
  title: string;
  icon: React.ElementType;
  href: string;
  isActive: boolean;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}

function NavSection({
  title,
  icon: Icon,
  href,
  isActive,
  children,
  defaultOpen = false,
}: NavSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen || isActive);

  if (!children) {
    return (
      <NavItem
        href={href}
        icon={Icon}
        label={title}
        isActive={isActive}
      />
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-between gap-2 px-2",
            isActive && "bg-primary/10 text-primary"
          )}
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className="truncate">{title}</span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pl-2 pt-1 space-y-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface AppSidebarProps {
  navData: SidebarNavData;
  className?: string;
}

export function AppSidebar({ navData, className }: AppSidebarProps) {
  const pathname = usePathname();
  const { collapse } = useSidebar();

  const isOverviewActive = pathname === "/overview";
  const isFeatureMapActive = pathname.startsWith("/feature-map") || pathname.startsWith("/details");
  const isDbSchemaActive = pathname.startsWith("/db-schema");
  const isTestCasesActive = pathname.startsWith("/test-cases");

  // Layer icons and colors
  const layerConfigs = {
    screens: { icon: Monitor, color: "text-accent-blue" },
    components: { icon: Component, color: "text-accent-green" },
    actions: { icon: Zap, color: "text-accent-yellow" },
    tables: { icon: Database, color: "text-accent-purple" },
  };

  return (
    <aside className={cn("flex flex-col min-h-0 border-r border-border bg-card", className)}>
      {/* Collapse Button */}
      <div className="flex items-center justify-end px-3 py-2 border-b border-border shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={collapse}
          title="サイドバーを閉じる"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1 min-h-0 px-3 py-4">
        <nav className="space-y-1">
          {/* Home */}
          <NavItem
            href="/"
            icon={Home}
            label="ホーム"
            isActive={pathname === "/"}
          />

          {/* Multi-App Mode: Show grouped navigation */}
          {navData.applications ? (
            <>
              {/* Shared Sections */}
              <div className="pt-3">
                <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  共通
                </div>
                <div className="space-y-1 mt-1">
                  {/* Configured shared sections */}
                  {navData.applications.shared.sections
                    .filter(s => s.available !== false)
                    .map((section) => {
                      const Icon = getIcon(section.icon || "file-text");
                      const href = section.type === "overview" ? "/overview" :
                                   section.type === "dbSchema" ? "/db-schema" :
                                   section.type === "testCases" ? "/test-cases" : "/";
                      const isActive = section.type === "overview" ? isOverviewActive :
                                      section.type === "dbSchema" ? isDbSchemaActive :
                                      section.type === "testCases" ? isTestCasesActive : false;
                      return (
                        <div key={section.type} className="flex items-center">
                          <NavItem
                            href={href}
                            icon={Icon}
                            label={section.label}
                            isActive={isActive}
                          />
                          {section.count !== undefined && (
                            <span className="ml-auto mr-2 text-xs text-muted-foreground">
                              {section.count}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  {/* Always show global views for feature map, test cases, i18n */}
                  {navData.hasFeatureMap && (
                    <div className="flex items-center">
                      <NavItem
                        href="/feature-map"
                        icon={Layers}
                        label="全体機能マップ"
                        isActive={pathname === "/feature-map" || pathname === "/feature-map/"}
                      />
                    </div>
                  )}
                  {navData.hasTestCases && (
                    <div className="flex items-center">
                      <NavItem
                        href="/test-cases"
                        icon={CheckCircle}
                        label="全体テスト"
                        isActive={pathname === "/test-cases" || pathname === "/test-cases/"}
                      />
                    </div>
                  )}
                  {navData.hasI18n && (
                    <div className="flex items-center">
                      <NavItem
                        href="/i18n"
                        icon={Languages}
                        label="全体翻訳"
                        isActive={pathname === "/i18n" || pathname === "/i18n/"}
                      />
                    </div>
                  )}
                  {navData.hasPackages && (
                    <div className="flex items-center">
                      <NavItem
                        href="/packages"
                        icon={Package}
                        label="共有パッケージ"
                        isActive={pathname === "/packages" || pathname.startsWith("/packages/")}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* App Sections */}
              {navData.applications.apps.map((app) => {
                const AppIcon = getIcon(app.icon);
                const appColorClass = getColorClass(app.color);

                return (
                  <div key={app.id} className="pt-3">
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <AppIcon className={cn("h-3 w-3", appColorClass)} />
                      {app.name}
                    </div>
                    <div className="space-y-1 mt-1">
                      {app.sections
                        .filter(s => s.available !== false)
                        .map((section) => {
                          const SectionIcon = getIcon(section.icon || "file-text");
                          let href = "/";
                          let isActive = false;

                          // Use app-specific routes for multi-app projects
                          if (section.type === "featureMap") {
                            href = `/apps/${app.id}/feature-map`;
                            isActive = pathname === href || pathname.startsWith(`/apps/${app.id}/feature-map`);
                          } else if (section.type === "tools") {
                            href = `/apps/${app.id}/tools`;
                            isActive = pathname === href || pathname.startsWith(`/apps/${app.id}/tools`);
                          } else if (section.type === "testCases") {
                            href = `/apps/${app.id}/test-cases`;
                            isActive = pathname === href || pathname.startsWith(`/apps/${app.id}/test-cases`);
                          } else if (section.type === "i18n") {
                            href = `/apps/${app.id}/i18n`;
                            isActive = pathname === href || pathname.startsWith(`/apps/${app.id}/i18n`);
                          }

                          return (
                            <div key={`${app.id}-${section.type}`} className="flex items-center">
                              <NavItem
                                href={href}
                                icon={SectionIcon}
                                label={section.label}
                                isActive={isActive}
                              />
                              {section.count !== undefined && (
                                <span className="ml-auto mr-2 text-xs text-muted-foreground">
                                  {section.count}
                                </span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            /* Legacy Mode: Flat navigation */
            <>
              {/* Overview */}
              {navData.hasOverview && (
                <NavItem
                  href="/overview"
                  icon={FileText}
                  label="概要"
                  isActive={isOverviewActive}
                />
              )}

              {/* Feature Map Section */}
              {navData.hasFeatureMap && (
                <NavSection
                  title="機能マップ"
                  icon={Layers}
                  href="/feature-map"
                  isActive={isFeatureMapActive}
                  defaultOpen={isFeatureMapActive}
                >
                  {/* Overview link */}
                  <NavItem
                    href="/feature-map"
                    icon={Layers}
                    label="一覧"
                    isActive={pathname === "/feature-map"}
                    indent
                  />

                  {/* Module links by layer */}
                  {navData.modules.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {/* Group by layer type */}
                      {["screens", "components", "actions", "tables"].map((layer) => {
                        const layerConfig = layerConfigs[layer as keyof typeof layerConfigs];
                        const LayerIcon = layerConfig.icon;
                        const modulesWithLayer = navData.modules.filter(
                          (m) => (m[layer as keyof SidebarModule] as number) > 0
                        );

                        if (modulesWithLayer.length === 0) return null;

                        return (
                          <Collapsible key={layer} defaultOpen={false}>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-between px-2 text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <LayerIcon className={cn("h-3 w-3", layerConfig.color)} />
                                  <span className="capitalize">{layer}</span>
                                </div>
                                <span className="text-muted-foreground">
                                  {modulesWithLayer.length}
                                </span>
                              </Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pl-4 pt-1 space-y-0.5">
                              {modulesWithLayer.map((module) => (
                                <Button
                                  key={module.name}
                                  asChild
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start px-2 py-1 h-auto text-xs"
                                >
                                  <Link href={`/details/${layer}/${encodeURIComponent(module.name)}`}>
                                    <span className="truncate">{module.name}</span>
                                    <span className="ml-auto text-muted-foreground">
                                      {module[layer as keyof SidebarModule]}
                                    </span>
                                  </Link>
                                </Button>
                              ))}
                            </CollapsibleContent>
                          </Collapsible>
                        );
                      })}
                    </div>
                  )}
                </NavSection>
              )}

              {/* DB Schema */}
              {navData.hasDbSchema && (
                <NavItem
                  href="/db-schema"
                  icon={Database}
                  label="DBスキーマ"
                  isActive={isDbSchemaActive}
                />
              )}

              {/* Test Cases */}
              {navData.hasTestCases && (
                <NavItem
                  href="/test-cases"
                  icon={CheckCircle}
                  label="テストケース"
                  isActive={isTestCasesActive}
                />
              )}

              {/* API Tools (MCP, REST, etc.) - shown when tools data exists */}
              {navData.hasApiTools && (
                <NavItem
                  href="/apps/mcp/tools"
                  icon={Bot}
                  label="API Tools"
                  isActive={pathname.startsWith("/apps/mcp/tools")}
                />
              )}

              {/* i18n */}
              {navData.hasI18n && (
                <NavItem
                  href="/i18n"
                  icon={Languages}
                  label="翻訳"
                  isActive={pathname.startsWith("/i18n")}
                />
              )}
            </>
          )}
        </nav>
      </ScrollArea>
    </aside>
  );
}
