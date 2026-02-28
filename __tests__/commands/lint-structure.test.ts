/**
 * lint-structure Command Tests
 *
 * ESM 環境のため jest.unstable_mockModule + dynamic import を使用。
 *
 * @testdoc lint-structure コマンドのテスト
 */

import { jest } from "@jest/globals";
import type { Logger } from "../../src/utils/logger.js";
import { createMockLogger } from "../helpers/command-test-utils.js";

// =============================================================================
// Mocks
// =============================================================================

const mockCreateLogger = jest.fn<(...args: any[]) => any>();
const mockLoadConfig = jest.fn<(...args: any[]) => any>();
const mockExistsSync = jest.fn<(...args: any[]) => any>();
const mockReaddirSync = jest.fn<(...args: any[]) => any>();
const mockStatSync = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  createLogger: mockCreateLogger,
}));

jest.unstable_mockModule("../../src/utils/config.js", () => ({
  loadConfig: mockLoadConfig,
}));

jest.unstable_mockModule("../../src/utils/file.js", () => ({
  writeFile: jest.fn(),
}));

jest.unstable_mockModule("node:fs", () => ({
  existsSync: mockExistsSync,
  readdirSync: mockReaddirSync,
  statSync: mockStatSync,
  readFileSync: jest.fn(() => ""),
}));

jest.unstable_mockModule("yaml", () => ({
  stringify: jest.fn((obj: any) => JSON.stringify(obj)),
}));

// Mock all structure rule functions
jest.unstable_mockModule("../../src/lint/rules/structure-rules.js", () => ({
  checkDirRequired: jest.fn(() => []),
  checkFileRequired: jest.fn(() => []),
  checkLibNoRootFiles: jest.fn(() => []),
  checkLibHasIndex: jest.fn(() => []),
  checkDirRecommended: jest.fn(() => []),
  checkNamingConvention: jest.fn(() => []),
  checkNoCrossAppImport: jest.fn(() => []),
  checkActionsStructure: jest.fn(() => []),
  checkComponentsDomainGrouping: jest.fn(() => []),
  checkLibStructureCompliance: jest.fn(() => []),
  checkBarrelExportRequired: jest.fn(() => []),
  checkActionsSeparation: jest.fn(() => []),
}));

const { lintStructureCommand } = await import("../../src/commands/lint-structure.js");

// =============================================================================
// Helpers
// =============================================================================

// =============================================================================
// Tests
// =============================================================================

describe("lintStructureCommand", () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let exitSpy: jest.SpiedFunction<typeof process.exit>;
  let mockLogger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = createMockLogger();
    mockCreateLogger.mockReturnValue(mockLogger);
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    exitSpy = jest.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  /**
   * @testdoc config で enabled: false の場合、早期リターンする
   */
  it("should return early when lintStructure is not enabled", async () => {
    mockLoadConfig.mockReturnValue({});

    await lintStructureCommand({ project: "/tmp/test-project", config: "config.yaml" });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("lint-structure is not enabled"),
    );
    expect(exitSpy).not.toHaveBeenCalled();
  });

  /**
   * @testdoc apps/ が無い場合でも exit(0) で終了する
   */
  it("should exit(0) when no apps directory exists", async () => {
    mockLoadConfig.mockReturnValue({
      lintStructure: { enabled: true },
    });
    mockExistsSync.mockReturnValue(false);

    await lintStructureCommand({ project: "/tmp/test-project", config: "config.yaml" });

    expect(logSpy).toHaveBeenCalled();
    expect(mockLogger.success).toHaveBeenCalledWith(
      expect.stringContaining("全チェック合格"),
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  /**
   * @testdoc apps/ にアプリが存在する場合、構造チェックを実行する
   */
  it("should run structure checks on apps directory", async () => {
    mockLoadConfig.mockReturnValue({
      lintStructure: { enabled: true },
      project: { name: "test-project" },
    });
    // apps/ exists
    mockExistsSync.mockImplementation((path: string) => {
      if (typeof path === "string" && path.endsWith("apps")) return true;
      if (typeof path === "string" && path.endsWith("packages")) return false;
      return false;
    });
    mockReaddirSync.mockReturnValue(["web"]);
    mockStatSync.mockReturnValue({ isDirectory: () => true });

    await lintStructureCommand({ project: "/tmp/test-project", config: "config.yaml" });

    expect(logSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalled();
  });
});
