/**
 * Shared utilities for DB Schema pages
 */

// Category configuration with styling
export const categoryConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  auth: {
    label: "認証",
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  authentication: {
    label: "認証",
    color: "text-blue-500",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
  },
  content: {
    label: "コンテンツ",
    color: "text-green-500",
    bgColor: "bg-green-100 dark:bg-green-900/30",
  },
  organization: {
    label: "組織",
    color: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  organizations: {
    label: "組織",
    color: "text-purple-500",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
  },
  project: {
    label: "プロジェクト",
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  projects: {
    label: "プロジェクト",
    color: "text-amber-500",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
  },
  session: {
    label: "セッション",
    color: "text-cyan-500",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  sessions: {
    label: "セッション",
    color: "text-cyan-500",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  "work sessions": {
    label: "セッション",
    color: "text-cyan-500",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
  },
  entity: {
    label: "エンティティ",
    color: "text-rose-500",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
  },
  entities: {
    label: "エンティティ",
    color: "text-rose-500",
    bgColor: "bg-rose-100 dark:bg-rose-900/30",
  },
  activity: {
    label: "アクティビティ",
    color: "text-indigo-500",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  activities: {
    label: "アクティビティ",
    color: "text-indigo-500",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
  },
  token: {
    label: "トークン",
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  tokens: {
    label: "トークン",
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  "mcp tokens": {
    label: "トークン",
    color: "text-orange-500",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
  },
  context: {
    label: "コンテキスト",
    color: "text-teal-500",
    bgColor: "bg-teal-100 dark:bg-teal-900/30",
  },
  "user context": {
    label: "コンテキスト",
    color: "text-teal-500",
    bgColor: "bg-teal-100 dark:bg-teal-900/30",
  },
  other: {
    label: "その他",
    color: "text-gray-500",
    bgColor: "bg-gray-100 dark:bg-gray-900/30",
  },
};

// Normalize category name to standard format
export function normalizeCategory(category: string | undefined): string {
  if (!category) return "other";
  const lower = category.toLowerCase();

  // Map aliases to canonical names
  if (lower === "authentication" || lower === "auth") return "auth";
  if (lower === "organizations" || lower === "organization") return "organization";
  if (lower === "projects" || lower === "project") return "project";
  if (lower === "sessions" || lower === "session" || lower === "work sessions")
    return "session";
  if (lower === "entities" || lower === "entity") return "entity";
  if (lower === "activities" || lower === "activity") return "activity";
  if (lower === "tokens" || lower === "token" || lower === "mcp tokens")
    return "token";
  if (lower === "content" || lower === "contents") return "content";
  if (lower === "user context" || lower === "context") return "context";

  return lower in categoryConfig ? lower : "other";
}

// Infer category from table name
export function inferCategory(tableName: string): string {
  const name = tableName.toLowerCase();

  if (
    name.includes("user") ||
    name.includes("session") ||
    name.includes("account") ||
    name.includes("verification")
  ) {
    return "auth";
  }
  if (name.includes("organization") || name.includes("member")) {
    return "organization";
  }
  if (name.includes("project")) {
    return "project";
  }
  if (name.includes("work_session") || name.includes("session_")) {
    return "session";
  }
  if (name.includes("entity") || name.includes("entities")) {
    return "entity";
  }
  if (name.includes("activity") || name.includes("activities")) {
    return "activity";
  }
  if (name.includes("token")) {
    return "token";
  }
  if (
    name.includes("post") ||
    name.includes("category") ||
    name.includes("tag") ||
    name.includes("comment")
  ) {
    return "content";
  }
  if (name.includes("context")) {
    return "context";
  }

  return "other";
}

// Get category config with fallback
export function getCategoryConfig(category: string) {
  const normalized = normalizeCategory(category);
  return categoryConfig[normalized] || categoryConfig.other;
}
