/**
 * Command Test Utilities
 *
 * コマンドテスト用の共通ユーティリティ。
 * Logger モック、console.log キャプチャ、共通モック宣言テンプレートを提供。
 *
 * @testdoc コマンドテスト共通ユーティリティ
 */

import { jest } from "@jest/globals";
import type { Logger } from "../../src/utils/logger.js";

// =============================================================================
// Logger Mock
// =============================================================================

/**
 * テスト用 Logger モックを作成する。
 * 各メソッドは jest.fn() で、呼び出し引数を検証可能。
 */
export function createMockLogger(): Logger {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
    debug: jest.fn(),
    step: jest.fn(),
  } as unknown as Logger;
}

// =============================================================================
// Console Capture
// =============================================================================

/**
 * console.log の出力をキャプチャし、JSON パース結果を返す。
 * コマンドが console.log(JSON.stringify(...)) で出力するパターン用。
 */
export function captureConsoleJson<T = unknown>(
  spy: jest.SpiedFunction<typeof console.log>
): T | null {
  const calls = spy.mock.calls;
  for (const call of calls) {
    try {
      return JSON.parse(String(call[0])) as T;
    } catch {
      // JSON でない出力はスキップ
    }
  }
  return null;
}
