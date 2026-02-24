/**
 * portal コマンド - ドキュメントポータル HTML 生成
 *
 * Next.js + shadcn/ui ベースのサイドバー付きポータルを生成
 */
import { createLogger } from "../utils/logger.js";
import { buildNextjsPortal } from "./portal-nextjs.js";
/**
 * portal コマンドハンドラ
 */
export async function portalCommand(options) {
    const logger = createLogger(options.verbose);
    logger.info("Next.js + shadcn/ui ポータルを生成");
    await buildNextjsPortal(options);
}
//# sourceMappingURL=portal.js.map