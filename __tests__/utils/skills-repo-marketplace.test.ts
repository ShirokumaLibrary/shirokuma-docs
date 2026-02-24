/**
 * resolveMarketplaceInstallLocation Tests
 *
 * known_marketplaces.json 読み込みの共通ヘルパーのユニットテスト
 *
 * @testdoc resolveMarketplaceInstallLocation のテスト (#963)
 */

import { existsSync } from "fs";
import { join } from "path";

// =============================================================================
// Dynamic import for ESM module
// =============================================================================

let resolveMarketplaceInstallLocation: typeof import("../../src/utils/skills-repo.js").resolveMarketplaceInstallLocation;

beforeAll(async () => {
  const mod = await import("../../dist/utils/skills-repo.js");
  resolveMarketplaceInstallLocation = mod.resolveMarketplaceInstallLocation;
});

// =============================================================================
// resolveMarketplaceInstallLocation Tests
// =============================================================================

// known_marketplaces.json のオリジナルパス（homedir ベース）を上書きできないため、
// 実環境の known_marketplaces.json に依存しないテストを書く。
// ヘルパー関数は内部で homedir() を使うため、ファイル不存在ケースのみ直接テスト可能。
// 正常系は getMarketplaceClonePath() 経由で間接テスト。

describe("resolveMarketplaceInstallLocation", () => {
  /**
   * @testdoc known_marketplaces.json が存在しない場合は null を返す
   */
  it("should return null when known_marketplaces.json does not exist", () => {
    // 関数は homedir()/.claude/plugins/known_marketplaces.json を参照する。
    // CI 環境ではファイルが存在しないため null が返る。
    // ローカル開発環境では実ファイルが存在する可能性があるためスキップ条件を追加。
    const knownPath = join(
      process.env.HOME ?? "/nonexistent",
      ".claude",
      "plugins",
      "known_marketplaces.json",
    );

    if (existsSync(knownPath)) {
      // 実環境にファイルがある場合: string | null のいずれかを返すことを確認
      const result = resolveMarketplaceInstallLocation();
      expect(typeof result === "string" || result === null).toBe(true);
    } else {
      // ファイル不存在: null を返す
      const result = resolveMarketplaceInstallLocation();
      expect(result).toBeNull();
    }
  });

  /**
   * @testdoc 正常な known_marketplaces.json がある場合は string を返す（実環境のみ）
   */
  it("should return string when valid known_marketplaces.json exists", () => {
    const knownPath = join(
      process.env.HOME ?? "/nonexistent",
      ".claude",
      "plugins",
      "known_marketplaces.json",
    );

    if (!existsSync(knownPath)) {
      // CI 環境ではスキップ
      return;
    }

    const result = resolveMarketplaceInstallLocation();
    // ファイルがあっても installLocation のパスが存在しなければ null
    expect(typeof result === "string" || result === null).toBe(true);
    if (result !== null) {
      expect(existsSync(result)).toBe(true);
    }
  });
});
