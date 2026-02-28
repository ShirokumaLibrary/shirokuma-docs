import { camelToSnake } from "../../src/utils/string-transforms.js";

describe("camelToSnake", () => {
  it("camelCase を snake_case に変換する", () => {
    expect(camelToSnake("userId")).toBe("user_id");
  });

  it("PascalCase を snake_case に変換する（先頭アンダースコアなし）", () => {
    expect(camelToSnake("UserId")).toBe("user_id");
  });

  it("単一の小文字単語はそのまま返す", () => {
    expect(camelToSnake("id")).toBe("id");
  });

  it("単一の大文字単語を小文字に変換する", () => {
    expect(camelToSnake("Id")).toBe("id");
  });

  it("全小文字はそのまま返す", () => {
    expect(camelToSnake("username")).toBe("username");
  });

  it("空文字列はそのまま返す", () => {
    expect(camelToSnake("")).toBe("");
  });

  it("複数の大文字を含む camelCase を変換する", () => {
    expect(camelToSnake("createdAt")).toBe("created_at");
  });

  it("複数の大文字を含む PascalCase を変換する", () => {
    expect(camelToSnake("CreatedAt")).toBe("created_at");
  });

  it("3つ以上の単語を含む camelCase を変換する", () => {
    expect(camelToSnake("myLongVariableName")).toBe("my_long_variable_name");
  });

  it("3つ以上の単語を含む PascalCase を変換する", () => {
    expect(camelToSnake("MyLongVariableName")).toBe("my_long_variable_name");
  });

  it("連続する大文字（例: URL）を個別に変換する", () => {
    expect(camelToSnake("userURL")).toBe("user_u_r_l");
  });
});
