/**
 * Shared types for portal data
 */

// App name type - represents the application context for items
// Note: "API" is used for API-type applications (MCP, REST, GraphQL, etc.)
export type AppName = "Admin" | "Public" | "Web" | "API" | "Shared" | "Unknown";

// Test Cases
export interface TestCase {
  id?: string;
  file: string;
  describe: string;
  it: string;
  description?: string;
  purpose?: string;
  expected?: string;
  line: number;
  framework: "jest" | "playwright";
  tags?: string[];
  docs?: TestDocComment;
  describeDocs?: DescribeDoc[];
  bdd?: BddAnnotation;
  category?: TestCategory;
  /** 関連アプリケーション (@app) - admin, public など */
  app?: string;
}

export interface TestDocComment {
  testdoc?: string;
  purpose?: string;
  precondition?: string;
  expected?: string;
  testCategory?: string;
}

export interface DescribeDoc {
  name: string;
  testdoc?: string;
  testGroupDoc?: string;
  purpose?: string;
}

export interface BddAnnotation {
  given?: string;
  when?: string;
  then?: string;
  and?: string[];
}

export type TestCategory = "success" | "auth" | "error" | "validation" | "edge" | "integration" | "unknown";

export interface TestCasesData {
  testCases: TestCase[];
  summary: {
    totalFiles: number;
    totalTests: number;
    jestFiles: number;
    jestTests: number;
    playwrightFiles: number;
    playwrightTests: number;
    fileStats?: Array<{
      file: string;
      framework: string;
      describes: number;
      tests: number;
      module?: {
        type: string;
        name: string;
        detailPath: string;
      };
      categoryStats?: Record<string, number>;
    }>;
  };
  generatedAt: string;
}

// Feature Map
export interface FeatureMapData {
  features: Record<string, FeatureGroup>;
  uncategorized: FeatureGroup;
  moduleDescriptions: Record<string, string>;
  moduleTypes: Record<string, TypeItem[]>;
  moduleUtilities: Record<string, UtilityItem[]>;
  apps?: AppName[];
  generatedAt: string;
}

export interface FeatureGroup {
  screens: ScreenItem[];
  components: ComponentItem[];
  actions: ActionItem[];
  modules: ModuleItem[];
  tables: TableItem[];
}

export interface ModuleItem {
  name: string;
  path: string;
  description?: string;
  descriptionEn?: string;
  usedInScreens?: string[];
  usedInComponents?: string[];
  usedInActions?: string[];
  app?: AppName;
  category?: string;
}

export interface ScreenItem {
  name: string;
  path: string;
  route?: string;
  description?: string;
  descriptionEn?: string;
  components?: string[];
  actions?: string[];
  app?: AppName;
}

export interface ComponentItem {
  name: string;
  path: string;
  description?: string;
  descriptionEn?: string;
  props?: PropInfo[];
  app?: AppName;
}

export interface ActionItem {
  name: string;
  path: string;
  description?: string;
  descriptionEn?: string;
  params?: ParamInfo[];
  returns?: string;
  dbTables?: string[];
  app?: AppName;
}

export interface TableItem {
  name: string;
  schema?: string;
  description?: string;
  columns?: ColumnInfo[];
  app?: AppName;
}

