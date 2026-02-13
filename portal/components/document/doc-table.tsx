/**
 * DocTable - 汎用ドキュメントテーブル
 *
 * ドキュメント形式のポータルで使用するデータテーブル
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface DocTableColumn<T> {
  /** データのキー */
  key: keyof T | string;
  /** ヘッダー表示名 */
  header: string;
  /** カラム幅 (e.g., "200px", "30%") */
  width?: string;
  /** カスタムレンダラー */
  render?: (value: unknown, row: T) => React.ReactNode;
  /** セル内の配置 */
  align?: "left" | "center" | "right";
}

interface DocTableProps<T> {
  /** テーブルカラム定義 */
  columns: DocTableColumn<T>[];
  /** テーブルデータ */
  data: T[];
  /** データがない場合のメッセージ */
  emptyMessage?: string;
  /** 追加のCSSクラス */
  className?: string;
}

/**
 * オブジェクトからネストしたキーの値を取得
 */
function getNestedValue<T>(obj: T, key: string): unknown {
  const keys = key.split(".");
  let value: unknown = obj;
  for (const k of keys) {
    if (value === null || value === undefined) return undefined;
    value = (value as Record<string, unknown>)[k];
  }
  return value;
}

export function DocTable<T>({
  columns,
  data,
  emptyMessage = "データがありません",
  className = "",
}: DocTableProps<T>) {
  if (data.length === 0) {
    return (
      <p className="text-muted-foreground text-sm italic py-4">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            {columns.map((col) => (
              <TableHead
                key={String(col.key)}
                style={{ width: col.width }}
                className={
                  col.align === "center"
                    ? "text-center"
                    : col.align === "right"
                      ? "text-right"
                      : ""
                }
              >
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => {
                const value = getNestedValue(row, String(col.key));
                return (
                  <TableCell
                    key={String(col.key)}
                    className={
                      col.align === "center"
                        ? "text-center"
                        : col.align === "right"
                          ? "text-right"
                          : ""
                    }
                  >
                    {col.render
                      ? col.render(value, row)
                      : value != null
                        ? String(value)
                        : "-"}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
