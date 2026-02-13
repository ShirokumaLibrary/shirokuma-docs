/**
 * ポータル出力形式ユーティリティ
 *
 * PORTAL_FORMAT 環境変数からポータルの出力形式を取得
 */

/**
 * ポータル出力形式
 * - "card": カード形式（デフォルト・視覚的に分かりやすい）
 * - "document": ドキュメント形式（テーブル・アコーディオン、情報密度が高い）
 */
export type PortalFormat = "card" | "document";

/**
 * ポータルの出力形式を取得
 *
 * ビルド時に PORTAL_FORMAT 環境変数から読み取り、
 * 静的生成時にページに埋め込まれる
 */
export function getPortalFormat(): PortalFormat {
  const format = process.env.PORTAL_FORMAT;

  if (format === "document") {
    return "document";
  }

  // デフォルトは card
  return "card";
}

/**
 * ドキュメント形式かどうかを判定
 */
export function isDocumentFormat(): boolean {
  return getPortalFormat() === "document";
}

/**
 * カード形式かどうかを判定
 */
export function isCardFormat(): boolean {
  return getPortalFormat() === "card";
}
