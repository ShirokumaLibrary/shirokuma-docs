/**
 * Test Category Constants
 *
 * Centralized test category definitions used across the portal.
 * Replaces duplicated definitions in:
 * - details/[type]/[module]/page.tsx
 * - details/[type]/[module]/[item]/page.tsx
 * - test-cases/page.tsx
 * - test-cases/[file]/page.tsx
 * - test-cases/[file]/[line]/page.tsx
 */

import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Shield,
  Info,
  Layers,
  GitBranch,
  FlaskConical,
  type LucideIcon,
} from "lucide-react";

/**
 * Test category configuration
 */
export interface TestCategoryConfig {
  /** Japanese label */
  label: string;
  /** Alternative Japanese label (for test-cases pages) */
  altLabel?: string;
  /** Background color class */
  bgColor: string;
  /** Text color class */
  textColor: string;
  /** Icon component */
  icon: LucideIcon;
}

/**
 * Standard test category keys
 */
export const TEST_CATEGORY_KEYS = [
  "happy-path",
  "error-handling",
  "auth",
  "validation",
  "edge-case",
  "integration",
  "other",
] as const;

export type TestCategoryKey = (typeof TEST_CATEGORY_KEYS)[number];

/**
 * Legacy category key mapping (for backward compatibility)
 */
export const LEGACY_CATEGORY_MAP: Record<string, TestCategoryKey> = {
  success: "happy-path",
  error: "error-handling",
  edge: "edge-case",
};

/**
 * Test category configurations
 */
export const TEST_CATEGORIES: Record<TestCategoryKey, TestCategoryConfig> = {
  "happy-path": {
    label: "正常系",
    bgColor: "bg-green-500",
    textColor: "text-green-500",
    icon: CheckCircle2,
  },
  "error-handling": {
    label: "エラー処理",
    altLabel: "異常系",
    bgColor: "bg-red-500",
    textColor: "text-red-500",
    icon: AlertCircle,
  },
  auth: {
    label: "認証・認可",
    altLabel: "認証",
    bgColor: "bg-blue-500",
    textColor: "text-blue-500",
    icon: Shield,
  },
  validation: {
    label: "バリデーション",
    bgColor: "bg-yellow-500",
    textColor: "text-yellow-500",
    icon: AlertTriangle,
  },
  "edge-case": {
    label: "境界値",
    bgColor: "bg-purple-500",
    textColor: "text-purple-500",
    icon: Layers,
  },
  integration: {
    label: "統合",
    bgColor: "bg-cyan-500",
    textColor: "text-cyan-500",
    icon: GitBranch,
  },
  other: {
    label: "その他",
    bgColor: "bg-gray-500",
    textColor: "text-gray-500",
    icon: FlaskConical,
  },
};

/**
 * Get category config by key (handles legacy keys)
 */
export function getCategoryConfig(key: string): TestCategoryConfig {
  // Check if it's a legacy key
  const normalizedKey = LEGACY_CATEGORY_MAP[key] || key;

  // Return config or default to "other"
  return TEST_CATEGORIES[normalizedKey as TestCategoryKey] || TEST_CATEGORIES.other;
}

/**
 * Get category label (with optional alt label)
 */
export function getCategoryLabel(key: string, useAlt = false): string {
  const config = getCategoryConfig(key);
  return (useAlt && config.altLabel) || config.label;
}

/**
 * Get all category keys including legacy aliases
 * Useful for validation
 */
export function getAllCategoryKeys(): string[] {
  return [...TEST_CATEGORY_KEYS, ...Object.keys(LEGACY_CATEGORY_MAP)];
}

/**
 * Extended category config for components that need bgColor + textColor split
 * (backward compatible with existing page implementations)
 */
export const CATEGORY_LABELS: Record<
  string,
  { label: string; color: string; icon: LucideIcon }
> = Object.fromEntries(
  Object.entries(TEST_CATEGORIES).map(([key, config]) => [
    key,
    { label: config.label, color: config.bgColor, icon: config.icon },
  ])
);

/**
 * Category config with detailed styling (for test-cases/[file]/[line])
 */
export const CATEGORY_CONFIG_DETAILED: Record<
  string,
  { icon: LucideIcon; color: string; bgColor: string; label: string }
> = Object.fromEntries([
  // Standard keys
  ...Object.entries(TEST_CATEGORIES).map(([key, config]) => [
    key,
    {
      icon: config.icon,
      color: config.textColor,
      bgColor: `${config.bgColor}/10`,
      label: config.label,
    },
  ]),
  // Legacy aliases
  ...Object.entries(LEGACY_CATEGORY_MAP).map(([legacyKey, standardKey]) => {
    const config = TEST_CATEGORIES[standardKey];
    return [
      legacyKey,
      {
        icon: config.icon,
        color: config.textColor,
        bgColor: `${config.bgColor}/10`,
        label: config.label,
      },
    ];
  }),
]);
