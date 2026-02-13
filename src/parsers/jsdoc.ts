/**
 * JSDoc パーサー
 *
 * TypeScript ファイルから JSDoc コメントを解析し、カスタムタグを抽出する
 */

/**
 * エラーコード定義
 */
export interface ErrorCode {
  /** エラーコード（例: NOT_FOUND） */
  code: string;
  /** エラー説明 */
  description: string;
  /** HTTPステータスコード（例: 404） */
  status: number;
}

/**
 * 認証レベル
 */
export type AuthLevel = "none" | "authenticated" | "member" | "admin";

/**
 * JSDoc 解析結果
 */
export interface JSDocInfo {
  /** 関数/変数名 */
  name: string;
  /** JSDoc コメント全体 */
  raw: string;
  /** 説明文 */
  description: string;
  /** 検出されたタグ一覧 */
  tags: string[];

  // 新規タグ
  /** 入力スキーマ名（Zod スキーマ） */
  inputSchema?: string;
  /** 出力スキーマ名（戻り値型） */
  outputSchema?: string;
  /** 認証レベル */
  authLevel?: AuthLevel;
  /** レートリミット（例: "10/hour"） */
  rateLimit?: string;
  /** エラーコード定義 */
  errorCodes?: ErrorCode[];

  // 従来のタグ（既存実装との互換性）
  /** @param タグ */
  params?: Array<{ name: string; description: string; type?: string }>;
  /** @returns タグ */
  returns?: string;
  /** @throws タグ */
  throws?: string[];
}

/**
 * JSDoc コメントを解析
 *
 * @param jsdocBlock - JSDoc コメント文字列
 * @param name - 関数/変数名
 * @returns 解析結果
 */
export function parseJSDoc(jsdocBlock: string, name: string): JSDocInfo {
  // コメント本体を抽出（/** と */ を除去）
  const cleaned = jsdocBlock.replace(/^\/\*\*\s*/, "").replace(/\s*\*\/$/, "");

  // 行ごとに分割して * を除去
  const lines = cleaned
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trimEnd());

  // 説明文を抽出（最初のタグまで）
  const description = extractDescription(lines);

  // タグを抽出
  const tags = extractTags(jsdocBlock);

  // 各タグの値を抽出
  const inputSchema = extractTagValue(jsdocBlock, "inputSchema");
  const outputSchema = extractTagValue(jsdocBlock, "outputSchema");
  const authLevel = extractAuthLevel(jsdocBlock);
  const rateLimit = extractTagValue(jsdocBlock, "rateLimit");
  const errorCodes = extractErrorCodes(jsdocBlock);

  // 従来のタグ
  const params = extractParams(jsdocBlock);
  const returns = extractTagValue(jsdocBlock, "returns");
  const throws = extractThrows(jsdocBlock);

  return {
    name,
    raw: jsdocBlock,
    description,
    tags,
    inputSchema,
    outputSchema,
    authLevel,
    rateLimit,
    errorCodes,
    params,
    returns,
    throws,
  };
}

/**
 * 説明文を抽出（最初のタグまで）
 *
 * @param lines - JSDoc の行配列
 * @returns 説明文
 */
function extractDescription(lines: string[]): string {
  const descriptionLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("@")) {
      break; // 最初のタグで終了
    }
    descriptionLines.push(line);
  }

  return descriptionLines.join("\n").trim();
}

/**
 * タグ一覧を抽出
 *
 * @param jsdocBlock - JSDoc コメント文字列
 * @returns タグ配列（重複なし）
 */
export function extractTags(jsdocBlock: string): string[] {
  const tags: string[] = [];
  const tagRegex = /@(\w+)/g;
  let match;

  while ((match = tagRegex.exec(jsdocBlock)) !== null) {
    tags.push(`@${match[1]}`);
  }

  return [...new Set(tags)];
}

/**
 * タグの値を抽出（単一行）
 *
 * @param jsdocBlock - JSDoc コメント文字列
 * @param tagName - タグ名（@ なし）
 * @returns タグの値（存在しない場合は undefined）
 */
function extractTagValue(
  jsdocBlock: string,
  tagName: string
): string | undefined {
  const regex = new RegExp(`@${tagName}\\s+(.+?)(?=\\n|\\*\\/|$)`, "s");
  const match = regex.exec(jsdocBlock);

  if (!match) {
    return undefined;
  }

  // 複数行にまたがる場合、* を除去してトリム
  return match[1]
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s?/, "").trim())
    .filter((line) => line.length > 0)
    .join(" ")
    .trim();
}

/**
 * 認証レベルを抽出
 *
 * @param jsdocBlock - JSDoc コメント文字列
 * @returns 認証レベル（存在しない場合は undefined）
 */