export interface PropInfo {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface ParamInfo {
  name: string;
  type: string;
  description?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey?: boolean;
  references?: string;
}

export interface TypeItem {
  name: string;
  kind: "type" | "interface" | "enum";
  description?: string;
}

export interface UtilityItem {
  name: string;
  description?: string;
}

// DB Schema
export interface DbSchemaData {
  /** データベース情報（複数DB対応用） */
  databases?: DatabaseInfo[];
  tables: DbTable[];
  generatedAt?: string;
}

/**
 * データベース情報（複数DB対応）
 */
export interface DatabaseInfo {
  /** データベース識別子 */
  name: string;
  /** データベースの説明 */
  description?: string;
  /** テーブル数 */
  tableCount: number;
}

export interface DbTable {
  name: string;
  file?: string;
  schema?: string;
  description?: string;
  category?: string;
  columnCount?: number;
  columns?: DbColumn[];
  indexes?: DbIndex[];
  foreignKeys?: DbForeignKey[];
  /** データベース名（複数DB対応用） */
  database?: string;
}

export interface DbColumn {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
  primaryKey?: boolean;
  unique?: boolean;
  description?: string;
}

export interface DbIndex {
  name: string;
  columns: string[];
  unique: boolean;
  description?: string;
}

export interface DbForeignKey {
  column: string;
  references: {
    table: string;
    column: string;
  };
}

// Linked Docs
export interface LinkedDocsData {
  linkedSources: LinkedSource[];
  generatedAt?: string;
}

export interface LinkedSource {
  path: string;
  testFile: string;
  testCount: number;
  testCases: LinkedTestCase[];
}

export interface LinkedTestCase {
  file: string;
  describe: string;
  it: string;
  line: number;
  framework: "jest" | "playwright";
  description?: string;
  purpose?: string;
  expected?: string;
  sourceFile?: string;
}

// Details JSON (generated by details command)
export interface DetailsData {
  details: Record<string, DetailItem>;
  generatedAt: string;
}

export interface DetailItem {
  name: string;
  type: "screen" | "component" | "action" | "module" | "table";
  moduleName: string;
  description: string;
  filePath: string;
  sourceCode: string;
  app?: AppName;
  jsDoc: {
    description: string;
    params: DetailParamInfo[];
    returns?: string;
    throws?: string[];
    examples: string[];
    tags: { name: string; value: string }[];
  };
  related: {
    usedInScreens?: string[];
    usedInComponents?: string[];
    usedInActions?: string[];
    dbTables?: string[];
  };
  testCoverage: {
    hasTest: boolean;
    totalTests: number;
    coverageScore: number;
    byCategory: Record<string, DetailTestCase[]>;
    recommendations: string[];
  };
  // Swagger-inspired fields (new)
  inputSchema?: InputSchemaInfo;
  outputSchema?: OutputSchemaInfo;
  errorCodes?: ErrorCodeInfo[];
  authLevel?: AuthLevel;
  rateLimit?: string;
  csrfProtection?: boolean;
}

// Swagger-inspired types
export type AuthLevel = "none" | "authenticated" | "member" | "admin";

export interface InputSchemaInfo {
  name: string;
  parameters: ZodParameterInfo[];
}

export interface ZodParameterInfo {
  name: string;
  type: string;
  format?: string;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  default?: unknown;
  description?: string;
  enumValues?: string[];
  validation?: {
    message?: string;
  };
}

export interface OutputSchemaInfo {
  type: string;
  successType?: string;
  errorType?: string;
}

export interface ErrorCodeInfo {
  code: string;
  description: string;
  status?: number;
}

export interface DetailParamInfo {
  name: string;
  type?: string;
  description: string;
}

export interface DetailTestCase {
  name: string;
  file: string;
  line: number;
  summary: string;
  purpose?: string;
  expected?: string;
  bdd?: BddAnnotation;
}

// Portal Config
export interface PortalConfig {
  title: string;
  subtitle?: string;
  sections: PortalSection[];
  devTools?: {
    title: string;
    links: PortalLink[];
  };
}

export interface PortalSection {
  title: string;
  icon: string;
  color: string;
  description: string;
  links: PortalLink[];
}

export interface PortalLink {
  text: string;
  url: string;
  description?: string;
  external?: boolean;
}

// ========================================
// Generic Application Type System
// ========================================

/**
 * Application type - determines document structure and sections
 */
export type AppType = "web" | "api" | "cli" | "library";

/**
 * API protocol type - for api type applications
 */
export type ApiProtocol = "mcp" | "rest" | "graphql" | "grpc";

/**
 * Section type - available section types per application type
 */
export type SectionType =
  | "overview"
  | "featureMap"
  | "dbSchema"
  | "testCases"
  | "i18n"        // i18n translations
  | "tools"       // API tools (MCP, REST, GraphQL, etc.)
  | "endpoints"   // REST API endpoints
  | "commands"    // CLI commands
  | "modules";    // Library modules

// ========================================
// Multi-App Support Types
// ========================================

export interface ApplicationsData {
  shared: SharedSections;
  apps: AppConfig[];
}

export interface SharedSections {
  sections: AppSectionConfig[];
}

/**
 * Base application configuration
 */
export interface AppConfigBase {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Description */
  description?: string;
  /** Icon name (lucide-react compatible) */
  icon: string;
  /** Theme color (blue, green, purple, orange, etc.) */
  color: string;
  /** Application type */
  type?: AppType;
  /** Source directory (e.g., "apps/web", "apps/mcp") */
  source?: string;
  /** Statistics */
  stats?: AppStats;
  /** Available sections */
  sections: AppSectionConfig[];
  /** Database tables used by this app */
  dbTables?: string[];
  /** Test file patterns */
  tests?: {
    match: string[];
  };
}

/**
 * Web application configuration
 */
export interface WebAppConfig extends AppConfigBase {
  type: "web";
}

/**
 * API application configuration (MCP, REST, GraphQL, gRPC)
 */
export interface ApiAppConfig extends AppConfigBase {
  type: "api";
  /** API protocol */
  protocol: ApiProtocol;
  /** Generated tools/endpoints file path */
  toolsFile?: string;
}

/**
 * CLI application configuration
 */
export interface CliAppConfig extends AppConfigBase {
  type: "cli";
}

/**
 * Library configuration
 */
export interface LibraryAppConfig extends AppConfigBase {
  type: "library";
}

/**
 * Union type for all app configurations
 */
export type AppConfig = AppConfigBase | WebAppConfig | ApiAppConfig | CliAppConfig | LibraryAppConfig;

/**
 * Type guard for API app config
 */
export function isApiAppConfig(config: AppConfig): config is ApiAppConfig {
  return config.type === "api";
}

/**
 * Type guard for Web app config
 */
export function isWebAppConfig(config: AppConfig): config is WebAppConfig {
  return config.type === "web";
}

export interface AppSectionConfig {
  type: SectionType;
  label: string;
  icon?: string;
  available?: boolean;
  count?: number;
  filter?: {
    paths?: string[];
  };
}

export interface AppStats {
  screens?: number;
  components?: number;
  actions?: number;
  tables?: number;
  tools?: number;
  endpoints?: number;
  commands?: number;
  modules?: number;
  tests?: number;
}

// MCP Tools Types (generic API tools)
export interface ApiToolsData {
  /** API server name (e.g., "MCP Server", "REST API") */
  name?: string;
  /** API description */
  description?: string;
  /** API protocol type */
  protocol?: ApiProtocol;
  tools: ApiTool[];
  categories: ApiToolCategory[];
  summary: {
    totalTools: number;
    totalCategories: number;
  };
  generatedAt: string;
}

export interface ApiTool {
  name: string;
  description: string;
  category?: string;
  feature?: string;
  dbTables?: string[];
  authLevel?: AuthLevel;
  inputSchema?: {
    type: string;
    properties?: Record<string, ApiToolParam>;
    required?: string[];
  };
  relatedTests?: string;
}

export interface ApiToolParam {
  type: string;
  description?: string;
  enum?: string[];
}

export interface ApiToolCategory {
  name: string;
  description?: string;
  tools: string[];
}

// ========================================
// i18n Types
// ========================================

/**
 * i18n App information
 */
export interface I18nApp {
  /** App ID (admin, public, web, etc.) */
  id: string;
  /** Display name */
  name: string;
  /** Icon name */
  icon: string;
  /** Color */
  color: string;
  /** Namespace count */
  namespaceCount: number;
  /** Key count */
  keyCount: number;
}

/**
 * Translation entry (key with values for each locale)
 */
export interface I18nEntry {
  /** Key (nested keys are dot-separated) */
  key: string;
  /** Translation values by locale */
  values: Record<string, string | undefined>;
}

/**
 * i18n Namespace (translation file)
 */
export interface I18nNamespace {
  /** Namespace name (file name without extension) */
  name: string;
  /** App name (admin, public, etc.) */
  app?: string;
  /** Description (inferred from title key) */
  description?: string;
  /** Translation entries */
  entries: I18nEntry[];
  /** Statistics */
  stats: {
    /** Total keys */
    totalKeys: number;
    /** Keys by locale */
    keysByLocale: Record<string, number>;
    /** Fully translated keys */
    fullyTranslatedKeys: number;
    /** Missing keys */
    missingKeys: number;
  };
}

/**
 * i18n Documentation data
 */
export interface I18nData {
  /** Detected locales */
  locales: string[];
  /** Primary locale */
  primaryLocale: string;
  /** Detected apps */
  apps: I18nApp[];
  /** Namespaces */
  namespaces: I18nNamespace[];
  /** Overall statistics */
  stats: {
    /** Total namespaces */
    totalNamespaces: number;
    /** Total keys */
    totalKeys: number;
    /** Coverage percentage */
    coveragePercent: number;
  };
  /** Generation timestamp */
  generatedAt: string;
}

// ========================================
// Package Types (Monorepo Support)
// ========================================

/**
 * Package module information
 */
export interface PackageModuleInfo {
  /** Module name (e.g., "index", "utils", "types") */
  name: string;
  /** Module file path (relative to package) */
  path: string;
  /** Module description (from JSDoc) */
  description?: string;
  /** Exported items from this module */
  exports: PackageExportItem[];
  /** Dependencies (other modules this module imports) */
  dependencies: string[];
}

/**
 * Package export item (function, type, constant)
 */
export interface PackageExportItem {
  /** Export name */
  name: string;
  /** Export kind */
  kind: "function" | "type" | "interface" | "const" | "class" | "enum";
  /** Description from JSDoc */
  description?: string;
  /** Source code snippet (for quick reference) */
  signature?: string;
}

/**
 * Package information for portal
 */
export interface PackageInfo {
  /** Package name (e.g., "database", "shared") */
  name: string;
  /** Package path (e.g., "packages/database") */
  path: string;
  /** Package prefix/scope (e.g., "@repo/database") */
  prefix: string;
  /** Package description */
  description?: string;
  /** Icon name (lucide-react compatible) */
  icon?: string;
  /** Theme color */
  color?: string;
  /** Modules in this package */
  modules: PackageModuleInfo[];
  /** Statistics */
  stats: {
    /** Total modules */
    moduleCount: number;
    /** Total exports */
    exportCount: number;
    /** Total types */
    typeCount: number;
    /** Total functions */
    functionCount: number;
  };
}

/**
 * Packages data for portal consumption
 */
export interface PackagesData {
  /** All packages */
  packages: PackageInfo[];
  /** Summary statistics */
  summary: {
    /** Total packages */
    totalPackages: number;
    /** Total modules across all packages */
    totalModules: number;
    /** Total exports across all packages */
    totalExports: number;
  };
  /** Generation timestamp */
  generatedAt: string;
}
