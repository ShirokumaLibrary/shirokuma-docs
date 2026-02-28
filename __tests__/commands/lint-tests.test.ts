/**
 * lint-tests Command Tests
 *
 * ESM 環境のため jest.unstable_mockModule + dynamic import を使用。
 *
 * @testdoc lint-tests コマンドのテスト
 */

import { jest } from "@jest/globals";
import type { Logger } from "../../src/utils/logger.js";
import { createMockLogger } from "../helpers/command-test-utils.js";

// =============================================================================
// Mocks
// =============================================================================

const mockCreateLogger = jest.fn<(...args: any[]) => any>();
const mockLoadConfig = jest.fn<(...args: any[]) => any>();
const mockCollectJestFiles = jest.fn<(...args: any[]) => any>();
const mockCollectPlaywrightFiles = jest.fn<(...args: any[]) => any>();
const mockExtractTestCases = jest.fn<(...args: any[]) => any>();
const mockRunLint = jest.fn<(...args: any[]) => any>();
const mockFormat = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  createLogger: mockCreateLogger,
}));

jest.unstable_mockModule("../../src/utils/config.js", () => ({
  loadConfig: mockLoadConfig,
  resolvePath: jest.fn((p: string) => p),
}));

jest.unstable_mockModule("../../src/commands/test-cases.js", () => ({
  collectJestFiles: mockCollectJestFiles,
  collectPlaywrightFiles: mockCollectPlaywrightFiles,
}));

jest.unstable_mockModule("../../src/parsers/test-annotations.js", () => ({
  extractTestCases: mockExtractTestCases,
}));

jest.unstable_mockModule("../../src/lint/index.js", () => ({
  runLint: mockRunLint,
  format: mockFormat,
  defaultEnabledRules: ["testdoc-required"],
}));

jest.unstable_mockModule("../../src/utils/file.js", () => ({
  readFile: jest.fn((path: string) => `// test content for ${path}`),
  writeFile: jest.fn(),
  fileExists: jest.fn(),
}));

const { lintTestsCommand } = await import("../../src/commands/lint-tests.js");

// =============================================================================
// Helpers
// =============================================================================

// =============================================================================
// Tests
// =============================================================================

describe("lintTestsCommand", () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let exitSpy: jest.SpiedFunction<typeof process.exit>;
  let mockLogger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLogger = createMockLogger();
    mockCreateLogger.mockReturnValue(mockLogger);
    mockLoadConfig.mockReturnValue({});
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    exitSpy = jest.spyOn(process, "exit").mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  /**
   * @testdoc テストファイルが見つからない場合 exit(0) で終了する
   */
  it("should exit(0) when no test files found", async () => {
    mockCollectJestFiles.mockResolvedValue([]);
    mockCollectPlaywrightFiles.mockResolvedValue([]);

    // process.exit mock doesn't halt execution, so later code may throw
    try {
      await lintTestsCommand({ project: "/tmp/test-project", config: "config.yaml" });
    } catch {
      // expected: code continues past mocked process.exit
    }

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("テストファイルが見つかりません"),
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  /**
   * @testdoc lint 合格時に exit(0) で終了する
   */
  it("should exit(0) when lint passes", async () => {
    mockCollectJestFiles.mockResolvedValue(["/tmp/test-project/test.test.ts"]);
    mockCollectPlaywrightFiles.mockResolvedValue([]);
    mockExtractTestCases.mockReturnValue([{ name: "test1" }]);
    mockRunLint.mockReturnValue({ passed: true, issues: [] });
    mockFormat.mockReturnValue("All checks passed");

    await lintTestsCommand({ project: "/tmp/test-project", config: "config.yaml" });

    expect(mockRunLint).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith("All checks passed");
    expect(mockLogger.success).toHaveBeenCalledWith(
      expect.stringContaining("全チェック合格"),
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  /**
   * @testdoc lint 失敗時に exit(1) で終了する
   */
  it("should exit(1) when lint fails", async () => {
    mockCollectJestFiles.mockResolvedValue(["/tmp/test-project/test.test.ts"]);
    mockCollectPlaywrightFiles.mockResolvedValue([]);
    mockExtractTestCases.mockReturnValue([{ name: "test1" }]);
    mockRunLint.mockReturnValue({ passed: false, issues: [{ rule: "testdoc-required" }] });
    mockFormat.mockReturnValue("1 issue found");

    await lintTestsCommand({ project: "/tmp/test-project", config: "config.yaml" });

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining("一部チェック失敗"),
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
