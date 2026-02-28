/**
 * lint-coverage Command Tests
 *
 * ESM 環境のため jest.unstable_mockModule + dynamic import を使用。
 *
 * @testdoc lint-coverage コマンドのテスト
 */

import { jest } from "@jest/globals";
import type { Logger } from "../../src/utils/logger.js";
import { createMockLogger } from "../helpers/command-test-utils.js";

// =============================================================================
// Mocks
// =============================================================================

const mockCreateLogger = jest.fn<(...args: any[]) => any>();
const mockLoadConfig = jest.fn<(...args: any[]) => any>();
const mockGlobSync = jest.fn<(...args: any[]) => any>();

jest.unstable_mockModule("../../src/utils/logger.js", () => ({
  createLogger: mockCreateLogger,
}));

jest.unstable_mockModule("../../src/utils/config.js", () => ({
  loadConfig: mockLoadConfig,
}));

jest.unstable_mockModule("../../src/utils/file.js", () => ({
  readFile: jest.fn((path: string) => `// content of ${path}`),
  writeFile: jest.fn(),
  fileExists: jest.fn(() => true),
}));

jest.unstable_mockModule("../../src/utils/sanitize.js", () => ({
  safeRegExp: jest.fn((pattern: string) => new RegExp(pattern)),
}));

jest.unstable_mockModule("glob", () => ({
  globSync: mockGlobSync,
}));

const { lintCoverageCommand } = await import("../../src/commands/lint-coverage.js");

// =============================================================================
// Helpers
// =============================================================================

// =============================================================================
// Tests
// =============================================================================

describe("lintCoverageCommand", () => {
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
   * @testdoc ソースファイルが無い場合 exit(0) で終了する
   */
  it("should exit(0) when no source files found", async () => {
    mockLoadConfig.mockReturnValue({});
    mockGlobSync.mockReturnValue([]);

    await lintCoverageCommand({ project: "/tmp/test-project", config: "config.yaml" });

    expect(mockLogger.success).toHaveBeenCalledWith(
      expect.stringContaining("全ファイルがカバー"),
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  /**
   * @testdoc non-strict モードで未テストファイルがあっても exit(0)
   */
  it("should exit(0) in non-strict mode even with missing tests", async () => {
    mockLoadConfig.mockReturnValue({
      lintCoverage: {
        strict: false,
        conventions: [{ source: "*.ts", test: "*.test.ts" }],
      },
    });
    mockGlobSync
      .mockReturnValueOnce(["/tmp/test-project/src/foo.ts"])
      .mockReturnValueOnce([]);

    await lintCoverageCommand({ project: "/tmp/test-project", config: "config.yaml", strict: false });

    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  /**
   * @testdoc strict モードで未テストファイルがあると exit(1)
   */
  it("should exit(1) in strict mode with missing tests", async () => {
    mockLoadConfig.mockReturnValue({
      lintCoverage: {
        strict: true,
        conventions: [{ source: "*.ts", test: "*.test.ts" }],
      },
    });
    // Source file exists but no test
    mockGlobSync
      .mockReturnValueOnce(["/tmp/test-project/src/bar.ts"])
      .mockReturnValueOnce([]);

    await lintCoverageCommand({ project: "/tmp/test-project", config: "config.yaml", strict: true });

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
