/**
 * Next.js ベースのポータルビルダー
 *
 * 既存のJSON生成コマンドと連携し、Next.js + shadcn/ui で
 * 静的HTMLポータルを生成する
 */
/**
 * ポータル出力形式
 */
type PortalFormat = "card" | "document";
interface NextjsPortalOptions {
    project: string;
    config: string;
    output?: string;
    format?: PortalFormat;
    verbose?: boolean;
}
/**
 * Next.js ポータルをビルド
 */
export declare function buildNextjsPortal(options: NextjsPortalOptions): Promise<void>;
export {};
//# sourceMappingURL=portal-nextjs.d.ts.map