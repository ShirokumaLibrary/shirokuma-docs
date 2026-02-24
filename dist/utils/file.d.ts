/**
 * ファイル操作ユーティリティ
 */
/**
 * ディレクトリを作成 (再帰的)
 */
export declare function ensureDir(dirPath: string): void;
/**
 * ファイルを書き込み (ディレクトリも作成)
 */
export declare function writeFile(filePath: string, content: string): void;
/**
 * ファイルを読み込み
 */
export declare function readFile(filePath: string): string | null;
/**
 * ファイル一覧を取得 (glob パターン)
 */
export declare function findFiles(basePath: string, pattern: string, options?: {
    ignore?: string[];
}): Promise<string[]>;
/**
 * ディレクトリ内のファイル一覧を取得 (再帰的)
 */
export declare function listFiles(dirPath: string, options?: {
    extensions?: string[];
    recursive?: boolean;
    ignore?: string[];
}): string[];
/**
 * ファイルの相対パスを取得
 */
export declare function getRelativePath(from: string, to: string): string;
/**
 * ファイルが存在するか確認
 */
export declare function fileExists(filePath: string): boolean;
/**
 * ディレクトリが存在するか確認
 */
export declare function dirExists(dirPath: string): boolean;
/**
 * ファイルの最終更新日時を取得
 */
export declare function getFileMtime(filePath: string): Date | null;
//# sourceMappingURL=file.d.ts.map