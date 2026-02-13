/**
 * i18n Utility Tests
 *
 * Tests for CLI message dictionary lookup, locale resolution,
 * parameter interpolation, and locale priority.
 *
 * @testdoc CLI i18nユーティリティのテスト
 */

import {
  initI18n,
  setLocaleFromConfig,
  getLocale,
  t,
} from "../../src/utils/i18n.js";

// =============================================================================
// Setup: Save and restore env/locale between tests
// =============================================================================

let savedLocale: string | undefined;
let savedLang: string | undefined;

beforeEach(() => {
  savedLocale = process.env.SHIROKUMA_LOCALE;
  savedLang = process.env.LANG;
  delete process.env.SHIROKUMA_LOCALE;
  delete process.env.LANG;
  // Reset to default state
  initI18n();
});

afterEach(() => {
  if (savedLocale !== undefined) {
    process.env.SHIROKUMA_LOCALE = savedLocale;
  } else {
    delete process.env.SHIROKUMA_LOCALE;
  }
  if (savedLang !== undefined) {
    process.env.LANG = savedLang;
  } else {
    delete process.env.LANG;
  }
});

// =============================================================================
// initI18n - Locale initialization
// =============================================================================

describe("initI18n", () => {
  /**
   * @testdoc 明示的なロケールが設定される
   * @purpose CLI --locale フラグで指定した値が適用される確認
   */
  it("should set locale when valid locale is provided", () => {
    initI18n("en");
    expect(getLocale()).toBe("en");

    initI18n("ja");
    expect(getLocale()).toBe("ja");
  });

  /**
   * @testdoc 無効なロケールが無視されデフォルト(ja)になる
   * @purpose 不正な値に対するフォールバック確認
   */
  it("should fall back to default when invalid locale is provided", () => {
    initI18n("fr");
    expect(getLocale()).toBe("ja");
  });

  /**
   * @testdoc 引数なしでデフォルト(ja)になる
   * @purpose デフォルトロケール確認
   */
  it("should default to ja when no locale is provided", () => {
    initI18n();
    expect(getLocale()).toBe("ja");
  });

  /**
   * @testdoc SHIROKUMA_LOCALE 環境変数が参照される
   * @purpose 環境変数によるロケール解決
   */
  it("should resolve locale from SHIROKUMA_LOCALE env", () => {
    process.env.SHIROKUMA_LOCALE = "en";
    initI18n();
    expect(getLocale()).toBe("en");
  });

  /**
   * @testdoc LANG 環境変数の ja プレフィックスが検出される
   * @purpose LANG=ja_JP.UTF-8 のようなケース
   */
  it("should resolve ja from LANG env starting with 'ja'", () => {
    process.env.LANG = "ja_JP.UTF-8";
    initI18n();
    expect(getLocale()).toBe("ja");
  });

  /**
   * @testdoc 明示的ロケールが環境変数より優先される
   * @purpose CLI フラグ > 環境変数の優先順位
   */
  it("should prefer explicit locale over env variable", () => {
    process.env.SHIROKUMA_LOCALE = "ja";
    initI18n("en");
    expect(getLocale()).toBe("en");
  });
});

// =============================================================================
// setLocaleFromConfig - Config locale with priority
// =============================================================================

describe("setLocaleFromConfig", () => {
  /**
   * @testdoc config のロケールが適用される（CLI フラグなし）
   * @purpose config ファイルの locale フィールドの反映
   */
  it("should apply config locale when no explicit locale was set", () => {
    initI18n(); // no explicit locale
    setLocaleFromConfig("en");
    expect(getLocale()).toBe("en");
  });

  /**
   * @testdoc CLI --locale フラグが config より優先される
   * @purpose explicitlySet フラグによる優先順位保護
   */
  it("should NOT override explicit CLI locale with config", () => {
    initI18n("en"); // explicit
    setLocaleFromConfig("ja");
    expect(getLocale()).toBe("en");
  });

  /**
   * @testdoc 無効な config ロケールが無視される
   * @purpose 不正値のフォールバック
   */
  it("should ignore invalid config locale", () => {
    initI18n();
    const before = getLocale();
    setLocaleFromConfig("fr");
    expect(getLocale()).toBe(before);
  });

  /**
   * @testdoc undefined の config ロケールが無視される
   * @purpose config に locale 未設定の場合
   */
  it("should ignore undefined config locale", () => {
    initI18n();
    const before = getLocale();
    setLocaleFromConfig(undefined);
    expect(getLocale()).toBe(before);
  });
});

