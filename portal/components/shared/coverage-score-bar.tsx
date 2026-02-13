/**
 * Shared CoverageScoreBar Component
 *
 * Displays test coverage score with color-coded progress bar.
 * Replaces duplicated code in:
 * - feature-map/feature-map-client.tsx
 * - details/[type]/[module]/[item]/page.tsx
 * - api-tools/[tool]/page.tsx
 */

import { cn } from "@/lib/utils";

export interface CoverageScoreBarProps {
  /** Coverage score (0-100) */
  score: number;
  /** Label text (default: "カバレッジスコア") */
  label?: string;
  /** Show label text (default: true) */
  showLabel?: boolean;
  /** Total test count (optional) */
  totalTests?: number;
  /** Display variant */
  variant?: "default" | "compact" | "badge";
  /** Additional className */
  className?: string;
}

/**
 * Get color class based on coverage score
 */
export function getCoverageColor(score: number): string {
  if (score >= 70) return "text-green-600 dark:text-green-400";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

/**
 * Get background color class based on coverage score
 */
export function getCoverageBgColor(score: number): string {
  if (score >= 70) return "bg-green-100 dark:bg-green-900/30";
  if (score >= 40) return "bg-yellow-100 dark:bg-yellow-900/30";
  return "bg-red-100 dark:bg-red-900/30";
}

/**
 * Get progress bar color class based on coverage score
 */
export function getCoverageBarColor(score: number): string {
  if (score >= 70) return "bg-green-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

/**
 * Get border color class for badge variant
 */
export function getCoverageBorderColor(score: number): string {
  if (score >= 70) return "border-green-500 text-green-600";
  if (score >= 40) return "border-yellow-500 text-yellow-600";
  return "border-red-500 text-red-600";
}

/**
 * CoverageScoreBar Component
 *
 * @example
 * // Default variant with progress bar
 * <CoverageScoreBar score={75} />
 *
 * @example
 * // Compact variant for cards
 * <CoverageScoreBar score={45} variant="compact" totalTests={12} />
 *
 * @example
 * // Badge variant for inline display
 * <CoverageScoreBar score={80} variant="badge" />
 */
export function CoverageScoreBar({
  score,
  label = "カバレッジスコア",
  showLabel = true,
  totalTests,
  variant = "default",
  className,
}: CoverageScoreBarProps) {
  const clampedScore = Math.min(Math.max(score, 0), 100);

  // Badge variant - simple colored badge
  if (variant === "badge") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
          getCoverageBorderColor(clampedScore),
          className
        )}
      >
        {clampedScore}%
      </span>
    );
  }

  // Compact variant - minimal display for cards
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full transition-all", getCoverageBarColor(clampedScore))}
            style={{ width: `${clampedScore}%` }}
          />
        </div>
        <span className={cn("text-xs font-medium", getCoverageColor(clampedScore))}>
          {clampedScore}%
        </span>
        {totalTests !== undefined && (
          <span className="text-xs text-muted-foreground">({totalTests})</span>
        )}
      </div>
    );
  }

  // Default variant - full progress bar with label
  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">{clampedScore}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all", getCoverageBarColor(clampedScore))}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
      {totalTests !== undefined && (
        <p className="text-xs text-muted-foreground">{totalTests} テストケース</p>
      )}
    </div>
  );
}
