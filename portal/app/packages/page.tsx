/**
 * Packages Overview Page
 *
 * Lists all monorepo packages with their modules and exports.
 *
 * @screen PackagesOverview
 * @route /packages
 */

import Link from "next/link";
import { Package, Code2, Braces, FileType, ArrowRight, Library } from "lucide-react";
import { loadPackages } from "@/lib/data-loader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function PackagesPage() {
  const packagesData = await loadPackages();

  if (!packagesData || packagesData.packages.length === 0) {
    return (
      <div className="space-y-6">
        <header>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent-purple/10 p-2">
              <Package className="h-6 w-6 text-accent-purple" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Packages</h1>
              <p className="text-muted-foreground">Monorepo Shared Packages</p>
            </div>
          </div>
        </header>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Packages Found</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Run <code className="px-1 py-0.5 bg-muted rounded text-sm">shirokuma-docs packages</code> to
                generate package documentation, or add packages to your configuration.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-accent-purple/10 p-2">
            <Package className="h-6 w-6 text-accent-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Packages</h1>
            <p className="text-muted-foreground">
              {packagesData.summary.totalPackages} packages, {packagesData.summary.totalModules} modules,{" "}
              {packagesData.summary.totalExports} exports
            </p>
          </div>
        </div>
      </header>

      {/* Package Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {packagesData.packages.map((pkg) => (
          <Link key={pkg.name} href={`/packages/${pkg.name}`}>
            <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-accent-purple/10 p-2">
                      <Library className="h-5 w-5 text-accent-purple" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{pkg.name}</CardTitle>
                      <CardDescription className="font-mono text-xs">{pkg.prefix}</CardDescription>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                {pkg.description && (
                  <p className="text-sm text-muted-foreground mb-4">{pkg.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Code2 className="h-3.5 w-3.5 text-accent-blue" />
                    {pkg.stats.moduleCount} modules
                  </span>
                  <span className="flex items-center gap-1">
                    <Braces className="h-3.5 w-3.5 text-accent-green" />
                    {pkg.stats.functionCount} functions
                  </span>
                  <span className="flex items-center gap-1">
                    <FileType className="h-3.5 w-3.5 text-accent-yellow" />
                    {pkg.stats.typeCount} types
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-accent-purple">
                {packagesData.summary.totalPackages}
              </div>
              <div className="text-sm text-muted-foreground">Packages</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-accent-blue">
                {packagesData.summary.totalModules}
              </div>
              <div className="text-sm text-muted-foreground">Modules</div>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-3xl font-bold text-accent-green">
                {packagesData.summary.totalExports}
              </div>
              <div className="text-sm text-muted-foreground">Exports</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Generate static params for packages page
 */
export function generateStaticParams() {
  return [];
}
