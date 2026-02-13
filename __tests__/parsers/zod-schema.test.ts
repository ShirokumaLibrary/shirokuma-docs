/**
 * Zod Schema Parser Tests
 *
 * Tests for parsing Zod schema definitions from TypeScript source code.
 *
 * @testdoc TypeScriptソースコードからZodスキーマ定義を解析する
 */

import {
  parseZodSchema,
  findSchemaInFiles,
  ZodParameter,
  ParsedZodSchema,
} from "../../src/parsers/zod-schema.js";

describe("parseZodSchema", () => {
  /**
   * @testdoc 基本的なz.objectスキーマを解析できる
   * @purpose 最小限のスキーマ解析
   */
  it("should parse basic z.object schema", () => {
    const content = `
const TestSchema = z.object({
  name: z.string(),
  age: z.number()
});
`;
    const result = parseZodSchema(content, "TestSchema");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("TestSchema");
    expect(result!.parameters).toHaveLength(2);
    expect(result!.parameters[0].name).toBe("name");
    expect(result!.parameters[0].type).toBe("string");
    expect(result!.parameters[1].name).toBe("age");
    expect(result!.parameters[1].type).toBe("number");
  });

  /**
   * @testdoc 存在しないスキーマ名はnullを返す
   * @purpose スキーマが見つからない場合のハンドリング
   */
  it("should return null when schema name is not found", () => {
    const content = `
const TestSchema = z.object({
  name: z.string()
});
`;
    const result = parseZodSchema(content, "NonExistentSchema");
    expect(result).toBeNull();
  });

  /**
   * @testdoc z.string()のバリデーションメソッドを解析できる
   * @purpose string型の詳細情報抽出
   */
  it("should parse z.string() with validation methods", () => {
    const content = `
const CreateEntitySchema = z.object({
  projectId: z.string()
    .uuid("Invalid project ID")
    .describe("プロジェクトのUUID"),
  title: z.string()
    .min(1, "Title is required")
    .max(200, "Too long")
    .describe("エンティティのタイトル")
});
`;
    const result = parseZodSchema(content, "CreateEntitySchema");
    expect(result).not.toBeNull();
    expect(result!.parameters).toHaveLength(2);

    // projectId field
    const projectId = result!.parameters[0];
    expect(projectId.name).toBe("projectId");
    expect(projectId.type).toBe("string");
    expect(projectId.format).toBe("uuid");
    expect(projectId.description).toBe("プロジェクトのUUID");
    expect(projectId.validation?.message).toBe("Invalid project ID");
    expect(projectId.required).toBe(true);

    // title field
    const title = result!.parameters[1];
    expect(title.name).toBe("title");
    expect(title.type).toBe("string");
    expect(title.minLength).toBe(1);
    expect(title.maxLength).toBe(200);
    expect(title.description).toBe("エンティティのタイトル");
    expect(title.validation?.message).toBe("Title is required");
  });

  /**
   * @testdoc email()とurl()フォーマットを検出できる
   * @purpose 各種フォーマット検証メソッドの解析
   */
  it("should detect email() and url() formats", () => {
    const content = `
const ContactSchema = z.object({
  email: z.string().email("Invalid email"),
  website: z.string().url("Invalid URL")
});
`;
    const result = parseZodSchema(content, "ContactSchema");
    expect(result).not.toBeNull();
    expect(result!.parameters[0].format).toBe("email");
    expect(result!.parameters[1].format).toBe("url");
  });

  /**
   * @testdoc z.number()のmin/maxを解析できる
   * @purpose number型の制約情報抽出
   */
  it("should parse z.number() with min/max", () => {
    const content = `
const RangeSchema = z.object({
  count: z.number().min(0).max(100),
  offset: z.number().min(-10)
});
`;
    const result = parseZodSchema(content, "RangeSchema");
    expect(result).not.toBeNull();

    const count = result!.parameters[0];
    expect(count.type).toBe("number");
    expect(count.min).toBe(0);
    expect(count.max).toBe(100);

    const offset = result!.parameters[1];
    expect(offset.min).toBe(-10);
  });

  /**
   * @testdoc z.boolean()を解析できる
   * @purpose boolean型の解析
   */
  it("should parse z.boolean()", () => {
    const content = `
const FeatureSchema = z.object({
  enabled: z.boolean()
});
`;
    const result = parseZodSchema(content, "FeatureSchema");
    expect(result).not.toBeNull();
    expect(result!.parameters[0].type).toBe("boolean");
  });

  /**
   * @testdoc z.enum()と列挙値を解析できる
   * @purpose enum型の値一覧抽出
   */
  it("should parse z.enum() with values", () => {
    const content = `
const StatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"])
    .describe("現在のステータス")
});
`;
    const result = parseZodSchema(content, "StatusSchema");
    expect(result).not.toBeNull();

    const status = result!.parameters[0];
    expect(status.type).toBe("enum");
    expect(status.enumValues).toEqual([
      "open",
      "in_progress",
      "resolved",
      "closed",
    ]);
    expect(status.description).toBe("現在のステータス");
  });

  /**
   * @testdoc .optional()と.nullable()をrequired: falseに変換できる
   * @purpose オプショナルフィールドの判定
   */
  it("should mark optional() and nullable() fields as not required", () => {
    const content = `
const OptionalSchema = z.object({
  required: z.string(),
  optional: z.string().optional(),
  nullable: z.string().nullable()
});
`;
    const result = parseZodSchema(content, "OptionalSchema");
    expect(result).not.toBeNull();
    expect(result!.parameters[0].required).toBe(true);
    expect(result!.parameters[1].required).toBe(false);
    expect(result!.parameters[2].required).toBe(false);
  });

  /**
   * @testdoc .default()でデフォルト値を抽出できる
   * @purpose デフォルト値の解析
   */
  it("should extract default values", () => {
    const content = `
const DefaultSchema = z.object({
  status: z.enum(["open", "closed"]).default("open"),
  count: z.number().default(0),
  enabled: z.boolean().default(true),
  name: z.string().default("Untitled")
});
`;
    const result = parseZodSchema(content, "DefaultSchema");
    expect(result).not.toBeNull();
    expect(result!.parameters[0].default).toBe("open");
    expect(result!.parameters[1].default).toBe(0);
    expect(result!.parameters[2].default).toBe(true);
    expect(result!.parameters[3].default).toBe("Untitled");
  });

  /**
   * @testdoc 複雑なスキーマを正しく解析できる
   * @purpose 実際のServer Actionスキーマの解析
   */
  it("should parse complex real-world schema", () => {
    const content = `
const CreateEntitySchema = z.object({
  projectId: z.string()
    .uuid("Invalid project ID")
    .describe("プロジェクトのUUID"),

  title: z.string()
    .min(1, "Title is required")
    .max(200, "Too long")
    .describe("エンティティのタイトル"),

  status: z.enum(["open", "in_progress", "resolved", "closed"])
    .default("open")
    .describe("現在のステータス"),

  priority: z.enum(["low", "medium", "high"])
    .nullable()
    .optional()
});
`;
    const result = parseZodSchema(content, "CreateEntitySchema");
    expect(result).not.toBeNull();
    expect(result!.parameters).toHaveLength(4);

    // Verify all fields are parsed correctly
    expect(result!.parameters[0].name).toBe("projectId");
    expect(result!.parameters[1].name).toBe("title");
    expect(result!.parameters[2].name).toBe("status");
    expect(result!.parameters[3].name).toBe("priority");

    // Verify priority is optional with nullable
    const priority = result!.parameters[3];
    expect(priority.type).toBe("enum");
    expect(priority.required).toBe(false);
    expect(priority.enumValues).toEqual(["low", "medium", "high"]);
  });

  /**
   * @testdoc z.array()とz.object()を検出できる
   * @purpose ネストされた型の基本検出
   */
  it("should detect z.array() and z.object() types", () => {
    const content = `
const NestedSchema = z.object({
  tags: z.array(z.string()),
  metadata: z.object({
    key: z.string()
  })
});
`;
    const result = parseZodSchema(content, "NestedSchema");
    expect(result).not.toBeNull();
    expect(result!.parameters[0].type).toBe("array");
    expect(result!.parameters[1].type).toBe("object");
  });
});

