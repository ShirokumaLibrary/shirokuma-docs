/**
 * camelToSnake ユーティリティのテスト
 *
 * @testdoc camelCase/PascalCase 文字列を snake_case に変換する関数の動作を検証
 */
import { camelToSnake } from "../../src/utils/string-transforms.js";

describe("camelToSnake", () => {
  /**
   * @testdoc camelCase形式の文字列をsnake_case形式に正しく変換する
   */
  it("camelCase を snake_case に変換する", () => {
    expect(camelToSnake("userId")).toBe("user_id");
  });

  /**
   * @testdoc PascalCase形式の文字列をsnake_case形式に変換し先頭にアンダースコアを付けない
   */
  it("PascalCase を snake_case に変換する（先頭アンダースコアなし）", () => {
    expect(camelToSnake("UserId")).toBe("user_id");
  });

  /**
   * @testdoc 単一の小文字単語を入力した場合そのまま変換せずに返す
   */
  it("単一の小文字単語はそのまま返す", () => {
    expect(camelToSnake("id")).toBe("id");
  });

  /**
   * @testdoc 単一の大文字で始まる単語を小文字に変換して返す
   */
  it("単一の大文字単語を小文字に変換する", () => {
    expect(camelToSnake("Id")).toBe("id");
  });

  /**
   * @testdoc 全て小文字の文字列を入力した場合そのまま変換せずに返す
   */
  it("全小文字はそのまま返す", () => {
    expect(camelToSnake("username")).toBe("username");
  });

  /**
   * @testdoc 空文字列を入力した場合そのまま空文字列を返す
   */
  it("空文字列はそのまま返す", () => {
    expect(camelToSnake("")).toBe("");
  });

  /**
   * @testdoc 複数の大文字区切りを含むcamelCase文字列を正しくsnake_caseに変換する
   */
  it("複数の大文字を含む camelCase を変換する", () => {
    expect(camelToSnake("createdAt")).toBe("created_at");
  });

  /**
   * @testdoc 複数の大文字区切りを含むPascalCase文字列を正しくsnake_caseに変換する
   */
  it("複数の大文字を含む PascalCase を変換する", () => {
    expect(camelToSnake("CreatedAt")).toBe("created_at");
  });

  /**
   * @testdoc 3つ以上の単語で構成されるcamelCase文字列をsnake_caseに変換する
   */
  it("3つ以上の単語を含む camelCase を変換する", () => {
    expect(camelToSnake("myLongVariableName")).toBe("my_long_variable_name");
  });

  /**
   * @testdoc 3つ以上の単語で構成されるPascalCase文字列をsnake_caseに変換する
   */
  it("3つ以上の単語を含む PascalCase を変換する", () => {
    expect(camelToSnake("MyLongVariableName")).toBe("my_long_variable_name");
  });

  /**
   * @testdoc 連続する大文字（URLなどの略語）を個別の文字としてsnake_case変換する
   */
  it("連続する大文字（例: URL）を個別に変換する", () => {
    expect(camelToSnake("userURL")).toBe("user_u_r_l");
  });
});
