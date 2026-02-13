"use client";

import Link from "next/link";
import { FileCode2, ExternalLink, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TestCase, TestCategory, BddAnnotation } from "@/lib/types";

interface TestBddCardProps {
  testCase: TestCase;
  featureLink?: string;
}

// Japanese category labels with colors
const categoryConfig: Record<TestCategory | "unknown", { ja: string; color: string; icon: typeof CheckCircle2 }> = {
  success: { ja: "正常系", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle2 },
  auth: { ja: "認証", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: CheckCircle2 },
  error: { ja: "異常系", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: AlertCircle },
  validation: { ja: "バリデーション", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: AlertCircle },
  edge: { ja: "境界値", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", icon: Info },
  integration: { ja: "統合", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400", icon: CheckCircle2 },
  unknown: { ja: "その他", color: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400", icon: Info },
};

function BddSection({ label, content, variant }: { label: string; content: string; variant: "given" | "when" | "then" | "and" }) {
  const colors = {
    given: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/30",
    when: "border-l-amber-500 bg-amber-50 dark:bg-amber-950/30",
    then: "border-l-green-500 bg-green-50 dark:bg-green-950/30",
    and: "border-l-gray-400 bg-gray-50 dark:bg-gray-950/30",
  };

  const labelColors = {
    given: "text-blue-600 dark:text-blue-400",
    when: "text-amber-600 dark:text-amber-400",
    then: "text-green-600 dark:text-green-400",
    and: "text-gray-600 dark:text-gray-400",
  };

  return (
    <div className={`border-l-4 ${colors[variant]} rounded-r px-3 py-2`}>
      <span className={`text-xs font-bold uppercase ${labelColors[variant]}`}>{label}</span>
      <p className="mt-1 text-sm">{content}</p>
    </div>
  );
}

function InferredBdd({ testCase }: { testCase: TestCase }) {
  // Try to infer BDD from test name and description
  const itName = testCase.it;
  const description = testCase.description || testCase.docs?.purpose || "";

  // Simple pattern matching for common test patterns
  let given = "";
  let when = "";
  let then = "";

  // Pattern: "should [do something] when [condition]"
  const shouldWhenMatch = itName.match(/should (.+) when (.+)/i);
  if (shouldWhenMatch) {
    when = shouldWhenMatch[2];
    then = shouldWhenMatch[1];
  } else {
    // Pattern: "should [do something]"
    const shouldMatch = itName.match(/should (.+)/i);
    if (shouldMatch) {
      then = shouldMatch[1];
    } else {
      then = itName;
    }
  }

  // Extract "given" from describe block if available
  if (testCase.describe) {
    given = testCase.describe;
  }

  // Use description as additional context
  if (description && !when) {
    when = description;
  }

  return (
    <div className="space-y-2">
      {given && <BddSection label="Given" content={given} variant="given" />}
      {when && <BddSection label="When" content={when} variant="when" />}
      {then && <BddSection label="Then" content={then} variant="then" />}
    </div>
  );
}

function ExplicitBdd({ bdd }: { bdd: BddAnnotation }) {
  return (
    <div className="space-y-2">
      {bdd.given && <BddSection label="Given" content={bdd.given} variant="given" />}
      {bdd.when && <BddSection label="When" content={bdd.when} variant="when" />}
      {bdd.then && <BddSection label="Then" content={bdd.then} variant="then" />}
      {bdd.and?.map((andItem, idx) => (
        <BddSection key={idx} label="And" content={andItem} variant="and" />
      ))}
    </div>
  );
}

export function TestBddCard({ testCase, featureLink }: TestBddCardProps) {
  const category = testCase.category || "unknown";
  const config = categoryConfig[category];
  const CategoryIcon = config.icon;

  // Get file name from path
  const fileName = testCase.file.split("/").pop() || testCase.file;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base leading-tight">{testCase.it}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">{testCase.describe}</p>
          </div>
          <Badge variant="outline" className={config.color}>
            <CategoryIcon className="mr-1 h-3 w-3" />
            {config.ja}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* BDD Format */}
        {testCase.bdd ? (
          <ExplicitBdd bdd={testCase.bdd} />
        ) : (
          <InferredBdd testCase={testCase} />
        )}

        {/* Additional docs info */}
        {testCase.docs?.expected && (
          <div className="rounded bg-muted/50 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Expected Result:</span>
            <p className="mt-1 text-sm">{testCase.docs.expected}</p>
          </div>
        )}

        {/* Footer with links */}
        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-3 w-3" />
            <span>{fileName}:{testCase.line}</span>
            <Badge variant="outline" className="text-xs">
              {testCase.framework}
            </Badge>
          </div>
          {featureLink && (
            <Link
              href={featureLink}
              className="flex items-center gap-1 text-primary hover:underline"
            >
              View Feature
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface TestBddListProps {
  testCases: TestCase[];
  getFeatureLink?: (testCase: TestCase) => string | undefined;
}

export function TestBddList({ testCases, getFeatureLink }: TestBddListProps) {
  if (testCases.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No tests to display.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {testCases.map((tc) => (
        <TestBddCard
          key={tc.id}
          testCase={tc}
          featureLink={getFeatureLink?.(tc)}
        />
      ))}
    </div>
  );
}
