/**
 * sanitize ユーティリティのテスト
 *
 * @testdoc 入力サニタイズ関数群の動作を検証
 */
import { stripDoubleQuotes, escapeRegExp, safeRegExp } from "../../src/utils/sanitize.js";

describe("sanitize utilities", () => {
  // ===========================================================================
  // stripDoubleQuotes
  // ===========================================================================

  describe("stripDoubleQuotes", () => {
    /**
     * @testdoc ダブルクォートを除去する
     * @purpose GitHub search クエリのクォート内埋め込みで構文が壊れないことを確認
     */
    it("should remove double quotes from string", () => {
      expect(stripDoubleQuotes('hello"world')).toBe("helloworld");
      expect(stripDoubleQuotes('"quoted"')).toBe("quoted");
      expect(stripDoubleQuotes('a"b"c"d')).toBe("abcd");
    });

    it("should return unchanged string when no quotes", () => {
      expect(stripDoubleQuotes("hello")).toBe("hello");
      expect(stripDoubleQuotes("")).toBe("");
    });

    it("should handle only double quotes", () => {
      expect(stripDoubleQuotes('"""')).toBe("");
    });
  });

  // ===========================================================================
  // escapeRegExp
  // ===========================================================================

  describe("escapeRegExp", () => {
    /**
     * @testdoc 正規表現特殊文字をエスケープする
     * @purpose new RegExp() に外部入力を渡す際のインジェクション防止を確認
     */
    it("should escape regex special characters", () => {
      expect(escapeRegExp("hello.world")).toBe("hello\\.world");
      expect(escapeRegExp("a+b*c?d")).toBe("a\\+b\\*c\\?d");
      expect(escapeRegExp("(group)")).toBe("\\(group\\)");
      expect(escapeRegExp("[class]")).toBe("\\[class\\]");
      expect(escapeRegExp("a{1,2}")).toBe("a\\{1,2\\}");
      expect(escapeRegExp("a|b")).toBe("a\\|b");
      expect(escapeRegExp("^start$end")).toBe("\\^start\\$end");
      expect(escapeRegExp("back\\slash")).toBe("back\\\\slash");
    });

    it("should return unchanged string when no special characters", () => {
      expect(escapeRegExp("hello")).toBe("hello");
      expect(escapeRegExp("")).toBe("");
    });

    it("should produce valid regex pattern", () => {
      const input = "file.name(1).test[2]";
      const escaped = escapeRegExp(input);
      const regex = new RegExp(escaped);
      expect(regex.test(input)).toBe(true);
      expect(regex.test("fileXname(1)Xtest[2]")).toBe(false);
    });
  });

  // ===========================================================================
  // safeRegExp
  // ===========================================================================

  describe("safeRegExp", () => {
    /**
     * @testdoc 有効なパターンで RegExp を返す
     * @purpose 設定ファイルの正規表現パターンが正常に構築されることを確認
     */
    it("should return RegExp for valid pattern", () => {
      const result = safeRegExp("^hello.*world$");
      expect(result).toBeInstanceOf(RegExp);
      expect(result!.test("hello beautiful world")).toBe(true);
    });

    it("should support flags", () => {
      const result = safeRegExp("hello", "gi");
      expect(result).toBeInstanceOf(RegExp);
      expect(result!.flags).toContain("g");
      expect(result!.flags).toContain("i");
    });

    /**
     * @testdoc 無効なパターンで null を返す
     * @purpose 設定ファイルの不正なパターンでクラッシュしないことを確認
     */
    it("should return null for invalid pattern", () => {
      expect(safeRegExp("[invalid")).toBeNull();
      expect(safeRegExp("(unclosed")).toBeNull();
      expect(safeRegExp("*")).toBeNull();
    });

    it("should return null for invalid flags", () => {
      expect(safeRegExp("valid", "xyz")).toBeNull();
    });
  });
});
