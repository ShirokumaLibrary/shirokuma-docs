"use client";

import { type ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHashTab } from "@/lib/hooks/use-hash-tab";

const VALID_TABS = ["overview", "code", "tests", "related"] as const;
type TabValue = (typeof VALID_TABS)[number];

interface ItemTabsClientProps {
  overviewContent: ReactNode;
  codeContent: ReactNode;
  testsContent: ReactNode;
  relatedContent: ReactNode;
}

export function ItemTabsClient({
  overviewContent,
  codeContent,
  testsContent,
  relatedContent,
}: ItemTabsClientProps) {
  const { activeTab, mounted, handleTabChange } = useHashTab<TabValue>(
    "overview",
    VALID_TABS
  );

  // SSR placeholder to prevent hydration mismatch
  if (!mounted) {
    return (
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="code">コード</TabsTrigger>
          <TabsTrigger value="tests">テスト</TabsTrigger>
          <TabsTrigger value="related">関連</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          {overviewContent}
        </TabsContent>
      </Tabs>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">概要</TabsTrigger>
        <TabsTrigger value="code">コード</TabsTrigger>
        <TabsTrigger value="tests">テスト</TabsTrigger>
        <TabsTrigger value="related">関連</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-6">
        {overviewContent}
      </TabsContent>

      <TabsContent value="code" className="mt-6">
        {codeContent}
      </TabsContent>

      <TabsContent value="tests" className="mt-6">
        {testsContent}
      </TabsContent>

      <TabsContent value="related" className="mt-6">
        {relatedContent}
      </TabsContent>
    </Tabs>
  );
}
