/**
 * GitHub CLI Configuration
 *
 * Reads GitHub settings from `shirokuma-docs.config.yaml` (github section).
 * Falls back to `.shirokuma-gh.json` for backward compatibility.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

/** Configuration file names (in order of preference) */
const CONFIG_FILES = [
  "shirokuma-docs.config.yaml",
  "shirokuma-docs.config.yml",
  ".shirokuma-gh.json", // Legacy fallback
];

/** Repo pair configuration */
export interface RepoPairConfig {
  /** Pair alias (key from config) */
  alias: string;
  /** Private repository (owner/name) */
  private: string;
  /** Public repository (owner/name) */
  public: string;
  /** Files/directories to exclude from public release */
  exclude: string[];
  /** Default branch name */
  defaultBranch: string;
}

/** Metrics configuration for automatic timestamp recording */
export interface MetricsConfig {
  /** Enable metrics tracking (default: false) */
  enabled?: boolean;

  /** Text field names for date tracking */
  dateFields?: {
    planningAt?: string;
    specReviewAt?: string;
    startedAt?: string;
    reviewAt?: string;
    completedAt?: string;
  };

  /** Status → Text field mapping (e.g., "In Progress" → "Started At") */
  statusToDateMapping?: Record<string, string>;

  /** Days before an In Progress issue is considered stale (default: 14) */
  staleThresholdDays?: number;
}

/** Default metrics configuration */
const DEFAULT_METRICS: MetricsConfig = {
  enabled: false,
  dateFields: {
    planningAt: "Planning At",
    specReviewAt: "Spec Review At",
    startedAt: "Started At",
    reviewAt: "Review At",
    completedAt: "Completed At",
  },
  statusToDateMapping: {
    "Planning": "Planning At",
    "Spec Review": "Spec Review At",
    "In Progress": "Started At",
    "Review": "Review At",
    "Done": "Completed At",
  },
  staleThresholdDays: 14,
};

/** Configuration structure */
export interface GhConfig {
  /** Default category for discussions (e.g., "Handovers") */
  discussionsCategory?: string;

  /** Default limit for list commands */
  listLimit?: number;

  /** Default Status for newly created issues (e.g., "Backlog") */
  defaultStatus?: string;

  /** Labels for issue types */
  labels?: {
    feature?: string;
    bug?: string;
    chore?: string;
    docs?: string;
    research?: string;
  };

  /** Public/Private repo pairs */
  repoPairs?: Record<string, {
    private: string;
    public: string;
    exclude?: string[];
    defaultBranch?: string;
  }>;

  /** Cross-repository references (alias → owner/repo) */
  crossRepos?: Record<string, string>;

  /** Metrics configuration for automatic timestamp recording */
  metrics?: MetricsConfig;
}

/** Default configuration */
const DEFAULT_CONFIG: GhConfig = {
  discussionsCategory: "Handovers",
  listLimit: 20,
  defaultStatus: "Backlog",
  labels: {
    feature: "feature",
    bug: "bug",
    chore: "chore",
    docs: "docs",
    research: "research",
  },
};

/** Cached config */
let cachedConfig: GhConfig | null = null;
let cachedConfigPath: string | null = null;

/**
 * Find all config files by walking up from current directory.
 * Returns files from nearest (project-specific) to farthest (workspace root).
 *
 * This enables config inheritance: workspace-level settings (e.g., repoPairs,
 * crossRepos) are inherited by project-specific configs in subdirectories.
 */
function findAllConfigFiles(startDir: string = process.cwd()): Array<{ path: string; type: "yaml" | "json" }> {
  const found: Array<{ path: string; type: "yaml" | "json" }> = [];
  let dir = startDir;
  const root = "/";

  while (dir !== root) {
    for (const filename of CONFIG_FILES) {
      const configPath = join(dir, filename);
      if (existsSync(configPath)) {
        const type = filename.endsWith(".json") ? "json" : "yaml";
        found.push({ path: configPath, type });
        break; // Only one config per directory level
      }
    }
    dir = join(dir, "..");
  }

  return found;
}

/**
 * Parse YAML config and extract github section
 */
function parseYamlConfig(content: string): Partial<GhConfig> {
  try {
    const parsed = parseYaml(content) as {
      github?: Record<string, unknown>;
      repoPairs?: Record<string, unknown>;
      crossRepos?: Record<string, string>;
      metrics?: Record<string, unknown>;
    };

    const result: Partial<GhConfig> = {};

    // Parse github section
    if (parsed?.github) {
      const gh = parsed.github;
      if (typeof gh.discussionsCategory === "string") {
        result.discussionsCategory = gh.discussionsCategory;
      }
      if (typeof gh.listLimit === "number") {
        result.listLimit = gh.listLimit;
      }
      if (typeof gh.defaultStatus === "string") {
        result.defaultStatus = gh.defaultStatus;
      }
      if (gh.labels && typeof gh.labels === "object") {
        result.labels = gh.labels as GhConfig["labels"];
      }
    }

    // Parse repoPairs section
    if (parsed?.repoPairs && typeof parsed.repoPairs === "object") {
      result.repoPairs = parsed.repoPairs as GhConfig["repoPairs"];
    }

    // Parse crossRepos section
    if (parsed?.crossRepos && typeof parsed.crossRepos === "object") {
      result.crossRepos = parsed.crossRepos;
    }

    // Parse metrics section
    if (parsed?.metrics && typeof parsed.metrics === "object") {
      result.metrics = parsed.metrics as MetricsConfig;
    }

    return result;
  } catch {
    return {};
  }
}

