/**
 * lint-code Command Tests
 *
 * ESM 環境のため jest.unstable_mockModule + dynamic import を使用。
 *
 * @testdoc lint-code コマンドのテスト
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
  resolvePath: jest.fn((p: string) => p),
}));

jest.unstable_mockModule("../../src/utils/file.js", () => ({
  readFile: jest.fn(() => "// mock file content"),
  writeFile: jest.fn(),
  fileExists: jest.fn(() => true),
}));

jest.unstable_mockModule("glob", () => ({
  globSync: mockGlobSync,
}));

jest.unstable_mockModule("../../src/lint/rules/server-action-structure.js", () => ({
  serverActionStructureRule: {
    validate: jest.fn(() => ({ errors: [], warnings: [], infos: [] })),
  },
}));

jest.unstable_mockModule("../../src/lint/rules/annotation-required.js", () => ({
  annotationRequiredRule: {
    check: jest.fn(() => []),
  },
}));

const { lintCodeCommand } = await import("../../src/commands/lint-code.js");

// =============================================================================
// Helpers
// =============================================================================

// =============================================================================
// Tests
// =============================================================================

describe("lintCodeCommand", () => {
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
  it("should return early when lintCode is not enabled", async () => {
    mockLoadConfig.mockReturnValue({});

    await lintCodeCommand({ project: "/tmp/test-project", config: "config.yaml" });

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining("lint-code is not enabled"),
    );
    expect(exitSpy).not.toHaveBeenCalled();
  });

  /**
   * @testdoc 検証対象ファイルが無い場合 exit(0) で終了する
   */
  it("should exit(0) when no files to validate", async () => {
    mockLoadConfig.mockReturnValue({
      lintCode: { enabled: true, serverActions: { filePattern: "lib/actions/*.ts" } },
    });
    mockGlobSync.mockReturnValue([]);

    await lintCodeCommand({ project: "/tmp/test-project", config: "config.yaml" });

    expect(mockLogger.success).toHaveBeenCalledWith(
      expect.stringContaining("全チェック合格"),
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  /**
   * @testdoc strict モードでエラーがあると exit(1)
   */
  it("should exit(1) in strict mode with errors", async () => {
    mockLoadConfig.mockReturnValue({
      lintCode: {
        enabled: true,
        strict: true,
        serverActions: { filePattern: "lib/actions/*.ts" },
      },
    });
    // Return a file to validate
    mockGlobSync
      .mockReturnValueOnce(["/tmp/test-project/lib/actions/users.ts"])
      .mockReturnValue([]);

    await lintCodeCommand({ project: "/tmp/test-project", config: "config.yaml", strict: true });

    // The command should run and produce some output
    expect(logSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalled();
  });
});
