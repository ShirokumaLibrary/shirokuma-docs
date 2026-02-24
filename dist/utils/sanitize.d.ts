/**
 * sanitize - 入力サニタイズユーティリティ
 *
 * 外部入力を安全に扱うための共通関数群。
 * GitHub search クエリ構築、正規表現パターン構築で使用。
 */
/**
 * ダブルクォートを除去
 *
 * GitHub search の `category:"..."` 等、クォート内に埋め込む値から
 * ダブルクォートを除去し、構文破壊を防ぐ。
 */
export declare function stripDoubleQuotes(str: string): string;
/**
 * 正規表現の特殊文字をエスケープ
 *
 * 外部入力を `new RegExp()` のパターンに埋め込む際に使用。
 */
export declare function escapeRegExp(str: string): string;
/**
 * 安全に RegExp を構築
 *
 * 設定ファイル等から意図的に正規表現パターンを受け取る場合に使用。
 * 無効なパターンの場合は null を返す。
 */
export declare function safeRegExp(pattern: string, flags?: string): RegExp | null;
//# sourceMappingURL=sanitize.d.ts.map