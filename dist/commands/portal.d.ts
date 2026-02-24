/**
 * portal コマンド - ドキュメントポータル HTML 生成
 *
 * Next.js + shadcn/ui ベースのサイドバー付きポータルを生成
 */
/**
 * ポータル出力形式
 * - "card": カード形式（デフォルト・現在の形式）
 * - "document": ドキュメント形式（テーブル・アコーディオン）
 */
export type PortalFormat = "card" | "document";
interface PortalOptions {
    project: string;
    config: string;
    output?: string;
    format?: PortalFormat;
    verbose?: boolean;
}
/**
 * portal コマンドハンドラ
 */
export declare function portalCommand(options: PortalOptions): Promise<void>;
export {};
//# sourceMappingURL=portal.d.ts.map