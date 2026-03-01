/**
 * show command - 番号指定による Issue/PR/Discussion 自動判別取得
 *
 * GraphQL の単一クエリで issue, pullRequest, discussion を同時にリクエストし、
 * レスポンスのどのフィールドにデータがあるかで種別を判別する。
 * 判別後は既存の内部関数に委任して同等の出力を得る。
 */
import type { OutputFormat } from "../utils/formatters.js";
export interface ShowOptions {
    verbose?: boolean;
    format?: OutputFormat;
    public?: boolean;
    repo?: string;
}
/** 種別判別結果 */
export interface DetectResult {
    type: "issue" | "pr" | "discussion";
    data: Record<string, unknown>;
    /** 異なる番号空間で同一番号が見つかった場合の重複情報 */
    ambiguous?: {
        type: "issue" | "pr" | "discussion";
        data: Record<string, unknown>;
    };
}
interface DetectInput {
    issue: Record<string, unknown> | null;
    pullRequest: Record<string, unknown> | null;
    discussion: Record<string, unknown> | null;
}
/**
 * GraphQL レスポンスから種別を判別する。
 * 優先順: PR > Issue > Discussion
 *
 * - Issue と PR は同一番号空間（GitHub 上では排他的だが、GraphQL では両方返る場合に備える）
 * - Discussion は別番号空間のため、Issue/PR がある場合はそちらを優先
 * - DetectResult.type は短縮形（"pr"）を使用。DetectInput のキー名（"pullRequest"）とは異なる
 */
export declare function detectItemType(input: DetectInput): DetectResult | null;
export declare function showCommand(numberStr: string | undefined, options: ShowOptions): Promise<void>;
export {};
//# sourceMappingURL=show.d.ts.map