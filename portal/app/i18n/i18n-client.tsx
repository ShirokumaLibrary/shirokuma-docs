"use client";

import Link from "next/link";
import { FileText, CheckCircle, AlertCircle, Settings, Globe, Monitor, Bot, Folder } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { I18nData, I18nApp, I18nNamespace } from "@/lib/types";
import { useState } from "react";

interface I18nClientProps {
  data: I18nData;
}

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  settings: Settings,
  globe: Globe,
  monitor: Monitor,
  bot: Bot,
  folder: Folder,
};

// Color mapping
const colorMap: Record<string, string> = {
  blue: "text-blue-500 bg-blue-500/10",
  green: "text-green-500 bg-green-500/10",
  purple: "text-purple-500 bg-purple-500/10",
  gray: "text-gray-500 bg-gray-500/10",
};

function getIcon(iconName: string) {
  return iconMap[iconName] || Folder;
}

function getColorClass(color: string) {
  return colorMap[color] || colorMap.gray;
}

interface AppSectionProps {
  app: I18nApp;
  namespaces: I18nNamespace[];
  locales: string[];
  primaryLocale: string;
}

function AppSection({ app, namespaces, locales, primaryLocale }: AppSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const Icon = getIcon(app.icon);
  const colorClass = getColorClass(app.color);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="mb-4">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{app.name}</CardTitle>
                  <CardDescription>
                    {app.namespaceCount} namespaces · {app.keyCount} keys
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Keys</TableHead>
                  <TableHead className="text-right">Coverage</TableHead>
                  <TableHead className="text-right">Missing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {namespaces.map((ns) => {
                  const coverage =
                    ns.stats.totalKeys > 0
                      ? Math.round(
                          (ns.stats.fullyTranslatedKeys / ns.stats.totalKeys) * 100
                        )
                      : 100;

                  // namespace名からアプリプレフィックスを除去して表示
                  const displayName = ns.name.includes("/")
                    ? ns.name.split("/").slice(1).join("/")
                    : ns.name;

                  return (
                    <TableRow key={ns.name}>
                      <TableCell>
                        <Link
                          href={`/i18n/${ns.name}`}
                          className="flex items-center gap-2 font-medium text-blue-600 hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {displayName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ns.description || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {ns.stats.totalKeys}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            coverage === 100
                              ? "default"
                              : coverage >= 80
                                ? "secondary"
                                : "destructive"
                          }
                          className={
                            coverage === 100
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : coverage >= 80
                                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                : ""
                          }
                        >
                          {coverage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {ns.stats.missingKeys > 0 ? (
                          <span className="text-red-600">{ns.stats.missingKeys}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function I18nClient({ data }: I18nClientProps) {
  // アプリが複数ある場合はグループ化表示
  const hasMultipleApps = data.apps && data.apps.length > 1;

  // アプリごとに namespace をグループ化
  const namespacesByApp = new Map<string, I18nNamespace[]>();
  for (const ns of data.namespaces) {
    const appId = ns.app || "default";
    if (!namespacesByApp.has(appId)) {
      namespacesByApp.set(appId, []);
    }
    namespacesByApp.get(appId)!.push(ns);
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Namespaces
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalNamespaces}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Keys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.stats.totalKeys}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Languages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{data.locales.length}</span>
              <div className="flex gap-1">
                {data.locales.map((locale) => (
                  <Badge
                    key={locale}
                    variant={locale === data.primaryLocale ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {locale}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{data.stats.coveragePercent}%</span>
              {data.stats.coveragePercent === 100 ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : data.stats.coveragePercent >= 80 ? (
                <CheckCircle className="h-5 w-5 text-yellow-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* アプリグループ表示 or フラット表示 */}
      {hasMultipleApps ? (
        // 複数アプリ: グループ化表示
        <div className="space-y-4">
          {data.apps.map((app) => {
            const appNamespaces = namespacesByApp.get(app.id) || [];
            if (appNamespaces.length === 0) return null;
            return (
              <AppSection
                key={app.id}
                app={app}
                namespaces={appNamespaces}
                locales={data.locales}
                primaryLocale={data.primaryLocale}
              />
            );
          })}
        </div>
      ) : (
        // 単一アプリまたはアプリなし: フラット表示
        <Card>
          <CardHeader>
            <CardTitle>Namespaces</CardTitle>
            <CardDescription>
              翻訳ファイル（namespace）ごとのキー数とカバレッジ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Keys</TableHead>
                  <TableHead className="text-right">Coverage</TableHead>
                  <TableHead className="text-right">Missing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.namespaces.map((ns) => {
                  const coverage =
                    ns.stats.totalKeys > 0
                      ? Math.round(
                          (ns.stats.fullyTranslatedKeys / ns.stats.totalKeys) * 100
                        )
                      : 100;

                  // namespace名からアプリプレフィックスを除去して表示
                  const displayName = ns.name.includes("/")
                    ? ns.name.split("/").slice(1).join("/")
                    : ns.name;

                  return (
                    <TableRow key={ns.name}>
                      <TableCell>
                        <Link
                          href={`/i18n/${ns.name}`}
                          className="flex items-center gap-2 font-medium text-blue-600 hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {displayName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ns.description || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {ns.stats.totalKeys}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            coverage === 100
                              ? "default"
                              : coverage >= 80
                                ? "secondary"
                                : "destructive"
                          }
                          className={
                            coverage === 100
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : coverage >= 80
                                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                : ""
                          }
                        >
                          {coverage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {ns.stats.missingKeys > 0 ? (
                          <span className="text-red-600">{ns.stats.missingKeys}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