function extractAuthLevel(jsdocBlock: string): AuthLevel | undefined {
  const value = extractTagValue(jsdocBlock, "authLevel");

  if (!value) {
    return undefined;
  }

  const validLevels: AuthLevel[] = ["none", "authenticated", "member", "admin"];
  const normalized = value.toLowerCase().trim() as AuthLevel;

  if (validLevels.includes(normalized)) {
    return normalized;
  }

  // 不正な値の場合は undefined
  return undefined;
}

/**
 * @errorCodes タグを解析
 *
 * 形式:
 * @errorCodes
 *   - NOT_FOUND: エンティティが存在しない (404)
 *   - VALIDATION_ERROR: バリデーション失敗 (400)
 *
 * @param jsdocBlock - JSDoc コメント文字列
 * @returns エラーコード配列
 */
function extractErrorCodes(jsdocBlock: string): ErrorCode[] | undefined {
  // @errorCodes タグの後の行を抽出（次のタグまたはコメント終了まで）
  const regex = /@errorCodes\s*([\s\S]*?)(?=@\w+|\*\/)/;
  const match = regex.exec(jsdocBlock);

  if (!match) {
    return undefined;
  }

  const errorCodesText = match[1];
  const errorCodes: ErrorCode[] = [];

  // 各行を解析: "  - CODE: Description (status)"
  // * を除去してから解析
  const lines = errorCodesText.split("\n");
  const lineRegex = /^\s*\*?\s*-\s*([A-Z_]+):\s*(.+?)\s*\((\d{3})\)\s*$/;

  for (const line of lines) {
    const lineMatch = lineRegex.exec(line);
    if (lineMatch) {
      const code = lineMatch[1];
      const description = lineMatch[2].trim();
      const status = parseInt(lineMatch[3], 10);

      errorCodes.push({ code, description, status });
    }
  }

  return errorCodes.length > 0 ? errorCodes : undefined;
}

/**
 * @param タグを抽出
 *
 * @param jsdocBlock - JSDoc コメント文字列
 * @returns パラメータ配列
 */
function extractParams(
  jsdocBlock: string
): Array<{ name: string; description: string; type?: string }> | undefined {
  const params: Array<{ name: string; description: string; type?: string }> =
    [];

  // 行ごとに分割して @param を探す
  const lines = jsdocBlock.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const paramMatch = /@param\s+(?:\{([^}]+)\}\s+)?(\w+)\s*-?\s*(.*)/.exec(line);

    if (paramMatch) {
      const type = paramMatch[1]?.trim();
      const name = paramMatch[2].trim();
      let description = paramMatch[3].trim();

      // 次の行が @タグでない場合は継続
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].replace(/^\s*\*\s?/, "").trim();
        if (nextLine.startsWith("@") || nextLine === "" || nextLine === "/") {
          break;
        }
        description += " " + nextLine;
        j++;
      }

      params.push({ name, description: description.trim(), type });
    }
  }

  return params.length > 0 ? params : undefined;
}

/**
 * @throws タグを抽出
 *
 * @param jsdocBlock - JSDoc コメント文字列
 * @returns エラー説明配列
 */
function extractThrows(jsdocBlock: string): string[] | undefined {
  const throws: string[] = [];

  // 行ごとに分割して @throws を探す
  const lines = jsdocBlock.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const throwsMatch = /@throws\s+(?:\{[^}]+\}\s+)?(.*)/.exec(line);

    if (throwsMatch) {
      let description = throwsMatch[1].trim();

      // 次の行が @タグでない場合は継続
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j].replace(/^\s*\*\s?/, "").trim();
        if (nextLine.startsWith("@") || nextLine === "" || nextLine === "/") {
          break;
        }
        description += " " + nextLine;
        j++;
      }

      throws.push(description.trim());
    }
  }

  return throws.length > 0 ? throws : undefined;
}

/**
 * ファイル全体から JSDoc を抽出
 *
 * @param content - ファイルの内容
 * @returns JSDoc 情報の配列
 */
export function extractJSDocsFromFile(content: string): JSDocInfo[] {
  const results: JSDocInfo[] = [];

  // export async function または export function を検出
  const functionRegex =
    /(?:(\/\*\*[\s\S]*?\*\/)\s*)?export\s+(?:async\s+)?function\s+(\w+)\s*\(/g;

  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const jsdocBlock = match[1];
    const functionName = match[2];

    if (jsdocBlock) {
      const jsDocInfo = parseJSDoc(jsdocBlock, functionName);
      results.push(jsDocInfo);
    }
  }

  return results;
}