/**
 * Parse JSON config (legacy format)
 */
function parseJsonConfig(content: string): Partial<GhConfig> {
  try {
    return JSON.parse(content) as Partial<GhConfig>;
  } catch {
    return {};
  }
}

/**
 * Load configuration from file(s) or return defaults.
 *
 * Supports config inheritance: finds all config files from CWD up to root,
 * then merges them from farthest (workspace root) to nearest (project-specific).
 * This allows workspace-level settings (repoPairs, crossRepos) to be inherited
 * by project-specific configs in subdirectories.
 */
export function loadGhConfig(projectPath?: string): GhConfig {
  const searchDir = projectPath || process.cwd();

  // Return cached config if same path
  if (cachedConfig && cachedConfigPath === searchDir) {
    return cachedConfig;
  }

  const configFiles = findAllConfigFiles(searchDir);

  if (configFiles.length === 0) {
    cachedConfig = DEFAULT_CONFIG;
    cachedConfigPath = searchDir;
    return DEFAULT_CONFIG;
  }

  try {
    // Start with defaults
    let mergedConfig: GhConfig = { ...DEFAULT_CONFIG, labels: { ...DEFAULT_CONFIG.labels } };

    // Merge from farthest (workspace root) to nearest (project-specific).
    // Workspace-level settings are set first, then project-level overrides.
    for (const configFile of [...configFiles].reverse()) {
      const content = readFileSync(configFile.path, "utf-8");
      const parsed = configFile.type === "yaml"
        ? parseYamlConfig(content)
        : parseJsonConfig(content);

      mergedConfig = {
        ...mergedConfig,
        ...parsed,
        labels: {
          ...mergedConfig.labels,
          ...parsed.labels,
        },
        // Only override repoPairs/crossRepos/metrics if present in this level
        repoPairs: parsed.repoPairs ?? mergedConfig.repoPairs,
        crossRepos: parsed.crossRepos ?? mergedConfig.crossRepos,
        metrics: parsed.metrics
          ? {
              ...DEFAULT_METRICS,
              ...mergedConfig.metrics,
              ...parsed.metrics,
              dateFields: {
                ...DEFAULT_METRICS.dateFields,
                ...mergedConfig.metrics?.dateFields,
                ...parsed.metrics.dateFields,
              },
              statusToDateMapping: {
                ...DEFAULT_METRICS.statusToDateMapping,
                ...mergedConfig.metrics?.statusToDateMapping,
                ...parsed.metrics.statusToDateMapping,
              },
            }
          : mergedConfig.metrics,
      };
    }

    cachedConfig = mergedConfig;
    cachedConfigPath = searchDir;
    return cachedConfig;
  } catch (error) {
    console.error(`Warning: Failed to parse config: ${error}`);
    cachedConfig = DEFAULT_CONFIG;
    cachedConfigPath = searchDir;
    return DEFAULT_CONFIG;
  }
}

/**
 * Get default discussions category
 */
export function getDefaultCategory(config?: GhConfig): string {
  const cfg = config || loadGhConfig();
  return cfg.discussionsCategory || "Handovers";
}

/**
 * Get default list limit
 */
export function getDefaultLimit(config?: GhConfig): number {
  const cfg = config || loadGhConfig();
  return cfg.listLimit || 20;
}

/**
 * Get default status for new issues
 */
export function getDefaultStatus(config?: GhConfig): string {
  const cfg = config || loadGhConfig();
  return cfg.defaultStatus || "Backlog";
}

/**
 * Get label for issue type
 */
export function getTypeLabel(type: "feature" | "bug" | "chore" | "docs" | "research", config?: GhConfig): string {
  const cfg = config || loadGhConfig();
  return cfg.labels?.[type] || type;
}

/**
 * Get metrics configuration with defaults applied.
 * Returns null if metrics is not configured at all.
 */
export function getMetricsConfig(config?: GhConfig): MetricsConfig {
  const cfg = config || loadGhConfig();
  if (!cfg.metrics) return { ...DEFAULT_METRICS };
  return {
    ...DEFAULT_METRICS,
    ...cfg.metrics,
    dateFields: { ...DEFAULT_METRICS.dateFields, ...cfg.metrics.dateFields },
    statusToDateMapping: { ...DEFAULT_METRICS.statusToDateMapping, ...cfg.metrics.statusToDateMapping },
  };
}

/**
 * Clear cached config (for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null;
  cachedConfigPath = null;
}
