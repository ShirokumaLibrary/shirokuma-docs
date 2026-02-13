import { promises as fs } from "fs";
import path from "path";

/**
 * GitHub Data Types (from github-data.json)
 */
export interface GithubIssue {
  number: number;
  title: string;
  url: string;
  state: string;
  labels: string[];
  status: string | null;
  priority: string | null;
  type: string | null;
  size: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GithubDiscussion {
  number: number;
  title: string;
  url: string;
  category: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  body?: string;
}

export interface GithubRepoInfo {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  defaultBranch: string;
  visibility: string;
  stargazers: number;
  forks: number;
  issues: number;
  pullRequests: number;
}

export interface GithubData {
  repository: GithubRepoInfo;
  issues: {
    inProgress: GithubIssue[];
    ready: GithubIssue[];
    backlog: GithubIssue[];
    icebox: GithubIssue[];
    done: GithubIssue[];
    total: number;
  };
  handovers: GithubDiscussion[];
  specs: GithubDiscussion[];
  fetchedAt: string;
}

import type {
  TestCasesData,
  FeatureMapData,
  DbSchemaData,
  DatabaseInfo,
  LinkedDocsData,
  PortalConfig,
  DetailsData,
  DetailItem,
  ApplicationsData,
  ApiToolsData,
  AppConfig,
  AppStats,
  AppType,
  ApiProtocol,
  SectionType,
  I18nData,
  PackagesData,
  PackageInfo,
} from "./types";
import type { SearchIndex } from "./search";
import { generateSearchIndex } from "./search-index-generator";

/**
 * Configuration-based application definition (from shirokuma-docs.config.yaml)
 */
interface ConfiguredApplication {
  id: string;
  type: AppType;
  name: string;
  description?: string;
  source?: string;
  icon?: string;
  color?: string;
  protocol?: ApiProtocol;
  toolsFile?: string;
  sections?: Array<{
    type: SectionType;
    label?: string;
    icon?: string;
    filter?: { paths?: string[] };
  }>;
  dbTables?: string[];
  tests?: { match: string[] };
}

/**
 * Get the project root directory (where OVERVIEW.md might be)
 */
function getProjectRoot(): string {
  return process.env.PROJECT_ROOT || "./";
}

/**
 * Load overview markdown content
 */
export async function loadOverview(): Promise<{ content: string; title: string } | null> {
  const projectRoot = getProjectRoot();
  const possiblePaths = [
    path.join(projectRoot, "docs", "OVERVIEW.md"),
    path.join(projectRoot, "OVERVIEW.md"),
    path.join(projectRoot, "README.md"),
  ];

  for (const filePath of possiblePaths) {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      // Extract title from first h1
      const titleMatch = content.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : "Overview";
      return { content, title };
    } catch {
      // Try next path
    }
  }

  // Try from data directory as fallback
  try {
    const dataPath = path.join(getDataDir(), "overview.md");
    const content = await fs.readFile(dataPath, "utf-8");
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : "Overview";
    return { content, title };
  } catch {
    return null;
  }
}

/**
 * Get the data directory path from environment or default
 */
function getDataDir(): string {
  if (process.env.PORTAL_DATA_DIR) {
    return process.env.PORTAL_DATA_DIR;
  }
  // Use absolute path relative to project root
  return path.join(process.cwd(), "data");
}

/**
 * Read and parse a JSON file
 */
async function readJsonFile<T>(filename: string): Promise<T | null> {
  try {
    const filePath = path.join(getDataDir(), filename);
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    console.warn(`Failed to load ${filename}`);
    return null;
  }
}

/**
 * Check if a file exists
 */