describe("findSchemaInFiles", () => {
  /**
   * @testdoc 複数ファイルから指定スキーマを検索できる
   * @purpose ファイル横断的なスキーマ検索
   */
  it("should find schema across multiple files", () => {
    const files = [
      {
        path: "lib/validations/entities.ts",
        content: `
const CreateEntitySchema = z.object({
  title: z.string()
});
`,
      },
      {
        path: "lib/validations/projects.ts",
        content: `
const CreateProjectSchema = z.object({
  name: z.string()
});
`,
      },
    ];

    const result = findSchemaInFiles(files, "CreateProjectSchema");
    expect(result).not.toBeNull();
    expect(result!.name).toBe("CreateProjectSchema");
    expect(result!.parameters[0].name).toBe("name");
  });

  /**
   * @testdoc 見つからないスキーマはnullを返す
   * @purpose ファイル検索失敗時のハンドリング
   */
  it("should return null when schema is not found in any file", () => {
    const files = [
      {
        path: "lib/validations/entities.ts",
        content: `
const CreateEntitySchema = z.object({
  title: z.string()
});
`,
      },
    ];

    const result = findSchemaInFiles(files, "NonExistentSchema");
    expect(result).toBeNull();
  });

  /**
   * @testdoc 最初に見つかったスキーマを返す
   * @purpose 複数ファイルに同名スキーマがある場合
   */
  it("should return the first matching schema", () => {
    const files = [
      {
        path: "lib/validations/entities.ts",
        content: `
const TestSchema = z.object({
  first: z.string()
});
`,
      },
      {
        path: "lib/validations/projects.ts",
        content: `
const TestSchema = z.object({
  second: z.string()
});
`,
      },
    ];

    const result = findSchemaInFiles(files, "TestSchema");
    expect(result).not.toBeNull();
    expect(result!.parameters[0].name).toBe("first");
  });
});
