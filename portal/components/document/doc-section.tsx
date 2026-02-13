/**
 * DocSection - アコーディオン付きドキュメントセクション
 *
 * ドキュメント形式のポータルで使用する折りたたみ可能なセクション
 * - 色分けによるカテゴリ識別
 * - 閉じた状態でもプレビュー表示
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/** セクションの色バリアント */
export type DocSectionVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "cyan";

const variantStyles: Record<
  DocSectionVariant,
  { border: string; bg: string; accent: string }
> = {
  default: {
    border: "border-border",
    bg: "bg-background",
    accent: "text-foreground",
  },
  primary: {
    border: "border-primary/30",
    bg: "bg-primary/5",
    accent: "text-primary",
  },
  success: {
    border: "border-green-500/30",
    bg: "bg-green-500/5",
    accent: "text-green-600 dark:text-green-400",
  },
  warning: {
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/5",
    accent: "text-yellow-600 dark:text-yellow-400",
  },
  danger: {
    border: "border-red-500/30",
    bg: "bg-red-500/5",
    accent: "text-red-600 dark:text-red-400",
  },
  info: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    accent: "text-blue-600 dark:text-blue-400",
  },
  purple: {
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    accent: "text-purple-600 dark:text-purple-400",
  },
  cyan: {
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/5",
    accent: "text-cyan-600 dark:text-cyan-400",
  },
};

interface DocSectionProps {
  /** セクションタイトル */
  title: string;
  /** タイトル横に表示するバッジ等 */
  badge?: React.ReactNode;
  /** デフォルトで開いた状態にするか */
  defaultOpen?: boolean;
  /** セクション内容 */
  children: React.ReactNode;
  /** 追加のCSSクラス */
  className?: string;
  /** 色バリアント */
  variant?: DocSectionVariant;
  /** 閉じた状態で表示するプレビュー（1行サマリー） */
  preview?: React.ReactNode;
  /** アイコン（タイトル左に表示） */
  icon?: React.ReactNode;
}

export function DocSection({
  title,
  badge,
  defaultOpen = false,
  children,
  className = "",
  variant = "default",
  preview,
  icon,
}: DocSectionProps) {
  const styles = variantStyles[variant];

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? "section" : undefined}
      className={className}
    >
      <AccordionItem
        value="section"
        className={`border rounded-lg ${styles.border} ${styles.bg}`}
      >
        <AccordionTrigger className="px-4 py-3 hover:no-underline group">
          <div className="flex items-center justify-between w-full pr-2">
            <div className="flex items-center gap-3">
              {icon && <span className={styles.accent}>{icon}</span>}
              <span className={`font-semibold ${styles.accent}`}>{title}</span>
              {badge}
            </div>
            {preview && (
              <div className="text-sm text-muted-foreground font-normal group-data-[state=open]:hidden">
                {preview}
              </div>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