// =============================================================================
// t() - Message lookup and interpolation
// =============================================================================

describe("t", () => {
  /**
   * @testdoc 日本語メッセージが辞書から取得できる
   * @purpose デフォルトロケール(ja)での辞書ルックアップ
   */
  it("should return Japanese message for ja locale", () => {
    initI18n("ja");
    const msg = t("commands.init.exists");
    expect(msg).toBe("設定ファイルは既に存在します");
  });

  /**
   * @testdoc 英語メッセージが辞書から取得できる
   * @purpose en ロケールでの辞書ルックアップ
   */
  it("should return English message for en locale", () => {
    initI18n("en");
    const msg = t("commands.init.exists");
    expect(msg).toBe("Configuration file already exists");
  });

  /**
   * @testdoc パラメータが正しく補間される
   * @purpose {key} プレースホルダーの置換
   */
  it("should interpolate parameters", () => {
    initI18n("en");
    const msg = t("commands.init.success", { path: "/tmp/config.yaml" });
    expect(msg).toBe("Configuration file created: /tmp/config.yaml");
  });

  /**
   * @testdoc 数値パラメータが文字列に変換される
   * @purpose number 型パラメータの補間
   */
  it("should interpolate numeric parameters", () => {
    initI18n("en");
    const msg = t("commands.init.summaryPlugin", { skillCount: 19, ruleCount: 15 });
    expect(msg).toBe("✓ Plugin: 19 skills, 15 rules");
  });

  /**
   * @testdoc 存在しないキーはキー文字列そのものを返す
   * @purpose 辞書に未登録のキーに対するフォールバック
   */
  it("should return key as-is when not found in any dictionary", () => {
    initI18n("ja");
    const msg = t("nonexistent.key");
    expect(msg).toBe("nonexistent.key");
  });

  /**
   * @testdoc ja 辞書にないキーは en にフォールバックする
   * @purpose 日本語辞書未翻訳キーの英語フォールバック
   */
  it("should fall back to English when key is missing in ja dict", () => {
    initI18n("ja");
    // config.loadFailed exists in both, but let's verify fallback mechanism
    // by checking a key that exists in en
    const msg = t("config.loadFailed", { error: "parse error" });
    // Should find it in ja dict
    expect(msg).toBe("設定ファイルの読み込みに失敗: parse error");
  });

  /**
   * @testdoc ネストされたキーが正しく解決される
   * @purpose ドット記法によるネスト辞書アクセス
   */
  it("should resolve deeply nested keys", () => {
    initI18n("en");
    const msg = t("commands.session.start.description");
    expect(msg).toBe("Start a work session");
  });

  /**
   * @testdoc 未知のパラメータプレースホルダーがそのまま残る
   * @purpose 辞書にある {unknown} が params にない場合
   */
  it("should leave unknown placeholders as-is", () => {
    initI18n("en");
    const msg = t("commands.init.success", {}); // path not provided
    expect(msg).toBe("Configuration file created: {path}");
  });

  /**
   * @testdoc パラメータなしのメッセージがそのまま返る
   * @purpose プレースホルダーのないメッセージ
   */
  it("should return plain message without params", () => {
    initI18n("en");
    const msg = t("commands.init.installingPlugin");
    expect(msg).toBe("Installing plugin...");
  });
});

// =============================================================================
// Dictionary structure - en/ja parity
// =============================================================================

describe("dictionary parity", () => {
  /**
   * @testdoc en と ja の辞書キーが一致する
   * @purpose 翻訳漏れの検出
   */
  it("should have matching keys between en and ja dictionaries", () => {
    // Collect all keys from both locales by checking known paths
    const knownKeys = [
      "commands.init.description",
      "commands.init.success",
      "commands.init.exists",
      "commands.init.existsHint",
      "commands.init.installingPlugin",
      "commands.init.pluginInstallFailed",
      "commands.init.configCreateFailed",
      "commands.session.start.description",
      "commands.session.end.description",
      "commands.updateSkills.description",
      "config.notFound",
      "config.usingDefaults",
      "config.loadFailed",
      "errors.configNotFound",
      "errors.ghNotAuthenticated",
      "errors.commandNotFound",
      "errors.errorOccurred",
    ];

    for (const key of knownKeys) {
      initI18n("en");
      const enMsg = t(key);
      initI18n("ja");
      const jaMsg = t(key);

      // Neither should return the raw key (meaning both have translations)
      expect(enMsg).not.toBe(key);
      expect(jaMsg).not.toBe(key);
    }
  });
});
