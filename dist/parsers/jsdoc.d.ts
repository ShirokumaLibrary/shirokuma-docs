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
    /** @param タグ */
    params?: Array<{
        name: string;
        description: string;
        type?: string;
    }>;
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
export declare function parseJSDoc(jsdocBlock: string, name: string): JSDocInfo;
/**
 * タグ一覧を抽出
 *
 * @param jsdocBlock - JSDoc コメント文字列
 * @returns タグ配列（重複なし）
 */
export declare function extractTags(jsdocBlock: string): string[];
/**
 * ファイル全体から JSDoc を抽出
 *
 * @param content - ファイルの内容
 * @returns JSDoc 情報の配列
 */
export declare function extractJSDocsFromFile(content: string): JSDocInfo[];
//# sourceMappingURL=jsdoc.d.ts.map