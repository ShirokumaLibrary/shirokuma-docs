"use client";

import Link from "next/link";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { TestCase, TestCategory, FeatureMapData, DetailsData } from "@/lib/types";

interface TestMatrixProps {
  testCases: TestCase[];
  featureMap: FeatureMapData | null;
  details: DetailsData | null;
}

// Japanese category labels
const categoryLabels: Record<TestCategory | "unknown", { ja: string; en: string; color: string }> = {
  success: { ja: "正常系", en: "Success", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  auth: { ja: "認証", en: "Auth", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  error: { ja: "異常系", en: "Error", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  validation: { ja: "バリデーション", en: "Validation", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  edge: { ja: "境界値", en: "Edge Case", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
  integration: { ja: "統合", en: "Integration", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400" },
  unknown: { ja: "その他", en: "Other", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
};

const orderedCategories: (TestCategory | "unknown")[] = [
  "success",
  "auth",
  "validation",
  "error",
  "edge",
  "integration",
  "unknown",
];

/**
 * Build matrix data: modules × categories
 */
function buildMatrixData(
  testCases: TestCase[],
  featureMap: FeatureMapData | null,
  details: DetailsData | null
): {
  modules: string[];
  matrix: Map<string, Map<TestCategory | "unknown", TestCase[]>>;
  categoryCounts: Map<TestCategory | "unknown", number>;
} {
  const matrix = new Map<string, Map<TestCategory | "unknown", TestCase[]>>();
  const categoryCounts = new Map<TestCategory | "unknown", number>();

  // Initialize category counts
  for (const cat of orderedCategories) {
    categoryCounts.set(cat, 0);
  }

  // Get module mapping from details
  const testToModule = new Map<string, string>();

  if (details) {
    for (const [key, item] of Object.entries(details.details)) {
      if (item.testCoverage?.byCategory) {
        const keyParts = key.split("/");
        const moduleName = keyParts.length >= 2 ? keyParts[1] : "Uncategorized";

        for (const categoryTests of Object.values(item.testCoverage.byCategory)) {
          for (const t of categoryTests) {
            const testKey = `${t.file}::${t.name}`;
            testToModule.set(testKey, moduleName);
          }
        }
      }
    }
  }

  // Build matrix
  for (const tc of testCases) {
    const testKey = `${tc.file}::${tc.it}`;
    const moduleName = testToModule.get(testKey) || "Uncategorized";
    const category = tc.category || "unknown";

    if (!matrix.has(moduleName)) {
      matrix.set(moduleName, new Map());
    }

    const moduleMap = matrix.get(moduleName)!;
    if (!moduleMap.has(category)) {
      moduleMap.set(category, []);
    }

    moduleMap.get(category)!.push(tc);
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
  }

  // Sort modules by total test count
  const modules = Array.from(matrix.keys()).sort((a, b) => {
    const aCount = Array.from(matrix.get(a)!.values()).reduce((sum, arr) => sum + arr.length, 0);
    const bCount = Array.from(matrix.get(b)!.values()).reduce((sum, arr) => sum + arr.length, 0);
    return bCount - aCount;
  });

  return { modules, matrix, categoryCounts };
}

function CellContent({
  count,
  moduleName,
  category,
}: {
  count: number;
  moduleName: string;
  category: TestCategory | "unknown";
}) {
  if (count === 0) {
    return (
      <div className="flex items-center justify-center">
        <MinusCircle className="h-4 w-4 text-muted-foreground/30" />
      </div>
    );
  }

  return (
    <Link
      href={`/test-cases/module/${encodeURIComponent(moduleName)}`}
      className="flex items-center justify-center gap-1 rounded px-2 py-1 transition-colors hover:bg-muted"
    >
      <CheckCircle2 className="h-4 w-4 text-green-500" />
      <span className="font-medium">{count}</span>
    </Link>
  );
}

export function TestMatrix({ testCases, featureMap, details }: TestMatrixProps) {
  const { modules, matrix, categoryCounts } = buildMatrixData(testCases, featureMap, details);

  // Filter out categories with zero tests
  const activeCategories = orderedCategories.filter(
    (cat) => (categoryCounts.get(cat) || 0) > 0
  );

  if (modules.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No test data available for matrix view.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Legend */}
      <div className="flex flex-wrap gap-2">
        {activeCategories.map((cat) => {
          const config = categoryLabels[cat];
          const count = categoryCounts.get(cat) || 0;
          return (
            <Badge key={cat} variant="outline" className={config.color}>
              {config.ja} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48 font-semibold">モジュール</TableHead>
              {activeCategories.map((cat) => (
                <TableHead key={cat} className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">{categoryLabels[cat].en}</span>
                    <span className="font-medium">{categoryLabels[cat].ja}</span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center font-semibold">合計</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modules.map((moduleName) => {
              const moduleMap = matrix.get(moduleName)!;
              const total = Array.from(moduleMap.values()).reduce(
                (sum, arr) => sum + arr.length,
                0
              );

              return (
                <TableRow key={moduleName}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/test-cases/module/${encodeURIComponent(moduleName)}`}
                      className="hover:text-primary hover:underline"
                    >
                      {moduleName}
                    </Link>
                  </TableCell>
                  {activeCategories.map((cat) => {
                    const tests = moduleMap.get(cat) || [];
                    return (
                      <TableCell key={cat} className="text-center">
                        <CellContent
                          count={tests.length}
                          moduleName={moduleName}
                          category={cat}
                        />
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="font-bold">
                      {total}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
            {/* Totals row */}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell>合計</TableCell>
              {activeCategories.map((cat) => (
                <TableCell key={cat} className="text-center">
                  <Badge variant="outline">{categoryCounts.get(cat) || 0}</Badge>
                </TableCell>
              ))}
              <TableCell className="text-center">
                <Badge className="font-bold">{testCases.length}</Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
