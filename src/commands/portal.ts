/**
 * portal コマンド - ドキュメントポータル HTML 生成
 *
 * Next.js + shadcn/ui ベースのサイドバー付きポータルを生成
 */

import { createLogger } from "../utils/logger.js";
import { buildNextjsPortal } from "./portal-nextjs.js";

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
export async function portalCommand(options: PortalOptions): Promise<void> {
  const logger = createLogger(options.verbose);

  logger.info("Next.js + shadcn/ui ポータルを生成");
  await buildNextjsPortal(options);
}
