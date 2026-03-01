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

    /**
     * @testdoc ダブルクォートを含まない文字列はそのまま変更せずに返す
     */
    it("should return unchanged string when no quotes", () => {
      expect(stripDoubleQuotes("hello")).toBe("hello");
      expect(stripDoubleQuotes("")).toBe("");
    });

    /**
     * @testdoc ダブルクォートのみで構成される文字列を空文字列に変換する
     */
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

    /**
     * @testdoc 正規表現の特殊文字を含まない文字列はそのまま変更せずに返す
     */
    it("should return unchanged string when no special characters", () => {
      expect(escapeRegExp("hello")).toBe("hello");
      expect(escapeRegExp("")).toBe("");
    });

    /**
     * @testdoc エスケープ済みの文字列がRegExpコンストラクタで有効なパターンとして機能する
     */
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

    /**
     * @testdoc フラグ引数を指定した場合にRegExpオブジェクトに正しくフラグが設定される
     */
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

    /**
     * @testdoc 無効なフラグ文字列を指定した場合にnullを返しクラッシュしない
     */
    it("should return null for invalid flags", () => {
      expect(safeRegExp("valid", "xyz")).toBeNull();
    });
  });
});
