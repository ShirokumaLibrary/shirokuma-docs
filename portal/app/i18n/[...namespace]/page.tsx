import { notFound } from "next/navigation";
import Link from "next/link";
import { Languages, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { loadI18n } from "@/lib/data-loader";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: Promise<{ namespace: string[] }>;
}

export async function generateStaticParams() {
  const data = await loadI18n();
  if (!data) return [];

  // namespace names like "admin/auth" become ["admin", "auth"]
  return data.namespaces.map((ns) => ({
    namespace: ns.name.split("/"),
  }));
}

export default async function NamespacePage({ params }: Props) {
  const { namespace: namespaceSegments } = await params;
  // Reconstruct the namespace name from segments
  const namespaceName = namespaceSegments.join("/");
  const data = await loadI18n();

  if (!data) {
    notFound();
  }

  const namespace = data.namespaces.find((ns) => ns.name === namespaceName);

  if (!namespace) {
    notFound();
  }

  const coverage =
    namespace.stats.totalKeys > 0
      ? Math.round(
          (namespace.stats.fullyTranslatedKeys / namespace.stats.totalKeys) * 100
        )
      : 100;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/i18n" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          i18n
        </Link>
        <span>/</span>
        <span className="text-foreground">{namespace.name}</span>
      </nav>

      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-green-500/10 p-2">
            <Languages className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{namespace.name}</h1>
            {namespace.description && (
              <p className="mt-1 text-muted-foreground">{namespace.description}</p>
            )}
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Keys:</span>
          <Badge variant="secondary">{namespace.stats.totalKeys}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Coverage:</span>
          <Badge
            variant={coverage === 100 ? "default" : coverage >= 80 ? "secondary" : "destructive"}
            className={
              coverage === 100
                ? "bg-green-100 text-green-800"
                : coverage >= 80
                  ? "bg-yellow-100 text-yellow-800"
                  : ""
            }
          >
            {coverage}%
          </Badge>
          {coverage === 100 ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Missing:</span>
          <Badge variant={namespace.stats.missingKeys > 0 ? "destructive" : "secondary"}>
            {namespace.stats.missingKeys}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Languages:</span>
          {data.locales.map((locale) => (
            <Badge
              key={locale}
              variant={locale === data.primaryLocale ? "default" : "outline"}
              className="text-xs"
            >
              {locale}
            </Badge>
          ))}
        </div>
      </div>

      {/* Translation Keys - Card Layout */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Translation Keys</h2>
          <span className="text-sm text-muted-foreground">
            {namespace.entries.length} keys
          </span>
        </div>

        <div className="grid gap-3">
          {namespace.entries.map((entry) => {
            const hasMissing = data.locales.some(
              (l) => entry.values[l] === undefined
            );

            return (
              <div
                key={entry.key}
                className={`rounded-lg border p-3 ${hasMissing ? "border-red-200 bg-red-50/30" : "border-border bg-card"}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <code className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {entry.key}
                  </code>
                  {hasMissing && (
                    <Badge variant="destructive" className="text-xs">
                      Missing
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  {data.locales.map((locale) => {
                    const value = entry.values[locale];
                    const isPrimary = locale === data.primaryLocale;
                    const isMissing = value === undefined;

                    return (
                      <div
                        key={locale}
                        className={`flex gap-3 text-sm ${
                          isMissing ? "text-red-500" : ""
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-[60px]">
                          <Badge
                            variant={isPrimary ? "default" : "outline"}
                            className="text-xs font-mono"
                          >
                            {locale}
                          </Badge>
                        </div>
                        <div className="flex-1 break-words">
                          {isMissing ? (
                            <span className="italic text-muted-foreground">
                              — 未翻訳 —
                            </span>
                          ) : (
                            <span className={isPrimary ? "font-medium" : ""}>
                              {value}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
