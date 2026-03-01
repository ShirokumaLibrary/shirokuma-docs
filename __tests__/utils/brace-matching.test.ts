/**
 * brace-matching ユーティリティのテスト
 *
 * @testdoc 波括弧のマッチングとカウント関数の動作を検証（文字列・コメント内の波括弧除外を含む）
 */
import { findMatchingBrace, countBraces } from "../../src/utils/brace-matching.js";

describe("findMatchingBrace", () => {
  /**
   * @testdoc 単純な波括弧ペアに対して正しい閉じ位置のインデックスを返す
   */
  it("単純な波括弧ペアの閉じ位置を返す", () => {
    expect(findMatchingBrace("{}", 0)).toBe(1);
  });

  /**
   * @testdoc ネストした波括弧に対して最外の閉じ位置のインデックスを返す
   */
  it("ネストした波括弧の閉じ位置を返す", () => {
    expect(findMatchingBrace("{ { } }", 0)).toBe(6);
  });

  /**
   * @testdoc 指定位置が開き波括弧でない場合にnullを返す
   */
  it("開き波括弧でない位置に対して null を返す", () => {
    expect(findMatchingBrace("abc", 0)).toBeNull();
  });

  /**
   * @testdoc 対応する閉じ波括弧が存在しない場合にnullを返す
   */
  it("対応する閉じ波括弧がない場合 null を返す", () => {
    expect(findMatchingBrace("{ {", 0)).toBeNull();
  });

  /**
   * @testdoc ダブルクォート文字列リテラル内の波括弧をマッチング対象から除外する
   */
  it("文字列リテラル内の波括弧を無視する（ダブルクォート）", () => {
    const src = '{ "}" }';
    expect(findMatchingBrace(src, 0)).toBe(6);
  });

  /**
   * @testdoc シングルクォート文字列リテラル内の波括弧をマッチング対象から除外する
   */
  it("文字列リテラル内の波括弧を無視する（シングルクォート）", () => {
    const src = "{ '}' }";
    expect(findMatchingBrace(src, 0)).toBe(6);
  });

  /**
   * @testdoc バッククォート文字列リテラル内の波括弧をマッチング対象から除外する
   */
  it("文字列リテラル内の波括弧を無視する（バッククォート）", () => {
    const src = "{ `}` }";
    expect(findMatchingBrace(src, 0)).toBe(6);
  });

  /**
   * @testdoc エスケープされた引用符を含む文字列リテラル内の波括弧を正しく無視する
   */
  it("エスケープされた引用符を正しく処理する", () => {
    const src = '{ "\\"}\\""  }';
    expect(findMatchingBrace(src, 0)).toBe(src.length - 1);
  });

  /**
   * @testdoc 行コメント（//）内の波括弧をマッチング対象から除外する
   */
  it("行コメント内の波括弧を無視する", () => {
    const src = "{\n  // { comment }\n}";
    expect(findMatchingBrace(src, 0)).toBe(src.length - 1);
  });

  /**
   * @testdoc ブロックコメント内の波括弧をマッチング対象から除外する
   */
  it("ブロックコメント内の波括弧を無視する", () => {
    const src = "{\n  /* { block } */\n}";
    expect(findMatchingBrace(src, 0)).toBe(src.length - 1);
  });

  /**
   * @testdoc Drizzleスキーマのデフォルト値に含まれる文字列内の波括弧を正しく無視する
   */
  it("Drizzle スキーマの文字列デフォルト値を正しく処理する", () => {
    const src = `{
  description: varchar("col").default("{invalid}"),
  name: varchar("name"),
}`;
    expect(findMatchingBrace(src, 0)).toBe(src.length - 1);
  });

  /**
   * @testdoc ダブルクォート・シングルクォート・バッククォートが混在する場合に正しく処理する
   */
  it("複数の文字列リテラルが混在するケースを処理する", () => {
    const src = `{
  a: "{ }",
  b: '{ }',
  c: \`{ }\`,
}`;
    expect(findMatchingBrace(src, 0)).toBe(src.length - 1);
  });

  /**
   * @testdoc 途中の開き波括弧の位置を指定して内側のブロックの閉じ位置を検索できる
   */
  it("途中の開き波括弧から検索できる", () => {
    const src = "outer { inner { } }";
    expect(findMatchingBrace(src, 6)).toBe(18);
    expect(findMatchingBrace(src, 14)).toBe(16);
  });

  /**
   * @testdoc コメントと文字列リテラルが混在する複雑なソースコードで正しくマッチングする
   */
  it("コメントと文字列が混在する複雑なケースを処理する", () => {
    const src = `{
  // const x = "{"
  const y = "}" // { ignore }
  /* { block
     comment } */
  const z = \`template { }\`
}`;
    expect(findMatchingBrace(src, 0)).toBe(src.length - 1);
  });
});

describe("countBraces", () => {
  /**
   * @testdoc 単一の開き波括弧に対してカウント1を返す
   */
  it("単一の開き波括弧をカウントする", () => {
    expect(countBraces("{")).toBe(1);
  });

  /**
   * @testdoc 開き波括弧と閉じ波括弧が均衡している場合にカウント0を返す
   */
  it("バランスした波括弧で 0 を返す", () => {
    expect(countBraces("{ }")).toBe(0);
  });

  /**
   * @testdoc ネストした波括弧のバランスを正しくカウントして未閉じ数を返す
   */
  it("ネストした波括弧をカウントする", () => {
    expect(countBraces("{ { } }")).toBe(0);
    expect(countBraces("{ {")).toBe(2);
  });

  /**
   * @testdoc ダブルクォート文字列リテラル内の波括弧をカウント対象から除外する
   */
  it("文字列リテラル内の波括弧を無視する（ダブルクォート）", () => {
    expect(countBraces('const x = "{ }"')).toBe(0);
  });

  /**
   * @testdoc シングルクォート文字列リテラル内の波括弧をカウント対象から除外する
   */
  it("文字列リテラル内の波括弧を無視する（シングルクォート）", () => {
    expect(countBraces("const x = '{ }'")).toBe(0);
  });

  /**
   * @testdoc バッククォート文字列リテラル内の波括弧をカウント対象から除外する
   */
  it("文字列リテラル内の波括弧を無視する（バッククォート）", () => {
    expect(countBraces("const x = `{ }`")).toBe(0);
  });

  /**
   * @testdoc 空文字列を入力した場合にカウント0を返す
   */
  it("空文字列で 0 を返す", () => {
    expect(countBraces("")).toBe(0);
  });

  /**
   * @testdoc エスケープされた引用符を含む文字列内の波括弧を正しく除外してカウントする
   */
  it("エスケープされた文字を正しく処理する", () => {
    expect(countBraces('const x = "\\"{\\""')).toBe(0);
  });

  /**
   * @testdoc 行コメント（//）内の波括弧をカウント対象から除外する
   */
  it("行コメント内の波括弧を無視する", () => {
    expect(countBraces("const x = 1; // { comment }")).toBe(0);
  });

  /**
   * @testdoc 行コメント前のコード内の波括弧はカウント対象として正しく計上する
   */
  it("行コメント前のコードの波括弧はカウントする", () => {
    expect(countBraces("if (true) { // open")).toBe(1);
  });

  /**
   * @testdoc Drizzleのデフォルト値パターンの文字列内波括弧をカウント対象から除外する
   */
  it("Drizzle のデフォルト値パターンを正しく処理する", () => {
    expect(countBraces('  description: varchar("col").default("{invalid}"),')).toBe(0);
  });
});
