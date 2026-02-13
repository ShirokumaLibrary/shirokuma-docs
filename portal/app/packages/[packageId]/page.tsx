/**
 * Package Details Page
 *
 * Shows details of a specific package including modules and exports.
 *
 * @screen PackageDetails
 * @route /packages/[packageId]
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Package,
  Code2,
  Braces,
  FileType,
  ChevronLeft,
  Library,
  FileCode,
  Type,
  Variable,
} from "lucide-react";
import { getPackage, getPackageList } from "@/lib/data-loader";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PackageDetailPageProps {
  params: Promise<{ packageId: string }>;
}

export default async function PackageDetailPage({ params }: PackageDetailPageProps) {
  const { packageId } = await params;
  const pkg = await getPackage(packageId);

  if (!pkg) {
    notFound();
  }

  // Group exports by kind
  const getKindIcon = (kind: string) => {
    switch (kind) {
      case "function":
        return <Braces className="h-3.5 w-3.5 text-accent-green" />;
      case "type":
      case "interface":
        return <Type className="h-3.5 w-3.5 text-accent-yellow" />;
      case "const":
        return <Variable className="h-3.5 w-3.5 text-accent-blue" />;
      case "class":
        return <FileCode className="h-3.5 w-3.5 text-accent-purple" />;
      default:
        return <Code2 className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getKindBadge = (kind: string) => {
    const colors: Record<string, string> = {
      function: "bg-accent-green/10 text-accent-green",
      type: "bg-accent-yellow/10 text-accent-yellow",
      interface: "bg-accent-yellow/10 text-accent-yellow",
      const: "bg-accent-blue/10 text-accent-blue",
      class: "bg-accent-purple/10 text-accent-purple",
      enum: "bg-accent-orange/10 text-accent-orange",
    };
    return colors[kind] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/packages" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Packages
        </Link>
        <span>/</span>
        <span className="text-foreground">{pkg.name}</span>
      </nav>

      {/* Header */}
      <header>
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-accent-purple/10 p-3">
            <Library className="h-8 w-8 text-accent-purple" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{pkg.name}</h1>
            <p className="text-muted-foreground font-mono text-sm">{pkg.prefix}</p>
            {pkg.description && <p className="mt-2 text-muted-foreground">{pkg.description}</p>}
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Code2 className="h-5 w-5 text-accent-blue" />
              <div>
                <div className="text-2xl font-bold">{pkg.stats.moduleCount}</div>
                <div className="text-xs text-muted-foreground">Modules</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-accent-purple" />
              <div>
                <div className="text-2xl font-bold">{pkg.stats.exportCount}</div>
                <div className="text-xs text-muted-foreground">Exports</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Braces className="h-5 w-5 text-accent-green" />
              <div>
                <div className="text-2xl font-bold">{pkg.stats.functionCount}</div>
                <div className="text-xs text-muted-foreground">Functions</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <FileType className="h-5 w-5 text-accent-yellow" />
              <div>
                <div className="text-2xl font-bold">{pkg.stats.typeCount}</div>
                <div className="text-xs text-muted-foreground">Types</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modules */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Modules</h2>
        <div className="space-y-4">
          {pkg.modules.map((module) => (
            <Card key={module.path}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-mono">{module.name}</CardTitle>
                    <CardDescription className="text-xs">{module.path}</CardDescription>
                  </div>
                  <Badge variant="secondary">{module.exports.length} exports</Badge>
                </div>
                {module.description && (
                  <p className="text-sm text-muted-foreground mt-2">{module.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {module.exports.map((exp) => (
                    <div
                      key={exp.name}
                      className="flex items-start gap-3 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                    >
                      {getKindIcon(exp.kind)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{exp.name}</span>
                          <Badge variant="outline" className={`text-xs ${getKindBadge(exp.kind)}`}>
                            {exp.kind}
                          </Badge>
                        </div>
                        {exp.description && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

/**
 * Generate static params for package detail pages
 */
export async function generateStaticParams() {
  const packages = await getPackageList();
  return packages.map((pkg) => ({
    packageId: pkg.name,
  }));
}