async function fileExists(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(getDataDir(), filename);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load test cases data
 */
export async function loadTestCases(): Promise<TestCasesData | null> {
  return readJsonFile<TestCasesData>("test-cases.json");
}

/**
 * Load feature map data
 */
export async function loadFeatureMap(): Promise<FeatureMapData | null> {
  return readJsonFile<FeatureMapData>("feature-map.json");
}

/**
 * Load database schema data
 *
 * @param dbName - Database name (required for filtering by specific DB)
 *                 If provided, returns only that database's tables
 *                 If not provided, returns all tables
 */
export async function loadDbSchema(dbName?: string): Promise<DbSchemaData | null> {
  const data = await readJsonFile<DbSchemaData>("db-schema.json");
  if (!data) return null;

  // If no specific DB requested, return all data
  if (!dbName) return data;

  // Filter tables for the specific database
  const filteredTables = data.tables.filter((t) => t.database === dbName);

  // Find the database info
  const dbInfo = data.databases?.find((db) => db.name === dbName);

  return {
    databases: dbInfo ? [dbInfo] : undefined,
    tables: filteredTables,
    generatedAt: data.generatedAt,
  };
}

/**
 * Get list of databases
 * Always returns at least one database (default "database" if not specified)
 */
export async function getDbList(): Promise<DatabaseInfo[]> {
  const data = await readJsonFile<DbSchemaData>("db-schema.json");
  if (!data) return [];

  // If databases array exists, return it
  if (data.databases && data.databases.length > 0) {
    return data.databases;
  }

  // Fallback for old format without databases array
  // Create a single "database" entry
  return [{
    name: "database",
    tableCount: data.tables.length,
  }];
}

/**
 * Load linked docs data
 */
export async function loadLinkedDocs(): Promise<LinkedDocsData | null> {
  return readJsonFile<LinkedDocsData>("linked-docs.json");
}

/**
 * Load details data (generated by details command)
 */
export async function loadDetails(): Promise<DetailsData | null> {
  return readJsonFile<DetailsData>("details.json");
}

/**
 * Load MCP tools data
 */
export async function loadApiTools(): Promise<ApiToolsData | null> {
  return readJsonFile<ApiToolsData>("api-tools.json");
}

/**
 * Load i18n documentation data
 */
export async function loadI18n(): Promise<I18nData | null> {
  return readJsonFile<I18nData>("i18n.json");
}

/**
 * Load packages data (monorepo shared packages)
 */
export async function loadPackages(): Promise<PackagesData | null> {
  return readJsonFile<PackagesData>("packages.json");
}

/**
 * Load GitHub data (issues, discussions, repository info)
 */
export async function loadGithubData(): Promise<GithubData | null> {
  return readJsonFile<GithubData>("github-data.json");
}

/**
 * Get list of all packages
 */
export async function getPackageList(): Promise<PackageInfo[]> {
  const data = await loadPackages();
  return data?.packages ?? [];
}

/**
 * Get a single package by name
 */
export async function getPackage(name: string): Promise<PackageInfo | null> {
  const data = await loadPackages();
  if (!data) return null;
  return data.packages.find((pkg) => pkg.name === name) ?? null;
}

/**
 * Screenshot manifest entry
 */
export interface ScreenshotEntry {
  /** Screen name */
  name: string;
  /** File name (relative path within screenshots directory) */
  fileName: string;
  /** Route path */
  route: string;
  /** Description */
  description?: string;
  /** Source file path */
  sourcePath?: string;
  /** Account (for multi-account mode) */
  account?: string;
  /** Viewport size */
  viewport?: { width: number; height: number };
}

/**
 * Screenshot manifest data (per-app format)
 */
export interface ScreenshotsData {
  /** Generation timestamp */
  generatedAt: string;
  /** Configuration */
  config: {
    baseUrl: string;
    viewport: { width: number; height: number };
    outputDir: string;
  };
  /** Screenshots by screen name */
  screenshots: Record<string, ScreenshotEntry>;
}

/**
 * Multi-app screenshot index
 */
export interface MultiAppScreenshotsIndex {
  /** Generation timestamp */
  generatedAt: string;
  /** App IDs */
  apps: string[];
  /** Per-app manifests */
  manifests: Record<string, ScreenshotsData>;
}

/**
 * Load multi-app screenshots index
 * Returns the combined index.json if available, otherwise null
 */
export async function loadScreenshotsIndex(): Promise<MultiAppScreenshotsIndex | null> {
  try {
    const indexPath = path.join(getDataDir(), "screenshots", "index.json");
    const content = await fs.readFile(indexPath, "utf-8");
    return JSON.parse(content) as MultiAppScreenshotsIndex;
  } catch {
    return null;
  }
}

/**
 * Load screenshots manifest data for a specific app
 * @param appId - App ID (e.g., "admin", "public")
 * @returns Screenshots data for the app or null if not found
 */
export async function loadScreenshotsForApp(appId: string): Promise<ScreenshotsData | null> {
  try {
    // Try app-specific path first
    const appPath = path.join(getDataDir(), "screenshots", appId, "screenshots.json");
    const content = await fs.readFile(appPath, "utf-8");
    return JSON.parse(content) as ScreenshotsData;
  } catch {
    // Fall back to multi-app index
    const index = await loadScreenshotsIndex();
    if (index?.manifests[appId]) {
      return index.manifests[appId];
    }
    return null;
  }
}

/**
 * Load screenshots manifest data (legacy single-app format or first available app)
 * Screenshots manifest is copied to data/screenshots/ during portal build
 */
export async function loadScreenshots(): Promise<ScreenshotsData | null> {
  try {
    // Try legacy format first
    const screenshotsPath = path.join(getDataDir(), "screenshots", "screenshots.json");
    const content = await fs.readFile(screenshotsPath, "utf-8");
    return JSON.parse(content) as ScreenshotsData;
  } catch {
    // Fall back to multi-app index, return first app's data
    const index = await loadScreenshotsIndex();
    if (index && index.apps.length > 0) {
      const firstAppId = index.apps[0];
      return index.manifests[firstAppId] || null;
    }
    return null;
  }
}

/**
 * Get screenshot for a specific screen
 * @param screenName - Name of the screen
 * @param appId - Optional app ID to search in specific app
 * @returns Screenshot entry or null if not found
 */
export async function getScreenshotForScreen(
  screenName: string,
  appId?: string
): Promise<{ entry: ScreenshotEntry; appId: string } | null> {
  // If appId specified, search only in that app
  if (appId) {
    const data = await loadScreenshotsForApp(appId);
    if (data?.screenshots[screenName]) {
      return { entry: data.screenshots[screenName], appId };
    }
    return null;
  }

  // Search across all apps
  const index = await loadScreenshotsIndex();
  if (index) {
    for (const app of index.apps) {
      const manifest = index.manifests[app];
      if (manifest?.screenshots[screenName]) {
        return { entry: manifest.screenshots[screenName], appId: app };
      }
    }
  }

  // Fall back to legacy format
  const data = await loadScreenshots();
  if (data?.screenshots[screenName]) {
    return { entry: data.screenshots[screenName], appId: "default" };
  }

  return null;
}

/**
 * Get all available app IDs with screenshots
 */
export async function getScreenshotAppIds(): Promise<string[]> {
  const index = await loadScreenshotsIndex();
  if (index) {
    return index.apps;
  }
  // Legacy format - return empty or single default
  const legacy = await loadScreenshots();
  return legacy ? ["default"] : [];
}

/**
 * Coverage report data structure from lint-coverage
 */
export interface CoverageData {
  results: Array<{
    source: string;
    test?: string;
    testCount: number;
    status: "covered" | "skipped" | "missing";
    skipReason?: string;
  }>;
  orphans: Array<{
    test: string;
    expectedSource: string;
  }>;
  summary: {
    totalSources: number;
    coveredCount: number;
    skippedCount: number;
    missingCount: number;
    orphanCount: number;
    coveragePercent: number;
  };
  passed: boolean;
}

/**
 * Load coverage data (from lint-coverage)
 */
export async function loadCoverage(): Promise<CoverageData | null> {
  return readJsonFile<CoverageData>("coverage.json");
}

/**
 * Load applications configuration (or generate from available data)
 */
export async function loadApplications(): Promise<ApplicationsData | null> {
  // Try to load pre-configured applications.json first
  const configured = await readJsonFile<ApplicationsData>("applications.json");
  if (configured) {
    return configured;
  }

  // Auto-generate from available data
  return autoGenerateApplications();
}

/**
 * Auto-generate applications data from available JSON files
 */
async function autoGenerateApplications(): Promise<ApplicationsData> {
  const [available, featureMap, testCases, dbSchema, mcpTools] = await Promise.all([
    getAvailableData(),
    loadFeatureMap(),
    loadTestCases(),
    loadDbSchema(),
    loadApiTools(),
  ]);

  // Calculate web app stats
  const webStats: AppStats = { screens: 0, components: 0, actions: 0, tests: 0 };
  if (featureMap) {
    for (const group of Object.values(featureMap.features)) {
      webStats.screens! += group.screens?.length || 0;
      webStats.components! += group.components?.length || 0;
      webStats.actions! += group.actions?.length || 0;
    }
    webStats.screens! += featureMap.uncategorized.screens?.length || 0;
    webStats.components! += featureMap.uncategorized.components?.length || 0;
    webStats.actions! += featureMap.uncategorized.actions?.length || 0;
  }

  // Count web tests (non-MCP tests)
  if (testCases) {
    const mcpTestCount = testCases.testCases.filter((t) =>
      t.file.includes("/mcp/") || t.file.includes("apps/mcp/")
    ).length;
    webStats.tests = testCases.summary.totalTests - mcpTestCount;
  }

  // Calculate MCP/API stats
  const mcpStats: AppStats = {
    tools: mcpTools?.summary?.totalTools || mcpTools?.tools?.length || 0,
    tests:
      testCases?.testCases.filter((t) =>
        t.file.includes("/mcp/") || t.file.includes("apps/mcp/")
      ).length || 0,
  };

  const apps: AppConfig[] = [];

  // Add Web app if feature map exists
  if (available.hasFeatureMap) {
    apps.push({
      id: "web",
      name: "Web アプリ",
      description: "メインアプリケーション",
      type: "web",
      icon: "globe",
      color: "blue",
      source: "apps/web",
      stats: webStats,
      sections: [{ type: "featureMap", label: "機能マップ", icon: "layers", available: true }],
    });
  }

  // Add API app if API tools exist (MCP, REST, etc.)
  if (available.hasApiTools) {
    // Determine API type from tools data (could be extended to detect REST/GraphQL)
    const apiProtocol = mcpTools?.protocol || "mcp";
    const apiName = mcpTools?.name || "API Server";
    const apiDescription = mcpTools?.description || "API ツール一覧";

    apps.push({
      id: "mcp", // Keep ID for backward compatibility
      name: apiName,
      description: apiDescription,
      type: "api",
      protocol: apiProtocol,
      icon: "bot",
      color: "purple",
      source: "apps/mcp",
      stats: mcpStats,
      sections: [
        {
          type: "tools",
          label: "ツール一覧",
          icon: "wrench",
          available: true,
          count: mcpStats.tools,
        },
      ],
    } as AppConfig);
  }

  // Calculate total tests
  const totalTests = testCases?.summary.totalTests || 0;

  return {
    shared: {
      sections: [
        {
          type: "overview",
          label: "プロジェクト概要",
          icon: "file-text",
          available: available.hasOverview,
        },
        {
          type: "dbSchema",
          label: "データベーススキーマ",
          icon: "database",
          available: available.hasDbSchema,
          count: dbSchema?.tables.length,
        },
        {
          type: "testCases",
          label: "テストケース",
          icon: "check-circle",
          available: available.hasTestCases,
          count: totalTests,
        },
      ],
    },
    apps,
  };
}

/**
 * Get application by ID
 */
export async function getApplicationById(appId: string): Promise<AppConfig | null> {
  const apps = await loadApplications();
  if (!apps) return null;
  return apps.apps.find((app) => app.id === appId) || null;
}

/**
 * Check if an application is an API type
 */
export function isApiApplication(app: AppConfig): boolean {
  return app.type === "api";
}

/**
 * Get API protocol for an application (if it's an API type)
 */
export function getApiProtocol(app: AppConfig): ApiProtocol | null {
  if (app.type === "api" && "protocol" in app) {
    return (app as { protocol: ApiProtocol }).protocol;
  }
  return null;
}

/**
 * Get a specific detail item by key
 * Key format: "{type}/{moduleName}/{name}" (e.g., "action/entities/getEntities")
 */
export async function getDetailItem(key: string): Promise<DetailItem | null> {
  const details = await loadDetails();
  if (!details) return null;
  return details.details[key] || null;
}

/**
 * Find detail item by type, module, and name
 */
export async function findDetailItem(
  type: string,
  moduleName: string,
  name: string
): Promise<DetailItem | null> {
  const key = `${type}/${moduleName}/${name}`;
  return getDetailItem(key);
}

/**
 * Load portal configuration (from YAML config, converted to JSON)
 */
export async function loadPortalConfig(): Promise<PortalConfig | null> {
  return readJsonFile<PortalConfig>("portal-config.json");
}

/**
 * Get project name from environment
 */
export function getProjectName(): string {
  return process.env.PROJECT_NAME || "Documentation";
}

/**
 * Check if a screenshot manifest file exists
 */
async function screenshotsExist(): Promise<boolean> {
  try {
    const screenshotsPath = path.join(getDataDir(), "screenshots", "screenshots.json");
    await fs.access(screenshotsPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check available data files
 */
export async function getAvailableData(): Promise<{
  hasTestCases: boolean;
  hasFeatureMap: boolean;
  hasDbSchema: boolean;
  hasOverview: boolean;
  hasApiTools: boolean;
  hasI18n: boolean;
  hasScreenshots: boolean;
  hasPackages: boolean;
  hasGithubData: boolean;
}> {
  const [hasTestCases, hasFeatureMap, hasDbSchema, hasApiTools, hasI18n, hasScreenshots, hasPackages, hasGithubData, overview] = await Promise.all([
    fileExists("test-cases.json"),
    fileExists("feature-map.json"),
    fileExists("db-schema.json"),
    fileExists("api-tools.json"),
    fileExists("i18n.json"),
    screenshotsExist(),
    fileExists("packages.json"),
    fileExists("github-data.json"),
    loadOverview(),
  ]);

  return { hasTestCases, hasFeatureMap, hasDbSchema, hasApiTools, hasI18n, hasScreenshots, hasPackages, hasGithubData, hasOverview: overview !== null };
}

/**
 * Get test case categories from data
 */
export function getTestCategories(data: TestCasesData): string[] {
  const categories = new Set<string>();
  for (const tc of data.testCases) {
    // Group by framework or custom category
    if (tc.framework === "playwright") {
      categories.add("e2e");
    } else {
      // Infer category from file path
      if (tc.file.includes("/actions/") || tc.file.includes("__tests__/lib/actions/")) {
        categories.add("server-actions");
      } else if (tc.file.includes("/components/") || tc.file.includes("__tests__/components/")) {
        categories.add("components");
      } else {
        categories.add("other");
      }
    }
  }
  return Array.from(categories).sort();
}

/**
 * Get test files for a category
 */
export function getTestFilesByCategory(
  data: TestCasesData,
  category: string
): { file: string; tests: number; firstTest: import("./types").TestCase }[] {
  const fileMap = new Map<string, { count: number; first: import("./types").TestCase }>();

  for (const tc of data.testCases) {
    let tcCategory: string;
    if (tc.framework === "playwright") {
      tcCategory = "e2e";
    } else if (tc.file.includes("/actions/") || tc.file.includes("__tests__/lib/actions/")) {
      tcCategory = "server-actions";
    } else if (tc.file.includes("/components/") || tc.file.includes("__tests__/components/")) {
      tcCategory = "components";
    } else {
      tcCategory = "other";
    }

    if (tcCategory === category) {
      const existing = fileMap.get(tc.file);
      if (existing) {
        existing.count++;
      } else {
        fileMap.set(tc.file, { count: 1, first: tc });
      }
    }
  }

  return Array.from(fileMap.entries())
    .map(([file, { count, first }]) => ({ file, tests: count, firstTest: first }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

/**
 * Get tests for a specific file
 */
export function getTestsByFile(data: TestCasesData, file: string): import("./types").TestCase[] {
  return data.testCases.filter((tc) => tc.file === file);
}

/**
 * Extract file slug from path
 */
export function fileToSlug(file: string): string {
  return path.basename(file).replace(/\.(test|spec)\.(ts|tsx|js)$/, "");
}

/**
 * Convert category to URL slug
 */
export function categoryToSlug(category: string): string {
  return category.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Get test coverage for a feature item from details.json
 * Returns coverage info if found in details, otherwise null
 */
export async function getTestCoverageForItem(
  type: string,
  moduleName: string,
  itemName: string
): Promise<{
  hasTest: boolean;
  totalTests: number;
  coverageScore: number;
} | null> {
  const details = await loadDetails();
  if (!details) return null;

  // Try different key patterns (details.json uses various formats)
  const possibleKeys = [
    `${type}/${moduleName}/${itemName}`,
    `${type.toLowerCase()}/${moduleName}/${itemName}`,
  ];

  for (const key of possibleKeys) {
    const item = details.details[key];
    if (item?.testCoverage) {
      return {
        hasTest: item.testCoverage.hasTest,
        totalTests: item.testCoverage.totalTests,
        coverageScore: item.testCoverage.coverageScore,
      };
    }
  }

  return null;
}

/**
 * Extract file module from item path
 * e.g., "apps/web/lib/actions/projects.ts" -> "projects"
 */
function extractFileModule(itemPath: string | undefined): string | null {
  if (!itemPath) return null;
  const fileName = itemPath.split("/").pop();
  if (!fileName) return null;
  return fileName.replace(/\.(ts|tsx)$/, "");
}

/**
 * Get aggregated test coverage for a module
 * Sums up coverage from all items in the module
 */
export async function getModuleTestCoverage(
  moduleName: string
): Promise<{
  totalTests: number;
  testedItems: number;
  totalItems: number;
  averageCoverage: number;
}> {
  const [details, featureMap] = await Promise.all([
    loadDetails(),
    loadFeatureMap(),
  ]);

  if (!details || !featureMap) {
    return { totalTests: 0, testedItems: 0, totalItems: 0, averageCoverage: 0 };
  }

  const moduleGroup = featureMap.features[moduleName];
  if (!moduleGroup) {
    return { totalTests: 0, testedItems: 0, totalItems: 0, averageCoverage: 0 };
  }

  let totalTests = 0;
  let testedItems = 0;
  let totalCoverage = 0;
  let totalItems = 0;

  // Check all item types - include path for correct key lookup
  const itemTypes: Array<{ type: string; items: Array<{ name: string; path?: string }> }> = [
    { type: "screen", items: moduleGroup.screens || [] },
    { type: "component", items: moduleGroup.components || [] },
    { type: "action", items: moduleGroup.actions || [] },
    { type: "table", items: moduleGroup.tables || [] },
  ];

  for (const { type, items } of itemTypes) {
    for (const item of items) {
      totalItems++;

      // Extract file module from item path (details.json uses file module as key)
      const fileModule = extractFileModule(item.path);

      // Try multiple key formats
      const possibleKeys = [
        fileModule ? `${type}/${fileModule}/${item.name}` : null,
        `${type}/${moduleName}/${item.name}`,
      ].filter((k): k is string => k !== null);

      let found = false;
      for (const key of possibleKeys) {
        const detail = details.details[key];
        if (detail?.testCoverage) {
          totalTests += detail.testCoverage.totalTests;
          if (detail.testCoverage.hasTest) {
            testedItems++;
            totalCoverage += detail.testCoverage.coverageScore;
          }
          found = true;
          break;
        }
      }
    }
  }

  return {
    totalTests,
    testedItems,
    totalItems,
    averageCoverage: testedItems > 0 ? Math.round(totalCoverage / testedItems) : 0,
  };
}

/**
 * Group tests by feature module
 * Returns tests organized by module name instead of file path
 */
export async function getTestsByModule(): Promise<
  Map<string, {
    moduleName: string;
    tests: import("./types").TestCase[];
    coverage: { totalTests: number; testedItems: number; totalItems: number };
  }>
> {
  const [testCases, details, featureMap] = await Promise.all([
    loadTestCases(),
    loadDetails(),
    loadFeatureMap(),
  ]);

  const moduleTests = new Map<string, {
    moduleName: string;
    tests: import("./types").TestCase[];
    coverage: { totalTests: number; testedItems: number; totalItems: number };
  }>();

  if (!testCases || !featureMap) return moduleTests;

  // Build a map of source file path -> module name
  const pathToModule = new Map<string, string>();

  for (const [moduleName, group] of Object.entries(featureMap.features)) {
    const allItems = [
      ...(group.screens || []),
      ...(group.components || []),
      ...(group.actions || []),
      ...(group.tables || []),
    ];
    for (const item of allItems) {
      if ("path" in item && item.path) {
        pathToModule.set(item.path, moduleName);
      }
    }
  }

  // Group tests by module based on their source file
  for (const tc of testCases.testCases) {
    // Find module from test file's associated source
    let moduleName = "Uncategorized";

    // Try to infer module from test file path
    const testPath = tc.file;
    // E2E tests often test specific modules
    for (const [srcPath, module] of pathToModule.entries()) {
      const srcFileName = srcPath.split("/").pop()?.replace(/\.(ts|tsx)$/, "");
      if (srcFileName && testPath.includes(srcFileName)) {
        moduleName = module;
        break;
      }
    }

    // Also check based on linked-docs if available
    if (details) {
      for (const [key, item] of Object.entries(details.details)) {
        if (item.testCoverage?.byCategory) {
          for (const tests of Object.values(item.testCoverage.byCategory)) {
            for (const t of tests) {
              if (t.file === tc.file && t.name === tc.it) {
                const keyParts = key.split("/");
                if (keyParts.length >= 2) {
                  moduleName = keyParts[1];
                }
                break;
              }
            }
          }
        }
      }
    }

    if (!moduleTests.has(moduleName)) {
      moduleTests.set(moduleName, {
        moduleName,
        tests: [],
        coverage: { totalTests: 0, testedItems: 0, totalItems: 0 },
      });
    }
    moduleTests.get(moduleName)!.tests.push(tc);
  }

  // Update coverage stats
  for (const [moduleName, data] of moduleTests.entries()) {
    const moduleCoverage = await getModuleTestCoverage(moduleName);
    data.coverage = {
      totalTests: data.tests.length,
      testedItems: moduleCoverage.testedItems,
      totalItems: moduleCoverage.totalItems,
    };
  }

  return moduleTests;
}

/**
 * Get sidebar navigation data
 */
export async function getSidebarNavData(): Promise<{
  modules: { name: string; screens: number; components: number; actions: number; tables: number }[];
  testCategories: { name: string; slug: string; count: number }[];
  packages: { name: string; prefix: string; moduleCount: number; exportCount: number }[];
  hasFeatureMap: boolean;
  hasDbSchema: boolean;
  hasTestCases: boolean;
  hasOverview: boolean;
  hasApiTools: boolean;
  hasI18n: boolean;
  hasPackages: boolean;
  applications: ApplicationsData | null;
}> {
  const [featureMap, testCases, available, applications, packagesData] = await Promise.all([
    loadFeatureMap(),
    loadTestCases(),
    getAvailableData(),
    loadApplications(),
    loadPackages(),
  ]);

  // Extract modules from feature map
  const modules: { name: string; screens: number; components: number; actions: number; tables: number }[] = [];

  if (featureMap) {
    for (const [name, group] of Object.entries(featureMap.features)) {
      modules.push({
        name,
        screens: group.screens?.length || 0,
        components: group.components?.length || 0,
        actions: group.actions?.length || 0,
        tables: group.tables?.length || 0,
      });
    }

    // Add uncategorized if it has items
    const uncategorized = featureMap.uncategorized;
    if (uncategorized.screens?.length || uncategorized.components?.length ||
        uncategorized.actions?.length || uncategorized.tables?.length) {
      modules.push({
        name: "Uncategorized",
        screens: uncategorized.screens?.length || 0,
        components: uncategorized.components?.length || 0,
        actions: uncategorized.actions?.length || 0,
        tables: uncategorized.tables?.length || 0,
      });
    }
  }

  // Extract test categories
  const testCategories: { name: string; slug: string; count: number }[] = [];

  if (testCases) {
    const categoryCounts = new Map<string, number>();

    for (const tc of testCases.testCases) {
      let category: string;
      if (tc.framework === "playwright") {
        category = "e2e";
      } else if (tc.file.includes("/actions/") || tc.file.includes("__tests__/lib/actions/")) {
        category = "server-actions";
      } else if (tc.file.includes("/components/") || tc.file.includes("__tests__/components/")) {
        category = "components";
      } else {
        category = "other";
      }
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    }

    const categoryLabels: Record<string, string> = {
      "e2e": "E2E テスト",
      "server-actions": "Server Actions",
      "components": "Components",
      "other": "その他",
    };

    for (const [slug, count] of categoryCounts.entries()) {
      testCategories.push({
        name: categoryLabels[slug] || slug,
        slug,
        count,
      });
    }

    // Sort by count descending
    testCategories.sort((a, b) => b.count - a.count);
  }

  // Extract packages data
  const packages: { name: string; prefix: string; moduleCount: number; exportCount: number }[] = [];
  if (packagesData) {
    for (const pkg of packagesData.packages) {
      packages.push({
        name: pkg.name,
        prefix: pkg.prefix,
        moduleCount: pkg.stats.moduleCount,
        exportCount: pkg.stats.exportCount,
      });
    }
  }

  return {
    modules,
    testCategories,
    packages,
    hasFeatureMap: available.hasFeatureMap,
    hasDbSchema: available.hasDbSchema,
    hasTestCases: available.hasTestCases,
    hasOverview: available.hasOverview,
    hasApiTools: available.hasApiTools,
    hasI18n: available.hasI18n,
    hasPackages: available.hasPackages,
    applications,
  };
}

/**
 * Load or generate search index
 */
export async function loadSearchIndex(): Promise<SearchIndex | null> {
  try {
    // Try to load pre-generated search index first
    const cached = await readJsonFile<SearchIndex>("search-index.json");
    if (cached) {
      return cached;
    }

    // Generate search index from available data
    const [featureMap, dbSchema, testCases, details] = await Promise.all([
      loadFeatureMap(),
      loadDbSchema(),
      loadTestCases(),
      loadDetails(),
    ]);

    return generateSearchIndex(featureMap, dbSchema, testCases, details);
  } catch (error) {
    console.warn("Failed to load search index:", error);
    return null;
  }
}
